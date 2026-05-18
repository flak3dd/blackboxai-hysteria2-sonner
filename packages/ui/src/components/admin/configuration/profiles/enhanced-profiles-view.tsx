"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Layers,
  Copy,
  Download,
  Upload,
  Plus,
  Trash2,
  GitBranch,
  History,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  Settings,
  Play,
  Eye,
  GitMerge,
  Tag,
} from "lucide-react"

type ProfileVersion = {
  id: string
  version: string
  config: Record<string, unknown>
  changeLog: string
  createdAt: number
  createdBy: string
  isCurrent: boolean
}

type ProfileTemplate = {
  id: string
  name: string
  description: string
  category: string
  config: Record<string, unknown>
  tags: string[]
  isPublic: boolean
  usageCount: number
  createdAt: number
}

type Profile = {
  id: string
  name: string
  type: string
  description: string
  nodeIds: string[]
  config: Record<string, unknown>
  tags: string[]
  versions: ProfileVersion[]
  currentVersion: string
  createdAt: number
  updatedAt: number
  templateId?: string
}

export function EnhancedProfilesView() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [templates, setTemplates] = useState<ProfileTemplate[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState("")
  const [newProfileType, setNewProfileType] = useState("basic_tls_proxy")
  const [newVersion, setNewVersion] = useState("")
  const [changeLog, setChangeLog] = useState("")

  const TYPE_LABELS: Record<string, string> = {
    basic_tls_proxy: "Basic TLS Proxy",
    socks5_relay: "SOCKS5 Relay",
    high_throughput: "High-Throughput",
    tun_overlay: "TUN Overlay",
    custom: "Custom",
    stealth_mode: "Stealth Mode",
    anti_analysis: "Anti-Analysis",
    data_exfiltration: "Data Exfiltration",
  }

  const loadProfiles = async () => {
    try {
      const res = await fetch("/api/admin/configuration/profiles", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProfiles(data.profiles ?? [])
    } catch (err) {
      toast.error("Failed to load profiles", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/admin/configuration/profiles?templates=true", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch (err) {
      toast.error("Failed to load templates", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
      setTemplates([])
    }
  }

  useEffect(() => {
    loadProfiles()
    loadTemplates()
  }, [])

  const createProfile = () => {
    if (!newProfileName.trim()) {
      toast.error("Please enter a profile name")
      return
    }

    const newProfile: Profile = {
      id: `profile_${Date.now()}`,
      name: newProfileName,
      type: newProfileType,
      description: "",
      nodeIds: [],
      config: {},
      tags: [],
      versions: [
        {
          id: `v_${Date.now()}`,
          version: "1.0.0",
          config: {},
          changeLog: "Initial version",
          createdAt: Date.now(),
          createdBy: "admin",
          isCurrent: true,
        },
      ],
      currentVersion: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    setProfiles([...profiles, newProfile])
    setNewProfileName("")
    setCreateOpen(false)
    toast.success("Profile created successfully")
  }

  const createVersion = () => {
    if (!selectedProfile || !newVersion.trim()) {
      toast.error("Please enter a version number")
      return
    }

    const newVersionObj: ProfileVersion = {
      id: `v_${Date.now()}`,
      version: newVersion,
      config: selectedProfile.config,
      changeLog: changeLog || "No change log provided",
      createdAt: Date.now(),
      createdBy: "admin",
      isCurrent: true,
    }

    const updatedProfile = {
      ...selectedProfile,
      versions: [
        ...selectedProfile.versions.map(v => ({ ...v, isCurrent: false })),
        newVersionObj,
      ],
      currentVersion: newVersion,
      updatedAt: Date.now(),
    }

    setProfiles(profiles.map(p => p.id === selectedProfile.id ? updatedProfile : p))
    setSelectedProfile(updatedProfile)
    setNewVersion("")
    setChangeLog("")
    setVersionOpen(false)
    toast.success("Version created successfully")
  }

  const rollbackVersion = (versionId: string) => {
    if (!selectedProfile) return

    const version = selectedProfile.versions.find(v => v.id === versionId)
    if (!version) return

    const updatedProfile = {
      ...selectedProfile,
      config: version.config,
      versions: selectedProfile.versions.map(v => ({
        ...v,
        isCurrent: v.id === versionId,
      })),
      currentVersion: version.version,
      updatedAt: Date.now(),
    }

    setProfiles(profiles.map(p => p.id === selectedProfile.id ? updatedProfile : p))
    setSelectedProfile(updatedProfile)
    toast.success(`Rolled back to version ${version.version}`)
  }

  const deleteProfile = (profileId: string) => {
    setProfiles(profiles.filter(p => p.id !== profileId))
    if (selectedProfile?.id === profileId) {
      setSelectedProfile(null)
    }
    toast.success("Profile deleted")
  }

  const applyTemplate = (template: ProfileTemplate) => {
    if (!selectedProfile) {
      toast.error("Please select a profile first")
      return
    }

    const updatedProfile = {
      ...selectedProfile,
      config: template.config,
      templateId: template.id,
      updatedAt: Date.now(),
    }

    setProfiles(profiles.map(p => p.id === selectedProfile.id ? updatedProfile : p))
    setSelectedProfile(updatedProfile)
    toast.success(`Template "${template.name}" applied`)
  }

  const exportProfile = (profile: Profile) => {
    const data = JSON.stringify(profile, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${profile.name.replace(/\s+/g, "_")}_profile.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Profile exported")
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "basic_tls_proxy": return "bg-blue-500/15 text-blue-700 dark:text-blue-300"
      case "socks5_relay": return "bg-purple-500/15 text-purple-700 dark:text-purple-300"
      case "high_throughput": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      case "tun_overlay": return "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      case "stealth_mode": return "bg-red-500/15 text-red-700 dark:text-red-300"
      default: return "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-lg">Enhanced Profile Management</h2>
          <p className="text-sm text-muted-foreground">
            Profile versioning, templates, and configuration management
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Profile
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Profile</DialogTitle>
                <DialogDescription>
                  Create a new C2 profile
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile Name</Label>
                  <Input
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g., Production TLS Proxy"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Profile Type</Label>
                  <Select value={newProfileType} onValueChange={setNewProfileType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createProfile}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Profiles ({profiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {profiles.map((profile) => (
                      <Card
                        key={profile.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedProfile?.id === profile.id ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => setSelectedProfile(profile)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-medium text-sm">{profile.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {TYPE_LABELS[profile.type] || profile.type}
                              </p>
                            </div>
                            <Badge variant="outline" className={getTypeColor(profile.type)}>
                              {profile.currentVersion}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{profile.versions.length} versions</span>
                            <span>•</span>
                            <span>{profile.nodeIds.length} nodes</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {selectedProfile ? selectedProfile.name : "Profile Details"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedProfile ? (
                  <Tabs defaultValue="config" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="config">Configuration</TabsTrigger>
                      <TabsTrigger value="versions">Versions</TabsTrigger>
                      <TabsTrigger value="actions">Actions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="config" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={selectedProfile.description}
                          onChange={(e) => {
                            const updated = { ...selectedProfile, description: e.target.value }
                            setProfiles(profiles.map(p => p.id === selectedProfile.id ? updated : p))
                            setSelectedProfile(updated)
                          }}
                          placeholder="Profile description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Configuration (JSON)</Label>
                        <Textarea
                          value={JSON.stringify(selectedProfile.config, null, 2)}
                          onChange={(e) => {
                            try {
                              const config = JSON.parse(e.target.value)
                              const updated = { ...selectedProfile, config }
                              setProfiles(profiles.map(p => p.id === selectedProfile.id ? updated : p))
                              setSelectedProfile(updated)
                            } catch {
                              // Invalid JSON, ignore
                            }
                          }}
                          className="font-mono text-sm"
                          rows={10}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const updated = { ...selectedProfile, updatedAt: Date.now() }
                            setProfiles(profiles.map(p => p.id === selectedProfile.id ? updated : p))
                            setSelectedProfile(updated)
                            toast.success("Configuration saved")
                          }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="versions" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Version History</h4>
                        <Dialog open={versionOpen} onOpenChange={setVersionOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-2">
                              <GitBranch className="h-4 w-4" />
                              New Version
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create New Version</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Version Number</Label>
                                <Input
                                  value={newVersion}
                                  onChange={(e) => setNewVersion(e.target.value)}
                                  placeholder="e.g., 1.2.0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Change Log</Label>
                                <Textarea
                                  value={changeLog}
                                  onChange={(e) => setChangeLog(e.target.value)}
                                  placeholder="Describe the changes"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setVersionOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={createVersion}>Create</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {selectedProfile.versions.map((version) => (
                            <Card key={version.id}>
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant={version.isCurrent ? "default" : "secondary"}>
                                        {version.version}
                                      </Badge>
                                      {version.isCurrent && (
                                        <Badge variant="outline" className="text-xs">
                                          Current
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      {version.changeLog}
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(version.createdAt).toLocaleString()} by {version.createdBy}
                                    </div>
                                  </div>
                                  {!version.isCurrent && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => rollbackVersion(version.id)}
                                      className="gap-1"
                                    >
                                      <GitMerge className="h-4 w-4" />
                                      Rollback
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Button
                          variant="outline"
                          onClick={() => exportProfile(selectedProfile)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export Profile
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => deleteProfile(selectedProfile.id)}
                          className="gap-2 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Profile
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a profile to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Profile Templates ({templates.length})
              </CardTitle>
              <CardDescription>
                Pre-built configuration templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {template.usageCount} uses
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => applyTemplate(template)}
                          disabled={!selectedProfile}
                        >
                          Apply to Profile
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Select a profile to view its version history
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}