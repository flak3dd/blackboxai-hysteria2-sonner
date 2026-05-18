"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  Clock,
  MapPin,
  User,
  Terminal,
  Folder,
  File,
  RefreshCw,
  Play,
  Square,
  Trash2,
  Upload,
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Eye,
} from "lucide-react"

type ImplantStatus = "active" | "inactive" | "compromised" | "exited"

type Implant = {
  id: string
  implantId: string
  name: string
  type: string
  architecture: string
  hostname: string
  username: string
  domain?: string
  internalIp: string
  externalIp: string
  status: ImplantStatus
  lastSeen: number
  firstSeen: number
  osVersion: string
  integrity: string
  privileges: string[]
  processes: number
  uptime: number
}

type FileSystemItem = {
  name: string
  path: string
  size: number
  isDirectory: boolean
  modified: number
  permissions: string
}

type Process = {
  pid: number
  name: string
  cpu: number
  memory: number
  user: string
  command: string
}

export function EnhancedImplantsView() {
  const [implants, setImplants] = useState<Implant[]>([])
  const [selectedImplant, setSelectedImplant] = useState<Implant | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fileSystem, setFileSystem] = useState<FileSystemItem[]>([])
  const [currentPath, setCurrentPath] = useState("/")
  const [processes, setProcesses] = useState<Process[]>([])

  const loadImplants = async () => {
    try {
      const res = await fetch("/api/admin/security/implants", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setImplants(data.implants || [])
    } catch (err) {
      toast.error("Failed to load implants", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadFileSystem = async (implantId: string, path: string) => {
    try {
      const res = await fetch(`/api/admin/security/implants/${implantId}/filesystem?path=${encodeURIComponent(path)}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFileSystem(data.files || [])
    } catch (err) {
      toast.error("Failed to load file system", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  const loadProcesses = async (implantId: string) => {
    try {
      const res = await fetch(`/api/admin/security/implants/${implantId}/processes`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProcesses(data.processes || [])
    } catch (err) {
      toast.error("Failed to load processes", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadImplants()
    if (selectedImplant) {
      await loadFileSystem(selectedImplant.id, currentPath)
      await loadProcesses(selectedImplant.id)
    }
    setRefreshing(false)
  }

  const handleImplantSelect = async (implant: Implant) => {
    setSelectedImplant(implant)
    setCurrentPath("/")
    await loadFileSystem(implant.id, "/")
    await loadProcesses(implant.id)
  }

  const handleDirectoryClick = async (item: FileSystemItem) => {
    if (item.isDirectory) {
      const newPath = currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`
      setCurrentPath(newPath)
      if (selectedImplant) {
        await loadFileSystem(selectedImplant.id, newPath)
      }
    }
  }

  const killProcess = async (pid: number) => {
    if (!selectedImplant) return
    try {
      const res = await fetch(`/api/admin/security/implants/${selectedImplant.id}/processes/${pid}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(`Process ${pid} terminated`)
      await loadProcesses(selectedImplant.id)
    } catch (err) {
      toast.error("Failed to terminate process", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  useEffect(() => {
    loadImplants()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadImplants, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getStatusColor = (status: ImplantStatus) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      case "inactive":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
      case "compromised":
        return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
      case "exited":
        return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-lg">Enhanced Implant Management</h2>
          <p className="text-sm text-muted-foreground">
            Real-time implant monitoring with file browser and process manipulation
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Implant List */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Implants ({implants.length})
            </CardTitle>
            <CardDescription>
              Select an implant to view details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {implants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active implants
                  </div>
                ) : (
                  implants.map((implant) => (
                    <Card
                      key={implant.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedImplant?.id === implant.id
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => handleImplantSelect(implant)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-sm">{implant.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {implant.hostname}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={getStatusColor(implant.status)}
                          >
                            {implant.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {implant.username}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {implant.internalIp}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatUptime(implant.uptime)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {implant.processes} proc
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Implant Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              {selectedImplant ? selectedImplant.name : "Implant Details"}
            </CardTitle>
            <CardDescription>
              {selectedImplant
                ? `${selectedImplant.hostname} - ${selectedImplant.osVersion}`
                : "Select an implant to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedImplant ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="filesystem">File Browser</TabsTrigger>
                  <TabsTrigger value="processes">Processes</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {/* System Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">System Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hostname</span>
                          <span className="font-medium">{selectedImplant.hostname}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Username</span>
                          <span className="font-medium">{selectedImplant.username}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Domain</span>
                          <span className="font-medium">{selectedImplant.domain || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">OS Version</span>
                          <span className="font-medium">{selectedImplant.osVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Architecture</span>
                          <span className="font-medium">{selectedImplant.architecture}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Integrity</span>
                          <span className="font-medium">{selectedImplant.integrity}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Network Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Internal IP</span>
                          <span className="font-medium">{selectedImplant.internalIp}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">External IP</span>
                          <span className="font-medium">{selectedImplant.externalIp}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Uptime</span>
                          <span className="font-medium">{formatUptime(selectedImplant.uptime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Seen</span>
                          <span className="font-medium">
                            {new Date(selectedImplant.lastSeen).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Privileges */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Privileges
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedImplant.privileges.map((priv) => (
                          <Badge key={priv} variant="secondary">
                            {priv}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="filesystem" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentPath}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/"
                        setCurrentPath(parentPath)
                        if (selectedImplant) {
                          loadFileSystem(selectedImplant.id, parentPath)
                        }
                      }}
                    >
                      Up
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px] rounded-md border">
                    <div className="p-2">
                      {fileSystem.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No files in this directory
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {fileSystem.map((item) => (
                            <div
                              key={item.path}
                              className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer ${
                                item.isDirectory ? "font-medium" : ""
                              }`}
                              onClick={() => handleDirectoryClick(item)}
                            >
                              {item.isDirectory ? (
                                <Folder className="h-4 w-4 text-blue-500" />
                              ) : (
                                <File className="h-4 w-4 text-zinc-500" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="truncate text-sm">{item.name}</div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatBytes(item.size)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.permissions}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="processes" className="space-y-4">
                  <ScrollArea className="h-[500px] rounded-md border">
                    <div className="p-2">
                      {processes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No processes found
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {processes.map((process) => (
                            <div
                              key={process.pid}
                              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                            >
                              <div className="font-mono text-sm w-16">{process.pid}</div>
                              <div className="flex-1 min-w-0">
                                <div className="truncate text-sm font-medium">{process.name}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {process.command}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground w-12 text-right">
                                {process.cpu.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground w-12 text-right">
                                {process.memory.toFixed(1)}%
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => killProcess(process.pid)}
                                className="h-8 w-8 p-0"
                              >
                                <Square className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tasks">
                  <div className="text-center py-12 text-muted-foreground">
                    Task management coming soon
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Select an implant to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}