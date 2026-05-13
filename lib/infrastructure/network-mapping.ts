import { z } from "zod"
import { httpGet } from "./http-client"
import { serverEnv } from "@/lib/env"
import logger from "@/lib/logger"
import { prisma } from "@/lib/db"

const log = logger.child({ module: "network-mapping" })

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

export interface NetworkService {
  port: number
  service: string
  banner?: string
  version?: string
  product?: string
}

export interface HostResult {
  ip: string
  hostname?: string
  os?: string
  country?: string
  city?: string
  org?: string
  services: NetworkService[]
  vulnerabilities?: string[]
  lastSeen: Date
}

export interface NetworkMapResult {
  target: string
  hosts: HostResult[]
  topology: Record<string, string[]>
  scannedAt: Date
  source: string
}

/* ------------------------------------------------------------------ */
/*  Shodan Integration                                                 */
/* ------------------------------------------------------------------ */

export async function scanWithShodan(target: string): Promise<NetworkMapResult> {
  const apiKey = serverEnv().SHODAN_API_KEY
  if (!apiKey) throw new Error("SHODAN_API_KEY is not configured")

  log.info({ target }, "Starting Shodan scan")

  try {
    const url = `https://api.shodan.io/shodan/host/${encodeURIComponent(target)}?key=${apiKey}`
    const response = await httpGet<Record<string, unknown>>(url, {
      rateLimitCategory: "osint",
      rateLimitIdentifier: "shodan",
      useCache: true,
      cacheTtl: 300_000,
      timeout: 30000,
      retries: 1,
    })

    const data = response.data as any
    const host = parseShodanHost(data, target)
    const hosts = [host]
    const topology = buildNetworkTopology(hosts)

    log.info({ target, serviceCount: host.services.length }, "Shodan scan complete")
    return { target, hosts, topology, scannedAt: new Date(), source: "shodan" }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("403")) throw new Error("Shodan API: No query credits available (403)")
      if (error.message.includes("429")) throw new Error("Shodan API: Rate limited (429)")
      if (error.message.includes("404")) {
        log.info({ target }, "Shodan: No data found for target")
        return { target, hosts: [], topology: {}, scannedAt: new Date(), source: "shodan" }
      }
    }
    log.error({ err: error, target }, "Shodan scan failed")
    throw error
  }
}

function parseShodanHost(data: any, target: string): HostResult {
  const services: NetworkService[] = (data.data || []).map((svc: any) => ({
    port: svc.port,
    service: svc.transport || "unknown",
    banner: svc.banner || svc.data,
    version: svc.version,
    product: svc.product,
  }))

  const vulnerabilities = data.vulns ? Object.keys(data.vulns) : []

  return {
    ip: data.ip_str || target,
    hostname: data.hostnames?.[0],
    os: data.os || undefined,
    country: data.country_name,
    city: data.city,
    org: data.org,
    services,
    vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
    lastSeen: data.last_update ? new Date(data.last_update) : new Date(),
  }
}

/* ------------------------------------------------------------------ */
/*  Censys Integration                                                 */
/* ------------------------------------------------------------------ */

export async function scanWithCensys(target: string): Promise<NetworkMapResult> {
  const env = serverEnv()
  if (!env.CENSYS_API_ID || !env.CENSYS_API_SECRET)
    throw new Error("CENSYS_API_ID and CENSYS_API_SECRET are not configured")

  log.info({ target }, "Starting Censys scan")

  try {
    const url = `https://search.censys.io/api/v2/hosts/${encodeURIComponent(target)}`
    const basicAuth = Buffer.from(`${env.CENSYS_API_ID}:${env.CENSYS_API_SECRET}`).toString("base64")

    const response = await httpGet<Record<string, unknown>>(url, {
      rateLimitCategory: "osint",
      rateLimitIdentifier: "censys",
      useCache: true,
      cacheTtl: 300_000,
      timeout: 30000,
      retries: 1,
      headers: { Authorization: `Basic ${basicAuth}` },
    })

    const data = (response.data as any)?.result ?? response.data as any
    const host = parseCensysHost(data, target)
    const hosts = [host]
    const topology = buildNetworkTopology(hosts)

    log.info({ target, serviceCount: host.services.length }, "Censys scan complete")
    return { target, hosts, topology, scannedAt: new Date(), source: "censys" }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("401")) throw new Error("Censys API: Invalid credentials (401)")
      if (error.message.includes("429")) throw new Error("Censys API: Rate limited (429)")
    }
    log.error({ err: error, target }, "Censys scan failed")
    throw error
  }
}

function parseCensysHost(data: any, target: string): HostResult {
  const services: NetworkService[] = (data.services || []).map((svc: any) => ({
    port: svc.port,
    service: svc.service_name || "unknown",
    banner: svc.banner || svc.banner_html,
  }))

  return {
    ip: data.ip || target,
    hostname: data.dns?.reverse_dns?.names?.[0],
    os: data.operating_system?.product,
    country: data.location?.country,
    city: data.location?.city,
    org: data.autonomous_system?.name,
    services,
    lastSeen: new Date(),
  }
}

/* ------------------------------------------------------------------ */
/*  Service Fingerprinting                                             */
/* ------------------------------------------------------------------ */

export async function fingerprintService(host: string, port: number): Promise<NetworkService> {
  log.info({ host, port }, "Fingerprinting service")

  try {
    const net = await import("node:net")
    return new Promise<NetworkService>((resolve) => {
      const socket = new net.Socket()
      socket.setTimeout(5000)
      let banner = ""

      socket.on("data", (data: Buffer) => {
        banner += data.toString("utf-8").trim()
        socket.destroy()
      })
      socket.on("timeout", () => socket.destroy())
      socket.on("close", () => resolve({ port, service: identifyService(banner, port), banner: banner || undefined }))
      socket.on("error", () => resolve({ port, service: identifyService("", port) }))
      socket.connect(port, host)
    })
  } catch {
    return { port, service: identifyService("", port) }
  }
}

function identifyService(banner: string, port: number): string {
  const b = banner.toLowerCase()
  if (b.includes("ssh")) return "ssh"
  if (b.includes("http")) return "http"
  if (b.includes("ftp")) return "ftp"
  if (b.includes("smtp")) return "smtp"
  if (b.includes("mysql")) return "mysql"
  if (b.includes("postgres")) return "postgresql"
  if (b.includes("redis")) return "redis"

  const portMap: Record<number, string> = {
    21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 53: "dns",
    80: "http", 110: "pop3", 143: "imap", 443: "https", 465: "smtps",
    587: "smtp", 993: "imaps", 995: "pop3s", 3306: "mysql",
    5432: "postgresql", 6379: "redis", 8080: "http-proxy", 8443: "https-alt",
    1883: "mqtt", 5222: "xmpp", 27017: "mongodb",
  }
  return portMap[port] || "unknown"
}

/* ------------------------------------------------------------------ */
/*  Network Topology                                                   */
/* ------------------------------------------------------------------ */

export function buildNetworkTopology(hosts: HostResult[]): Record<string, string[]> {
  const topology: Record<string, string[]> = {}

  for (const host of hosts) {
    const neighbors: string[] = []
    for (const other of hosts) {
      if (other.ip === host.ip) continue
      if (host.org && other.org && host.org === other.org) neighbors.push(other.ip)
      else if (host.country && other.country && host.country === other.country &&
               host.city && other.city && host.city === other.city &&
               !neighbors.includes(other.ip)) neighbors.push(other.ip)
    }
    topology[host.ip] = neighbors
  }

  return topology
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

export async function saveNetworkMap(result: NetworkMapResult): Promise<string> {
  const record = await prisma.networkMap.create({
    data: {
      target: result.target,
      topology: result.topology as any,
      services: result.hosts as any,
      dataFlows: {
        source: result.source,
        scannedAt: result.scannedAt.toISOString(),
        hostCount: result.hosts.length,
        serviceCount: result.hosts.reduce((sum, h) => sum + h.services.length, 0),
        vulnerabilityCount: result.hosts.reduce((sum, h) => sum + (h.vulnerabilities?.length || 0), 0),
      } as any,
      scannedAt: result.scannedAt,
    },
  })
  log.info({ id: record.id, target: result.target }, "Network map saved")
  return record.id
}

export async function listNetworkMaps(options: { limit?: number; offset?: number } = {}) {
  const records = await prisma.networkMap.findMany({
    orderBy: { scannedAt: "desc" },
    take: options.limit || 50,
    skip: options.offset || 0,
  })

  return records.map((r) => ({
    id: r.id,
    target: r.target,
    scannedAt: r.scannedAt,
    source: (r.dataFlows as any)?.source || "unknown",
    hostCount: (r.dataFlows as any)?.hostCount || 0,
  }))
}

export async function getNetworkMap(id: string) {
  return prisma.networkMap.findUnique({ where: { id } })
}
