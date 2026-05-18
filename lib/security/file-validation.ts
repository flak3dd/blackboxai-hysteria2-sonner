/**
 * File Upload Validation Utilities
 * 
 * Provides secure file upload validation to prevent:
 * - Malicious file uploads
 * - File size attacks
 * - Invalid file types
 * - Path traversal attacks
 */

import { z } from 'zod'

// Allowed file types for different upload contexts
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
]

export const ALLOWED_CONFIG_TYPES = [
  'application/json',
  'application/x-yaml',
  'text/yaml',
  'text/plain',
]

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  config: 1 * 1024 * 1024, // 1MB
  payload: 50 * 1024 * 1024, // 50MB
  default: 5 * 1024 * 1024, // 5MB
}

export interface FileValidationOptions {
  maxSize?: number
  allowedTypes?: string[]
  requireFilename?: boolean
  sanitizeFilename?: boolean
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedFilename?: string
  fileType?: string
  fileSize?: number
}

/**
 * Validate a file upload
 */
export function validateFileUpload(
  file: File | { name: string; type: string; size: number },
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxSize = FILE_SIZE_LIMITS.default,
    allowedTypes = [],
    requireFilename = true,
    sanitizeFilename = true,
  } = options

  const filename = file instanceof File ? file.name : file.name
  const fileType = file instanceof File ? file.type : file.type
  const fileSize = file instanceof File ? file.size : file.size

  // Check if filename is required
  if (requireFilename && !filename) {
    return {
      valid: false,
      error: 'Filename is required',
    }
  }

  // Check file size
  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize} bytes`,
      fileType,
      fileSize,
    }
  }

  // Check file type if restrictions are provided
  if (allowedTypes.length > 0 && !allowedTypes.includes(fileType)) {
    return {
      valid: false,
      error: `File type ${fileType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      fileType,
      fileSize,
    }
  }

  // Sanitize filename if requested
  let sanitizedFilename = filename
  if (sanitizeFilename && filename) {
    sanitizedFilename = sanitizeFilename(filename)
    
    // Check for path traversal attempts
    if (sanitizedFilename !== filename && sanitizedFilename.includes('..')) {
      return {
        valid: false,
        error: 'Invalid filename: path traversal detected',
        fileType,
        fileSize,
      }
    }
  }

  return {
    valid: true,
    sanitizedFilename,
    fileType,
    fileSize,
  }
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '')
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')
  
  // Remove special characters that could be problematic
  sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '_')
  
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '')
  
  // Limit filename length
  const maxLength = 255
  if (sanitized.length > maxLength) {
    const ext = sanitized.includes('.') ? '.' + sanitized.split('.').pop() : ''
    sanitized = sanitized.substring(0, maxLength - ext.length) + ext
  }
  
  return sanitized || 'unnamed_file'
}

/**
 * Validate file extension against allowed types
 */
export function validateFileExtension(
  filename: string,
  allowedExtensions: string[]
): { valid: boolean; error?: string } {
  const ext = filename.includes('.') ? '.' + filename.split('.').pop()?.toLowerCase() : ''
  
  if (!ext) {
    return { valid: false, error: 'File has no extension' }
  }
  
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension ${ext} is not allowed. Allowed: ${allowedExtensions.join(', ')}`,
    }
  }
  
  return { valid: true }
}

/**
 * Zod schema for file upload validation
 */
export const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  fileType: z.string(),
  fileSize: z.number().int().positive(),
  file: z.instanceof(File).optional(),
})

/**
 * Validate multiple files
 */
export function validateMultipleFiles(
  files: Array<File | { name: string; type: string; size: number }>,
  options: FileValidationOptions = {}
): { valid: boolean; results: FileValidationResult[]; errors: string[] } {
  const results = files.map(file => validateFileUpload(file, options))
  const errors = results
    .filter(result => !result.valid)
    .map(result => result.error || 'Unknown error')
  
  return {
    valid: errors.length === 0,
    results,
    errors,
  }
}

/**
 * Get file category based on MIME type
 */
export function getFileCategory(mimeType: string): 'image' | 'document' | 'config' | 'other' {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image'
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return 'document'
  if (ALLOWED_CONFIG_TYPES.includes(mimeType)) return 'config'
  return 'other'
}

/**
 * Generate safe filename with timestamp
 */
export function generateSafeFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName)
  const timestamp = Date.now()
  const ext = sanitized.includes('.') ? '.' + sanitized.split('.').pop() : ''
  const nameWithoutExt = sanitized.replace(/\.[^.]*$/, '')
  
  return `${nameWithoutExt}_${timestamp}${ext}`
}