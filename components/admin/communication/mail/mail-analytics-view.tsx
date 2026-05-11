"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Mail,
  TrendingUp,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  AlertTriangle,
  Activity,
} from "lucide-react"

type MailAnalytics = {
  success: boolean
  period: string
  dateRange: {
    start: string
    end: string
  }
  overview: {
    totalEmails: number
    tunnelScriptEmails: number
    notificationEmails: number
    totalCampaigns: number
    completedCampaigns: number
    runningCampaigns: number
    scheduledCampaigns: number
  }
  campaigns: {
    totalRecipients: number
    totalSent: number
    totalFailed: number
    successRate: number
  }
  breakdown: {
    byTunnelType: Record<string, number>
    byDate: Record<string, number>
  }
  recentActivity: Array<{
    id: string
    to: string
    subject: string
    type: string
    tunnelType: string | null
    sentAt: string
  }>
}

export function MailAnalyticsView() {
  const [analytics, setAnalytics] = useState<MailAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState("7d")

  const loadAnalytics = async (selectedPeriod: string = period) => {
    try {
      const res = await fetch(`/api/admin/communication/mail/analytics?period=${selectedPeriod}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAnalytics(data)
    } catch (err) {
      toast.error("Failed to load mail analytics", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return <div className="p-6">Loading mail analytics...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-lg">Mail Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Email campaign performance and delivery metrics
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
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Total Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.totalEmails}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.dateRange.start && analytics.dateRange.end
                    ? `${formatDate(analytics.dateRange.start)} - ${formatDate(analytics.dateRange.end)}`
                    : "All time"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {analytics.campaigns.totalSent}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.campaigns.successRate.toFixed(1)}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {analytics.campaigns.totalFailed}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.campaigns.totalRecipients > 0
                    ? `${((analytics.campaigns.totalFailed / analytics.campaigns.totalRecipients) * 100).toFixed(1)}% failure`
                    : "No data"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.totalCampaigns}</div>
                <div className="flex gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {analytics.overview.runningCampaigns} running
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {analytics.overview.scheduledCampaigns} scheduled
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Email Types */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Email Types</CardTitle>
                    <CardDescription>Distribution by email type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tunnel Script</span>
                          <span className="font-medium">{analytics.overview.tunnelScriptEmails}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${analytics.overview.totalEmails > 0
                                ? (analytics.overview.tunnelScriptEmails / analytics.overview.totalEmails) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Notification</span>
                          <span className="font-medium">{analytics.overview.notificationEmails}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{
                              width: `${analytics.overview.totalEmails > 0
                                ? (analytics.overview.notificationEmails / analytics.overview.totalEmails) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campaign Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Campaign Status</CardTitle>
                    <CardDescription>Campaign completion status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Completed</span>
                          <span className="font-medium">{analytics.overview.completedCampaigns}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{
                              width: `${analytics.overview.totalCampaigns > 0
                                ? (analytics.overview.completedCampaigns / analytics.overview.totalCampaigns) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Running</span>
                          <span className="font-medium">{analytics.overview.runningCampaigns}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${analytics.overview.totalCampaigns > 0
                                ? (analytics.overview.runningCampaigns / analytics.overview.totalCampaigns) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Scheduled</span>
                          <span className="font-medium">{analytics.overview.scheduledCampaigns}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500"
                            style={{
                              width: `${analytics.overview.totalCampaigns > 0
                                ? (analytics.overview.scheduledCampaigns / analytics.overview.totalCampaigns) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* By Tunnel Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">By Tunnel Type</CardTitle>
                    <CardDescription>Emails per tunnel type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {Object.entries(analytics.breakdown.byTunnelType).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No data available
                          </div>
                        ) : (
                          Object.entries(analytics.breakdown.byTunnelType)
                            .sort(([, a], [, b]) => b - a)
                            .map(([type, count]) => (
                              <div key={type} className="flex items-center justify-between">
                                <span className="text-sm">{type}</span>
                                <Badge variant="secondary">{count}</Badge>
                              </div>
                            ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* By Date */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">By Date</CardTitle>
                    <CardDescription>Emails sent per day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {Object.entries(analytics.breakdown.byDate).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No data available
                          </div>
                        ) : (
                          Object.entries(analytics.breakdown.byDate)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([date, count]) => (
                              <div key={date} className="flex items-center justify-between">
                                <span className="text-sm">{formatDate(date)}</span>
                                <Badge variant="secondary">{count}</Badge>
                              </div>
                            ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                  <CardDescription>Latest email sending activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {analytics.recentActivity.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No recent activity
                        </div>
                      ) : (
                        analytics.recentActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                  {activity.subject}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {activity.type}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                To: {activity.to}
                              </div>
                              {activity.tunnelType && (
                                <div className="text-xs text-muted-foreground">
                                  Tunnel: {activity.tunnelType}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDateTime(activity.sentAt)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}