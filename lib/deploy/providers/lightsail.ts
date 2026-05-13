import type { VpsProviderClient, VpsCreateResult, ProviderPreset, VpsInstance } from "../types"
import { createHmac, createHash, createPublicKey } from "node:crypto"

/**
 * Minimal AWS Lightsail client using Signature V4 (no SDK dependency).
 * Requires AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars.
 */

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex")
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest()
}

function getSignatureKey(secret: string, date: string, region: string, service: string): Buffer {
  const kDate = hmacSha256(`AWS4${secret}`, date)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, service)
  return hmacSha256(kService, "aws4_request")
}

async function lightsailRequest(
  accessKey: string,
  secretKey: string,
  region: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const host = `lightsail.${region}.amazonaws.com`
  const url = `https://${host}/`
  const body = JSON.stringify(payload)
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "")
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z")

  const canonicalHeaders = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:Lightsail_20161128.${action}\n`
  const signedHeaders = "content-type;host;x-amz-date;x-amz-target"
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(body)}`
  const credentialScope = `${dateStamp}/${region}/lightsail/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`
  const signingKey = getSignatureKey(secretKey, dateStamp, region, "lightsail")
  const signature = hmacSha256(signingKey, stringToSign).toString("hex")
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amz-date": amzDate,
      "x-amz-target": `Lightsail_20161128.${action}`,
      authorization: authHeader,
      host,
    },
    body,
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Lightsail ${action} failed (${res.status}): ${errBody.slice(0, 300)}`)
  }
  return res.json()
}

export function lightsailClient(accessKey: string, secretKey: string, awsRegion: string): VpsProviderClient {
  return {
    name: "lightsail",
    // AWS Lightsail's ImportKeyPair has inconsistent ed25519 support —
    // RSA 4096 is universally accepted across all AWS regions.
    preferredSshKeyType: "rsa",

    presets(): ProviderPreset {
      return {
        id: "lightsail",
        label: "AWS Lightsail",
        regions: [
          { id: "us-east-1", label: "US East (Virginia)" },
          { id: "us-east-2", label: "US East (Ohio)" },
          { id: "us-west-2", label: "US West (Oregon)" },
          { id: "eu-west-1", label: "EU (Ireland)" },
          { id: "eu-west-2", label: "EU (London)" },
          { id: "eu-central-1", label: "EU (Frankfurt)" },
          { id: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
          { id: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
          { id: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
        ],
        sizes: [
          { id: "nano_3_0", label: "Nano", cpu: 2, ram: "512 MB", disk: "20 GB", price: "$3.50/mo" },
          { id: "micro_3_0", label: "Micro", cpu: 2, ram: "1 GB", disk: "40 GB", price: "$5/mo" },
          { id: "small_3_0", label: "Small", cpu: 2, ram: "2 GB", disk: "60 GB", price: "$10/mo" },
          { id: "medium_3_0", label: "Medium", cpu: 2, ram: "4 GB", disk: "80 GB", price: "$20/mo" },
        ],
      }
    },

    async listInstances(): Promise<VpsInstance[]> {
      const data = (await lightsailRequest(accessKey, secretKey, awsRegion, "GetInstances", {})) as {
        instances?: Array<{
          name: string
          state: { name: string }
          publicIpAddress?: string
          ipv6Addresses?: Array<{ address: string }>
          location: { regionName: string }
          bundleId: string
          createdAt: string
        }>
      }
      return (data.instances || []).map((instance) => ({
        id: instance.name,
        name: instance.name,
        status: instance.state.name,
        ipv4: instance.publicIpAddress || null,
        ipv6: instance.ipv6Addresses?.[0]?.address || null,
        region: instance.location.regionName,
        size: instance.bundleId,
        createdAt: instance.createdAt,
      }))
    },

    async createServer(opts): Promise<VpsCreateResult> {
      const keyName = `hysteria-deploy-${Date.now()}`

      // Lightsail ImportKeyPair expects publicKeyBase64 to be the raw SPKI DER
      // bytes base64-encoded — NOT the whole "ssh-rsa AAAA... comment" string.
      // We parse the OpenSSH wire format to extract n and e, reconstruct the key
      // as a JWK, and export SPKI DER via Node.js crypto.
      const keyContent = opts.sshKeyContent.trim()
      let publicKeyBase64: string
      if (keyContent.startsWith("ssh-rsa ")) {
        const wireBlob = Buffer.from(keyContent.split(" ")[1], "base64")
        let off = 0
        const readField = () => {
          const len = wireBlob.readUInt32BE(off); off += 4
          const val = wireBlob.subarray(off, off + len); off += len
          return val
        }
        readField() // skip algo name
        const eBytes = readField()
        const nBytes = readField()
        const toB64url = (b: Buffer) =>
          b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
        const strip0 = (b: Buffer) => (b[0] === 0 ? b.subarray(1) : b)
        const pubKey = createPublicKey({
          key: { kty: "RSA", n: toB64url(strip0(nBytes)), e: toB64url(strip0(eBytes)) } as JsonWebKey,
          format: "jwk",
        })
        publicKeyBase64 = (pubKey.export({ type: "spki", format: "der" }) as Buffer).toString("base64")
      } else {
        publicKeyBase64 = Buffer.from(keyContent, "utf8").toString("base64")
      }

      // Key pairs in Lightsail are region-scoped — import to the same region as the instance.
      const deployRegion = opts.region || awsRegion
      await lightsailRequest(accessKey, secretKey, deployRegion, "ImportKeyPair", {
        keyPairName: keyName,
        publicKeyBase64,
      })

      const instanceName = opts.name.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase().slice(0, 63)
      const data = (await lightsailRequest(accessKey, secretKey, opts.region || awsRegion, "CreateInstances", {
        instanceNames: [instanceName],
        availabilityZone: `${opts.region || awsRegion}a`,
        blueprintId: "ubuntu_24_04",
        bundleId: opts.size,
        keyPairName: keyName,
      })) as { operations?: { resourceName?: string }[] }

      // Encode the deploy region into the vpsId so waitForIp can query the right region.
      const resolvedInstanceName = data.operations?.[0]?.resourceName ?? instanceName
      return {
        vpsId: `${deployRegion}:${resolvedInstanceName}`,
        ip: null,
        sshUsername: "ubuntu", // AWS Lightsail Ubuntu instances use 'ubuntu' user, not root
      }
    },

    async waitForIp(vpsId, timeoutMs = 180_000): Promise<string> {
      // vpsId is "<region>:<instanceName>" — parse both parts.
      const colonIdx = vpsId.indexOf(":")
      const region = colonIdx !== -1 ? vpsId.slice(0, colonIdx) : awsRegion
      const instanceName = colonIdx !== -1 ? vpsId.slice(colonIdx + 1) : vpsId

      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        const data = (await lightsailRequest(accessKey, secretKey, region, "GetInstance", {
          instanceName,
        })) as {
          instance?: { state?: { name?: string }; publicIpAddress?: string }
        }
        if (data.instance?.state?.name === "running" && data.instance.publicIpAddress) {
          return data.instance.publicIpAddress
        }
        await new Promise((r) => setTimeout(r, 5000))
      }
      throw new Error("Timed out waiting for Lightsail instance IP")
    },

    async destroyServer(vpsId): Promise<void> {
      const colonIdx = vpsId.indexOf(":")
      const region = colonIdx !== -1 ? vpsId.slice(0, colonIdx) : awsRegion
      const instanceName = colonIdx !== -1 ? vpsId.slice(colonIdx + 1) : vpsId
      await lightsailRequest(accessKey, secretKey, region, "DeleteInstance", {
        instanceName,
        forceDeleteAddOns: true,
      }).catch((err) => {
        if (!(err instanceof Error && err.message.includes("NotFoundException"))) throw err
      })
    },
  }
}
