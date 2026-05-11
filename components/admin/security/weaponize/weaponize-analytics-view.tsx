"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  TrendingUp,
  Activity,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Crosshair,
  Zap,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Download,
  FileCode,
  Sword,
} from "lucide-react"

type WeaponizeAnalytics = {
  overview: {
    totalPayloads: number
    activeImplants: number
    lotlTools: number
    profiles: number
    totalExecutions: number
    successRate: number
  }
  payloads: {
    byType: Record<string, number>
    byStatus: Record<string, number>
    buildTime: {
      avg: number
      min: number
      max: number
    }
    usage: {
      mostUsed: string
      mostUsedCount: number
    }
  }
  implants: {
    byStatus: Record<string, number>
    byType: Record<string, number>
    byArchitecture: Record<string, number>
    avgUptime: number
    totalUptime: number
  }
  lotl: {
    byRisk: Record<string, number>
    byCategory: Record<string, number>
    totalExecutions: number
    highRiskUsage: number
  }
  profiles: {
    byType: Record<string, number>
    versions: {
      total: number
      avgVersions: number
    }
    templateUsage: Record<string, number>
  }
  timeline: Array<{
    date: string
    payloads: number
    implants: number
    executions: number
  }>
}

export function WeaponizeAnalyticsView() {
  const [analytics, setAnalytics] = useState<WeaponizeAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("7d")
  const [refreshing, setRefreshing] = useState(false)

  const loadAnalytics = async (selectedPeriod: string = period) => {
    try {
      const res = await fetch(`/api/admin/operations/overview?period=${selectedPeriod}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.analytics) {
        setAnalytics(data.analytics)
      } else {
        setAnalytics(null)
      }
    } catch (err) {
      toast.error("Failed to load analytics", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAnalytics(period)
    setRefreshing(false)
  }

  useEffect(() => {
    loadAnalytics(period)
  }, [period])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (loading) {
    return <div className="p-6">Loading analytics...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-lg">Weaponize Module Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive analytics for payloads, implants, LotL tools, and profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {analytics && (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Payloads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.totalPayloads}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Crosshair className="h-4 w-4" />
                  Implants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.activeImplants}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active implants
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  LotL Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.lotlTools}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available tools
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  Profiles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.profiles}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  C2 profiles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Executions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.totalExecutions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total executions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {analytics.overview.successRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Overall success
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Tabs defaultValue="payloads" className="space-y-4">
            <TabsList>
              <TabsTrigger value="payloads">Payloads</TabsTrigger>
              <TabsTrigger value="implants">Implants</TabsTrigger>
              <TabsTrigger value="lotl">LotL Tools</TabsTrigger>
              <TabsTrigger value="profiles">Profiles</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="payloads" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Payloads by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.payloads.byType).map(([type, count]) => (
                        <div key={type}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{type.replace(/_/g, " ")}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{
                                width: `${(count / analytics.overview.totalPayloads) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Build Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.payloads.byStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{status}</span>
                          <Badge
                            variant={status === "ready" ? "default" : status === "failed" ? "destructive" : "secondary"}
                          >
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Build Time Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average</span>
                        <span className="font-medium">{analytics.payloads.buildTime.avg}s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min</span>
                        <span className="font-medium">{analytics.payloads.buildTime.min}s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max</span>
                        <span className="font-medium">{analytics.payloads.buildTime.max}s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Most Used Payload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize">
                      {analytics.payloads.usage.mostUsed.replace(/_/g, " ")}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {analytics.payloads.usage.mostUsedCount} deployments
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="implants" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Implant Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.implants.byStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{status}</span>
                          <Badge
                            variant={status === "active" ? "default" : status === "compromised" ? "destructive" : "secondary"}
                          >
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Implant Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.implants.byType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{type.replace(/-/g, " ")}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Architecture</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.implants.byArchitecture).map(([arch, count]) => (
                        <div key={arch} className="flex items-center justify-between">
                          <span className="text-sm uppercase">{arch}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Uptime Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average</span>
                        <span className="font-medium">{formatSeconds(analytics.implants.avgUptime)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">{formatSeconds(analytics.implants.totalUptime)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="lotl" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.lotl.byRisk).map(([risk, count]) => (
                        <div key={risk}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{risk}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                risk === "Critical" ? "bg-red-500" :
                                risk === "High" ? "bg-orange-500" :
                                risk === "Medium" ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${(count / analytics.overview.lotlTools) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Tool Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.lotl.byCategory).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm">{category}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.lotl.totalExecutions}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">High Risk Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                      {analytics.lotl.highRiskUsage}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      High/Critical tool executions
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="profiles" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Profile Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.profiles.byType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{type.replace(/_/g, " ")}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Version Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Versions</span>
                        <span className="font-medium">{analytics.profiles.versions.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg per Profile</span>
                        <span className="font-medium">{analytics.profiles.versions.avgVersions.toFixed(1)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Template Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.profiles.templateUsage).map(([template, count]) => (
                        <div key={template} className="flex items-center justify-between">
                          <span className="text-sm">{template}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Activity Timeline</CardTitle>
                  <CardDescription>
                    Daily activity across all weaponize modules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.timeline.map((entry) => (
                      <div key={entry.date} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-muted-foreground">
                          {formatDate(entry.date)}
                        </div>
                        <div className="flex-1 flex gap-2">
                          <div
                            className="bg-blue-500 rounded-md flex items-center justify-center text-white text-xs font-medium"
                            style={{
                              width: `${(entry.payloads / Math.max(...analytics.timeline.map(t => t.payloads))) * 100}%`,
                              minWidth: "60px",
                            }}
                          >
                            {entry.payloads} payloads
                          </div>
                          <div
                            className="bg-emerald-500 rounded-md flex items-center justify-center text-white text-xs font-medium"
                            style={{
                              width: `${(entry.implants / Math.max(...analytics.timeline.map(t => t.implants))) * 100}%`,
                              minWidth: "60px",
                            }}
                          >
                            {entry.implants} implants
                          </div>
                          <div
                            className="bg-purple-500 rounded-md flex items-center justify-center text-white text-xs font-medium"
                            style={{
                              width: `${(entry.executions / Math.max(...analytics.timeline.map(t => t.executions))) * 100}%`,
                              minWidth: "60px",
                            }}
                          >
                            {entry.executions} exec
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}