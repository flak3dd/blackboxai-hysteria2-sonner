"use client"
import { apiFetch } from "@c2panel/core/api/fetch"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type ImportStep = "provider" | "instances" | "validate" | "complete" | "error"

type ValidationStatus = "idle" | "validating" | "success" | "failed"

type VpsInstance = {
  id: string
  name: string
  status: string
  ipv4: string | null
  ipv6: string | null
  region: string
  size: string
  createdAt: string
}

type Provider = {
  id: string
  label: string
  icon: string
}

const PROVIDERS: Provider[] = [
  { id: "digitalocean", label: "DigitalOcean", icon: "🌊" },
  { id: "hetzner", label: "Hetzner", icon: "🇩🇪" },
  { id: "vultr", label: "Vultr", icon: "⚡" },
  { id: "lightsail", label: "AWS Lightsail", icon: "☁️" },
  { id: "azure", label: "Microsoft Azure", icon: "🔷" },
]

export function ImportNodeModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [currentStep, setCurrentStep] = useState<ImportStep>("provider")
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [instances, setInstances] = useState<VpsInstance[]>([])
  const [isLoadingInstances, setIsLoadingInstances] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<VpsInstance | null>(null)
  const [sshPrivateKey, setSshPrivateKey] = useState("")
  const [sshUsername, setSshUsername] = useState("root")

  // Validation state
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle")
  const [validationResult, setValidationResult] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)

  const loadInstances = async (providerId: string) => {
    setIsLoadingInstances(true)
    setInstances([])
    // Set default SSH username based on provider
    const defaultUsername =
      providerId === "azure" ? "azureuser" :
      providerId === "lightsail" ? "ubuntu" : "root"
    setSshUsername(defaultUsername)
    try {
      const res = await apiFetch(`/api/admin/operations/nodes/instances?provider=${providerId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error || "Failed to load instances")
      }
      const data = await res.json()
      setInstances(data.instances || [])
      setCurrentStep("instances")
    } catch (error) {
      toast.error("Failed to load instances", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsLoadingInstances(false)
    }
  }

  const validateConnection = async () => {
    if (!selectedInstance?.ipv4 || !sshPrivateKey.trim()) return

    setValidationStatus("validating")
    setValidationResult(null)
    setCurrentStep("validate")

    try {
      const res = await apiFetch("/api/admin/operations/nodes/import", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ipAddress: selectedInstance.ipv4,
          sshPort: 22,
          sshUsername: sshUsername.trim() || "root",
          sshPrivateKey: sshPrivateKey.trim(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error || "Validation failed")
      }

      const data = await res.json()
      setValidationResult(data)
      
      if (data.success) {
        setValidationStatus("success")
        // Auto-proceed to import
        setTimeout(() => importNode(data), 500)
      } else {
        setValidationStatus("failed")
        setCurrentStep("error")
      }
    } catch (error) {
      setValidationStatus("failed")
      setValidationResult({
        error: error instanceof Error ? error.message : "Validation failed"
      })
      toast.error("Connection failed", { description: error instanceof Error ? error.message : "Unknown error" })
      setCurrentStep("error")
    }
  }

  const importNode = async (validationData?: any) => {
    if (!selectedInstance) return

    setIsImporting(true)

    try {
      const res = await apiFetch("/api/admin/operations/nodes/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: selectedInstance.name,
          hostname: selectedInstance.name,
          ipAddress: selectedInstance.ipv4,
          sshPort: 22,
          sshUsername: sshUsername.trim() || "root",
          sshPrivateKey: sshPrivateKey.trim(),
          provider: selectedProvider,
          region: selectedInstance.region,
          port: 443,
          tags: [selectedInstance.region, selectedProvider || ""].filter(Boolean),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error || "Import failed")
      }

      const data = await res.json()
      setCurrentStep("complete")
      toast.success("Node imported successfully!", { description: data.message })
      onImported()
      
      // Auto-close after success
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      setCurrentStep("error")
      toast.error("Import failed", { description: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setIsImporting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case "provider":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Cloud Provider</h3>
              <p className="text-sm text-muted-foreground">
                Choose your cloud provider to scan for existing instances
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setSelectedProvider(provider.id)
                    loadInstances(provider.id)
                  }}
                  disabled={isLoadingInstances}
                  className="p-4 border rounded-lg hover:border-primary hover:bg-muted transition-colors text-left disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">{provider.icon}</div>
                  <div className="font-medium">{provider.label}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )

      case "instances":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Instance to Import</h3>
              <p className="text-sm text-muted-foreground">
                {instances.length} instance{instances.length !== 1 ? "s" : ""} found on {PROVIDERS.find(p => p.id === selectedProvider)?.label}
              </p>
            </div>

            {isLoadingInstances ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : instances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No instances found on this provider
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    className={`p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer ${
                      selectedInstance?.id === instance.id ? "border-primary bg-muted" : ""
                    }`}
                    onClick={() => setSelectedInstance(instance)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{instance.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {instance.ipv4 || "No IPv4"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          instance.status === "active" || instance.status === "running"
                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                            : "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                        }`}>
                          {instance.status}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {instance.region}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {instance.size} • Created {new Date(instance.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedInstance && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium mb-2">SSH Private Key *</label>
                  <textarea
                    value={sshPrivateKey}
                    onChange={(e) => setSshPrivateKey(e.target.value)}
                    className="w-full p-3 border rounded-md bg-background font-mono text-xs"
                    rows={4}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The private key for SSH access to {selectedInstance.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">SSH Username</label>
                  <input
                    value={sshUsername}
                    onChange={(e) => setSshUsername(e.target.value)}
                    className="w-full p-3 border rounded-md bg-background"
                    placeholder="root"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default is root</p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setCurrentStep("provider")}>
                    ← Back
                  </Button>
                  <Button 
                    onClick={validateConnection} 
                    disabled={!sshPrivateKey.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Import Instance
                  </Button>
                </div>
              </div>
            )}

            {!selectedInstance && (
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep("provider")}>
                  ← Back
                </Button>
              </div>
            )}
          </div>
        )

      case "validate":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Validating Connection</h3>
              <p className="text-sm text-muted-foreground">
                Testing SSH connection to {selectedInstance?.name}...
              </p>
            </div>

            <div className="flex items-center justify-center py-8">
              {validationStatus === "validating" && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm mt-2">Testing SSH connection...</p>
                </div>
              )}
              
              {validationStatus === "success" && (
                <div className="text-center">
                  <div className="inline-block p-4 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                    <span className="text-4xl">✓</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">Connection successful!</p>
                  {validationResult && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Hysteria2: {validationResult.hysteria2Installed ? "Installed" : "Not detected"}
                    </p>
                  )}
                </div>
              )}

              {validationStatus === "failed" && (
                <div className="text-center">
                  <div className="inline-block p-4 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                    <span className="text-4xl">✗</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">Connection failed</p>
                  {validationResult && validationResult.error && (
                    <p className="text-xs text-muted-foreground mt-1">{validationResult.error}</p>
                  )}
                </div>
              )}
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
              <h3 className="text-lg font-semibold mb-2">Node Imported Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                {selectedInstance?.name} has been added to your workspace
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
              <p className="text-sm font-medium mb-2">📋 Next Steps:</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Go to the Infrastructure tab to see your imported node</li>
                <li>Configure your client to connect to this node</li>
                <li>Test the connection</li>
                <li>Start using your Hysteria2 tunnel</li>
              </ol>
            </div>

            <div className="flex justify-center pt-4">
              <Button onClick={() => { onImported(); onClose() }}>
                Done
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
              <h3 className="text-lg font-semibold mb-2">Import Failed</h3>
              <p className="text-sm text-muted-foreground">
                There was an error importing your node
              </p>
            </div>

            {validationResult && validationResult.error && (
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-md">
                <p className="text-sm font-medium mb-1">Error Details:</p>
                <p className="text-xs text-muted-foreground">{validationResult.error}</p>
              </div>
            )}

            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep("instances")}>
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
        className="w-full max-w-2xl bg-background rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
