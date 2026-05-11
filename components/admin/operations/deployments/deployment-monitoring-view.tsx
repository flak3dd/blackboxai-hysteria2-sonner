"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Rocket,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Terminal,
  Server,
  Globe,
  Tag,
  Play,
  Square,
} from "lucide-react"

type DeploymentStep = {
  status: string
  message: string
  timestamp: number
  error: string | null
}

type Deployment = {
  id: string
  config: {
    provider: string
    region: string
    size: string
    name: string
    domain?: string
    port: number
    tags: string[]
  }
  status: string
  steps: DeploymentStep[]
  vpsId: string | null
  vpsIp: string | null
  nodeId: string | null
  createdAt: number
  updatedAt: number
}

export function DeploymentMonitoringView() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null)
  const [streamingLogs, setStreamingLogs] = useState<string[]>([])
  const [streaming, setStreaming] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadDeployments = async () => {
    try {
      const res = await fetch("/api/admin/deploy", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDeployments(data.deployments || [])
    } catch (err) {
      toast.error("Failed to load deployments", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const destroyDeployment = async (id: string) => {
    if (!confirm("Are you sure you want to destroy this deployment?")) return

    try {
      const res = await fetch(`/api/admin/deploy/${id}/destroy`, { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("Deployment destroyed successfully")
      await loadDeployments()
      if (selectedDeployment?.id === id) {
        setSelectedDeployment(null)
        setStreamingLogs([])
      }
    } catch (err) {
      toast.error("Failed to destroy deployment", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  const startStreaming = async (id: string) => {
    setStreaming(true)
    setStreamingLogs([])

    try {
      const res = await fetch(`/api/admin/deploy/${id}/stream`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter(line => line.trim())
        setStreamingLogs(prev => [...prev, ...lines])
      }
    } catch (err) {
      toast.error("Failed to stream logs", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setStreaming(false)
    }
  }

  const stopStreaming = () => {
    setStreaming(false)
  }

  useEffect(() => {
    loadDeployments()

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadDeployments, 10000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      case "failed":
      case "destroyed":
        return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
      case "destroying":
        return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30"
      default:
        return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "failed":
      case "destroyed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "destroying":
        return <Square className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-lg">Deployment Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Real-time deployment status and logs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setRefreshing(true)
            await loadDeployments()
            setRefreshing(false)
          }}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Deployments List */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Deployments Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Deployments ({deployments.length})
            </CardTitle>
            <CardDescription>
              Active and recent deployments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {deployments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No deployments found
                  </div>
                ) : (
                  deployments.map((deployment) => (
                    <Card
                      key={deployment.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedDeployment?.id === deployment.id
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => setSelectedDeployment(deployment)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(deployment.status)}
                            <h3 className="font-medium">{deployment.config.name}</h3>
                          </div>
                          <Badge
                            variant="outline"
                            className={getStatusColor(deployment.status)}
                          >
                            {deployment.status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Server className="h-3 w-3" />
                            <span>{deployment.config.provider} - {deployment.config.region}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3" />
                            <span>{deployment.config.size}</span>
                          </div>
                          {deployment.vpsIp && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-3 w-3" />
                              <span>{deployment.vpsIp}:{deployment.config.port}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>Created {formatDate(deployment.createdAt)}</span>
                          </div>
                        </div>

                        {deployment.config.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {deployment.config.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Deployment Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Deployment Details
            </CardTitle>
            <CardDescription>
              {selectedDeployment
                ? `Viewing ${selectedDeployment.config.name}`
                : "Select a deployment to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDeployment ? (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className={getStatusColor(selectedDeployment.status)}
                  >
                    {selectedDeployment.status}
                  </Badge>
                </div>

                <Separator />

                {/* Configuration */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Configuration</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Provider:</span>{" "}
                      {selectedDeployment.config.provider}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Region:</span>{" "}
                      {selectedDeployment.config.region}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span>{" "}
                      {selectedDeployment.config.size}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Port:</span>{" "}
                      {selectedDeployment.config.port}
                    </div>
                  </div>
                  {selectedDeployment.config.domain && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Domain:</span>{" "}
                      {selectedDeployment.config.domain}
                    </div>
                  )}
                </div>

                <Separator />

                {/* VPS Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">VPS Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">VPS ID:</span>{" "}
                      {selectedDeployment.vpsId || "N/A"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">IP:</span>{" "}
                      {selectedDeployment.vpsIp || "N/A"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Node ID:</span>{" "}
                      {selectedDeployment.nodeId || "N/A"}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Timeline */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Deployment Timeline</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {selectedDeployment.steps.map((step, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          {getStatusIcon(step.status)}
                          <div className="flex-1">
                            <div>{step.message}</div>
                            {step.error && (
                              <div className="text-red-500 text-xs mt-1">
                                {step.error}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {formatDate(step.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedDeployment.status !== "destroyed" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => destroyDeployment(selectedDeployment.id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Destroy
                    </Button>
                  )}
                  {selectedDeployment.status !== "completed" &&
                   selectedDeployment.status !== "failed" &&
                   selectedDeployment.status !== "destroyed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startStreaming(selectedDeployment.id)}
                      disabled={streaming}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Stream Logs
                    </Button>
                  )}
                  {streaming && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopStreaming}
                      className="gap-2"
                    >
                      <Square className="h-4 w-4" />
                      Stop
                    </Button>
                  )}
                </div>

                {/* Streaming Logs */}
                {streamingLogs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Live Logs</h4>
                    <ScrollArea className="h-[200px] rounded-md bg-muted/50 p-3 font-mono text-xs">
                      {streamingLogs.map((log, i) => (
                        <div key={i} className="mb-1 text-muted-foreground">
                          {log}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Select a deployment to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}