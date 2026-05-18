#!/usr/bin/env npx tsx
/**
 * Standalone test runner for Hysteria2 setup and node deployment.
 *
 * Run: npx tsx tests/unit/hysteria-deploy-standalone.ts
 *
 * This is an alternative to Jest for environments where next/jest
 * config loading hangs. The same tests exist in hysteria-deploy.test.ts
 * for the Jest runner.
 */

import { generateSshKeyPair } from "@/lib/deploy/ssh"
import { buildProvisionScript } from "@/lib/deploy/provision-script"
import { buildHysteriaYamlObject, renderHysteriaYaml } from "@/lib/hysteria/config"
import { lightsailClient } from "@/lib/deploy/providers/lightsail"
import { DeploymentConfig, DeploymentStatus } from "@/lib/deploy/types"
import { parse as yamlParse } from "yaml"
import type { ServerConfig } from "@/lib/db/schema"

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`  FAIL: ${label}`)
  }
}

function section(name: string) {
  console.log(`\n=== ${name} ===`)
}

/* ------------------------------------------------------------------ */
/*  SSH Key Pair Generation                                            */
/* ------------------------------------------------------------------ */
section("SSH Key Pair Generation")

const { publicKey, privateKey } = generateSshKeyPair()

assert(publicKey.startsWith("ssh-ed25519"), "Public key starts with ssh-ed25519")
assert(publicKey.endsWith("hysteria-deploy"), "Public key ends with comment")
assert(publicKey.match(/^ssh-ed25519\s+[A-Za-z0-9+/=]+\s+hysteria-deploy$/) !== null, "Public key is valid OpenSSH format")
assert(privateKey.includes("-----BEGIN OPENSSH PRIVATE KEY-----"), "Private key is OpenSSH PEM format")
assert(privateKey.includes("-----END OPENSSH PRIVATE KEY-----"), "Private key has PEM footer")

// Verify base64 blob structure
const parts = publicKey.split(/\s+/)
const blob = Buffer.from(parts[1], "base64")
const algoLen = blob.readUInt32BE(0)
assert(algoLen === 11, "Algorithm name length is 11 (ssh-ed25519)")
assert(blob.subarray(4, 4 + algoLen).toString() === "ssh-ed25519", "Algorithm name is ssh-ed25519")
const keyLen = blob.readUInt32BE(4 + algoLen)
assert(keyLen === 32, "Ed25519 key is 32 bytes")

// Verify private key line lengths (OpenSSH spec: <= 70 chars)
const privLines = privateKey.trim().split("\n")
const b64Lines = privLines.slice(1, -1)
assert(b64Lines.every(l => l.length <= 70), "Private key base64 lines <= 70 chars")

// Verify unique key pairs
const pair2 = generateSshKeyPair()
assert(publicKey !== pair2.publicKey, "Key pairs are unique")

/* ------------------------------------------------------------------ */
/*  Hysteria2 Config Rendering                                         */
/* ------------------------------------------------------------------ */
section("Hysteria2 Config Rendering")

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

const obj = buildHysteriaYamlObject(baseConfig)
assert(obj.listen === ":443", "Listen is :443")
assert("tls" in obj && (obj.tls as any).cert === "/etc/hysteria/cert.pem", "Manual TLS cert path")
assert(obj.obfs?.type === "salamander", "Obfs type is salamander")
assert(obj.bandwidth?.up === "100 mbps", "Bandwidth up")
assert(obj.bandwidth?.down === "200 mbps", "Bandwidth down")
assert(obj.masquerade?.type === "proxy", "Masquerade type is proxy")
assert(obj.auth.type === "http", "Auth type is http")
assert(obj.trafficStats.secret === "traffic-stats-secret-16ch", "Traffic stats secret")

// YAML rendering
const yaml = renderHysteriaYaml(baseConfig)
const parsed = yamlParse(yaml)
assert(parsed.listen === ":443", "YAML is parseable and has listen")
assert(parsed.obfs?.type === "salamander", "YAML has obfs")
assert(parsed.masquerade?.type === "proxy", "YAML has masquerade")

// ACME config
const acmeConfig: ServerConfig = { ...baseConfig, tls: { mode: "acme", domains: ["node1.example.com"], email: "admin@example.com" } }
const acmeObj = buildHysteriaYamlObject(acmeConfig)
assert("acme" in acmeObj, "ACME config has acme section")
assert(!("tls" in acmeObj), "ACME config has no tls section")

// Minimal config (no obfs, no bw, no masq)
const minConfig: ServerConfig = { ...baseConfig, obfs: undefined, bandwidth: undefined, masquerade: undefined }
const minObj = buildHysteriaYamlObject(minConfig)
assert(minObj.obfs === undefined, "Minimal: no obfs")
assert(minObj.bandwidth === undefined, "Minimal: no bandwidth")
assert(minObj.masquerade === undefined, "Minimal: no masquerade")

// Partial bandwidth
const partialBw: ServerConfig = { ...baseConfig, bandwidth: { up: "50 mbps" } }
const partialBwObj = buildHysteriaYamlObject(partialBw)
assert(partialBwObj.bandwidth?.up === "50 mbps", "Partial bandwidth up")
assert((partialBwObj.bandwidth as any)?.down === undefined, "Partial bandwidth no down")

// File masquerade
const fileMasq: ServerConfig = { ...baseConfig, masquerade: { type: "file", file: { dir: "/var/www/html" } } }
const fileMasqObj = buildHysteriaYamlObject(fileMasq)
assert(fileMasqObj.masquerade?.type === "file", "File masquerade type")

// String masquerade
const strMasq: ServerConfig = { ...baseConfig, masquerade: { type: "string", string: { content: "OK", statusCode: 200 } } }
const strMasqObj = buildHysteriaYamlObject(strMasq)
assert(strMasqObj.masquerade?.type === "string", "String masquerade type")

// Insecure auth
const insecureConfig: ServerConfig = { ...baseConfig, authBackendInsecure: true }
const insecureObj = buildHysteriaYamlObject(insecureConfig)
assert(insecureObj.auth.http.insecure === true, "Insecure auth backend")

/* ------------------------------------------------------------------ */
/*  Provision Script Generation                                        */
/* ------------------------------------------------------------------ */
section("Provision Script Generation")

const baseOpts = { ip: "203.0.113.50", port: 443, panelUrl: "https://panel.example.com", trafficStatsSecret: "a1b2c3d4e5f6g7h8i9j0" }

// No domain = self-signed cert
const script1 = buildProvisionScript(baseOpts)
assert(script1.includes("#!/bin/bash"), "Has shebang")
assert(script1.includes("set -euo pipefail"), "Has strict mode")
assert(script1.includes("openssl req -x509"), "Self-signed cert when no domain")
assert(!script1.includes("acme.sh"), "No acme.sh when no domain")
assert(script1.includes("apernet/hysteria"), "Hysteria binary download")
assert(script1.includes("hysteria-server.service"), "Systemd service")
assert(script1.includes("ufw allow 443/udp"), "Firewall UDP")
assert(script1.includes("ufw allow 443/tcp"), "Firewall TCP")
assert(script1.includes("panel.example.com/api/hysteria/auth"), "Auth URL")
assert(script1.includes("masquerade:"), "Default masquerade")

// With domain = ACME
const script2 = buildProvisionScript({ ...baseOpts, domain: "node1.example.com", email: "admin@example.com" })
assert(script2.includes("acme.sh"), "ACME when domain provided")
assert(!script2.includes("openssl req -x509"), "No self-signed cert with domain")
assert(script2.includes("--issue -d node1.example.com"), "ACME domain in issue command")
assert(script2.includes("admin@example.com"), "ACME email")

// With obfs
const script3 = buildProvisionScript({ ...baseOpts, obfsPassword: "s3cret_salamander" })
assert(script3.includes("obfs:"), "Obfs block present")
assert(script3.includes("salamander"), "Salamander type")
assert(script3.includes("s3cret_salamander"), "Obfs password")

// Without obfs
assert(!script1.includes("obfs:"), "No obfs block when no password")

// With bandwidth
const script4 = buildProvisionScript({ ...baseOpts, bandwidthUp: "100 mbps", bandwidthDown: "200 mbps" })
assert(script4.includes("bandwidth:"), "Bandwidth block present")
assert(script4.includes('up: "100 mbps"'), "Bandwidth up")
assert(script4.includes('down: "200 mbps"'), "Bandwidth down")

// Custom port
const script5 = buildProvisionScript({ ...baseOpts, port: 8443 })
assert(script5.includes('listen: ":8443"'), "Custom port in listen")
assert(script5.includes("ufw allow 8443/udp"), "Custom port in firewall")

// ACME email default
const script6 = buildProvisionScript({ ...baseOpts, domain: "node1.example.com" })
assert(script6.includes("admin@node1.example.com"), "Default email is admin@domain")

// Architecture detection
assert(script1.includes('x86_64) HY_ARCH="amd64"'), "x86_64 arch detection")
assert(script1.includes('aarch64) HY_ARCH="arm64"'), "aarch64 arch detection")

/* ------------------------------------------------------------------ */
/*  Lightsail Provider SSH Key Format                                  */
/* ------------------------------------------------------------------ */
section("Lightsail Provider SSH Key Format")

const sshKeyContent = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleKeyBlob123 hysteria-deploy"
const keyContent = sshKeyContent.trim()
let publicKeyBase64: string
if (keyContent.startsWith("ssh-")) {
  const keyParts = keyContent.split(/\s+/)
  publicKeyBase64 = keyParts[1]
} else {
  publicKeyBase64 = Buffer.from(keyContent, "utf8").toString("base64")
}
assert(publicKeyBase64 === "AAAAC3NzaC1lZDI1NTE5AAAAIExampleKeyBlob123", "Extracted base64 blob from OpenSSH format")
assert(!publicKeyBase64.includes("ssh-ed25519"), "Does NOT contain ssh-ed25519 prefix")
assert(!isNaN(Buffer.from(publicKeyBase64, "base64").length), "Is valid base64")

// Non-OpenSSH format
const rawKey = "some-raw-key-content"
const rawKeyContent = rawKey.trim()
let rawPublicKeyBase64: string
if (rawKeyContent.startsWith("ssh-")) {
  const rawKeyParts = rawKeyContent.split(/\s+/)
  rawPublicKeyBase64 = rawKeyParts[1]
} else {
  rawPublicKeyBase64 = Buffer.from(rawKeyContent, "utf8").toString("base64")
}
assert(rawPublicKeyBase64 === Buffer.from(rawKey, "utf8").toString("base64"), "Raw key is base64-encoded")

// Lightsail presets
const client = lightsailClient("stub", "stub", "us-east-1")
const presets = client.presets()
assert(presets.id === "lightsail", "Presets id is lightsail")
assert(presets.label === "AWS Lightsail", "Presets label")
assert(presets.regions.length > 0, "Has regions")
assert(presets.sizes.length > 0, "Has sizes")
assert(presets.sizes.some(s => s.id === "nano_3_0"), "Has nano size")
assert(client.name === "lightsail", "Client name is lightsail")

/* ------------------------------------------------------------------ */
/*  Deployment Config Validation                                       */
/* ------------------------------------------------------------------ */
section("Deployment Config Validation")

const validConfig = DeploymentConfig.parse({
  provider: "lightsail",
  region: "us-east-1",
  size: "nano_3_0",
  name: "test-node",
  panelUrl: "https://panel.example.com",
})
assert(validConfig.provider === "lightsail", "Valid config parses")
assert(validConfig.port === 443, "Default port is 443")
assert(validConfig.tags.length === 0, "Default tags is empty")

// All providers
const providers = ["hetzner", "digitalocean", "vultr", "lightsail", "azure"]
let allProvidersWork = true
for (const p of providers) {
  try {
    const c = DeploymentConfig.parse({ provider: p, region: "test", size: "test", name: "test", panelUrl: "https://panel.example.com" })
    if (c.provider !== p) allProvidersWork = false
  } catch { allProvidersWork = false }
}
assert(allProvidersWork, "All providers accepted")

// Invalid provider
let invalidProviderRejected = false
try { DeploymentConfig.parse({ provider: "gcp", region: "test", size: "test", name: "test", panelUrl: "https://panel.example.com" }) } catch { invalidProviderRejected = true }
assert(invalidProviderRejected, "Invalid provider rejected")

// Empty name
let emptyNameRejected = false
try { DeploymentConfig.parse({ provider: "hetzner", region: "fsn1", size: "cx22", name: "", panelUrl: "https://panel.example.com" }) } catch { emptyNameRejected = true }
assert(emptyNameRejected, "Empty name rejected")

// Name too long
let longNameRejected = false
try { DeploymentConfig.parse({ provider: "hetzner", region: "fsn1", size: "cx22", name: "x".repeat(121), panelUrl: "https://panel.example.com" }) } catch { longNameRejected = true }
assert(longNameRejected, "Name over 120 chars rejected")

// Invalid port
let invalidPortRejected = false
try { DeploymentConfig.parse({ provider: "hetzner", region: "fsn1", size: "cx22", name: "test", panelUrl: "https://panel.example.com", port: 0 }) } catch { invalidPortRejected = true }
assert(invalidPortRejected, "Port 0 rejected")

// Short obfs password
let shortObfsRejected = false
try { DeploymentConfig.parse({ provider: "hetzner", region: "fsn1", size: "cx22", name: "test", panelUrl: "https://panel.example.com", obfsPassword: "short" }) } catch { shortObfsRejected = true }
assert(shortObfsRejected, "Short obfs password rejected")

// Optional fields
const fullConfig = DeploymentConfig.parse({
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
assert(fullConfig.domain === "node1.example.com", "Domain accepted")
assert(fullConfig.obfsPassword === "s3cret_obfs_1234", "Obfs password accepted")
assert(fullConfig.tags.length === 2, "Tags accepted")

// Azure resource group
const azureConfig = DeploymentConfig.parse({
  provider: "azure",
  region: "eastus",
  size: "Standard_B1s",
  name: "azure-node",
  panelUrl: "https://panel.example.com",
  resourceGroup: "my-existing-rg",
})
assert(azureConfig.resourceGroup === "my-existing-rg", "Azure resource group accepted")

/* ------------------------------------------------------------------ */
/*  Deployment Status Enum                                             */
/* ------------------------------------------------------------------ */
section("Deployment Status Enum")

const statuses = ["pending", "creating_vps", "waiting_for_ip", "provisioning", "installing_hysteria", "configuring_tls", "starting_service", "testing_connectivity", "registering_node", "completed", "failed", "destroying", "destroyed"]
let allStatusesValid = true
for (const s of statuses) {
  try { DeploymentStatus.parse(s) } catch { allStatusesValid = false; console.error(`  Status "${s}" failed`) }
}
assert(allStatusesValid, "All deployment statuses valid")

let invalidStatusRejected = false
try { DeploymentStatus.parse("running") } catch { invalidStatusRejected = true }
assert(invalidStatusRejected, "Invalid status rejected")

/* ------------------------------------------------------------------ */
/*  Summary                                                            */
/* ------------------------------------------------------------------ */
console.log(`\n${"=".repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) {
  console.error("\nSOME TESTS FAILED!")
  process.exit(1)
} else {
  console.log("\nALL TESTS PASSED!")
}
