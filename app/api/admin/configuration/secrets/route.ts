import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdmin, toErrorResponse } from '@/lib/auth/admin'
import {
  listSecrets,
  getSecret,
  createSecret,
  updateSecret,
  deleteSecret,
  getSecretsByProvider,
  getSecretsByType,
  getSecretForProvider
} from '@/lib/secrets/service'
import type { SecretCreate, SecretUpdate } from '@/lib/secrets/types'
import { z } from 'zod'
import logger from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'api-admin-secrets' })

// Validation schemas
const SecretCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['ssh_key', 'api_key', 'token', 'password', 'certificate', 'other']),
  provider: z.enum(['aws', 'azure', 'digitalocean', 'hetzner', 'vultr', 'github', 'gitlab', 'openai', 'anthropic', 'google', 'custom']).optional().nullable(),
  value: z.string().min(1),
  description: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional()
})

const SecretUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['ssh_key', 'api_key', 'token', 'password', 'certificate', 'other']).optional(),
  provider: z.enum(['aws', 'azure', 'digitalocean', 'hetzner', 'vultr', 'github', 'gitlab', 'openai', 'anthropic', 'google', 'custom']).optional().nullable(),
  value: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional()
})

/**
 * GET /api/admin/configuration/secrets
 * List all secrets or filter by provider/type
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const requestId = req.headers.get('x-request-id') ?? `secrets-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await verifyAdmin(req)

    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')
    const type = searchParams.get('type')
    const includeValue = searchParams.get('includeValue') === 'true'

    let secrets

    if (provider) {
      secrets = await getSecretsByProvider(provider)
    } else if (type) {
      secrets = await getSecretsByType(type)
    } else {
      secrets = await listSecrets()
    }

    // If includeValue is true, fetch full secrets with decrypted values
    if (includeValue && Array.isArray(secrets)) {
      const fullSecrets = await Promise.all(
        secrets.map(async (s) => await getSecret(s.id))
      )
      return NextResponse.json({
        requestId,
        secrets: fullSecrets.filter((s): s is Exclude<typeof s, null> => s !== null)
      })
    }

    log.info({ requestId, count: secrets.length }, 'Listed secrets')

    return NextResponse.json({
      requestId,
      secrets
    })
  } catch (err) {
    log.error({ err }, 'Failed to list secrets')
    return toErrorResponse(err)
  }
}

/**
 * POST /api/admin/configuration/secrets
 * Create a new secret
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const requestId = req.headers.get('x-request-id') ?? `secrets-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await verifyAdmin(req)

    const body = await req.json().catch(() => {
      throw new Error('Invalid JSON in request body')
    })

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ 
        error: 'Invalid request body',
        requestId 
      }, { status: 400 })
    }

    const input = SecretCreateSchema.parse(body)

    const secret = await createSecret(input as SecretCreate)

    log.info({ requestId, secretId: secret.id, name: secret.name, type: secret.type }, 'Created secret')

    return NextResponse.json({
      requestId,
      secret
    })
  } catch (err) {
    log.error({ err }, 'Failed to create secret')
    return toErrorResponse(err)
  }
}
