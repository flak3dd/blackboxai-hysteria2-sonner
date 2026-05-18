import { serverEnv } from "@/lib/env"
import logger from "@/lib/logger"
import { prisma } from "@/lib/db"

const log = logger.child({ module: "bandwidth-monitor" })

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

export interface BandwidthSnapshot {
  nodeId: string
  txBytesPerSec: number
  rxBytesPerSec: number
  totalBytesPerSec: number
  activeConnections: number
  timestamp: Date
}

export interface BandwidthAlert {
  nodeId: string
  type: "threshold_exceeded" | "spike_detected" | "sustained_high"
  value: number
  threshold: number
  timestamp: Date
}

interface AlertThresholds {
  txMbps: number
  rxMbps: number
  spikeMultiplier: number
}

const DEFAULT_THRESHOLDS: AlertThresholds = { txMbps: 100, rxMbps: 100, spikeMultiplier: 3 }
const MAX_SNAPSHOTS = 60
const SUSTAINED_WINDOW = 10

/* ------------------------------------------------------------------ */
/*  BandwidthMonitor Class                                            */
/* ------------------------------------------------------------------ */

export class BandwidthMonitor {
  private snapshots: Map<string, BandwidthSnapshot[]> = new Map()
  private alerts: BandwidthAlert[] = []
  private alertThresholds: Map<string, AlertThresholds> = new Map()
  private defaultThresholds: AlertThresholds = { ...DEFAULT_THRESHOLDS }
  private monitoringInterval: NodeJS.Timeout | null = null
  private baseUrl: string
  private secret?: string

  constructor() {
    const env = serverEnv()
    this.baseUrl = env.HYSTERIA_TRAFFIC_API_BASE_URL
    this.secret = env.HYSTERIA_TRAFFIC_API_SECRET
  }

  async collectSnapshot(nodeId: string): Promise<BandwidthSnapshot> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (this.secret) headers["Authorization"] = `Bearer ${this.secret}`

      const [trafficRes, onlineRes] = await Promise.all([
        fetch(`${this.baseUrl}/traffic`, { headers, signal: AbortSignal.timeout(10000) }).catch(() => null),
        fetch(`${this.baseUrl}/online`, { headers, signal: AbortSignal.timeout(10000) }).catch(() => null),
      ])

      let txBytesPerSec = 0, rxBytesPerSec = 0, activeConnections = 0

      if (trafficRes?.ok) {
        const data = await trafficRes.json() as Record<string, { tx: number; rx: number }>
        for (const s of Object.values(data)) {
          txBytesPerSec += s.tx || 0
          rxBytesPerSec += s.rx || 0
        }
      }

      if (onlineRes?.ok) {
        const data = await onlineRes.json() as Record<string, number>
        for (const c of Object.values(data)) activeConnections += c || 0
      }

      const snapshot: BandwidthSnapshot = {
        nodeId, txBytesPerSec, rxBytesPerSec,
        totalBytesPerSec: txBytesPerSec + rxBytesPerSec,
        activeConnections, timestamp: new Date(),
      }

      const nodeSnaps = this.snapshots.get(nodeId) || []
      nodeSnaps.push(snapshot)
      if (nodeSnaps.length > MAX_SNAPSHOTS) nodeSnaps.splice(0, nodeSnaps.length - MAX_SNAPSHOTS)
      this.snapshots.set(nodeId, nodeSnaps)

      return snapshot
    } catch (error) {
      log.error({ err: error, nodeId }, "Failed to collect bandwidth snapshot")
      return { nodeId, txBytesPerSec: 0, rxBytesPerSec: 0, totalBytesPerSec: 0, activeConnections: 0, timestamp: new Date() }
    }
  }

  async analyzeBandwidth(nodeId: string): Promise<{
    average: BandwidthSnapshot
    peak: BandwidthSnapshot
    trend: "increasing" | "stable" | "decreasing"
  }> {
    const snaps = this.snapshots.get(nodeId) || []
    const zero: BandwidthSnapshot = { nodeId, txBytesPerSec: 0, rxBytesPerSec: 0, totalBytesPerSec: 0, activeConnections: 0, timestamp: new Date() }

    if (snaps.length === 0) return { average: zero, peak: zero, trend: "stable" }

    const count = snaps.length
    const totalTx = snaps.reduce((s, n) => s + n.txBytesPerSec, 0)
    const totalRx = snaps.reduce((s, n) => s + n.rxBytesPerSec, 0)
    const totalConns = snaps.reduce((s, n) => s + n.activeConnections, 0)

    const average: BandwidthSnapshot = {
      nodeId, txBytesPerSec: totalTx / count, rxBytesPerSec: totalRx / count,
      totalBytesPerSec: (totalTx + totalRx) / count,
      activeConnections: Math.round(totalConns / count), timestamp: new Date(),
    }

    const peak = snaps.reduce((max, s) => s.totalBytesPerSec > max.totalBytesPerSec ? s : max, snaps[0])

    const halfIdx = Math.floor(count / 2)
    const firstAvg = snaps.slice(0, halfIdx).reduce((s, n) => s + n.totalBytesPerSec, 0) / (halfIdx || 1)
    const secondAvg = snaps.slice(halfIdx).reduce((s, n) => s + n.totalBytesPerSec, 0) / (count - halfIdx || 1)
    const changePct = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0

    const trend: "increasing" | "stable" | "decreasing" =
      changePct > 10 ? "increasing" : changePct < -10 ? "decreasing" : "stable"

    return { average, peak, trend }
  }

  async detectAnomalies(nodeId: string): Promise<BandwidthAlert[]> {
    const snaps = this.snapshots.get(nodeId) || []
    const newAlerts: BandwidthAlert[] = []
    const thresholds = this.alertThresholds.get(nodeId) || this.defaultThresholds

    if (snaps.length === 0) return newAlerts

    const latest = snaps[snaps.length - 1]
    const txMbps = (latest.txBytesPerSec * 8) / 1_000_000
    const rxMbps = (latest.rxBytesPerSec * 8) / 1_000_000

    if (txMbps > thresholds.txMbps) {
      const alert: BandwidthAlert = { nodeId, type: "threshold_exceeded", value: txMbps, threshold: thresholds.txMbps, timestamp: new Date() }
      newAlerts.push(alert)
      this.alerts.push(alert)
    }

    if (rxMbps > thresholds.rxMbps) {
      const alert: BandwidthAlert = { nodeId, type: "threshold_exceeded", value: rxMbps, threshold: thresholds.rxMbps, timestamp: new Date() }
      newAlerts.push(alert)
      this.alerts.push(alert)
    }

    if (snaps.length >= 3) {
      const avgTotal = snaps.reduce((s, n) => s + n.totalBytesPerSec, 0) / snaps.length
      if (avgTotal > 0 && latest.totalBytesPerSec > avgTotal * thresholds.spikeMultiplier) {
        const alert: BandwidthAlert = { nodeId, type: "spike_detected", value: (latest.totalBytesPerSec * 8) / 1_000_000, threshold: (avgTotal * thresholds.spikeMultiplier * 8) / 1_000_000, timestamp: new Date() }
        newAlerts.push(alert)
        this.alerts.push(alert)
      }
    }

    if (snaps.length >= SUSTAINED_WINDOW) {
      const recent = snaps.slice(-SUSTAINED_WINDOW)
      const allHigh = recent.every(s => {
        const sTxMbps = (s.txBytesPerSec * 8) / 1_000_000
        const sRxMbps = (s.rxBytesPerSec * 8) / 1_000_000
        return sTxMbps > thresholds.txMbps * 0.8 || sRxMbps > thresholds.rxMbps * 0.8
      })
      if (allHigh) {
        const alert: BandwidthAlert = { nodeId, type: "sustained_high", value: (latest.totalBytesPerSec * 8) / 1_000_000, threshold: thresholds.txMbps * 0.8, timestamp: new Date() }
        newAlerts.push(alert)
        this.alerts.push(alert)
      }
    }

    if (newAlerts.length > 0) log.warn({ nodeId, alertCount: newAlerts.length }, "Bandwidth anomalies detected")
    return newAlerts
  }

  getAlerts(since?: Date): BandwidthAlert[] {
    if (!since) return [...this.alerts]
    return this.alerts.filter(a => a.timestamp >= since)
  }

  setThreshold(nodeId: string, threshold: Partial<AlertThresholds>): void {
    const current = this.alertThresholds.get(nodeId) || { ...this.defaultThresholds }
    this.alertThresholds.set(nodeId, { ...current, ...threshold })
    log.info({ nodeId, threshold }, "Alert thresholds updated")
  }

  startMonitoring(intervalMs: number = 10000): void {
    if (this.monitoringInterval) this.stopMonitoring()
    log.info({ intervalMs }, "Starting bandwidth monitoring")

    this.monitoringInterval = setInterval(async () => {
      try {
        const nodes = await prisma.hysteriaNode.findMany({ select: { id: true } })
        for (const node of nodes) {
          await this.collectSnapshot(node.id)
          await this.detectAnomalies(node.id)
        }
      } catch (error) {
        log.error({ err: error }, "Monitoring loop error")
      }
    }, intervalMs)
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      log.info("Bandwidth monitoring stopped")
    }
  }

  getSnapshots(nodeId: string): BandwidthSnapshot[] { return this.snapshots.get(nodeId) || [] }
  clearSnapshots(nodeId?: string): void { if (nodeId) this.snapshots.delete(nodeId); else this.snapshots.clear() }
  clearAlerts(): void { this.alerts = [] }
}

let instance: BandwidthMonitor | null = null
export function getBandwidthMonitor(): BandwidthMonitor {
  if (!instance) instance = new BandwidthMonitor()
  return instance
}
