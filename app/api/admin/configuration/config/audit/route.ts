import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, AdminPrincipal } from '@/lib/auth/admin'
import {
  checkPasswordStrength,
  validateTLSConfig,
  scoreObfuscationEffectiveness,
  runSecurityChecklist,
  runFullAudit,
  type AuditResult,
} from '@/lib/config/audit'
import { prisma } from '@/lib/db'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/admin/config/audit' })

/**
 * Log audit execution to database
 */
async function logAuditExecution(
  admin: AdminPrincipal,
  auditType: string,
  score: number,
  ipAddress: string | null,
  userAgent: string | null
) {
  try {
    await prisma.auditLog.create({
      data: {
        operatorId: admin.id,
        action: 'CONFIG_AUDIT',
        resource: 'HysteriaServerConfig',
        details: {
          auditType,
          score,
          timestamp: new Date().toISOString(),
        },
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Failed to log audit execution')
  }
}

export async function POST(request: NextRequest) {
  let admin: AdminPrincipal | null = null

  try {
    admin = await verifyAdmin(request)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, config, auditType = 'full' } = body

    let result

    // Support both legacy and new audit types
    switch (type) {
      case 'password':
        result = checkPasswordStrength(config.password)
        break

      case 'tls':
        result = validateTLSConfig(config)
        break

      case 'obfuscation':
        result = scoreObfuscationEffectiveness(config)
        break

      case 'security-checklist':
        result = runSecurityChecklist(config)
        break

      case 'full':
      case 'security':
      case 'performance':
      case 'compliance':
        // Run comprehensive audit
        result = runFullAudit(config, auditType)
        // Log the audit execution
        await logAuditExecution(
          admin,
          auditType,
          (result as AuditResult).score,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          request.headers.get('user-agent') || null
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid audit type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    log.error({ err: error }, 'Config audit error')
    return NextResponse.json(
      { error: 'Audit failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to retrieve audit history
 */
export async function GET(request: NextRequest) {
  let admin: AdminPrincipal | null = null

  try {
    admin = await verifyAdmin(request)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch audit logs for config audits
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: 'CONFIG_AUDIT',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        operator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    const total = await prisma.auditLog.count({
      where: {
        action: 'CONFIG_AUDIT',
      },
    })

    return NextResponse.json({
      success: true,
      data: auditLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch audit history')
    return NextResponse.json(
      { error: 'Failed to fetch audit history', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}