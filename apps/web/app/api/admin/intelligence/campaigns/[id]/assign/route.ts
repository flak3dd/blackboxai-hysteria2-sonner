import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, toErrorResponse } from '@/lib/auth/admin'
import {
  assignOperatorToCampaign,
  removeOperatorFromCampaign,
  hasCampaignAccess,
  type CampaignAssignmentCreate,
} from '@/lib/campaigns/campaign'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/campaigns/[id]/assign' })

/**
 * POST /api/admin/intelligence/campaigns/[id]/assign
 * Assign an operator to a campaign
 */
export async function POST(
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
    const input: CampaignAssignmentCreate = {
      campaignId: params.id,
      operatorId: body.operatorId,
      role: body.role,
    }

    const assignment = await assignOperatorToCampaign(input)

    return NextResponse.json({ success: true, assignment }, { status: 201 })
  } catch (error) {
    log.error({ err: error, campaignId: params.id }, 'Failed to assign operator to campaign')
    return NextResponse.json(
      { error: 'Failed to assign operator to campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/intelligence/campaigns/[id]/assign
 * Remove an operator from a campaign
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
    // Check access
    const hasAccess = await hasCampaignAccess(params.id, auth.id, auth.role)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const operatorId = searchParams.get('operatorId')

    if (!operatorId) {
      return NextResponse.json({ error: 'operatorId is required' }, { status: 400 })
    }

    const success = await removeOperatorFromCampaign(params.id, operatorId)

    if (!success) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Operator removed from campaign' })
  } catch (error) {
    log.error({ err: error, campaignId: params.id }, 'Failed to remove operator from campaign')
    return NextResponse.json(
      { error: 'Failed to remove operator from campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}