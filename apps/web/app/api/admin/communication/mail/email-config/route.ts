import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  loadEmailConfig,
  saveEmailConfig,
  maskEmailConfig,
  resolveEmailConfig,
  type EmailServiceConfig,
} from "@c2panel/infrastructure/mailer/email-config"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EmailConfigUpdateSchema = z.object({
  defaultFrom: z.string().email().optional(),
  defaultProvider: z.enum(["smtp", "resend", "mysmtp"]).optional(),
  resendApiKey: z.string().optional(),
  mysmtpApiKey: z.string().optional(),
  mysmtpApiUrl: z.string().url().optional(),
  trackingDomain: z.string().url().optional().or(z.literal("")),
  defaultRateLimitPerMinute: z.number().int().min(1).max(1000).optional(),
  defaultBatchSize: z.number().int().min(1).max(100).optional(),
  defaultDelayMs: z.number().int().min(100).max(60000).optional(),
  trackingEnabled: z.boolean().optional(),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)

    const stored = await loadEmailConfig()
    const effective = await resolveEmailConfig()

    return NextResponse.json({
      stored: maskEmailConfig(stored),
      effective: {
        defaultFrom: effective.defaultFrom,
        defaultProvider: effective.defaultProvider,
        mysmtpApiUrl: effective.mysmtpApiUrl,
        trackingDomain: effective.trackingDomain,
        defaultRateLimitPerMinute: effective.defaultRateLimitPerMinute,
        defaultBatchSize: effective.defaultBatchSize,
        defaultDelayMs: effective.defaultDelayMs,
        trackingEnabled: effective.trackingEnabled,
      },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)

    const body = await req.json()
    const parsed = EmailConfigUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const update: EmailServiceConfig = {}

    for (const key of Object.keys(parsed.data) as Array<keyof EmailServiceConfig>) {
      const val = parsed.data[key]
      if (val !== undefined) {
        // Treat empty string as "delete / unset"
        if (val === "") {
          update[key] = undefined as any
        } else {
          update[key] = val as any
        }
      }
    }

    const saved = await saveEmailConfig(update)

    return NextResponse.json({
      success: true,
      config: maskEmailConfig(saved),
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.issues },
        { status: 400 }
      )
    }
    return toErrorResponse(err)
  }
}
