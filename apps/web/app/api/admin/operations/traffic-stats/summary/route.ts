import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { getTrafficStatsCollector } from '@/lib/infrastructure/traffic-stats'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/traffic-stats/summary' })

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId') || undefined
    const userId = searchParams.get('userId') || undefined
    const hours = parseInt(searchParams.get('hours') || '24')
    const groupBy = (searchParams.get('groupBy') || 'hour') as 'hour' | 'day' | 'week'

    const collector = getTrafficStatsCollector()

    // Get aggregated statistics
    const aggregatedStats = await collector.getAggregatedStats({
      nodeId,
      userId,
      startTime: new Date(Date.now() - hours * 60 * 60 * 1000),
      groupBy,
    })

    // Get current real-time stats
    const globalStats = await collector.fetchGlobalStats()

    // Get node-specific analysis if nodeId is provided
    let nodeAnalysis = null
    if (nodeId) {
      nodeAnalysis = await collector.getNodeTrafficAnalysis(nodeId, hours)
    }

    // Get user-specific summary if userId is provided
    let userSummary = null
    if (userId) {
      userSummary = await collector.getUserTrafficSummary(userId, Math.ceil(hours / 24))
    }

    return NextResponse.json({
      success: true,
      data: {
        aggregated: aggregatedStats,
        current: globalStats,
        nodeAnalysis,
        userSummary,
        summary: {
          totalBytesIn: aggregatedStats.totalBytesIn.toString(),
          totalBytesOut: aggregatedStats.totalBytesOut.toString(),
          totalBytes: (aggregatedStats.totalBytesIn + aggregatedStats.totalBytesOut).toString(),
          totalConnections: aggregatedStats.totalConnections,
          recordCount: aggregatedStats.recordCount,
          activeUsers: globalStats.activeUsers,
          timeRange: `${hours}h`,
        },
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch traffic stats summary')
    return NextResponse.json(
      { error: 'Failed to fetch traffic stats summary', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}