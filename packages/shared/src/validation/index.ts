// Shared validation schemas using Zod

import { z } from 'zod'

// Common schemas
export const IdSchema = z.string().min(1).max(255)

export const EmailSchema = z.string().email()

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(data => data.startDate <= data.endDate, {
  message: 'Start date must be before or equal to end date',
})

// API request schemas
export const ApiKeyHeaderSchema = z.object({
  'x-api-key': z.string().min(1),
})

export const BearerTokenSchema = z.object({
  authorization: z.string().regex(/^Bearer\s.+$/, 'Must be a Bearer token'),
})

// Export types
export type Id = z.infer<typeof IdSchema>
export type Pagination = z.infer<typeof PaginationSchema>
export type DateRange = z.infer<typeof DateRangeSchema>
