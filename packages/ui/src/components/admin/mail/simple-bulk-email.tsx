/**
 * Simplified Bulk Email Component
 * 
 * A clean, focused interface for bulk email sending:
 * - CSV paste area
 * - Subject and body fields
 * - Provider selection
 * - Progress tracking
 * - Basic error handling
 */

"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function SimpleBulkEmail() {
  const [csvContent, setCsvContent] = useState("")
  const [subject, setSubject] = useState("Hello {{name}}")
  const [body, setBody] = useState(
    "Hi {{firstName}},\n\nThis is a personalized message for you.\n\nBest regards"
  )
  const [provider, setProvider] = useState<"smtp" | "resend" | "mysmtp">("smtp")
  const [rateLimit, setRateLimit] = useState("60")
  const [sending, setSending] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<any>(null)
  const [sendResult, setSendResult] = useState<any>(null)
  const [progress, setProgress] = useState({ sent: 0, total: 0, failed: 0 })

  const handleDryRun = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste CSV content")
      return
    }

    setSending(true)
    setDryRunResult(null)
    try {
      const response = await fetch("/api/admin/mail/simple-bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent,
          subject,
          body,
          provider,
          rateLimitPerMinute: Number(rateLimit),
          dryRun: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Dry run failed")
      }

      const data = await response.json()
      setDryRunResult(data)
      toast.success("Dry run complete", {
        description: `${data.summary.validEmails} valid emails`,
      })
    } catch (error) {
      toast.error("Dry run failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSending(false)
    }
  }

  const handleSend = async () => {
    if (!dryRunResult || dryRunResult.summary.validEmails === 0) {
      toast.error("Please run a dry run first")
      return
    }

    if (!confirm(`Send emails to ${dryRunResult.summary.validEmails} recipients?`)) {
      return
    }

    setSending(true)
    setSendResult(null)
    try {
      const response = await fetch("/api/admin/mail/simple-bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent,
          subject,
          body,
          provider,
          rateLimitPerMinute: Number(rateLimit),
          dryRun: false,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Send failed")
      }

      const data = await response.json()
      setSendResult(data)
      toast.success("Bulk email send completed", {
        description: `${data.result.sent} sent, ${data.result.failed} failed`,
      })
    } catch (error) {
      toast.error("Send failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSending(false)
    }
  }

  const handleReset = () => {
    setCsvContent("")
    setSubject("Hello {{name}}")
    setBody("Hi {{firstName}},\n\nThis is a personalized message for you.\n\nBest regards")
    setDryRunResult(null)
    setSendResult(null)
    setProgress({ sent: 0, total: 0, failed: 0 })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simplified Bulk Email</CardTitle>
          <CardDescription>
            Send personalized emails to multiple recipients using CSV data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CSV Input */}
          <div className="space-y-2">
            <Label>Recipients (CSV)</Label>
            <Textarea
              placeholder="firstName,lastName,email&#10;John,Doe,john@example.com&#10;Jane,Smith,jane@example.com"
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Format: firstName,lastName,email (header optional)
            </p>
          </div>

          {/* Email Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Hello {{name}}"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Variables: {`{{firstName}}`} {`{{lastName}}`} {`{{name}}`} {`{{email}}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                placeholder="Hi {{firstName}},..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(value: any) => setProvider(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="mysmtp">MySMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rate Limit (emails/min)</Label>
              <Input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                min="1"
                max="1000"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleDryRun} disabled={sending} variant="outline">
              {sending ? "Validating..." : "Dry Run"}
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !dryRunResult}
              className="flex-1"
            >
              {sending ? "Sending..." : "Send Emails"}
            </Button>
            <Button onClick={handleReset} disabled={sending} variant="ghost">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dry Run Results */}
      {dryRunResult && (
        <Card>
          <CardHeader>
            <CardTitle>Dry Run Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Recipients</p>
                <p className="text-2xl font-bold">{dryRunResult.summary.totalRecipients}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valid Emails</p>
                <p className="text-2xl font-bold text-green-600">
                  {dryRunResult.summary.validEmails}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invalid Emails</p>
                <p className="text-2xl font-bold text-red-600">
                  {dryRunResult.summary.invalidEmails}
                </p>
              </div>
            </div>

            {dryRunResult.invalidDetails?.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Invalid Emails (first 20):</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {dryRunResult.invalidDetails.map((item: any, idx: number) => (
                    <div key={idx} className="text-sm flex justify-between">
                      <span className="font-mono">{item.email}</span>
                      <Badge variant="destructive">{item.reason}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dryRunResult.sampleRecipients?.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Sample Recipients:</p>
                <div className="space-y-1">
                  {dryRunResult.sampleRecipients.map((recipient: any, idx: number) => (
                    <div key={idx} className="text-sm font-mono">
                      {recipient.firstName} {recipient.lastName} ({recipient.email})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Results */}
      {sendResult && (
        <Card>
          <CardHeader>
            <CardTitle>Send Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-green-600">{sendResult.result.sent}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{sendResult.result.failed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">
                  {Math.round(sendResult.result.durationMs / 1000)}s
                </p>
              </div>
            </div>

            {sendResult.result.errors?.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Errors (first 20):</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {sendResult.result.errors.slice(0, 20).map((error: any, idx: number) => (
                    <div key={idx} className="text-sm flex justify-between">
                      <span className="font-mono">{error.email}</span>
                      <span className="text-red-600">{error.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
