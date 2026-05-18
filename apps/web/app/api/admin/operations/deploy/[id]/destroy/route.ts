import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { destroyDeployment, getDeployment } from "@c2panel/c2/deploy/orchestrator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { id } = await params
    const deployment = getDeployment(id)
    if (!deployment) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    await destroyDeployment(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
