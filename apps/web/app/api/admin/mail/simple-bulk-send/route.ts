/**
 * Simplified Bulk Email API Endpoint
 * 
 * A streamlined API for bulk email sending with:
 * - Single endpoint for both dry-run and actual sending
 * - Basic validation and error handling
 * - Progress tracking
 * - Support for SMTP, Resend, MySMTP
 */

import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  parseSimpleCSV,
  validateRecipients,
  sendSimpleBulkEmail,
  type SimpleEmailRequest,
} from "@c2panel/infrastructure/mailer/simple-bulk-email"
import { resolveSmtpConfig } from "@c2panel/infrastructure/mailer/smtp-config"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api-simple-bulk-send" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  POST - Send Bulk Emails                                            */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    await verifyAdmin(req)

    const body = await req.json().catch(() => {
      throw new Error("Invalid JSON in request body")
    })

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body", requestId },
        { status: 400 }
      )
    }

    const { csvContent, subject, body: emailBody, htmlBody, provider, smtpConfigId, dryRun, rateLimitPerMinute } = body

    // Validate required fields
    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json({ error: "csvContent is required", requestId }, { status: 400 })
    }
    if (!subject || typeof subject !== "string") {
      return NextResponse.json({ error: "subject is required", requestId }, { status: 400 })
    }
    if (!emailBody || typeof emailBody !== "string") {
      return NextResponse.json({ error: "body is required", requestId }, { status: 400 })
    }
    if (!provider || !["smtp", "resend", "mysmtp"].includes(provider)) {
      return NextResponse.json(
        { error: "provider must be smtp, resend, or mysmtp", requestId },
        { status: 400 }
      )
    }

    log.info({ requestId, provider, csvLength: csvContent.length }, "Bulk email request received")

    // Parse CSV
    const recipients = parseSimpleCSV(csvContent)

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No valid recipients found in CSV", requestId }, { status: 400 })
    }

    // Validate recipients
    const { valid, invalid } = validateRecipients(recipients)

    log.info({ requestId, total: recipients.length, valid: valid.length, invalid: invalid.length }, "Recipients validated")

    // Dry run - return validation results only
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        requestId,
        summary: {
          totalRecipients: recipients.length,
          validEmails: valid.length,
          invalidEmails: invalid.length,
        },
        invalidDetails: invalid.slice(0, 20),
        sampleRecipients: valid.slice(0, 5),
      })
    }

    // Resolve SMTP config if needed
    let smtpConfig
    if (provider === "smtp") {
      smtpConfig = await resolveSmtpConfig(smtpConfigId)
      if (!smtpConfig) {
        return NextResponse.json(
          { error: "SMTP configuration not found", requestId },
          { status: 500 }
        )
      }
    }

    // Send emails
    const result = await sendSimpleBulkEmail({
      recipients: valid,
      subject,
      body: emailBody,
      htmlBody,
      provider,
      smtpConfig,
      rateLimitPerMinute: rateLimitPerMinute || 60,
      onProgress: (sent, total, failed) => {
        log.info({ requestId, sent, total, failed }, "Send progress")
      },
    })

    log.info({ requestId, sent: result.sent, failed: result.failed, duration: result.durationMs }, "Bulk send completed")

    return NextResponse.json({
      success: true,
      requestId,
      result,
    })
  } catch (err) {
    log.error({ requestId, err }, "Bulk email send failed")
    return toErrorResponse(err)
  }
}
