import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdmin, toErrorResponse } from '@/lib/auth/admin'
import {
  getSecret,
  updateSecret,
  deleteSecret
} from '@/lib/secrets/service'
import type { SecretUpdate } from '@/lib/secrets/types'
import { z } from 'zod'
import logger from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = logger.child({ module: 'api-admin-secrets-id' })

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
 * GET /api/admin/configuration/secrets/:id
 * Get a specific secret with decrypted value
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const requestId = req.headers.get('x-request-id') ?? `secret-${params.id}-${Date.now()}`
    await verifyAdmin(req)

    const secret = await getSecret(params.id)

    if (!secret) {
      return NextResponse.json({
        error: 'Secret not found',
        requestId
      }, { status: 404 })
    }

    log.info({ requestId, secretId: params.id }, 'Retrieved secret')

    return NextResponse.json({
      requestId,
      secret
    })
  } catch (err) {
    log.error({ err, secretId: params.id }, 'Failed to get secret')
    return toErrorResponse(err)
  }
}

/**
 * PUT /api/admin/configuration/secrets/:id
 * Update a secret
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const requestId = req.headers.get('x-request-id') ?? `secret-${params.id}-${Date.now()}`
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

    const input = SecretUpdateSchema.parse(body)

    const secret = await updateSecret(params.id, input as SecretUpdate)

    log.info({ requestId, secretId: params.id }, 'Updated secret')

    return NextResponse.json({
      requestId,
      secret
    })
  } catch (err) {
    log.error({ err, secretId: params.id }, 'Failed to update secret')
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/admin/configuration/secrets/:id
 * Delete a secret
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const requestId = req.headers.get('x-request-id') ?? `secret-${params.id}-${Date.now()}`
    await verifyAdmin(req)

    await deleteSecret(params.id)

    log.info({ requestId, secretId: params.id }, 'Deleted secret')

    return NextResponse.json({
      requestId,
      message: 'Secret deleted successfully'
    })
  } catch (err) {
    log.error({ err, secretId: params.id }, 'Failed to delete secret')
    return toErrorResponse(err)
  }
}
