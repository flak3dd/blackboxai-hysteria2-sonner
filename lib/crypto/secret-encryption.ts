/**
 * Secret Encryption Module
 * 
 * Provides encryption and decryption for sensitive secrets storage.
 * Uses AES-256-GCM encryption with the CREDENTIAL_VAULT_KEY environment variable.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { serverEnv } from '@/lib/env'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 32
const AUTH_TAG_LENGTH = 16

/**
 * Derive encryption key from master password using scrypt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH)
}

/**
 * Encrypt a secret value
 */
export function encryptSecret(value: string): string {
  const key = serverEnv().CREDENTIAL_VAULT_KEY
  if (!key) {
    throw new Error('CREDENTIAL_VAULT_KEY environment variable is required for secret encryption')
  }

  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const derivedKey = deriveKey(key, salt)
  
  const cipher = createCipheriv(ALGORITHM, derivedKey, iv)
  let encrypted = cipher.update(value, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Combine salt + iv + authTag + encrypted value
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ])
  
  return combined.toString('base64')
}

/**
 * Decrypt a secret value
 */
export function decryptSecret(encryptedValue: string): string {
  const key = serverEnv().CREDENTIAL_VAULT_KEY
  if (!key) {
    throw new Error('CREDENTIAL_VAULT_KEY environment variable is required for secret decryption')
  }

  const combined = Buffer.from(encryptedValue, 'base64')
  
  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
  
  const derivedKey = deriveKey(key, salt)
  
  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, null, 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Validate that the encryption system is working
 */
export function validateEncryption(): boolean {
  try {
    const testValue = 'test-secret-value'
    const encrypted = encryptSecret(testValue)
    const decrypted = decryptSecret(encrypted)
    return testValue === decrypted
  } catch (error) {
    console.error('Encryption validation failed:', error)
    return false
  }
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return Boolean(serverEnv().CREDENTIAL_VAULT_KEY && serverEnv().CREDENTIAL_VAULT_KEY.length >= 32)
}
