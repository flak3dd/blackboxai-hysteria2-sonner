import { randomBytes } from "node:crypto"
import { z } from "zod"

export const TrackingConfig = z.object({
  enabled: z.boolean().default(false),
  trackingDomain: z.string().url().optional(),
  trackingPixelPath: z.string().default("/track/pixel"),
  trackingLinkPath: z.string().default("/track/link"),
  trackOpens: z.boolean().default(true),
  trackClicks: z.boolean().default(true),
  trackBounces: z.boolean().default(true),
})
export type TrackingConfig = z.infer<typeof TrackingConfig>

export const TrackingEvent = z.object({
  id: z.string(),
  type: z.enum(["pixel", "link", "bounce", "delivery", "spam_complaint"]),
  messageId: z.string(),
  recipient: z.string().email(),
  timestamp: z.string(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  url: z.string().optional(),
  linkText: z.string().optional(),
})
export type TrackingEvent = z.infer<typeof TrackingEvent>

export const BounceEvent = z.object({
  id: z.string(),
  messageId: z.string(),
  recipient: z.string().email(),
  bounceType: z.enum(["hard", "soft", "complaint", "unknown"]),
  bounceReason: z.string(),
  timestamp: z.string(),
  bounceCode: z.string().optional(),
  smtpResponse: z.string().optional(),
  isSuppressed: z.boolean().default(false),
})
export type BounceEvent = z.infer<typeof BounceEvent>

export const LinkClickEvent = z.object({
  id: z.string(),
  messageId: z.string(),
  recipient: z.string().email(),
  url: z.string(),
  linkText: z.string().optional(),
  timestamp: z.string(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
})
export type LinkClickEvent = z.infer<typeof LinkClickEvent>

export const TrackingAnalytics = z.object({
  messageId: z.string(),
  totalRecipients: z.number(),
  uniqueOpens: z.number(),
  totalOpens: z.number(),
  uniqueClicks: z.number(),
  totalClicks: z.number(),
  bounces: z.number(),
  complaints: z.number(),
  deliveryRate: z.number(),
  openRate: z.number(),
  clickRate: z.number(),
  clickThroughRate: z.number(),
  topLinks: z.array(z.object({
    url: z.string(),
    clicks: z.number(),
    uniqueClicks: z.number(),
  })),
  lastActivity: z.string().optional(),
})
export type TrackingAnalytics = z.infer<typeof TrackingAnalytics>

// In-memory tracking storage (in production, this would be a database)
const trackingEvents: Map<string, TrackingEvent[]> = new Map()
const bounceEvents: Map<string, BounceEvent[]> = new Map()
const suppressedEmails: Set<string> = new Set()
const linkClicks: Map<string, LinkClickEvent[]> = new Map()

export function generateTrackingId(): string {
  return randomBytes(16).toString("hex")
}

export function injectTrackingPixel(
  htmlContent: string,
  trackingUrl: string,
  messageId: string,
): string {
  const pixelUrl = `${trackingUrl}?id=${messageId}&type=pixel`
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`
  
  // Insert before closing body tag
  if (htmlContent.includes("</body>")) {
    return htmlContent.replace("</body>", `${pixelHtml}</body>`)
  }
  
  // If no body tag, append at the end
  return htmlContent + pixelHtml
}

export function injectLinkTracking(
  htmlContent: string,
  trackingDomain: string,
  messageId: string,
): string {
  if (!trackingDomain) return htmlContent
  
  // Replace all href links with tracking links
  return htmlContent.replace(
    /href=["']([^"']+)["']/gi,
    (match, url) => {
      // Skip anchor links, mailto, tel, and already tracked links
      if (url.startsWith("#") || url.startsWith("mailto:") || url.startsWith("tel:") || url.includes(trackingDomain)) {
        return match
      }
      
      const trackingUrl = `${trackingDomain}/track/link?url=${encodeURIComponent(url)}&id=${messageId}`
      return `href="${trackingUrl}"`
    }
  )
}

// Enhanced link tracking with link text extraction
export function injectLinkTrackingWithText(
  htmlContent: string,
  trackingDomain: string,
  messageId: string,
): string {
  if (!trackingDomain) return htmlContent
  
  // Replace all href links with tracking links, preserving link text
  return htmlContent.replace(
    /href=["']([^"']+)["'](.*?)>([^<]+)</gi,
    (match, url, attrs, linkText) => {
      // Skip anchor links, mailto, tel, and already tracked links
      if (url.startsWith("#") || url.startsWith("mailto:") || url.startsWith("tel:") || url.includes(trackingDomain)) {
        return match
      }
      
      const trackingUrl = `${trackingDomain}/track/link?url=${encodeURIComponent(url)}&id=${messageId}&text=${encodeURIComponent(linkText.trim())}`
      return `href="${trackingUrl}${attrs}>${linkText}`
    }
  )
}

export function createTrackingEvent(
  type: "pixel" | "link" | "bounce" | "delivery" | "spam_complaint",
  messageId: string,
  recipient: string,
  metadata?: Record<string, unknown>,
  url?: string,
  linkText?: string,
): TrackingEvent {
  return {
    id: generateTrackingId(),
    type,
    messageId,
    recipient,
    timestamp: new Date().toISOString(),
    metadata,
    url,
    linkText,
  }
}

export function recordTrackingEvent(event: TrackingEvent): void {
  const events = trackingEvents.get(event.messageId) || []
  events.push(event)
  trackingEvents.set(event.messageId, events)
}

export function getTrackingEvents(messageId: string): TrackingEvent[] {
  return trackingEvents.get(messageId) || []
}

export function getMessageStats(messageId: string): {
  opens: number
  clicks: number
  bounces: number
  lastActivity: string | null
} {
  const events = trackingEvents.get(messageId) || []
  
  const opens = events.filter(e => e.type === "pixel").length
  const clicks = events.filter(e => e.type === "link").length
  const bounces = events.filter(e => e.type === "bounce").length
  
  const lastActivity = events.length > 0
    ? events[events.length - 1].timestamp
    : null
  
  return {
    opens,
    clicks,
    bounces,
    lastActivity,
  }
}

export function getAllTrackingEvents(): TrackingEvent[] {
  const allEvents: TrackingEvent[] = []
  
  for (const events of trackingEvents.values()) {
    allEvents.push(...events)
  }
  
  return allEvents.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

export function clearTrackingEvents(messageId?: string): void {
  if (messageId) {
    trackingEvents.delete(messageId)
  } else {
    trackingEvents.clear()
  }
}

// Bounce detection and handling
export function createBounceEvent(
  messageId: string,
  recipient: string,
  bounceType: "hard" | "soft" | "complaint" | "unknown",
  bounceReason: string,
  bounceCode?: string,
  smtpResponse?: string,
): BounceEvent {
  const event: BounceEvent = {
    id: generateTrackingId(),
    messageId,
    recipient,
    bounceType,
    bounceReason,
    bounceCode,
    smtpResponse,
    timestamp: new Date().toISOString(),
    isSuppressed: false,
  }
  
  // Auto-suppress hard bounces and complaints
  if (bounceType === "hard" || bounceType === "complaint") {
    suppressEmail(recipient)
    event.isSuppressed = true
  }
  
  return event
}

export function recordBounceEvent(event: BounceEvent): void {
  const events = bounceEvents.get(event.messageId) || []
  events.push(event)
  bounceEvents.set(event.messageId, events)
}

export function getBounceEvents(messageId: string): BounceEvent[] {
  return bounceEvents.get(messageId) || []
}

export function getAllBounceEvents(): BounceEvent[] {
  const allEvents: BounceEvent[] = []
  
  for (const events of bounceEvents.values()) {
    allEvents.push(...events)
  }
  
  return allEvents.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

export function getBounceStats(): {
  total: number
  hard: number
  soft: number
  complaints: number
  unknown: number
  suppressed: number
} {
  const allBounces = getAllBounceEvents()
  
  return {
    total: allBounces.length,
    hard: allBounces.filter(b => b.bounceType === "hard").length,
    soft: allBounces.filter(b => b.bounceType === "soft").length,
    complaints: allBounces.filter(b => b.bounceType === "complaint").length,
    unknown: allBounces.filter(b => b.bounceType === "unknown").length,
    suppressed: suppressedEmails.size,
  }
}

export function suppressEmail(email: string): void {
  suppressedEmails.add(email.toLowerCase())
}

export function isEmailSuppressed(email: string): boolean {
  return suppressedEmails.has(email.toLowerCase())
}

export function getSuppressedEmails(): string[] {
  return Array.from(suppressedEmails)
}

export function removeSuppression(email: string): boolean {
  return suppressedEmails.delete(email.toLowerCase())
}

export function clearSuppressions(): void {
  suppressedEmails.clear()
}

// Link click tracking
export function recordLinkClick(
  messageId: string,
  recipient: string,
  url: string,
  linkText?: string,
  userAgent?: string,
  ipAddress?: string,
): LinkClickEvent {
  const event: LinkClickEvent = {
    id: generateTrackingId(),
    messageId,
    recipient,
    url,
    linkText,
    timestamp: new Date().toISOString(),
    userAgent,
    ipAddress,
  }
  
  const clicks = linkClicks.get(messageId) || []
  clicks.push(event)
  linkClicks.set(messageId, clicks)
  
  // Also record as a general tracking event
  recordTrackingEvent(createTrackingEvent(
    "link",
    messageId,
    recipient,
    undefined,
    url,
    linkText
  ))
  
  return event
}

export function getLinkClicks(messageId: string): LinkClickEvent[] {
  return linkClicks.get(messageId) || []
}

export function getTopLinks(messageId: string, limit = 10): Array<{
  url: string
  clicks: number
  uniqueClicks: number
  linkText?: string
}> {
  const clicks = getLinkClicks(messageId)
  const linkStats = new Map<string, { clicks: number; uniqueRecipients: Set<string>; linkText?: string }>()
  
  for (const click of clicks) {
    const existing = linkStats.get(click.url) || {
      clicks: 0,
      uniqueRecipients: new Set(),
      linkText: click.linkText,
    }
    
    existing.clicks++
    existing.uniqueRecipients.add(click.recipient)
    linkStats.set(click.url, existing)
  }
  
  return Array.from(linkStats.entries())
    .map(([url, stats]) => ({
      url,
      clicks: stats.clicks,
      uniqueClicks: stats.uniqueRecipients.size,
      linkText: stats.linkText,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit)
}

// Advanced analytics
export function getAnalytics(messageId: string, totalRecipients: number): TrackingAnalytics | null {
  const events = trackingEvents.get(messageId)
  if (!events) return null
  
  const opens = events.filter(e => e.type === "pixel")
  const clicks = events.filter(e => e.type === "link")
  const bounces = events.filter(e => e.type === "bounce")
  const complaints = events.filter(e => e.type === "spam_complaint")
  const deliveries = events.filter(e => e.type === "delivery")
  
  const uniqueOpens = new Set(opens.map(e => e.recipient)).size
  const uniqueClicks = new Set(clicks.map(e => e.recipient)).size
  
  const deliveryRate = totalRecipients > 0 ? (deliveries.length / totalRecipients) * 100 : 0
  const openRate = totalRecipients > 0 ? (uniqueOpens / totalRecipients) * 100 : 0
  const clickRate = totalRecipients > 0 ? (uniqueClicks / totalRecipients) * 100 : 0
  const clickThroughRate = uniqueOpens > 0 ? (uniqueClicks / uniqueOpens) * 100 : 0
  
  const lastActivity = events.length > 0
    ? events[events.length - 1].timestamp
    : undefined
  
  return {
    messageId,
    totalRecipients,
    uniqueOpens,
    totalOpens: opens.length,
    uniqueClicks,
    totalClicks: clicks.length,
    bounces: bounces.length,
    complaints: complaints.length,
    deliveryRate,
    openRate,
    clickRate,
    clickThroughRate,
    topLinks: getTopLinks(messageId),
    lastActivity,
  }
}

export function getAggregatedAnalytics(messageIds: string[]): {
  totalRecipients: number
  totalOpens: number
  totalClicks: number
  totalBounces: number
  totalComplaints: number
  averageOpenRate: number
  averageClickRate: number
} {
  let totalRecipients = 0
  let totalOpens = 0
  let totalClicks = 0
  let totalBounces = 0
  let totalComplaints = 0
  
  for (const messageId of messageIds) {
    const events = trackingEvents.get(messageId)
    if (!events) continue
    
    const opens = events.filter(e => e.type === "pixel").length
    const clicks = events.filter(e => e.type === "link").length
    const bounces = events.filter(e => e.type === "bounce").length
    const complaints = events.filter(e => e.type === "spam_complaint").length
    
    totalOpens += opens
    totalClicks += clicks
    totalBounces += bounces
    totalComplaints += complaints
  }
  
  // Estimate total recipients (this would need to be stored separately in production)
  totalRecipients = messageIds.length * 10 // Placeholder calculation
  
  const averageOpenRate = totalRecipients > 0 ? (totalOpens / totalRecipients) * 100 : 0
  const averageClickRate = totalRecipients > 0 ? (totalClicks / totalRecipients) * 100 : 0
  
  return {
    totalRecipients,
    totalOpens,
    totalClicks,
    totalBounces,
    totalComplaints,
    averageOpenRate,
    averageClickRate,
  }
}

export function getRecipientActivity(recipient: string): {
  totalOpens: number
  totalClicks: number
  totalBounces: number
  lastActivity: string | null
  messageIds: string[]
} {
  const allEvents = getAllTrackingEvents()
  const recipientEvents = allEvents.filter(e => e.recipient.toLowerCase() === recipient.toLowerCase())
  
  const opens = recipientEvents.filter(e => e.type === "pixel").length
  const clicks = recipientEvents.filter(e => e.type === "link").length
  const bounces = recipientEvents.filter(e => e.type === "bounce").length
  
  const lastActivity = recipientEvents.length > 0
    ? recipientEvents[recipientEvents.length - 1].timestamp
    : null
  
  const messageIds = Array.from(new Set(recipientEvents.map(e => e.messageId)))
  
  return {
    totalOpens: opens,
    totalClicks: clicks,
    totalBounces: bounces,
    lastActivity,
    messageIds,
  }
}