"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Play,
  Square,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Terminal,
  Network,
  Clock,
  Cpu,
  HardDrive,
} from "lucide-react"

type ServerStatus = {
  running: boolean
  uptime?: number
  version?: string
  listen?: string
  connections?: number
  memory?: {
    used: number
    total: number
  }
  cpu?: number
  error?: string
}

type ServerTraffic = {
  bytesIn: number
  bytesOut: number
  connections: number
}

export function ServerManagementView() {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [traffic, setTraffic] = useState<ServerTraffic | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/admin/operations/server/status", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStatus(data.status || null)
    } catch (err) {
      toast.error("Failed to load server status", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTraffic = async () => {
    try {
      const res = await fetch("/api/admin/operations/server/traffic", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTraffic(data.traffic || null)
    } catch (err) {
      console.error("Failed to load traffic:", err)
    }
  }

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/admin/operations/server/logs", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err) {
      console.error("Failed to load logs:", err)
    }
  }

  const startServer = async () => {
    setActionLoading("start")
    try {
      const res = await fetch("/api/admin/operations/server/start", { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("Server started successfully")
      await loadStatus()
    } catch (err) {
      toast.error("Failed to start server", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const stopServer = async () => {
    setActionLoading("stop")
    try {
      const res = await fetch("/api/admin/operations/server/stop", { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("Server stopped successfully")
      await loadStatus()
    } catch (err) {
      toast.error("Failed to stop server", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const restartServer = async () => {
    setActionLoading("restart")
    try {
      const res = await fetch("/api/admin/operations/server/restart", { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("Server restarted successfully")
      await loadStatus()
    } catch (err) {
      toast.error("Failed to restart server", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    loadStatus()
    loadTraffic()
    loadLogs()

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      loadStatus()
      loadTraffic()
    }, 5000)
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

  if (loading) {
    return <div className="p-6">Loading server status...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-heading-lg">Server Management</h2>
        <p className="text-sm text-muted-foreground">
          Control and monitor your Hysteria2 server
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Server Status
              </CardTitle>
              <CardDescription>
                Real-time server status and metrics
              </CardDescription>
            </div>
            <Badge
              variant={status?.running ? "default" : "secondary"}
              className={
                status?.running
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
              }
            >
              {status?.running ? "Running" : "Stopped"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Uptime */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Uptime
              </div>
              <div className="text-2xl font-bold">
                {status?.uptime ? formatUptime(status.uptime) : "N/A"}
              </div>
            </div>

            {/* Connections */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Network className="h-4 w-4" />
                Connections
              </div>
              <div className="text-2xl font-bold">
                {status?.connections ?? 0}
              </div>
            </div>

            {/* CPU */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cpu className="h-4 w-4" />
                CPU
              </div>
              <div className="text-2xl font-bold">
                {status?.cpu ? `${status.cpu.toFixed(1)}%` : "N/A"}
              </div>
            </div>

            {/* Memory */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                Memory
              </div>
              <div className="text-2xl font-bold">
                {status?.memory
                  ? `${((status.memory.used / status.memory.total) * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
            </div>
          </div>

          {/* Version and Listen */}
          {status && (
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
              {status.version && (
                <div>
                  <span className="font-medium">Version:</span> {status.version}
                </div>
              )}
              {status.listen && (
                <div>
                  <span className="font-medium">Listen:</span> {status.listen}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic Card */}
      {traffic && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Traffic Statistics
            </CardTitle>
            <CardDescription>
              Network traffic and connection metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Bytes In</div>
                <div className="text-2xl font-bold">
                  {formatBytes(traffic.bytesIn)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Bytes Out</div>
                <div className="text-2xl font-bold">
                  {formatBytes(traffic.bytesOut)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Total Connections</div>
                <div className="text-2xl font-bold">
                  {traffic.connections}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Server Controls
          </CardTitle>
          <CardDescription>
            Start, stop, or restart the server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              onClick={startServer}
              disabled={actionLoading !== null || status?.running}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {actionLoading === "start" ? "Starting..." : "Start"}
            </Button>
            <Button
              onClick={stopServer}
              disabled={actionLoading !== null || !status?.running}
              variant="destructive"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              {actionLoading === "stop" ? "Stopping..." : "Stop"}
            </Button>
            <Button
              onClick={restartServer}
              disabled={actionLoading !== null}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${actionLoading === "restart" ? "animate-spin" : ""}`} />
              {actionLoading === "restart" ? "Restarting..." : "Restart"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Recent Logs
            </CardTitle>
            <CardDescription>
              Latest server log entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-4 font-mono text-xs">
              {logs.slice(-20).map((log, i) => (
                <div key={i} className="mb-1 text-muted-foreground">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}