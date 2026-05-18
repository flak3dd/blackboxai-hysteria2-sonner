import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { assessTechniqueOPSEC } from "@c2panel/c2/ops/service"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import logger from "@c2panel/infrastructure/logging"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = logger.child({ module: "api/admin/opsec/assess" })

const AssessSchema = z.object({
  technique: z.string().min(1),
  context: z.object({
    targetEnvironment: z.string().optional(),
    monitoringLevel: z.enum(["low", "medium", "high"]).optional(),
    defensiveCapabilities: z.array(z.string()).optional(),
    timeConstraints: z.number().optional(),
    stealthPriority: z.number().min(0).max(1).optional(),
  }).optional(),
  options: z.record(z.any()).optional(),
})

// POST /api/admin/automation/opsec/assess
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const body = await req.json()
    const parsed = AssessSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const result = await assessTechniqueOPSEC(parsed.data)
    return NextResponse.json({ result })
  } catch (error) {
    log.error({ err: error }, "OPSEC assess error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
