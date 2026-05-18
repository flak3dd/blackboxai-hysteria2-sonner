/**
 * Secrets Service
 * 
 * Handles CRUD operations for secrets with encryption
 */

import { prisma } from '@/lib/db'
import { encryptSecret, decryptSecret, isEncryptionConfigured } from '@/lib/crypto/secret-encryption'
import type { Secret, SecretCreate, SecretUpdate, SecretListItem } from './types'
import type { Secret as PrismaSecret } from '@prisma/client'

function fromPrisma(secret: PrismaSecret, includeValue = false): Secret {
  return {
    id: secret.id,
    name: secret.name,
    type: secret.type as any,
    provider: secret.provider as any,
    value: includeValue ? decryptSecret(secret.value) : '********',
    description: secret.description,
    metadata: secret.metadata as any,
    isActive: secret.isActive,
    lastUsedAt: secret.lastUsedAt,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  }
}

function fromPrismaListItem(secret: PrismaSecret): SecretListItem {
  return {
    id: secret.id,
    name: secret.name,
    type: secret.type as any,
    provider: secret.provider as any,
    description: secret.description,
    isActive: secret.isActive,
    lastUsedAt: secret.lastUsedAt,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  }
}

/**
 * List all secrets (without decrypted values)
 */
export async function listSecrets(): Promise<SecretListItem[]> {
  if (!isEncryptionConfigured()) {
    throw new Error('Secret encryption not configured. Set CREDENTIAL_VAULT_KEY environment variable (min 32 characters)')
  }

  const secrets = await prisma.secret.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return secrets.map(fromPrismaListItem)
}

/**
 * Get a secret by ID (with decrypted value)
 */
export async function getSecret(id: string): Promise<Secret | null> {
  if (!isEncryptionConfigured()) {
    throw new Error('Secret encryption not configured. Set CREDENTIAL_VAULT_KEY environment variable (min 32 characters)')
  }

  const secret = await prisma.secret.findUnique({
    where: { id }
  })

  if (!secret) return null

  // Update last used time
  await prisma.secret.update({
    where: { id },
    data: { lastUsedAt: new Date() }
  })

  return fromPrisma(secret, true)
}

/**
 * Create a new secret
 */
export async function createSecret(input: SecretCreate): Promise<Secret> {
  if (!isEncryptionConfigured()) {
    throw new Error('Secret encryption not configured. Set CREDENTIAL_VAULT_KEY environment variable (min 32 characters)')
  }

  const encryptedValue = encryptSecret(input.value)

  const secret = await prisma.secret.create({
    data: {
      name: input.name,
      type: input.type,
      provider: input.provider || null,
      value: encryptedValue,
      description: input.description,
      metadata: input.metadata || {},
      isActive: true,
    }
  })

  return fromPrisma(secret, false)
}

/**
 * Update a secret
 */
export async function updateSecret(id: string, input: SecretUpdate): Promise<Secret> {
  if (!isEncryptionConfigured()) {
    throw new Error('Secret encryption not configured. Set CREDENTIAL_VAULT_KEY environment variable (min 32 characters)')
  }

  const updateData: any = {
    ...(input.name && { name: input.name }),
    ...(input.type && { type: input.type }),
    ...(input.provider !== undefined && { provider: input.provider }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  }

  // Only encrypt value if it's being updated
  if (input.value !== undefined) {
    updateData.value = encryptSecret(input.value)
  }

  const secret = await prisma.secret.update({
    where: { id },
    data: updateData
  })

  return fromPrisma(secret, false)
}

/**
 * Delete a secret
 */
export async function deleteSecret(id: string): Promise<void> {
  await prisma.secret.delete({
    where: { id }
  })
}

/**
 * Get secrets by provider
 */
export async function getSecretsByProvider(provider: string): Promise<SecretListItem[]> {
  if (!isEncryptionConfigured()) {
    throw new Error('Secret encryption not configured. Set CREDENTIAL_VAULT_KEY environment variable (min 32 characters)')
  }

  const secrets = await prisma.secret.findMany({
    where: { provider, isActive: true },
    orderBy: { createdAt: 'desc' }
  })

  return secrets.map(fromPrismaListItem)
}

/**
 * Get secrets by type
 */
export async function getSecretsByType(type: string): Promise<SecretListItem[]> {
  if (!isEncryptionConfigured()) {
    throw new Error('Secret encryption not configured. Set CREDENTIAL_VAULT_KEY environment variable (min 32 characters)')
  }

  const secrets = await prisma.secret.findMany({
    where: { type, isActive: true },
    orderBy: { createdAt: 'desc' }
  })

  return secrets.map(fromPrismaListItem)
}

/**
 * Get active secret value for a provider (helper for deployments)
 */
export async function getSecretForProvider(provider: string, type: string): Promise<string | null> {
  if (!isEncryptionConfigured()) {
    throw new Error('Secret encryption not configured. Set CREDENTIAL_VAULT_KEY environment variable (min 32 characters)')
  }

  const secret = await prisma.secret.findFirst({
    where: {
      provider,
      type,
      isActive: true
    },
    orderBy: { lastUsedAt: 'desc' }
  })

  if (!secret) return null

  // Update last used time
  await prisma.secret.update({
    where: { id: secret.id },
    data: { lastUsedAt: new Date() }
  })

  return decryptSecret(secret.value)
}
