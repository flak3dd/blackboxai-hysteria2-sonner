import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { ClientUserUpdate } from "@c2panel/shared/validation"
import { deleteUser, getUserById, updateUser } from "@c2panel/infrastructure/adapters/database/users"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { id } = await ctx.params
    const user = await getUserById(id)
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 })
    return NextResponse.json({ user })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = ClientUserUpdate.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 })
    }
    const user = await updateUser(id, parsed.data)
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 })
    return NextResponse.json({ user })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { id } = await ctx.params
    const ok = await deleteUser(id)
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
