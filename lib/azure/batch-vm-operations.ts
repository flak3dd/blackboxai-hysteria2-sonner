/**
 * Azure VM Batch Operations Tool
 * 
 * Execute Azure CLI commands across all VMs in a subscription:
 * - List all VMs across resource groups
 * - Execute commands on multiple VMs
 * - Batch SSH key management
 * - Batch configuration updates
 * - Parallel execution with error handling
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface AzureVM {
  name: string
  resourceGroup: string
  location: string
  status: string
  size: string
  publicIp?: string
  privateIp?: string
  osType: 'Linux' | 'Windows'
  sshKeys?: string[]
}

export interface BatchCommandResult {
  vm: string
  resourceGroup: string
  success: boolean
  output?: string
  error?: string
  duration?: number
}

export interface BatchOptions {
  resourceGroup?: string
  location?: string
  status?: string
  parallel?: number
  command: string
  dryRun?: boolean
}

/**
 * Execute Azure CLI command with proper error handling
 */
async function executeAzureCLI(
  command: string,
  timeout = 30000
): Promise<{ success: boolean; output: string; error?: string; duration: number }> {
  const startTime = Date.now()
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    })
    
    const duration = Date.now() - startTime
    return {
      success: true,
      output: stdout,
      duration
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      duration
    }
  }
}

/**
 * List all VMs across the subscription
 */
export async function listAllAzureVMs(options?: {
  resourceGroup?: string
  location?: string
}): Promise<AzureVM[]> {
  let command = 'az vm list --query "[].{name:resourceGroup,location:provisioningState,hardwareProfile:vmSize,osProfile:linuxConfiguration:ssh.publicKeys,osProfile:windowsConfiguration:enableAutomaticUpdates}" -o json'
  
  if (options?.resourceGroup) {
    command = `az vm list -g ${options.resourceGroup} --query "[].{name:resourceGroup,location:provisioningState,hardwareProfile:vmSize,osProfile:linuxConfiguration:ssh.publicKeys,osProfile:windowsConfiguration:enableAutomaticUpdates}" -o json`
  }
  
  const result = await executeAzureCLI(command)
  
  if (!result.success) {
    throw new Error(`Failed to list VMs: ${result.error}`)
  }
  
  const vms = JSON.parse(result.output) as Array<any>
  
  return vms.map(vm => ({
    name: vm.name,
    resourceGroup: vm.resourceGroup,
    location: vm.location,
    status: vm.provisioningState,
    size: vm.hardwareProfile?.vmSize || 'unknown',
    sshKeys: vm.osProfile?.linuxConfiguration?.ssh?.publicKeys || [],
    osType: vm.osProfile?.linuxConfiguration ? 'Linux' : 'Windows'
  }))
}

/**
 * Get public IP for a VM
 */
export async function getVMPublicIP(resourceGroup: string, vmName: string): Promise<string | null> {
  const command = `az vm show -g ${resourceGroup} -n ${vmName} --query "publicIps" -o tsv`
  const result = await executeAzureCLI(command)
  
  if (!result.success) {
    return null
  }
  
  return result.output.trim() || null
}

/**
 * Get SSH keys for a specific VM (as shown in user's example)
 */
export async function getVMSSHKeys(resourceGroup: string, vmName: string): Promise<string[]> {
  const command = `az vm show -g ${resourceGroup} -n ${vmName} --query "osProfile.linuxConfiguration.ssh.publicKeys" -o json`
  const result = await executeAzureCLI(command)
  
  if (!result.success) {
    return []
  }
  
  try {
    const keys = JSON.parse(result.output) as string[]
    return keys
  } catch {
    return []
  }
}

/**
 * Execute command on a single VM
 */
export async function executeOnVM(
  resourceGroup: string,
  vmName: string,
  command: string
): Promise<BatchCommandResult> {
  const startTime = Date.now()
  
  try {
    const result = await executeAzureCLI(command)
    
    return {
      vm: vmName,
      resourceGroup,
      success: result.success,
      output: result.output,
      error: result.error,
      duration: Date.now() - startTime
    }
  } catch (error: any) {
    return {
      vm: vmName,
      resourceGroup,
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }
  }
}

/**
 * Execute command on all VMs (batch operation)
 */
export async function executeOnAllVMs(
  commandTemplate: string,
  options: BatchOptions = {}
): Promise<BatchCommandResult[]> {
  const vms = await listAllAzureVMs({
    resourceGroup: options.resourceGroup,
    location: options.location
  })
  
  // Filter VMs by status if specified
  let targetVMs = vms
  if (options.status) {
    targetVMs = vms.filter(vm => vm.status === options.status)
  }
  
  if (targetVMs.length === 0) {
    return []
  }
  
  // Dry run - return what would be executed
  if (options.dryRun) {
    return targetVMs.map(vm => ({
      vm: vm.name,
      resourceGroup: vm.resourceGroup,
      success: true,
      output: `Would execute: ${commandTemplate.replace('{vm}', vm.name).replace('{resourceGroup}', vm.resourceGroup)}`,
      duration: 0
    }))
  }
  
  // Execute in parallel with concurrency limit
  const concurrency = options.parallel || 5
  const results: BatchCommandResult[] = []
  
  for (let i = 0; i < targetVMs.length; i += concurrency) {
    const batch = targetVMs.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(vm => {
        const command = commandTemplate
          .replace('{vm}', vm.name)
          .replace('{resourceGroup}', vm.resourceGroup)
          .replace('{location}', vm.location)
        
        return executeOnVM(vm.resourceGroup, vm.name, command)
      })
    )
    
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Get SSH keys for all VMs (user's specific use case)
 */
export async function getAllVMSSHKs(options?: {
  resourceGroup?: string
  location?: string
}): Promise<Record<string, string[]>> {
  const vms = await listAllAzureVMs(options)
  const keysMap: Record<string, string[]> = {}
  
  // Only Linux VMs have SSH keys
  const linuxVMs = vms.filter(vm => vm.osType === 'Linux')
  
  for (const vm of linuxVMs) {
    try {
      const keys = await getVMSSHKeys(vm.resourceGroup, vm.name)
      keysMap[`${vm.resourceGroup}/${vm.name}`] = keys
    } catch (error) {
      console.error(`Failed to get SSH keys for ${vm.name}:`, error)
      keysMap[`${vm.resourceGroup}/${vm.name}`] = []
    }
  }
  
  return keysMap
}

/**
 * Start all VMs
 */
export async function startAllVMs(options?: {
  resourceGroup?: string
  location?: string
  parallel?: number
}): Promise<BatchCommandResult[]> {
  const vms = await listAllAzureVMs(options)
  const stoppedVMs = vms.filter(vm => vm.status === 'stopped' || vm.status === 'deallocated')
  
  return executeOnAllVMs(
    'az vm start -g {resourceGroup} -n {vm}',
    {
      ...options,
      parallel: options?.parallel || 3
    }
  )
}

/**
 * Stop all VMs
 */
export async function stopAllVMs(options?: {
  resourceGroup?: string
  location?: string
  parallel?: number
}): Promise<BatchCommandResult[]> {
  const vms = await listAllAzureVMs(options)
  const runningVMs = vms.filter(vm => vm.status === 'running')
  
  return executeOnAllVMs(
    'az vm stop -g {resourceGroup} -n {vm}',
    {
      ...options,
      parallel: options?.parallel || 3
    }
  )
}

/**
 * Restart all VMs
 */
export async function restartAllVMs(options?: {
  resourceGroup?: string
  location?: string
  parallel?: number
}): Promise<BatchCommandResult[]> {
  const vms = await listAllAzureVMs(options)
  const runningVMs = vms.filter(vm => vm.status === 'running')
  
  return executeOnAllVMs(
    'az vm restart -g {resourceGroup} -n {vm}',
    {
      ...options,
      parallel: options?.parallel || 3
    }
  )
}

/**
 * Deallocate all VMs
 */
export async function deallocateAllVMs(options?: {
  resourceGroup?: string
  location?: string
  parallel?: number
}): Promise<BatchCommandResult[]> {
  const vms = await listAllAzureVMs(options)
  
  return executeOnAllVMs(
    'az vm deallocate -g {resourceGroup} -n {vm}',
    {
      ...options,
      parallel: options?.parallel || 3
    }
  )
}

/**
 * Generalized VM show query for all VMs
 */
export async function queryAllVMs(query: string, options?: {
  resourceGroup?: string
  location?: string
}): Promise<Record<string, any>> {
  const vms = await listAllAzureVMs(options)
  const results: Record<string, any> = {}
  
  for (const vm of vms) {
    try {
      const command = `az vm show -g ${vm.resourceGroup} -n ${vm.name} --query "${query}" -o json`
      const result = await executeAzureCLI(command)
      
      if (result.success) {
        results[`${vm.resourceGroup}/${vm.name}`] = JSON.parse(result.output)
      } else {
        results[`${vm.resourceGroup}/${vm.name}`] = { error: result.error }
      }
    } catch (error) {
      results[`${vm.resourceGroup}/${vm.name}`] = { error: 'Query failed' }
    }
  }
  
  return results
}

/**
 * Get network configuration for all VMs
 */
export async function getAllVMNetworkConfigs(options?: {
  resourceGroup?: string
  location?: string
}): Promise<Record<string, any>> {
  return queryAllVMs('networkProfile.networkInterfaces', options)
}

/**
 * Get OS disk information for all VMs
 */
export async function getAllVMOSDisks(options?: {
  resourceGroup?: string
  location?: string
}): Promise<Record<string, any>> {
  return queryAllVMs('storageProfile.osDisk', options)
}

/**
 * Get tags for all VMs
 */
export async function getAllVMTags(options?: {
  resourceGroup?: string
  location?: string
}): Promise<Record<string, any>> {
  return queryAllVMs('tags', options)
}

/**
 * Batch update tags for all VMs
 */
export async function updateAllVMTags(
  tags: Record<string, string>,
  options?: {
    resourceGroup?: string
    location?: string
    parallel?: number
  }): Promise<BatchCommandResult[]> {
  const tagString = Object.entries(tags)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ')
  
  return executeOnAllVMs(
    `az vm update -g {resourceGroup} -n {vm} --set tags '${tagString}'`,
    {
      ...options,
      parallel: options?.parallel || 5
    }
  )
}

/**
 * Generate summary report of all VM operations
 */
export function generateBatchReport(results: BatchCommandResult[]): {
  total: number
  successful: number
  failed: number
  duration: number
  failures: Array<{ vm: string; error: string }>
  summary: string
} {
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => r.success === false).length
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0)
  
  const failures = results
    .filter(r => !r.success)
    .map(r => ({
      vm: `${r.resourceGroup}/${r.vm}`,
      error: r.error || 'Unknown error'
    }))
  
  return {
    total: results.length,
    successful,
    failed,
    duration: totalDuration,
    failures,
    summary: `Executed on ${results.length} VMs: ${successful} successful, ${failed} failed in ${(totalDuration / 1000).toFixed(2)}s`
  }
}