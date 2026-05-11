import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  listCompromisedHosts,
  countCompromisedHosts,
  createCompromisedHost,
} from "@/lib/post-exploitation/service"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import { parsePagination, paginatedResponse } from "@/lib/pagination"
import logger from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = logger.child({ module: "api/admin/compromised-hosts" })

const CreateSchema = z.object({
  hostname: z.string().min(1),
  ipAddress: z.string().min(1),
  os: z.string().optional(),
  domain: z.string().optional(),
  privileges: z.enum(["user", "admin", "system", "domain_admin"]).default("user"),
  implantId: z.string().optional(),
})

// GET /api/admin/security/compromised-hosts
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const { searchParams } = new URL(req.url)
    const domain = searchParams.get("domain") || undefined
    const privileges = searchParams.get("privileges") as any
    const search = searchParams.get("search") || undefined

    const { page, pageSize, skip, take } = parsePagination(searchParams)

    const [hosts, total] = await Promise.all([
      listCompromisedHosts({ skip, take, domain, privileges, search }),
      countCompromisedHosts({ domain, privileges, search }),
    ])

    const { pagination } = paginatedResponse(hosts, total, page, pageSize)

    return NextResponse.json({ hosts, pagination })
  } catch (error) {
    log.error({ err: error }, "List compromised hosts error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/security/compromised-hosts
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
  } catch (error) {
    return toErrorResponse(error)
  }

  try {
    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const host = await createCompromisedHost(parsed.data)
    return NextResponse.json({ host }, { status: 201 })
  } catch (error) {
    log.error({ err: error }, "Create compromised host error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
