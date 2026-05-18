import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import { resolveProviderAsync } from "@/lib/deploy/providers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET — list instances from a cloud provider
 * Query params: provider (hetzner, digitalocean, vultr, lightsail, azure)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get("provider")

    if (!provider) {
      return NextResponse.json({ error: "provider required" }, { status: 400 })
    }

    const client = await resolveProviderAsync(provider as any)
    if (!client.listInstances) {
      return NextResponse.json({ error: "provider does not support listing instances" }, { status: 400 })
    }

    const instances = await client.listInstances()
    return NextResponse.json({ instances })
  } catch (err) {
    return toErrorResponse(err)
  }
}
