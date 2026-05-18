/**
 * Secrets Management Types
 */

export type SecretType = 'ssh_key' | 'api_key' | 'token' | 'password' | 'certificate' | 'other'

export type SecretProvider = 
  | 'aws' 
  | 'azure' 
  | 'digitalocean' 
  | 'hetzner' 
  | 'vultr' 
  | 'github' 
  | 'gitlab' 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'custom'
  | null

export interface Secret {
  id: string
  name: string
  type: SecretType
  provider: SecretProvider
  value: string // Decrypted value (only returned when explicitly requested)
  description?: string | null
  metadata?: Record<string, any> | null
  isActive: boolean
  lastUsedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SecretCreate {
  name: string
  type: SecretType
  provider?: SecretProvider
  value: string
  description?: string
  metadata?: Record<string, any>
}

export interface SecretUpdate {
  name?: string
  type?: SecretType
  provider?: SecretProvider
  value?: string
  description?: string
  metadata?: Record<string, any>
  isActive?: boolean
}

export interface SecretListItem {
  id: string
  name: string
  type: SecretType
  provider: SecretProvider
  description?: string | null
  isActive: boolean
  lastUsedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  // Value is NOT included in list items for security
}

export interface SecretValidation {
  isValid: boolean
  error?: string
  provider?: string
  canConnect?: boolean
}
