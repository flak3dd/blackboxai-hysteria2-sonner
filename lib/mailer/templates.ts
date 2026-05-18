import { z } from "zod"

export const EmailTemplate = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  textContent: z.string().min(1),
  variables: z.array(z.string()).default([]),
  category: z.string().default("general"),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().default(1),
})
export type EmailTemplate = z.infer<typeof EmailTemplate>

export const TemplateVariable = z.object({
  name: z.string().min(1),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["string", "number", "boolean", "date"]).default("string"),
  required: z.boolean().default(false),
})
export type TemplateVariable = z.infer<typeof TemplateVariable>

export const TemplateVersion = z.object({
  id: z.string(),
  templateId: z.string(),
  version: z.number(),
  subject: z.string(),
  htmlContent: z.string(),
  textContent: z.string(),
  variables: z.array(z.string()),
  createdAt: z.string(),
  createdBy: z.string().optional(),
  changelog: z.string().optional(),
})
export type TemplateVersion = z.infer<typeof TemplateVersion>

export const RenderedTemplate = z.object({
  subject: z.string(),
  htmlContent: z.string(),
  textContent: z.string(),
})
export type RenderedTemplate = z.infer<typeof RenderedTemplate>

export const TemplatePreview = z.object({
  templateId: z.string(),
  variables: z.record(z.string()),
  rendered: RenderedTemplate,
  previewUrl: z.string().optional(),
})
export type TemplatePreview = z.infer<typeof TemplatePreview>

// In-memory template storage (in production, this would be a database)
const templates: Map<string, EmailTemplate> = new Map()
const templateVersions: Map<string, TemplateVersion[]> = new Map()

export function saveTemplate(template: EmailTemplate, options?: { createVersion?: boolean; changelog?: string; createdBy?: string }): EmailTemplate {
  const now = new Date().toISOString()
  const existing = templates.get(template.id)
  
  // Create version if content changed and versioning is enabled
  if (existing && options?.createVersion !== false) {
    const hasChanges = 
      existing.subject !== template.subject ||
      existing.htmlContent !== template.htmlContent ||
      existing.textContent !== template.textContent
    
    if (hasChanges) {
      const newVersion = (existing.version || 1) + 1
      const version: TemplateVersion = {
        id: `${template.id}_v${newVersion}_${Date.now()}`,
        templateId: template.id,
        version: newVersion,
        subject: existing.subject,
        htmlContent: existing.htmlContent,
        textContent: existing.textContent,
        variables: existing.variables,
        createdAt: now,
        createdBy: options?.createdBy,
        changelog: options?.changelog || "Template updated",
      }
      
      const versions = templateVersions.get(template.id) || []
      versions.push(version)
      templateVersions.set(template.id, versions)
      
      template.version = newVersion
    }
  }
  
  const toSave: EmailTemplate = {
    ...template,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    version: template.version || 1,
  }
  
  templates.set(template.id, toSave)
  return toSave
}

export function getTemplate(id: string): EmailTemplate | null {
  return templates.get(id) ?? null
}

export function listTemplates(): EmailTemplate[] {
  return Array.from(templates.values())
}

export function deleteTemplate(id: string): boolean {
  return templates.delete(id)
}

export function renderTemplate(
  template: EmailTemplate,
  variables: Record<string, string>,
): RenderedTemplate {
  let html = template.htmlContent
  let text = template.textContent
  let subject = template.subject
  
  // Replace variables in the format {{variableName}}
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    html = html.replaceAll(placeholder, value)
    text = text.replaceAll(placeholder, value)
    subject = subject.replaceAll(placeholder, value)
  }
  
  return {
    subject,
    htmlContent: html,
    textContent: text,
  }
}

export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const variables = new Set<string>()
  let match
  
  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1])
  }
  
  return Array.from(variables)
}

export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check for basic HTML structure
  if (!template.includes('<html') && !template.includes('<body')) {
    errors.push('Template should include <html> and <body> tags for better email client compatibility')
  }
  
  // Check for unclosed tags (basic check)
  const openTags = (template.match(/<([a-z][a-z0-9]*)\b[^>]*>/gi) || []).length
  const closeTags = (template.match(/<\/([a-z][a-z0-9]*)>/gi) || []).length
  
  if (openTags !== closeTags) {
    errors.push('Template may have unclosed HTML tags')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

// Template versioning functions
export function getTemplateVersions(templateId: string): TemplateVersion[] {
  return templateVersions.get(templateId) || []
}

export function getTemplateVersion(templateId: string, version: number): TemplateVersion | null {
  const versions = templateVersions.get(templateId) || []
  return versions.find(v => v.version === version) || null
}

export function restoreTemplateVersion(templateId: string, version: number): EmailTemplate | null {
  const versionData = getTemplateVersion(templateId, version)
  if (!versionData) return null
  
  const restored: EmailTemplate = {
    id: templateId,
    name: getTemplate(templateId)?.name || "Restored Template",
    subject: versionData.subject,
    htmlContent: versionData.htmlContent,
    textContent: versionData.textContent,
    variables: versionData.variables,
    version: (getTemplate(templateId)?.version || 0) + 1,
    createdAt: getTemplate(templateId)?.createdAt,
    updatedAt: new Date().toISOString(),
  }
  
  return saveTemplate(restored, { createVersion: true, changelog: `Restored from version ${version}` })
}

export function deleteTemplateVersion(templateId: string, version: number): boolean {
  const versions = templateVersions.get(templateId) || []
  const filtered = versions.filter(v => v.version !== version)
  
  if (filtered.length === versions.length) return false
  
  templateVersions.set(templateId, filtered)
  return true
}

// Template preview functions
export function previewTemplate(templateId: string, variables: Record<string, string>): TemplatePreview | null {
  const template = getTemplate(templateId)
  if (!template) return null
  
  const rendered = renderTemplate(template, variables)
  
  return {
    templateId,
    variables,
    rendered,
  }
}

export function previewTemplateFromContent(
  htmlContent: string,
  textContent: string,
  subject: string,
  variables: Record<string, string>
): TemplatePreview {
  let html = htmlContent
  let text = textContent
  let subj = subject
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    html = html.replaceAll(placeholder, value)
    text = text.replaceAll(placeholder, value)
    subj = subj.replaceAll(placeholder, value)
  }
  
  return {
    templateId: "preview",
    variables,
    rendered: {
      subject: subj,
      htmlContent: html,
      textContent: text,
    },
  }
}

// Template category and tag functions
export function getTemplatesByCategory(category: string): EmailTemplate[] {
  return listTemplates().filter(t => t.category === category)
}

export function getTemplatesByTag(tag: string): EmailTemplate[] {
  return listTemplates().filter(t => t.tags.includes(tag))
}

export function getTemplateCategories(): string[] {
  const categories = new Set(listTemplates().map(t => t.category))
  return Array.from(categories)
}

export function getDefaultTemplate(): EmailTemplate | null {
  return listTemplates().find(t => t.isDefault) || null
}

export function setDefaultTemplate(templateId: string): boolean {
  const template = getTemplate(templateId)
  if (!template) return false
  
  // Remove default from all templates
  for (const [id, tmpl] of templates.entries()) {
    if (tmpl.isDefault) {
      templates.set(id, { ...tmpl, isDefault: false })
    }
  }
  
  // Set new default
  templates.set(templateId, { ...template, isDefault: true })
  return true
}

// Template duplication
export function duplicateTemplate(templateId: string, newName: string): EmailTemplate | null {
  const original = getTemplate(templateId)
  if (!original) return null
  
  const duplicate: EmailTemplate = {
    ...original,
    id: `${templateId}_copy_${Date.now()}`,
    name: newName,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }
  
  return saveTemplate(duplicate, { createVersion: false })
}

// Advanced variable extraction with metadata
export function extractVariablesWithMetadata(template: string): Array<{ name: string; count: number; positions: number[] }> {
  const regex = /\{\{(\w+)\}\}/g
  const variables = new Map<string, { count: number; positions: number[] }>()
  let match
  
  while ((match = regex.exec(template)) !== null) {
    const varName = match[1]
    const current = variables.get(varName) || { count: 0, positions: [] }
    current.count++
    current.positions.push(match.index)
    variables.set(varName, current)
  }
  
  return Array.from(variables.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    positions: data.positions,
  }))
}