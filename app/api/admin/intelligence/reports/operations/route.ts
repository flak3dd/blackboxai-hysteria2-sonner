import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import { reportGenerator } from "@/lib/reports/generator"

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