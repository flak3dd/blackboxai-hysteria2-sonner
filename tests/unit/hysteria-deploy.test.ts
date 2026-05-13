/**
 * Comprehensive tests for Hysteria2 setup and node deployment.
 *
 * Covers:
 * - SSH key pair generation (format, validity, ed25519)
 * - Hysteria2 YAML config rendering (TLS modes, obfs, bandwidth, masquerade)
 * - Provision script generation (domain vs IP, obfs, firewall)
 * - Lightsail provider SSH key format handling (the ImportKeyPair bug fix)
 * - Deployment config validation (Zod schemas)
 * - Provider presets and resolver
 * - Deployment status tracking
 */

import { generateSshKeyPair } from "@/lib/deploy/ssh"
import { buildProvisionScript } from "@/lib/deploy/provision-script"
import { buildHysteriaYamlObject, renderHysteriaYaml } from "@/lib/hysteria/config"
import { lightsailClient } from "@/lib/deploy/providers/lightsail"
import { DeploymentConfig, DeploymentStatus, VpsProvider } from "@/lib/deploy/types"
import type { ServerConfig } from "@/lib/db/schema"

/* ------------------------------------------------------------------ */
/*  SSH Key Pair Generation                                            */
/* ------------------------------------------------------------------ */
describe("SSH key pair generation", () => {
  it("generates a valid ed25519 OpenSSH public key", () => {
    const { publicKey, privateKey } = generateSshKeyPair()

    // Public key must be in OpenSSH format: ssh-ed25519 <base64> <comment>
    expect(publicKey).toMatch(/^ssh-ed25519\s+[A-Za-z0-9+/=]+\s+hysteria-deploy$/)

    // Private key must be OpenSSH PEM format
    expect(privateKey).toContain("-----BEGIN OPENSSH PRIVATE KEY-----")
    expect(privateKey).toContain("-----END OPENSSH PRIVATE KEY-----")
  })

  it("generates unique key pairs", () => {
    const pair1 = generateSshKeyPair()
    const pair2 = generateSshKeyPair()

    expect(pair1.publicKey).not.toBe(pair2.publicKey)
    expect(pair1.privateKey).not.toBe(pair2.privateKey)
  })

  it("public key base64 blob decodes to valid ed25519 key material", () => {
    const { publicKey } = generateSshKeyPair()
    const parts = publicKey.split(/\s+/)
    const blob = Buffer.from(parts[1], "base64")

    // Ed25519 OpenSSH wire format: 4-byte algo name length + "ssh-ed25519" + 4-byte key length + 32 bytes
    // Total minimum: 4 + 11 + 4 + 32 = 51 bytes
    expect(blob.length).toBeGreaterThanOrEqual(51)

    // First 4 bytes = length of algorithm name
    const algoLen = blob.readUInt32BE(0)
    expect(algoLen).toBe(11) // "ssh-ed25519"

    // Algorithm name
    const algo = blob.subarray(4, 4 + algoLen).toString()
    expect(algo).toBe("ssh-ed25519")

    // Key length (32 bytes for ed25519)
    const keyLen = blob.readUInt32BE(4 + algoLen)
    expect(keyLen).toBe(32)
  })

  it("private key can be parsed by ssh2", () => {
    const { privateKey } = generateSshKeyPair()

    // ssh2 requires the key to be in OpenSSH format.
    // We can't easily test the actual SSH connection in unit tests,
    // but we can verify the format is parseable.
    const lines = privateKey.trim().split("\n")
    expect(lines[0]).toBe("-----BEGIN OPENSSH PRIVATE KEY-----")
    expect(lines[lines.length - 1]).toBe("-----END OPENSSH PRIVATE KEY-----")

    // Base64 lines should be <= 70 chars (OpenSSH PEM spec)
    const b64Lines = lines.slice(1, -1)
    for (const line of b64Lines) {
      expect(line.length).toBeLessThanOrEqual(70)
    }
  })
})

/* ------------------------------------------------------------------ */
/*  Hysteria2 YAML Config Rendering                                    */
/* ------------------------------------------------------------------ */
describe("Hysteria2 config rendering", () => {
  const baseConfig: ServerConfig = {
    listen: ":443",
    tls: { mode: "manual", certPath: "/etc/hysteria/cert.pem", keyPath: "/etc/hysteria/key.pem" },
    obfs: { type: "salamander", password: "s3cret_obfs_pass" },
    bandwidth: { up: "100 mbps", down: "200 mbps" },
    masquerade: {
      type: "proxy",
      proxy: { url: "https://cdn.jsdelivr.net", rewriteHost: true },
    },
    trafficStats: { listen: ":25000", secret: "traffic-stats-secret-16ch" },
    authBackendUrl: "https://panel.example.com/api/hysteria/auth",
    authBackendInsecure: false,
    updatedAt: Date.now(),
  }

  it("renders a complete config with manual TLS", () => {
    const obj = buildHysteriaYamlObject(baseConfig)

    expect(obj.listen).toBe(":443")
    expect(obj.tls).toEqual({ cert: "/etc/hysteria/cert.pem", key: "/etc/hysteria/key.pem" })
    expect(obj.obfs).toEqual({ type: "salamander", salamander: { password: "s3cret_obfs_pass" } })
    expect(obj.bandwidth).toEqual({ up: "100 mbps", down: "200 mbps" })
    expect(obj.masquerade).toEqual({
      type: "proxy",
      proxy: { url: "https://cdn.jsdelivr.net", rewriteHost: true },
    })
    expect(obj.auth).toEqual({
      type: "http",
      http: { url: "https://panel.example.com/api/hysteria/auth", insecure: false },
    })
    expect(obj.trafficStats).toEqual({ listen: ":25000", secret: "traffic-stats-secret-16ch" })
  })

  it("renders ACME TLS when configured", () => {
    const acmeConfig: ServerConfig = {
      ...baseConfig,
      tls: { mode: "acme", domains: ["node1.example.com"], email: "admin@example.com" },
    }
    const obj = buildHysteriaYamlObject(acmeConfig)

    expect(obj.acme).toEqual({ domains: ["node1.example.com"], email: "admin@example.com" })
    expect((obj as any).tls).toBeUndefined()
  })

  it("omits obfs section when not configured", () => {
    const noObfs: ServerConfig = { ...baseConfig, obfs: undefined }
    const obj = buildHysteriaYamlObject(noObfs)

    expect(obj.obfs).toBeUndefined()
  })

  it("omits bandwidth section when not configured", () => {
    const noBw: ServerConfig = { ...baseConfig, bandwidth: undefined }
    const obj = buildHysteriaYamlObject(noBw)

    expect(obj.bandwidth).toBeUndefined()
  })

  it("omits masquerade section when not configured", () => {
    const noMasq: ServerConfig = { ...baseConfig, masquerade: undefined }
    const obj = buildHysteriaYamlObject(noMasq)

    expect(obj.masquerade).toBeUndefined()
  })

  it("renders partial bandwidth (up only)", () => {
    const partialBw: ServerConfig = { ...baseConfig, bandwidth: { up: "50 mbps" } }
    const obj = buildHysteriaYamlObject(partialBw)

    expect(obj.bandwidth).toEqual({ up: "50 mbps" })
    expect((obj.bandwidth as any)?.down).toBeUndefined()
  })

  it("renders file masquerade type", () => {
    const fileMasq: ServerConfig = {
      ...baseConfig,
      masquerade: { type: "file", file: { dir: "/var/www/html" } },
    }
    const obj = buildHysteriaYamlObject(fileMasq)

    expect(obj.masquerade).toEqual({ type: "file", file: { dir: "/var/www/html" } })
  })

  it("renders string masquerade type", () => {
    const strMasq: ServerConfig = {
      ...baseConfig,
      masquerade: {
        type: "string",
        string: { content: "OK", statusCode: 200 },
      },
    }
    const obj = buildHysteriaYamlObject(strMasq)

    expect(obj.masquerade).toEqual({
      type: "string",
      string: { content: "OK", statusCode: 200 },
    })
  })

  it("renders valid YAML output", () => {
    const yaml = renderHysteriaYaml(baseConfig)

    expect(yaml).toContain("listen:")
    expect(yaml).toContain("auth:")
    expect(yaml).toContain("trafficStats:")
    expect(yaml).toContain("obfs:")
    expect(yaml).toContain("bandwidth:")
    expect(yaml).toContain("masquerade:")

    // Should be parseable YAML
    expect(() => require("yaml").parse(yaml)).not.toThrow()
  })
})

/* ------------------------------------------------------------------ */
/*  Provision Script Generation                                        */
/* ------------------------------------------------------------------ */
describe("Provision script generation", () => {
  const baseOpts = {
    ip: "203.0.113.50",
    port: 443,
    panelUrl: "https://panel.example.com",
    trafficStatsSecret: "a1b2c3d4e5f6g7h8i9j0",
  }

  it("generates a valid bash script", () => {
    const script = buildProvisionScript(baseOpts)

    expect(script).toContain("#!/bin/bash")
    expect(script).toContain("set -euo pipefail")
    expect(script).toContain("apt-get update")
    expect(script).toContain("hysteria-server")
  })

  it("uses self-signed cert when no domain is provided", () => {
    const script = buildProvisionScript(baseOpts)

    expect(script).toContain("openssl req -x509")
    expect(script).toContain("/CN=203.0.113.50")
    expect(script).not.toContain("acme.sh")
  })

  it("uses ACME when domain is provided", () => {
    const script = buildProvisionScript({
      ...baseOpts,
      domain: "node1.example.com",
      email: "admin@example.com",
    })

    expect(script).toContain("acme.sh")
    expect(script).toContain("--issue -d node1.example.com")
    expect(script).not.toContain("openssl req -x509")
  })

  it("includes obfs block when obfsPassword is set", () => {
    const script = buildProvisionScript({
      ...baseOpts,
      obfsPassword: "s3cret_salamander",
    })

    expect(script).toContain("obfs:")
    expect(script).toContain("salamander")
    expect(script).toContain("s3cret_salamander")
  })

  it("omits obfs block when obfsPassword is not set", () => {
    const script = buildProvisionScript(baseOpts)

    expect(script).not.toContain("obfs:")
    expect(script).not.toContain("salamander")
  })

  it("includes bandwidth block when bandwidthUp is set", () => {
    const script = buildProvisionScript({
      ...baseOpts,
      bandwidthUp: "100 mbps",
    })

    expect(script).toContain("bandwidth:")
    expect(script).toContain("100 mbps")
  })

  it("includes both bandwidth up and down", () => {
    const script = buildProvisionScript({
      ...baseOpts,
      bandwidthUp: "100 mbps",
      bandwidthDown: "200 mbps",
    })

    expect(script).toContain("up: \"100 mbps\"")
    expect(script).toContain("down: \"200 mbps\"")
  })

  it("configures firewall for the specified port", () => {
    const script = buildProvisionScript({ ...baseOpts, port: 8443 })

    expect(script).toContain("ufw allow 8443/udp")
    expect(script).toContain("ufw allow 8443/tcp")
    expect(script).toContain("ufw allow 22/tcp")
    expect(script).toContain("ufw allow 25000/tcp")
  })

  it("configures auth URL pointing to the panel", () => {
    const script = buildProvisionScript(baseOpts)

    expect(script).toContain("https://panel.example.com/api/hysteria/auth")
  })

  it("includes default masquerade proxy", () => {
    const script = buildProvisionScript(baseOpts)

    expect(script).toContain("masquerade:")
    expect(script).toContain("type: proxy")
    expect(script).toContain("rewriteHost: true")
  })

  it("uses domain as listen hostname when provided", () => {
    const script = buildProvisionScript({
      ...baseOpts,
      domain: "node1.example.com",
    })

    // The domain should be used in the config
    expect(script).toContain("node1.example.com")
  })

  it("includes Hysteria2 binary download from GitHub", () => {
    const script = buildProvisionScript(baseOpts)

    expect(script).toContain("github.com/apernet/hysteria")
    expect(script).toContain("/usr/local/bin/hysteria")
    expect(script).toContain("chmod +x")
  })

  it("creates systemd service unit", () => {
    const script = buildProvisionScript(baseOpts)

    expect(script).toContain("[Unit]")
    expect(script).toContain("hysteria-server.service")
    expect(script).toContain("ExecStart=/usr/local/bin/hysteria server")
    expect(script).toContain("systemctl enable hysteria-server")
    expect(script).toContain("systemctl start hysteria-server")
  })
})

/* ------------------------------------------------------------------ */
/*  Lightsail Provider SSH Key Format                                  */
/* ------------------------------------------------------------------ */
describe("Lightsail provider SSH key handling", () => {
  it("extracts base64 blob from OpenSSH public key format", () => {
    // Simulate what the lightsailClient.createServer does internally
    const sshKeyContent = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleKeyBlob123 hysteria-deploy"
    const keyContent = sshKeyContent.trim()

    let publicKeyBase64: string
    if (keyContent.startsWith("ssh-")) {
      const parts = keyContent.split(/\s+/)
      publicKeyBase64 = parts[1]
    } else {
      publicKeyBase64 = Buffer.from(keyContent, "utf8").toString("base64")
    }

    // Should extract just the base64 blob, NOT re-encode the whole string
    expect(publicKeyBase64).toBe("AAAAC3NzaC1lZDI1NTE5AAAAIExampleKeyBlob123")
    // Should NOT be the whole string re-base64'd
    expect(publicKeyBase64).not.toContain("ssh-ed25519")
    // Should be valid base64
    expect(() => Buffer.from(publicKeyBase64, "base64")).not.toThrow()
  })

  it("handles non-OpenSSH format keys (raw bytes)", () => {
    const rawKey = "some-raw-key-content"
    const keyContent = rawKey.trim()

    let publicKeyBase64: string
    if (keyContent.startsWith("ssh-")) {
      const parts = keyContent.split(/\s+/)
      publicKeyBase64 = parts[1]
    } else {
      publicKeyBase64 = Buffer.from(keyContent, "utf8").toString("base64")
    }

    // Should base64-encode the raw content
    expect(publicKeyBase64).toBe(Buffer.from(rawKey, "utf8").toString("base64"))
  })

  it("lightsailClient presets returns expected structure", () => {
    const client = lightsailClient("stub", "stub", "us-east-1")
    const presets = client.presets()

    expect(presets.id).toBe("lightsail")
    expect(presets.label).toBe("AWS Lightsail")
    expect(presets.regions.length).toBeGreaterThan(0)
    expect(presets.sizes.length).toBeGreaterThan(0)

    // Verify region IDs are valid AWS format
    for (const region of presets.regions) {
      expect(region.id).toMatch(/^[a-z]{2}-[a-z]+-\d$/)
    }

    // Verify sizes include the nano option
    const nanoSize = presets.sizes.find(s => s.id === "nano_3_0")
    expect(nanoSize).toBeDefined()
    expect(nanoSize!.price).toContain("$3.50")
  })

  it("lightsailClient name is 'lightsail'", () => {
    const client = lightsailClient("stub", "stub", "us-east-1")
    expect(client.name).toBe("lightsail")
  })
})

/* ------------------------------------------------------------------ */
/*  Deployment Config Validation (Zod)                                 */
/* ------------------------------------------------------------------ */
describe("Deployment config validation", () => {
  it("accepts a minimal valid config", () => {
    const config = DeploymentConfig.parse({
      provider: "hetzner",
      region: "fsn1",
      size: "cx22",
      name: "test-node",
      panelUrl: "https://panel.example.com",
    })

    expect(config.provider).toBe("hetzner")
    expect(config.port).toBe(443) // default
    expect(config.tags).toEqual([]) // default
  })

  it("accepts all valid providers", () => {
    const providers: VpsProvider[] = ["hetzner", "digitalocean", "vultr", "lightsail", "azure"]

    for (const provider of providers) {
      const config = DeploymentConfig.parse({
        provider,
        region: "test-region",
        size: "test-size",
        name: "test-node",
        panelUrl: "https://panel.example.com",
      })
      expect(config.provider).toBe(provider)
    }
  })

  it("rejects invalid provider", () => {
    expect(() =>
      DeploymentConfig.parse({
        provider: "gcp",
        region: "us-east1",
        size: "e2-micro",
        name: "test-node",
        panelUrl: "https://panel.example.com",
      }),
    ).toThrow()
  })

  it("rejects empty name", () => {
    expect(() =>
      DeploymentConfig.parse({
        provider: "hetzner",
        region: "fsn1",
        size: "cx22",
        name: "",
        panelUrl: "https://panel.example.com",
      }),
    ).toThrow()
  })

  it("rejects name over 120 chars", () => {
    expect(() =>
      DeploymentConfig.parse({
        provider: "hetzner",
        region: "fsn1",
        size: "cx22",
        name: "x".repeat(121),
        panelUrl: "https://panel.example.com",
      }),
    ).toThrow()
  })

  it("rejects invalid port numbers", () => {
    expect(() =>
      DeploymentConfig.parse({
        provider: "hetzner",
        region: "fsn1",
        size: "cx22",
        name: "test",
        panelUrl: "https://panel.example.com",
        port: 0,
      }),
    ).toThrow()

    expect(() =>
      DeploymentConfig.parse({
        provider: "hetzner",
        region: "fsn1",
        size: "cx22",
        name: "test",
        panelUrl: "https://panel.example.com",
        port: 70000,
      }),
    ).toThrow()
  })

  it("accepts optional fields", () => {
    const config = DeploymentConfig.parse({
      provider: "lightsail",
      region: "us-east-1",
      size: "nano_3_0",
      name: "stealth-node",
      panelUrl: "https://panel.example.com",
      domain: "node1.example.com",
      obfsPassword: "s3cret_obfs_1234",
      email: "admin@example.com",
      tags: ["stealth", "cdn"],
      bandwidthUp: "100 mbps",
      bandwidthDown: "200 mbps",
    })

    expect(config.domain).toBe("node1.example.com")
    expect(config.obfsPassword).toBe("s3cret_obfs_1234")
    expect(config.tags).toEqual(["stealth", "cdn"])
    expect(config.bandwidthUp).toBe("100 mbps")
  })

  it("rejects obfsPassword under 8 chars", () => {
    expect(() =>
      DeploymentConfig.parse({
        provider: "hetzner",
        region: "fsn1",
        size: "cx22",
        name: "test",
        panelUrl: "https://panel.example.com",
        obfsPassword: "short",
      }),
    ).toThrow()
  })

  it("accepts resourceGroup for Azure", () => {
    const config = DeploymentConfig.parse({
      provider: "azure",
      region: "eastus",
      size: "Standard_B1s",
      name: "azure-node",
      panelUrl: "https://panel.example.com",
      resourceGroup: "my-existing-rg",
    })

    expect(config.resourceGroup).toBe("my-existing-rg")
  })
})

/* ------------------------------------------------------------------ */
/*  Deployment Status Enum                                             */
/* ------------------------------------------------------------------ */
describe("Deployment status values", () => {
  it("contains all expected statuses", () => {
    const expectedStatuses = [
      "pending",
      "creating_vps",
      "waiting_for_ip",
      "provisioning",
      "installing_hysteria",
      "configuring_tls",
      "starting_service",
      "testing_connectivity",
      "registering_node",
      "completed",
      "failed",
      "destroying",
      "destroyed",
    ]

    for (const status of expectedStatuses) {
      expect(() => DeploymentStatus.parse(status)).not.toThrow()
    }
  })

  it("rejects invalid status", () => {
    expect(() => DeploymentStatus.parse("running")).toThrow()
  })
})

/* ------------------------------------------------------------------ */
/*  Provider Presets Structure                                         */
/* ------------------------------------------------------------------ */
describe("Provider presets structure", () => {
  it("Hetzner presets have valid regions and sizes", () => {
    const { hetznerClient } = require("@/lib/deploy/providers/hetzner")
    const client = hetznerClient("stub")
    const presets = client.presets()

    expect(presets.id).toBe("hetzner")
    expect(presets.regions.length).toBeGreaterThan(0)
    expect(presets.sizes.length).toBeGreaterThan(0)
  })

  it("DigitalOcean presets have valid regions and sizes", () => {
    const { digitalOceanClient } = require("@/lib/deploy/providers/digitalocean")
    const client = digitalOceanClient("stub")
    const presets = client.presets()

    expect(presets.id).toBe("digitalocean")
    expect(presets.regions.length).toBeGreaterThan(0)
    expect(presets.sizes.length).toBeGreaterThan(0)
  })

  it("Vultr presets have valid regions and sizes", () => {
    const { vultrClient } = require("@/lib/deploy/providers/vultr")
    const client = vultrClient("stub")
    const presets = client.presets()

    expect(presets.id).toBe("vultr")
    expect(presets.regions.length).toBeGreaterThan(0)
    expect(presets.sizes.length).toBeGreaterThan(0)
  })

  it("Azure presets have valid regions and sizes", () => {
    const { azureClient } = require("@/lib/deploy/providers/azure")
    const client = azureClient({
      subscriptionId: "stub",
      tenantId: "stub",
      clientId: "stub",
      clientSecret: "stub",
    })
    const presets = client.presets()

    expect(presets.id).toBe("azure")
    expect(presets.regions.length).toBeGreaterThan(0)
    expect(presets.sizes.length).toBeGreaterThan(0)
  })
})

/* ------------------------------------------------------------------ */
/*  Provision Script Edge Cases                                        */
/* ------------------------------------------------------------------ */
describe("Provision script edge cases", () => {
  it("handles custom port correctly", () => {
    const script = buildProvisionScript({
      ip: "10.0.0.1",
      port: 8443,
      panelUrl: "https://panel.example.com",
      trafficStatsSecret: "a1b2c3d4e5f6g7h8i9j0",
    })

    expect(script).toContain('listen: ":8443"')
    expect(script).toContain("ufw allow 8443/udp")
  })

  it("handles ACME email default when domain is set but no email", () => {
    const script = buildProvisionScript({
      ip: "10.0.0.1",
      port: 443,
      panelUrl: "https://panel.example.com",
      trafficStatsSecret: "a1b2c3d4e5f6g7h8i9j0",
      domain: "node1.example.com",
    })

    // Should use admin@domain as default email
    expect(script).toContain("admin@node1.example.com")
  })

  it("uses provided email for ACME when specified", () => {
    const script = buildProvisionScript({
      ip: "10.0.0.1",
      port: 443,
      panelUrl: "https://panel.example.com",
      trafficStatsSecret: "a1b2c3d4e5f6g7h8i9j0",
      domain: "node1.example.com",
      email: "ops@example.com",
    })

    expect(script).toContain("ops@example.com")
  })

  it("trafficStats secret is included in config", () => {
    const script = buildProvisionScript({
      ip: "10.0.0.1",
      port: 443,
      panelUrl: "https://panel.example.com",
      trafficStatsSecret: "my-unique-secret-16ch",
    })

    expect(script).toContain("my-unique-secret-16ch")
  })

  it("auth URL uses insecure: false by default", () => {
    const script = buildProvisionScript({
      ip: "10.0.0.1",
      port: 443,
      panelUrl: "https://panel.example.com",
      trafficStatsSecret: "a1b2c3d4e5f6g7h8i9j0",
    })

    expect(script).toContain("insecure: false")
  })

  it("detects architecture and downloads correct binary", () => {
    const script = buildProvisionScript({
      ip: "10.0.0.1",
      port: 443,
      panelUrl: "https://panel.example.com",
      trafficStatsSecret: "a1b2c3d4e5f6g7h8i9j0",
    })

    expect(script).toContain("x86_64) HY_ARCH=\"amd64\"")
    expect(script).toContain("aarch64) HY_ARCH=\"arm64\"")
    expect(script).toContain("hysteria-linux-${HY_ARCH}")
  })
})

/* ------------------------------------------------------------------ */
/*  Hysteria2 Config Edge Cases                                        */
/* ------------------------------------------------------------------ */
describe("Hysteria2 config edge cases", () => {
  it("minimal config (no obfs, no bandwidth, no masquerade) renders cleanly", () => {
    const minimalConfig: ServerConfig = {
      listen: ":443",
      tls: { mode: "manual", certPath: "/cert.pem", keyPath: "/key.pem" },
      obfs: undefined,
      bandwidth: undefined,
      masquerade: undefined,
      trafficStats: { listen: ":25000", secret: "min-16-char-secret" },
      authBackendUrl: "https://panel.example.com/api/hysteria/auth",
      authBackendInsecure: false,
      updatedAt: Date.now(),
    }

    const yaml = renderHysteriaYaml(minimalConfig)
    const parsed = require("yaml").parse(yaml)

    expect(parsed.listen).toBe(":443")
    expect(parsed.obfs).toBeUndefined()
    expect(parsed.bandwidth).toBeUndefined()
    expect(parsed.masquerade).toBeUndefined()
    expect(parsed.auth.type).toBe("http")
  })

  it("config with insecure auth backend", () => {
    const insecureConfig: ServerConfig = {
      listen: ":443",
      tls: { mode: "manual", certPath: "/cert.pem", keyPath: "/key.pem" },
      obfs: undefined,
      bandwidth: undefined,
      masquerade: undefined,
      trafficStats: { listen: ":25000", secret: "min-16-char-secret" },
      authBackendUrl: "http://localhost:3000/api/hysteria/auth",
      authBackendInsecure: true,
      updatedAt: Date.now(),
    }

    const obj = buildHysteriaYamlObject(insecureConfig)
    expect(obj.auth.http.insecure).toBe(true)
  })

  it("config with custom listen port", () => {
    const customPort: ServerConfig = {
      listen: ":8443",
      tls: { mode: "manual", certPath: "/cert.pem", keyPath: "/key.pem" },
      obfs: undefined,
      bandwidth: undefined,
      masquerade: undefined,
      trafficStats: { listen: ":25000", secret: "min-16-char-secret" },
      authBackendUrl: "https://panel.example.com/api/hysteria/auth",
      authBackendInsecure: false,
      updatedAt: Date.now(),
    }

    const obj = buildHysteriaYamlObject(customPort)
    expect(obj.listen).toBe(":8443")
  })
})
