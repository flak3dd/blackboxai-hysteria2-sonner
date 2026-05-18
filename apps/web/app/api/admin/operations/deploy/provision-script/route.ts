import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { buildProvisionScript, type ProvisionScriptOpts } from "@c2panel/c2/deploy/provision-script"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const RequestBody = z.object({
  domain: z.string().min(1).optional(),
  ip: z.string().min(1).default("YOUR_SERVER_IP"),
  port: z.coerce.number().int().min(1).max(65535).default(443),
  panelUrl: z.string().url(),
  authBackendSecret: z.string().min(16).optional(),
  trafficStatsSecret: z.string().min(16),
  obfsPassword: z.string().min(8).optional(),
  email: z.string().email().optional(),
  bandwidthUp: z.string().optional(),
  bandwidthDown: z.string().optional(),
  cloudflareTunnelUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json().catch(() => null)
    const parsed = RequestBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const opts: ProvisionScriptOpts = parsed.data
    const script = buildProvisionScript(opts)

    return NextResponse.json({ script })
  } catch (err) {
    return toErrorResponse(err)
  }
}
