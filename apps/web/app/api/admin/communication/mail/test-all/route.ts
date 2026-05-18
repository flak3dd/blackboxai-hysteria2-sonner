import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { runAllAccountTests } from "@c2panel/infrastructure/adapters/email/auto-test"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const results = await runAllAccountTests()
    return NextResponse.json({ results })
  } catch (err) {
    return toErrorResponse(err)
  }
}
