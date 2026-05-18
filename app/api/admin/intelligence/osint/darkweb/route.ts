import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/auth/admin"
import { darkWebMonitor } from "@/lib/osint/dark-web"
import logger from "@/lib/logger"

const log = logger.child({ module: "api/admin/osint/darkweb" })

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try { await verifyAdmin(request) } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  try {
    const body = await request.json()
    const { query } = body as { query: string }

    if (!query) return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })

    const result = await darkWebMonitor.search(query)
    await darkWebMonitor.saveResults(result)

    return NextResponse.json({
      success: true, query: result.query, mentions: result.mentions,
      totalMentions: result.totalMentions, scannedAt: result.scannedAt,
    })
  } catch (error) {
    log.error({ err: error }, "Dark web search error")
    return NextResponse.json({ error: "Dark web search failed", message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try { await verifyAdmin(request) } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  try {
    const hours = parseInt(request.nextUrl.searchParams.get("hours") || "24", 10)
    if (isNaN(hours) || hours < 1 || hours > 720) return NextResponse.json({ error: "Hours must be between 1 and 720" }, { status: 400 })

    const result = await darkWebMonitor.getRecentMentions(hours)
    return NextResponse.json({
      success: true, query: result.query, mentions: result.mentions,
      totalMentions: result.totalMentions, scannedAt: result.scannedAt,
    })
  } catch (error) {
    log.error({ err: error }, "Dark web recent mentions error")
    return NextResponse.json({ error: "Failed to retrieve recent mentions", message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
