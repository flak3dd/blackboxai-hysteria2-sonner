"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  XCircle,
  Info,
  Settings,
  TrendingUp,
  Clock,
  Cpu,
} from "lucide-react"

type ProviderHealth = {
  name: string
  model: string
  priority: number
  enabled: boolean
  health: string
  circuitBreaker: string
  available: boolean
  error: string | null
  totalCalls: number
  failureRate: string
  lastFailure: string | null
}

type ProviderHealthResponse = {
  success: boolean
  providers: Record<string, ProviderHealth>
  summary: {
    total: number
    healthy: number
    unhealthy: number
  }
  timestamp: string
}

export function AIProviderHealthView() {
  const [healthData, setHealthData] = useState<ProviderHealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadHealth = async () => {
    try {
      const res = await fetch("/api/admin/automation/ai/providers/health", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setHealthData(data)
    } catch (err) {
      toast.error("Failed to load provider health", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetProvider = async (provider: string) => {
    try {
      const res = await fetch("/api/admin/automation/ai/providers/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(`Reset ${provider} provider state`)
      await loadHealth()
    } catch (err) {
      toast.error("Failed to reset provider", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  useEffect(() => {
    loadHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadHealth()
    setRefreshing(false)
  }

  const getHealthIcon = (health: string, available: boolean) => {
    if (!available) return <XCircle className="h-4 w-4 text-muted-foreground" />
    if (health === "healthy") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    if (health === "degraded") return <AlertTriangle className="h-4 w-4 text-amber-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case "closed": return "bg-emerald-500"
      case "half-open": return "bg-amber-500"
      case "open": return "bg-red-500"
      default: return "bg-zinc-500"
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-lg">AI Provider Health</h2>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of AI provider status and circuit breakers
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

      {/* Summary Cards */}
      {healthData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthData.summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {healthData.summary.healthy}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Unhealthy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {healthData.summary.unhealthy}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {new Date(healthData.timestamp).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Provider Cards */}
      {healthData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(healthData.providers).map(([name, provider]) => (
            <Card key={name} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getHealthIcon(provider.health, provider.available)}
                    <CardTitle className="text-sm font-medium capitalize">
                      {name}
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs"
                  >
                    Priority {provider.priority}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {provider.model}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge
                    variant={provider.available ? "default" : "secondary"}
                    className={
                      provider.available && provider.health === "healthy"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : ""
                    }
                  >
                    {provider.available ? provider.health : "unavailable"}
                  </Badge>
                </div>

                {/* Circuit Breaker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Circuit Breaker</span>
                    <div
                      className={`h-2 w-2 rounded-full ${getCircuitBreakerColor(
                        provider.circuitBreaker
                      )}`}
                    />
                  </div>
                  <Progress
                    value={
                      provider.circuitBreaker === "closed"
                        ? 100
                        : provider.circuitBreaker === "half-open"
                          ? 50
                          : 0
                    }
                    className="h-1"
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Calls</span>
                    <div className="font-medium">{provider.totalCalls}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fail Rate</span>
                    <div
                      className={`font-medium ${
                        parseFloat(provider.failureRate) > 50 ? "text-red-500" : ""
                      }`}
                    >
                      {provider.failureRate}
                    </div>
                  </div>
                </div>

                {/* Error */}
                {provider.error && (
                  <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-300">
                        {provider.error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Last Failure */}
                {provider.lastFailure && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Last failure:{" "}
                      {new Date(provider.lastFailure).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Reset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => resetProvider(name)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset State
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}