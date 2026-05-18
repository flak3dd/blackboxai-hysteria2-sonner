/**
 * Simplified Template Manager
 * 
 * A clean interface for managing email templates:
 * - List templates
 * - Create new templates
 * - Edit existing templates
 * - Delete templates
 * - Preview templates
 */

"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Mock types (in real app, import from shared types)
type Template = {
  id: string
  name: string
  subject: string
  body: string
  htmlBody?: string
  category: string
}

export function SimpleTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [previewResult, setPreviewResult] = useState<{ subject: string; body: string; htmlBody?: string } | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [htmlBody, setHtmlBody] = useState("")
  const [category, setCategory] = useState("general")

  // Load templates
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/admin/mail/simple-templates")
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch {
      toast.error("Failed to load templates")
    }
  }

  const handleSave = async () => {
    if (!name || !subject || !body) {
      toast.error("Please fill in required fields")
      return
    }

    try {
      const response = await fetch("/api/admin/mail/simple-templates", {
        method: editingTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTemplate?.id || `template-${Date.now()}`,
          name,
          subject,
          body,
          htmlBody: htmlBody || undefined,
          category,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save template")
      }

      toast.success("Template saved successfully")
      setEditingTemplate(null)
      resetForm()
      loadTemplates()
    } catch (error) {
      toast.error("Failed to save template")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      const response = await fetch(`/api/admin/mail/simple-templates?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete template")
      }

      toast.success("Template deleted")
      loadTemplates()
    } catch (error) {
      toast.error("Failed to delete template")
    }
  }

  const handlePreview = () => {
    if (!editingTemplate) return

    // Simple variable substitution
    let resultSubject = editingTemplate.subject
    let resultBody = editingTemplate.body
    let resultHtml = editingTemplate.htmlBody

    for (const [key, value] of Object.entries(previewVariables)) {
      const placeholder = `{{${key}}}`
      resultSubject = resultSubject.replaceAll(placeholder, value)
      resultBody = resultBody.replaceAll(placeholder, value)
      if (resultHtml) {
        resultHtml = resultHtml.replaceAll(placeholder, value)
      }
    }

    setPreviewResult({ subject: resultSubject, body: resultBody, htmlBody: resultHtml })
    setShowPreview(true)
  }

  const resetForm = () => {
    setName("")
    setSubject("")
    setBody("")
    setHtmlBody("")
    setCategory("general")
    setPreviewVariables({})
  }

  const startEditing = (template: Template) => {
    setEditingTemplate(template)
    setName(template.name)
    setSubject(template.subject)
    setBody(template.body)
    setHtmlBody(template.htmlBody || "")
    setCategory(template.category)
  }

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const variables = new Set<string>()
    let match
    while ((match = regex.exec(text)) !== null) {
      variables.add(match[1])
    }
    return Array.from(variables)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">Manage your email templates</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTemplate(null); resetForm() }}>
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
              <DialogDescription>
                Create or edit an email template with variable substitution
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome Email" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Hello {{name}}"
                />
                {extractVariables(subject).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Variables: {extractVariables(subject).map(v => `{{${v}}}`).join(", ")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi {{firstName}},..."
                  rows={6}
                />
                {extractVariables(body).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Variables: {extractVariables(body).map(v => `{{${v}}}`).join(", ")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>HTML Body (Optional)</Label>
                <Textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="<p>Hi {{firstName}},...</p>"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  Save Template
                </Button>
                <Button onClick={handlePreview} variant="outline">
                  Preview
                </Button>
              </div>

              {editingTemplate && extractVariables(subject + body + (htmlBody || "")).length > 0 && (
                <div className="border rounded-lg p-4 space-y-2">
                  <p className="font-medium text-sm">Preview Variables</p>
                  {extractVariables(subject + body + (htmlBody || "")).map(variable => (
                    <div key={variable} className="flex items-center gap-2">
                      <Label className="w-24 text-xs">{`{${variable}}`}</Label>
                      <Input
                        size="sm"
                        value={previewVariables[variable] || ""}
                        onChange={(e) => setPreviewVariables({ ...previewVariables, [variable]: e.target.value })}
                        placeholder="Value"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    <Badge variant="outline">{template.category}</Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">{template.subject}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditing(template)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(template.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{template.body}</p>
              {template.htmlBody && (
                <p className="text-xs text-muted-foreground mt-1">HTML version available</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <p className="font-mono text-sm">{previewResult?.subject}</p>
            </div>
            <div>
              <Label>Body</Label>
              <pre className="font-mono text-sm whitespace-pre-wrap bg-muted p-3 rounded">{previewResult?.body}</pre>
            </div>
            {previewResult?.htmlBody && (
              <div>
                <Label>HTML Body</Label>
                <pre className="font-mono text-sm whitespace-pre-wrap bg-muted p-3 rounded">{previewResult.htmlBody}</pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
