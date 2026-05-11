import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import {
  saveTemplate,
  getTemplate,
  listTemplates,
  deleteTemplate,
  renderTemplate,
  extractVariables,
  validateTemplate,
  getTemplateVersions,
  getTemplateVersion,
  restoreTemplateVersion,
  deleteTemplateVersion,
  previewTemplate,
  previewTemplateFromContent,
  getTemplatesByCategory,
  getTemplatesByTag,
  getTemplateCategories,
  getDefaultTemplate,
  setDefaultTemplate,
  duplicateTemplate,
  extractVariablesWithMetadata,
} from "@/lib/mailer/templates"
import { EmailTemplate as EmailTemplateSchema } from "@/lib/mailer/templates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const action = searchParams.get("action")
    const category = searchParams.get("category")
    const tag = searchParams.get("tag")
    
    if (action === "categories") {
      return NextResponse.json({ categories: getTemplateCategories() })
    }
    
    if (action === "default") {
      const defaultTemplate = getDefaultTemplate()
      return NextResponse.json({ template: defaultTemplate })
    }
    
    if (action === "versions" && id) {
      const versions = getTemplateVersions(id)
      return NextResponse.json({ versions })
    }
    
    if (category) {
      const templates = getTemplatesByCategory(category)
      return NextResponse.json({ templates })
    }
    
    if (tag) {
      const templates = getTemplatesByTag(tag)
      return NextResponse.json({ templates })
    }
    
    if (id) {
      const template = getTemplate(id)
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }
      return NextResponse.json(template)
    }
    
    return NextResponse.json({ templates: listTemplates() })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json()
    
    const action = body.action
    
    if (action === "validate") {
      const { htmlContent } = body
      const result = validateTemplate(htmlContent || "")
      return NextResponse.json(result)
    }
    
    if (action === "extract-variables") {
      const { htmlContent, textContent, subject } = body
      const variables = new Set<string>()
      
      if (htmlContent) {
        extractVariables(htmlContent).forEach(v => variables.add(v))
      }
      if (textContent) {
        extractVariables(textContent).forEach(v => variables.add(v))
      }
      if (subject) {
        extractVariables(subject).forEach(v => variables.add(v))
      }
      
      return NextResponse.json({ variables: Array.from(variables) })
    }
    
    if (action === "extract-variables-metadata") {
      const { htmlContent, textContent, subject } = body
      const metadata = []
      
      if (htmlContent) {
        metadata.push(...extractVariablesWithMetadata(htmlContent))
      }
      if (textContent) {
        metadata.push(...extractVariablesWithMetadata(textContent))
      }
      if (subject) {
        metadata.push(...extractVariablesWithMetadata(subject))
      }
      
      // Merge by name
      const merged = new Map<string, { name: string; count: number; positions: number[] }>()
      for (const item of metadata) {
        const existing = merged.get(item.name) || { name: item.name, count: 0, positions: [] }
        existing.count += item.count
        existing.positions.push(...item.positions)
        merged.set(item.name, existing)
      }
      
      return NextResponse.json({ variables: Array.from(merged.values()) })
    }
    
    if (action === "render") {
      const { templateId, variables } = body
      const template = getTemplate(templateId)
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }
      
      const rendered = renderTemplate(template, variables || {})
      return NextResponse.json(rendered)
    }
    
    if (action === "preview") {
      const { templateId, variables } = body
      const preview = previewTemplate(templateId, variables || {})
      if (!preview) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }
      return NextResponse.json(preview)
    }
    
    if (action === "preview-content") {
      const { htmlContent, textContent, subject, variables } = body
      const preview = previewTemplateFromContent(
        htmlContent || "",
        textContent || "",
        subject || "",
        variables || {}
      )
      return NextResponse.json(preview)
    }
    
    if (action === "restore-version") {
      const { templateId, version } = body
      const restored = restoreTemplateVersion(templateId, version)
      if (!restored) {
        return NextResponse.json({ error: "Version not found or restore failed" }, { status: 404 })
      }
      return NextResponse.json(restored)
    }
    
    if (action === "set-default") {
      const { templateId } = body
      const success = setDefaultTemplate(templateId)
      if (!success) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }
    
    if (action === "duplicate") {
      const { templateId, newName } = body
      const duplicated = duplicateTemplate(templateId, newName)
      if (!duplicated) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }
      return NextResponse.json(duplicated)
    }
    
    // Default: save template
    const templateData = EmailTemplateSchema.parse(body)
    const options = {
      createVersion: body.createVersion !== false,
      changelog: body.changelog,
      createdBy: body.createdBy,
    }
    const saved = saveTemplate(templateData, options)
    return NextResponse.json(saved)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const action = searchParams.get("action")
    const version = searchParams.get("version")
    
    if (action === "version" && id && version) {
      const deleted = deleteTemplateVersion(id, parseInt(version))
      if (!deleted) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }
    
    if (!id) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 })
    }
    
    const deleted = deleteTemplate(id)
    if (!deleted) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}