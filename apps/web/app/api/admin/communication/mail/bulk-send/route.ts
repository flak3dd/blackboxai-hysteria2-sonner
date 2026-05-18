import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  parseEmailCSV,
  sanitizeRecipients,
  sendBulkEmails,
  type BulkEmailRequest,
} from "@c2panel/infrastructure/mailer/bulk-email"
import { resolveSmtpConfig } from "@c2panel/infrastructure/mailer/smtp-config"
import { getTemplate, renderTemplate, type EmailTemplate } from "@c2panel/infrastructure/mailer/templates"
import {
  injectTrackingPixel,
  injectLinkTracking,
  createTrackingEvent,
  recordTrackingEvent,
  type TrackingConfig,
} from "@c2panel/infrastructure/mailer/tracking"
import { addToQueue, configureQueue } from "@c2panel/infrastructure/mailer/queue"
import { z } from "zod"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api-bulk-send" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AttachmentSchema = z.object({
  filename: z.string(),
  content: z.string(), // Base64 encoded
  contentType: z.string(),
})

const BulkSendSchema = z.object({
  csvContent: z.string().min(1),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(50000).optional(),
  htmlBody: z.string().max(100000).optional(),
  templateId: z.string().optional(),
  templateVariables: z.record(z.string()).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  provider: z.enum(["smtp", "resend", "mysmtp"]).default("smtp"),
  smtpConfigId: z.string().optional(),
  rateLimitPerMinute: z.number().min(1).max(1000).default(60),
  batchSize: z.number().min(1).max(100).default(10),
  delayMs: z.number().min(100).max(60000).default(1000),
  dryRun: z.boolean().default(false),
  enableTracking: z.boolean().default(false),
  trackingConfig: z.object({
    trackingDomain: z.string().url().optional(),
    trackOpens: z.boolean().default(true),
    trackClicks: z.boolean().default(true),
  }).optional(),
  queueEnabled: z.boolean().default(false),
  queueConfig: z.object({
    maxConcurrent: z.number().min(1).max(50).default(5),
    retryAttempts: z.number().min(0).max(10).default(3),
    retryDelayMs: z.number().min(1000).max(300000).default(5000),
  }).optional(),
  campaignId: z.string().optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)

    const requestBody = await req.json()
    const validated = BulkSendSchema.parse(requestBody)

    log.info({
      provider: validated.provider,
      dryRun: validated.dryRun,
      rateLimit: validated.rateLimitPerMinute,
      templateId: validated.templateId,
      trackingEnabled: validated.enableTracking,
      queueEnabled: validated.queueEnabled,
    }, "Bulk email request received")

    // Parse CSV
    const records = parseEmailCSV(validated.csvContent)

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No valid records found in CSV" },
        { status: 400 }
      )
    }

    if (records.length > 100000) {
      return NextResponse.json(
        { error: "CSV too large. Maximum 100,000 records allowed." },
        { status: 400 }
      )
    }

    // Sanitize
    const { valid, invalid, duplicates } = sanitizeRecipients(records)

    log.info({
      total: records.length,
      valid: valid.length,
      invalid: invalid.length,
      duplicates,
    }, "CSV parsed and sanitized")

    // Load template if specified
    let template: EmailTemplate | null = null
    if (validated.templateId) {
      template = getTemplate(validated.templateId)
      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        )
      }
    }

    // Prepare subject and body (from template or direct input)
    let subject = validated.subject || template?.subject || ""
    let body = validated.body || template?.textContent || ""
    let htmlBody = validated.htmlBody || template?.htmlContent || undefined

    // If dry run, return analysis only
    if (validated.dryRun) {
      // Preview with first recipient variables
      const firstRecipient = valid[0]
      const previewVariables = {
        firstName: firstRecipient?.firstName || "",
        lastName: firstRecipient?.lastName || "",
        name: `${firstRecipient?.firstName || ""} ${firstRecipient?.lastName || ""}`.trim(),
        email: firstRecipient?.email || "",
        ...validated.templateVariables,
      }

      let previewSubject = subject
      let previewBody = body
      let previewHtmlBody = htmlBody

      // Render template with variables
      if (template) {
        const rendered = renderTemplate(template, previewVariables)
        previewSubject = rendered.subject
        previewBody = rendered.textContent
        previewHtmlBody = rendered.htmlContent
      } else {
        // Manual variable replacement
        for (const [key, value] of Object.entries(previewVariables)) {
          const placeholder = `{{${key}}}`
          previewSubject = previewSubject.replaceAll(placeholder, value)
          previewBody = previewBody.replaceAll(placeholder, value)
          if (previewHtmlBody) {
            previewHtmlBody = previewHtmlBody.replaceAll(placeholder, value)
          }
        }
      }

      return NextResponse.json({
        dryRun: true,
        summary: {
          totalRecords: records.length,
          validEmails: valid.length,
          invalidEmails: invalid.length,
          duplicates,
          batches: Math.ceil(valid.length / validated.batchSize),
          estimatedMinutes: Math.ceil(
            (valid.length / validated.rateLimitPerMinute)
          ),
          hasTemplate: !!template,
          hasAttachments: (validated.attachments?.length || 0) > 0,
          trackingEnabled: validated.enableTracking,
          queueEnabled: validated.queueEnabled,
        },
        invalidDetails: invalid.slice(0, 20).map((i) => ({
          email: i.record.email,
          reason: i.reason,
          row: i.record.rowNumber,
        })),
        sample: valid.slice(0, 5).map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
        })),
        preview: {
          subject: previewSubject,
          body: previewBody,
          htmlBody: previewHtmlBody,
          firstRecipient: {
            email: firstRecipient?.email,
            variables: previewVariables,
          },
        },
        template: template ? {
          id: template.id,
          name: template.name,
          category: template.category,
          version: template.version,
        } : null,
      })
    }

    // Configure queue if enabled
    if (validated.queueEnabled && validated.queueConfig) {
      configureQueue(validated.queueConfig)
    }

    // Resolve SMTP config if needed
    let smtpConfig = undefined
    if (validated.provider === "smtp") {
      smtpConfig = await resolveSmtpConfig(validated.smtpConfigId)
      if (!smtpConfig) {
        return NextResponse.json(
          {
            error:
              "No SMTP configuration found. Please save an SMTP config or set SMTP_HOST environment variable.",
          },
          { status: 500 }
        )
      }
    }

    // Prepare email data with tracking
    const emailData: BulkEmailRequest = {
      subject,
      body,
      htmlBody,
      provider: validated.provider,
      smtpConfig,
      smtpConfigId: validated.smtpConfigId,
      rateLimitPerMinute: validated.rateLimitPerMinute,
      batchSize: validated.batchSize,
      delayMs: validated.delayMs,
      attachments: validated.attachments,
      campaignId: validated.campaignId,
    }

    // Add tracking configuration if enabled
    if (validated.enableTracking && validated.trackingConfig) {
      emailData.tracking = {
        enabled: true,
        ...validated.trackingConfig,
      }
    }

    // If queue is enabled, add to queue instead of sending immediately
    if (validated.queueEnabled) {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      for (const recipient of valid) {
        const variables = {
          firstName: recipient.firstName || "",
          lastName: recipient.lastName || "",
          name: `${recipient.firstName || ""} ${recipient.lastName || ""}`.trim(),
          email: recipient.email,
          ...validated.templateVariables,
        }

        let renderedSubject = subject
        let renderedBody = body
        let renderedHtmlBody = htmlBody

        if (template) {
          const rendered = renderTemplate(template, variables)
          renderedSubject = rendered.subject
          renderedBody = rendered.textContent
          renderedHtmlBody = rendered.htmlContent
        } else {
          for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`
            renderedSubject = renderedSubject.replaceAll(placeholder, value)
            renderedBody = renderedBody.replaceAll(placeholder, value)
            if (renderedHtmlBody) {
              renderedHtmlBody = renderedHtmlBody.replaceAll(placeholder, value)
            }
          }
        }

        // Inject tracking if enabled
        if (validated.enableTracking && validated.trackingConfig?.trackingDomain && renderedHtmlBody) {
          if (validated.trackingConfig.trackOpens) {
            renderedHtmlBody = injectTrackingPixel(
              renderedHtmlBody,
              `${validated.trackingConfig.trackingDomain}${validated.trackingConfig.trackingPixelPath || "/track/pixel"}`,
              messageId
            )
          }
          if (validated.trackingConfig.trackClicks) {
            renderedHtmlBody = injectLinkTracking(
              renderedHtmlBody,
              validated.trackingConfig.trackingDomain,
              messageId
            )
          }
        }

        addToQueue({
          id: `${messageId}_${recipient.email}`,
          to: recipient.email,
          subject: renderedSubject,
          htmlContent: renderedHtmlBody,
          textContent: renderedBody,
          from: smtpConfig?.fromEmail,
          attachments: validated.attachments,
          metadata: {
            messageId,
            campaignId: validated.campaignId,
            tracking: validated.enableTracking ? {
              enabled: true,
              messageId,
              trackingDomain: validated.trackingConfig?.trackingDomain,
            } : undefined,
          },
        })
      }

      return NextResponse.json({
        success: true,
        queued: true,
        results: {
          totalProcessed: records.length,
          validEmails: valid.length,
          invalidEmails: invalid.length,
          duplicatesRemoved: duplicates,
          emailsQueued: valid.length,
          messageId,
        },
      })
    }

    // Send emails immediately (non-queue mode)
    const result = await sendBulkEmails(
      valid,
      emailData,
      template,
      validated.templateVariables,
      validated.enableTracking ? validated.trackingConfig : undefined,
      (sent, total, failed) => {
        log.info({ sent, total, failed }, "Bulk email progress")
      }
    )

    return NextResponse.json({
      success: true,
      results: {
        totalProcessed: result.total,
        validEmails: result.valid,
        invalidEmails: result.invalid,
        duplicatesRemoved: result.duplicates,
        emailsSent: result.sent,
        emailsFailed: result.failed,
        errors: result.errors.length,
        durationMs: result.durationMs,
      },
      errorDetails: result.errors.slice(0, 50),
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 }
      )
    }

    log.error({ error: err }, "Bulk email send failed")
    return toErrorResponse(err)
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)

    return NextResponse.json({
      endpoints: {
        POST: "/api/admin/communication/mail/bulk-send",
      },
      limits: {
        maxRecords: 100000,
        maxRateLimitPerMinute: 1000,
        maxBatchSize: 100,
        maxAttachments: 10,
      },
      requiredFields: {
        csvContent: "firstName,lastName,email (CSV format)",
      },
      optionalFields: {
        subject: "string (supports {{firstName}}, {{lastName}}, {{email}}, {{name}})",
        body: "string (supports {{firstName}}, {{lastName}}, {{email}}, {{name}})",
        htmlBody: "string (HTML version of body)",
        templateId: "string (use saved template instead of subject/body)",
        templateVariables: "object (additional variables for template)",
        attachments: "array of {filename, content (base64), contentType}",
        provider: "smtp | resend | mysmtp",
        smtpConfigId: "string (required for smtp provider)",
        enableTracking: "boolean (enable email tracking)",
        trackingConfig: "{trackingDomain, trackOpens, trackClicks}",
        queueEnabled: "boolean (use queue instead of immediate send)",
        queueConfig: "{maxConcurrent, retryAttempts, retryDelayMs}",
        campaignId: "string (associate with campaign)",
      },
      features: {
        templates: "Use saved email templates",
        attachments: "Attach files to emails",
        tracking: "Track opens and clicks",
        queue: "Queue emails for batch processing",
        campaigns: "Associate sends with campaigns",
      },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
