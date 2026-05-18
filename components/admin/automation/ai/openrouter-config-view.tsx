"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Save,
  Key,
  Globe,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Settings2,
} from "lucide-react"

export function OpenRouterConfigView() {
  const [config, setConfig] = useState({
    apiKey: "",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "",
    enableStreaming: true,
    streamingChunkSize: 1024,
    timeout: 30000,
    maxRetries: 3,
    fallbackEnabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/admin/automation/ai/openrouter/config", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setConfig(data.config || config)
    } catch (err) {
      toast.error("Failed to load OpenRouter configuration", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/automation/ai/openrouter/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("OpenRouter configuration saved")
    } catch (err) {
      toast.error("Failed to save configuration", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/admin/automation/ai/openrouter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
        }),
      })
      const data = await res.json()
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "Connection successful" : "Connection failed"),
      })
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  if (loading) {
    return <div className="p-6">Loading configuration...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-heading-lg">OpenRouter Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Configure OpenRouter API settings and preferences
        </p>
      </div>

      {/* Configuration Form */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Settings
            </CardTitle>
            <CardDescription>
              Configure your OpenRouter API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-or-..."
              />
              <p className="text-xs text-muted-foreground">
                Your OpenRouter API key. Get one from{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder="https://openrouter.ai/api/v1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultModel">Default Model</Label>
              <Input
                id="defaultModel"
                value={config.defaultModel}
                onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                placeholder="anthropic/claude-3.5-sonnet"
              />
              <p className="text-xs text-muted-foreground">
                Default model to use when no model is specified
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance Settings
            </CardTitle>
            <CardDescription>
              Configure performance and streaming options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Streaming</Label>
                <p className="text-xs text-muted-foreground">
                  Stream responses in real-time
                </p>
              </div>
              <Switch
                checked={config.enableStreaming}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, enableStreaming: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="streamingChunkSize">Streaming Chunk Size</Label>
              <Input
                id="streamingChunkSize"
                type="number"
                min="1"
                max="8192"
                value={config.streamingChunkSize}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    streamingChunkSize: parseInt(e.target.value) || 1024,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Size of streaming chunks (1-8192 bytes)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                min="1000"
                max="300000"
                value={config.timeout}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    timeout: parseInt(e.target.value) || 30000,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRetries">Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min="0"
                max="10"
                value={config.maxRetries}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    maxRetries: parseInt(e.target.value) || 3,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Fallback</Label>
                <p className="text-xs text-muted-foreground">
                  Fall back to other providers on failure
                </p>
              </div>
              <Switch
                checked={config.fallbackEnabled}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, fallbackEnabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Test Connection
          </CardTitle>
          <CardDescription>
            Verify your OpenRouter API credentials are working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Button
              onClick={testConnection}
              disabled={testing || !config.apiKey}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>

            {testResult && (
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span
                  className={
                    testResult.success ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                  }
                >
                  {testResult.message}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  )
}