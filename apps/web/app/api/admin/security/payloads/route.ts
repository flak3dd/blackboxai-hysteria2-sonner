import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  listPayloadBuilds,
  createPayloadBuild,
  deletePayloadBuild,
  getPayloadBuildStats,
  countPayloadBuilds,
} from "@c2panel/infrastructure/adapters/database/payload-builds"
import { parsePagination, paginatedResponse } from "@c2panel/shared/utils"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api/payloads" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Enhanced schema for payload creation with new fields
const PayloadBuildCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["windows_exe", "linux_elf", "macos_app", "powershell", "python"]),
  platform: z.enum(["windows", "linux", "macos", "cross-platform"]).optional(),
  description: z.string().max(500).optional(),
  config: z.record(z.string(), z.unknown()),
  obfuscationLevel: z.number().int().min(0).max(3).optional(),
  packingMethod: z.enum(["upx", "custom", "none"]).optional(),
})

// GET /api/admin/security/payloads - List payload builds (paginated)
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = `payloads-list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const createdBy = searchParams.get('createdBy') || undefined
    const platform = searchParams.get('platform') || undefined
    const status = searchParams.get('status') || undefined
    const { page, pageSize, skip, take } = parsePagination(searchParams)

    log.info({ requestId, createdBy, platform, status, page, pageSize }, "Listing payload builds")

    // Validate filter parameters
    if (platform && !['windows', 'linux', 'macos', 'cross-platform'].includes(platform)) {
      return NextResponse.json({ 
        error: 'Invalid platform parameter', 
        requestId,
        validPlatforms: ['windows', 'linux', 'macos', 'cross-platform']
      }, { status: 400 })
    }

    if (status && !['pending', 'building', 'ready', 'completed', 'failed'].includes(status)) {
      return NextResponse.json({
        error: 'Invalid status parameter',
        requestId,
        validStatuses: ['pending', 'building', 'ready', 'completed', 'failed']
      }, { status: 400 })
    }

    // Filter by platform if specified
    const where: any = {}
    if (createdBy) where.createdBy = createdBy
    if (platform) where.platform = platform
    if (status) where.status = status

    const [builds, total, stats] = await Promise.all([
      listPayloadBuilds(createdBy, 50, { skip, take }),
      countPayloadBuilds(createdBy),
      getPayloadBuildStats(),
    ])
    
    // Apply additional filters in memory (for platform and status)
    const filteredBuilds = builds.filter(build => {
      if (platform && build.platform !== platform) return false
      if (status && build.status !== status) return false
      return true
    })

    const { pagination } = paginatedResponse(filteredBuilds, total, page, pageSize)

    return NextResponse.json({ 
      builds: filteredBuilds, 
      pagination, 
      stats,
      filters: {
        platform,
        status,
        createdBy,
      },
      requestId
    })
  } catch (error) {
    log.error({ requestId, error }, "Failed to list payload builds")
    return toErrorResponse(error)
  }
}

// POST /api/admin/security/payloads - Create a new payload build
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = `payload-create-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    await verifyAdmin(req)
    const body = await req.json().catch(() => {
      throw new Error('Invalid JSON in request body')
    })
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ 
        error: 'Invalid request body',
        requestId 
      }, { status: 400 })
    }
    
    const result = PayloadBuildCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: result.error.issues,
        requestId 
      }, { status: 400 })
    }
    const parsed = result.data

    log.info({
      requestId,
      name: parsed.name,
      type: parsed.type,
      platform: parsed.platform,
      obfuscationLevel: parsed.obfuscationLevel,
      packingMethod: parsed.packingMethod
    }, "Creating payload build")

    // Add timeout protection for payload creation
    const buildPromise = createPayloadBuild({
      name: parsed.name,
      type: parsed.type,
      platform: parsed.platform,
      description: parsed.description,
      config: parsed.config,
      obfuscationLevel: parsed.obfuscationLevel ?? 0,
      packingMethod: parsed.packingMethod ?? "none",
      createdBy: body.createdBy,
    })
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Payload creation timeout')), 180000) // 3 minutes
    )
    
    const build = await Promise.race([buildPromise, timeoutPromise])

    log.info({ requestId, buildId: build.id }, "Payload build created successfully")

    return NextResponse.json({ ...build, requestId }, { status: 201 })
  } catch (error) {
    log.error({ requestId, error }, "Failed to create payload build")
    return toErrorResponse(error)
  }
}

// DELETE /api/admin/security/payloads - Delete a payload build
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const requestId = `payload-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "id required", requestId }, { status: 400 })
    }

    // Validate ID format — accept CUID, CUID2, UUID, and short test IDs
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
      return NextResponse.json({ error: "Invalid id format", requestId }, { status: 400 })
    }

    log.info({ requestId, id }, "Deleting payload build")

    const success = await deletePayloadBuild(id)
    if (!success) {
      log.warn({ requestId, id }, "Payload build not found for deletion")
      return NextResponse.json({ error: "Payload build not found", requestId }, { status: 404 })
    }

    log.info({ requestId, id }, "Payload build deleted successfully")
    return NextResponse.json({ success: true, requestId })
  } catch (error) {
    log.error({ requestId, error }, "Failed to delete payload build")
    return toErrorResponse(error)
  }
}
