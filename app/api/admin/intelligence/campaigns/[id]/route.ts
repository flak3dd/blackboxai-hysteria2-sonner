import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, toErrorResponse } from '@/lib/auth/admin'
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  hasCampaignAccess,
  type CampaignUpdate,
} from '@/lib/campaigns/campaign'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/campaigns/[id]' })

/**
 * GET /api/admin/intelligence/campaigns/[id]
 * Get a single campaign by ID
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
    const campaign = await getCampaignById(params.id)

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check access
    const hasAccess = await hasCampaignAccess(params.id, auth.id, auth.role)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    log.error({ err: error, campaignId: params.id }, 'Failed to get campaign')
    return NextResponse.json(
      { error: 'Failed to get campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/intelligence/campaigns/[id]
 * Update a campaign
 */
export async function PUT(
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

    const body = await request.json()
    const patch: CampaignUpdate = {
      name: body.name,
      description: body.description,
      status: body.status,
      leadOperatorId: body.leadOperatorId,
      targetCount: body.targetCount,
      startDate: body.startDate,
      endDate: body.endDate,
    }

    const campaign = await updateCampaign(params.id, patch)

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    log.error({ err: error, campaignId: params.id }, 'Failed to update campaign')
    return NextResponse.json(
      { error: 'Failed to update campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/intelligence/campaigns/[id]
 * Delete a campaign
 */
export async function DELETE(
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
    // Only admins can delete campaigns
    if (auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const success = await deleteCampaign(params.id)

    if (!success) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Campaign deleted' })
  } catch (error) {
    log.error({ err: error, campaignId: params.id }, 'Failed to delete campaign')
    return NextResponse.json(
      { error: 'Failed to delete campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}