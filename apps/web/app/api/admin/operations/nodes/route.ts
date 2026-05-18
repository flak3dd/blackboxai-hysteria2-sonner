import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { NodeCreate } from "@c2panel/shared/validation"
import { createNode, listNodes, countNodes } from "@c2panel/infrastructure/adapters/database/nodes"
import { parsePagination, paginatedResponse } from "@c2panel/shared/utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { page, pageSize, skip, take } = parsePagination(new URL(req.url).searchParams)
    const [nodes, total] = await Promise.all([listNodes({ skip, take }), countNodes()])
    const { pagination } = paginatedResponse(nodes, total, page, pageSize)
    return NextResponse.json({ nodes, pagination })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json().catch(() => null)
    const parsed = NodeCreate.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 })
    }
    const node = await createNode(parsed.data)
    return NextResponse.json({ node }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
