import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  getConversationForUser,
  updateConversationTitleForUser,
  deleteConversationForUser,
} from "@c2panel/ai/conversations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const admin = await verifyAdmin(req)
    const { id } = await params
    const conversation = await getConversationForUser(id, admin.id)
    if (!conversation) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }
    return NextResponse.json({ conversation })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const admin = await verifyAdmin(req)
    const { id } = await params
    const body = await req.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 })
    }
    const ok = await updateConversationTitleForUser(id, title, admin.id)
    if (!ok) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const admin = await verifyAdmin(req)
    const { id } = await params
    const ok = await deleteConversationForUser(id, admin.id)
    if (!ok) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
