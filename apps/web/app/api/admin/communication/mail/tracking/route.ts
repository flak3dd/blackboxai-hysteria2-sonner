import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  getTrackingEvents,
  getMessageStats,
  getAllTrackingEvents,
  clearTrackingEvents,
  getBounceEvents,
  getAllBounceEvents,
  getBounceStats,
  suppressEmail,
  isEmailSuppressed,
  getSuppressedEmails,
  removeSuppression,
  clearSuppressions,
  createBounceEvent,
  recordBounceEvent,
  getLinkClicks,
  getTopLinks,
  getAnalytics,
  getAggregatedAnalytics,
  getRecipientActivity,
} from "@c2panel/infrastructure/mailer/tracking"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get("messageId")
    const action = searchParams.get("action")
    const recipient = searchParams.get("recipient")
    
    if (action === "stats") {
      const stats = getBounceStats()
      return NextResponse.json(stats)
    }
    
    if (action === "suppressed") {
      const suppressed = getSuppressedEmails()
      return NextResponse.json({ emails: suppressed })
    }
    
    if (action === "check-suppressed" && recipient) {
      const suppressed = isEmailSuppressed(recipient)
      return NextResponse.json({ suppressed })
    }
    
    if (action === "bounces" && messageId) {
      const bounces = getBounceEvents(messageId)
      return NextResponse.json({ bounces })
    }
    
    if (action === "all-bounces") {
      const bounces = getAllBounceEvents()
      return NextResponse.json({ bounces })
    }
    
    if (action === "link-clicks" && messageId) {
      const clicks = getLinkClicks(messageId)
      return NextResponse.json({ clicks })
    }
    
    if (action === "top-links" && messageId) {
      const limit = parseInt(searchParams.get("limit") || "10")
      const topLinks = getTopLinks(messageId, limit)
      return NextResponse.json({ topLinks })
    }
    
    if (action === "analytics" && messageId) {
      const totalRecipients = parseInt(searchParams.get("totalRecipients") || "0")
      const analytics = getAnalytics(messageId, totalRecipients)
      return NextResponse.json(analytics)
    }
    
    if (action === "recipient-activity" && recipient) {
      const activity = getRecipientActivity(recipient)
      return NextResponse.json(activity)
    }
    
    if (action === "aggregated") {
      const messageIds = searchParams.get("messageIds")?.split(",") || []
      const analytics = getAggregatedAnalytics(messageIds)
      return NextResponse.json(analytics)
    }
    
    if (messageId) {
      const events = getTrackingEvents(messageId)
      const stats = getMessageStats(messageId)
      return NextResponse.json({ events, stats })
    }
    
    return NextResponse.json({ events: getAllTrackingEvents() })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json()
    const action = body.action
    
    if (action === "record-bounce") {
      const { messageId, recipient, bounceType, bounceReason, bounceCode, smtpResponse } = body
      const event = createBounceEvent(
        messageId,
        recipient,
        bounceType,
        bounceReason,
        bounceCode,
        smtpResponse
      )
      recordBounceEvent(event)
      return NextResponse.json({ success: true, event })
    }
    
    if (action === "suppress") {
      const { email } = body
      suppressEmail(email)
      return NextResponse.json({ success: true })
    }
    
    if (action === "unsuppress") {
      const { email } = body
      const removed = removeSuppression(email)
      return NextResponse.json({ success: removed })
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get("messageId")
    const action = searchParams.get("action")
    
    if (action === "clear-suppressions") {
      clearSuppressions()
      return NextResponse.json({ success: true })
    }
    
    clearTrackingEvents(messageId || undefined)
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}