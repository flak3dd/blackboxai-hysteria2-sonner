import { serverEnv } from "@/lib/env"
import logger from "@/lib/logger"
import { prisma } from "@/lib/db"

const trafficStatsLogger = logger.child({ module: 'traffic-stats' })

export interface TrafficStats {
  tx: number // Transmitted bytes
  rx: number // Received bytes
  timestamp: Date
}

export interface OnlineStats {
  connections: number
  timestamp: Date
}

export interface BandwidthHistory {
  period: string // '1m', '5m', '15m', '1h', '24h'
  data: Array<{
    timestamp: Date
    tx: number
    rx: number
    total: number
  }>
}

export interface PerUserStats {
  userId: string
  displayName: string
  authToken: string
  tx: number
  rx: number
  total: number
  connections: number
  timestamp: Date
}

/**
 * Traffic Stats Collector Service
 * Connects to Hysteria2 Traffic Stats API to collect real-time traffic data
 */
export class TrafficStatsCollector {
  private baseUrl: string
  private secret?: string
  private cache: Map<string, { data: unknown; timestamp: number }>
  private readonly cacheTTL = 5000 // 5 seconds cache

  constructor() {
    this.baseUrl = serverEnv().HYSTERIA_TRAFFIC_API_BASE_URL
    this.secret = serverEnv().HYSTERIA_TRAFFIC_API_SECRET
    this.cache = new Map()
  }

  /**
   * Make authenticated request to Hysteria2 Traffic Stats API
   */
  private async fetchFromAPI(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (this.secret) {
      headers['Authorization'] = `Bearer ${this.secret}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      trafficStatsLogger.error(`Failed to fetch from ${endpoint}: ${error}`)
      throw error
    }
  }

  /**
   * Get cached data or fetch fresh data
   */
  private async getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    const now = Date.now()

    if (cached && (now - cached.timestamp) < this.cacheTTL) {
      return cached.data as T
    }

    const data = await fetcher()
    this.cache.set(key, { data, timestamp: now })
    return data
  }

  /**
   * Fetch current traffic stats for all users
   */
  async fetchTraffic(clearCache = false): Promise<Record<string, TrafficStats>> {
    if (clearCache) {
      this.cache.delete('traffic')
    }

    return this.getCachedOrFetch('traffic', async () => {
      try {
        const data = await this.fetchFromAPI('/traffic') as Record<string, { tx: number; rx: number }>
        
        const result: Record<string, TrafficStats> = {}
        for (const [token, stats] of Object.entries(data)) {
          result[token] = {
            tx: stats.tx || 0,
            rx: stats.rx || 0,
            timestamp: new Date(),
          }
        }

        trafficStatsLogger.info(`Fetched traffic stats for ${Object.keys(result).length} users`)
        return result
      } catch (error) {
        trafficStatsLogger.warn(`Failed to fetch traffic stats, returning empty: ${error}`)
        return {}
      }
    })
  }

  /**
   * Fetch online users and connection counts
   */
  async fetchOnline(clearCache = false): Promise<Record<string, number>> {
    if (clearCache) {
      this.cache.delete('online')
    }

    return this.getCachedOrFetch('online', async () => {
      try {
        const data = await this.fetchFromAPI('/online') as Record<string, number>
        trafficStatsLogger.info(`Fetched online stats: ${Object.keys(data).length} users with connections`)
        return data
      } catch (error) {
        trafficStatsLogger.warn(`Failed to fetch online stats, returning empty: ${error}`)
        return {}
      }
    })
  }

  /**
   * Fetch detailed stream information
   */
  async fetchStreams(clearCache = false): Promise<Array<{
    state: string
    auth: string
    connection: number
    stream: number
    req_addr: string
    hooked_req_addr: string
    tx: number
    rx: number
    initial_at: string
    last_active_at: string
  }>> {
    if (clearCache) {
      this.cache.delete('streams')
    }

    return this.getCachedOrFetch('streams', async () => {
      try {
        const data = await this.fetchFromAPI('/streams')
        const streams = (data as { streams: unknown[] }).streams || []
        trafficStatsLogger.info(`Fetched ${streams.length} active streams`)
        return streams as Array<{
          state: string
          auth: string
          connection: number
          stream: number
          req_addr: string
          hooked_req_addr: string
          tx: number
          rx: number
          initial_at: string
          last_active_at: string
        }>
      } catch (error) {
        trafficStatsLogger.warn(`Failed to fetch streams, returning empty: ${error}`)
        return []
      }
    })
  }

  /**
   * Fetch global traffic statistics
   */
  async fetchGlobalStats(clearCache = false): Promise<{
    totalTx: number
    totalRx: number
    totalConnections: number
    activeUsers: number
    timestamp: Date
  }> {
    if (clearCache) {
      this.cache.delete('global')
    }

    return this.getCachedOrFetch('global', async () => {
      try {
        const [traffic, online] = await Promise.all([
          this.fetchTraffic(),
          this.fetchOnline(),
        ])

        let totalTx = 0
        let totalRx = 0
        let totalConnections = 0

        for (const stats of Object.values(traffic)) {
          totalTx += stats.tx
          totalRx += stats.rx
        }

        for (const connections of Object.values(online)) {
          totalConnections += connections
        }

        return {
          totalTx,
          totalRx,
          totalConnections,
          activeUsers: Object.keys(traffic).length,
          timestamp: new Date(),
        }
      } catch (error) {
        trafficStatsLogger.error(`Failed to fetch global stats: ${error}`)
        return {
          totalTx: 0,
          totalRx: 0,
          totalConnections: 0,
          activeUsers: 0,
          timestamp: new Date(),
        }
      }
    })
  }

  /**
   * Fetch bandwidth history for a specific time period
   */
  async fetchBandwidthHistory(period: '1m' | '5m' | '15m' | '1h' | '24h' = '5m'): Promise<BandwidthHistory> {
    const minutes = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '24h': 1440,
    }[period]

    // For now, generate synthetic history data
    // In production, this would query a time-series database or the Hysteria2 API
    const data: BandwidthHistory['data'] = []
    const now = Date.now()
    const interval = minutes * 60 * 1000 / 60 // 60 data points

    for (let i = 0; i < 60; i++) {
      const timestamp = new Date(now - (i * interval))
      const variance = Math.random() * 0.3 + 0.85 // 85-115% variance
      const baseTx = 1024 * 1024 * 10 // 10MB base
      const baseRx = 1024 * 1024 * 15 // 15MB base

      data.push({
        timestamp,
        tx: Math.round(baseTx * variance * (1 - i / 100)), // Slight downward trend
        rx: Math.round(baseRx * variance * (1 - i / 100)),
        total: Math.round((baseTx + baseRx) * variance * (1 - i / 100)),
      })
    }

    return {
      period,
      data: data.reverse(),
    }
  }

  /**
   * Get per-user traffic breakdown
   */
  async getPerUserStats(userMap: Map<string, { id: string; displayName: string }>): Promise<PerUserStats[]> {
    const [traffic, online] = await Promise.all([
      this.fetchTraffic(),
      this.fetchOnline(),
    ])

    const stats: PerUserStats[] = []

    for (const [authToken, trafficData] of Object.entries(traffic)) {
      const user = userMap.get(authToken)
      if (!user) continue

      stats.push({
        userId: user.id,
        displayName: user.displayName,
        authToken,
        tx: trafficData.tx,
        rx: trafficData.rx,
        total: trafficData.tx + trafficData.rx,
        connections: online[authToken] || 0,
        timestamp: trafficData.timestamp,
      })
    }

    // Sort by total traffic (descending)
    stats.sort((a, b) => b.total - a.total)

    return stats
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear()
    trafficStatsLogger.info('Traffic stats cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Store traffic stats in database
   */
  async storeTrafficStats(nodeId: string, trafficData: Record<string, TrafficStats>, onlineData: Record<string, number>): Promise<void> {
    try {
      const records = []
      const timestamp = new Date()

      for (const [authToken, stats] of Object.entries(trafficData)) {
        // Find user by auth token (would need user lookup)
        // For now, we'll store without userId and link it later
        records.push({
          nodeId,
          userId: null, // Will be updated when we map authToken to userId
          bytesIn: BigInt(stats.rx),
          bytesOut: BigInt(stats.tx),
          connections: onlineData[authToken] || 0,
          recordedAt: timestamp,
        })
      }

      if (records.length > 0) {
        await prisma.trafficStats.createMany({
          data: records,
          skipDuplicates: true,
        })
        trafficStatsLogger.info(`Stored ${records.length} traffic stats records for node ${nodeId}`)
      }
    } catch (error) {
      trafficStatsLogger.error(`Failed to store traffic stats: ${error}`)
      throw error
    }
  }

  /**
   * Query traffic stats with filtering
   */
  async queryTrafficStats(options: {
    nodeId?: string
    userId?: string
    startTime?: Date
    endTime?: Date
    limit?: number
  } = {}): Promise<Array<{
    id: string
    nodeId: string
    userId: string | null
    bytesIn: bigint
    bytesOut: bigint
    connections: number
    recordedAt: Date
  }>> {
    const where: Record<string, unknown> = {}

    if (options.nodeId) {
      where.nodeId = options.nodeId
    }
    if (options.userId) {
      where.userId = options.userId
    }
    if (options.startTime || options.endTime) {
      where.recordedAt = {}
      if (options.startTime) {
        where.recordedAt = { ...where.recordedAt as Record<string, unknown>, gte: options.startTime }
      }
      if (options.endTime) {
        where.recordedAt = { ...where.recordedAt as Record<string, unknown>, lte: options.endTime }
      }
    }

    return prisma.trafficStats.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: options.limit || 100,
    })
  }

  /**
   * Get aggregated traffic statistics
   */
  async getAggregatedStats(options: {
    nodeId?: string
    userId?: string
    startTime?: Date
    endTime?: Date
    groupBy?: 'hour' | 'day' | 'week'
  } = {}): Promise<{
    totalBytesIn: bigint
    totalBytesOut: bigint
    totalConnections: number
    recordCount: number
    avgBytesInPerRecord: bigint
    avgBytesOutPerRecord: bigint
    timeSeries?: Array<{
      period: string
      bytesIn: bigint
      bytesOut: bigint
      connections: number
    }>
  }> {
    const where: Record<string, unknown> = {}

    if (options.nodeId) {
      where.nodeId = options.nodeId
    }
    if (options.userId) {
      where.userId = options.userId
    }
    if (options.startTime || options.endTime) {
      where.recordedAt = {}
      if (options.startTime) {
        where.recordedAt = { ...where.recordedAt as Record<string, unknown>, gte: options.startTime }
      }
      if (options.endTime) {
        where.recordedAt = { ...where.recordedAt as Record<string, unknown>, lte: options.endTime }
      }
    }

    const records = await prisma.trafficStats.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
    })

    const totalBytesIn = records.reduce((sum, r) => sum + r.bytesIn, BigInt(0))
    const totalBytesOut = records.reduce((sum, r) => sum + r.bytesOut, BigInt(0))
    const totalConnections = records.reduce((sum, r) => sum + r.connections, 0)

    let timeSeries: Array<{ period: string; bytesIn: bigint; bytesOut: bigint; connections: number }> | undefined

    if (options.groupBy && records.length > 0) {
      const grouped = new Map<string, { bytesIn: bigint; bytesOut: bigint; connections: number }>()

      for (const record of records) {
        const date = new Date(record.recordedAt)
        let period: string

        switch (options.groupBy) {
          case 'hour':
            period = date.toISOString().slice(0, 13) + ':00'
            break
          case 'day':
            period = date.toISOString().slice(0, 10)
            break
          case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            period = weekStart.toISOString().slice(0, 10)
            break
          default:
            period = date.toISOString().slice(0, 10)
        }

        const existing = grouped.get(period) || { bytesIn: BigInt(0), bytesOut: BigInt(0), connections: 0 }
        existing.bytesIn += record.bytesIn
        existing.bytesOut += record.bytesOut
        existing.connections += record.connections
        grouped.set(period, existing)
      }

      timeSeries = Array.from(grouped.entries())
        .map(([period, data]) => ({ period, ...data }))
        .sort((a, b) => a.period.localeCompare(b.period))
    }

    return {
      totalBytesIn,
      totalBytesOut,
      totalConnections,
      recordCount: records.length,
      avgBytesInPerRecord: records.length > 0 ? totalBytesIn / BigInt(records.length) : BigInt(0),
      avgBytesOutPerRecord: records.length > 0 ? totalBytesOut / BigInt(records.length) : BigInt(0),
      timeSeries,
    }
  }

  /**
   * Get per-user traffic summary
   */
  async getUserTrafficSummary(userId: string, days: number = 7): Promise<{
    totalBytesIn: bigint
    totalBytesOut: bigint
    totalBytes: bigint
    totalConnections: number
    avgDailyBytesIn: bigint
    avgDailyBytesOut: bigint
    dailyBreakdown: Array<{
      date: string
      bytesIn: bigint
      bytesOut: bigint
      connections: number
    }>
  }> {
    const startTime = new Date()
    startTime.setDate(startTime.getDate() - days)

    const records = await prisma.trafficStats.findMany({
      where: {
        userId,
        recordedAt: { gte: startTime },
      },
      orderBy: { recordedAt: 'asc' },
    })

    const totalBytesIn = records.reduce((sum, r) => sum + r.bytesIn, BigInt(0))
    const totalBytesOut = records.reduce((sum, r) => sum + r.bytesOut, BigInt(0))
    const totalConnections = records.reduce((sum, r) => sum + r.connections, 0)

    // Group by day
    const dailyMap = new Map<string, { bytesIn: bigint; bytesOut: bigint; connections: number }>()
    for (const record of records) {
      const date = record.recordedAt.toISOString().slice(0, 10)
      const existing = dailyMap.get(date) || { bytesIn: BigInt(0), bytesOut: BigInt(0), connections: 0 }
      existing.bytesIn += record.bytesIn
      existing.bytesOut += record.bytesOut
      existing.connections += record.connections
      dailyMap.set(date, existing)
    }

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalBytesIn,
      totalBytesOut,
      totalBytes: totalBytesIn + totalBytesOut,
      totalConnections,
      avgDailyBytesIn: days > 0 ? totalBytesIn / BigInt(days) : BigInt(0),
      avgDailyBytesOut: days > 0 ? totalBytesOut / BigInt(days) : BigInt(0),
      dailyBreakdown,
    }
  }

  /**
   * Get node-level traffic analysis
   */
  async getNodeTrafficAnalysis(nodeId: string, hours: number = 24): Promise<{
    nodeId: string
    totalBytesIn: bigint
    totalBytesOut: bigint
    totalBytes: bigint
    peakConnections: number
    avgConnections: number
    hourlyBreakdown: Array<{
      hour: string
      bytesIn: bigint
      bytesOut: bigint
      connections: number
    }>
  }> {
    const startTime = new Date()
    startTime.setHours(startTime.getHours() - hours)

    const records = await prisma.trafficStats.findMany({
      where: {
        nodeId,
        recordedAt: { gte: startTime },
      },
      orderBy: { recordedAt: 'asc' },
    })

    const totalBytesIn = records.reduce((sum, r) => sum + r.bytesIn, BigInt(0))
    const totalBytesOut = records.reduce((sum, r) => sum + r.bytesOut, BigInt(0))
    const totalConnections = records.reduce((sum, r) => sum + r.connections, 0)
    const peakConnections = records.length > 0 ? Math.max(...records.map(r => r.connections)) : 0
    const avgConnections = records.length > 0 ? totalConnections / records.length : 0

    // Group by hour
    const hourlyMap = new Map<string, { bytesIn: bigint; bytesOut: bigint; connections: number }>()
    for (const record of records) {
      const hour = record.recordedAt.toISOString().slice(0, 13) + ':00'
      const existing = hourlyMap.get(hour) || { bytesIn: BigInt(0), bytesOut: BigInt(0), connections: 0 }
      existing.bytesIn += record.bytesIn
      existing.bytesOut += record.bytesOut
      existing.connections += record.connections
      hourlyMap.set(hour, existing)
    }

    const hourlyBreakdown = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour.localeCompare(b.hour))

    return {
      nodeId,
      totalBytesIn,
      totalBytesOut,
      totalBytes: totalBytesIn + totalBytesOut,
      peakConnections,
      avgConnections,
      hourlyBreakdown,
    }
  }

  /**
   * Cleanup old traffic stats records
   */
  async cleanupOldStats(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.trafficStats.deleteMany({
      where: {
        recordedAt: { lt: cutoffDate },
      },
    })

    trafficStatsLogger.info(`Cleaned up ${result.count} old traffic stats records`)
    return result.count
  }
}

// Singleton instance
let collectorInstance: TrafficStatsCollector | null = null

export function getTrafficStatsCollector(): TrafficStatsCollector {
  if (!collectorInstance) {
    collectorInstance = new TrafficStatsCollector()
  }
  return collectorInstance
}

/**
 * Convenience functions for backward compatibility
 */
export async function fetchTraffic(clearCache = false): Promise<Record<string, { tx: number; rx: number }>> {
  const collector = getTrafficStatsCollector()
  const stats = await collector.fetchTraffic(clearCache)
  
  // Convert to legacy format
  const legacy: Record<string, { tx: number; rx: number }> = {}
  for (const [key, value] of Object.entries(stats)) {
    legacy[key] = { tx: value.tx, rx: value.rx }
  }
  return legacy
}

export async function fetchOnline(clearCache = false): Promise<Record<string, number>> {
  const collector = getTrafficStatsCollector()
  return collector.fetchOnline(clearCache)
}

export async function fetchGlobalStats(clearCache = false) {
  const collector = getTrafficStatsCollector()
  return collector.fetchGlobalStats(clearCache)
}