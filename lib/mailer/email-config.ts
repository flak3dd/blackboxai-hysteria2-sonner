import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

/**
 * File-backed store for email service configuration.
 * Settings are stored in config/email-config.json (gitignored).
 * Allows admins to configure email defaults from the UI without editing .env.
 */

const CONFIG_DIR = join(process.cwd(), "config")
const CONFIG_FILE = join(CONFIG_DIR, "email-config.json")

export type EmailServiceConfig = {
  /** Default sender address (overrides MAIL_FROM env var) */
  defaultFrom?: string
  /** Default email provider for sends */
  defaultProvider?: "smtp" | "resend" | "mysmtp"
  /** Resend API key override (masked when read) */
  resendApiKey?: string
  /** MySMTP API key override (masked when read) */
  mysmtpApiKey?: string
  /** MySMTP API URL */
  mysmtpApiUrl?: string
  /** Tracking domain for open/click tracking */
  trackingDomain?: string
  /** Default rate limit for bulk sends (emails per minute) */
  defaultRateLimitPerMinute?: number
  /** Default batch size for bulk sends */
  defaultBatchSize?: number
  /** Default delay between batches (ms) */
  defaultDelayMs?: number
  /** Enable open/click tracking by default */
  trackingEnabled?: boolean
}

const CONFIG_KEYS: (keyof EmailServiceConfig)[] = [
  "defaultFrom",
  "defaultProvider",
  "resendApiKey",
  "mysmtpApiKey",
  "mysmtpApiUrl",
  "trackingDomain",
  "defaultRateLimitPerMinute",
  "defaultBatchSize",
  "defaultDelayMs",
  "trackingEnabled",
]

export async function loadEmailConfig(): Promise<EmailServiceConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf8")
    const parsed = JSON.parse(raw)
    const result: EmailServiceConfig = {}
    for (const key of CONFIG_KEYS) {
      if (parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== "") {
        result[key] = parsed[key]
      }
    }
    return result
  } catch {
    return {}
  }
}

export async function saveEmailConfig(config: EmailServiceConfig): Promise<EmailServiceConfig> {
  const existing = await loadEmailConfig()
  const merged: EmailServiceConfig = { ...existing }

  for (const key of CONFIG_KEYS) {
    if (key in config) {
      const val = config[key]
      if (val === "" || val === undefined || val === null) {
        delete merged[key]
      } else {
        merged[key] = val
      }
    }
  }

  await mkdir(CONFIG_DIR, { recursive: true })
  await writeFile(CONFIG_FILE, JSON.stringify(merged, null, 2) + "\n", "utf8")
  return merged
}

/** Return config with secrets masked for safe display */
export function maskEmailConfig(config: EmailServiceConfig): EmailServiceConfig {
  const masked: EmailServiceConfig = { ...config }
  if (masked.resendApiKey) {
    masked.resendApiKey = maskSecret(masked.resendApiKey)
  }
  if (masked.mysmtpApiKey) {
    masked.mysmtpApiKey = maskSecret(masked.mysmtpApiKey)
  }
  return masked
}

function maskSecret(val: string): string {
  if (val.length <= 8) return "***"
  return val.slice(0, 4) + "***" + val.slice(-4)
}

/**
 * Resolve an effective config value:
 * 1. Stored config (if set)
 * 2. Environment variable fallback
 * 3. Hardcoded default
 */
export async function resolveEmailConfig(): Promise<Required<EmailServiceConfig>> {
  const stored = await loadEmailConfig()

  return {
    defaultFrom: stored.defaultFrom || process.env.MAIL_FROM || "noreply@resend.dev",
    defaultProvider: stored.defaultProvider || (process.env.RESEND_API_KEY ? "resend" : "smtp"),
    resendApiKey: stored.resendApiKey || process.env.RESEND_API_KEY || "",
    mysmtpApiKey: stored.mysmtpApiKey || process.env.MYSMTP_API_KEY || "",
    mysmtpApiUrl: stored.mysmtpApiUrl || process.env.MYSMTP_API_URL || "https://my.smtp.com/api/v1",
    trackingDomain: stored.trackingDomain || process.env.TRACKING_DOMAIN || "",
    defaultRateLimitPerMinute: stored.defaultRateLimitPerMinute || 60,
    defaultBatchSize: stored.defaultBatchSize || 10,
    defaultDelayMs: stored.defaultDelayMs || 1000,
    trackingEnabled: stored.trackingEnabled ?? false,
  }
}
