import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  listLateralMovements,
  createLateralMovement,
  countLateralMovements,
  getLateralMovementStats,
} from "@c2panel/infrastructure/adapters/database/lateral-movement"
import { LateralMovementCreate } from "@c2panel/shared/validation"
import { parsePagination, paginatedResponse } from "@c2panel/shared/utils"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import logger from "@c2panel/infrastructure/logging"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = logger.child({ module: "api/admin/security/lateral-movement" })

// GET /api/admin/security/lateral-movement - List lateral movements with filters
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const { searchParams } = new URL(req.url)
    const fromHostId = searchParams.get("fromHostId") || undefined
    const toHostId = searchParams.get("toHostId") || undefined
    const technique = searchParams.get("technique") as any
    const status = searchParams.get("status") as any
    
    const { page, pageSize, skip, take } = parsePagination(searchParams)
    
    const [movements, total, stats] = await Promise.all([
      listLateralMovements({
        skip,
        take,
        fromHostId,
        toHostId,
        technique,
        status,
      }),
      countLateralMovements({
        fromHostId,
        toHostId,
        technique,
        status,
      }),
      getLateralMovementStats(),
    ])
    
    const { pagination } = paginatedResponse(movements, total, page, pageSize)
    
    return NextResponse.json({ movements, pagination, stats })
  } catch (error) {
    log.error({ err: error }, "List lateral movements error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/security/lateral-movement - Create a new lateral movement
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const body = await req.json()
    const parsed = LateralMovementCreate.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", issues: parsed.error.issues },
        { status: 400 }
      )
    }
    
    const movement = await createLateralMovement(parsed.data)
    
    // Here you would trigger the actual lateral movement execution
    // For now, we'll just return the created record
    
    return NextResponse.json({ movement }, { status: 201 })
  } catch (error) {
    log.error({ err: error }, "Create lateral movement error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}