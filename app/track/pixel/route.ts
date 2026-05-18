import { type NextRequest, NextResponse } from "next/server"
import { recordTrackingEvent, createTrackingEvent } from "@/lib/mailer/tracking"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// 1×1 transparent GIF (44 bytes)
const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
)

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const messageId = searchParams.get("id") ?? "unknown"
  const recipient = searchParams.get("r") ?? "unknown"

  const ua = req.headers.get("user-agent") ?? undefined
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined

  // Ignore bot/scanner opens
  const isBot = /bot|crawl|spider|curl|python|go-http|axios/i.test(ua ?? "")
  if (!isBot) {
    try {
      const event = createTrackingEvent("pixel", messageId, recipient, {
        userAgent: ua,
        ipAddress: ip,
      })
      recordTrackingEvent(event)
    } catch {
      // non-critical
    }
  }

  return new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL_GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  })
}
