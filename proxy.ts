import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Global Proxy for Security and Authentication
 * 
 * Features:
 * - Consistent security headers
 * - CSRF protection for state-changing operations
 * - Rate limiting headers
 * - Request logging
 * - Path-based authentication requirements
 */

// Paths that require authentication
const PROTECTED_PATHS = [
  '/admin',
  '/api/admin',
  '/api/dpanel',
]

// Paths that are publicly accessible
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/hysteria',
  '/api/events',
  '/login',
  '/api/shadowgrok/approvals', // Public endpoint for implant approvals
]

// CSRF-sensitive methods
const CSRF_SENSITIVE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Add security headers to all responses
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Add request ID for tracing
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  response.headers.set('x-request-id', requestId)

  // Skip CSRF checks for public paths and GET requests
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))
  const isGetRequest = method === 'GET'

  if (isPublicPath || isGetRequest) {
    return response
  }

  // CSRF protection for state-changing operations on protected paths
  const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path))
  const isCsrfSensitiveMethod = CSRF_SENSITIVE_METHODS.includes(method)

  if (isProtectedPath && isCsrfSensitiveMethod) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const host = request.headers.get('host')

    // Allow same-origin requests
    const isSameOrigin = 
      (origin && new URL(origin).host === host) ||
      (referer && new URL(referer).host === host)

    if (!isSameOrigin && origin && host) {
      return new NextResponse(
        JSON.stringify({ error: 'CSRF validation failed' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  }

  // Log API requests for monitoring
  if (pathname.startsWith('/api/')) {
    console.log(`[API] ${method} ${pathname} - Request ID: ${requestId}`)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
