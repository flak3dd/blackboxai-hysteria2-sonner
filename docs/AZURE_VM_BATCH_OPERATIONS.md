# Azure VM Batch Operations Management

## Overview

Comprehensive batch operations management for Azure Virtual Machines across your entire Azure subscription. This system provides both a web UI and CLI tool for executing operations at scale across hundreds of VMs simultaneously.

## Features

### Web UI (`/admin/azure/batch`)
- **Real-time VM inventory**: List all VMs across subscription with filtering
- **Batch lifecycle operations**: Start, stop, restart, deallocate all VMs
- **SSH key auditing**: Query SSH keys for all Linux VMs (your specific use case)
- **Network configuration**: View network configs, IP addresses, NSG rules
- **Disk information**: Get disk size, type, and storage account details
- **Tag management**: Add/update/remove tags across all VMs
- **Custom commands**: Execute any Azure CLI command on all VMs
- **Parallel execution**: Control concurrent operation limit
- **Dry-run mode**: Preview operations before execution
- **Real-time results**: Track operation progress and results

### CLI Tool (`scripts/azure-batch-operations.ts`)
- Command-line interface for batch operations
- Perfect for automation and CI/CD pipelines
- Same functionality as web UI
- Programmatic output for scripts

## Installation

No additional dependencies required. The system uses existing Azure CLI integration.

**Prerequisites:**
- Azure CLI installed and authenticated (`az login`)
- Azure Resource Manager API access
- Appropriate IAM permissions on Azure resources

## Web UI Usage

### Access the Interface
Navigate to `/admin/azure/batch` in your web application.

### Basic Workflow

1. **Load VMs**: Click "Refresh" to load all VMs from your subscription
2. **Filter VMs**: Use filters to narrow down to specific resource groups, locations, or statuses
3. **Select VMs**: Click on VMs to select them for operations (or use "Select All")
4. **Choose Operation**: Select operation type from tabs
5. **Execute**: Click the operation button to execute
6. **Monitor Results**: View real-time operation results in the results section

### Operation Types

#### 1. Lifecycle Operations
- **Start All**: Start all stopped VMs
- **Stop All**: Stop all running VMs
- **Restart All**: Restart all running VMs
- **Deallocate All**: Deallocate VMs (stop and release resources)

#### 2. Query Operations
- **SSH Keys**: Query SSH public keys for all Linux VMs
  - Uses command: `az vm show -g {resourceGroup} -n {vm} --query "osProfile.linuxConfiguration.ssh.publicKeys" -o json`
- **Network Config**: Get IP addresses, subnets, NSG rules
- **Disk Info**: Get disk size, type (Standard/Premium), storage account
- **Tags**: View all tags assigned to VMs

#### 3. Custom Commands
Execute any Azure CLI command on all VMs using template variables:

```
az vm show -g {resourceGroup} -n {vm} --query "..." -o json
```

**Available variables:**
- `{resourceGroup}` - VM's resource group name
- `{vm}` - VM name
- `{location}` - Azure region

**Options:**
- **Parallel Execution**: Number of concurrent operations (1-50)
- **Dry Run**: Show what would be executed without running

#### 4. Tag Management
Add or update tags across all VMs:
- Tags in `key=value` format
- One tag per line
- Example:
  ```
  environment=production
  team=operations
  owner=admin
  ```

## CLI Tool Usage

### Basic Commands

```bash
# List all VMs
node scripts/azure-batch-operations.ts list

# List VMs in specific resource group
node scripts/azure-batch-operations.ts list -g my-resource-group

# Get SSH keys for all Linux VMs (your use case)
node scripts/azure-batch-operations.ts ssh-keys

# Get SSH keys with filters
node scripts/azure-batch-operations.ts ssh-keys -g my-resource-group -l eastus2

# Start all stopped VMs
node scripts/azure-batch-operations.ts start

# Start VMs in specific resource group
node scripts/azure-batch-operations.ts start -g my-resource-group

# Stop all running VMs
node scripts/azure-batch-operations.ts stop

# Restart all VMs
node scripts/azure-batch-operations.ts restart

# Deallocate all VMs
node scripts/azure-batch-operations.ts deallocate

# Execute custom command on all VMs
node scripts/azure-batch-operations.ts custom -c "az vm show -g {resourceGroup} -n {vm} --query 'hardwareProfile.vmSize' -o json"

# Dry run custom command
node scripts/azure-batch-operations.ts custom -c "az vm show -g {resourceGroup} -n {vm}" --dry-run

# High parallelism for faster execution
node scripts/azure-batch-operations.ts start -p 10
```

### CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--resource-group <name>` | `-g` | Filter by resource group |
| `--location <location>` | `-l` | Filter by Azure region |
| `--status <status>` | `-s` | Filter by VM status |
| `--parallel <number>` | `-p` | Number of parallel operations (default: 5) |
| `--dry-run` | `-d` | Show what would be executed without running |
| `--command <command>` | `-c` | Custom Azure CLI command for custom operation |
| `--tags <tags>` | `-t` | Tags to set (key=value format) |

## API Endpoint

### Endpoint
`POST /api/admin/azure/batch/vms`

### Request Body
```json
{
  "operation": "start|stop|restart|deallocate|ssh-keys|network|disks|tags|custom",
  "resourceGroup": "optional resource group filter",
  "location": "optional location filter",
  "status": "optional status filter",
  "parallel": 5,
  "dryRun": false,
  "command": "optional custom command template",
  "tags": "optional tags in key=value format"
}
```

### Response
```json
{
  "summary": {
    "total": 10,
    "successful": 8,
    "failed": 2,
    "summary": "Started 8 VMs successfully, 2 failed",
    "failures": [
      {
        "vm": "vm-1",
        "error": "error message"
      }
    ]
  },
  "results": [
    {
      "vm": "vm-name",
      "resourceGroup": "resource-group",
      "success": true,
      "output": "...",
      "duration": 1234
    }
  ]
}
```

## Your Use Case: SSH Keys Query

### From Web UI
1. Navigate to `/admin/azure/batch`
2. Click "Refresh" to load VMs
3. Go to "Query" tab
4. Click "SSH Keys" button
5. Results show SSH public keys for all Linux VMs

### From CLI
```bash
node scripts/azure-batch-operations.ts ssh-keys

# With filters
node scripts/azure-batch-operations.ts ssh-keys -g my-resource-group -l eastus2
```

### Programmatic Usage
```bash
# From your shell script
VM_SSH_KEYS=$(node scripts/azure-batch-operations.ts ssh-keys -g my-rg)
echo "$VM_SSH_KEYS"
```

### Example Output
```
Found 15 Linux VMs with SSH keys

web-server-01 (production-rg)
  SSH Keys: ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..., admin@workstation

api-server-01 (production-rg)
  SSH Keys: ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..., admin@workstation, ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..., deploy@ci

database-server-01 (database-rg)
  SSH Keys: None
```

## Architecture

### Components

1. **`lib/azure/batch-vm-operations.ts`**
   - Core batch operations logic
   - Parallel execution with limits
   - Azure CLI command execution
   - Timeout handling
   - Result aggregation

2. **`app/api/admin/azure/batch/vms/route.ts`**
   - Next.js API endpoint
   - Request validation
   - Operation routing
   - Response formatting

3. **`components/azure/batch-operations.tsx`**
   - React UI component
   - VM listing and filtering
   - Operation controls
   - Real-time results display
   - Progress tracking

4. **`scripts/azure-batch-operations.ts`**
   - CLI tool implementation
   - Command parsing
   - Batch execution
   - Output formatting

### Data Flow

```
User Request (Web UI or CLI)
    ↓
API Endpoint or CLI Entry Point
    ↓
Batch VM Operations Library
    ↓
Azure CLI (parallel execution)
    ↓
Azure REST API
    ↓
Results Aggregation
    ↓
Response to User
```

## Best Practices

### 1. Parallel Execution
- Start with low parallelism (3-5)
- Increase gradually based on network and API limits
- Monitor for rate limiting errors

### 2. Operation Safety
- Always use dry-run first for custom commands
- Filter to resource groups when possible
- Start with small batches to test
- Monitor operation results

### 3. Performance
- Use location filters to reduce API calls
- Cache results when possible
- Use parallel execution for independent operations

### 4. Error Handling
- Check results summary after each operation
- Re-run failed operations individually
- Check Azure CLI authentication before starting

### 5. Production Use
- Schedule during maintenance windows
- Use resource group filters to limit scope
- Enable logging for audit trails
- Monitor Azure costs for running VMs

## Troubleshooting

### Common Issues

**Issue: "Failed to load VMs"**
- Check Azure CLI authentication: `az login`
- Verify IAM permissions on Azure resources
- Check network connectivity to Azure API

**Issue: "Rate limit exceeded"**
- Reduce parallel execution limit
- Add delays between batches
- Use location filters to reduce API calls

**Issue: "Operation timeout"**
- Increase timeout in batch operations library
- Check for long-running operations
- Use `--no-wait` flag where possible

**Issue: "SSH keys query returns empty"**
- Ensure VMs are Linux-based
- Check if SSH keys were configured
- Verify Azure CLI query syntax

## Integration with Existing System

This batch operations system integrates with the existing Azure provider in `/lib/deploy/providers/azure.ts`:
- Uses existing Azure CLI execution utilities
- Follows same authentication patterns
- Compatible with existing Azure Resource Manager API integration
- Can be extended to work with existing deployment workflows

## Future Enhancements

- [ ] Add VM metrics collection (CPU, memory, disk)
- [ ] Implement VM creation batch operations
- [ ] Add snapshot management
- [ ] Implement backup/restore operations
- [ ] Add scheduled operations
- [ ] Implement operation history and audit log
- [ ] Add cost estimation
- [ ] Implement auto-scaling operations
- [ ] Add Azure Policy compliance checks
- [ ] Implement VM image management

## Security Considerations

- All operations require authentication via Azure CLI
- API endpoint respects application authentication
- Operations are logged for audit
- No secrets are stored in the application
- Use least-privilege IAM roles
- Validate all user inputs

## References

- [Azure CLI Documentation](https://docs.microsoft.com/cli/azure/)
- [Azure REST API](https://docs.microsoft.com/rest/api/azure/)
- [Azure VM Management](https://docs.microsoft.com/azure/virtual-machines/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## Support

For issues or questions:
1. Check Azure CLI logs with `--debug` flag
2. Verify Azure account permissions
3. Check application logs
4. Review Azure resource status in Azure Portal
