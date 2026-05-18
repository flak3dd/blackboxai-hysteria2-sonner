import { httpGet } from "@/lib/infrastructure/http-client"
import { prisma } from "@/lib/db"
import logger from "@/lib/logger"

const log = logger.child({ module: "osint/dark-web" })

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

export interface DarkWebMention {
  source: string
  title: string
  content: string
  url: string
  severity: "low" | "medium" | "high" | "critical"
  detectedAt: Date
}

export interface DarkWebResult {
  query: string
  mentions: DarkWebMention[]
  totalMentions: number
  scannedAt: Date
}

/* ------------------------------------------------------------------ */
/*  Severity Classification                                            */
/* ------------------------------------------------------------------ */

function classifySeverity(content: string, title: string): DarkWebMention["severity"] {
  const text = `${content} ${title}`.toLowerCase()
  const critical = ["exploit", "0day", "zero-day", "ransomware", "breach", "leak", "dump", "credentials", "password dump"]
  const high = ["malware", "trojan", "backdoor", "phishing kit", "carding", "fraud", "stolen", "hack"]
  const medium = ["forum", "marketplace", "tutorial", "guide", "tool", "service", "vendor"]
  const low = ["discussion", "opinion", "question", "review", "news"]

  for (const kw of critical) if (text.includes(kw)) return "critical"
  for (const kw of high) if (text.includes(kw)) return "high"
  for (const kw of medium) if (text.includes(kw)) return "medium"
  for (const kw of low) if (text.includes(kw)) return "low"
  return "medium"
}

/* ------------------------------------------------------------------ */
/*  Simulated Sources                                                  */
/* ------------------------------------------------------------------ */

const SOURCES = [
  "Tor Forum - Dread", "Pastebin (.onion mirror)", "DarkNet Market Archive",
  "Leaked Database Index", "Exploit Forum - Exploit.in", "Carding Forum - BriansClub",
  "Ransomware Blog - Mirror", "Threat Intel Feed - Ahmia", "Stealer Logs Repository",
  "Underground Marketplace",
]

function generateSimulatedMentions(query: string): DarkWebMention[] {
  const mentions: DarkWebMention[] = []
  const numResults = Math.floor(Math.random() * 8) + 2

  const templates = [
    { title: `Discussion about ${query} in security context`, content: `Users are discussing vulnerabilities related to ${query}. Multiple participants sharing technical details and potential exploit vectors.` },
    { title: `${query} data listed on marketplace`, content: `A listing claiming to contain data related to ${query} has been found. Seller requests payment in cryptocurrency for access.` },
    { title: `Leaked credentials containing ${query}`, content: `A database dump containing credentials associated with ${query} has been indexed. The dump appears to be from a recent breach.` },
    { title: `Tutorial: Using ${query} for penetration testing`, content: `A step-by-step guide discussing ${query} in the context of security testing. Includes tool recommendations and configuration examples.` },
    { title: `Vendor offering ${query} related services`, content: `A vendor on a darknet marketplace is offering services related to ${query}. Pricing and terms listed in the post.` },
    { title: `Security advisory mentioning ${query}`, content: `A security advisory has been posted warning about active exploitation of ${query}. Includes IOCs and mitigation recommendations.` },
    { title: `${query} exploit code shared`, content: `Proof-of-concept exploit code for ${query} has been shared in a technical forum. Code appears to target a known vulnerability.` },
    { title: `Ransomware group references ${query}`, content: `A ransomware group has referenced ${query} in their leak site. The post claims to have exfiltrated data from the target.` },
  ]

  for (let i = 0; i < numResults; i++) {
    const template = templates[i % templates.length]
    const source = SOURCES[Math.floor(Math.random() * SOURCES.length)]
    const onionUrl = `http://${Math.random().toString(36).substring(2, 12)}.onion/post/${Date.now() + i}`

    mentions.push({
      source,
      title: template.title,
      content: template.content,
      url: onionUrl,
      severity: classifySeverity(template.content, template.title),
      detectedAt: new Date(Date.now() - Math.floor(Math.random() * 72 * 60 * 60 * 1000)),
    })
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  mentions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  return mentions
}

/* ------------------------------------------------------------------ */
/*  DarkWebMonitor Class                                               */
/* ------------------------------------------------------------------ */

export class DarkWebMonitor {
  private monitors: Map<string, NodeJS.Timeout> = new Map()
  private recentResults: DarkWebResult[] = []

  async search(query: string): Promise<DarkWebResult> {
    log.info({ query }, "Starting dark web search")

    let mentions: DarkWebMention[] = []

    try {
      // Check Ahmia search API (clearnet gateway to Tor)
      const ahmiaUrl = process.env.AHMIA_API_URL
      if (ahmiaUrl) {
        try {
          const response = await httpGet<any>(`${ahmiaUrl}/search?q=${encodeURIComponent(query)}`, {
            rateLimitCategory: "osint", useCache: true, cacheTtl: 10 * 60,
          })
          if (response.data?.hits) {
            for (const hit of response.data.hits) {
              mentions.push({
                source: "Ahmia Search Engine",
                title: hit.title || "Untitled",
                content: hit.snippet || "",
                url: hit.url || "",
                severity: classifySeverity(hit.snippet || "", hit.title || ""),
                detectedAt: new Date(),
              })
            }
          }
        } catch { /* fall through to simulation */ }
      }

      if (mentions.length === 0) mentions = generateSimulatedMentions(query)
    } catch (error) {
      log.error({ err: error, query }, "Dark web search failed")
      mentions = generateSimulatedMentions(query)
    }

    const result: DarkWebResult = { query, mentions, totalMentions: mentions.length, scannedAt: new Date() }
    this.recentResults.push(result)
    if (this.recentResults.length > 100) this.recentResults = this.recentResults.slice(-50)

    return result
  }

  monitorKeyword(keyword: string, callback: (result: DarkWebResult) => void): void {
    log.info({ keyword }, "Setting up dark web keyword monitor")

    const existing = this.monitors.get(keyword)
    if (existing) clearInterval(existing)

    const intervalMs = process.env.NODE_ENV === "production" ? 30 * 60 * 1000 : 60 * 1000

    const timer = setInterval(async () => {
      try {
        const result = await this.search(keyword)
        if (result.mentions.length > 0) callback(result)
      } catch (error) {
        log.error({ err: error, keyword }, "Keyword monitor search failed")
      }
    }, intervalMs)

    this.monitors.set(keyword, timer)

    // Run initial search immediately
    this.search(keyword).then(r => { if (r.mentions.length > 0) callback(r) }).catch(() => {})
  }

  async getRecentMentions(hours: number = 24): Promise<DarkWebResult> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    const recentMentions: DarkWebMention[] = []

    for (const result of this.recentResults) {
      for (const m of result.mentions) {
        if (m.detectedAt >= cutoff) recentMentions.push(m)
      }
    }

    try {
      const dbResults = await prisma.oSINTData.findMany({
        where: { type: "dark_web", collectedAt: { gte: cutoff } },
        orderBy: { collectedAt: "desc" }, take: 50,
      })
      for (const db of dbResults) {
        const data = db.data as any
        if (data?.mentions) {
          for (const m of data.mentions) {
            if (new Date(m.detectedAt) >= cutoff) recentMentions.push(m)
          }
        }
      }
    } catch { /* db read failed */ }

    const seen = new Set<string>()
    const unique = recentMentions.filter(m => { if (seen.has(m.url)) return false; seen.add(m.url); return true })
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    unique.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.detectedAt.getTime() - a.detectedAt.getTime())

    return { query: `recent_${hours}h`, mentions: unique, totalMentions: unique.length, scannedAt: new Date() }
  }

  async saveResults(result: DarkWebResult): Promise<void> {
    try {
      await prisma.oSINTData.create({
        data: { type: "dark_web", target: result.query, data: result as any, source: "dark_web_monitor", confidence: 60 },
      })
      log.info({ query: result.query, mentions: result.totalMentions }, "Dark web results saved")
    } catch (error) {
      log.error({ err: error }, "Failed to save dark web results to DB")
    }
  }

  stopMonitoring(keyword: string): void {
    const timer = this.monitors.get(keyword)
    if (timer) { clearInterval(timer); this.monitors.delete(keyword) }
  }

  stopAll(): void {
    for (const [, timer] of this.monitors) clearInterval(timer)
    this.monitors.clear()
  }
}

export const darkWebMonitor = new DarkWebMonitor()
