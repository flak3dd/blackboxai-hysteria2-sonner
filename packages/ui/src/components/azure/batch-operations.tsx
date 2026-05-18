/**
 * Azure VM Batch Operations UI
 * 
 * User interface for managing Azure VMs at scale:
 * - List all VMs across subscription
 * - Execute batch operations (start, stop, restart, etc.)
 * - Query SSH keys for all VMs (user's specific use case)
 * - Custom command execution
 * - Batch tag management
 * - Real-time operation progress
 */

"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Server, 
  Play, 
  Square, 
  RefreshCw, 
  Command, 
  Tag,
  Key,
  Network,
  HardDrive,
  Activity,
  CheckCircle,
  XCircle,
  Loader
} from "lucide-react"

interface AzureVM {
  name: string
  resourceGroup: string
  location: string
  status: string
  size: string
  sshKeys?: string[]
  osType: 'Linux' | 'Windows'
}

interface BatchOperationResult {
  vm: string
  resourceGroup: string
  success: boolean
  output?: string
  error?: string
  duration?: number
}

export function AzureBatchOperations() {
  const [vms, setVMs] = useState<AzureVM[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVMs, setSelectedVMs] = useState<Set<string>>(new Set())
  const [operationInProgress, setOperationInProgress] = useState(false)
  const [operationResults, setOperationResults] = useState<BatchOperationResult[]>([])
  const [sshKeys, setSshKeys] = useState<Record<string, string[]>>({})
  const [networkConfigs, setNetworkConfigs] = useState<Record<string, any>>({})
  const [diskInfo, setDiskInfo] = useState<Record<string, any>>({})
  const [vmTags, setVMTags] = useState<Record<string, any>>({})
  
  // Filter options
  const [resourceGroupFilter, setResourceGroupFilter] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  
  // Custom command
  const [customCommand, setCustomCommand] = useState("")
  const [parallelLimit, setParallelLimit] = useState("5")
  const [dryRun, setDryRun] = useState(false)

  // Load VMs
  const loadVMs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (resourceGroupFilter) params.append('resourceGroup', resourceGroupFilter)
      if (locationFilter) params.append('location', locationFilter)
      
      const response = await fetch(`/api/admin/azure/batch/vms?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load VMs')
      
      const data = await response.json()
      setVMs(data.vms)
    } catch (error) {
      toast.error('Failed to load VMs', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Load SSH keys for all VMs
  const loadSSHKs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ operation: 'ssh-keys' })
      if (resourceGroupFilter) params.append('resourceGroup', resourceGroupFilter)
      if (locationFilter) params.append('location', locationFilter)
      
      const response = await fetch(`/api/admin/azure/batch/vms?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load SSH keys')
      
      const data = await response.json()
      setSshKeys(data.sshKeys)
      
      toast.success(`Loaded SSH keys for ${data.count} Linux VMs`)
    } catch (error) {
      toast.error('Failed to load SSH keys', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Load network configs
  const loadNetworkConfigs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ operation: 'network' })
      if (resourceGroupFilter) params.append('resourceGroup', resourceGroupFilter)
      if (locationFilter) params.append('location', locationFilter)
      
      const response = await fetch(`/api/admin/azure/batch/vms?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load network configs')
      
      const data = await response.json()
      setNetworkConfigs(data.networkConfigs)
      
      toast.success(`Loaded network configs for ${data.count} VMs`)
    } catch (error) {
      toast.error('Failed to load network configs', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Execute batch operation
  const executeBatchOperation = async (operation: string) => {
    setOperationInProgress(true)
    setOperationResults([])
    
    try {
      const response = await fetch('/api/admin/azure/batch/vms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          resourceGroup: resourceGroupFilter || undefined,
          location: locationFilter || undefined,
          status: statusFilter || undefined,
          parallel: parseInt(parallelLimit),
          dryRun,
          command: customCommand
        })
      })
      
      if (!response.ok) {
        throw new Error('Batch operation failed')
      }
      
      const data = await response.json()
      setOperationResults(data.results)
      
      // Show summary
      toast.success(data.summary.summary)
      
      // Show failures if any
      if (data.summary.failed > 0) {
        data.summary.failures.forEach((failure: any) => {
          toast.error(`${failure.vm} failed`, {
            description: failure.error
          })
        })
      }
      
      // Reload VMs after operation
      setTimeout(loadVMs, 2000)
    } catch (error) {
      toast.error('Batch operation failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setOperationInProgress(false)
    }
  }

  // Toggle VM selection
  const toggleVMSelection = (vmId: string) => {
    const newSelection = new Set(selectedVMs)
    if (newSelection.has(vmId)) {
      newSelection.delete(vmId)
    } else {
      newSelection.add(vmId)
    }
    setSelectedVMs(newSelection)
  }

  // Select/deselect all
  const selectAllVMs = () => {
    setSelectedVMs(new Set(vms.map(vm => `${vm.resourceGroup}/${vm.name}`)))
  }

  const clearSelection = () => {
    setSelectedVMs(new Set())
  }

  // Get unique resource groups and locations from VMs
  const resourceGroups = Array.from(new Set(vms.map(vm => vm.resourceGroup)))
  const locations = Array.from(new Set(vms.map(vm => vm.location)))
  const statuses = Array.from(new Set(vms.map(vm => vm.status)))

  // Calculate stats
  const stats = {
    total: vms.length,
    running: vms.filter(vm => vm.status === 'running').length,
    stopped: vms.filter(vm => vm.status === 'stopped').length,
    linux: vms.filter(vm => vm.osType === 'Linux').length,
    windows: vms.filter(vm => vm.osType === 'Windows').length
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Azure VM Batch Operations</h1>
          <p className="text-muted-foreground">
            Execute commands across all Azure VMs in your subscription
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadVMs} disabled={loading}>
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total VMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.running}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stopped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.stopped}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Linux</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.linux}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Windows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.windows}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Resource Group</Label>
            <Select value={resourceGroupFilter} onValueChange={setResourceGroupFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All resource groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All resource groups</SelectItem>
                {resourceGroups.map(rg => (
                  <SelectItem key={rg} value={rg}>{rg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Actions</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllVMs}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VM List */}
      <Card>
        <CardHeader>
          <CardTitle>Virtual Machines ({vms.length})</CardTitle>
          <CardDescription>
            {selectedVMs.size > 0 && `${selectedVMs.size} VMs selected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {vms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No VMs found. Check Azure CLI authentication.
              </div>
            ) : (
              vms.map(vm => (
                <div 
                  key={`${vm.resourceGroup}/${vm.name}`}
                  className={`p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors ${selectedVMs.has(`${vm.resourceGroup}/${vm.name}`) ? 'bg-muted border-primary' : ''}`}
                  onClick={() => toggleVMSelection(`${vm.resourceGroup}/${vm.name}`)}
                >
                  <div className="flex items-center gap-4">
                    <input 
                      type="checkbox"
                      checked={selectedVMs.has(`${vm.resourceGroup}/${vm.name}`)}
                      onChange={() => toggleVMSelection(`${vm.resourceGroup}/${vm.name}`)}
                      className="h-4 w-4"
                    />
                    <Server className={`h-5 w-5 ${vm.osType === 'Linux' ? 'text-orange-500' : 'text-blue-500'}`} />
                    <div>
                      <div className="font-medium">{vm.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {vm.resourceGroup} • {vm.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={vm.status === 'running' ? 'default' : 'secondary'}>
                      {vm.status}
                    </Badge>
                    <Badge variant="outline">{vm.size}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Operation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Operations</CardTitle>
          <CardDescription>
            Execute operations on multiple VMs simultaneously
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="lifecycle">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
              <TabsTrigger value="query">Query</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lifecycle" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => executeBatchOperation('start')}
                  disabled={operationInProgress || vms.length === 0}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start All
                </Button>
                
                <Button
                  onClick={() => executeBatchOperation('stop')}
                  disabled={operationInProgress || vms.length === 0}
                  variant="secondary"
                  className="w-full"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop All
                </Button>
                
                <Button
                  onClick={() => executeBatchOperation('restart')}
                  disabled={operationInProgress || vms.length === 0}
                  variant="secondary"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart All
                </Button>
                
                <Button
                  onClick={() => executeBatchOperation('deallocate')}
                  disabled={operationInProgress || vms.length === 0}
                  variant="destructive"
                  className="w-full"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Deallocate All
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="query" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={loadSSHKs}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Key className="h-4 w-4 mr-2" />
                  SSH Keys
                </Button>
                
                <Button
                  onClick={loadNetworkConfigs}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Network className="h-4 w-4 mr-2" />
                  Network Config
                </Button>
                
                <Button
                  onClick={loadNetworkConfigs}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  Disk Info
                </Button>
                
                <Button
                  onClick={() => {/* Load tags */}}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </Button>
              </div>
              
              {/* Query Results */}
              {Object.keys(sshKeys).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">SSH Keys</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(sshKeys).map(([vmId, keys]) => (
                      <div key={vmId} className="text-sm">
                        <div className="font-medium">{vmId}</div>
                        <div className="text-muted-foreground text-xs font-mono">
                          {keys.length > 0 ? keys.join(', ') : 'No SSH keys'}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Azure CLI Command Template</Label>
                  <Textarea
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    placeholder="az vm show -g {resourceGroup} -n {vm} --query &quot;...&quot; -o json"
                    rows={3}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available variables: {`{resourceGroup}`}, `{vm}`, `{location}`
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Parallel Execution</Label>
                    <Input
                      type="number"
                      value={parallelLimit}
                      onChange={(e) => setParallelLimit(e.target.value)}
                      min="1"
                      max="50"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="dryRun"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="dryRun" className="text-sm">Dry Run</Label>
                  </div>
                </div>
                
                <Button
                  onClick={() => executeBatchOperation('custom')}
                  disabled={operationInProgress || !customCommand.trim()}
                  className="w-full"
                >
                  <Command className="h-4 w-4 mr-2" />
                  Execute Custom Command
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="tags" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tags (key=value format)</Label>
                  <Textarea
                    placeholder="environment=production&#10;team=operations&#10;owner=admin"
                    rows={3}
                  />
                </div>
                
                <Button
                  onClick={() => executeBatchOperation('update-tags')}
                  disabled={operationInProgress}
                  className="w-full"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Update Tags on All VMs
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Operation Results */}
      {operationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operation Results</CardTitle>
            <CardDescription>
              {operationResults.filter(r => r.success).length} successful, {operationResults.filter(r => !r.success).length} failed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {operationResults.map((result, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg flex items-start gap-3 ${result.success ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}
                >
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {result.resourceGroup}/{result.vm}
                    </div>
                    {result.error && (
                      <div className="text-sm text-red-600 mt-1 font-mono">
                        {result.error}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(result.duration || 0) / 1000}s
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
