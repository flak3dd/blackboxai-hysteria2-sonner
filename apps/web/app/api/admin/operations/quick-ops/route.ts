import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { initRun, emitDone } from "@c2panel/operations/run-registry"
import { runOperation } from "@c2panel/operations/executor"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const StartRunSchema = z.object({
  presetId: z.string().min(1),
  nodeId: z.string().min(1),
  emailCsv: z.string().min(1),
  smtpConfigId: z.string().optional(),
  overrides: z
    .object({
      subject: z.string().optional(),
      xorKey: z.number().int().min(1).max(255).optional(),
      obfuscationLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
      pretextArgs: z.record(z.string(), z.string()).optional(),
      customPretextHtml: z.string().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)

    const body = await req.json().catch(() => null)
    const parsed = StartRunSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 })
    }

    const runId = randomUUID()
    initRun(runId)

    runOperation({ runId, ...parsed.data }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      emitDone(runId, undefined, msg)
    })

    return NextResponse.json({ runId }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
