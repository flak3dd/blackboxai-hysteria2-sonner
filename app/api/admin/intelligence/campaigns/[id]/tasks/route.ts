import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, toErrorResponse } from '@/lib/auth/admin'
import {
  getCampaignTasks,
  createCampaignTask,
  updateCampaignTask,
  deleteCampaignTask,
  hasCampaignAccess,
  type CampaignTaskCreate,
  type CampaignTaskUpdate,
} from '@/lib/campaigns/campaign'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/campaigns/[id]/tasks' })

/**
 * GET /api/admin/intelligence/campaigns/[id]/tasks
 * Get campaign tasks
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

    const tasks = await getCampaignTasks(params.id)

    return NextResponse.json({ success: true, tasks })
  } catch (error) {
    log.error({ err: error, campaignId: params.id }, 'Failed to get campaign tasks')
    return NextResponse.json(
      { error: 'Failed to get campaign tasks', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/intelligence/campaigns/[id]/tasks
 * Create a task for a campaign
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
    const input: CampaignTaskCreate = {
      campaignId: params.id,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assignedTo: body.assignedTo,
      dueDate: body.dueDate,
    }

    const task = await createCampaignTask(input)

    return NextResponse.json({ success: true, task }, { status: 201 })
  } catch (error) {
    log.error({ err: error, campaignId: params.id }, 'Failed to create campaign task')
    return NextResponse.json(
      { error: 'Failed to create campaign task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/intelligence/campaigns/[id]/tasks/[taskId]
 * Update a campaign task
 * This is handled in the [taskId]/route.ts file
 */

/**
 * DELETE /api/admin/intelligence/campaigns/[id]/tasks/[taskId]
 * Delete a campaign task
 * This is handled in the [taskId]/route.ts file
 */