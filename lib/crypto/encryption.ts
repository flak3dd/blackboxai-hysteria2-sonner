import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

const ENCRYPTION_KEY = process.env.SSH_KEY_ENCRYPTION_KEY || "default-encryption-key-change-in-production-32b"
const ALGORITHM = "aes-256-gcm"

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
  const key = scryptSync(ENCRYPTION_KEY, "salt", 32)
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const authTag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  }
}

/**
 * Decrypt a string using AES-256-GCM
 */
export function decrypt(encrypted: string, iv: string, authTag: string): string {
  const key = scryptSync(ENCRYPTION_KEY, "salt", 32)
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"))
  
  decipher.setAuthTag(Buffer.from(authTag, "hex"))
  
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}

/**
 * Encrypt SSH private key for storage
 */
export function encryptSshKey(privateKey: string): string {
  const { encrypted, iv, authTag } = encrypt(privateKey)
  return JSON.stringify({ encrypted, iv, authTag })
}

/**
 * Decrypt SSH private key from storage
 */
export function decryptSshKey(encryptedData: string): string {
  try {
    const { encrypted, iv, authTag } = JSON.parse(encryptedData)
    return decrypt(encrypted, iv, authTag)
  } catch (error) {
    throw new Error("Failed to decrypt SSH key")
  }
}
