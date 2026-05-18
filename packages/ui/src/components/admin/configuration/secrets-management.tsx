/**
 * Secrets Management UI
 * 
 * Interface for managing provider credentials and secrets:
 * - List all secrets with filtering
 * - Add new secrets (SSH keys, API keys, tokens, passwords, certificates)
 * - Edit existing secrets
 * - Delete secrets
 * - View secret details (with secure reveal)
 * - Filter by provider or type
 */

"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Key,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"

type SecretType = 'ssh_key' | 'api_key' | 'token' | 'password' | 'certificate' | 'other'
type SecretProvider = 'aws' | 'azure' | 'digitalocean' | 'hetzner' | 'vultr' | 'github' | 'gitlab' | 'openai' | 'anthropic' | 'google' | 'custom' | null

interface Secret {
  id: string
  name: string
  type: SecretType
  provider: SecretProvider
  value: string
  description?: string | null
  metadata?: Record<string, any> | null
  isActive: boolean
  lastUsedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

interface SecretListItem {
  id: string
  name: string
  type: SecretType
  provider: SecretProvider
  description?: string | null
  isActive: boolean
  lastUsedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export function SecretsManagement() {
  const [secrets, setSecrets] = useState<SecretListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<SecretType | "">("")
  const [providerFilter, setProviderFilter] = useState<SecretProvider | "">("")
  
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null)
  const [revealValue, setRevealValue] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "ssh_key" as SecretType,
    provider: "custom" as SecretProvider,
    value: "",
    description: ""
  })

  // Load secrets
  const loadSecrets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.append('type', typeFilter)
      if (providerFilter) params.append('provider', providerFilter)
      
      const response = await fetch(`/api/admin/configuration/secrets?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load secrets')
      
      const data = await response.json()
      setSecrets(data.secrets || [])
    } catch (error) {
      toast.error('Failed to load secrets', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Load full secret with value
  const loadSecret = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/configuration/secrets/${id}`)
      if (!response.ok) throw new Error('Failed to load secret')
      
      const data = await response.json()
      setSelectedSecret(data.secret)
      setRevealValue(false)
    } catch (error) {
      toast.error('Failed to load secret', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Create secret
  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/configuration/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) throw new Error('Failed to create secret')
      
      toast.success('Secret created successfully')
      setAddModalOpen(false)
      resetForm()
      loadSecrets()
    } catch (error) {
      toast.error('Failed to create secret', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Update secret
  const handleUpdate = async () => {
    if (!selectedSecret) return
    
    try {
      const response = await fetch(`/api/admin/configuration/secrets/${selectedSecret.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          provider: formData.provider,
          value: formData.value,
          description: formData.description
        })
      })
      
      if (!response.ok) throw new Error('Failed to update secret')
      
      toast.success('Secret updated successfully')
      setEditModalOpen(false)
      resetForm()
      loadSecrets()
    } catch (error) {
      toast.error('Failed to update secret', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Delete secret
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this secret? This action cannot be undone.')) return
    
    try {
      const response = await fetch(`/api/admin/configuration/secrets/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete secret')
      
      toast.success('Secret deleted successfully')
      loadSecrets()
    } catch (error) {
      toast.error('Failed to delete secret', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "ssh_key",
      provider: "custom",
      value: "",
      description: ""
    })
    setSelectedSecret(null)
  }

  const handleEdit = (secret: SecretListItem) => {
    loadSecret(secret.id)
    setFormData({
      name: secret.name,
      type: secret.type,
      provider: secret.provider || "custom",
      value: "",
      description: secret.description || ""
    })
    setEditModalOpen(true)
  }

  const handleView = (secret: SecretListItem) => {
    loadSecret(secret.id)
    setViewModalOpen(true)
  }

  // Filter secrets
  const filteredSecrets = secrets.filter(secret => {
    const matchesSearch = secret.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (secret.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  // Get unique types and providers for filters
  const types = Array.from(new Set(secrets.map(s => s.type)))
  const providers = Array.from(new Set(secrets.map(s => s.provider).filter(p => p)))

  useEffect(() => {
    loadSecrets()
  }, [typeFilter, providerFilter])

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Secrets Management</h1>
          <p className="text-muted-foreground">
            Manage provider credentials and sensitive data
          </p>
        </div>
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setAddModalOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Secret
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Secret</DialogTitle>
              <DialogDescription>
                Add a new secret for provider credentials or sensitive data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., AWS Production Key"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as SecretType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ssh_key">SSH Key</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="token">Token</SelectItem>
                      <SelectItem value="password">Password</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value as SecretProvider })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aws">AWS</SelectItem>
                      <SelectItem value="azure">Azure</SelectItem>
                      <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                      <SelectItem value="hetzner">Hetzner</SelectItem>
                      <SelectItem value="vultr">Vultr</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="gitlab">GitLab</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Value</Label>
                <Textarea
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="Enter the secret value..."
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this secret is used for..."
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreate} className="flex-1">
                  Create Secret
                </Button>
                <Button variant="outline" onClick={() => { setAddModalOpen(false); resetForm() }}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search secrets..."
                className="pl-8"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as SecretType | "")}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={providerFilter} onValueChange={(value) => setProviderFilter(value as SecretProvider | "")}>
              <SelectTrigger>
                <SelectValue placeholder="All providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All providers</SelectItem>
                {providers.map(provider => (
                  <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Actions</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadSecrets} disabled={loading}>
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setTypeFilter(""); setProviderFilter("") }}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secrets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Secrets ({filteredSecrets.length})</CardTitle>
          <CardDescription>
            Securely stored credentials and sensitive data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSecrets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No secrets found. Add your first secret to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSecrets.map((secret) => (
                  <TableRow key={secret.id}>
                    <TableCell className="font-medium">{secret.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{secret.type.replace('_', ' ').toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{secret.provider || 'Custom'}</TableCell>
                    <TableCell>
                      {secret.isActive ? (
                        <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
                      ) : (
                        <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {secret.lastUsedAt ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(secret.lastUsedAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(secret.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(secret)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(secret)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(secret.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Secret Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Secret Details</DialogTitle>
            <DialogDescription>
              View secret details and decrypted value
            </DialogDescription>
          </DialogHeader>
          {selectedSecret && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <div className="font-medium">{selectedSecret.name}</div>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Badge variant="outline">{selectedSecret.type.replace('_', ' ').toUpperCase()}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <div>{selectedSecret.provider || 'Custom'}</div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div>{selectedSecret.isActive ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
              
              {selectedSecret.description && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <div className="text-sm text-muted-foreground">{selectedSecret.description}</div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Value</Label>
                <div className="relative">
                  <Textarea
                    value={revealValue ? selectedSecret.value : '•'.repeat(Math.min(selectedSecret.value.length, 50))}
                    readOnly
                    rows={4}
                    className="font-mono text-sm pr-10"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-2"
                    onClick={() => setRevealValue(!revealValue)}
                  >
                    {revealValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <Label>Created</Label>
                  <div>{new Date(selectedSecret.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <div>{new Date(selectedSecret.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Secret Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Secret</DialogTitle>
            <DialogDescription>
              Update secret details and value
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as SecretType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssh_key">SSH Key</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="token">Token</SelectItem>
                    <SelectItem value="password">Password</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value as SecretProvider })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aws">AWS</SelectItem>
                    <SelectItem value="azure">Azure</SelectItem>
                    <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                    <SelectItem value="hetzner">Hetzner</SelectItem>
                    <SelectItem value="vultr">Vultr</SelectItem>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="gitlab">GitLab</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Value (leave empty to keep current)</Label>
              <Textarea
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Enter new value to update, leave empty to keep current"
                rows={4}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleUpdate} className="flex-1">
                Update Secret
              </Button>
              <Button variant="outline" onClick={() => { setEditModalOpen(false); resetForm() }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
