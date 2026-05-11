import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  discoverAttackPaths,
  getRecommendedAttackPath,
  getAttackGraphVisualization,
} from "@/lib/post-exploitation/service"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import logger from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = logger.child({ module: "api/admin/attack-paths" })

const DiscoverSchema = z.object({
  startHostId: z.string().min(1),
  targetPrivilege: z.enum(["user", "admin", "system", "domain_admin"]).optional(),
})

// GET /api/admin/attack-paths?startHostId=xxx&targetPrivilege=domain_admin
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const { searchParams } = new URL(req.url)
    const startHostId = searchParams.get("startHostId")
    const targetPrivilege = (searchParams.get("targetPrivilege") as any) || "domain_admin"
    const mode = searchParams.get("mode") || "list" // "list" | "recommended" | "visualize"

    if (mode === "visualize") {
      const graph = await getAttackGraphVisualization()
      return NextResponse.json({ graph })
    }

    if (!startHostId) {
      return NextResponse.json({ error: "startHostId required" }, { status: 400 })
    }

    if (mode === "recommended") {
      const path = await getRecommendedAttackPath(startHostId, targetPrivilege)
      return NextResponse.json({ path })
    }

    const paths = await discoverAttackPaths(startHostId, targetPrivilege)
    return NextResponse.json({ paths })
  } catch (error) {
    log.error({ err: error }, "Discover attack paths error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/attack-paths
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const body = await req.json()
    const parsed = DiscoverSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { startHostId, targetPrivilege } = parsed.data
    const paths = await discoverAttackPaths(startHostId, targetPrivilege)
    return NextResponse.json({ paths })
  } catch (error) {
    log.error({ err: error }, "Discover attack paths error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
