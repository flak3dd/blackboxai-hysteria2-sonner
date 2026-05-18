import { NextResponse, type NextRequest } from "next/server"
import { getPayloadBuildById, updatePayloadBuild, deletePayloadBuild } from "@c2panel/infrastructure/adapters/database/payload-builds"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api/payloads/[id]" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/admin/security/payloads/[id] - Get a specific payload build
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { id } = await params
    
    log.info({ buildId: id }, "Fetching payload build")
    
    const build = await getPayloadBuildById(id)
    if (!build) {
      log.warn({ buildId: id }, "Payload build not found")
      return NextResponse.json({ error: "Payload build not found" }, { status: 404 })
    }

    return NextResponse.json(build)
  } catch (error) {
    log.error({ error }, "Failed to fetch payload build")
    return toErrorResponse(error)
  }
}

// PATCH /api/admin/security/payloads/[id] - Update a payload build
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { id } = await params
    const body = await req.json()
    
    log.info({ buildId: id, updates: Object.keys(body) }, "Updating payload build")
    
    const build = await updatePayloadBuild(id, body)
    if (!build) {
      log.warn({ buildId: id }, "Payload build not found for update")
      return NextResponse.json({ error: "Payload build not found" }, { status: 404 })
    }

    log.info({ buildId: id }, "Payload build updated successfully")
    return NextResponse.json(build)
  } catch (error) {
    log.error({ error }, "Failed to update payload build")
    return toErrorResponse(error)
  }
}

// DELETE /api/admin/security/payloads/[id] - Delete a payload build
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { id } = await params
    
    log.info({ buildId: id }, "Deleting payload build")
    
    const success = await deletePayloadBuild(id)
    if (!success) {
      log.warn({ buildId: id }, "Payload build not found for deletion")
      return NextResponse.json({ error: "Payload build not found" }, { status: 404 })
    }

    log.info({ buildId: id }, "Payload build deleted successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, "Failed to delete payload build")
    return toErrorResponse(error)
  }
}