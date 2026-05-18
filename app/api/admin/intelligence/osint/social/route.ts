import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/auth/admin"
import { analyzeTwitter, analyzeLinkedIn, generateTargetDossier, buildSocialGraph } from "@/lib/osint/social-media"
import logger from "@/lib/logger"

const log = logger.child({ module: "api/admin/osint/social" })

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try { await verifyAdmin(request) } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  try {
    const body = await request.json()
    const { target, platforms } = body as { target: string; platforms?: string[] }

    if (!target) return NextResponse.json({ error: "Target parameter is required" }, { status: 400 })

    if (platforms && platforms.length > 0) {
      const results = await Promise.allSettled(
        platforms.map((p: string) => p.toLowerCase() === "twitter" || p.toLowerCase() === "x" ? analyzeTwitter(target) : p.toLowerCase() === "linkedin" ? analyzeLinkedIn(target) : Promise.reject(new Error(`Unknown platform: ${p}`)))
      )

      const allProfiles: any[] = []
      const allIndicators: string[] = []
      let sentiment: any

      for (const r of results) {
        if (r.status === "fulfilled") {
          allProfiles.push(...r.value.profiles)
          allIndicators.push(...r.value.behavioralIndicators)
          if (r.value.sentiment) sentiment = r.value.sentiment
        }
      }

      const graph = allProfiles.length >= 2 ? buildSocialGraph(allProfiles) : undefined

      return NextResponse.json({
        success: true, target, profiles: allProfiles, graph, sentiment,
        behavioralIndicators: [...new Set(allIndicators)], collectedAt: new Date(),
      })
    }

    const dossier = await generateTargetDossier(target)
    return NextResponse.json({ success: true, ...dossier })
  } catch (error) {
    log.error({ err: error }, "Social media analysis error")
    return NextResponse.json({ error: "Social media analysis failed", message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
