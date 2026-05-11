/**
 * XSS Sanitization Utilities
 * 
 * Provides comprehensive XSS protection for user-generated content:
 * - HTML sanitization
 * - Script tag removal
 * - Event handler removal
 * - CSS expression removal
 * - URL protocol validation
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''

  let sanitized = html

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove on* event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, '')

  // Remove data: protocol (except for safe data URIs like images)
  sanitized = sanitized.replace(/data:(?!image\/[a-z]+;base64)/gi, '')

  // Remove CSS expressions
  sanitized = sanitized.replace(/expression\s*\(/gi, '')

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

  // Remove object tags
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')

  // Remove embed tags
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '')

  // Remove form tags that could submit to external sites
  sanitized = sanitized.replace(/<form\b[^>]*action\s*=\s*["'][^"']*["'][^>]*>/gi, (match) => {
    // Keep forms without action or with same-origin action
    if (!match.includes('action=') || match.includes('action="') || match.includes("action='")) {
      return match
    }
    return '<form>'
  })

  // Remove meta refresh tags
  sanitized = sanitized.replace(/<meta\b[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi, '')

  return sanitized
}

/**
 * Sanitize URL to prevent javascript: and other dangerous protocols
 */
export function sanitizeURL(url: string): string {
  if (!url) return ''

  const trimmed = url.trim()

  // Allow relative URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)
    
    // Only allow safe protocols
    const safeProtocols = ['http:', 'https:', 'ftp:', 'mailto:', 'tel:']
    if (!safeProtocols.includes(parsed.protocol)) {
      return '#'
    }

    // Remove username and password
    parsed.username = ''
    parsed.password = ''

    return parsed.toString()
  } catch {
    // If URL parsing fails, return safe default
    return '#'
  }
}

/**
 * Sanitize user input for safe display in text context
 */
export function sanitizeText(text: string): string {
  if (!text) return ''

  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize user input for safe display in attribute context
 */
export function sanitizeAttribute(value: string): string {
  if (!value) return ''

  return value
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Validate and sanitize JSON input
 */
export function sanitizeJSON(jsonString: string): { valid: boolean; sanitized?: string; error?: string } {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(jsonString)
    
    // Stringify back to ensure it's valid JSON
    const sanitized = JSON.stringify(parsed)
    
    // Check for dangerous patterns in the stringified version
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /expression\s*\(/i,
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        return {
          valid: false,
          error: 'JSON contains potentially dangerous content',
        }
      }
    }
    
    return { valid: true, sanitized }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid JSON format',
    }
  }
}

/**
 * Sanitize CSS to prevent CSS-based XSS
 */
export function sanitizeCSS(css: string): string {
  if (!css) return ''

  let sanitized = css

  // Remove CSS expressions
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '')

  // Remove javascript: and vbscript: in url()
  sanitized = sanitized.replace(/url\s*\(\s*["']?(javascript|vbscript):/gi, 'url("about:blank"')

  // Remove @import with dangerous protocols
  sanitized = sanitized.replace(/@import\s+["']?(javascript|vbscript):/gi, '@import "about:blank"')

  // Remove behavior property
  sanitized = sanitized.replace(/behavior\s*:/gi, '')

  // Remove binding property
  sanitized = sanitized.replace(/-moz-binding\s*:/gi, '')

  return sanitized
}

/**
 * Deep sanitize an object to remove any potentially dangerous content
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj } as T

  for (const key in sanitized) {
    const value = sanitized[key]

    if (typeof value === 'string') {
      // Sanitize string values
      (sanitized as Record<string, unknown>)[key] = sanitizeText(value)
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      // Sanitize array elements
      (sanitized as Record<string, unknown>)[key] = value.map(item =>
        typeof item === 'string' ? sanitizeText(item) : item
      )
    }
  }

  return sanitized
}

/**
 * Validate content type is safe for display
 */
export function isSafeContentType(contentType: string): boolean {
  const safeTypes = [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
  ]

  return safeTypes.some(type => contentType.toLowerCase().includes(type))
}

/**
 * Strip HTML tags from content (for plain text display)
 */
export function stripHTML(html: string): string {
  if (!html) return ''

  return html.replace(/<[^>]*>/g, '')
}

/**
 * Check if string contains potentially dangerous content
 */
export function containsDangerousContent(str: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /expression\s*\(/i,
    /fromCharCode/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
  ]

  return dangerousPatterns.some(pattern => pattern.test(str))
}

/**
 * Sanitize user-provided configuration
 */
export function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(config)) {
    // Skip keys that look like they could be dangerous
    if (key.toLowerCase().includes('script') ||
        key.toLowerCase().includes('javascript') ||
        key.toLowerCase().includes('eval')) {
      continue
    }

    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}