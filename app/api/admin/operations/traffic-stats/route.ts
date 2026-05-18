import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getTrafficStatsCollector } from '@/lib/infrastructure/traffic-stats'
import { listUsers } from '@/lib/db/users'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/traffic-stats' })

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || '5m') as '1m' | '5m' | '15m' | '1h' | '24h'
    const includePerUser = searchParams.get('perUser') === 'true'
    const clearCache = searchParams.get('clearCache') === 'true'
    const nodeId = searchParams.get('nodeId') || undefined
    const userId = searchParams.get('userId') || undefined
    const hours = parseInt(searchParams.get('hours') || '24')

    const collector = getTrafficStatsCollector()

    // Fetch basic stats
    const [globalStats, bandwidthHistory] = await Promise.all([
      collector.fetchGlobalStats(clearCache),
      collector.fetchBandwidthHistory(period),
    ])

    let perUserStats = null
    if (includePerUser) {
      const users = await listUsers()
      const userMap = new Map(users.map(u => [u.authToken, { id: u.id, displayName: u.displayName }]))
      perUserStats = await collector.getPerUserStats(userMap)
    }

    // Fetch historical stats from database if nodeId or userId is specified
    let historicalStats = null
    if (nodeId || userId) {
      historicalStats = await collector.getAggregatedStats({
        nodeId,
        userId,
        startTime: new Date(Date.now() - hours * 60 * 60 * 1000),
        groupBy: 'hour',
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        global: globalStats,
        bandwidthHistory,
        perUser: perUserStats,
        historical: historicalStats,
        cacheStats: collector.getCacheStats(),
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch traffic stats')
    return NextResponse.json(
      { error: 'Failed to fetch traffic stats', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { nodeId, store } = body

    const collector = getTrafficStatsCollector()

    // Fetch traffic and online data
    const [trafficData, onlineData] = await Promise.all([
      collector.fetchTraffic(true),
      collector.fetchOnline(true),
    ])

    // Store in database if requested
    if (store && nodeId) {
      await collector.storeTrafficStats(nodeId, trafficData, onlineData)
    }

    return NextResponse.json({
      success: true,
      message: 'Traffic stats collected successfully',
      data: {
        traffic: trafficData,
        online: onlineData,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Failed to collect traffic stats')
    return NextResponse.json(
      { error: 'Failed to collect traffic stats', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await verifyAdmin(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const cleanupDays = parseInt(searchParams.get('cleanupDays') || '30')

    const collector = getTrafficStatsCollector()

    if (searchParams.get('action') === 'cleanup') {
      const deleted = await collector.cleanupOldStats(cleanupDays)
      return NextResponse.json({ success: true, message: `Cleaned up ${deleted} old records` })
    } else {
      collector.clearCache()
      return NextResponse.json({ success: true, message: 'Cache cleared' })
    }
  } catch (error) {
    log.error({ err: error }, 'Failed to clear cache')
    return NextResponse.json(
      { error: 'Failed to clear cache', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}