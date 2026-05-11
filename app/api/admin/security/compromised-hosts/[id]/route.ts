import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  getCompromisedHostById,
  updateCompromisedHost,
  deleteCompromisedHost,
} from "@/lib/post-exploitation/service"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import logger from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = logger.child({ module: "api/admin/compromised-hosts/[id]" })

const UpdateSchema = z.object({
  hostname: z.string().min(1).optional(),
  ipAddress: z.string().min(1).optional(),
  os: z.string().optional(),
  domain: z.string().optional(),
  privileges: z.enum(["user", "admin", "system", "domain_admin"]).optional(),
  implantId: z.string().optional(),
})

// GET /api/admin/compromised-hosts/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const { id } = await params
    const host = await getCompromisedHostById(id)

    if (!host) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 })
    }

    return NextResponse.json({ host })
  } catch (error) {
    log.error({ err: error }, "Get compromised host error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/compromised-hosts/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const host = await updateCompromisedHost(id, parsed.data)

    if (!host) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 })
    }

    return NextResponse.json({ host })
  } catch (error) {
    log.error({ err: error }, "Update compromised host error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/admin/compromised-hosts/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const { id } = await params
    const success = await deleteCompromisedHost(id)

    if (!success) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ err: error }, "Delete compromised host error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
