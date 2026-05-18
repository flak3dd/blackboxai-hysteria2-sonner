import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, toErrorResponse } from '@/lib/auth/admin'
import {
  getCampaignAssignments,
  hasCampaignAccess,
} from '@/lib/campaigns/campaign'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/campaigns/[id]/assignments' })

/**
 * GET /api/admin/intelligence/campaigns/[id]/assignments
 * Get campaign assignments
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

    const assignments = await getCampaignAssignments(params.id)

    return NextResponse.json({ success: true, assignments })
  } catch (error) {
    log.error({ err: error, campaignId: params.id }, 'Failed to get campaign assignments')
    return NextResponse.json(
      { error: 'Failed to get campaign assignments', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}