"use client"
import { apiFetch } from "@/lib/api/fetch"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BuildPreset = {
  id: string
  name: string
  description: string
  icon: string
  category: "stealth" | "performance" | "balanced" | "custom"
  config: {
    provider: string
    regions: string[]
    size: string
    port: number
    obfsEnabled: boolean
    obfsPasswordLength?: number
    bandwidth?: {
      up: string
      down: string
    }
    masquerade?: {
      type: string
      enabled: boolean
    }
    tags: string[]
    recommendedProviders: string[]
  }
  deploymentCount: number
  estimatedCost: string
}

type PresetCategory = "all" | "stealth" | "performance" | "balanced" | "custom"

interface BuildPresetsSelectorProps {
  onPresetSelect: (preset: BuildPreset) => void
  onOneClickDeploy: (preset: BuildPreset) => void
  isDeploying?: boolean
}

export function BuildPresetsSelector({ onPresetSelect, onOneClickDeploy, isDeploying = false }: BuildPresetsSelectorProps) {
  const [presets, setPresets] = useState<BuildPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>("all")
  const [selectedPreset, setSelectedPreset] = useState<BuildPreset | null>(null)

  const loadPresets = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/operations/deploy/build-presets", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setPresets(data.presets ?? [])
      }
    } catch (err) {
      toast.error("Failed to load build presets", {
        description: err instanceof Error ? err.message : "unknown",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const doLoad = async () => { await loadPresets(); if (!active) return }
    doLoad()
    return () => { active = false }
  }, [loadPresets])

  const filteredPresets = selectedCategory === "all" 
    ? presets 
    : presets.filter(p => p.category === selectedCategory)

  const categories: { id: PresetCategory; label: string; icon: string }[] = [
    { id: "all", label: "All", icon: "📦" },
    { id: "stealth", label: "Stealth", icon: "🛡️" },
    { id: "performance", label: "Performance", icon: "🚀" },
    { id: "balanced", label: "Balanced", icon: "⚖️" },
    { id: "custom", label: "Custom", icon: "⚙️" },
  ]

  const handlePresetClick = (preset: BuildPreset) => {
    setSelectedPreset(preset)
    onPresetSelect(preset)
  }

  const handleOneClickDeploy = (preset: BuildPreset) => {
    onOneClickDeploy(preset)
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading build presets...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            className={cn(
              "relative rounded-lg border-2 p-4 transition-all cursor-pointer hover:shadow-lg",
              selectedPreset?.id === preset.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => handlePresetClick(preset)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{preset.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm">{preset.name}</h3>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                    preset.category === "stealth" && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                    preset.category === "performance" && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                    preset.category === "balanced" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                    preset.category === "custom" && "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                  )}>
                    {preset.category}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {preset.description}
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nodes:</span>
                <span className="font-medium">{preset.deploymentCount} × {preset.config.regions.length} regions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">{preset.estimatedCost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Obfuscation:</span>
                <span className={cn(
                  "font-medium",
                  preset.config.obfsEnabled ? "text-green-600" : "text-zinc-500"
                )}>
                  {preset.config.obfsEnabled ? "✓ Enabled" : "✗ Disabled"}
                </span>
              </div>
              {preset.config.bandwidth && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bandwidth:</span>
                  <span className="font-medium">{preset.config.bandwidth.up} / {preset.config.bandwidth.down}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOneClickDeploy(preset)
                }}
                disabled={isDeploying}
              >
                {isDeploying ? "Deploying..." : "🚀 One-Click Deploy"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePresetClick(preset)
                }}
              >
                Customize
              </Button>
            </div>

            {/* Config preview */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-1">
                {preset.config.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
                {preset.config.tags.length > 3 && (
                  <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    +{preset.config.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No presets found for this category
        </div>
      )}
    </div>
  )
}
