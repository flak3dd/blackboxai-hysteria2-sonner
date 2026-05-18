import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, toErrorResponse } from '@/lib/auth/admin'
import {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignAssignments,
  assignOperatorToCampaign,
  removeOperatorFromCampaign,
  getCampaignTasks,
  createCampaignTask,
  updateCampaignTask,
  deleteCampaignTask,
  getCampaignStats,
  hasCampaignAccess,
  getAccessibleCampaigns,
  type CampaignCreate,
  type CampaignUpdate,
  type CampaignAssignmentCreate,
  type CampaignTaskCreate,
  type CampaignTaskUpdate,
} from '@/lib/campaigns/campaign'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/campaigns' })

/**
 * GET /api/admin/intelligence/campaigns
 * List all campaigns
 */
export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await verifyAdmin(request)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const leadOperatorId = searchParams.get('leadOperatorId') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await listCampaigns({
      status,
      leadOperatorId,
      limit,
      offset,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    log.error({ err: error }, 'Failed to list campaigns')
    return NextResponse.json(
      { error: 'Failed to list campaigns', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/intelligence/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await verifyAdmin(request)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const body = await request.json()
    const input: CampaignCreate = {
      name: body.name,
      description: body.description,
      status: body.status,
      leadOperatorId: body.leadOperatorId || auth.id,
      targetCount: body.targetCount,
      startDate: body.startDate,
      endDate: body.endDate,
    }

    const campaign = await createCampaign(input)

    return NextResponse.json({ success: true, campaign }, { status: 201 })
  } catch (error) {
    log.error({ err: error }, 'Failed to create campaign')
    return NextResponse.json(
      { error: 'Failed to create campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/intelligence/campaigns/[id]
 * Update a campaign
 * This is handled in the [id]/route.ts file
 */

/**
 * DELETE /api/admin/intelligence/campaigns/[id]
 * Delete a campaign
 * This is handled in the [id]/route.ts file
 */

/**
 * POST /api/admin/intelligence/campaigns/[id]/assign
 * Assign an operator to a campaign
 * This is handled in the [id]/assign/route.ts file
 */

/**
 * POST /api/admin/intelligence/campaigns/[id]/tasks
 * Create a task for a campaign
 * This is handled in the [id]/tasks/route.ts file
 */

/**
 * GET /api/admin/intelligence/campaigns/[id]/stats
 * Get campaign statistics
 * This is handled in the [id]/stats/route.ts file
 */

/**
 * GET /api/admin/intelligence/campaigns/[id]/assignments
 * Get campaign assignments
 * This is handled in the [id]/assignments/route.ts file
 */

/**
 * GET /api/admin/intelligence/campaigns/[id]/tasks
 * Get campaign tasks
 * This is handled in the [id]/tasks/route.ts file
 */