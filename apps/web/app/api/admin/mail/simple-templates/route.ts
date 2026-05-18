/**
 * Simplified Template API
 * 
 * Basic CRUD operations for email templates:
 * - GET: List all templates
 * - POST: Create new template
 * - PUT: Update existing template
 * - DELETE: Delete template
 */

import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  saveTemplate,
  getTemplate,
  listTemplates,
  deleteTemplate,
  updateTemplate,
  type SimpleTemplate,
} from "@c2panel/infrastructure/mailer/simple-templates"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api-simple-templates" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  GET - List Templates                                                */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = `templates-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    await verifyAdmin(req)

    const templates = listTemplates()

    log.info({ requestId, count: templates.length }, "Templates listed")

    return NextResponse.json({
      requestId,
      templates,
    })
  } catch (err) {
    log.error({ requestId, err }, "Failed to list templates")
    return toErrorResponse(err)
  }
}

/* ------------------------------------------------------------------ */
/*  POST - Create Template                                              */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = `template-create-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    await verifyAdmin(req)

    const body = await req.json().catch(() => {
      throw new Error("Invalid JSON in request body")
    })

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body", requestId }, { status: 400 })
    }

    const { id, name, subject, body: templateBody, htmlBody, category } = body

    if (!id || !name || !subject || !templateBody) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, subject, body", requestId },
        { status: 400 }
      )
    }

    const template: SimpleTemplate = {
      id,
      name,
      subject,
      body: templateBody,
      htmlBody,
      category: category || "general",
    }

    const saved = saveTemplate(template)

    log.info({ requestId, templateId: id }, "Template created")

    return NextResponse.json({
      requestId,
      template: saved,
    })
  } catch (err) {
    log.error({ requestId, err }, "Failed to create template")
    return toErrorResponse(err)
  }
}

/* ------------------------------------------------------------------ */
/*  PUT - Update Template                                               */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const requestId = `template-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    await verifyAdmin(req)

    const body = await req.json().catch(() => {
      throw new Error("Invalid JSON in request body")
    })

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body", requestId }, { status: 400 })
    }

    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "Template id is required", requestId }, { status: 400 })
    }

    const updated = updateTemplate(id, updates)

    if (!updated) {
      return NextResponse.json({ error: "Template not found", requestId }, { status: 404 })
    }

    log.info({ requestId, templateId: id }, "Template updated")

    return NextResponse.json({
      requestId,
      template: updated,
    })
  } catch (err) {
    log.error({ requestId, err }, "Failed to update template")
    return toErrorResponse(err)
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE - Delete Template                                            */
/* ------------------------------------------------------------------ */

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const requestId = `template-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    await verifyAdmin(req)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Template id is required", requestId }, { status: 400 })
    }

    const deleted = deleteTemplate(id)

    if (!deleted) {
      return NextResponse.json({ error: "Template not found", requestId }, { status: 404 })
    }

    log.info({ requestId, templateId: id }, "Template deleted")

    return NextResponse.json({
      requestId,
      success: true,
    })
  } catch (err) {
    log.error({ requestId, err }, "Failed to delete template")
    return toErrorResponse(err)
  }
}
