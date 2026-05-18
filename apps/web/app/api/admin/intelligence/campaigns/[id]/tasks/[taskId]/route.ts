import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, toErrorResponse } from '@/lib/auth/admin'
import {
  updateCampaignTask,
  deleteCampaignTask,
  hasCampaignAccess,
  type CampaignTaskUpdate,
} from '@/lib/campaigns/campaign'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/campaigns/[id]/tasks/[taskId]' })

/**
 * PUT /api/admin/intelligence/campaigns/[id]/tasks/[taskId]
 * Update a campaign task
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
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
    const patch: CampaignTaskUpdate = {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assignedTo: body.assignedTo,
      dueDate: body.dueDate,
    }

    const task = await updateCampaignTask(params.taskId, patch)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, task })
  } catch (error) {
    log.error({ err: error, taskId: params.taskId }, 'Failed to update campaign task')
    return NextResponse.json(
      { error: 'Failed to update campaign task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/intelligence/campaigns/[id]/tasks/[taskId]
 * Delete a campaign task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
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

    const success = await deleteCampaignTask(params.taskId)

    if (!success) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Task deleted' })
  } catch (error) {
    log.error({ err: error, taskId: params.taskId }, 'Failed to delete campaign task')
    return NextResponse.json(
      { error: 'Failed to delete campaign task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}