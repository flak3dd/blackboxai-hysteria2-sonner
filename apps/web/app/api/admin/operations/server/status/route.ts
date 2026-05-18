import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { getStatus } from "@c2panel/c2/transport/manager"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    return NextResponse.json({ status: getStatus() })
  } catch (err) {
    return toErrorResponse(err)
  }
}
