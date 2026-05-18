import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { listImplants, createImplant, getImplantStats, countImplants } from "@c2panel/infrastructure/adapters/database/implants"
import { parsePagination, paginatedResponse } from "@c2panel/shared/utils"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api/implants" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ImplantCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1),
  architecture: z.string().min(1),
  targetId: z.string().optional(),
  config: z.record(z.string(), z.unknown()),
  transportConfig: z.record(z.string(), z.unknown()),
  nodeId: z.string().optional(),
})

// GET /api/admin/security/implants - List implants (paginated)
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { page, pageSize, skip, take } = parsePagination(new URL(req.url).searchParams)
    const [implants, total, stats] = await Promise.all([
      listImplants({ skip, take }),
      countImplants(),
      getImplantStats(),
    ])
    const { pagination } = paginatedResponse(implants, total, page, pageSize)

    return NextResponse.json({ implants, pagination, stats })
  } catch (error) {
    return toErrorResponse(error)
  }
}

// POST /api/admin/security/implants - Create a new implant record
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json()
    const result = ImplantCreateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    const implant = await createImplant(result.data)

    return NextResponse.json(implant, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
