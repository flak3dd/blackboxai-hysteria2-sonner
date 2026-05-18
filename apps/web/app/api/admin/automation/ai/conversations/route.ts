import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  listConversations,
  createConversation,
  updateConversation,
} from "@c2panel/ai/conversations"
import { AiConversationCreate, AiConversationUpdate } from "@c2panel/ai/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const admin = await verifyAdmin(req)
    const conversations = await listConversations(admin.id)
    return NextResponse.json({ conversations })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const admin = await verifyAdmin(req)
    const body = await req.json()
    const input = AiConversationCreate.parse(body)
    const conversation = await createConversation(input, admin.id)
    return NextResponse.json({ conversation }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const admin = await verifyAdmin(req)
    const body = await req.json()
    const { conversationId, ...updateData } = body
    const input = AiConversationUpdate.parse(updateData)
    
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    }
    
    const conversation = await updateConversation(conversationId, input, admin.id)
    if (!conversation) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }
    return NextResponse.json({ conversation })
  } catch (err) {
    return toErrorResponse(err)
  }
}
