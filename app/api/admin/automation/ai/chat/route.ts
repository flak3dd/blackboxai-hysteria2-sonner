import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import { AiChatRequest } from "@/lib/ai/types"
import { runChat } from "@/lib/ai/chat"
import { enforceRateLimit } from "@/lib/infrastructure/rate-limiter"
import logger from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ProgressEvent = {
  type: "step" | "tool_start" | "tool_complete" | "tool_error"
  step?: string
  toolName?: string
  toolArgs?: string
  toolResult?: string
}

const log = logger.child({ module: "api-admin-ai-chat" })

function statusFromErrorCode(code?: string): number {
  switch (code) {
    case "not_found":
      return 404
    case "timeout":
      return 408
    case "max_rounds_exceeded":
      return 422
    case "llm_failed":
      return 502
    default:
      return 500
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const requestId = req.headers.get("x-request-id") ?? `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const admin = await verifyAdmin(req)
    const rateLimited = await enforceRateLimit(req, 'aiChat', admin.id)
    if (rateLimited) return rateLimited
    const adminIdSafe = admin.id.slice(0, 8)
    
    const body = await req.json().catch(() => {
      throw new Error('Invalid JSON in request body')
    })
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ 
        error: 'Invalid request body',
        requestId 
      }, { status: 400 })
    }
    
    const input = AiChatRequest.parse(body)
    
    // Collect progress events
    const progressEvents: ProgressEvent[] = []
    
    log.info({
      requestId,
      adminIdSafe,
      conversationId: input.conversationId,
      messageLength: input.message.length
    }, "AI chat request received")
    
    // Add timeout protection for AI operations
    const chatPromise = runChat(
      input.conversationId,
      input.message,
      admin.id,
      (progress) => {
        progressEvents.push(progress)
      },
      {
        clientMessageId: input.clientMessageId,
        requestId,
      },
    )
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI chat operation timeout')), 300000) // 5 minutes
    )
    
    const result = await Promise.race([chatPromise, timeoutPromise]) as any

    const payload = {
      requestId,
      messages: result.messages,
      error: result.error,
      errorCode: result.errorCode,
      fromIdempotency: result.fromIdempotency ?? false,
      progress: progressEvents,
    }

    if (result.error) {
      const status = statusFromErrorCode(result.errorCode)
      log.warn(
        {
          requestId,
          adminIdSafe,
          conversationId: input.conversationId,
          clientMessageId: input.clientMessageId ?? null,
          errorCode: result.errorCode,
          error: result.error,
        },
        "chat request failed",
      )
      return NextResponse.json(payload, { status })
    }

    log.info({
      requestId,
      adminIdSafe,
      conversationId: input.conversationId,
      messageCount: result.messages?.length || 0
    }, "AI chat request completed successfully")

    return NextResponse.json(payload)
  } catch (err) {
    log.error({ err }, "AI chat request error")
    return toErrorResponse(err)
  }
}
