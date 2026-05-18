/**
 * Simplified Bulk Email Service
 * 
 * A streamlined version focused on core functionality:
 * - CSV-based recipient lists
 * - Basic personalization (firstName, lastName, email)
 * - Multiple provider support (SMTP, Resend, MySMTP)
 * - Simple progress tracking
 * - Basic error handling
 */

import logger from "@/lib/logger"
import { sendTestEmail } from "@/lib/mail/sender"
import type { SmtpConfig } from "@/lib/mail/types"
import { sendResendEmail } from "./resend"
import { sendMySmtpEmail } from "./mysmtp"
import { prisma } from "@/lib/db"

const log = logger.child({ module: "simple-bulk-email" })

/* ------------------------------------------------------------------ */
/*  Core Types - Simplified                                             */
/* ------------------------------------------------------------------ */

export interface SimpleRecipient {
  firstName: string
  lastName: string
  email: string
}

export interface SimpleEmailRequest {
  recipients: SimpleRecipient[]
  subject: string
  body: string
  htmlBody?: string
  provider: "smtp" | "resend" | "mysmtp"
  smtpConfig?: SmtpConfig
  rateLimitPerMinute?: number
  onProgress?: (sent: number, total: number, failed: number) => void
}

export interface SimpleEmailResult {
  total: number
  sent: number
  failed: number
  errors: Array<{ email: string; error: string }>
  durationMs: number
}

/* ------------------------------------------------------------------ */
/*  CSV Parser - Simplified                                            */
/* ------------------------------------------------------------------ */

export function parseSimpleCSV(content: string): SimpleRecipient[] {
  const lines = content.split("\n").filter((line) => line.trim())
  const recipients: SimpleRecipient[] = []

  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes("first") ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""))

    // Handle: firstName,lastName,email
    if (parts.length >= 3) {
      recipients.push({
        firstName: parts[0],
        lastName: parts[1],
        email: parts[2].toLowerCase(),
      })
    }
    // Handle: email only
    else if (parts.length === 1 && parts[0].includes("@")) {
      recipients.push({
        firstName: "",
        lastName: "",
        email: parts[0].toLowerCase(),
      })
    }
  }

  return recipients
}

/* ------------------------------------------------------------------ */
/*  Validation - Simplified                                            */
/* ------------------------------------------------------------------ */

export function validateRecipients(recipients: SimpleRecipient[]): {
  valid: SimpleRecipient[]
  invalid: Array<{ email: string; reason: string }>
} {
  const valid: SimpleRecipient[] = []
  const invalid: Array<{ email: string; reason: string }> = []
  const seen = new Set<string>()

  for (const recipient of recipients) {
    const email = recipient.email?.toLowerCase().trim()
    
    if (!email || !email.includes("@") || !email.includes(".")) {
      invalid.push({ email: email || "unknown", reason: "Invalid email format" })
      continue
    }

    if (seen.has(email)) {
      continue // Skip duplicates silently
    }

    seen.add(email)
    valid.push(recipient)
  }

  return { valid, invalid }
}

/* ------------------------------------------------------------------ */
/*  Template Substitution - Simplified                                 */
/* ------------------------------------------------------------------ */

export function substituteVariables(
  template: string,
  recipient: SimpleRecipient
): string {
  const safe = (s?: string) => (s ?? "").replace(/[\r\n]/g, " ")
  const fullName = `${recipient.firstName} ${recipient.lastName}`.trim()

  return template
    .replace(/\{\{firstName\}\}/gi, safe(recipient.firstName))
    .replace(/\{\{lastName\}\}/gi, safe(recipient.lastName))
    .replace(/\{\{email\}\}/gi, safe(recipient.email))
    .replace(/\{\{name\}\}/gi, safe(fullName))
}

/* ------------------------------------------------------------------ */
/*  Main Send Function - Simplified                                    */
/* ------------------------------------------------------------------ */

export async function sendSimpleBulkEmail(
  request: SimpleEmailRequest
): Promise<SimpleEmailResult> {
  const startTime = Date.now()
  const rateLimit = request.rateLimitPerMinute ?? 60
  const batchSize = 10
  const delayMs = Math.max(1000, (60000 / rateLimit) * batchSize)

  let sent = 0
  let failed = 0
  const errors: Array<{ email: string; error: string }> = []

  log.info(
    {
      totalRecipients: request.recipients.length,
      provider: request.provider,
    },
    "Starting simplified bulk email send"
  )

  // Process in batches
  for (let i = 0; i < request.recipients.length; i += batchSize) {
    const batch = request.recipients.slice(i, i + batchSize)

    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        const personalizedSubject = substituteVariables(request.subject, recipient)
        const personalizedBody = substituteVariables(request.body, recipient)
        const personalizedHtml = request.htmlBody 
          ? substituteVariables(request.htmlBody, recipient)
          : undefined

        try {
          switch (request.provider) {
            case "smtp": {
              if (!request.smtpConfig) {
                throw new Error("SMTP config required")
              }
              const result = await sendTestEmail({
                smtp: request.smtpConfig,
                to: recipient.email,
                subject: personalizedSubject,
                body: personalizedBody,
              })
              if (!result.ok) throw new Error("SMTP send failed")
              break
            }
            case "resend": {
              const result = await sendResendEmail({
                to: recipient.email,
                subject: personalizedSubject,
                html: personalizedHtml || `<p>${personalizedBody}</p>`,
                text: personalizedBody,
              })
              if (!result.success) throw new Error(result.error || "Resend failed")
              break
            }
            case "mysmtp": {
              const result = await sendMySmtpEmail({
                to: recipient.email,
                subject: personalizedSubject,
                html: personalizedHtml || `<p>${personalizedBody}</p>`,
                text: personalizedBody,
              })
              if (!result.success) throw new Error(result.error || "MySMTP failed")
              break
            }
            default:
              throw new Error(`Unknown provider: ${request.provider}`)
          }

          // Log success
          await logEmailSent(recipient.email, personalizedSubject, request.provider)
        } catch (error) {
          throw error
        }
      })
    )

    // Count results
    results.forEach((result, idx) => {
      const recipient = batch[idx]
      if (result.status === "fulfilled") {
        sent++
      } else {
        failed++
        errors.push({
          email: recipient.email,
          error: result.reason instanceof Error ? result.reason.message : "Unknown error",
        })
      }
    })

    // Report progress
    request.onProgress?.(sent, request.recipients.length, failed)

    // Rate limiting delay
    if (i + batchSize < request.recipients.length) {
      await sleep(delayMs)
    }
  }

  const durationMs = Date.now() - startTime
  log.info({ sent, failed, durationMs }, "Bulk email send completed")

  return {
    total: request.recipients.length,
    sent,
    failed,
    errors,
    durationMs,
  }
}

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                   */
/* ------------------------------------------------------------------ */

async function logEmailSent(to: string, subject: string, provider: string): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        to,
        subject,
        type: "bulk",
        messageId: `simple-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    })
  } catch {
    // Silently ignore logging failures
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ------------------------------------------------------------------ */
/*  Quick Send - For Single Emails                                    */
/* ------------------------------------------------------------------ */

export async function sendQuickEmail(params: {
  to: string
  subject: string
  body: string
  htmlBody?: string
  provider: "smtp" | "resend" | "mysmtp"
  smtpConfig?: SmtpConfig
}): Promise<{ success: boolean; error?: string }> {
  try {
    switch (params.provider) {
      case "smtp": {
        if (!params.smtpConfig) {
          return { success: false, error: "SMTP config required" }
        }
        const result = await sendTestEmail({
          smtp: params.smtpConfig,
          to: params.to,
          subject: params.subject,
          body: params.body,
        })
        if (!result.ok) return { success: false, error: "SMTP send failed" }
        break
      }
      case "resend": {
        const result = await sendResendEmail({
          to: params.to,
          subject: params.subject,
          html: params.htmlBody || `<p>${params.body}</p>`,
          text: params.body,
        })
        if (!result.success) return { success: false, error: result.error || "Resend failed" }
        break
      }
      case "mysmtp": {
        const result = await sendMySmtpEmail({
          to: params.to,
          subject: params.subject,
          html: params.htmlBody || `<p>${params.body}</p>`,
          text: params.body,
        })
        if (!result.success) return { success: false, error: result.error || "MySMTP failed" }
        break
      }
      default:
        return { success: false, error: "Unknown provider" }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
