import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  listCredentials,
  createCredential,
  countCredentials,
  getCredentialStats,
} from "@c2panel/infrastructure/adapters/database/credentials"
import { CredentialCreate } from "@c2panel/shared/validation"
import { parsePagination, paginatedResponse } from "@c2panel/shared/utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/admin/security/credentials - List credentials with filters
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") as any
    const domain = searchParams.get("domain") || undefined
    const sourceHostId = searchParams.get("sourceHostId") || undefined
    const search = searchParams.get("search") || undefined
    
    const { page, pageSize, skip, take } = parsePagination(searchParams)
    
    const [credentials, total, stats] = await Promise.all([
      listCredentials({
        skip,
        take,
        type,
        domain,
        sourceHostId,
        search,
      }),
      countCredentials({
        type,
        domain,
        sourceHostId,
        search,
      }),
      getCredentialStats(),
    ])
    
    const { pagination } = paginatedResponse(credentials, total, page, pageSize)
    
    return NextResponse.json({ credentials, pagination, stats })
  } catch (error) {
    return toErrorResponse(error)
  }
}

// POST /api/admin/security/credentials - Create a new credential
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json()
    const parsed = CredentialCreate.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", issues: parsed.error.issues },
        { status: 400 }
      )
    }
    
    const credential = await createCredential(parsed.data)
    return NextResponse.json({ credential }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}