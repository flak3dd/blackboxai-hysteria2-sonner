/**
 * Azure Batch Operations API
 * 
 * REST API endpoints for batch Azure VM operations:
 * - List all VMs
 * - Execute commands on all VMs
 * - Get SSH keys for all VMs
 * - Batch start/stop/restart VMs
 * - Query VM properties across all instances
 */

import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  listAllAzureVMs,
  getVMSSHKeys,
  getAllVMSSHKs,
  executeOnAllVMs,
  startAllVMs,
  stopAllVMs,
  restartAllVMs,
  deallocateAllVMs,
  queryAllVMs,
  getAllVMNetworkConfigs,
  getAllVMOSDisks,
  getAllVMTags,
  updateAllVMTags,
  generateBatchReport,
  type BatchOptions
} from "@c2panel/azure/batch-vm-operations"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api-azure-batch" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  GET /api/admin/azure/batch/vms - List all VMs                               */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = `azure-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    await verifyAdmin(req)

    const { searchParams } = new URL(req.url)
    const resourceGroup = searchParams.get('resourceGroup') || undefined
    const location = searchParams.get('location') || undefined
    const operation = searchParams.get('operation') || 'list'

    if (operation === 'ssh-keys') {
      // Get SSH keys for all VMs
      const sshKeys = await getAllVMSSHKs({ resourceGroup, location })
      
      log.info({ requestId, count: Object.keys(sshKeys).length }, "Retrieved SSH keys for all VMs")
      
      return NextResponse.json({
        requestId,
        sshKeys,
        count: Object.keys(sshKeys).length
      })
    } else if (operation === 'network') {
      // Get network configs for all VMs
      const networkConfigs = await getAllVMNetworkConfigs({ resourceGroup, location })
      
      log.info({ requestId, count: Object.keys(networkConfigs).length }, "Retrieved network configs for all VMs")
      
      return NextResponse.json({
        requestId,
        networkConfigs,
        count: Object.keys(networkConfigs).length
      })
    } else if (operation === 'disks') {
      // Get OS disk info for all VMs
      const disks = await getAllVMOSDisks({ resourceGroup, location })
      
      log.info({ requestId, count: Object.keys(disks).length }, "Retrieved disk info for all VMs")
      
      return NextResponse.json({
        requestId,
        disks,
        count: Object.keys(disks).length
      })
    } else if (operation === 'tags') {
      // Get tags for all VMs
      const tags = await getAllVMTags({ resourceGroup, location })
      
      log.info({ requestId, count: Object.keys(tags).length }, "Retrieved tags for all VMs")
      
      return NextResponse.json({
        requestId,
        tags,
        count: Object.keys(tags).length
      })
    } else {
      // Default: list all VMs
      const vms = await listAllAzureVMs({ resourceGroup, location })
      
      log.info({ requestId, count: vms.length }, "Listed all Azure VMs")
      
      return NextResponse.json({
        requestId,
        vms,
        count: vms.length,
        resourceGroup: resourceGroup || 'all',
        location: location || 'all'
      })
    }
  } catch (err) {
    log.error({ requestId, err }, "Azure batch operation failed")
    return toErrorResponse(err)
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/admin/azure/batch/vms - Execute batch operations                     */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = `azure-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    await verifyAdmin(req)

    const body = await req.json().catch(() => {
      throw new Error("Invalid JSON in request body")
    })

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body", requestId }, { status: 400 })
    }

    const {
      operation,
      command,
      resourceGroup,
      location,
      status,
      parallel,
      dryRun,
      tags
    } = body

    if (!operation) {
      return NextResponse.json({ error: "Operation is required", requestId }, { status: 400 })
    }

    const options: BatchOptions = {
      resourceGroup,
      location,
      status,
      parallel: parallel || 5,
      dryRun
    }

    let results
    let summary

    switch (operation) {
      case 'start':
        results = await startAllVMs(options)
        summary = generateBatchReport(results)
        log.info({ requestId, ...summary }, "Batch start VMs completed")
        break

      case 'stop':
        results = await stopAllVMs(options)
        summary = generateBatchReport(results)
        log.info({ requestId, ...summary }, "Batch stop VMs completed")
        break

      case 'restart':
        results = await restartAllVMs(options)
        summary = generateBatchReport(results)
        log.info({ requestId, ...summary }, "Batch restart VMs completed")
        break

      case 'deallocate':
        results = await deallocateAllVMs(options)
        summary = generateBatchReport(results)
        log.info({ requestId, ...summary }, "Batch deallocate VMs completed")
        break

      case 'custom':
        if (!command) {
          return NextResponse.json({ error: "Command is required for custom operations", requestId }, { status: 400 })
        }
        results = await executeOnAllVMs(command, options)
        summary = generateBatchReport(results)
        log.info({ requestId, ...summary }, "Custom batch command completed")
        break

      case 'update-tags':
        if (!tags || typeof tags !== "object") {
          return NextResponse.json({ error: "Tags object is required for update-tags operation", requestId }, { status: 400 })
        }
        results = await updateAllVMTags(tags, options)
        summary = generateBatchReport(results)
        log.info({ requestId, ...summary }, "Batch tag update completed")
        break

      default:
        return NextResponse.json({ error: `Unknown operation: ${operation}`, requestId }, { status: 400 })
    }

    return NextResponse.json({
      requestId,
      operation,
      results,
      summary,
      dryRun: dryRun || false
    })
  } catch (err) {
    log.error({ requestId, err }, "Azure batch operation failed")
    return toErrorResponse(err)
  }
}
