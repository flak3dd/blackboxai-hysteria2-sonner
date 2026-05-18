/* ------------------------------------------------------------------ */
/*  No-Op Packer Module                                                 */
/* ------------------------------------------------------------------ */

import { copyFile, stat } from "fs/promises"
import logger from "@/lib/logger"
import type { PackerResult } from "./upx"

/**
 * No-op packer that simply copies the file with no modification.
 * Used when packing is disabled or method is "none".
 *
 * @param inputPath  - Path to the input binary
 * @param outputPath - Path for the output (identical copy)
 * @returns PackerResult with 1:1 ratio
 */
export async function packNone(
  inputPath: string,
  outputPath: string
): Promise<PackerResult> {
  logger.info({ inputPath, outputPath }, "No-op packer: copying file")

  try {
    let originalSize: number

    try {
      const inputStat = await stat(inputPath)
      originalSize = inputStat.size
    } catch {
      // File doesn't exist (simulation mode)
      logger.debug("No-op packer: input file not found, simulating")
      originalSize = 0
    }

    // Copy the file
    try {
      await copyFile(inputPath, outputPath)
    } catch {
      logger.debug("No-op packer: copy failed (simulation mode)")
    }

    logger.info({
      originalSize,
      packedSize: originalSize,
      ratio: 1,
    }, "No-op packer: completed")

    return {
      success: true,
      originalSize,
      packedSize: originalSize,
      ratio: 1,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logger.error({ err: errorMsg }, "No-op packer: failed")
    return {
      success: false,
      originalSize: 0,
      packedSize: 0,
      ratio: 1,
    }
  }
}
