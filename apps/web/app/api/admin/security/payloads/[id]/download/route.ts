import { NextResponse, type NextRequest } from "next/server"
import { getPayloadBuildById } from "@c2panel/infrastructure/adapters/database/payload-builds"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import logger from "@c2panel/infrastructure/logging"

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
    
    // Check if binary path exists
    if (!build.implantBinaryPath) {
      log.warn({ buildId: id }, "Payload binary path not available")
      return NextResponse.json({ error: "Payload binary not available for download" }, { status: 404 })
    }

    // Use absolute path as stored by the builder
    const filePath = build.implantBinaryPath
    if (!existsSync(filePath)) {
      log.warn({ buildId: id, expectedPath: filePath }, "Binary file not found on server")
      return NextResponse.json({ error: "Payload binary file not found on server" }, { status: 404 })
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

function getContentType(payloadType: string): string {
  switch (payloadType) {
    case "windows_exe":
    case "linux_elf":
    case "macos_app":
      return "text/plain"
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
    case "linux_elf":
    case "macos_app":
      return "go"
    case "powershell":
      return "ps1"
    case "python":
      return "py"
    default:
      return "go"
  }
}
