import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { createNode } from "@c2panel/infrastructure/adapters/database/nodes"
import { sshExec } from "@c2panel/c2/deploy/ssh"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ImportNodeRequest {
  name: string
  hostname: string
  ipAddress: string
  sshPort?: number
  sshUsername?: string
  sshPrivateKey?: string
  provider?: string
  region?: string
  port?: number
  tags?: string[]
}

/**
 * Import an existing Hysteria2 node into the workspace
 * Validates SSH connection and registers the node in the database
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body: ImportNodeRequest = await req.json()

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Node name is required" }, { status: 400 })
    }
    if (!body.hostname?.trim()) {
      return NextResponse.json({ error: "Hostname is required" }, { status: 400 })
    }
    if (!body.ipAddress?.trim()) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }
    if (!body.sshPrivateKey?.trim()) {
      return NextResponse.json({ error: "SSH private key is required" }, { status: 400 })
    }

    // Validate SSH connection
    try {
      const testResult = await sshExec({
        host: body.ipAddress.trim(),
        port: body.sshPort || 22,
        username: body.sshUsername || "root",
        privateKey: body.sshPrivateKey.trim(),
        command: "systemctl is-active hysteria-server 2>/dev/null || echo 'not_installed'",
        timeoutMs: 30_000,
      })

      // Check if Hysteria2 is installed
      const isInstalled = testResult.stdout.includes("active") || testResult.stdout.includes("inactive")
      
      if (!isInstalled) {
        return NextResponse.json({ 
          error: "Hysteria2 not found on this server",
          suggestion: "Please install Hysteria2 on this server before importing it. You can deploy a new node using the Deploy button."
        }, { status: 400 })
      }

      // Get Hysteria2 configuration if possible
      let port = body.port || 443
      try {
        const portResult = await sshExec({
          host: body.ipAddress.trim(),
          port: body.sshPort || 22,
          username: body.sshUsername || "root",
          privateKey: body.sshPrivateKey.trim(),
          command: "cat /etc/hysteria/config.yaml 2>/dev/null | grep -E 'listen:|port:' || echo 'config_not_found'",
          timeoutMs: 10_000,
        })
        
        const portMatch = portResult.stdout.match(/port:\s*(\d+)/)
        if (portMatch) {
          port = parseInt(portMatch[1])
        }
      } catch {
        // Use default port if config check fails
      }

      // Register the node in the database
      const node = await createNode({
        name: body.name.trim(),
        hostname: body.hostname.trim(),
        region: body.region,
        listenAddr: `:${port}`,
        status: "running", // Assume running since we connected successfully
        tags: body.tags || [],
        provider: body.provider || "imported",
      })

      return NextResponse.json({
        success: true,
        node: {
          id: node.id,
          name: node.name,
          hostname: node.hostname,
          region: node.region,
          listenAddr: node.listenAddr,
          status: node.status,
          tags: node.tags,
          provider: node.provider,
          port,
        },
        message: "Node imported successfully"
      }, { status: 201 })
    } catch (error) {
      console.error("SSH connection failed:", error)
      return NextResponse.json({ 
        error: "SSH connection failed",
        suggestion: "Please verify the IP address, SSH port, username, and private key are correct.",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 400 })
    }
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * Validate SSH connection without registering the node
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body: Omit<ImportNodeRequest, "name" | "hostname"> = await req.json()

    if (!body.ipAddress?.trim()) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }
    if (!body.sshPrivateKey?.trim()) {
      return NextResponse.json({ error: "SSH private key is required" }, { status: 400 })
    }

    try {
      const testResult = await sshExec({
        host: body.ipAddress.trim(),
        port: body.sshPort || 22,
        username: body.sshUsername || "root",
        privateKey: body.sshPrivateKey.trim(),
        command: "echo 'connection_ok'",
        timeoutMs: 30_000,
      })

      // Check if Hysteria2 is installed
      const hysteriaCheck = await sshExec({
        host: body.ipAddress.trim(),
        port: body.sshPort || 22,
        username: body.sshUsername || "root",
        privateKey: body.sshPrivateKey.trim(),
        command: "systemctl is-active hysteria-server 2>/dev/null || echo 'not_installed'",
        timeoutMs: 10_000,
      })

      const isInstalled = hysteriaCheck.stdout.includes("active") || hysteriaCheck.stdout.includes("inactive")

      return NextResponse.json({
        success: true,
        connection: "ok",
        hysteria2Installed: isInstalled,
        message: isInstalled ? "SSH connection successful and Hysteria2 is installed" : "SSH connection successful but Hysteria2 is not installed"
      })
    } catch (error) {
      console.error("SSH connection failed:", error)
      return NextResponse.json({ 
        success: false,
        connection: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      }, { status: 400 })
    }
  } catch (err) {
    return toErrorResponse(err)
  }
}
