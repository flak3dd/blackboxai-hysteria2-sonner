import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { fetchTraffic } from "@c2panel/c2/transport/traffic"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const clear = new URL(req.url).searchParams.get("clear") === "1"
    const traffic = await fetchTraffic(clear)
    return NextResponse.json({ traffic })
  } catch (err) {
    return toErrorResponse(err)
  }
}
