"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Download, History, RefreshCw } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types (mirrors lib/config-audit/analyzer.ts)                       */
/* ------------------------------------------------------------------ */

type Severity = "critical" | "high" | "medium" | "low" | "info"

type AuditFinding = {
  id: string
  category: string
  title: string
  severity: Severity
  description: string
  recommendation: string
  passed: boolean
  weight: number
}

type AuditResult = {
  score: number
  grade: "A+" | "A" | "B" | "C" | "D" | "F"
  findings: AuditFinding[]
  summary: {
    total: number
    passed: number
    failed: number
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  auditedAt: number
  auditType: "security" | "performance" | "compliance" | "full"
}

type AuditHistoryEntry = {
  id: string
  operatorId: string
  action: string
  resource: string
  details: {
    auditType: string
    score: number
    timestamp: string
  }
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  operator: {
    id: string
    username: string
  }
}

/* ------------------------------------------------------------------ */
/*  Severity helpers                                                   */
/* ------------------------------------------------------------------ */

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

function severityColor(s: Severity) {
  switch (s) {
    case "critical":
      return "bg-red-600 text-white"
    case "high":
      return "bg-orange-500 text-white"
    case "medium":
      return "bg-amber-500 text-white"
    case "low":
      return "bg-yellow-400 text-black"
    case "info":
      return "bg-zinc-500 text-white"
  }
}

function gradeColor(grade: string) {
  if (grade === "A+" || grade === "A") return "text-emerald-500"
  if (grade === "B") return "text-blue-500"
  if (grade === "C") return "text-amber-500"
  if (grade === "D") return "text-orange-500"
  return "text-red-500"
}

function scoreRingColor(score: number) {
  if (score >= 85) return "stroke-emerald-500"
  if (score >= 70) return "stroke-blue-500"
  if (score >= 55) return "stroke-amber-500"
  if (score >= 40) return "stroke-orange-500"
  return "stroke-red-500"
}

/* ------------------------------------------------------------------ */
/*  Score ring SVG                                                     */
/* ------------------------------------------------------------------ */

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 54
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" className="stroke-muted" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          className={cn(scoreRingColor(score), "transition-all duration-700")}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-3xl font-bold", gradeColor(grade))}>{grade}</span>
        <span className="text-sm text-muted-foreground">{score}/100</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function ConfigAuditPage() {
  const [result, setResult] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "failed" | "passed">("all")
  const [auditType, setAuditType] = useState<"security" | "performance" | "compliance" | "full">("full")
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<AuditHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const runAudit = useCallback(async (type: "security" | "performance" | "compliance" | "full" = "full") => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/configuration/config/audit", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "full",
          auditType: type,
          config: {}, // Will be populated with actual config in production
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? `HTTP ${res.status}`)
      }
      const data: AuditResult = await res.json().result
      setResult(data)
      toast.success("Config audit complete", {
        description: `Score: ${data.score}/100 (${data.grade})`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg)
      toast.error("Audit failed", { description: msg })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/admin/configuration/config/audit?limit=20&offset=0", { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setHistory(data.data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      toast.error("Failed to fetch history", { description: msg })
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const exportReport = useCallback(() => {
    if (!result) return

    const report = {
      auditType: result.auditType,
      score: result.score,
      grade: result.grade,
      auditedAt: new Date(result.auditedAt).toISOString(),
      summary: result.summary,
      findings: result.findings,
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-report-${new Date(result.auditedAt).toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success("Report exported", {
      description: "Audit report has been downloaded",
    })
  }, [result])

  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      void fetchHistory()
    }
  }, [fetchHistory])

  const filteredFindings = result?.findings
    .filter((f) => {
      if (filter === "failed") return !f.passed
      if (filter === "passed") return f.passed
      return true
    })
    .sort((a, b) => {
      if (a.passed !== b.passed) return a.passed ? 1 : -1
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-xl">Config Strength Audit</h1>
          <p className="text-sm text-muted-foreground">
            Analyze your server configuration for security weaknesses and best practices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={auditType} onValueChange={(v: any) => setAuditType(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Audit</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => runAudit(auditType)} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            {loading ? "Auditing..." : "Run Audit"}
          </Button>
          {result && (
            <Button variant="outline" onClick={exportReport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && !result && (
        <Card className="border-destructive/50">
          <CardContent className="py-6">
            <p className="text-sm text-destructive">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Make sure a server configuration exists before running the audit.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Top row: Score + Summary */}
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            {/* Score card */}
            <Card className="flex items-center justify-center px-8">
              <ScoreRing score={result.score} grade={result.grade} />
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="Passed" value={result.summary.passed} className="text-emerald-500" />
              <SummaryCard label="Failed" value={result.summary.failed} className="text-red-500" />
              <SummaryCard label="Critical" value={result.summary.critical} className="text-red-600" />
              <SummaryCard label="High" value={result.summary.high} className="text-orange-500" />
            </div>
          </div>

          {/* Findings list */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Findings</CardTitle>
                  <CardDescription className="text-xs">
                    {result.summary.total} checks &middot; audited{" "}
                    {new Date(result.auditedAt).toLocaleTimeString()} &middot; Type: {result.auditType}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {(["all", "failed", "passed"] as const).map((f) => (
                    <Button
                      key={f}
                      variant={filter === f ? "default" : "outline"}
                      size="sm"
                      className="text-xs capitalize"
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredFindings?.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">No findings match the filter.</p>
              )}
              {filteredFindings?.map((f) => (
                <div
                  key={f.id}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    f.passed ? "border-border" : "border-destructive/30 bg-destructive/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", f.passed ? "bg-emerald-500" : "bg-red-500")} />
                      <span className="text-sm font-medium">{f.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge className={cn("text-[10px]", severityColor(f.severity))}>
                        {f.severity}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{f.category}</span>
                    </div>
                  </div>
                  <p className="mt-1 pl-4 text-xs text-muted-foreground">{f.description}</p>
                  {f.recommendation && !f.passed && (
                    <p className="mt-1 pl-4 text-xs text-amber-600 dark:text-amber-400">
                      Recommendation: {f.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Audit History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Audit History</CardTitle>
            <CardDescription className="text-xs">
              Recent configuration audits and their results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No audit history found.</p>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{entry.details.auditType} audit</span>
                        <Badge variant="outline" className="text-[10px]">
                          Score: {entry.details.score}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>By {entry.operator.username}</span>
                      {entry.ipAddress && <span>&middot; {entry.ipAddress}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Small summary card                                                 */
/* ------------------------------------------------------------------ */

function SummaryCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-4">
        <span className={cn("text-2xl font-bold", className)}>{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  )
}
