import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { loadMailAccounts, toSafeAccount } from "@c2panel/infrastructure/adapters/email/accounts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const accounts = await loadMailAccounts()
    return NextResponse.json({ accounts: accounts.map(toSafeAccount) })
  } catch (err) {
    return toErrorResponse(err)
  }
}
