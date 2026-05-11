import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  listPayloadBuilds,
  createPayloadBuild,
  deletePayloadBuild,
  getPayloadBuildStats,
  countPayloadBuilds,
} from "@/lib/db/payload-builds"
import { parsePagination, paginatedResponse } from "@/lib/pagination"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import logger from "@/lib/logger"

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
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const createdBy = searchParams.get('createdBy') || undefined
    const platform = searchParams.get('platform') || undefined
    const status = searchParams.get('status') || undefined
    const { page, pageSize, skip, take } = parsePagination(searchParams)

    log.info({ createdBy, platform, status, page, pageSize }, "Listing payload builds")

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
      }
    })
  } catch (error) {
    log.error({ error }, "Failed to list payload builds")
    return toErrorResponse(error)
  }
}

// POST /api/admin/security/payloads - Create a new payload build
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json()
    const parsed = PayloadBuildCreateSchema.parse(body)

    log.info({ 
      name: parsed.name, 
      type: parsed.type, 
      platform: parsed.platform,
      obfuscationLevel: parsed.obfuscationLevel,
      packingMethod: parsed.packingMethod
    }, "Creating payload build")

    const build = await createPayloadBuild({
      name: parsed.name,
      type: parsed.type,
      platform: parsed.platform,
      description: parsed.description,
      config: parsed.config,
      obfuscationLevel: parsed.obfuscationLevel ?? 0,
      packingMethod: parsed.packingMethod ?? "none",
      createdBy: body.createdBy,
    })

    return NextResponse.json(build, { status: 201 })
  } catch (error) {
    log.error({ error }, "Failed to create payload build")
    return toErrorResponse(error)
  }
}

// DELETE /api/admin/security/payloads - Delete a payload build
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    log.info({ id }, "Deleting payload build")

    const success = await deletePayloadBuild(id)
    if (!success) {
      log.warn({ id }, "Payload build not found for deletion")
      return NextResponse.json({ error: "Payload build not found" }, { status: 404 })
    }

    log.info({ id }, "Payload build deleted successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, "Failed to delete payload build")
    return toErrorResponse(error)
  }
}
