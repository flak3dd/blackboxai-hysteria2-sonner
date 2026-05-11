import { NextResponse, type NextRequest } from "next/server"
import { getAvailableOPSECTechniques, getOPSECTechniqueProfile } from "@/lib/post-exploitation/service"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import logger from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = logger.child({ module: "api/admin/opsec/techniques" })

// GET /api/admin/opsec/techniques
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const { searchParams } = new URL(req.url)
    const technique = searchParams.get("technique")

    if (technique) {
      const profile = getOPSECTechniqueProfile(technique)
      if (!profile) {
        return NextResponse.json({ error: "Technique not found" }, { status: 404 })
      }
      return NextResponse.json({ profile })
    }

    const techniques = getAvailableOPSECTechniques()
    const profiles = techniques
      .map((t) => getOPSECTechniqueProfile(t))
      .filter(Boolean)

    return NextResponse.json({ techniques, profiles })
  } catch (error) {
    log.error({ err: error }, "Get OPSEC techniques error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
