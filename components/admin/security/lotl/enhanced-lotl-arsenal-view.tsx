"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Plus,
  Settings2,
  Terminal,
  ShieldAlert,
  Wrench,
  Save,
  RotateCcw,
  Trash2,
  Power,
  PowerOff,
  ArrowRight,
  Play,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  TrendingUp,
  BarChart3,
  Layers,
  Copy,
  Download,
} from "lucide-react"

type RiskLevel = "Low" | "Medium" | "High" | "Critical"
type ToolStatus = "Available" | "Disabled" | "Restricted"

interface LotlTool {
  id: string
  name: string
  category: string
  status: ToolStatus
  risk: RiskLevel
  usage: string
  description: string
  binaryPath: string
  args: string
  requiresApproval: boolean
  executionCount: number
  lastUsed?: number
}

interface ToolChainStep {
  id: string
  toolId: string
  order: number
  args: string
  condition?: string
  onFail: "continue" | "stop" | "retry"
  retryCount: number
}

interface ToolChain {
  id: string
  name: string
  description: string
  category: string
  steps: ToolChainStep[]
  risk: RiskLevel
  estimatedDetectionTime: string
  createdAt: number
  executionCount: number
  lastExecuted?: number
}

export function EnhancedLotlArsenalView() {
  const [tools, setTools] = useState<LotlTool[]>([])
  const [toolChains, setToolChains] = useState<ToolChain[]>([])
  const [selectedChain, setSelectedChain] = useState<ToolChain | null>(null)
  const [loading, setLoading] = useState(true)
  const [chainBuilderOpen, setChainBuilderOpen] = useState(false)
  const [newChainName, setNewChainName] = useState("")
  const [newChainDescription, setNewChainDescription] = useState("")
  const [selectedTools, setSelectedTools] = useState<string[]>([])

  const loadTools = async () => {
    try {
      const res = await fetch("/api/admin/lotl/tools", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTools(data.tools ?? [])
    } catch (err) {
      toast.error("Failed to load LOTL tools", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
      setTools([])
    } finally {
      setLoading(false)
    }
  }

  const loadToolChains = async () => {
    try {
      const res = await fetch("/api/admin/lotl/chains", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setToolChains(data.chains ?? [])
    } catch (err) {
      toast.error("Failed to load tool chains", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
      setToolChains([])
    }
  }

  useEffect(() => {
    loadTools()
    loadToolChains()
  }, [])

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case "Low":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      case "Medium":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
      case "High":
        return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30"
      case "Critical":
        return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
    }
  }

  const getStatusColor = (status: ToolStatus) => {
    switch (status) {
      case "Available":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      case "Disabled":
        return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30"
      case "Restricted":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
    }
  }

  const createToolChain = () => {
    if (!newChainName.trim()) {
      toast.error("Please enter a chain name")
      return
    }
    if (selectedTools.length === 0) {
      toast.error("Please select at least one tool")
      return
    }

    const newChain: ToolChain = {
      id: `chain_${Date.now()}`,
      name: newChainName,
      description: newChainDescription,
      category: "Custom",
      steps: selectedTools.map((toolId, index) => ({
        id: `step_${Date.now()}_${index}`,
        toolId,
        order: index + 1,
        args: "",
        onFail: "continue",
        retryCount: 0,
      })),
      risk: "Medium",
      estimatedDetectionTime: "Unknown",
      createdAt: Date.now(),
      executionCount: 0,
    }

    setToolChains([...toolChains, newChain])
    setNewChainName("")
    setNewChainDescription("")
    setSelectedTools([])
    setChainBuilderOpen(false)
    toast.success("Tool chain created successfully")
  }

  const executeChain = async (chainId: string) => {
    toast.success(`Executing chain ${chainId}`)
    // In production, this would call the API to execute the chain
  }

  const deleteChain = (chainId: string) => {
    setToolChains(toolChains.filter(c => c.id !== chainId))
    if (selectedChain?.id === chainId) {
      setSelectedChain(null)
    }
    toast.success("Tool chain deleted")
  }

  const toggleToolStatus = (toolId: string) => {
    setTools(tools.map(tool =>
      tool.id === toolId
        ? { ...tool, status: tool.status === "Available" ? "Disabled" : "Available" }
        : tool
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-heading-lg">Enhanced LotL Arsenal</h2>
        <p className="text-sm text-muted-foreground">
          Living off the Land tool chain builder and risk assessment
        </p>
      </div>

      <Tabs defaultValue="tools" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="chains">Tool Chains</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Available Tools ({tools.length})
              </CardTitle>
              <CardDescription>
                Manage LotL tools and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {tools.map((tool) => (
                    <Card key={tool.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{tool.name}</h3>
                              <Badge variant="outline" className={getRiskColor(tool.risk)}>
                                {tool.risk}
                              </Badge>
                              <Badge variant="outline" className={getStatusColor(tool.status)}>
                                {tool.status}
                              </Badge>
                              {tool.requiresApproval && (
                                <Badge variant="secondary">
                                  <ShieldAlert className="h-3 w-3 mr-1" />
                                  Requires Approval
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {tool.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Wrench className="h-3 w-3" />
                                {tool.category}
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Usage: {tool.usage}
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                Executions: {tool.executionCount}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleToolStatus(tool.id)}
                            >
                              {tool.status === "Available" ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs font-mono bg-muted/50 p-2 rounded">
                          <div className="text-muted-foreground">Path:</div>
                          <div>{tool.binaryPath}</div>
                          <div className="text-muted-foreground mt-1">Args:</div>
                          <div>{tool.args || "(none)"}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chains" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Tool Chains</h3>
              <p className="text-sm text-muted-foreground">
                Create and execute custom tool chains
              </p>
            </div>
            <Button onClick={() => setChainBuilderOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Chain
            </Button>
          </div>

          {chainBuilderOpen && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Create New Tool Chain</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Chain Name</Label>
                  <Input
                    value={newChainName}
                    onChange={(e) => setNewChainName(e.target.value)}
                    placeholder="e.g., Discovery Chain"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newChainDescription}
                    onChange={(e) => setNewChainDescription(e.target.value)}
                    placeholder="Describe what this chain does"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select Tools (in execution order)</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <div className="space-y-2">
                      {tools.filter(t => t.status === "Available").map((tool) => (
                        <div key={tool.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTools.includes(tool.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTools([...selectedTools, tool.id])
                              } else {
                                setSelectedTools(selectedTools.filter(id => id !== tool.id))
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{tool.name}</span>
                          <Badge variant="outline" className={getRiskColor(tool.risk)}>
                            {tool.risk}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createToolChain}>Create Chain</Button>
                  <Button variant="outline" onClick={() => setChainBuilderOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Tool Chains ({toolChains.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {toolChains.map((chain) => (
                      <Card
                        key={chain.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedChain?.id === chain.id ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => setSelectedChain(chain)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-medium text-sm">{chain.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {chain.description}
                              </p>
                            </div>
                            <Badge variant="outline" className={getRiskColor(chain.risk)}>
                              {chain.risk}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{chain.steps.length} steps</span>
                            <span>•</span>
                            <span>{chain.executionCount} executions</span>
                            <span>•</span>
                            <span>{chain.estimatedDetectionTime}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Chain Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedChain ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Execution Steps</h4>
                      <div className="space-y-2">
                        {selectedChain.steps.map((step, index) => {
                          const tool = tools.find(t => t.id === step.toolId)
                          return (
                            <div key={step.id} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                              <Badge variant="outline">{index + 1}</Badge>
                              <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{tool?.name || "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {step.args || "(default args)"}
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {step.onFail}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => executeChain(selectedChain.id)}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Execute
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => deleteChain(selectedChain.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a tool chain to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Risk Assessment Dashboard
              </CardTitle>
              <CardDescription>
                Overall risk profile of LotL tools and chains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tools.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                      {tools.filter(t => t.risk === "High" || t.risk === "Critical").length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Requires Approval</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-500">
                      {tools.filter(t => t.requiresApproval).length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {tools.reduce((sum, t) => sum + t.executionCount, 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-medium">Risk Distribution</h4>
                <div className="space-y-2">
                  {["Critical", "High", "Medium", "Low"].map((risk) => {
                    const count = tools.filter(t => t.risk === risk).length
                    const percentage = tools.length > 0 ? (count / tools.length) * 100 : 0
                    return (
                      <div key={risk}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{risk}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              risk === "Critical" ? "bg-red-500" :
                              risk === "High" ? "bg-orange-500" :
                              risk === "Medium" ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tool Usage Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Analytics coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}