/**
 * API Robustness Helpers
 * 
 * Standardized utility functions for API route robustness:
 * - Request ID generation
 * - Timeout protection
 * - Input validation helpers
 * - Error response formatting
 * - Logging helpers
 * - Rate limit integration
 */

import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'

/**
 * Generate a unique request ID with timestamp and random component
 */
export function generateRequestId(prefix: string = 'req'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Add timeout protection to any async operation
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)), timeoutMs)
  )
  
  return Promise.race([promise, timeoutPromise])
}

/**
 * Safely parse JSON from request with proper error handling
 */
export async function safeParseJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    
    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be a valid JSON object')
    }
    
    return body
  } catch (error) {
    if (error instanceof Error && error.message.includes('JSON')) {
      throw new Error('Invalid JSON in request body')
    }
    throw error
  }
}

/**
 * Standard error response format
 */
export function errorResponse(
  error: string,
  statusCode: number = 500,
  requestId: string = 'unknown',
  details?: unknown
): NextResponse {
  return NextResponse.json({
    error,
    requestId,
    ...(details && { details })
  }, { status: statusCode })
}

/**
 * Standard success response format
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  requestId: string = 'unknown'
): NextResponse {
  return NextResponse.json({
    ...data,
    requestId
  }, { status: statusCode })
}

/**
 * Validation helper for common patterns
 */
export const Validators = {
  /**
   * Validate UUID format
   */
  isValidUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  },

  /**
   * Validate email format
   */
  isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  },

  /**
   * Validate domain format
   */
  isValidDomain(value: string): boolean {
    if (value.length > 253) return false
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
    return domainRegex.test(value)
  },

  /**
   * Validate URL format
   */
  isValidUrl(value: string): boolean {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Common timeout defaults for different operation types
 */
export const TimeoutDefaults = {
  AI_OPERATIONS: 300000,      // 5 minutes
  OSINT_OPERATIONS: 120000,   // 2 minutes
  DEPLOYMENT_OPERATIONS: 300000, // 5 minutes
  PAYLOAD_OPERATIONS: 180000, // 3 minutes
  DATABASE_OPERATIONS: 30000, // 30 seconds
  API_CALLS: 60000,           // 1 minute
  FILE_OPERATIONS: 120000,    // 2 minutes
} as const

/**
 * Logging helper with request context
 */
export function createRequestLogger(requestId: string, module: string) {
  return logger.child({ module, requestId })
}

/**
 * Rate limit categories for different API types
 */
export enum RateLimitCategory {
  AUTH = 'auth',
  AI_CHAT = 'aiChat',
  OSINT = 'osint',
  THREAT_INTEL = 'threatIntel',
  DNS = 'dns',
  GENERAL = 'general',
  DEPLOYMENT = 'deployment',
  PAYLOAD = 'payload',
}

/**
 * Standardized API route wrapper with robustness features
 */
export async function withApiRobustness<T>(
  req: NextRequest,
  handler: (requestId: string, body: Record<string, unknown>) => Promise<T>,
  options: {
    requestIdPrefix?: string
    timeoutMs?: number
    rateLimitCategory?: RateLimitCategory
    requireJson?: boolean
    skipRateLimit?: boolean
  } = {}
): Promise<NextResponse> {
  const {
    requestIdPrefix = 'api',
    timeoutMs,
    requireJson = true,
  } = options

  const requestId = generateRequestId(requestIdPrefix)
  const log = createRequestLogger(requestId, 'api-robustness')

  try {
    // Parse JSON if required
    let body: Record<string, unknown> = {}
    if (requireJson) {
      body = await safeParseJson(req)
    }

    // Execute handler with optional timeout
    const result = timeoutMs 
      ? await withTimeout(handler(requestId, body), timeoutMs, 'API operation')
      : await handler(requestId, body)

    return successResponse(result, 200, requestId)
  } catch (error) {
    log.error({ error }, 'API request failed')
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return errorResponse('Operation timeout', 408, requestId)
      }
      if (error.message.includes('JSON')) {
        return errorResponse('Invalid request body', 400, requestId)
      }
      if (error.message.includes('validation')) {
        return errorResponse('Validation failed', 400, requestId)
      }
    }
    
    return errorResponse('Internal server error', 500, requestId)
  }
}
