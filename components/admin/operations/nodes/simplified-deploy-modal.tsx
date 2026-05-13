"use client"
import { apiFetch } from "@/lib/api/fetch"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DeploymentStep = "landing" | "provider" | "config" | "review" | "deploying" | "complete" | "error"
type DeploymentMode = "simple" | "preset" | "batch"

type ProviderConfig = {
  id: string
  label: string
  regions: { id: string; label: string }[]
  sizes: { id: string; label: string; price: string }[]
}

type BuildPreset = {
  id: string
  name: string
  description: string
  config: {
    provider: string
    regions: string[]
    size: string
    port: number
    tags: string[]
    bandwidth?: { up?: string; down?: string }
    obfsEnabled: boolean
  }
}

type DeploymentProgress = {
  step: string
  status: "pending" | "running" | "completed" | "failed"
  message: string
  timestamp: number
  error?: string
}

export function SimplifiedDeployModal({ onClose, onDeployed }: { onClose: () => void; onDeployed: () => void }) {
  const [currentStep, setCurrentStep] = useState<DeploymentStep>("landing")
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>("simple")
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [presets, setPresets] = useState<BuildPreset[]>([])
  const [loading, setLoading] = useState(true)

  // Form state - simplified to essential fields
  const [provider, setProvider] = useState("hetzner")
  const [region, setRegion] = useState("")
  const [size, setSize] = useState("")
  const [nodeName, setNodeName] = useState("")
  const [port, setPort] = useState("443")
  const [selectedPreset, setSelectedPreset] = useState<BuildPreset | null>(null)

  // Advanced options (hidden by default)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [domain, setDomain] = useState("")
  const [obfsPassword, setObfsPassword] = useState("")
  const [bandwidthUp, setBandwidthUp] = useState("")
  const [bandwidthDown, setBandwidthDown] = useState("")
  const [tags, setTags] = useState("")
  const [resourceGroup, setResourceGroup] = useState("")

  // Deployment state
  const [deploymentId, setDeploymentId] = useState<string | null>(null)
  const [progress, setProgress] = useState<DeploymentProgress[]>([])
  const [finalStatus, setFinalStatus] = useState<{ ip?: string; nodeId?: string } | null>(null)

  // Load providers and presets
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load providers
        const res = await apiFetch("/api/admin/operations/deploy/presets", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setProviders(data.presets ?? [])
          if (data.presets?.length > 0) {
            setProvider(data.presets[0].id)
            setRegion(data.presets[0].regions?.[0]?.id || "")
            setSize(data.presets[0].sizes?.[0]?.id || "")
          }
        }

        // Load build presets
        const presetRes = await apiFetch("/api/admin/operations/deploy/build-presets", { 
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
          cache: "no-store"
        })
        if (presetRes.ok) {
          const presetData = await presetRes.json()
          setPresets(presetData.presets ?? [])
        }
      } catch {
        console.error("Failed to load deployment data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const currentProvider = providers.find(p => p.id === provider)

  // Step navigation
  const nextStep = () => {
    const steps: DeploymentStep[] = ["provider", "config", "review", "deploying", "complete", "error"]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const steps: DeploymentStep[] = ["provider", "config", "review", "deploying", "complete", "error"]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  // Handle batch deployment
  const handleBatchDeploy = async () => {
    try {
      toast.info("Starting batch deployment of 5 nodes...")
      const res = await apiFetch("/api/admin/operations/deploy/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error ?? "Batch deployment failed")
      }

      const data = await res.json()
      const started = data.results.filter((r: { status: string }) => r.status === "started").length

      if (started > 0) {
        toast.success(`Started ${started} nodes deploying!`, { description: "Check Infrastructure tab for status" })
        onClose()
        onDeployed()
      } else {
        toast.error("Batch deployment failed")
      }
    } catch (err) {
      toast.error("Batch deploy failed", { description: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  // Handle preset deployment
  const handlePresetDeploy = async () => {
    if (!selectedPreset) return
    
    setCurrentStep("deploying")
    setProgress([])

    try {
      const panelUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const res = await apiFetch("/api/admin/operations/deploy/one-click", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId: selectedPreset.id }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error ?? `${res.status}`)
      }

      const data = await res.json()
      const started = data.results.filter((r: { status: string }) => r.status === "started").length

      if (started > 0) {
        toast.success(`Started ${started} of ${selectedPreset.config.regions.length} nodes deploying!`)
        setCurrentStep("complete")
        setFinalStatus({ nodes: started })
        onClose()
        onDeployed()
      } else {
        setCurrentStep("error")
        toast.error("Preset deployment failed")
      }
    } catch (err) {
      setCurrentStep("error")
      toast.error("Preset deploy failed", { description: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  // Start deployment
  const startDeployment = async () => {
    setCurrentStep("deploying")
    setProgress([])

    try {
      const panelUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const res = await apiFetch("/api/admin/operations/deploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: provider,
          region,
          size,
          name: nodeName.trim(),
          domain: domain.trim() || undefined,
          port: parseInt(port) || 443,
          obfsPassword: obfsPassword.trim() || undefined,
          bandwidthUp: bandwidthUp.trim() || undefined,
          bandwidthDown: bandwidthDown.trim() || undefined,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
          resourceGroup: resourceGroup.trim() || undefined,
          panelUrl,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error ?? `${res.status}`)
      }

      const data = await res.json()
      const id = data.deployment?.id
      if (!id) throw new Error("No deployment ID returned")
      setDeploymentId(id)

      // Subscribe to progress
      const eventSource = new EventSource(`/api/admin/operations/deploy/${id}/stream`)
      
      eventSource.onmessage = (event) => {
        try {
          const step = JSON.parse(event.data)
          if (step.done) {
            eventSource.close()
            return
          }
          
          setProgress(prev => [...prev, {
            step: step.status || "unknown",
            status: "completed",
            message: step.message,
            timestamp: Date.now(),
          }])

          if (step.status === "completed") {
            setFinalStatus({ ip: step.ip, nodeId: step.nodeId })
            setCurrentStep("complete")
            eventSource.close()
            toast.success("Deployment completed successfully!")
          } else if (step.status === "failed") {
            setCurrentStep("error")
            setProgress(prev => [...prev, {
              step: "failed",
              status: "failed",
              message: step.message,
              timestamp: Date.now(),
              error: step.error,
            }])
            eventSource.close()
            toast.error("Deployment failed")
          }
        } catch {
          // Ignore parse errors
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        if (currentStep === "deploying") {
          setCurrentStep("error")
        }
      }
    } catch (err) {
      setCurrentStep("error")
      toast.error("Deployment failed", { description: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  // Render functions for each step
  const renderStep = () => {
    switch (currentStep) {
      case "landing":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">How would you like to deploy?</h3>
              <p className="text-sm text-muted-foreground">Choose the deployment method that fits your needs</p>
            </div>

            <div className="grid gap-4">
              {/* Simple Deployment */}
              <button
                onClick={() => { setDeploymentMode("simple"); setCurrentStep("provider") }}
                className="p-4 border rounded-lg hover:bg-accent text-left transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🚀</div>
                  <div>
                    <div className="font-semibold">Quick Deploy</div>
                    <div className="text-sm text-muted-foreground">
                      Deploy a single node with minimal configuration. Perfect for getting started quickly.
                    </div>
                  </div>
                </div>
              </button>

              {/* Preset Deployment */}
              <button
                onClick={() => { setDeploymentMode("preset"); setCurrentStep("provider") }}
                className="p-4 border rounded-lg hover:bg-accent text-left transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚙️</div>
                  <div>
                    <div className="font-semibold">Preset Deploy</div>
                    <div className="text-sm text-muted-foreground">
                      Use pre-configured build presets for optimized deployments. One-click multi-region setup.
                    </div>
                  </div>
                </div>
              </button>

              {/* Batch Deployment */}
              <button
                onClick={() => handleBatchDeploy()}
                className="p-4 border rounded-lg hover:bg-accent text-left transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📦</div>
                  <div>
                    <div className="font-semibold">Batch Deploy</div>
                    <div className="text-sm text-muted-foreground">
                      Deploy 5 nodes simultaneously across different regions. For production setups.
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )

      case "provider":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {deploymentMode === "simple" ? "Step 1: Choose Provider & Region" : "Step 1: Choose Build Preset"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {deploymentMode === "simple" 
                  ? "Select where you want to deploy your Hysteria2 node"
                  : "Select a pre-configured preset for optimized deployment"}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-4">
                {deploymentMode === "preset" ? (
                  /* Preset Selection */
                  <div>
                    <label className="block text-sm font-medium mb-2">Build Preset</label>
                    <div className="space-y-2">
                      {presets.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => { setSelectedPreset(preset); setCurrentStep("review") }}
                          className="w-full p-3 border rounded-lg hover:bg-accent text-left transition"
                        >
                          <div className="font-semibold">{preset.name}</div>
                          <div className="text-sm text-muted-foreground">{preset.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {preset.config.regions.length} regions • {preset.config.provider}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Simple Provider Selection */
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Cloud Provider</label>
                      <select 
                        value={provider} 
                        onChange={(e) => {
                          setProvider(e.target.value)
                          const newProvider = providers.find(p => p.id === e.target.value)
                          if (newProvider) {
                            setRegion(newProvider.regions[0]?.id || "")
                            setSize(newProvider.sizes[0]?.id || "")
                          }
                        }}
                        className="w-full p-3 border rounded-md bg-background"
                      >
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    {currentProvider && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Region</label>
                          <select 
                            value={region} 
                            onChange={(e) => setRegion(e.target.value)}
                            className="w-full p-3 border rounded-md bg-background"
                          >
                            {currentProvider.regions.map(r => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Server Size</label>
                          <select 
                            value={size} 
                        onChange={(e) => setSize(e.target.value)}
                            className="w-full p-3 border rounded-md bg-background"
                          >
                            {currentProvider.sizes.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.label} ({s.price})
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep("landing")}>← Back</Button>
              {deploymentMode === "simple" && (
                <Button onClick={nextStep} disabled={loading || !region || !size}>
                  Next: Configure →
                </Button>
              )}
            </div>
          </div>
        )

      case "config":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Step 2: Basic Configuration</h3>
              <p className="text-sm text-muted-foreground">Configure your node with minimal required settings</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Node Name *</label>
                <input 
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="w-full p-3 border rounded-md bg-background"
                  placeholder="e.g., hysteria-west-01"
                />
                <p className="text-xs text-muted-foreground mt-1">A unique name for your node</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Port</label>
                <input 
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full p-3 border rounded-md bg-background"
                  type="number"
                  placeholder="443"
                />
                <p className="text-xs text-muted-foreground mt-1">Default 443 for HTTPS masquerading</p>
              </div>

              {/* Advanced Options Toggle */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <span>{showAdvanced ? "▼" : "▶"}</span>
                  <span>Advanced Options {showAdvanced ? "(shown)" : "(hidden)"}</span>
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium mb-2">Domain (optional)</label>
                    <input 
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full p-3 border rounded-md bg-background"
                      placeholder="proxy.example.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">For Let's Encrypt SSL certificates</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Obfuscation Password (optional)</label>
                    <input 
                      value={obfsPassword}
                      onChange={(e) => setObfsPassword(e.target.value)}
                      className="w-full p-3 border rounded-md bg-background"
                      placeholder="Leave empty to disable"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enables salamander obfuscation</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Bandwidth Up</label>
                      <input 
                        value={bandwidthUp}
                        onChange={(e) => setBandwidthUp(e.target.value)}
                        className="w-full p-3 border rounded-md bg-background"
                        placeholder="e.g. 100 Mbps"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Bandwidth Down</label>
                      <input 
                        value={bandwidthDown}
                        onChange={(e) => setBandwidthDown(e.target.value)}
                        className="w-full p-3 border rounded-md bg-background"
                        placeholder="e.g. 500 Mbps"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                    <input 
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full p-3 border rounded-md bg-background"
                      placeholder="prod, us-east"
                    />
                  </div>

                  {provider === "azure" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Resource Group (Azure required)</label>
                      <input
                        value={resourceGroup}
                        onChange={(e) => setResourceGroup(e.target.value)}
                        className="w-full p-3 border rounded-md bg-background"
                        placeholder="hysteria-rg-eastus"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Must be an existing Azure resource group</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep}>← Back</Button>
              <Button onClick={nextStep} disabled={!nodeName.trim()}>
                Next: Review →
              </Button>
            </div>
          </div>
        )

      case "review":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Step 3: Review & Deploy</h3>
              <p className="text-sm text-muted-foreground">Review your configuration before starting deployment</p>
            </div>

            {deploymentMode === "preset" && selectedPreset ? (
              <div className="bg-muted p-4 rounded-md space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Preset:</span>
                  <span className="text-sm">{selectedPreset.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Provider:</span>
                  <span className="text-sm">{selectedPreset.config.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Regions:</span>
                  <span className="text-sm">{selectedPreset.config.regions.join(", ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Size:</span>
                  <span className="text-sm">{selectedPreset.config.size}</span>
                </div>
                {selectedPreset.config.obfsEnabled && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Obfuscation:</span>
                    <span className="text-sm">Enabled</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-md space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Provider:</span>
                  <span className="text-sm">{currentProvider?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Region:</span>
                  <span className="text-sm">{currentProvider?.regions.find(r => r.id === region)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Size:</span>
                  <span className="text-sm">{currentProvider?.sizes.find(s => s.id === size)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Node Name:</span>
                  <span className="text-sm">{nodeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Port:</span>
                  <span className="text-sm">{port}</span>
                </div>
                {showAdvanced && (
                  <>
                    {domain && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Domain:</span>
                        <span className="text-sm">{domain}</span>
                      </div>
                    )}
                    {obfsPassword && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Obfuscation:</span>
                        <span className="text-sm">Enabled</span>
                      </div>
                    )}
                    {(bandwidthUp || bandwidthDown) && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Bandwidth:</span>
                        <span className="text-sm">{bandwidthUp || "-"} / {bandwidthDown || "-"}</span>
                      </div>
                    )}
                    {tags && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Tags:</span>
                        <span className="text-sm">{tags}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-md">
              <p className="text-sm font-medium mb-1">⚠️ What happens next:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                {deploymentMode === "preset" ? (
                  <>
                    <li>{selectedPreset?.config.regions.length} node(s) will be deployed</li>
                    <li>Each VM will be created in your cloud account</li>
                    <li>Hysteria2 will be automatically installed on each node</li>
                    <li>Nodes will be registered in your dashboard</li>
                    <li>Process takes ~3-5 minutes per node</li>
                  </>
                ) : (
                  <>
                    <li>VM will be created in your cloud account</li>
                    <li>Hysteria2 will be automatically installed</li>
                    <li>Node will be registered in your dashboard</li>
                    <li>Process takes ~3-5 minutes</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep}>← Back</Button>
              <Button onClick={deploymentMode === "preset" ? handlePresetDeploy : startDeployment} className="bg-green-600 hover:bg-green-700">
                🚀 Start Deployment
              </Button>
            </div>
          </div>
        )

      case "deploying":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Step 4: Deployment in Progress</h3>
              <p className="text-sm text-muted-foreground">Your node is being deployed. This typically takes 3-5 minutes.</p>
            </div>

            <div className="bg-muted p-4 rounded-md max-h-64 overflow-y-auto">
              {progress.length === 0 ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm mt-2">Initializing deployment...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {progress.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={cn(
                        "mt-1",
                        step.status === "completed" ? "text-green-500" :
                        step.status === "failed" ? "text-red-500" :
                        "text-blue-500"
                      )}>
                        {step.status === "completed" ? "✓" :
                         step.status === "failed" ? "✗" :
                         "○"}
                      </span>
                      <div className="flex-1">
                        <p className={cn(
                          step.status === "failed" ? "text-red-500" : ""
                        )}>{step.message}</p>
                        {step.error && (
                          <p className="text-xs text-red-400 mt-1">{step.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start gap-2 text-sm text-blue-500">
                    <span className="mt-1">○</span>
                    <p>Processing next step...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Please keep this window open until deployment completes
            </div>
          </div>
        )

      case "complete":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-4 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Deployment Complete!</h3>
              <p className="text-sm text-muted-foreground">
                {deploymentMode === "preset" 
                  ? `Your nodes are now live and ready to use`
                  : "Your Hysteria2 node is now live and ready to use"}
              </p>
            </div>

            {finalStatus && (
              <div className="bg-muted p-4 rounded-md space-y-3">
                {"nodes" in finalStatus ? (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Nodes Deployed:</span>
                    <span className="text-sm">{finalStatus.nodes}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Node Name:</span>
                      <span className="text-sm">{nodeName}</span>
                    </div>
                    {finalStatus.ip && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">IP Address:</span>
                        <span className="text-sm font-mono">{finalStatus.ip}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Port:</span>
                      <span className="text-sm">{port}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
              <p className="text-sm font-medium mb-2">📋 Next Steps:</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Go to the Infrastructure tab to see your new {deploymentMode === "preset" ? "nodes" : "node"}</li>
                <li>Configure your client to connect to the {deploymentMode === "preset" ? "nodes" : "node"}</li>
                <li>Test the connection</li>
                <li>Start using your Hysteria2 tunnel</li>
              </ol>
            </div>

            <div className="flex justify-center pt-4">
              <Button onClick={() => { onDeployed(); onClose() }}>
                Go to Infrastructure →
              </Button>
            </div>
          </div>
        )

      case "error":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-4 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                <span className="text-4xl">❌</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Deployment Failed</h3>
              <p className="text-sm text-muted-foreground">Something went wrong during deployment</p>
            </div>

            {progress.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-md">
                <p className="text-sm font-medium mb-2">Error Details:</p>
                <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                  {progress.map((step, i) => (
                    <div key={i} className={step.status === "failed" ? "text-red-500" : ""}>
                      {step.message}
                      {step.error && <p className="text-red-400 mt-1">{step.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep("provider")}>
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-background rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
