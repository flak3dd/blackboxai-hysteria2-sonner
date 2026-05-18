import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { startDeployment, listDeployments } from "@c2panel/c2/deploy/orchestrator"
import { DeploymentConfig } from "@c2panel/c2/deploy/types"
import { serverEnv } from "@c2panel/infrastructure/config"
import { randomBytes } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json().catch(() => null)
    const { presetId, customOverrides = {} } = body

    if (!presetId) {
      return NextResponse.json({ error: "presetId is required" }, { status: 400 })
    }

    // Fetch preset details
    const presetRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/operations/deploy/build-presets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presetId }),
    })

    if (!presetRes.ok) {
      return NextResponse.json({ error: "Failed to fetch preset" }, { status: 400 })
    }

    const presetData = await presetRes.json()
    const preset = presetData.preset
    const config = presetData.config

    // Check for active deployments
    const existingDeployments = listDeployments()
    const activeCount = existingDeployments.filter(d => d.status === "running" || d.status === "pending").length

    if (activeCount > 0) {
      return NextResponse.json(
        { error: "Deployments in progress", message: `Wait for ${activeCount} active deployment(s) to complete` },
        { status: 409 }
      )
    }

    const results: Array<{
      region: string
      deploymentId: string
      status: "started" | "failed"
      nodeName: string
      error?: string
    }> = []

    // Deploy nodes based on preset regions
    for (let i = 0; i < config.regions.length; i++) {
      const region = config.regions[i]
      const nodeName = `${preset.name.toLowerCase().replace(/\s+/g, "-")}-${region}-${Date.now()}-${i}`

      try {
        const deploymentConfig: DeploymentConfig = {
          provider: config.provider,
          region,
          size: config.size,
          name: nodeName,
          port: config.port,
          tags: config.tags,
          panelUrl: customOverrides.panelUrl || serverEnv().NEXT_PUBLIC_APP_URL,
          obfsPassword: config.obfsEnabled 
            ? (customOverrides.obfsPassword || randomBytes(config.obfsPasswordLength || 32).toString("hex"))
            : undefined,
          bandwidthUp: config.bandwidth?.up,
          bandwidthDown: config.bandwidth?.down,
          resourceGroup: customOverrides.resourceGroup,
          email: customOverrides.email,
          domain: customOverrides.domain,
          authBackendSecret: customOverrides.authBackendSecret,
          trafficStatsSecret: customOverrides.trafficStatsSecret,
          profileId: customOverrides.profileId,
          cloudflareTunnelUrl: customOverrides.cloudflareTunnelUrl,
        }

        const deployment = await startDeployment(deploymentConfig)

        results.push({
          region,
          deploymentId: deployment.id,
          status: "started",
          nodeName,
        })
      } catch (err) {
        results.push({
          region,
          deploymentId: "",
          status: "failed",
          nodeName,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    const started = results.filter(r => r.status === "started").length
    const failed = results.filter(r => r.status === "failed").length

    return NextResponse.json({
      success: true,
      message: `Started ${started} of ${config.regions.length} deployments using "${preset.name}" preset`,
      results,
      preset: preset.name,
    }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
