import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/auth/admin"
import { behavioralAnalytics } from "@/lib/infrastructure/behavioral-analytics"
import logger from "@/lib/logger"

const log = logger.child({ module: "api/admin/analytics/behavior" })

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try { await verifyAdmin(request) } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  try {
    const dashboard = await behavioralAnalytics.getAnalyticsDashboard()
    return NextResponse.json({ success: true, ...dashboard })
  } catch (error) {
    log.error({ err: error }, "Behavioral analytics dashboard error")
    return NextResponse.json({ error: "Failed to get analytics dashboard", message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try { await verifyAdmin(request) } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  try {
    const body = await request.json()
    const { userId, action } = body as { userId: string; action: "baseline" | "detect" | "risk_score" }

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 })
    if (!action || !["baseline", "detect", "risk_score"].includes(action))
      return NextResponse.json({ error: "action must be 'baseline', 'detect', or 'risk_score'" }, { status: 400 })

    switch (action) {
      case "baseline": {
        const baseline = await behavioralAnalytics.establishBaseline(userId)
        return NextResponse.json({ success: true, action: "baseline", userId, baseline })
      }
      case "detect": {
        const anomalies = await behavioralAnalytics.detectAnomalies(userId)
        const mitreMappings = behavioralAnalytics.mapToMitre(anomalies)
        await behavioralAnalytics.generateAlerts(anomalies)
        return NextResponse.json({
          success: true, action: "detect", userId, anomalies, mitreMappings,
          anomalyCount: anomalies.length,
          criticalCount: anomalies.filter(a => a.severity === "critical").length,
          highCount: anomalies.filter(a => a.severity === "high").length,
        })
      }
      case "risk_score": {
        const riskScore = await behavioralAnalytics.calculateRiskScore(userId)
        const anomalies = await behavioralAnalytics.detectAnomalies(userId)
        const mitreMappings = behavioralAnalytics.mapToMitre(anomalies)
        return NextResponse.json({
          success: true, action: "risk_score", userId, riskScore,
          riskLevel: riskScore >= 75 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low",
          anomalyCount: anomalies.length,
          topMitreTechniques: mitreMappings.slice(0, 5),
        })
      }
    }
  } catch (error) {
    log.error({ err: error }, "Behavioral analytics action error")
    return NextResponse.json({ error: "Behavioral analytics action failed", message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
