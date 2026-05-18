/**
 * Secrets Integration Helper
 * 
 * Provides helper functions to integrate stored secrets with other systems
 * like deployment providers, AI services, etc.
 */

import { getSecretForProvider, getSecretsByType } from '@/lib/secrets/service'
import { isEncryptionConfigured } from '@/lib/crypto/secret-encryption'

/**
 * Get SSH key for a provider for deployment
 */
export async function getProviderSSHKey(provider: string): Promise<string | null> {
  if (!isEncryptionConfigured()) {
    console.warn('Secret encryption not configured, cannot use stored secrets')
    return null
  }

  try {
    const sshKey = await getSecretForProvider(provider, 'ssh_key')
    return sshKey
  } catch (error) {
    console.error(`Failed to get SSH key for provider ${provider}:`, error)
    return null
  }
}

/**
 * Get API key for a provider
 */
export async function getProviderAPIKey(provider: string): Promise<string | null> {
  if (!isEncryptionConfigured()) {
    console.warn('Secret encryption not configured, cannot use stored secrets')
    return null
  }

  try {
    const apiKey = await getSecretForProvider(provider, 'api_key')
    return apiKey
  } catch (error) {
    console.error(`Failed to get API key for provider ${provider}:`, error)
    return null
  }
}

/**
 * Get all SSH keys for providers
 */
export async function getAllSSHKies(): Promise<Array<{ provider: string; key: string }>> {
  if (!isEncryptionConfigured()) {
    console.warn('Secret encryption not configured, cannot use stored secrets')
    return []
  }

  try {
    const secrets = await getSecretsByType('ssh_key')
    const keys = await Promise.all(
      secrets.map(async (secret) => {
        const key = await getSecretForProvider(secret.provider || 'custom', 'ssh_key')
        return {
          provider: secret.provider || 'custom',
          key: key || ''
        }
      })
    )
    return keys.filter(k => k.key)
  } catch (error) {
    console.error('Failed to get SSH keys:', error)
    return []
  }
}

/**
 * Get secret by name (for specific use cases)
 */
export async function getSecretByName(name: string): Promise<string | null> {
  // This would need to be implemented in the service
  // For now, we'll use provider-based lookup
  console.warn('getSecretByName not yet implemented, use provider-based lookup')
  return null
}

/**
 * Check if a provider has credentials stored
 */
export async function hasProviderCredentials(provider: string): Promise<boolean> {
  if (!isEncryptionConfigured()) return false

  try {
    const apiKey = await getSecretForProvider(provider, 'api_key')
    const sshKey = await getSecretForProvider(provider, 'ssh_key')
    return !!(apiKey || sshKey)
  } catch (error) {
    return false
  }
}
