/**
 * API Route: Reasoning Traces
 * 
 * Provides endpoints for:
 * - Listing reasoning traces
 * - Getting trace details
 * - Exporting traces
 * - Getting trace statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { reasoningTraceSystem } from '@/lib/ai/reasoning/reasoning-trace'
import { metaCognitionEngine } from '@/lib/ai/reasoning/meta-cognition'
import { cotEngine } from '@/lib/ai/reasoning/chain-of-thought'

/**
 * GET /api/admin/automation/reasoning/traces
 * List reasoning traces with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request)
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')
    const since = searchParams.get('since')
    const minConfidence = searchParams.get('minConfidence')
    const hasErrors = searchParams.get('hasErrors')

    const filter: any = {}
    if (sessionId) filter.sessionId = sessionId
    if (since) filter.since = parseInt(since, 10)
    if (minConfidence) filter.minConfidence = parseFloat(minConfidence)
    if (hasErrors) filter.hasErrors = hasErrors === 'true'

    const traces = reasoningTraceSystem.getTraces(filter)

    return NextResponse.json({
      success: true,
      traces,
      count: traces.length,
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * DELETE /api/admin/automation/reasoning/traces
 * Clear old traces
 */
export async function DELETE(request: NextRequest) {
  try {
    await verifyAdmin(request)
    const searchParams = request.nextUrl.searchParams
    const maxAge = searchParams.get('maxAge')
    
    if (maxAge) {
      reasoningTraceSystem.clearOldTraces(parseInt(maxAge, 10))
    } else {
      reasoningTraceSystem.clearAll()
    }

    return NextResponse.json({
      success: true,
      message: 'Traces cleared successfully',
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}