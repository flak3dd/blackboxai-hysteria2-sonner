import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { fetchOnline } from "@c2panel/c2/transport/traffic"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const online = await fetchOnline()
    return NextResponse.json({ online })
  } catch (err) {
    return toErrorResponse(err)
  }
}
