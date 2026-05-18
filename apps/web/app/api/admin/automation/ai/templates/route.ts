import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { AI_TEMPLATES } from "@c2panel/ai/templates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    return NextResponse.json({ templates: AI_TEMPLATES })
  } catch (err) {
    return toErrorResponse(err)
  }
}
