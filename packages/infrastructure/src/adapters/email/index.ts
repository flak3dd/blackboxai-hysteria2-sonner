import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

export const resend = resendApiKey ? new Resend(resendApiKey) : null

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!resend) {
    console.warn('Resend not configured, email not sent:', options.subject)
    return
  }

  await resend.emails.send({
    from: options.from || process.env.MAIL_FROM || 'onboarding@resend.dev',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}
