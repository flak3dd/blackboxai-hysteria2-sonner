import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@c2panel/infrastructure/security/admin"
import { scanWithShodan, scanWithCensys, saveNetworkMap, listNetworkMaps, getNetworkMap, buildNetworkTopology } from "@c2panel/infrastructure/network-mapping"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api/admin/network-map" })

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try { await verifyAdmin(request) } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      const map = await getNetworkMap(id)
      if (!map) return NextResponse.json({ error: "Network map not found" }, { status: 404 })
      return NextResponse.json({ success: true, data: map })
    }

    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    const maps = await listNetworkMaps({ limit, offset })
    return NextResponse.json({ success: true, data: maps })
  } catch (error) {
    log.error({ err: error }, "Failed to list network maps")
    return NextResponse.json({ error: "Failed to list network maps", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try { await verifyAdmin(request) } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  try {
    const body = await request.json()
    const { target, source } = body

    if (!target) return NextResponse.json({ error: "Target is required" }, { status: 400 })
    if (!source || !["shodan", "censys", "both"].includes(source))
      return NextResponse.json({ error: "Source must be 'shodan', 'censys', or 'both'" }, { status: 400 })

    let result

    if (source === "shodan") {
      result = await scanWithShodan(target)
    } else if (source === "censys") {
      result = await scanWithCensys(target)
    } else {
      const [shodanResult, censysResult] = await Promise.allSettled([
        scanWithShodan(target), scanWithCensys(target),
      ])

      const hosts = new Map<string, any>()
      if (shodanResult.status === "fulfilled") for (const h of shodanResult.value.hosts) hosts.set(h.ip, h)
      if (censysResult.status === "fulfilled") {
        for (const h of censysResult.value.hosts) {
          const existing = hosts.get(h.ip)
          if (existing) {
            const existingPorts = new Set(existing.services.map((s: any) => s.port))
            for (const svc of h.services) { if (!existingPorts.has(svc.port)) existing.services.push(svc) }
            if (h.vulnerabilities) existing.vulnerabilities = [...(existing.vulnerabilities || []), ...h.vulnerabilities.filter((v: string) => !(existing.vulnerabilities || []).includes(v))]
          } else hosts.set(h.ip, h)
        }
      }

      const mergedHosts = Array.from(hosts.values())
      result = { target, hosts: mergedHosts, topology: buildNetworkTopology(mergedHosts), scannedAt: new Date(), source: "both" }
    }

    const mapId = await saveNetworkMap(result)
    return NextResponse.json({ success: true, message: "Network scan completed", data: { id: mapId, ...result } })
  } catch (error) {
    log.error({ err: error }, "Failed to execute network scan")
    return NextResponse.json({ error: "Failed to execute network scan", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
