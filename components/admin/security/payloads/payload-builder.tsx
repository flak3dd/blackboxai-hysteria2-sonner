"use client"
import { apiFetch } from "@/lib/api/fetch"

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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  ArrowRight,
  ArrowLeft,
  Download,
  Trash2,
  RefreshCw,
  FileCode2,
  Shield,
  Settings,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
} from "lucide-react"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PayloadStatus = "pending" | "building" | "ready" | "failed"
type BuildStep = "basic" | "platform" | "obfuscation" | "packing" | "review"

interface PayloadConfig {
  name: string
  type: string
  description: string
  platform: string
  packingMethod: string
  compressionLevel: number
  obfuscation: boolean
  antiAnalysis: boolean
  obfuscationLevel: string
  obfuscationTechniques: {
    amsi_bypass: boolean
    etw_bypass: boolean
    string_encode: boolean
    variable_rename: boolean
  }
}

interface BuildProgress {
  step: string
  progress: number
  status: "pending" | "running" | "completed" | "failed"
  message: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PayloadBuilder() {
  const [currentStep, setCurrentStep] = useState<BuildStep>("basic")
  const [config, setConfig] = useState<PayloadConfig>({
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
  const [building, setBuilding] = useState(false)
  const [buildProgress, setBuildProgress] = useState<BuildProgress[]>([])
  const [buildLogs, setBuildLogs] = useState<string[]>([])
  const [generatedPayload, setGeneratedPayload] = useState<any>(null)

  const steps: { id: BuildStep; label: string; icon: React.ReactNode }[] = [
    { id: "basic", label: "Basic Info", icon: <Settings className="h-4 w-4" /> },
    { id: "platform", label: "Platform", icon: <FileCode2 className="h-4 w-4" /> },
    { id: "obfuscation", label: "Obfuscation", icon: <Shield className="h-4 w-4" /> },
    { id: "packing", label: "Packing", icon: <Package className="h-4 w-4" /> },
    { id: "review", label: "Review", icon: <CheckCircle2 className="h-4 w-4" /> },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id)
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id)
    }
  }

  const handleBuild = async () => {
    if (!config.name.trim()) {
      toast.error("Payload name is required")
      return
    }

    setBuilding(true)
    setBuildProgress([
      { step: "validation", progress: 0, status: "pending", message: "Validating configuration..." },
      { step: "compilation", progress: 0, status: "pending", message: "Compiling payload..." },
      { step: "obfuscation", progress: 0, status: "pending", message: "Applying obfuscation..." },
      { step: "packing", progress: 0, status: "pending", message: "Packing binary..." },
      { step: "finalization", progress: 0, status: "pending", message: "Finalizing build..." },
    ])
    setBuildLogs([])

    try {
      const payloadConfig = {
        hysteriaConfig: {
          server: "auto-detect",
          auth: "auto-generate",
        },
        platform: config.platform,
        packing: {
          method: config.packingMethod,
          compressionLevel: config.packingMethod !== "none" ? config.compressionLevel : undefined,
        },
        obfuscation: {
          enabled: config.obfuscation,
          level: config.obfuscationLevel,
          techniques: config.obfuscation
            ? Object.entries(config.obfuscationTechniques)
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
          antiAnalysis: config.antiAnalysis,
        },
      }

      // Simulate build progress
      await simulateBuildProgress()

      const response = await apiFetch("/api/admin/security/payloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: config.name,
          type: config.type,
          description: config.description,
          config: payloadConfig,
        }),
      })

      if (!response.ok) throw new Error("Failed to create payload build")

      const build = await response.json()
      setGeneratedPayload(build)

      const buildResponse = await apiFetch(`/api/admin/security/payloads/${build.id}/build`, {
        method: "POST",
      })

      if (!buildResponse.ok) throw new Error("Failed to start build")

      toast.success("Payload built successfully", {
        description: `${config.name} is ready for download`,
      })
    } catch (error) {
      console.error("Failed to build payload:", error)
      toast.error("Failed to build payload")
      setBuildProgress((prev) =>
        prev.map((p) => ({ ...p, status: "failed" as const, message: "Build failed" }))
      )
    } finally {
      setBuilding(false)
    }
  }

  const simulateBuildProgress = async () => {
    const steps = ["validation", "compilation", "obfuscation", "packing", "finalization"]
    const messages = [
      "Validating configuration...",
      "Compiling source code...",
      "Applying obfuscation techniques...",
      "Compressing and packing binary...",
      "Finalizing payload...",
    ]

    for (let i = 0; i < steps.length; i++) {
      setBuildProgress((prev) =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: "running" as const, message: messages[i] } : p
        )
      )
      setBuildLogs((prev) => [...prev, `[${new Date().toISOString()}] ${messages[i]}`])

      await new Promise((resolve) => setTimeout(resolve, 1000))

      for (let progress = 20; progress <= 100; progress += 20) {
        setBuildProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, progress, status: "running" as const } : p
          )
        )
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      setBuildProgress((prev) =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: "completed" as const, message: `${messages[i]} Complete` } : p
        )
      )
      setBuildLogs((prev) => [...prev, `[${new Date().toISOString()}] ${messages[i]} Complete`])
    }
  }

  const handleDownload = () => {
    if (generatedPayload?.downloadUrl) {
      window.open(generatedPayload.downloadUrl, "_blank")
      toast.success("Download started")
    }
  }

  const handleReset = () => {
    setCurrentStep("basic")
    setConfig({
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
    setBuildProgress([])
    setBuildLogs([])
    setGeneratedPayload(null)
  }

  const getObfuscationPreview = () => {
    const techniques = Object.entries(config.obfuscationTechniques)
      .filter(([_, enabled]) => enabled)
      .map(([tech]) => tech.replace(/_/g, " ").toUpperCase())

    return {
      level: config.obfuscationLevel,
      techniques,
      estimatedOverhead: config.obfuscationLevel === "light" ? "5-10%" : config.obfuscationLevel === "medium" ? "10-25%" : "25-40%",
      detectionEvasion: config.obfuscationLevel === "light" ? "Low" : config.obfuscationLevel === "medium" ? "Medium" : "High",
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-heading-xl">Advanced Payload Builder</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Configure and build custom payloads with advanced obfuscation and packing options.
        </p>
      </div>

      {/* Step Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      index <= currentStepIndex
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted bg-background text-muted-foreground"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-16 ${
                      index < currentStepIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStepIndex].label}</CardTitle>
              <CardDescription>
                {currentStep === "basic" && "Enter basic payload information"}
                {currentStep === "platform" && "Configure platform-specific settings"}
                {currentStep === "obfuscation" && "Set up obfuscation techniques"}
                {currentStep === "packing" && "Configure binary packing options"}
                {currentStep === "review" && "Review your configuration before building"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep === "basic" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pb-name">Payload Name *</Label>
                    <Input
                      id="pb-name"
                      placeholder="e.g. Corp-Win-Stager-v2"
                      value={config.name}
                      onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payload Type</Label>
                    <Select
                      value={config.type}
                      onValueChange={(v) => setConfig((c) => ({ ...c, type: v ?? c.type }))}
                    >
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
                    <Label htmlFor="pb-desc">Description</Label>
                    <Textarea
                      id="pb-desc"
                      placeholder="e.g. Corporate stager for initial access with enhanced evasion"
                      value={config.description}
                      onChange={(e) => setConfig((c) => ({ ...c, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </>
              )}

              {currentStep === "platform" && (
                <>
                  <div className="space-y-2">
                    <Label>Target Platform</Label>
                    <Select
                      value={config.platform}
                      onValueChange={(v) => setConfig((c) => ({ ...c, platform: v ?? c.platform }))}
                    >
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

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body-sm font-medium">Anti-Analysis</p>
                      <p className="text-caption text-muted-foreground">
                        VM / debugger / sandbox detection
                      </p>
                    </div>
                    <Switch
                      checked={config.antiAnalysis}
                      onCheckedChange={(v) => setConfig((c) => ({ ...c, antiAnalysis: !!v }))}
                    />
                  </div>

                  {config.platform === "windows" && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Windows-specific:</strong> Supports AMSI/ETW bypass, process injection, and token manipulation.
                      </p>
                    </div>
                  )}

                  {config.platform === "linux" && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Linux-specific:</strong> Supports LD_PRELOAD injection, shared object loading, and ptrace anti-debugging.
                      </p>
                    </div>
                  )}

                  {config.platform === "macos" && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>macOS-specific:</strong> Supports dylib injection, Mach-O binary manipulation, and SIP bypass techniques.
                      </p>
                    </div>
                  )}
                </>
              )}

              {currentStep === "obfuscation" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body-sm font-medium">Code Obfuscation</p>
                      <p className="text-caption text-muted-foreground">
                        Apply binary obfuscation techniques
                      </p>
                    </div>
                    <Switch
                      checked={config.obfuscation}
                      onCheckedChange={(v) => setConfig((c) => ({ ...c, obfuscation: !!v }))}
                    />
                  </div>

                  {config.obfuscation && (
                    <>
                      <div className="space-y-2">
                        <Label>Obfuscation Level</Label>
                        <Select
                          value={config.obfuscationLevel}
                          onValueChange={(v) => setConfig((c) => ({ ...c, obfuscationLevel: v ?? c.obfuscationLevel }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light - Minimal overhead (5-10%)</SelectItem>
                            <SelectItem value="medium">Medium - Balanced (10-25%)</SelectItem>
                            <SelectItem value="heavy">Heavy - Maximum stealth (25-40%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Obfuscation Techniques</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="pb-amsi-bypass"
                              checked={config.obfuscationTechniques.amsi_bypass}
                              onCheckedChange={(checked) =>
                                setConfig((c) => ({
                                  ...c,
                                  obfuscationTechniques: {
                                    ...c.obfuscationTechniques,
                                    amsi_bypass: !!checked,
                                  },
                                }))
                              }
                            />
                            <Label htmlFor="pb-amsi-bypass" className="text-sm font-normal cursor-pointer">
                              AMSI Bypass (Anti-Malware Scan Interface)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="pb-etw-bypass"
                              checked={config.obfuscationTechniques.etw_bypass}
                              onCheckedChange={(checked) =>
                                setConfig((c) => ({
                                  ...c,
                                  obfuscationTechniques: {
                                    ...c.obfuscationTechniques,
                                    etw_bypass: !!checked,
                                  },
                                }))
                              }
                            />
                            <Label htmlFor="pb-etw-bypass" className="text-sm font-normal cursor-pointer">
                              ETW Bypass (Event Tracing for Windows)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="pb-string-encode"
                              checked={config.obfuscationTechniques.string_encode}
                              onCheckedChange={(checked) =>
                                setConfig((c) => ({
                                  ...c,
                                  obfuscationTechniques: {
                                    ...c.obfuscationTechniques,
                                    string_encode: !!checked,
                                  },
                                }))
                              }
                            />
                            <Label htmlFor="pb-string-encode" className="text-sm font-normal cursor-pointer">
                              String Encoding
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="pb-variable-rename"
                              checked={config.obfuscationTechniques.variable_rename}
                              onCheckedChange={(checked) =>
                                setConfig((c) => ({
                                  ...c,
                                  obfuscationTechniques: {
                                    ...c.obfuscationTechniques,
                                    variable_rename: !!checked,
                                  },
                                }))
                              }
                            />
                            <Label htmlFor="pb-variable-rename" className="text-sm font-normal cursor-pointer">
                              Variable Renaming
                            </Label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {currentStep === "packing" && (
                <>
                  <div className="space-y-2">
                    <Label>Packing Method</Label>
                    <p className="text-caption text-muted-foreground">
                      Compress and pack the payload to reduce size and evade detection
                    </p>
                    <Select
                      value={config.packingMethod}
                      onValueChange={(v) => setConfig((c) => ({ ...c, packingMethod: v ?? c.packingMethod }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Packing</SelectItem>
                        <SelectItem value="upx">UPX (Ultimate Packer for eXecutables)</SelectItem>
                        <SelectItem value="custom">Custom Packer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {config.packingMethod !== "none" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Compression Level</Label>
                        <span className="text-sm text-muted-foreground">{config.compressionLevel}</span>
                      </div>
                      <Slider
                        min={1}
                        max={9}
                        step={1}
                        value={[config.compressionLevel]}
                        onValueChange={(value) => setConfig((c) => ({ ...c, compressionLevel: value[0] }))}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Fast</span>
                        <span>Best</span>
                      </div>
                    </div>
                  )}

                  {config.packingMethod === "upx" && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>UPX:</strong> High-performance executable packer. Compression levels 1-3 are faster, 7-9 provide better compression but slower unpacking.
                      </p>
                    </div>
                  )}

                  {config.packingMethod === "custom" && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Custom Packer:</strong> Uses proprietary packing algorithms with anti-unpacking tricks and custom stubs.
                      </p>
                    </div>
                  )}
                </>
              )}

              {currentStep === "review" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Payload Name</Label>
                      <p className="font-medium">{config.name || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p className="font-medium">{config.type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Platform</Label>
                      <p className="font-medium">{config.platform}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Packing</Label>
                      <p className="font-medium">
                        {config.packingMethod === "none"
                          ? "None"
                          : `${config.packingMethod} (Level ${config.compressionLevel})`}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground">Obfuscation</Label>
                    <div className="mt-2 space-y-2">
                      <Badge variant={config.obfuscation ? "default" : "outline"}>
                        {config.obfuscation ? "Enabled" : "Disabled"}
                      </Badge>
                      {config.obfuscation && (
                        <>
                          <Badge variant="secondary">{config.obfuscationLevel}</Badge>
                          {Object.entries(config.obfuscationTechniques)
                            .filter(([_, enabled]) => enabled)
                            .map(([tech]) => (
                              <Badge key={tech} variant="outline">{tech}</Badge>
                            ))}
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground">Anti-Analysis</Label>
                    <p className="font-medium">{config.antiAnalysis ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0 || building}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {currentStep === "review" ? (
                  <Button onClick={handleBuild} disabled={building || !config.name.trim()}>
                    {building ? "Building..." : "Build Payload"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleNext} disabled={building}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Real-time Preview */}
          {config.obfuscation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Obfuscation Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Level</span>
                  <Badge variant="secondary">{getObfuscationPreview().level}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Est. Overhead</span>
                  <span className="text-sm font-medium">{getObfuscationPreview().estimatedOverhead}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Detection Evasion</span>
                  <Badge
                    variant={
                      getObfuscationPreview().detectionEvasion === "High"
                        ? "default"
                        : getObfuscationPreview().detectionEvasion === "Medium"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {getObfuscationPreview().detectionEvasion}
                  </Badge>
                </div>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground">Active Techniques</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {getObfuscationPreview().techniques.length > 0 ? (
                      getObfuscationPreview().techniques.map((tech) => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">None selected</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Build Progress */}
          {(building || buildProgress.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${building ? "animate-spin" : ""}`} />
                  Build Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {buildProgress.map((step, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{step.message}</span>
                      {step.status === "completed" && (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                      {step.status === "failed" && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      {step.status === "running" && (
                        <Clock className="h-4 w-4 text-warning animate-pulse" />
                      )}
                    </div>
                    <Progress value={step.progress}>
                      <ProgressTrack>
                        <ProgressIndicator style={{ width: `${step.progress}%` }} />
                      </ProgressTrack>
                    </Progress>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Build Logs */}
          {(building || buildLogs.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Build Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs">
                  {buildLogs.length > 0 ? (
                    buildLogs.map((log, index) => (
                      <div key={index} className="text-muted-foreground">
                        {log}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No logs yet...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download Management */}
          {generatedPayload && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payload Ready</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Build successful</span>
                </div>
                <Button onClick={handleDownload} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Payload
                </Button>
                <Button onClick={handleReset} variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Build Another
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}