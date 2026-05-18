import { prisma } from "@/lib/db"
import { z } from "zod"
import logger from "@/lib/logger"

const log = logger.child({ module: "campaigns" })

// Zod schemas for validation
export const CampaignStatus = z.enum([
  "planning",
  "active",
  "paused",
  "completed",
  "cancelled",
])
export type CampaignStatus = z.infer<typeof CampaignStatus>

export const CampaignRole = z.enum([
  "lead",
  "operator",
  "observer",
  "analyst",
])
export type CampaignRole = z.infer<typeof CampaignRole>

export const Campaign = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  status: CampaignStatus,
  leadOperatorId: z.string().nullable(),
  targetCount: z.number().int().nonnegative(),
  startDate: z.number().nullable(),
  endDate: z.number().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type Campaign = z.infer<typeof Campaign>

export const CampaignCreate = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: CampaignStatus.optional(),
  leadOperatorId: z.string().optional(),
  targetCount: z.number().int().nonnegative().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
})
export type CampaignCreate = z.infer<typeof CampaignCreate>

export const CampaignUpdate = CampaignCreate.partial()
export type CampaignUpdate = z.infer<typeof CampaignUpdate>

export const CampaignAssignment = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  operatorId: z.string().min(1),
  role: CampaignRole,
  assignedAt: z.number().int(),
})
export type CampaignAssignment = z.infer<typeof CampaignAssignment>

export const CampaignAssignmentCreate = z.object({
  campaignId: z.string().min(1),
  operatorId: z.string().min(1),
  role: CampaignRole.optional(),
})
export type CampaignAssignmentCreate = z.infer<typeof CampaignAssignmentCreate>

export const CampaignTask = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  assignedTo: z.string().nullable(),
  dueDate: z.number().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  completedAt: z.number().nullable(),
})
export type CampaignTask = z.infer<typeof CampaignTask>

export const CampaignTaskCreate = z.object({
  campaignId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.number().optional(),
})
export type CampaignTaskCreate = z.infer<typeof CampaignTaskCreate>

export const CampaignTaskUpdate = CampaignTaskCreate.partial()
export type CampaignTaskUpdate = z.infer<typeof CampaignTaskUpdate>

// Helper function to convert Prisma dates to timestamps
function toTimestamp(date: Date | null): number | null {
  return date ? date.getTime() : null
}

// Helper function to convert timestamps to Prisma dates
function toDate(timestamp: number | null | undefined): Date | null {
  return timestamp ? new Date(timestamp) : null
}

// Helper function to convert Prisma Campaign to our schema
function toCampaignZod(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as Campaign["status"],
    leadOperatorId: row.leadOperatorId,
    targetCount: row.targetCount,
    startDate: toTimestamp(row.startDate),
    endDate: toTimestamp(row.endDate),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}

// Helper function to convert Prisma CampaignAssignment to our schema
function toCampaignAssignmentZod(row: any): CampaignAssignment {
  return {
    id: row.id,
    campaignId: row.campaignId,
    operatorId: row.operatorId,
    role: row.role as CampaignAssignment["role"],
    assignedAt: row.assignedAt.getTime(),
  }
}

/**
 * Get all campaigns with optional filtering
 */
export async function listCampaigns(opts?: {
  status?: CampaignStatus
  leadOperatorId?: string
  limit?: number
  offset?: number
}): Promise<{ campaigns: Campaign[]; total: number }> {
  const where: any = {}
  if (opts?.status) where.status = opts.status
  if (opts?.leadOperatorId) where.leadOperatorId = opts.leadOperatorId

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts?.limit || 50,
      skip: opts?.offset || 0,
    }),
    prisma.campaign.count({ where }),
  ])

  return {
    campaigns: campaigns.map(toCampaignZod),
    total,
  }
}

/**
 * Get a single campaign by ID
 */
export async function getCampaignById(id: string): Promise<Campaign | null> {
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  return campaign ? toCampaignZod(campaign) : null
}

/**
 * Create a new campaign
 */
export async function createCampaign(input: CampaignCreate): Promise<Campaign> {
  const parsed = CampaignCreate.parse(input)
  
  const campaign = await prisma.campaign.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      status: parsed.status || "planning",
      leadOperatorId: parsed.leadOperatorId || null,
      targetCount: parsed.targetCount || 0,
      startDate: toDate(parsed.startDate),
      endDate: toDate(parsed.endDate),
    },
  })

  log.info({ campaignId: campaign.id, name: campaign.name }, "Created campaign")

  return toCampaignZod(campaign)
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  id: string,
  patch: CampaignUpdate
): Promise<Campaign | null> {
  const existing = await prisma.campaign.findUnique({ where: { id } })
  if (!existing) return null

  const parsed = CampaignUpdate.parse(patch)
  const data: Record<string, unknown> = {}
  
  if (parsed.name !== undefined) data.name = parsed.name
  if (parsed.description !== undefined) data.description = parsed.description
  if (parsed.status !== undefined) data.status = parsed.status
  if (parsed.leadOperatorId !== undefined) data.leadOperatorId = parsed.leadOperatorId
  if (parsed.targetCount !== undefined) data.targetCount = parsed.targetCount
  if (parsed.startDate !== undefined) data.startDate = toDate(parsed.startDate)
  if (parsed.endDate !== undefined) data.endDate = toDate(parsed.endDate)

  const campaign = await prisma.campaign.update({ where: { id }, data })

  log.info({ campaignId: id }, "Updated campaign")

  return toCampaignZod(campaign)
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<boolean> {
  try {
    // Delete related assignments and tasks first
    await prisma.campaignAssignment.deleteMany({ where: { campaignId: id } })
    await prisma.task.deleteMany({ where: { campaignId: id } })
    
    await prisma.campaign.delete({ where: { id } })
    
    log.info({ campaignId: id }, "Deleted campaign")
    return true
  } catch (error) {
    log.error({ err: error, campaignId: id }, "Failed to delete campaign")
    return false
  }
}

/**
 * Get campaign assignments
 */
export async function getCampaignAssignments(
  campaignId: string
): Promise<CampaignAssignment[]> {
  const assignments = await prisma.campaignAssignment.findMany({
    where: { campaignId },
    include: {
      operator: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
  })

  return assignments.map(toCampaignAssignmentZod)
}

/**
 * Assign an operator to a campaign
 */
export async function assignOperatorToCampaign(
  input: CampaignAssignmentCreate
): Promise<CampaignAssignment> {
  const parsed = CampaignAssignmentCreate.parse(input)

  const assignment = await prisma.campaignAssignment.upsert({
    where: {
      campaignId_operatorId: {
        campaignId: parsed.campaignId,
        operatorId: parsed.operatorId,
      },
    },
    create: {
      campaignId: parsed.campaignId,
      operatorId: parsed.operatorId,
      role: parsed.role || "operator",
    },
    update: {
      role: parsed.role || "operator",
      assignedAt: new Date(),
    },
  })

  log.info(
    { campaignId: parsed.campaignId, operatorId: parsed.operatorId },
    "Assigned operator to campaign"
  )

  return toCampaignAssignmentZod(assignment)
}

/**
 * Remove an operator from a campaign
 */
export async function removeOperatorFromCampaign(
  campaignId: string,
  operatorId: string
): Promise<boolean> {
  try {
    await prisma.campaignAssignment.delete({
      where: {
        campaignId_operatorId: {
          campaignId,
          operatorId,
        },
      },
    })

    log.info(
      { campaignId, operatorId },
      "Removed operator from campaign"
    )
    return true
  } catch (error) {
    log.error({ err: error, campaignId, operatorId }, "Failed to remove operator from campaign")
    return false
  }
}

/**
 * Get campaign tasks
 */
export async function getCampaignTasks(campaignId: string): Promise<any[]> {
  const tasks = await prisma.task.findMany({
    where: { operationId: campaignId },
    include: {
      assignee: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return tasks.map((task: any) => ({
    id: task.id,
    campaignId: task.operationId,
    title: task.title,
    description: task.description,
    status: task.status.toLowerCase(),
    priority: task.priority.toLowerCase(),
    assignedTo: task.assigneeId,
    dueDate: task.updatedAt.getTime(),
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
    completedAt: task.updatedAt.getTime(),
  }))
}

/**
 * Create a campaign task
 */
export async function createCampaignTask(input: CampaignTaskCreate): Promise<CampaignTask> {
  const parsed = CampaignTaskCreate.parse(input)

  const task = await prisma.task.create({
    data: {
      operationId: parsed.campaignId,
      title: parsed.title,
      description: parsed.description,
      status: (parsed.status || "pending").toUpperCase(),
      priority: (parsed.priority || "medium").toUpperCase(),
      assignedTo: parsed.assignedTo ? JSON.stringify([parsed.assignedTo]) : "[]",
      assigneeId: parsed.assignedTo,
      estimatedDuration: 3600, // Default 1 hour
      dependencies: "[]",
    },
  })

  log.info({ taskId: task.id, campaignId: parsed.campaignId }, "Created campaign task")

  return {
    id: task.id,
    campaignId: task.operationId,
    title: task.title,
    description: task.description,
    status: task.status.toLowerCase() as CampaignTask["status"],
    priority: task.priority.toLowerCase() as CampaignTask["priority"],
    assignedTo: task.assigneeId,
    dueDate: task.updatedAt.getTime(),
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
    completedAt: null,
  }
}

/**
 * Update a campaign task
 */
export async function updateCampaignTask(
  id: string,
  patch: CampaignTaskUpdate
): Promise<CampaignTask | null> {
  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) return null

  const parsed = CampaignTaskUpdate.parse(patch)
  const data: Record<string, unknown> = {}

  if (parsed.title !== undefined) data.title = parsed.title
  if (parsed.description !== undefined) data.description = parsed.description
  if (parsed.status !== undefined) {
    data.status = parsed.status.toUpperCase()
    if (parsed.status === "completed") {
      data.completedAt = new Date()
    }
  }
  if (parsed.priority !== undefined) data.priority = parsed.priority.toUpperCase()
  if (parsed.assignedTo !== undefined) {
    data.assignedTo = JSON.stringify([parsed.assignedTo])
    data.assigneeId = parsed.assignedTo
  }

  const task = await prisma.task.update({ where: { id }, data })

  log.info({ taskId: id }, "Updated campaign task")

  return {
    id: task.id,
    campaignId: task.operationId,
    title: task.title,
    description: task.description,
    status: task.status.toLowerCase() as CampaignTask["status"],
    priority: task.priority.toLowerCase() as CampaignTask["priority"],
    assignedTo: task.assigneeId,
    dueDate: task.updatedAt.getTime(),
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
    completedAt: task.updatedAt.getTime(),
  }
}

/**
 * Delete a campaign task
 */
export async function deleteCampaignTask(id: string): Promise<boolean> {
  try {
    await prisma.task.delete({ where: { id } })
    log.info({ taskId: id }, "Deleted campaign task")
    return true
  } catch (error) {
    log.error({ err: error, taskId: id }, "Failed to delete campaign task")
    return false
  }
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(campaignId: string): Promise<{
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  inProgressTasks: number
  failedTasks: number
  totalAssignments: number
  progress: number
}> {
  const [tasks, assignments] = await Promise.all([
    prisma.task.findMany({ where: { operationId: campaignId } }),
    prisma.campaignAssignment.findMany({ where: { campaignId } }),
  ])

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length
  const pendingTasks = tasks.filter((t) => t.status === "PENDING").length
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length
  const failedTasks = tasks.filter((t) => t.status === "FAILED").length
  const totalAssignments = assignments.length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    failedTasks,
    totalAssignments,
    progress,
  }
}

/**
 * Check if an operator has access to a campaign
 */
export async function hasCampaignAccess(
  campaignId: string,
  operatorId: string,
  operatorRole: string
): Promise<boolean> {
  // Admins have access to everything
  if (operatorRole === "ADMIN") return true

  // Check if operator is assigned to campaign
  const assignment = await prisma.campaignAssignment.findUnique({
    where: {
      campaignId_operatorId: {
        campaignId,
        operatorId,
      },
    },
  })

  if (assignment) return true

  // Check if operator is the lead
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  })

  return campaign?.leadOperatorId === operatorId
}

/**
 * Get campaigns accessible to an operator
 */
export async function getAccessibleCampaigns(
  operatorId: string,
  operatorRole: string
): Promise<Campaign[]> {
  // Admins see all campaigns
  if (operatorRole === "ADMIN") {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
    })
    return campaigns.map(toCampaignZod)
  }

  // Get campaigns where operator is assigned or is lead
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { leadOperatorId: operatorId },
        {
          assignments: {
            some: {
              operatorId,
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  })

  return campaigns.map(toCampaignZod)
}