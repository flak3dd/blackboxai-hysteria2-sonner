import { type NextRequest, NextResponse } from "next/server"
import { recordTrackingEvent, createTrackingEvent } from "@/lib/mailer/tracking"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const destination = searchParams.get("url")
  const messageId = searchParams.get("id") ?? "unknown"
  const recipient = searchParams.get("r") ?? "unknown"
  const linkText = searchParams.get("text") ?? undefined

  const ua = req.headers.get("user-agent") ?? undefined
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined

  if (!destination) {
    return NextResponse.json({ error: "url required" }, { status: 400 })
  }

  // Validate destination is a real URL before redirecting
  let destUrl: URL
  try {
    destUrl = new URL(destination)
    if (!["http:", "https:"].includes(destUrl.protocol)) {
      return NextResponse.json({ error: "invalid url" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 })
  }

  try {
    const event = createTrackingEvent(
      "link",
      messageId,
      recipient,
      { userAgent: ua, ipAddress: ip },
      destination,
      linkText,
    )
    recordTrackingEvent(event)
  } catch {
    // non-critical — redirect anyway
  }

  return NextResponse.redirect(destUrl.toString(), 302)
}
