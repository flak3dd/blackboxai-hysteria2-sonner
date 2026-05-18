import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, toErrorResponse } from '@/lib/auth/admin'
import {
  getCampaignStats,
  hasCampaignAccess,
} from '@/lib/campaigns/campaign'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/campaigns/[id]/stats' })

/**
 * GET /api/admin/intelligence/campaigns/[id]/stats
 * Get campaign statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let auth
  try {
    auth = await verifyAdmin(request)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    // Check access
    const hasAccess = await hasCampaignAccess(params.id, auth.id, auth.role)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const stats = await getCampaignStats(params.id)

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    log.error({ err: error, campaignId: params.id }, 'Failed to get campaign stats')
    return NextResponse.json(
      { error: 'Failed to get campaign stats', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}