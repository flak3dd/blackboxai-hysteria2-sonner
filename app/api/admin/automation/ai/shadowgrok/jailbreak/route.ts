import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import OpenAI from "openai"
import logger from "@/lib/logger"

const log = logger.child({ module: "api/admin/ai/shadowgrok/jailbreak" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface JailbreakRequest {
  messages: Array<{ role: string; content: string }>
  model?: string
  temperature?: number
  maxTokens?: number
}

const JAILBREAK_API_KEY = "jb-sk-af505e19f70fe0a3acac6a215f81943e882d1c45e35c030c907e173c5163aeb5"
const JAILBREAK_BASE_URL = "https://jail-break.chat/v1"
const DEFAULT_MODEL = "jailbreak-ai"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const admin = await verifyAdmin(req)
    const body = await req.json() as JailbreakRequest

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'messages is required and must be an array' },
        { status: 400 }
      )
    }

    if (body.messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array cannot be empty' },
        { status: 400 }
      )
    }

    const client = new OpenAI({
      apiKey: JAILBREAK_API_KEY,
      baseURL: JAILBREAK_BASE_URL,
    })

    const response = await client.chat.completions.create({
      model: body.model || DEFAULT_MODEL,
      messages: body.messages as any,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.maxTokens ?? 2000,
    })

    log.info({
      userId: admin.id,
      model: body.model || DEFAULT_MODEL,
      messageCount: body.messages.length,
    }, 'Jailbreak API call successful')

    return NextResponse.json({
      content: response.choices[0].message.content,
      model: response.model,
      usage: response.usage,
    })

  } catch (err: any) {
    log.error({ err }, 'Jailbreak API call failed')
    return toErrorResponse(err)
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const admin = await verifyAdmin(req)

    return NextResponse.json({
      status: 'active',
      provider: 'jail-break.chat',
      model: DEFAULT_MODEL,
      baseURL: JAILBREAK_BASE_URL,
      description: 'ShadowGrok Jailbreak API for unrestricted AI access',
    })

  } catch (err) {
    return toErrorResponse(err)
  }
}