"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@c2panel/core/api/fetch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

type EmailConfigData = {
  defaultFrom: string
  defaultProvider: "smtp" | "resend" | "mysmtp"
  resendApiKey: string
  mysmtpApiKey: string
  mysmtpApiUrl: string
  trackingDomain: string
  defaultRateLimitPerMinute: number
  defaultBatchSize: number
  defaultDelayMs: number
  trackingEnabled: boolean
}

type EffectiveConfig = Omit<EmailConfigData, "resendApiKey" | "mysmtpApiKey">

export function EmailConfigPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [stored, setStored] = useState<Partial<EmailConfigData>>({})
  const [effective, setEffective] = useState<EffectiveConfig | null>(null)

  // Form state
  const [defaultFrom, setDefaultFrom] = useState("")
  const [defaultProvider, setDefaultProvider] = useState<"smtp" | "resend" | "mysmtp">("resend")
  const [resendApiKey, setResendApiKey] = useState("")
  const [mysmtpApiKey, setMysmtpApiKey] = useState("")
  const [mysmtpApiUrl, setMysmtpApiUrl] = useState("")
  const [trackingDomain, setTrackingDomain] = useState("")
  const [defaultRateLimit, setDefaultRateLimit] = useState("60")
  const [defaultBatchSize, setDefaultBatchSize] = useState("10")
  const [defaultDelayMs, setDefaultDelayMs] = useState("1000")
  const [trackingEnabled, setTrackingEnabled] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/communication/mail/email-config", { cache: "no-store" })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()

      setStored(data.stored ?? {})
      setEffective(data.effective ?? null)

      // Populate form with stored values (or empty if not set)
      const s = data.stored ?? {}
      setDefaultFrom(s.defaultFrom ?? "")
      setDefaultProvider(s.defaultProvider ?? "resend")
      setResendApiKey(s.resendApiKey ?? "")
      setMysmtpApiKey(s.mysmtpApiKey ?? "")
      setMysmtpApiUrl(s.mysmtpApiUrl ?? "")
      setTrackingDomain(s.trackingDomain ?? "")
      setDefaultRateLimit(String(s.defaultRateLimitPerMinute ?? ""))
      setDefaultBatchSize(String(s.defaultBatchSize ?? ""))
      setDefaultDelayMs(String(s.defaultDelayMs ?? ""))
      setTrackingEnabled(s.trackingEnabled ?? false)
    } catch (err) {
      toast.error("Failed to load email config", {
        description: err instanceof Error ? err.message : "unknown",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSave = useCallback(async () => {
    const rateLimit = parseInt(defaultRateLimit)
    if (defaultRateLimit && (isNaN(rateLimit) || rateLimit < 1 || rateLimit > 1000)) {
      toast.error("Rate limit must be between 1 and 1000")
      return
    }

    const batchSize = parseInt(defaultBatchSize)
    if (defaultBatchSize && (isNaN(batchSize) || batchSize < 1 || batchSize > 100)) {
      toast.error("Batch size must be between 1 and 100")
      return
    }

    const delayMs = parseInt(defaultDelayMs)
    if (defaultDelayMs && (isNaN(delayMs) || delayMs < 100 || delayMs > 60000)) {
      toast.error("Delay must be between 100 and 60000 ms")
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {}

      if (defaultFrom.trim()) body.defaultFrom = defaultFrom.trim()
      else body.defaultFrom = ""

      body.defaultProvider = defaultProvider

      if (resendApiKey.trim()) body.resendApiKey = resendApiKey.trim()
      else body.resendApiKey = ""

      if (mysmtpApiKey.trim()) body.mysmtpApiKey = mysmtpApiKey.trim()
      else body.mysmtpApiKey = ""

      if (mysmtpApiUrl.trim()) body.mysmtpApiUrl = mysmtpApiUrl.trim()
      else body.mysmtpApiUrl = ""

      if (trackingDomain.trim()) body.trackingDomain = trackingDomain.trim()
      else body.trackingDomain = ""

      if (defaultRateLimit.trim()) body.defaultRateLimitPerMinute = rateLimit
      else body.defaultRateLimitPerMinute = ""

      if (defaultBatchSize.trim()) body.defaultBatchSize = batchSize
      else body.defaultBatchSize = ""

      if (defaultDelayMs.trim()) body.defaultDelayMs = delayMs
      else body.defaultDelayMs = ""

      body.trackingEnabled = trackingEnabled

      const res = await apiFetch("/api/admin/communication/mail/email-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { error?: string }).error ?? `${res.status}`)
      }

      toast.success("Email configuration saved")
      await loadConfig()
    } catch (err) {
      toast.error("Failed to save email config", {
        description: err instanceof Error ? err.message : "unknown",
      })
    } finally {
      setSaving(false)
    }
  }, [
    defaultFrom,
    defaultProvider,
    resendApiKey,
    mysmtpApiKey,
    mysmtpApiUrl,
    trackingDomain,
    defaultRateLimit,
    defaultBatchSize,
    defaultDelayMs,
    trackingEnabled,
    loadConfig,
  ])

  const isOverridden = (key: keyof EmailConfigData) => {
    return stored[key] !== undefined && stored[key] !== ""
  }

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">Loading configuration...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Provider Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Provider Settings</CardTitle>
          <CardDescription>Configure default email provider and API keys</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultProvider">Default Provider</Label>
              <select
                id="defaultProvider"
                value={defaultProvider}
                onChange={(e) => setDefaultProvider(e.target.value as "smtp" | "resend" | "mysmtp")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="resend">Resend</option>
                <option value="smtp">SMTP</option>
                <option value="mysmtp">MySMTP</option>
              </select>
              {effective && (
                <p className="text-xs text-muted-foreground">
                  Effective: <span className="font-medium">{effective.defaultProvider}</span>
                  {isOverridden("defaultProvider") && (
                    <Badge variant="outline" className="ml-2 text-[10px]">overridden</Badge>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultFrom">Default From Address</Label>
              <Input
                id="defaultFrom"
                type="email"
                value={defaultFrom}
                onChange={(e) => setDefaultFrom(e.target.value)}
                placeholder={effective?.defaultFrom ?? "noreply@resend.dev"}
              />
              {effective && (
                <p className="text-xs text-muted-foreground">
                  Effective: <span className="font-medium">{effective.defaultFrom}</span>
                  {isOverridden("defaultFrom") && (
                    <Badge variant="outline" className="ml-2 text-[10px]">overridden</Badge>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resendApiKey">Resend API Key</Label>
              <Input
                id="resendApiKey"
                type="password"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder={stored.resendApiKey ? stored.resendApiKey : "Set to override env var"}
              />
              {stored.resendApiKey && (
                <p className="text-xs text-muted-foreground">
                  Currently set: <span className="font-mono">{stored.resendApiKey}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mysmtpApiKey">MySMTP API Key</Label>
              <Input
                id="mysmtpApiKey"
                type="password"
                value={mysmtpApiKey}
                onChange={(e) => setMysmtpApiKey(e.target.value)}
                placeholder={stored.mysmtpApiKey ? stored.mysmtpApiKey : "Set to override env var"}
              />
              {stored.mysmtpApiKey && (
                <p className="text-xs text-muted-foreground">
                  Currently set: <span className="font-mono">{stored.mysmtpApiKey}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mysmtpApiUrl">MySMTP API URL</Label>
            <Input
              id="mysmtpApiUrl"
              type="url"
              value={mysmtpApiUrl}
              onChange={(e) => setMysmtpApiUrl(e.target.value)}
              placeholder={effective?.mysmtpApiUrl ?? "https://my.smtp.com/api/v1"}
            />
            {effective && (
              <p className="text-xs text-muted-foreground">
                Effective: <span className="font-medium">{effective.mysmtpApiUrl}</span>
                {isOverridden("mysmtpApiUrl") && (
                  <Badge variant="outline" className="ml-2 text-[10px]">overridden</Badge>
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Send Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bulk Send Defaults</CardTitle>
          <CardDescription>Default settings for bulk email campaigns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rateLimit">Rate Limit (per minute)</Label>
              <Input
                id="rateLimit"
                type="number"
                min={1}
                max={1000}
                value={defaultRateLimit}
                onChange={(e) => setDefaultRateLimit(e.target.value)}
                placeholder={String(effective?.defaultRateLimitPerMinute ?? 60)}
              />
              {effective && (
                <p className="text-xs text-muted-foreground">
                  Effective: <span className="font-medium">{effective.defaultRateLimitPerMinute}</span>
                  {isOverridden("defaultRateLimitPerMinute") && (
                    <Badge variant="outline" className="ml-2 text-[10px]">overridden</Badge>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchSize">Batch Size</Label>
              <Input
                id="batchSize"
                type="number"
                min={1}
                max={100}
                value={defaultBatchSize}
                onChange={(e) => setDefaultBatchSize(e.target.value)}
                placeholder={String(effective?.defaultBatchSize ?? 10)}
              />
              {effective && (
                <p className="text-xs text-muted-foreground">
                  Effective: <span className="font-medium">{effective.defaultBatchSize}</span>
                  {isOverridden("defaultBatchSize") && (
                    <Badge variant="outline" className="ml-2 text-[10px]">overridden</Badge>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delayMs">Delay Between Batches (ms)</Label>
              <Input
                id="delayMs"
                type="number"
                min={100}
                max={60000}
                value={defaultDelayMs}
                onChange={(e) => setDefaultDelayMs(e.target.value)}
                placeholder={String(effective?.defaultDelayMs ?? 1000)}
              />
              {effective && (
                <p className="text-xs text-muted-foreground">
                  Effective: <span className="font-medium">{effective.defaultDelayMs}</span>
                  {isOverridden("defaultDelayMs") && (
                    <Badge variant="outline" className="ml-2 text-[10px]">overridden</Badge>
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tracking Settings</CardTitle>
          <CardDescription>Configure email open and click tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="trackingEnabled">Enable Tracking by Default</Label>
              <p className="text-xs text-muted-foreground">
                Inject tracking pixel and link wrappers in outgoing emails
              </p>
            </div>
            <Switch
              id="trackingEnabled"
              checked={trackingEnabled}
              onCheckedChange={setTrackingEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingDomain">Tracking Domain</Label>
            <Input
              id="trackingDomain"
              type="url"
              value={trackingDomain}
              onChange={(e) => setTrackingDomain(e.target.value)}
              placeholder={effective?.trackingDomain || "https://your-domain.com"}
            />
            {effective && effective.trackingDomain && (
              <p className="text-xs text-muted-foreground">
                Effective: <span className="font-medium">{effective.trackingDomain}</span>
                {isOverridden("trackingDomain") && (
                  <Badge variant="outline" className="ml-2 text-[10px]">overridden</Badge>
                )}
              </p>
            )}
            {(!effective || !effective.trackingDomain) && (
              <p className="text-xs text-muted-foreground">Not configured. Set a tracking domain to enable open/click tracking.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  )
}
