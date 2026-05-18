"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@c2panel/shared"
import { apiFetch } from "@c2panel/core/api/fetch"
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Users,
  RefreshCw,
  Download,
  Upload,
  Clock,
  TrendingUp,
  Database,
  Zap,
} from "lucide-react"

type GlobalStats = {
  totalTx: number
  totalRx: number
  totalConnections: number
  activeUsers: number
  timestamp: string
}

type BandwidthHistory = {
  period: string
  data: Array<{
    timestamp: string
    tx: number
    rx: number
    total: number
  }>
}

type PerUserStats = {
  userId: string
  displayName: string
  authToken: string
  tx: number
  rx: number
  total: number
  connections: number
  timestamp: string
}

type TrafficData = {
  global: GlobalStats
  bandwidthHistory: BandwidthHistory
  perUser: PerUserStats[] | null
  historical: {
    totalBytesIn: string
    totalBytesOut: string
    totalConnections: number
    recordCount: number
    timeSeries?: Array<{
      period: string
      bytesIn: string
      bytesOut: string
      connections: number
    }>
  } | null
  cacheStats: {
    size: number
    keys: string[]
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

function formatBytesBigint(bytesStr: string): string {
  const bytes = BigInt(bytesStr)
  if (bytes === 0n) return "0 B"
  const k = 1024n
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  let i = 0n
  let value = bytes
  while (value >= k && i < 4n) {
    value = value / k
    i++
  }
  return `${Number(value).toFixed(2)} ${sizes[Number(i)]}`
}

export function TrafficStatsDashboard() {
  const [data, setData] = useState<TrafficData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<"1m" | "5m" | "15m" | "1h" | "24h">("5m")
  const [hours] = useState(24)
  const isInitialMount = useRef(true)

  const fetchTrafficStats = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/api/admin/operations/traffic-stats?period=${period}&perUser=true&hours=${hours}`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch traffic stats:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period, hours])

  const handleCollect = async () => {
    try {
      const res = await apiFetch("/api/admin/operations/traffic-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: "default", store: false }),
      })
      if (res.ok) {
        await fetchTrafficStats()
      }
    } catch (error) {
      console.error("Failed to collect traffic stats:", error)
    }
  }

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      fetchTrafficStats()
    }

    const interval = setInterval(fetchTrafficStats, 30000)
    return () => clearInterval(interval)
  }, [fetchTrafficStats])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTrafficStats()
  }

  const maxBandwidth = data?.bandwidthHistory.data
    ? Math.max(...data.bandwidthHistory.data.map((d) => d.total))
    : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-lg">Traffic Statistics</h2>
          <p className="text-sm text-muted-foreground">
            Real-time bandwidth monitoring and traffic analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
  value={period}
  onValueChange={(value: "1m" | "5m" | "15m" | "1h" | "24h") => setPeriod(value)}
>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Minute</SelectItem>
              <SelectItem value="5m">5 Minutes</SelectItem>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleCollect} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Collect
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-micro text-muted-foreground mb-2">
                  <Activity className="h-3 w-3" />
                  <span>Total Upload</span>
                </div>
                <div className="text-heading-lg text-foreground">
                  {formatBytes(data?.global.totalTx || 0)}
                </div>
                <div className="flex items-center gap-1 text-micro text-success">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>TX</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-micro text-muted-foreground mb-2">
                  <Activity className="h-3 w-3" />
                  <span>Total Download</span>
                </div>
                <div className="text-heading-lg text-foreground">
                  {formatBytes(data?.global.totalRx || 0)}
                </div>
                <div className="flex items-center gap-1 text-micro text-blue-500">
                  <ArrowDownRight className="h-3 w-3" />
                  <span>RX</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-micro text-muted-foreground mb-2">
                  <Users className="h-3 w-3" />
                  <span>Active Users</span>
                </div>
                <div className="text-heading-lg text-foreground">
                  {data?.global.activeUsers || 0}
                </div>
                <div className="text-micro text-muted-foreground">
                  {data?.global.totalConnections || 0} connections
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-micro text-muted-foreground mb-2">
                  <Database className="h-3 w-3" />
                  <span>Cache Status</span>
                </div>
                <div className="text-heading-lg text-foreground">
                  {data?.cacheStats.size || 0}
                </div>
                <div className="text-micro text-muted-foreground">
                  {data?.cacheStats.keys.length || 0} keys
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="bandwidth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bandwidth">Bandwidth</TabsTrigger>
          <TabsTrigger value="users">Per-User</TabsTrigger>
          <TabsTrigger value="historical">Historical</TabsTrigger>
        </TabsList>

        {/* Bandwidth Tab */}
        <TabsContent value="bandwidth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Bandwidth History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px]" />
              ) : (
                <div className="space-y-2">
                  {data?.bandwidthHistory.data.slice(0, 20).map((point, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="text-micro text-muted-foreground w-16">
                        {new Date(point.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-8">TX:</span>
                          <Progress
                            value={(point.tx / maxBandwidth) * 100}
                            className="h-2 flex-1"
                          />
                          <span className="text-xs w-20 text-right">{formatBytes(point.tx)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-8">RX:</span>
                          <Progress
                            value={(point.rx / maxBandwidth) * 100}
                            className="h-2 flex-1"
                          />
                          <span className="text-xs w-20 text-right">{formatBytes(point.rx)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per-User Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Per-User Traffic Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </>
              ) : data?.perUser && data.perUser.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {data.perUser.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-body-sm font-medium truncate">
                              {user.displayName}
                            </span>
                            {user.connections > 0 && (
                              <Badge variant="outline" className="h-4 px-1 text-micro">
                                {user.connections} conn
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-micro text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Upload className="h-2.5 w-2.5" />
                              {formatBytes(user.tx)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Download className="h-2.5 w-2.5" />
                              {formatBytes(user.rx)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="h-2.5 w-2.5" />
                              {formatBytes(user.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-micro text-muted-foreground text-center py-8">
                  No user traffic data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historical Tab */}
        <TabsContent value="historical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Historical Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px]" />
              ) : data?.historical ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="text-micro text-muted-foreground">Total Bytes In</div>
                      <div className="text-body-sm font-medium">
                        {formatBytesBigint(data.historical.totalBytesIn)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-micro text-muted-foreground">Total Bytes Out</div>
                      <div className="text-body-sm font-medium">
                        {formatBytesBigint(data.historical.totalBytesOut)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-micro text-muted-foreground">Total Connections</div>
                      <div className="text-body-sm font-medium">
                        {data.historical.totalConnections}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-micro text-muted-foreground">Records</div>
                      <div className="text-body-sm font-medium">
                        {data.historical.recordCount}
                      </div>
                    </div>
                  </div>

                  {data.historical.timeSeries && data.historical.timeSeries.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <div className="text-sm font-medium">Time Series Data</div>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {data.historical.timeSeries.map((point, idx) => (
                            <div key={idx} className="flex items-center gap-4 text-micro">
                              <span className="w-24 text-muted-foreground">{point.period}</span>
                              <span className="flex-1">
                                In: {formatBytesBigint(point.bytesIn)} | Out:{" "}
                                {formatBytesBigint(point.bytesOut)} | Conn: {point.connections}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-micro text-muted-foreground text-center py-8">
                  No historical data available. Specify a nodeId or userId to view historical stats.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}