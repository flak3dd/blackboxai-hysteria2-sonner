"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { listPresets, type OperationPreset } from "@/lib/operations/presets"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Play, Upload, Zap, CheckCircle2, XCircle, Loader, ChevronDown, ChevronUp,
  Server, ShieldCheck, FileCode, Crosshair, Mail, Send, Terminal, Eye, PencilLine,
} from "lucide-react"
import { toast } from "sonner"
import { PRETEXT_TEMPLATES } from "@/lib/mailer/html-smuggler"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Node {
  id: string
  name: string
  hostname: string
  listenAddr: string
  status: string
}

interface SmtpConfig {
  id: string
  name: string
  host: string
}

type LogLevel = "info" | "ok" | "err"

interface LogEntry {
  ts: number
  level: LogLevel
  msg: string
}

interface RunResult {
  profileId: string
  payloadId: string
  implantId: string
  sentCount: number
  failedCount: number
}

type RunStatus = "idle" | "running" | "done" | "error"
type StepStatus = "pending" | "running" | "done" | "error"

/* ------------------------------------------------------------------ */
/*  Pipeline step definitions                                           */
/* ------------------------------------------------------------------ */

interface PipelineStep {
  id: string
  label: string
  icon: React.ElementType
  startPat: RegExp
  donePat: RegExp
  detailPat?: RegExp
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "node",
    label: "Resolve Node",
    icon: Server,
    startPat: /Node resolved/,
    donePat: /Node resolved/,
    detailPat: /Node resolved: (.+)/,
  },
  {
    id: "profile",
    label: "Create Profile",
    icon: ShieldCheck,
    startPat: /Creating Hysteria2/,
    donePat: /Profile created/,
    detailPat: /Profile created: (.+)/,
  },
  {
    id: "payload",
    label: "Build Payload",
    icon: FileCode,
    startPat: /Creating payload/,
    donePat: /Payload built|Payload ready/,
    detailPat: /Payload ready: (.+)/,
  },
  {
    id: "implant",
    label: "Register Implant",
    icon: Crosshair,
    startPat: /Registering implant/,
    donePat: /Implant registered/,
    detailPat: /Implant registered: (.+)/,
  },
  {
    id: "smuggle",
    label: "Generate Email",
    icon: Mail,
    startPat: /Generating HTML/,
    donePat: /Smuggled HTML generated/,
    detailPat: /Smuggled HTML generated: (.+)/,
  },
  {
    id: "send",
    label: "Send Campaign",
    icon: Send,
    startPat: /Sending to/,
    donePat: /Sent:/,
    detailPat: /Sent: (.+)/,
  },
]

function deriveStepStatuses(
  logs: LogEntry[],
  runStatus: RunStatus,
): { status: StepStatus; detail?: string }[] {
  const msgs = logs.map((l) => l.msg)

  return PIPELINE_STEPS.map((step, i) => {
    const startIdx = msgs.findIndex((m) => step.startPat.test(m))
    const doneIdx = msgs.findIndex((m) => step.donePat.test(m))

    if (doneIdx !== -1) {
      const detail = step.detailPat ? msgs.slice(0, doneIdx + 1).reverse().find((m) => step.detailPat!.test(m))?.match(step.detailPat!)?.[1] : undefined
      return { status: "done" as StepStatus, detail }
    }

    if (startIdx !== -1) {
      // Check if a later step has started — means this one is effectively done even without explicit done msg
      const laterStarted = PIPELINE_STEPS.slice(i + 1).some((s) => msgs.some((m) => s.startPat.test(m)))
      if (laterStarted) return { status: "done" as StepStatus }
      if (runStatus === "error") return { status: "error" as StepStatus }
      return { status: "running" as StepStatus }
    }

    return { status: "pending" as StepStatus }
  })
}

/* ------------------------------------------------------------------ */
/*  Static hoisted values                                               */
/* ------------------------------------------------------------------ */

const PRESETS = listPresets()

const CATEGORY_COLOR: Record<string, string> = {
  phishing: "text-orange-400 border-orange-400/30 bg-orange-400/5",
  "full-chain": "text-violet-400 border-violet-400/30 bg-violet-400/5",
  recon: "text-blue-400 border-blue-400/30 bg-blue-400/5",
  persistence: "text-red-400 border-red-400/30 bg-red-400/5",
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  ok: "text-emerald-400",
  err: "text-red-400",
}

const PRETEXT_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string }>> = {
  invoice:   [{ key: "companyName", label: "Company Name", placeholder: "Acme Corp" }, { key: "invoiceNum", label: "Invoice #", placeholder: "INV-2024-001" }],
  hr_policy: [{ key: "companyName", label: "Company Name", placeholder: "Acme Corp" }],
  it_alert:  [],
  contract:  [{ key: "counterparty", label: "Counterparty", placeholder: "Partner Ltd" }],
}

function renderPretext(preset: OperationPreset, customArgs?: Record<string, string>): string {
  const a = { ...preset.campaign.pretextArgs, ...(customArgs ?? {}) }
  switch (preset.campaign.pretext) {
    case "invoice":   return PRETEXT_TEMPLATES.invoice(a.companyName ?? "Acme Corp", a.invoiceNum ?? "INV-001")
    case "hr_policy": return PRETEXT_TEMPLATES.hr_policy(a.companyName ?? "Acme Corp")
    case "it_alert":  return PRETEXT_TEMPLATES.it_alert()
    case "contract":  return PRETEXT_TEMPLATES.contract(a.counterparty ?? "Partner Ltd")
  }
}

/* ------------------------------------------------------------------ */
/*  Email preview panel                                                 */
/* ------------------------------------------------------------------ */

function EmailPreviewPanel({
  preset,
  templateSubject,
  templateArgs,
  customHtml,
}: {
  preset: OperationPreset
  templateSubject: string
  templateArgs: Record<string, string>
  customHtml?: string
}) {
  const subject = templateSubject.trim() || preset.campaign.subject.replace("{ts}", "XXXXXXX")
  const pretextHtml = customHtml?.trim() || renderPretext(preset, templateArgs)

  const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { margin: 0; background: #fff; font-size: 14px; }
  * { box-sizing: border-box; }
</style></head>
<body>${pretextHtml}</body>
</html>`

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-primary" />
          Email Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {/* Subject line */}
        <div className="rounded-md border border-border bg-muted/30 px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-2">Subject</span>
          <span className="text-xs font-medium">{subject}</span>
        </div>

        {/* Pretext badges */}
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <Badge variant="outline" className="capitalize text-[10px]">
            {customHtml?.trim() ? "custom html" : preset.campaign.pretext.replace("_", " ")} pretext
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono">
            XOR {preset.campaign.xorKey}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {preset.campaign.rateLimitPerMinute}/min · batch {preset.campaign.batchSize}
          </Badge>
        </div>

        {/* Rendered email body in sandboxed iframe */}
        <div className="rounded-md border border-border overflow-hidden bg-white">
          <iframe
            sandbox="allow-same-origin"
            srcDoc={fullHtml}
            className="w-full h-56 block"
            title="Email body preview"
          />
        </div>

        <p className="text-[10px] text-muted-foreground leading-snug">
          ↑ Decoy HTML shown to recipient. The payload is embedded as an XOR-encoded base64 blob and
          reconstructed client-side via JS — not visible here.
        </p>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Preset card                                                         */
/* ------------------------------------------------------------------ */

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: OperationPreset
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg border p-4 transition-all duration-150",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xl">{preset.icon}</span>
        <div className="flex flex-wrap gap-1">
          {preset.badge && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
              {preset.badge}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 capitalize", CATEGORY_COLOR[preset.category])}
          >
            {preset.category}
          </Badge>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-sm font-medium leading-tight">{preset.name}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-snug">{preset.description}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {preset.payload.amsiBypass && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">AMSI</Badge>
        )}
        {preset.payload.etwBypass && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">ETW</Badge>
        )}
        {preset.profile.obfsEnabled && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">SALAMANDER</Badge>
        )}
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          Obf L{preset.payload.obfuscationLevel}
        </Badge>
      </div>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Progress panel                                                      */
/* ------------------------------------------------------------------ */

function ProgressPanel({
  logs,
  status,
  result,
  error,
}: {
  logs: LogEntry[]
  status: RunStatus
  result?: RunResult
  error?: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const stepStatuses = deriveStepStatuses(logs, status)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs.length])

  const overallPct = status === "idle" ? 0
    : status === "done" ? 100
    : status === "error"
      ? Math.round((stepStatuses.filter((s) => s.status === "done").length / PIPELINE_STEPS.length) * 100)
      : Math.round(
          ((stepStatuses.filter((s) => s.status === "done").length +
            stepStatuses.filter((s) => s.status === "running").length * 0.5) /
            PIPELINE_STEPS.length) *
            100,
        )

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header with overall progress */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          {status === "running" && <Loader className="h-3.5 w-3.5 animate-spin text-amber-400" />}
          {status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
          {status === "error" && <XCircle className="h-3.5 w-3.5 text-red-400" />}
          {status === "idle" && <Zap className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-xs font-medium">
            {status === "idle" && "Ready"}
            {status === "running" && "Operation in progress…"}
            {status === "done" && "Operation complete"}
            {status === "error" && "Operation failed"}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{overallPct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border">
        <div
          className={cn(
            "h-full transition-all duration-500",
            status === "done" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : "bg-primary",
          )}
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {/* Pipeline steps */}
      <div className="px-4 py-3 space-y-0.5">
        {PIPELINE_STEPS.map((step, i) => {
          const { status: s, detail } = stepStatuses[i]
          const Icon = step.icon
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
                s === "running" && "bg-amber-500/5",
                s === "done" && "opacity-80",
                s === "error" && "bg-red-500/5",
              )}
            >
              {/* Step icon + connector */}
              <div className="relative flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold transition-all",
                    s === "pending" && "border-border bg-background text-muted-foreground",
                    s === "running" && "border-amber-400 bg-amber-400/10 text-amber-400",
                    s === "done" && "border-emerald-500 bg-emerald-500/10 text-emerald-400",
                    s === "error" && "border-red-500 bg-red-500/10 text-red-400",
                  )}
                >
                  {s === "pending" && <span>{i + 1}</span>}
                  {s === "running" && <Loader className="h-3 w-3 animate-spin" />}
                  {s === "done" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {s === "error" && <XCircle className="h-3.5 w-3.5" />}
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-px h-3 mt-0.5",
                      s === "done" ? "bg-emerald-500/40" : "bg-border",
                    )}
                  />
                )}
              </div>

              {/* Step label + icon + detail */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={cn(
                      "h-3 w-3 shrink-0",
                      s === "pending" && "text-muted-foreground/50",
                      s === "running" && "text-amber-400",
                      s === "done" && "text-emerald-400",
                      s === "error" && "text-red-400",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      s === "pending" && "text-muted-foreground/60",
                      s === "running" && "text-foreground",
                      s === "done" && "text-foreground",
                      s === "error" && "text-red-400",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {detail && (
                  <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5 ml-4">
                    {detail}
                  </p>
                )}
              </div>

              {/* Duration badge — placeholder */}
              <div className="shrink-0">
                {s === "done" && (
                  <span className="text-[10px] text-emerald-500/60 font-mono">✓</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Results summary */}
      {status === "done" && result && (
        <div className="mx-4 mb-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
          <p className="text-xs font-semibold text-emerald-400">Operation Complete</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
            <span className="text-muted-foreground">Profile</span>
            <span className="truncate text-emerald-300">{result.profileId.slice(0, 8)}…</span>
            <span className="text-muted-foreground">Implant</span>
            <span className="truncate text-emerald-300">{result.implantId.slice(0, 8)}…</span>
            <span className="text-muted-foreground">Emails sent</span>
            <span className={result.failedCount > 0 ? "text-amber-400" : "text-emerald-400"}>
              {result.sentCount} ✓ {result.failedCount > 0 ? `/ ${result.failedCount} ✗` : ""}
            </span>
          </div>
        </div>
      )}

      {status === "error" && error && (
        <div className="mx-4 mb-3 rounded-md border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs font-semibold text-red-400">Error</p>
          <p className="mt-0.5 text-[11px] text-red-300/80 font-mono leading-relaxed">{error}</p>
        </div>
      )}

      {/* Raw log stream */}
      <div className="border-t border-border">
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50 bg-black/20">
          <Terminal className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Raw output</span>
        </div>
        <div className="h-40 overflow-y-auto bg-black/30 px-4 py-2 font-mono text-[11px] space-y-0.5">
          {logs.length === 0 && status === "idle" ? (
            <p className="text-muted-foreground/50">Waiting to start…</p>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="flex gap-2 leading-relaxed">
                <span className="text-muted-foreground/40 shrink-0 tabular-nums">
                  {new Date(entry.ts).toLocaleTimeString("en-US", { hour12: false })}
                </span>
                <span className={LEVEL_COLOR[entry.level]}>{entry.msg}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main dashboard                                                      */
/* ------------------------------------------------------------------ */

export function QuickOpsDashboard() {
  const [selectedPreset, setSelectedPreset] = useState<OperationPreset | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([])
  const [nodeId, setNodeId] = useState("")
  const [smtpConfigId, setSmtpConfigId] = useState("")
  const [emailCsv, setEmailCsv] = useState("")

  // Template editor state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [templateSubject, setTemplateSubject] = useState("")
  const [templateArgs, setTemplateArgs] = useState<Record<string, string>>({})
  const [useCustomHtml, setUseCustomHtml] = useState(false)
  const [customHtml, setCustomHtml] = useState("")

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [overrideXorKey, setOverrideXorKey] = useState("")
  const [overrideObfLevel, setOverrideObfLevel] = useState<"" | "0" | "1" | "2" | "3">("")

  const [runStatus, setRunStatus] = useState<RunStatus>("idle")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [runResult, setRunResult] = useState<RunResult | undefined>()
  const [runError, setRunError] = useState<string | undefined>()

  // Load nodes and SMTP configs in parallel on mount (async-parallel)
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/operations/nodes").then((r) => r.json()),
      fetch("/api/admin/communication/mail/smtp-configs").then((r) => r.json()),
    ])
      .then(([nodeData, smtpData]) => {
        setNodes(nodeData.nodes ?? [])
        setSmtpConfigs(smtpData.configs ?? [])
      })
      .catch(() => {})
  }, [])

  // Reset template editor to preset defaults when the preset changes
  useEffect(() => {
    if (!selectedPreset) return
    setTemplateSubject(selectedPreset.campaign.subject)
    setTemplateArgs({ ...selectedPreset.campaign.pretextArgs })
    setUseCustomHtml(false)
    setCustomHtml("")
  }, [selectedPreset])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setEmailCsv(reader.result as string)
    reader.readAsText(file)
  }, [])

  const canRun =
    selectedPreset !== null &&
    nodeId !== "" &&
    emailCsv.trim() !== "" &&
    runStatus !== "running"

  const startRun = useCallback(async () => {
    if (!selectedPreset || !nodeId || !emailCsv.trim()) return

    setRunStatus("running")
    setLogs([])
    setRunResult(undefined)
    setRunError(undefined)

    const overrides: Record<string, unknown> = {}
    if (templateSubject.trim()) overrides.subject = templateSubject.trim()
    if (Object.keys(templateArgs).length > 0) overrides.pretextArgs = templateArgs
    if (useCustomHtml && customHtml.trim()) overrides.customPretextHtml = customHtml.trim()
    if (overrideXorKey) overrides.xorKey = parseInt(overrideXorKey, 10)
    if (overrideObfLevel !== "") overrides.obfuscationLevel = parseInt(overrideObfLevel, 10)

    try {
      const res = await fetch("/api/admin/operations/quick-ops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          presetId: selectedPreset.id,
          nodeId,
          emailCsv: emailCsv.trim(),
          smtpConfigId: smtpConfigId || undefined,
          overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setRunStatus("error")
        setRunError(d.error ?? "Failed to start operation")
        toast.error("Operation failed to start", { description: d.error })
        return
      }

      const { runId } = await res.json()
      const eventSource = new EventSource(`/api/admin/operations/quick-ops/${runId}/stream`)

      eventSource.onmessage = (ev) => {
        const data = JSON.parse(ev.data)
        if ("done" in data && data.done) {
          eventSource.close()
          if (data.error) {
            setRunStatus("error")
            setRunError(data.error)
            toast.error("Operation failed", { description: data.error })
          } else {
            setRunStatus("done")
            setRunResult(data.result)
            toast.success("Operation complete", {
              description: `Sent ${data.result?.sentCount ?? 0} emails · Implant ${data.result?.implantId?.slice(0, 8) ?? "registered"}`,
            })
          }
        } else {
          setLogs((prev) => [...prev, data as LogEntry])
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setRunStatus("error")
        setRunError("Stream connection lost")
        toast.error("Stream disconnected")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setRunStatus("error")
      setRunError(msg)
      toast.error("Operation error", { description: msg })
    }
  }, [selectedPreset, nodeId, emailCsv, smtpConfigId, templateSubject, templateArgs, useCustomHtml, customHtml, overrideXorKey, overrideObfLevel])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-heading-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          Quick Ops
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Single-click end-to-end operations — resolves a node, builds a payload, registers an implant,
          and delivers a HTML-smuggled phishing campaign automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        {/* Left: presets + config */}
        <div className="space-y-5">
          {/* Preset grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Choose Preset</CardTitle>
              <CardDescription className="text-xs">Each preset is a pre-tuned operation chain.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PRESETS.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    selected={selectedPreset?.id === p.id}
                    onSelect={() => setSelectedPreset(p)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configure Run</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Node */}
              <div className="space-y-1.5">
                <Label htmlFor="node-select" className="text-xs">
                  Target Node <span className="text-red-400">*</span>
                </Label>
                <Select value={nodeId} onValueChange={(v) => setNodeId(v ?? "")}>
                  <SelectTrigger id="node-select" className="h-8 text-xs">
                    <SelectValue placeholder="Select a node…" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.length === 0 && (
                      <SelectItem value="__none__" disabled>No nodes available</SelectItem>
                    )}
                    {nodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name} — {n.hostname}{" "}
                        <span className={cn(
                          "ml-1 text-[10px]",
                          n.status === "running" ? "text-emerald-400" : "text-muted-foreground",
                        )}>
                          {n.status}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SMTP config */}
              <div className="space-y-1.5">
                <Label htmlFor="smtp-select" className="text-xs">
                  SMTP Config{" "}
                  <span className="text-muted-foreground">(optional — uses default if blank)</span>
                </Label>
                <Select value={smtpConfigId} onValueChange={(v) => setSmtpConfigId(v ?? "")}>
                  <SelectTrigger id="smtp-select" className="h-8 text-xs">
                    <SelectValue placeholder="Use default SMTP…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Use default</SelectItem>
                    {smtpConfigs.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.host})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email list */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Email List <span className="text-red-400">*</span>
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder={"target@company.com\nanother@example.org\n..."}
                    value={emailCsv}
                    onChange={(e) => setEmailCsv(e.target.value)}
                    className="min-h-[80px] text-xs font-mono resize-none"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border px-3 py-2 hover:border-primary/50 hover:bg-muted/50 transition-colors text-muted-foreground text-[10px]"
                    >
                      <Upload className="h-4 w-4" />
                      .csv
                    </label>
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv,.txt"
                      className="sr-only"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Template editor */}
              {selectedPreset && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTemplateEditor((v) => !v)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showTemplateEditor ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <PencilLine className="h-3 w-3" />
                    Edit Email Template
                    {(templateSubject !== selectedPreset.campaign.subject || useCustomHtml || Object.keys(templateArgs).some(k => templateArgs[k] !== selectedPreset.campaign.pretextArgs[k])) && (
                      <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 text-amber-400 border-amber-400/30">edited</Badge>
                    )}
                  </button>
                  {showTemplateEditor && (
                    <div className="mt-3 space-y-3 pl-4 border-l border-border/50">
                      {/* Subject */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Subject <span className="text-muted-foreground font-normal">(use {"{ts}"} for timestamp)</span></Label>
                        <Input
                          value={templateSubject}
                          onChange={(e) => setTemplateSubject(e.target.value)}
                          className="h-8 text-xs"
                          placeholder={selectedPreset.campaign.subject}
                        />
                      </div>

                      {/* Pretext args */}
                      {(PRETEXT_FIELDS[selectedPreset.campaign.pretext] ?? []).length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Template Variables</Label>
                          {(PRETEXT_FIELDS[selectedPreset.campaign.pretext] ?? []).map((field) => (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-xs">{field.label}</Label>
                              <Input
                                value={templateArgs[field.key] ?? ""}
                                onChange={(e) => setTemplateArgs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                                className="h-8 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Custom HTML toggle */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setUseCustomHtml((v) => !v)}
                          className={cn(
                            "flex items-center gap-1.5 text-xs transition-colors",
                            useCustomHtml ? "text-amber-400" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {useCustomHtml ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          Custom body HTML {useCustomHtml && <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-400 border-amber-400/30">active</Badge>}
                        </button>
                        {useCustomHtml && (
                          <Textarea
                            value={customHtml}
                            onChange={(e) => setCustomHtml(e.target.value)}
                            placeholder={"<div style=\"font-family:sans-serif\">\n  <p>Dear {{firstName}},</p>\n  ...\n</div>"}
                            className="min-h-[140px] text-xs font-mono resize-y"
                          />
                        )}
                        {useCustomHtml && (
                          <p className="text-[10px] text-muted-foreground">
                            Replaces the preset template. Supports <code className="font-mono">{"{{firstName}}"}</code>, <code className="font-mono">{"{{lastName}}"}</code>, <code className="font-mono">{"{{email}}"}</code>.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced overrides */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  Advanced Overrides
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-3 pl-4 border-l border-border/50">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Override XOR Key (1–255)</Label>
                        <input
                          type="number"
                          min={1}
                          max={255}
                          placeholder="e.g. 73"
                          value={overrideXorKey}
                          onChange={(e) => setOverrideXorKey(e.target.value)}
                          className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Override Obf Level</Label>
                        <Select
                          value={overrideObfLevel}
                          onValueChange={(v) => setOverrideObfLevel((v ?? "") as "" | "0" | "1" | "2" | "3")}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Use preset" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Use preset</SelectItem>
                            <SelectItem value="0">0 — None</SelectItem>
                            <SelectItem value="1">1 — Light</SelectItem>
                            <SelectItem value="2">2 — Medium</SelectItem>
                            <SelectItem value="3">3 — Heavy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Launch button */}
          <Button size="lg" disabled={!canRun} onClick={startRun} className="w-full gap-2">
            {runStatus === "running" ? (
              <><Loader className="h-4 w-4 animate-spin" /> Running…</>
            ) : (
              <><Play className="h-4 w-4" /> Launch Operation</>
            )}
          </Button>
        </div>

        {/* Right: progress panel + email preview + preset summary */}
        <div className="space-y-4">
          <ProgressPanel
            logs={logs}
            status={runStatus}
            result={runResult}
            error={runError}
          />

          {selectedPreset && (
            <EmailPreviewPanel
              preset={selectedPreset}
              templateSubject={templateSubject}
              templateArgs={templateArgs}
              customHtml={useCustomHtml ? customHtml : undefined}
            />
          )}

          {selectedPreset && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>{selectedPreset.icon}</span>
                  {selectedPreset.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <dt className="text-muted-foreground">Port</dt>
                  <dd className="font-mono">{selectedPreset.profile.port}</dd>
                  <dt className="text-muted-foreground">Obfuscation</dt>
                  <dd>Level {selectedPreset.payload.obfuscationLevel}</dd>
                  <dt className="text-muted-foreground">AMSI Bypass</dt>
                  <dd className={selectedPreset.payload.amsiBypass ? "text-emerald-400" : "text-muted-foreground"}>
                    {selectedPreset.payload.amsiBypass ? "Yes" : "No"}
                  </dd>
                  <dt className="text-muted-foreground">ETW Bypass</dt>
                  <dd className={selectedPreset.payload.etwBypass ? "text-emerald-400" : "text-muted-foreground"}>
                    {selectedPreset.payload.etwBypass ? "Yes" : "No"}
                  </dd>
                  <dt className="text-muted-foreground">Salamander</dt>
                  <dd className={selectedPreset.profile.obfsEnabled ? "text-emerald-400" : "text-muted-foreground"}>
                    {selectedPreset.profile.obfsEnabled ? "Yes" : "No"}
                  </dd>
                  <dt className="text-muted-foreground">Rate limit</dt>
                  <dd>{selectedPreset.campaign.rateLimitPerMinute}/min</dd>
                  <dt className="text-muted-foreground">Pretext</dt>
                  <dd className="capitalize">{selectedPreset.campaign.pretext.replace("_", " ")}</dd>
                  <dt className="text-muted-foreground">Subject</dt>
                  <dd className="col-span-2 truncate font-mono text-[10px] text-muted-foreground">
                    {selectedPreset.campaign.subject}
                  </dd>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
