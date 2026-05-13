/* ------------------------------------------------------------------ */
/*  String Encryption Obfuscation Module                               */
/* ------------------------------------------------------------------ */

import { randomBytes } from "crypto"
import logger from "@/lib/logger"

/**
 * Encrypt string literals in source code, replacing them with
 * decryption calls. Uses XOR cipher for lightweight embedding.
 */

/* ------------------------------------------------------------------ */
/*  XOR-based string encryption                                        */
/* ------------------------------------------------------------------ */

function xorEncrypt(plaintext: string, key: string): string {
  const keyBytes = Buffer.from(key, "utf8")
  const plainBytes = Buffer.from(plaintext, "utf8")
  const cipher = Buffer.alloc(plainBytes.length)
  for (let i = 0; i < plainBytes.length; i++) {
    cipher[i] = plainBytes[i] ^ keyBytes[i % keyBytes.length]
  }
  return cipher.toString("base64")
}

function xorDecrypt(cipherB64: string, key: string): string {
  const keyBytes = Buffer.from(key, "utf8")
  const cipher = Buffer.from(cipherB64, "base64")
  const plain = Buffer.alloc(cipher.length)
  for (let i = 0; i < cipher.length; i++) {
    plain[i] = cipher[i] ^ keyBytes[i % keyBytes.length]
  }
  return plain.toString("utf8")
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Encrypt string literals found in source code and replace them
 * with decryption function calls.
 *
 * @param source  - The source code to transform
 * @param key     - Optional encryption key (auto-generated if omitted)
 * @returns The transformed source with encrypted strings
 */
export function encryptStrings(source: string, key?: string): string {
  const encKey = key || randomBytes(16).toString("hex")
  logger.debug({ keyLength: encKey.length }, "String encryption: using key")

  // Generate the decryption helper that will be embedded
  const decryptionStub = generateDecryptionStub(encKey)

  // Find string literals (double-quoted or backtick, length >= 4)
  // Avoid replacing strings that contain template expressions or are import paths
  const stringPattern = /"([^"\\]{4,})"|`([^`\\]{4,})`/g

  let transformed = source
  const replacements: { original: string; encrypted: string }[] = []

  transformed = transformed.replace(stringPattern, (match, dqContent, btContent) => {
    const content = dqContent || btContent

    // Skip import paths, URLs, and strings with template expressions
    if (
      content.startsWith("./") ||
      content.startsWith("../") ||
      content.startsWith("@/") ||
      content.startsWith("http://") ||
      content.startsWith("https://") ||
      content.includes("${") ||
      content.includes("://")
    ) {
      return match
    }

    const encrypted = xorEncrypt(content, encKey)
    replacements.push({ original: content, encrypted })
    return `__dec("${encrypted}")`
  })

  // Prepend the decryption stub if any replacements were made
  if (replacements.length > 0) {
    transformed = decryptionStub + "\n" + transformed
    logger.debug({ count: replacements.length }, "String encryption: replaced literals")
  }

  return transformed
}

/**
 * Generate a decryption helper function stub for the given key.
 *
 * The stub is Go-style pseudo-code that can be adapted per target
 * language by the builder modules.
 */
export function generateDecryptionStub(key: string): string {
  const keyBytes = key
    .split("")
    .map((c) => c.charCodeAt(0))
    .join(",")

  return `// Auto-generated string decryption stub
func __dec(enc string) string {
  key := []byte{${keyBytes}}
  data, _ := base64.StdEncoding.DecodeString(enc)
  out := make([]byte, len(data))
  for i := range data {
    out[i] = data[i] ^ key[i%len(key)]
  }
  return string(out)
}`
}

/**
 * Generate a Python-style decryption stub
 */
export function generatePythonDecryptionStub(key: string): string {
  return `# Auto-generated string decryption stub
import base64
def __dec(enc):
    key = b"${key}"
    data = base64.b64decode(enc)
    return bytes([data[i] ^ key[i % len(key)] for i in range(len(data))]).decode()
`
}

/**
 * Generate a PowerShell-style decryption stub
 */
export function generatePowerShellDecryptionStub(key: string): string {
  return `# Auto-generated string decryption stub
function __dec([string]$enc) {
    $key = [System.Text.Encoding]::UTF8.GetBytes("${key}")
    $data = [System.Convert]::FromBase64String($enc)
    $out = New-Object byte[] $data.Length
    for ($i = 0; $i -lt $data.Length; $i++) {
        $out[$i] = $data[$i] -bxor $key[$i % $key.Length]
    }
    [System.Text.Encoding]::UTF8.GetString($out)
}
`
}

/**
 * Encrypt a single string value (utility for builders)
 */
export function encryptString(plaintext: string, key?: string): { encrypted: string; key: string } {
  const encKey = key || randomBytes(16).toString("hex")
  return {
    encrypted: xorEncrypt(plaintext, encKey),
    key: encKey,
  }
}

/**
 * Decrypt a single string value (utility for testing)
 */
export function decryptString(encrypted: string, key: string): string {
  return xorDecrypt(encrypted, key)
}
