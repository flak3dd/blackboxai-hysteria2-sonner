/**
 * Simplified Email Templates
 * 
 * A streamlined template system focused on:
 * - Basic template storage
 * - Simple variable substitution
 * - Easy template management
 * - No complex versioning or metadata
 */

import { z } from "zod"

/* ------------------------------------------------------------------ */
/*  Types - Simplified                                                  */
/* ------------------------------------------------------------------ */

export const SimpleTemplate = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  htmlBody: z.string().optional(),
  category: z.string().default("general"),
})

export type SimpleTemplate = z.infer<typeof SimpleTemplate>

/* ------------------------------------------------------------------ */
/*  Storage - In-Memory (can be migrated to DB)                        */
/* ------------------------------------------------------------------ */

const templates = new Map<string, SimpleTemplate>()

/* ------------------------------------------------------------------ */
/*  CRUD Operations                                                    */
/* ------------------------------------------------------------------ */

export function saveTemplate(template: SimpleTemplate): SimpleTemplate {
  const now = new Date().toISOString()
  const toSave: SimpleTemplate = {
    ...template,
    // Add timestamps as extra properties (not in schema)
  } as any
  
  templates.set(template.id, toSave)
  return toSave
}

export function getTemplate(id: string): SimpleTemplate | null {
  return templates.get(id) ?? null
}

export function listTemplates(): SimpleTemplate[] {
  return Array.from(templates.values())
}

export function deleteTemplate(id: string): boolean {
  return templates.delete(id)
}

export function updateTemplate(id: string, updates: Partial<SimpleTemplate>): SimpleTemplate | null {
  const existing = getTemplate(id)
  if (!existing) return null
  
  const updated = { ...existing, ...updates }
  return saveTemplate(updated)
}

/* ------------------------------------------------------------------ */
/*  Template Rendering                                                 */
/* ------------------------------------------------------------------ */

export function renderSimpleTemplate(
  template: SimpleTemplate,
  variables: Record<string, string>
): { subject: string; body: string; htmlBody?: string } {
  const safe = (s?: string) => (s ?? "").replace(/[\r\n]/g, " ")
  
  let subject = template.subject
  let body = template.body
  let htmlBody = template.htmlBody

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    subject = subject.replaceAll(placeholder, safe(value))
    body = body.replaceAll(placeholder, safe(value))
    if (htmlBody) {
      htmlBody = htmlBody.replaceAll(placeholder, safe(value))
    }
  }

  return { subject, body, htmlBody }
}

/* ------------------------------------------------------------------ */
/*  Variable Extraction                                                */
/* ------------------------------------------------------------------ */

export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const variables = new Set<string>()
  let match
  
  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1])
  }
  
  return Array.from(variables)
}

export function getTemplateVariables(template: SimpleTemplate): string[] {
  const subjectVars = extractTemplateVariables(template.subject)
  const bodyVars = extractTemplateVariables(template.body)
  const htmlVars = template.htmlBody ? extractTemplateVariables(template.htmlBody) : []
  
  return [...new Set([...subjectVars, ...bodyVars, ...htmlVars])]
}

/* ------------------------------------------------------------------ */
/*  Category Management                                                */
/* ------------------------------------------------------------------ */

export function getTemplatesByCategory(category: string): SimpleTemplate[] {
  return listTemplates().filter(t => t.category === category)
}

export function getCategories(): string[] {
  const categories = new Set(listTemplates().map(t => t.category))
  return Array.from(categories)
}

/* ------------------------------------------------------------------ */
/*  Preset Templates                                                   */
/* ------------------------------------------------------------------ */

export function createPresetTemplates(): void {
  const presets: SimpleTemplate[] = [
    {
      id: "welcome",
      name: "Welcome Email",
      subject: "Welcome {{firstName}}!",
      body: "Hi {{firstName}},\n\nWelcome to our service! We're excited to have you on board.\n\nBest regards,\nThe Team",
      category: "onboarding",
    },
    {
      id: "newsletter",
      name: "Newsletter",
      subject: "Newsletter: {{title}}",
      body: "Hi {{name}},\n\nHere's what's new this week:\n\n{{content}}\n\nBest regards",
      category: "marketing",
    },
    {
      id: "notification",
      name: "System Notification",
      subject: "Notification: {{type}}",
      body: "Hi {{name}},\n\n{{message}}\n\nPlease take action if required.",
      category: "system",
    },
  ]

  presets.forEach(preset => {
    if (!getTemplate(preset.id)) {
      saveTemplate(preset)
    }
  })
}

// Initialize presets on module load
createPresetTemplates()
