import { NextResponse, type NextRequest } from "next/server"
import { getUserByAuthToken } from "@c2panel/infrastructure/adapters/database/users"
import { listNodes } from "@c2panel/infrastructure/adapters/database/nodes"
import { getServerConfig } from "@c2panel/infrastructure/adapters/database/server-config"
import { getProfileById, resolveProfileConfig } from "@c2panel/infrastructure/adapters/database/profiles"
import type { ResolvedProfileConfig } from "@c2panel/infrastructure/adapters/database/profiles"
import { renderClientUri } from "@c2panel/c2/transport/client-config"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api/sub/hysteria2" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function getNodeProfileConfig(profileId: string | null | undefined): Promise<ResolvedProfileConfig | undefined> {
  if (!profileId) return undefined
  const profile = await getProfileById(profileId).catch(() => null)
  if (!profile) return undefined
  return resolveProfileConfig(profile)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const user = await getUserByAuthToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account is disabled" }, { status: 403 })
    }

    const nodes = await listNodes()
    const runningNodes = nodes.filter((n) => n.status === "running")

    if (runningNodes.length === 0) {
      return NextResponse.json({ error: "No running nodes available" }, { status: 503 })
    }

    const tagsParam = searchParams.get("tags")
    const filterTags = tagsParam ? tagsParam.split(",").map((t) => t.trim()) : null

    const filteredNodes = filterTags
      ? runningNodes.filter((n) => n.tags.some((t) => filterTags.includes(t)))
      : runningNodes

    if (filteredNodes.length === 0) {
      return NextResponse.json({ error: "No nodes match the requested tags" }, { status: 404 })
    }

    const format = searchParams.get("format") ?? "base64"
    const server = await getServerConfig().catch(() => null)

    const uris = await Promise.all(
      filteredNodes.map(async (node) => {
        const profileConfig = await getNodeProfileConfig(node.profileId)
        return renderClientUri(user, node, server, profileConfig)
      }),
    )

    // Implant bootstrap mode — returns JSON config for the Go implant
    const isImplant = searchParams.get("implant") === "true"
    if (isImplant) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL ?? "http://localhost:3000"
      const primaryNode = filteredNodes[0]
      const profileConfig = await getNodeProfileConfig(primaryNode.profileId)

      const serverList = filteredNodes.map(n => {
        const port = n.listenAddr.match(/:(\d+)$/)?.[1] ?? "443"
        return `${n.hostname}:${port}`
      })

      return NextResponse.json({
        implant_id: `implant-${user.id}-${Date.now()}`,
        servers: serverList,
        password: user.authToken,
        sni: primaryNode.hostname,
        obfs: profileConfig?.obfs?.password ?? null,
        obfs_type: profileConfig?.obfs ? "salamander" : null,
        masquerade: profileConfig?.masquerade?.proxy?.url ?? null,
        bandwidth_up: profileConfig?.bandwidth?.up ?? null,
        bandwidth_down: profileConfig?.bandwidth?.down ?? null,
        tun_enabled: profileConfig?.tunEnabled ?? false,
        crypto_key: Buffer.from(user.authToken).toString("base64"),
        interval: 45,
        jitter: 25,
        max_retries: 3,
        backoff_multiplier: 2.0,
        max_backoff: 300,
        kill_switch_enabled: true,
        heartbeat_interval: 300,
        network_aware: true,
        stealth_hours: [0, 1, 2, 3, 4, 5, 22, 23],
        c2_url: baseUrl,
        c2_tasks_url: `${baseUrl}/api/dpanel/implant/tasks`,
        c2_result_url: `${baseUrl}/api/dpanel/implant/result`,
        c2_heartbeat_url: `${baseUrl}/api/dpanel/implant/heartbeat`,
      })
    }

    if (format === "base64") {
      const body = Buffer.from(uris.join("\n")).toString("base64")
      return new NextResponse(body, {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      })
    }

    return NextResponse.json({ uris })
  } catch (error) {
    log.error({ err: error }, "Subscription error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
