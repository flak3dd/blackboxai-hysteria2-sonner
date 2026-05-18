import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { start } from "@c2panel/c2/transport/manager"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const status = await start()
    return NextResponse.json({ status })
  } catch (err) {
    return toErrorResponse(err)
  }
}
