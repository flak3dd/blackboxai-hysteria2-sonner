import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import {
  listSmtpConfigs,
  createSmtpConfig,
  SmtpConfigInput,
} from "@/lib/mailer/smtp-config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/communication/mail/smtp-configs
 * List all saved SMTP configurations (passwords excluded)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const configs = await listSmtpConfigs()
    return NextResponse.json({ configs })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/admin/communication/mail/smtp-configs
 * Create a new SMTP configuration
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json().catch(() => null)
    const parsed = SmtpConfigInput.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
    }
    const config = await createSmtpConfig(parsed.data)
    return NextResponse.json({ success: true, config })
  } catch (err) {
    return toErrorResponse(err)
  }
}
