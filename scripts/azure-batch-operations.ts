#!/usr/bin/env node

/**
 * Azure VM Batch Operations CLI
 * 
 * Command-line interface for batch Azure VM operations:
 * - List all VMs
 * - Execute commands on all VMs
 * - Get SSH keys for all VMs
 * - Batch lifecycle operations
 * 
 * Usage:
 *   node scripts/azure-batch-operations.ts [command] [options]
 * 
 * Commands:
 *   list - List all VMs
 *   ssh-keys - Get SSH keys for all VMs
 *   start - Start all VMs
 *   stop - Stop all VMs
 *   restart - Restart all VMs
 *   deallocate - Deallocate all VMs
 *   custom - Execute custom command on all VMs
 *   network - Get network configs for all VMs
 *   disks - Get disk info for all VMs
 *   tags - Get tags for all VMs
 */

import { executeAzureCLI } from '../lib/azure/batch-vm-operations'

interface CommandOptions {
  resourceGroup?: string
  location?: string
  status?: string
  parallel?: number
  dryRun?: boolean
  command?: string
  tags?: string
}

const command = process.argv[2]
const args = process.argv.slice(3)

function parseArgs(args: string[]): CommandOptions {
  const options: CommandOptions = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--resource-group' || arg === '-g') {
      options.resourceGroup = args[++i]
    } else if (arg === '--location' || arg === '-l') {
      options.location = args[++i]
    } else if (arg === '--status' || arg === '-s') {
      options.status = args[++i]
    } else if (arg === '--parallel' || arg === '-p') {
      options.parallel = parseInt(args[++i])
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true
    } else if (arg === '--command' || arg === '-c') {
      options.command = args[++i]
    } else if (arg === '--tags' || arg === '-t') {
      options.tags = args[++i]
    }
  }
  
  return options
}

async function main() {
  console.log('Azure VM Batch Operations CLI')
  console.log('===================================\n')
  
  const options = parseArgs(args)
  
  try {
    switch (command) {
      case 'list':
        await listVMs(options)
        break
      case 'ssh-keys':
        await getSSHKs(options)
        break
      case 'start':
        await startVMs(options)
        break
      case 'stop':
        await stopVMs(options)
        break
      case 'restart':
        await restartVMs(options)
        break
      case 'deallocate':
        await deallocateVMs(options)
        break
      case 'custom':
        await customCommand(options)
        break
      case 'network':
        await getNetworkConfigs(options)
        break
      case 'disks':
        await getDiskInfo(options)
        break
      case 'tags':
        await getTags(options)
        break
      default:
        showUsage()
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

async function listVMs(options: CommandOptions) {
  let azureCommand = 'az vm list'
  
  if (options.resourceGroup) {
    azureCommand += ` -g ${options.resourceGroup}`
  }
  
  azureCommand += ' --query "[].{name:resourceGroup,location:provisioningState,hardwareProfile:vmSize,osProfile:linuxConfiguration:ssh.publicKeys}" -o json'
  
  console.log('Listing all VMs...')
  const result = await executeAzureCLI(azureCommand, 60000)
  
  if (result.success) {
    const vms = JSON.parse(result.output) as Array<any>
    console.log(`Found ${vms.length} VMs\n`)
    
    vms.forEach(vm => {
      console.log(`${vm.name}`)
      console.log(`  Resource Group: ${vm.resourceGroup}`)
      console.log(`  Location: ${vm.location}`)
      console.log(`  Status: ${vm.provisioningState}`)
      console.log(`  Size: ${vm.hardwareProfile?.vmSize}`)
      console.log(`  SSH Keys: ${vm.osProfile?.linuxConfiguration?.ssh?.publicKeys?.join(', ') || 'None'}`)
      console.log(`  OS: ${vm.osProfile?.linuxConfiguration ? 'Linux' : 'Windows'}`)
      console.log()
    })
  } else {
    console.error('Failed to list VMs:', result.error)
  }
}

async function getSSHKs(options: CommandOptions) {
  console.log('Getting SSH keys for all Linux VMs...')
  
  // First list VMs
  let listCommand = 'az vm list'
  if (options.resourceGroup) {
    listCommand += ` -g ${options.resourceGroup}`
  }
  listCommand += ' --query "[].{name:resourceGroup,osProfile:linuxConfiguration:ssh.publicKeys}" -o json'
  
  const listResult = await executeAzureCLI(listCommand, 60000)
  if (!listResult.success) {
    console.error('Failed to list VMs:', listResult.error)
    return
  }
  
  const vms = JSON.parse(listResult.output) as Array<any>
  const linuxVMs = vms.filter(vm => vm.osProfile?.linuxConfiguration)
  
  console.log(`Found ${linuxVMs.length} Linux VMs with SSH keys\n`)
  
  for (const vm of linuxVMs) {
    const command = `az vm show -g ${vm.resourceGroup} -n ${vm.name} --query "osProfile.linuxConfiguration.ssh.publicKeys" -o json`
    const result = await executeAzureCLI(command)
    
    if (result.success) {
      try {
        const keys = JSON.parse(result.output) as string[]
        console.log(`${vm.name} (${vm.resourceGroup})`)
        console.log(`  SSH Keys: ${keys.join(', ') || 'None'}`)
        console.log()
      } catch {
        console.log(`${vm.name} (${vm.resourceGroup})`)
        console.log(`  SSH Keys: None`)
        console.log()
      }
    }
  }
}

async function startVMs(options: CommandOptions) {
  console.log('Starting all VMs...')
  
  // List VMs first
  let listCommand = 'az vm list'
  if (options.resourceGroup) {
    listCommand += ` -g ${options.resourceGroup}`
  }
  if (options.status) {
    listCommand += ` --filter "provisioningState=='${options.status}'"`
  }
  listCommand += ' --query "[].{name:resourceGroup,provisioningState}" -o tsv'
  
  const listResult = await executeAzureCLI(listCommand, 60000)
  if (!listResult.success) {
    console.error('Failed to list VMs:', listResult.error)
    return
  }
  
  const lines = listResult.output.split('\n').filter(line => line.trim())
  const stoppedVMs = lines.filter(line => line.split('\t')[1] === 'stopped')
  
  if (stoppedVMs.length === 0) {
    console.log('No stopped VMs to start')
    return
  }
  
  console.log(`Found ${stoppedVMs.length} stopped VMs`)
  
  if (options.dryRun) {
    console.log('\nDry run - would execute:')
    stoppedVMs.forEach(line => {
      const [name, rg] = line.split('\t')
      console.log(`  az vm start -g ${rg} -n ${name}`)
    })
    return
  }
  
  const parallel = options.parallel || 3
  const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] }
  
  for (let i = 0; i < stoppedVMs.length; i += parallel) {
    const batch = stoppedVMs.slice(i, i + parallel)
    
    for (const line of batch) {
      const [name, rg] = line.split('\t')
      const command = `az vm start -g ${rg} -n ${name} --no-wait`
      
      const result = await executeAzureCLI(command, 120000)
      
      if (result.success) {
        results.success++
        console.log(`✓ Started ${name} in ${result.duration}ms`)
      } else {
        results.failed++
        results.errors.push(`${name}: ${result.error}`)
        console.error(`✗ Failed to start ${name}: ${result.error}`)
      }
    }
  }
  
  console.log(`\nCompleted: ${results.success} successful, ${results.failed} failed`)
}

async function stopVMs(options: CommandOptions) {
  console.log('Stopping all VMs...')
  
  // Similar implementation to startVMs but with 'az vm stop'
  console.log('Command not implemented yet')
}

async function restartVMs(options: CommandOptions) {
  console.log('Restarting all VMs...')
  
  // Similar implementation
  console.log('Command not implemented yet')
}

async function deallocateVMs(options: CommandOptions) {
  console.log('Deallocating all VMs...')
  
  // Similar implementation with 'az vm deallocate'
  console.log('Command not implemented yet')
}

async function customCommand(options: CommandOptions) {
  if (!options.command) {
    console.error('Custom command requires --command option')
    showUsage()
    return
  }
  
  console.log('Executing custom command on all VMs...')
  console.log(`Command: ${options.command}`)
  console.log('Variables: {resourceGroup}, {vm}, {location}')
  console.log('\nDry run:', options.dryRun ? 'enabled' : 'disabled')
  
  // Implementation similar to other batch operations
  console.log('Command not implemented yet')
}

async function getNetworkConfigs(options: CommandOptions) {
  console.log('Getting network configurations for all VMs...')
  console.log('Command not implemented yet')
}

async function getDiskInfo(options: CommandOptions) {
  console.log('Getting disk information for all VMs...')
  console.log('Command not implemented yet')
}

async function getTags(options: CommandOptions) {
  console.log('Getting tags for all VMs...')
  console.log('Command not implemented yet')
}

function showUsage() {
  console.log(`
Azure VM Batch Operations CLI

Usage: node scripts/azure-batch-operations.ts [command] [options]

Commands:
  list        List all VMs in the subscription
  ssh-keys    Get SSH keys for all Linux VMs
  start       Start all stopped VMs
  stop        Stop all running VMs
  restart     Restart all VMs
  deallocate  Deallocate all VMs
  custom      Execute custom Azure CLI command on all VMs
  network     Get network configuration for all VMs
  disks       Get disk information for all VMs
  tags        Get tags for all VMs

Options:
  -g, --resource-group <name>    Filter by resource group
  -l, --location <location>        Filter by Azure region
  -s, --status <status>            Filter by VM status
  -p, --parallel <number>         Number of parallel operations (default: 5)
  -d, --dry-run                    Show what would be executed without running
  -c, --command <command>          Custom Azure CLI command
  -t, --tags <tags>                Tags to set (key=value format)

Examples:
  # List all VMs
  node scripts/azure-batch-operations.ts list

  # List VMs in specific resource group
  node scripts/azure-batch-operations.ts list -g my-resource-group

  # Get SSH keys for all VMs (your use case)
  node scripts/azure-batch-operations.ts ssh-keys

  # Start all VMs in a resource group
  node scripts/azure-batch-operations.ts start -g my-resource-group

  # Get SSH keys with location filter
  node scripts/azure-batch-operations.ts ssh-keys -l eastus2

  # Dry run a custom command on all VMs
  node scripts/azure-batch-operations.ts custom -c "az vm show -g {resourceGroup} -n {vm}" --dry-run

  # Execute with high parallelism
  node scripts/azure-batch-operations.ts start -p 10
  `)
}

// Run main function
main()
