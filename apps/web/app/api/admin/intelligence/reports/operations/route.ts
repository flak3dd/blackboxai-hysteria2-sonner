import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { reportGenerator } from "@c2panel/reports/generator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)

    const operations = await reportGenerator.getOperations()

    return NextResponse.json({ operations })
  } catch (err) {
    return toErrorResponse(err)
  }
}