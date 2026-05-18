import { z } from "zod"
import { prisma } from "@/lib/db"
import logger from "@/lib/logger"

const log = logger.child({ module: "infrastructure/behavioral-analytics" })

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

export interface BehaviorBaseline {
  userId: string
  avgDailyTx: number
  avgDailyRx: number
  avgConnections: number
  typicalHours: number[]
  typicalDays: number[]
  establishedAt: Date
}

export interface Anomaly {
  userId: string
  type: "traffic_spike" | "unusual_time" | "unusual_volume" | "connection_anomaly"
  severity: "low" | "medium" | "high" | "critical"
  description: string
  value: number
  expected: number
  deviation: number
  detectedAt: Date
}

export interface MitreMapping {
  techniqueId: string
  tactic: string
  name: string
  description: string
  confidence: number
}

/* ------------------------------------------------------------------ */
/*  MITRE ATT&CK Mappings                                             */
/* ------------------------------------------------------------------ */

const MITRE_TECHNIQUES: Record<string, MitreMapping> = {
  T1071_001: { techniqueId: "T1071.001", tactic: "Command and Control", name: "Application Layer Protocol: Web Protocols", description: "Adversaries may communicate using application layer protocols associated with web traffic to avoid detection", confidence: 0 },
  T1070: { techniqueId: "T1070", tactic: "Defense Evasion", name: "Indicator Removal", description: "Adversaries may delete or alter artifacts to remove evidence of their presence", confidence: 0 },
  T1030: { techniqueId: "T1030", tactic: "Exfiltration", name: "Data Transfer Size Limits", description: "Adversaries may split data into smaller chunks to avoid detection", confidence: 0 },
  T1090: { techniqueId: "T1090", tactic: "Command and Control", name: "Proxy", description: "Adversaries may use proxy connections to route traffic through alternate systems", confidence: 0 },
  T1095: { techniqueId: "T1095", tactic: "Command and Control", name: "Non-Application Layer Protocol", description: "Adversaries may use non-application layer protocols for communication", confidence: 0 },
  T1571: { techniqueId: "T1571", tactic: "Command and Control", name: "Non-Standard Port", description: "Adversaries may communicate over non-standard ports to bypass filtering", confidence: 0 },
  T1573: { techniqueId: "T1573", tactic: "Command and Control", name: "Encrypted Channel", description: "Adversaries may employ encryption to hide command and control traffic", confidence: 0 },
}

/* ------------------------------------------------------------------ */
/*  BehavioralAnalyticsEngine Class                                    */
/* ------------------------------------------------------------------ */

export class BehavioralAnalyticsEngine {
  private baselines: Map<string, BehaviorBaseline> = new Map()
  private alertThresholds = {
    trafficSpikeMultiplier: 3,
    unusualTimeDeviation: 2,
    volumeMultiplier: 5,
    connectionMultiplier: 4,
  }

  async establishBaseline(userId: string): Promise<BehaviorBaseline> {
    log.info({ userId }, "Establishing behavior baseline")

    const cached = this.baselines.get(userId)
    if (cached && (Date.now() - cached.establishedAt.getTime()) < 24 * 60 * 60 * 1000) return cached

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    try {
      const records = await prisma.trafficStats.findMany({
        where: { userId, recordedAt: { gte: thirtyDaysAgo } },
        orderBy: { recordedAt: "desc" }, take: 1000,
      })

      if (records.length < 7) {
        const baseline: BehaviorBaseline = {
          userId, avgDailyTx: 0, avgDailyRx: 0, avgConnections: 0,
          typicalHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
          typicalDays: [1, 2, 3, 4, 5], establishedAt: new Date(),
        }
        this.baselines.set(userId, baseline)
        return baseline
      }

      const totalTx = records.reduce((s, r) => s + Number(r.bytesIn), 0)
      const totalRx = records.reduce((s, r) => s + Number(r.bytesOut), 0)
      const totalConns = records.reduce((s, r) => s + r.connections, 0)
      const count = Math.min(30, records.length)

      const hourCounts = new Map<number, number>()
      const dayCounts = new Map<number, number>()
      for (const r of records) {
        const d = new Date(r.recordedAt)
        hourCounts.set(d.getHours(), (hourCounts.get(d.getHours()) || 0) + 1)
        dayCounts.set(d.getDay(), (dayCounts.get(d.getDay()) || 0) + 1)
      }

      const avgHourCount = records.length / 24
      const avgDayCount = records.length / 7
      const typicalHours = Array.from(hourCounts.entries()).filter(([, c]) => c > avgHourCount * 0.5).map(([h]) => h).sort((a, b) => a - b)
      const typicalDays = Array.from(dayCounts.entries()).filter(([, c]) => c > avgDayCount * 0.5).map(([d]) => d).sort((a, b) => a - b)

      const baseline: BehaviorBaseline = {
        userId,
        avgDailyTx: totalTx / count,
        avgDailyRx: totalRx / count,
        avgConnections: totalConns / count,
        typicalHours: typicalHours.length > 0 ? typicalHours : [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        typicalDays: typicalDays.length > 0 ? typicalDays : [1, 2, 3, 4, 5],
        establishedAt: new Date(),
      }

      this.baselines.set(userId, baseline)
      return baseline
    } catch (error) {
      log.error({ err: error, userId }, "Failed to establish baseline")
      const baseline: BehaviorBaseline = {
        userId, avgDailyTx: 0, avgDailyRx: 0, avgConnections: 0,
        typicalHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        typicalDays: [1, 2, 3, 4, 5], establishedAt: new Date(),
      }
      this.baselines.set(userId, baseline)
      return baseline
    }
  }

  async detectAnomalies(userId: string): Promise<Anomaly[]> {
    log.info({ userId }, "Detecting behavioral anomalies")
    const anomalies: Anomaly[] = []

    try {
      const baseline = await this.establishBaseline(userId)
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const recent = await prisma.trafficStats.findMany({
        where: { userId, recordedAt: { gte: twentyFourHoursAgo } },
        orderBy: { recordedAt: "desc" },
      })

      if (recent.length === 0) return anomalies

      const currentTx = recent.reduce((s, r) => s + Number(r.bytesIn), 0)
      const currentRx = recent.reduce((s, r) => s + Number(r.bytesOut), 0)
      const currentConns = recent.reduce((s, r) => s + r.connections, 0)

      if (baseline.avgDailyTx > 0) {
        const txRatio = currentTx / baseline.avgDailyTx
        if (txRatio > this.alertThresholds.trafficSpikeMultiplier) {
          anomalies.push({
            userId, type: "traffic_spike", severity: this.classifySeverity(txRatio, this.alertThresholds.trafficSpikeMultiplier),
            description: `Outbound traffic ${txRatio.toFixed(1)}x above baseline`,
            value: currentTx, expected: baseline.avgDailyTx, deviation: txRatio, detectedAt: now,
          })
        }
      }

      if (baseline.avgDailyRx > 0) {
        const rxRatio = currentRx / baseline.avgDailyRx
        if (rxRatio > this.alertThresholds.volumeMultiplier) {
          anomalies.push({
            userId, type: "unusual_volume", severity: this.classifySeverity(rxRatio, this.alertThresholds.volumeMultiplier),
            description: `Inbound traffic ${rxRatio.toFixed(1)}x above baseline - possible data staging`,
            value: currentRx, expected: baseline.avgDailyRx, deviation: rxRatio, detectedAt: now,
          })
        }
      }

      if (baseline.avgConnections > 0) {
        const connRatio = currentConns / baseline.avgConnections
        if (connRatio > this.alertThresholds.connectionMultiplier) {
          anomalies.push({
            userId, type: "connection_anomaly", severity: this.classifySeverity(connRatio, this.alertThresholds.connectionMultiplier),
            description: `Connection count ${connRatio.toFixed(1)}x above baseline`,
            value: currentConns, expected: baseline.avgConnections, deviation: connRatio, detectedAt: now,
          })
        }
      }

      const currentHour = now.getHours()
      const currentDay = now.getDay()
      const isUnusualHour = baseline.typicalHours.length > 0 && !baseline.typicalHours.includes(currentHour)
      const isUnusualDay = baseline.typicalDays.length > 0 && !baseline.typicalDays.includes(currentDay)

      if ((isUnusualHour || isUnusualDay) && currentTx > baseline.avgDailyTx * 0.5) {
        anomalies.push({
          userId, type: "unusual_time", severity: isUnusualHour && isUnusualDay ? "high" : "medium",
          description: `Activity detected at unusual ${isUnusualHour ? "hour" : "day"} - hour:${currentHour}, day:${currentDay}`,
          value: currentHour, expected: baseline.typicalHours[0] || 9, deviation: isUnusualHour && isUnusualDay ? 3 : 1.5, detectedAt: now,
        })
      }
    } catch (error) {
      log.error({ err: error, userId }, "Anomaly detection failed")
    }

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    return anomalies
  }

  mapToMitre(anomalies: Anomaly[]): MitreMapping[] {
    const mappings: MitreMapping[] = []

    for (const anomaly of anomalies) {
      switch (anomaly.type) {
        case "traffic_spike": {
          const t1071 = { ...MITRE_TECHNIQUES.T1071_001, confidence: Math.min(0.95, anomaly.deviation / 10) }
          mappings.push(t1071)
          if (anomaly.severity === "critical" || anomaly.severity === "high") {
            mappings.push({ ...MITRE_TECHNIQUES.T1095, confidence: Math.min(0.8, anomaly.deviation / 15) })
          }
          break
        }
        case "unusual_time": {
          mappings.push({ ...MITRE_TECHNIQUES.T1090, confidence: anomaly.deviation > 2 ? 0.7 : 0.4 })
          mappings.push({ ...MITRE_TECHNIQUES.T1573, confidence: 0.3 })
          break
        }
        case "unusual_volume": {
          mappings.push({ ...MITRE_TECHNIQUES.T1030, confidence: Math.min(0.9, anomaly.deviation / 8) })
          if (anomaly.severity === "critical") mappings.push({ ...MITRE_TECHNIQUES.T1070, confidence: 0.5 })
          break
        }
        case "connection_anomaly": {
          mappings.push({ ...MITRE_TECHNIQUES.T1090, confidence: Math.min(0.85, anomaly.deviation / 6) })
          mappings.push({ ...MITRE_TECHNIQUES.T1571, confidence: 0.4 })
          break
        }
      }
    }

    const unique = new Map<string, MitreMapping>()
    for (const m of mappings) {
      const existing = unique.get(m.techniqueId)
      if (!existing || m.confidence > existing.confidence) unique.set(m.techniqueId, m)
    }

    return Array.from(unique.values()).sort((a, b) => b.confidence - a.confidence)
  }

  correlateEvents(events: Array<{ type: string; timestamp: Date; userId: string }>): Anomaly[] {
    const anomalies: Anomaly[] = []
    const userEvents = new Map<string, typeof events>()
    for (const e of events) {
      const list = userEvents.get(e.userId) || []
      list.push(e)
      userEvents.set(e.userId, list)
    }

    for (const [userId, userEventList] of userEvents) {
      userEventList.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      let rapidCount = 0
      for (let i = 1; i < userEventList.length; i++) {
        if (userEventList[i].timestamp.getTime() - userEventList[i - 1].timestamp.getTime() < 5 * 60 * 1000) rapidCount++
      }

      if (rapidCount > 5) {
        anomalies.push({
          userId, type: "traffic_spike", severity: rapidCount > 15 ? "critical" : rapidCount > 10 ? "high" : "medium",
          description: `${rapidCount} rapid-fire events detected - possible automation`,
          value: rapidCount, expected: 2, deviation: rapidCount / 2, detectedAt: new Date(),
        })
      }

      const typeCounts = new Map<string, number>()
      for (const e of userEventList) typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1)
      for (const [eventType, count] of typeCounts) {
        if (count > 10) {
          anomalies.push({
            userId, type: "connection_anomaly", severity: count > 30 ? "high" : "medium",
            description: `Excessive "${eventType}" events (${count}) - may indicate C2 beaconing`,
            value: count, expected: 5, deviation: count / 5, detectedAt: new Date(),
          })
        }
      }

      const offHours = userEventList.filter(e => { const h = e.timestamp.getHours(); return h < 6 || h > 22 })
      if (offHours.length > 3) {
        anomalies.push({
          userId, type: "unusual_time", severity: offHours.length > 10 ? "high" : "medium",
          description: `${offHours.length} events during off-hours - possible unauthorized activity`,
          value: offHours.length, expected: 1, deviation: offHours.length, detectedAt: new Date(),
        })
      }
    }

    return anomalies
  }

  async calculateRiskScore(userId: string): Promise<number> {
    try {
      const anomalies = await this.detectAnomalies(userId)
      const mitreMappings = this.mapToMitre(anomalies)
      let score = 0
      const severityPoints = { low: 5, medium: 15, high: 30, critical: 50 }
      for (const a of anomalies) score += severityPoints[a.severity]
      for (const m of mitreMappings) score += Math.round(m.confidence * 20)
      return Math.min(100, score)
    } catch (error) {
      log.error({ err: error, userId }, "Risk score calculation failed")
      return 0
    }
  }

  async generateAlerts(anomalies: Anomaly[]): Promise<void> {
    const highSeverity = anomalies.filter(a => a.severity === "high" || a.severity === "critical")
    if (highSeverity.length === 0) return

    log.warn({ count: highSeverity.length }, "High-severity behavioral anomalies detected")

    for (const anomaly of highSeverity) {
      try {
        await prisma.notification.create({
          data: {
            operatorId: "system",
            type: "warning",
            title: `Behavioral Anomaly: ${anomaly.type.replace(/_/g, " ")}`,
            message: anomaly.description,
            metadata: { anomalyType: anomaly.type, value: anomaly.value, expected: anomaly.expected, deviation: anomaly.deviation, userId: anomaly.userId } as any,
          },
        })
      } catch { /* db write failed */ }
    }
  }

  async getAnalyticsDashboard(): Promise<{
    totalUsers: number
    anomalies24h: number
    topAnomalies: Anomaly[]
    riskDistribution: Record<string, number>
  }> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const totalUsers = await prisma.trafficStats.groupBy({ by: ["userId"] })
      const recentAnomalies = await prisma.notification.findMany({
        where: { type: "warning", title: { contains: "Behavioral Anomaly" }, createdAt: { gte: twentyFourHoursAgo } },
        orderBy: { createdAt: "desc" }, take: 50,
      })

      const topAnomalies: Anomaly[] = recentAnomalies.slice(0, 10).map(n => ({
        userId: (n.metadata as any)?.userId || "unknown",
        type: (n.metadata as any)?.anomalyType || "traffic_spike",
        severity: "medium" as Anomaly["severity"],
        description: n.message,
        value: (n.metadata as any)?.value || 0,
        expected: (n.metadata as any)?.expected || 0,
        deviation: (n.metadata as any)?.deviation || 0,
        detectedAt: n.createdAt,
      }))

      const riskDistribution: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
      for (const n of recentAnomalies) {
        const sev = (n.metadata as any)?.severity as string
        if (sev && sev in riskDistribution) riskDistribution[sev]++
      }

      return { totalUsers: totalUsers.length, anomalies24h: recentAnomalies.length, topAnomalies, riskDistribution }
    } catch (error) {
      log.error({ err: error }, "Failed to get analytics dashboard data")
      return { totalUsers: 0, anomalies24h: 0, topAnomalies: [], riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 } }
    }
  }

  private classifySeverity(ratio: number, threshold: number): Anomaly["severity"] {
    if (ratio > threshold * 3) return "critical"
    if (ratio > threshold * 2) return "high"
    if (ratio > threshold * 1.5) return "medium"
    return "low"
  }
}

export const behavioralAnalytics = new BehavioralAnalyticsEngine()
