export type OperationPreset = {
  id: string
  name: string
  description: string
  icon: string
  category: "phishing" | "recon" | "persistence" | "full-chain"
  badge?: string
  nodeSelector: { strategy: "first-online" }
  profile: {
    nameTemplate: string
    port: number
    obfsEnabled: boolean
    obfsPasswordLength: number
    masqueradeUrl: string
  }
  payload: {
    nameTemplate: string
    type: "powershell"
    platform: "windows"
    obfuscationLevel: 0 | 1 | 2 | 3
    amsiBypass: boolean
    etwBypass: boolean
    stringEncode: boolean
  }
  campaign: {
    subject: string
    pretext: "invoice" | "hr_policy" | "it_alert" | "contract"
    pretextArgs: Record<string, string>
    xorKey: number
    rateLimitPerMinute: number
    batchSize: number
    delayMs: number
  }
  requiresEmailList: true
}

export const OPERATION_PRESETS: OperationPreset[] = [
  {
    id: "fast-invoice-phish",
    name: "Invoice Phish",
    description: "Light obfuscation, invoice pretext. Fast delivery, suitable for broad campaigns.",
    icon: "📄",
    category: "phishing",
    badge: "FAST",
    nodeSelector: { strategy: "first-online" },
    profile: { nameTemplate: "invoice-{ts}", port: 443, obfsEnabled: false, obfsPasswordLength: 16, masqueradeUrl: "https://www.microsoft.com" },
    payload: { nameTemplate: "invoice-ps-{ts}", type: "powershell", platform: "windows", obfuscationLevel: 1, amsiBypass: true, etwBypass: false, stringEncode: false },
    campaign: { subject: "Invoice #INV-{ts} — Action Required", pretext: "invoice", pretextArgs: { companyName: "Acme Corp", invoiceNum: "INV-2024-001" }, xorKey: 73, rateLimitPerMinute: 30, batchSize: 5, delayMs: 1200 },
    requiresEmailList: true,
  },
  {
    id: "stealth-hr-phish",
    name: "HR Policy Update",
    description: "Heavy obfuscation, AMSI + ETW bypass. HR policy pretext, low send rate for stealth.",
    icon: "🏢",
    category: "phishing",
    badge: "OPSEC MAX",
    nodeSelector: { strategy: "first-online" },
    profile: { nameTemplate: "hr-op-{ts}", port: 443, obfsEnabled: true, obfsPasswordLength: 32, masqueradeUrl: "https://www.microsoft.com" },
    payload: { nameTemplate: "hr-ps-{ts}", type: "powershell", platform: "windows", obfuscationLevel: 3, amsiBypass: true, etwBypass: true, stringEncode: true },
    campaign: { subject: "Updated Remote Work Policy — Review Required", pretext: "hr_policy", pretextArgs: { companyName: "Acme Corp" }, xorKey: 131, rateLimitPerMinute: 5, batchSize: 2, delayMs: 3000 },
    requiresEmailList: true,
  },
  {
    id: "it-alert-blitz",
    name: "IT Security Alert",
    description: "No obfuscation, maximum send rate. Urgency-driven IT alert pretext.",
    icon: "⚠️",
    category: "phishing",
    badge: "HIGH VOLUME",
    nodeSelector: { strategy: "first-online" },
    profile: { nameTemplate: "it-alert-{ts}", port: 443, obfsEnabled: false, obfsPasswordLength: 16, masqueradeUrl: "https://www.google.com" },
    payload: { nameTemplate: "it-ps-{ts}", type: "powershell", platform: "windows", obfuscationLevel: 0, amsiBypass: false, etwBypass: false, stringEncode: false },
    campaign: { subject: "Immediate Action Required: Security Compliance Tool", pretext: "it_alert", pretextArgs: {}, xorKey: 42, rateLimitPerMinute: 60, batchSize: 10, delayMs: 500 },
    requiresEmailList: true,
  },
  {
    id: "contract-review-targeted",
    name: "Contract Review",
    description: "Medium obfuscation, contract review pretext. Targeted sending for spear-phishing.",
    icon: "📋",
    category: "phishing",
    nodeSelector: { strategy: "first-online" },
    profile: { nameTemplate: "contract-{ts}", port: 8443, obfsEnabled: true, obfsPasswordLength: 16, masqueradeUrl: "https://www.bing.com" },
    payload: { nameTemplate: "contract-ps-{ts}", type: "powershell", platform: "windows", obfuscationLevel: 2, amsiBypass: true, etwBypass: false, stringEncode: true },
    campaign: { subject: "Draft Agreement for Review — Please Respond", pretext: "contract", pretextArgs: { counterparty: "Partner Ltd" }, xorKey: 97, rateLimitPerMinute: 10, batchSize: 3, delayMs: 2000 },
    requiresEmailList: true,
  },
  {
    id: "full-chain-stealth",
    name: "Full Chain (Max Stealth)",
    description: "Salamander obfuscation + max payload obfuscation. Slowest rate, highest opsec.",
    icon: "🕵️",
    category: "full-chain",
    badge: "SALAMANDER",
    nodeSelector: { strategy: "first-online" },
    profile: { nameTemplate: "stealth-{ts}", port: 443, obfsEnabled: true, obfsPasswordLength: 32, masqueradeUrl: "https://www.microsoft.com" },
    payload: { nameTemplate: "stealth-ps-{ts}", type: "powershell", platform: "windows", obfuscationLevel: 3, amsiBypass: true, etwBypass: true, stringEncode: true },
    campaign: { subject: "Action Required: Document Ready for Download", pretext: "invoice", pretextArgs: { companyName: "Global Finance Ltd", invoiceNum: "INV-2024-GFL-001" }, xorKey: 211, rateLimitPerMinute: 3, batchSize: 1, delayMs: 5000 },
    requiresEmailList: true,
  },
  {
    id: "dev-test",
    name: "Dev / Test Run",
    description: "Zero obfuscation, minimal rate. Use for pipeline testing without real impact.",
    icon: "🧪",
    category: "phishing",
    badge: "TEST",
    nodeSelector: { strategy: "first-online" },
    profile: { nameTemplate: "test-{ts}", port: 443, obfsEnabled: false, obfsPasswordLength: 8, masqueradeUrl: "https://www.example.com" },
    payload: { nameTemplate: "test-ps-{ts}", type: "powershell", platform: "windows", obfuscationLevel: 0, amsiBypass: false, etwBypass: false, stringEncode: false },
    campaign: { subject: "Test: Please Ignore", pretext: "it_alert", pretextArgs: {}, xorKey: 1, rateLimitPerMinute: 1, batchSize: 1, delayMs: 500 },
    requiresEmailList: true,
  },
]

export function getPresetById(id: string): OperationPreset | undefined {
  return OPERATION_PRESETS.find((p) => p.id === id)
}

export function listPresets(): OperationPreset[] {
  return OPERATION_PRESETS
}
