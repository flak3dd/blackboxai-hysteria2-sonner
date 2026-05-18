// Utility functions

export * from './performance'
export * from './formatting'
export * from './crypto'

// Re-export cn from original utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
