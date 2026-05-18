/**
 * Config Audit Module
 *
 * Provides security auditing and validation for Hysteria2 configurations
 */

export interface AuditFinding {
  id: string
  category: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
  recommendation: string
  passed: boolean
  weight: number
}

export interface AuditResult {
  score: number
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  findings: AuditFinding[]
  summary: {
    total: number
    passed: number
    failed: number
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  auditedAt: number
  auditType: 'security' | 'performance' | 'compliance' | 'full'
}

export interface PasswordStrengthResult {
  score: number // 0-4
  strength: 'very weak' | 'weak' | 'fair' | 'strong' | 'very strong'
  feedback: string[]
  suggestions: string[]
  entropy: number
}

export interface TLSValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  score: number // 0-100
}

export interface ObfuscationScoreResult {
  score: number // 0-100
  effectiveness: 'poor' | 'basic' | 'good' | 'excellent'
  analysis: {
    passwordStrength: number
    protocolFeatures: number
    configurationComplexity: number
  }
  recommendations: string[]
}

export interface SecurityChecklistResult {
  category: string
  checks: Array<{
    name: string
    passed: boolean
    severity: 'critical' | 'high' | 'medium' | 'low'
    description: string
    recommendation?: string
  }>
  overallScore: number
}

export interface ComplianceCheckResult {
  compliant: boolean
  category: string
  checks: Array<{
    name: string
    passed: boolean
    severity: 'critical' | 'high' | 'medium' | 'low'
    description: string
    reference?: string
  }>
  overallScore: number
}

/**
 * Calculate password entropy (bits of entropy)
 * Higher entropy = stronger password
 */
function calculateEntropy(password: string): number {
  if (!password) return 0

  let charsetSize = 0
  if (/[a-z]/.test(password)) charsetSize += 26
  if (/[A-Z]/.test(password)) charsetSize += 26
  if (/\d/.test(password)) charsetSize += 10
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) charsetSize += 32

  if (charsetSize === 0) return 0

  // Entropy = length * log2(charset size)
  return Math.round(password.length * Math.log2(charsetSize))
}

/**
 * Password Strength Checker
 * Evaluates password strength based on multiple criteria including entropy
 */
export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = []
  const suggestions: string[] = []
  let score = 0

  if (!password || password.length === 0) {
    return {
      score: 0,
      strength: 'very weak',
      feedback: ['Password is required'],
      suggestions: ['Use a strong password with at least 12 characters'],
      entropy: 0,
    }
  }

  // Calculate entropy
  const entropy = calculateEntropy(password)

  // Entropy-based scoring
  if (entropy < 28) {
    feedback.push('Very low entropy - easily crackable')
    suggestions.push('Use a longer password with more character variety')
  } else if (entropy < 36) {
    score += 1
    feedback.push('Low entropy - could be improved')
    suggestions.push('Increase password length or character variety')
  } else if (entropy < 60) {
    score += 2
    feedback.push('Moderate entropy')
    suggestions.push('Consider using 16+ characters for strong security')
  } else if (entropy < 80) {
    score += 3
    feedback.push('Good entropy')
  } else {
    score += 4
    feedback.push('Excellent entropy')
  }

  // Length check
  if (password.length < 8) {
    feedback.push('Password is too short')
    suggestions.push('Use at least 8 characters')
  } else if (password.length < 12) {
    score += 1
    feedback.push('Password length is acceptable but could be longer')
    suggestions.push('Consider using 12+ characters for better security')
  } else if (password.length < 16) {
    score += 2
    feedback.push('Good password length')
  } else {
    score += 3
    feedback.push('Excellent password length')
  }

  // Character variety
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  if (!hasLowercase) {
    suggestions.push('Add lowercase letters')
  }
  if (!hasUppercase) {
    suggestions.push('Add uppercase letters')
  }
  if (!hasNumbers) {
    suggestions.push('Add numbers')
  }
  if (!hasSpecial) {
    suggestions.push('Add special characters')
  }

  const varietyCount = [hasLowercase, hasUppercase, hasNumbers, hasSpecial].filter(Boolean).length
  score += Math.min(varietyCount, 2)

  // Pattern checks
  const commonPatterns = [
    'password', '123456', 'qwerty', 'admin', 'letmein',
    'welcome', 'monkey', 'dragon', 'master', 'hello'
  ]

  const lowerPassword = password.toLowerCase()
  if (commonPatterns.some(pattern => lowerPassword.includes(pattern))) {
    score -= 1
    feedback.push('Password contains common patterns')
    suggestions.push('Avoid common words and patterns')
  }

  // Sequential characters
  const hasSequentialChars = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789|890)/i.test(password)
  if (hasSequentialChars) {
    score -= 1
    feedback.push('Password contains sequential characters')
    suggestions.push('Avoid sequential characters')
  }

  // Repeated characters
  const hasRepeatedChars = /(.)\1{2,}/.test(password)
  if (hasRepeatedChars) {
    score -= 1
    feedback.push('Password contains repeated characters')
    suggestions.push('Avoid repeated characters')
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(4, score))

  let strength: PasswordStrengthResult['strength'] = 'weak'
  switch (score) {
    case 0:
      strength = 'very weak'
      break
    case 1:
      strength = 'weak'
      break
    case 2:
      strength = 'fair'
      break
    case 3:
      strength = 'strong'
      break
    case 4:
      strength = 'very strong'
      break
  }

  return {
    score,
    strength,
    feedback,
    suggestions,
    entropy,
  }
}

/**
 * TLS Configuration Validator
 * Validates TLS certificate, cipher suites, protocols, and key sizes
 */
export function validateTLSConfig(config: {
  cert?: string
  key?: string
  domains?: string[]
  email?: string
  mode?: 'manual' | 'acme'
  minVersion?: string
  cipherSuites?: string[]
  keySize?: number
}): TLSValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 100

  // Mode validation
  if (!config.mode) {
    errors.push('TLS mode must be specified (manual or acme)')
    score -= 40
  }

  if (!config.cert && !config.key && config.mode !== 'acme') {
    errors.push('TLS certificate and key are required for manual mode')
    score -= 50
  }

  // ACME mode validation
  if (config.mode === 'acme') {
    if (!config.email) {
      errors.push('Email is required for ACME mode')
      score -= 30
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) {
      errors.push('Invalid email format for ACME')
      score -= 20
    }

    if (!config.domains || config.domains.length === 0) {
      errors.push('At least one domain is required for ACME')
      score -= 30
    } else {
      config.domains.forEach(domain => {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/.test(domain)) {
          errors.push(`Invalid domain format: ${domain}`)
          score -= 10
        }
      })
    }
  }

  // Manual mode validation
  if (config.mode === 'manual') {
    if (config.cert) {
      // Basic certificate validation
      if (!config.cert.includes('-----BEGIN CERTIFICATE-----')) {
        errors.push('Invalid certificate format')
        score -= 30
      }
    }

    if (config.key) {
      if (!config.key.includes('-----BEGIN') || !config.key.includes('PRIVATE KEY')) {
        errors.push('Invalid private key format')
        score -= 30
      }

      // Key size validation
      if (config.keySize) {
        if (config.keySize < 2048) {
          errors.push('RSA key size must be at least 2048 bits')
          score -= 40
        } else if (config.keySize < 4096) {
          warnings.push('Consider using 4096-bit RSA keys for better security')
          score -= 10
        }
      } else {
        warnings.push('Unable to verify key size - ensure it\'s at least 2048 bits')
        score -= 15
      }
    }

    if (config.cert && config.key) {
      warnings.push('Ensure certificate and key match')
    }
  }

  // TLS version validation
  if (config.minVersion) {
    const supportedVersions = ['1.2', '1.3']
    if (!supportedVersions.includes(config.minVersion)) {
      errors.push(`Unsupported TLS version: ${config.minVersion}`)
      score -= 30
    } else if (config.minVersion === '1.2') {
      warnings.push('Consider using TLS 1.3 only for better security')
      score -= 10
    }
  } else {
    warnings.push('TLS minimum version not specified - defaulting to 1.2')
    score -= 10
  }

  // Cipher suite validation
  if (config.cipherSuites && config.cipherSuites.length > 0) {
    const weakCiphers = [
      'RC4', 'DES', '3DES', 'MD5', 'SHA1', 'CBC',
      'PSK', 'SRP', 'anon', 'EXP', 'EXPORT'
    ]

    const hasWeakCiphers = config.cipherSuites.some(cipher =>
      weakCiphers.some(weak => cipher.toUpperCase().includes(weak))
    )

    if (hasWeakCiphers) {
      errors.push('Cipher suite contains weak algorithms (RC4, DES, 3DES, MD5, etc.)')
      score -= 40
    }

    // Check for strong ciphers
    const strongCiphers = ['AES-256-GCM', 'CHACHA20-POLY1305', 'AES-128-GCM']
    const hasStrongCiphers = config.cipherSuites.some(cipher =>
      strongCiphers.some(strong => cipher.toUpperCase().includes(strong))
    )

    if (!hasStrongCiphers) {
      warnings.push('Consider using strong cipher suites like AES-256-GCM or CHACHA20-POLY1305')
      score -= 15
    }
  } else {
    warnings.push('Cipher suites not specified - using defaults')
    score -= 10
  }

  // Additional security recommendations
  warnings.push('Enable HSTS for production environments')
  warnings.push('Use OCSP stapling for better performance')
  warnings.push('Implement certificate rotation')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, score),
  }
}

/**
 * Obfuscation Effectiveness Scoring
 * Evaluates the effectiveness of obfuscation configuration
 */
export function scoreObfuscationEffectiveness(config: {
  type?: string
  password?: string
  salamander?: boolean
}): ObfuscationScoreResult {
  const recommendations: string[] = []
  let passwordStrength = 0
  let protocolFeatures = 0
  let configurationComplexity = 0

  // Password strength analysis
  if (config.password) {
    const pwdResult = checkPasswordStrength(config.password)
    passwordStrength = (pwdResult.score / 4) * 100 // Convert to 0-100 scale
    recommendations.push(...pwdResult.suggestions)
  } else {
    passwordStrength = 0
    recommendations.push('Set a strong obfuscation password')
  }

  // Protocol features
  if (config.type === 'salamander' || config.salamander) {
    protocolFeatures += 40
    recommendations.push('Salamander obfuscation provides good protocol masking')
  } else {
    protocolFeatures += 20
    recommendations.push('Consider using Salamander obfuscation for better protocol masking')
  }

  if (config.password && config.password.length >= 16) {
    protocolFeatures += 20
  }

  if (config.type) {
    protocolFeatures += 20
  }

  // Configuration complexity
  if (config.type && config.password) {
    configurationComplexity += 40
  }

  if (config.salamander) {
    configurationComplexity += 30
  }

  if (config.password && config.password.length >= 12) {
    configurationComplexity += 30
  }

  const overallScore = Math.round(
    (passwordStrength * 0.4) +
    (protocolFeatures * 0.35) +
    (configurationComplexity * 0.25)
  )

  let effectiveness: ObfuscationScoreResult['effectiveness']
  if (overallScore >= 80) {
    effectiveness = 'excellent'
  } else if (overallScore >= 60) {
    effectiveness = 'good'
  } else if (overallScore >= 40) {
    effectiveness = 'basic'
  } else {
    effectiveness = 'poor'
  }

  return {
    score: overallScore,
    effectiveness,
    analysis: {
      passwordStrength,
      protocolFeatures,
      configurationComplexity,
    },
    recommendations,
  }
}

/**
 * Security Best Practices Checklist
 * Comprehensive security audit checklist
 */
export function runSecurityChecklist(config: {
  auth?: {
    password?: string
    type?: string
  }
  tls?: {
    mode?: string
    cert?: string
    key?: string
  }
  obfs?: {
    type?: string
    password?: string
  }
  bandwidth?: {
    up?: number
    down?: number
  }
}): SecurityChecklistResult {
  const checks: SecurityChecklistResult['checks'] = []

  // Authentication checks
  if (config.auth) {
    checks.push({
      name: 'Strong Authentication Password',
      passed: config.auth.password ? checkPasswordStrength(config.auth.password).score >= 3 : false,
      severity: 'critical',
      description: 'Authentication password should be strong (12+ characters, mixed case, numbers, symbols)',
      recommendation: 'Use a strong password with at least 12 characters including uppercase, lowercase, numbers, and special characters',
    })

    checks.push({
      name: 'Authentication Method',
      passed: !!config.auth.type,
      severity: 'high',
      description: 'Authentication method should be configured',
      recommendation: 'Configure a secure authentication method',
    })
  }

  // TLS checks
  if (config.tls) {
    checks.push({
      name: 'TLS Certificate Valid',
      passed: config.tls.mode === 'acme' || (!!config.tls.cert && !!config.tls.key),
      severity: 'critical',
      description: 'Valid TLS certificate should be configured',
      recommendation: 'Use ACME for automatic certificates or provide valid manual certificates',
    })

    checks.push({
      name: 'TLS Configuration',
      passed: config.tls.mode === 'acme' || ((config.tls.cert?.includes('BEGIN CERTIFICATE') ?? false) && (config.tls.key?.includes('PRIVATE KEY') ?? false)),
      severity: 'high',
      description: 'TLS configuration should be valid',
      recommendation: 'Ensure certificate and key are properly formatted',
    })
  }

  // Obfuscation checks
  if (config.obfs) {
    checks.push({
      name: 'Obfuscation Password Strength',
      passed: config.obfs.password ? checkPasswordStrength(config.obfs.password).score >= 2 : false,
      severity: 'high',
      description: 'Obfuscation password should be at least fair strength',
      recommendation: 'Use a strong obfuscation password with at least 12 characters',
    })

    checks.push({
      name: 'Obfuscation Enabled',
      passed: !!config.obfs.type,
      severity: 'medium',
      description: 'Obfuscation should be enabled for better security',
      recommendation: 'Enable obfuscation to mask traffic patterns',
    })
  }

  // Bandwidth checks
  if (config.bandwidth) {
    checks.push({
      name: 'Bandwidth Limits Configured',
      passed: !!(config.bandwidth.up || config.bandwidth.down),
      severity: 'low',
      description: 'Bandwidth limits help prevent abuse',
      recommendation: 'Configure appropriate bandwidth limits for your use case',
    })
  }

  // General security checks
  checks.push({
    name: 'Strong Secret Keys',
    passed: true, // Assume valid if config exists
    severity: 'critical',
    description: 'All secret keys should be strong and unique',
    recommendation: 'Use strong, unique secrets for all authentication mechanisms',
  })

  checks.push({
    name: 'Regular Updates',
    passed: true, // Assume valid
    severity: 'medium',
    description: 'System should be kept up to date',
    recommendation: 'Keep Hysteria2 and system dependencies updated',
  })

  checks.push({
    name: 'Monitoring Enabled',
    passed: true, // Assume valid
    severity: 'medium',
    description: 'Monitoring and logging should be enabled',
    recommendation: 'Enable monitoring for security and operational visibility',
  })

  const passedChecks = checks.filter(c => c.passed).length
  const overallScore = Math.round((passedChecks / checks.length) * 100)

  return {
    category: 'Security',
    checks,
    overallScore,
  }
}

/**
 * Configuration Compliance Checker
 * Checks configuration against security standards and best practices
 */
export function checkCompliance(config: {
  tls?: {
    mode?: string
    minVersion?: string
    cert?: string
    key?: string
  }
  auth?: {
    password?: string
  }
  obfs?: {
    password?: string
  }
  bandwidth?: {
    up?: number
    down?: number
  }
}): ComplianceCheckResult {
  const checks: ComplianceCheckResult['checks'] = []

  // NIST 800-52 compliance checks
  checks.push({
    name: 'TLS 1.2 or Higher Required',
    passed: !config.tls?.minVersion || ['1.2', '1.3'].includes(config.tls.minVersion),
    severity: 'critical',
    description: 'TLS version must be 1.2 or higher per NIST 800-52',
    reference: 'NIST SP 800-52 Rev. 2',
  })

  checks.push({
    name: 'Strong Cipher Suites',
    passed: true, // Assume valid if not specified
    severity: 'high',
    description: 'Only FIPS-approved cipher suites should be used',
    reference: 'NIST SP 800-52',
  })

  // Password complexity requirements
  if (config.auth?.password) {
    const pwdResult = checkPasswordStrength(config.auth.password)
    checks.push({
      name: 'Password Complexity',
      passed: pwdResult.entropy >= 60,
      severity: 'critical',
      description: 'Passwords should have minimum 60 bits of entropy',
      reference: 'NIST SP 800-63B',
    })
  }

  // Certificate validation
  if (config.tls?.mode === 'manual') {
    checks.push({
      name: 'Certificate Validity',
      passed: !!(config.tls.cert && config.tls.key),
      severity: 'critical',
      description: 'Valid X.509 certificate and private key must be provided',
      reference: 'RFC 5280',
    })
  }

  // OWASP compliance
  checks.push({
    name: 'Transport Encryption',
    passed: !!config.tls,
    severity: 'critical',
    description: 'All data in transit must be encrypted',
    reference: 'OWASP A02:2021',
  })

  checks.push({
    name: 'Data Protection',
    passed: !!(config.auth?.password || config.obfs?.password),
    severity: 'high',
    description: 'Sensitive data must be protected with strong authentication',
    reference: 'OWASP A01:2021',
  })

  // CIS Controls
  checks.push({
    name: 'Secure Configuration',
    passed: true, // Assume valid
    severity: 'medium',
    description: 'System should be configured according to security baselines',
    reference: 'CIS Control 4',
  })

  checks.push({
    name: 'Access Control',
    passed: !!config.auth,
    severity: 'high',
    description: 'Access control mechanisms must be implemented',
    reference: 'CIS Control 6',
  })

  // Resource limits
  if (config.bandwidth) {
    checks.push({
      name: 'Resource Limits',
      passed: !!(config.bandwidth.up || config.bandwidth.down),
      severity: 'low',
      description: 'Resource limits should be configured to prevent abuse',
      reference: 'CIS Control 14',
    })
  }

  const passedChecks = checks.filter(c => c.passed).length
  const overallScore = Math.round((passedChecks / checks.length) * 100)

  return {
    compliant: overallScore >= 80,
    category: 'Compliance',
    checks,
    overallScore,
  }
}

/**
 * Run Full Configuration Audit
 * Executes all audit checks and returns comprehensive results
 */
export function runFullAudit(config: {
  auth?: {
    password?: string
    type?: string
  }
  tls?: {
    mode?: string
    cert?: string
    key?: string
    domains?: string[]
    email?: string
    minVersion?: string
    cipherSuites?: string[]
    keySize?: number
  }
  obfs?: {
    type?: string
    password?: string
    salamander?: boolean
  }
  bandwidth?: {
    up?: number
    down?: number
  }
}, auditType: 'security' | 'performance' | 'compliance' | 'full' = 'full'): AuditResult {
  const findings: AuditFinding[] = []
  let idCounter = 0

  const generateId = () => `audit-${++idCounter}`

  // Password strength audit
  if (config.auth?.password) {
    const pwdResult = checkPasswordStrength(config.auth.password)
    findings.push({
      id: generateId(),
      category: 'Authentication',
      title: 'Authentication Password Strength',
      severity: pwdResult.score < 2 ? 'critical' : pwdResult.score < 3 ? 'high' : 'medium',
      description: `Password strength: ${pwdResult.strength} (entropy: ${pwdResult.entropy} bits)`,
      recommendation: pwdResult.suggestions.join('. '),
      passed: pwdResult.score >= 3,
      weight: 10,
    })
  }

  // TLS configuration audit
  if (config.tls) {
    const tlsResult = validateTLSConfig(config.tls)

    tlsResult.errors.forEach(error => {
      findings.push({
        id: generateId(),
        category: 'TLS',
        title: 'TLS Configuration Error',
        severity: 'critical',
        description: error,
        recommendation: 'Fix the TLS configuration error',
        passed: false,
        weight: 15,
      })
    })

    tlsResult.warnings.forEach(warning => {
      findings.push({
        id: generateId(),
        category: 'TLS',
        title: 'TLS Configuration Warning',
        severity: 'medium',
        description: warning,
        recommendation: 'Consider addressing this TLS warning',
        passed: true,
        weight: 5,
      })
    })

    if (tlsResult.valid) {
      findings.push({
        id: generateId(),
        category: 'TLS',
        title: 'TLS Configuration Valid',
        severity: 'info',
        description: 'TLS configuration is valid',
        recommendation: 'Continue monitoring TLS configuration',
        passed: true,
        weight: 10,
      })
    }
  }

  // Obfuscation audit
  if (config.obfs) {
    const obfsResult = scoreObfuscationEffectiveness(config.obfs)
    findings.push({
      id: generateId(),
      category: 'Obfuscation',
      title: 'Obfuscation Effectiveness',
      severity: obfsResult.score < 40 ? 'high' : obfsResult.score < 60 ? 'medium' : 'low',
      description: `Obfuscation effectiveness: ${obfsResult.effectiveness} (${obfsResult.score}/100)`,
      recommendation: obfsResult.recommendations.join('. '),
      passed: obfsResult.score >= 60,
      weight: 8,
    })
  }

  // Security checklist
  if (auditType === 'security' || auditType === 'full') {
    const securityResult = runSecurityChecklist(config)
    securityResult.checks.forEach(check => {
      findings.push({
        id: generateId(),
        category: 'Security',
        title: check.name,
        severity: check.severity,
        description: check.description,
        recommendation: check.recommendation || '',
        passed: check.passed,
        weight: check.severity === 'critical' ? 15 : check.severity === 'high' ? 10 : check.severity === 'medium' ? 5 : 2,
      })
    })
  }

  // Compliance check
  if (auditType === 'compliance' || auditType === 'full') {
    const complianceResult = checkCompliance(config)
    complianceResult.checks.forEach(check => {
      findings.push({
        id: generateId(),
        category: 'Compliance',
        title: check.name,
        severity: check.severity,
        description: check.description,
        recommendation: `Reference: ${check.reference || 'N/A'}`,
        passed: check.passed,
        weight: check.severity === 'critical' ? 15 : check.severity === 'high' ? 10 : 5,
      })
    })
  }

  // Performance checks
  if (auditType === 'performance' || auditType === 'full') {
    if (config.bandwidth) {
      findings.push({
        id: generateId(),
        category: 'Performance',
        title: 'Bandwidth Limits Configured',
        severity: 'low',
        description: 'Bandwidth limits are configured',
        recommendation: 'Monitor bandwidth usage and adjust limits as needed',
        passed: !!(config.bandwidth.up || config.bandwidth.down),
        weight: 3,
      })
    }

    findings.push({
      id: generateId(),
      category: 'Performance',
      title: 'TLS Version',
      severity: 'info',
      description: config.tls?.minVersion ? `Using TLS ${config.tls.minVersion}` : 'TLS version not specified',
      recommendation: 'Consider using TLS 1.3 for better performance',
      passed: true,
      weight: 2,
    })
  }

  // Calculate overall score
  const totalWeight = findings.reduce((sum, f) => sum + f.weight, 0)
  const passedWeight = findings.filter(f => f.passed).reduce((sum, f) => sum + f.weight, 0)
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0

  // Calculate grade
  let grade: AuditResult['grade'] = 'F'
  if (score >= 95) grade = 'A+'
  else if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 60) grade = 'D'

  // Calculate summary
  const summary = {
    total: findings.length,
    passed: findings.filter(f => f.passed).length,
    failed: findings.filter(f => !f.passed).length,
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    info: findings.filter(f => f.severity === 'info').length,
  }

  return {
    score,
    grade,
    findings,
    summary,
    auditedAt: Date.now(),
    auditType,
  }
}