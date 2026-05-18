import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { allPresetsAsync } from "@c2panel/c2/deploy/providers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const presets = await allPresetsAsync()
    return NextResponse.json({ presets })
  } catch (err) {
    return toErrorResponse(err)
  }
}
