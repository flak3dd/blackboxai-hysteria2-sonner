import { NextResponse, type NextRequest } from "next/server"
import { getPayloadBuildById } from "@/lib/db/payload-builds"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import logger from "@/lib/logger"

const log = logger.child({ module: "api/payloads/download" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/admin/security/payloads/[id]/download - Download a compiled payload
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { id } = await params
    
    log.info({ buildId: id }, "Payload download requested")

    const build = await getPayloadBuildById(id)
    if (!build) {
      log.warn({ buildId: id }, "Payload build not found")
      return NextResponse.json({ error: "Payload build not found" }, { status: 404 })
    }

    if (build.status !== "ready") {
      log.warn({ buildId: id, status: build.status }, "Payload build is not ready")
      return NextResponse.json({ 
        error: "Payload build is not ready",
        status: build.status,
        message: build.status === "building" ? "Build is in progress" : 
                 build.status === "failed" ? "Build failed. Check error message." :
                 "Build is pending"
      }, { status: 400 })
    }

    // Generate filename with platform and obfuscation info
    const filename = generateFilename(build)
    
    // For demo purposes, generate a mock payload if no binary path exists
    if (!build.implantBinaryPath) {
      log.info({ buildId: id, type: build.type, platform: build.platform }, "Generating mock payload for download")
      return generateMockPayload(build, filename)
    }

    // Check if the file exists
    const filePath = join(process.cwd(), build.implantBinaryPath)
    if (!existsSync(filePath)) {
      log.warn({ buildId: id, expectedPath: filePath }, "Binary file not found on server, generating mock payload")
      return generateMockPayload(build, filename)
    }

    // Read the file and serve it
    const fileBuffer = await readFile(filePath)
    
    // Determine content type based on file extension
    const contentType = getContentType(build.type)

    log.info({ 
      buildId: id, 
      filename, 
      size: fileBuffer.length,
      type: build.type,
      platform: build.platform,
      obfuscationLevel: build.obfuscationLevel,
      packingMethod: build.packingMethod
    }, "Serving payload file")

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
        "X-Payload-Type": build.type,
        "X-Payload-Platform": build.platform || "unknown",
        "X-Obfuscation-Level": build.obfuscationLevel?.toString() || "0",
        "X-Packing-Method": build.packingMethod || "none",
        "X-MD5": build.md5Hash || "unknown",
        "X-SHA256": build.sha256Hash || "unknown",
      },
    })
  } catch (error) {
    log.error({ error }, "Failed to download payload")
    return toErrorResponse(error)
  }
}

function generateFilename(build: any): string {
  const sanitizedName = build.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
  const ext = getFileExtension(build.type)
  
  // Add platform and obfuscation info to filename for enhanced payloads
  let filename = `${sanitizedName}`
  
  if (build.platform) {
    filename += `-${build.platform}`
  }
  
  if (build.obfuscationLevel && build.obfuscationLevel > 0) {
    const obfLevel = build.obfuscationLevel === 1 ? 'light' : build.obfuscationLevel === 2 ? 'medium' : 'heavy'
    filename += `-obf-${obfLevel}`
  }
  
  if (build.packingMethod && build.packingMethod !== 'none') {
    filename += `-packed-${build.packingMethod}`
  }
  
  return `${filename}.${ext}`
}

function generateMockPayload(build: any, filename: string): NextResponse {
  // Generate a mock payload for demo purposes
  const mockContent = generateMockPayloadContent(build)
  const buffer = Buffer.from(mockContent, 'utf-8')
  
  const contentType = getContentType(build.type)
  
  log.info({ 
    buildId: build.id, 
    filename, 
    size: buffer.length,
    type: build.type,
    platform: build.platform
  }, "Serving mock payload")

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
      "X-Payload-Type": build.type,
      "X-Payload-Platform": build.platform || "unknown",
      "X-Obfuscation-Level": build.obfuscationLevel?.toString() || "0",
      "X-Packing-Method": build.packingMethod || "none",
      "X-Mock-Payload": "true",
      "X-Warning": "This is a mock payload for demo purposes",
    },
  })
}

function generateMockPayloadContent(build: any): string {
  const { type, platform, config, obfuscationLevel, packingMethod } = build
  
  const baseContent = `# Hysteria2 Payload - ${build.name}
# Type: ${type}
# Platform: ${platform || 'unknown'}
# Generated: ${new Date().toISOString()}
# Obfuscation Level: ${obfuscationLevel || 0}
# Packing Method: ${packingMethod || 'none'}

`
  
  switch (type) {
    case "powershell":
      return baseContent + generateMockPowerShell(config)
    case "python":
      return baseContent + generateMockPython(config)
    case "windows_exe":
    case "linux_elf":
    case "macos_app":
      return baseContent + `# Binary payload placeholder
# In production, this would be a compiled ${type} binary
# Configuration embedded: ${JSON.stringify(config, null, 2)}
`
    default:
      return baseContent + `# Unknown payload type: ${type}`
  }
}

function generateMockPowerShell(config: any): string {
  const hysteriaConfig = config?.hysteriaConfig || { server: "example.com:443", auth: "secret" }
  return `
# PowerShell Hysteria2 Client Loader
param(
    [string]$Server = "${hysteriaConfig.server}",
    [string]$Auth = "${hysteriaConfig.auth}"
)

Write-Host "Hysteria2 PowerShell Client"
Write-Host "Server: $Server"
Write-Host "Auth: $Auth"

# AMSI Bypass (if enabled)
# $Ref = ([Ref].Assembly.GetType('System.Management.Automation.AmsiUtils'))
# $Ref.GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)

# ETW Bypass (if enabled)
# $Ref = ([Ref].Assembly.GetType('System.Management.Automation.Tracing.PSEtwLogProvider'))
# $Ref.GetField('etwProvider','NonPublic,Static').SetValue($null,$null)

# Main client logic would go here
Write-Host "Client initialized successfully"
`
}

function generateMockPython(config: any): string {
  const hysteriaConfig = config?.hysteriaConfig || { server: "example.com:443", auth: "secret" }
  return `
#!/usr/bin/env python3
"""
Hysteria2 Python Client
Server: ${hysteriaConfig.server}
Auth: ${hysteriaConfig.auth}
"""

import asyncio
import socket

class Hysteria2Client:
    def __init__(self, server: str, auth: str):
        self.server = server
        self.auth = auth
    
    async def connect(self):
        print(f"Connecting to {self.server}...")
        # Implementation would go here
        print("Connected successfully")

async def main():
    client = Hysteria2Client("${hysteriaConfig.server}", "${hysteriaConfig.auth}")
    await client.connect()

if __name__ == "__main__":
    asyncio.run(main())
`
}

function getContentType(payloadType: string): string {
  switch (payloadType) {
    case "windows_exe":
      return "application/vnd.microsoft.portable-executable"
    case "linux_elf":
      return "application/x-executable"
    case "macos_app":
      return "application/octet-stream"
    case "powershell":
      return "text/plain"
    case "python":
      return "text/x-python"
    default:
      return "application/octet-stream"
  }
}

function getFileExtension(payloadType: string): string {
  switch (payloadType) {
    case "windows_exe":
      return "exe"
    case "linux_elf":
      return "elf"
    case "macos_app":
      return "app"
    case "powershell":
      return "ps1"
    case "python":
      return "py"
    default:
      return "bin"
  }
}