import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/admin'
import { enumerateDomain, getAllSubdomains } from '@/lib/osint/domain-enum'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/osint/domain' })

// GET /api/admin/intelligence/osint/domain - Perform domain enumeration
export async function GET(request: NextRequest) {
  const requestId = `osint-domain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    // Verify admin authentication
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter is required', requestId },
        { status: 400 }
      )
    }

    // Validate domain format and length
    if (domain.length > 253) {
      return NextResponse.json(
        { error: 'Domain too long (max 253 characters)', requestId },
        { status: 400 }
      )
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format', requestId },
        { status: 400 }
      )
    }

    // Parse options
    const includeCrtSh = searchParams.get('includeCrtSh') !== 'false'
    const includeDnsEnum = searchParams.get('includeDnsEnum') !== 'false'
    const includeWildcardCheck = searchParams.get('includeWildcardCheck') !== 'false'
    const includeWhois = searchParams.get('includeWhois') !== 'false'
    const includeBruteForce = searchParams.get('includeBruteForce') === 'true'

    log.info({ requestId, domain, includeCrtSh, includeDnsEnum }, 'Starting domain enumeration')

    // Add timeout protection for OSINT operations
    const enumPromise = enumerateDomain(domain, {
      includeCrtSh,
      includeDnsEnum,
      includeWildcardCheck,
      includeWhois,
      includeBruteForce,
    })
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Domain enumeration timeout')), 120000) // 2 minutes
    )
    
    const result = await Promise.race([enumPromise, timeoutPromise]) as any

    // Get all unique subdomains
    const allSubdomains = getAllSubdomains(result)

    log.info({ requestId, domain, subdomainCount: allSubdomains.length }, 'Domain enumeration completed')

    return NextResponse.json({
      success: true,
      requestId,
      domain: result.domain,
      subdomains: allSubdomains,
      sources: result.subdomains,
      dnsRecords: result.dnsRecords,
      whois: result.whois,
      timestamp: result.timestamp,
    })
  } catch (error) {
    log.error({ requestId, err: error }, 'Domain enumeration error')
    return NextResponse.json(
      {
        error: 'Domain enumeration failed',
        requestId,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
