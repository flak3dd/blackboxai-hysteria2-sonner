/**
 * @jest-environment node
 *
 * Unit tests for app/api/admin/security/payloads/route.ts
 * Enhanced tests for Phase 3 payload builder system
 */

jest.mock("@/lib/auth/admin", () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ id: "test-admin", role: "admin" }),
  toErrorResponse: jest.fn((err: unknown) => {
    const { NextResponse } = require("next/server")
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }),
}))

jest.mock("@/lib/db/payload-builds", () => ({
  listPayloadBuilds: jest.fn(),
  createPayloadBuild: jest.fn(),
  deletePayloadBuild: jest.fn(),
  getPayloadBuildStats: jest.fn(),
  countPayloadBuilds: jest.fn(),
}))

import { GET, POST, DELETE } from "@/app/api/admin/security/payloads/route"
import {
  listPayloadBuilds,
  createPayloadBuild,
  deletePayloadBuild,
  getPayloadBuildStats,
  countPayloadBuilds,
} from "@/lib/db/payload-builds"

const mockList = listPayloadBuilds as jest.Mock
const mockCreate = createPayloadBuild as jest.Mock
const mockDelete = deletePayloadBuild as jest.Mock
const mockStats = getPayloadBuildStats as jest.Mock
const mockCount = countPayloadBuilds as jest.Mock

const NOW = Date.now()

function makeBuild(id = "pb1", overrides = {}) {
  return {
    id,
    name: "dropper-v1",
    type: "windows_exe",
    platform: "windows",
    status: "pending",
    config: {},
    obfuscationLevel: 0,
    packingMethod: "none",
    buildLogs: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

const defaultStats = { total: 1, pending: 1, building: 0, ready: 0, failed: 0 }

function makeRequest(opts: { url?: string; body?: unknown } = {}) {
  return {
    url: opts.url ?? "http://localhost/api/admin/security/payloads",
    headers: { get: () => null },
    json: jest.fn().mockResolvedValue(opts.body ?? {}),
  } as any
}

beforeEach(() => jest.clearAllMocks())

/* ------------------------------------------------------------------ */
/*  GET /api/admin/security/payloads                                            */
/* ------------------------------------------------------------------ */
describe("GET /api/admin/security/payloads", () => {
  it("returns builds list, pagination, and stats", async () => {
    mockList.mockResolvedValue([makeBuild()])
    mockCount.mockResolvedValue(1)
    mockStats.mockResolvedValue(defaultStats)

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.builds).toHaveLength(1)
    expect(body.stats.total).toBe(1)
    expect(body.pagination).toBeDefined()
    expect(body.pagination.total).toBe(1)
  })

  it("respects createdBy query param", async () => {
    mockList.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    mockStats.mockResolvedValue({ ...defaultStats, total: 0 })

    const res = await GET(makeRequest({ url: "http://localhost/api/admin/security/payloads?createdBy=alice" }))
    expect(res.status).toBe(200)

    // Ensure listPayloadBuilds was called with the createdBy arg
    expect(mockList).toHaveBeenCalledWith("alice", expect.any(Number), expect.any(Object))
  })

  it("filters by platform query param", async () => {
    mockList.mockResolvedValue([makeBuild("pb1", { platform: "windows" })])
    mockCount.mockResolvedValue(1)
    mockStats.mockResolvedValue(defaultStats)

    const res = await GET(makeRequest({ url: "http://localhost/api/admin/security/payloads?platform=windows" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.builds).toHaveLength(1)
    expect(body.builds[0].platform).toBe("windows")
    expect(body.filters.platform).toBe("windows")
  })

  it("filters by status query param", async () => {
    mockList.mockResolvedValue([makeBuild("pb1", { status: "ready" })])
    mockCount.mockResolvedValue(1)
    mockStats.mockResolvedValue(defaultStats)

    const res = await GET(makeRequest({ url: "http://localhost/api/admin/security/payloads?status=ready" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.builds).toHaveLength(1)
    expect(body.builds[0].status).toBe("ready")
    expect(body.filters.status).toBe("ready")
  })

  it("returns 500 on db error", async () => {
    mockList.mockRejectedValue(new Error("db down"))
    mockCount.mockResolvedValue(0)
    mockStats.mockResolvedValue(defaultStats)

    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })
})

/* ------------------------------------------------------------------ */
/*  POST /api/admin/security/payloads                                           */
/* ------------------------------------------------------------------ */
describe("POST /api/admin/security/payloads", () => {
  const validBody = { name: "dropper", type: "windows_exe", config: {} }

  it("creates a build and returns 201", async () => {
    mockCreate.mockResolvedValue(makeBuild("pb-new"))

    const res = await POST(makeRequest({ body: validBody }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("pb-new")
  })

  it("creates a build with platform field", async () => {
    const bodyWithPlatform = { ...validBody, platform: "linux" }
    mockCreate.mockResolvedValue(makeBuild("pb-new", { platform: "linux" }))

    const res = await POST(makeRequest({ body: bodyWithPlatform }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("pb-new")
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: "linux",
      })
    )
  })

  it("creates a build with obfuscation level", async () => {
    const bodyWithObf = { ...validBody, obfuscationLevel: 2 }
    mockCreate.mockResolvedValue(makeBuild("pb-new", { obfuscationLevel: 2 }))

    const res = await POST(makeRequest({ body: bodyWithObf }))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        obfuscationLevel: 2,
      })
    )
  })

  it("creates a build with packing method", async () => {
    const bodyWithPacking = { ...validBody, packingMethod: "upx" }
    mockCreate.mockResolvedValue(makeBuild("pb-new", { packingMethod: "upx" }))

    const res = await POST(makeRequest({ body: bodyWithPacking }))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        packingMethod: "upx",
      })
    )
  })

  it("creates a build with all enhanced fields", async () => {
    const enhancedBody = {
      name: "enhanced-dropper",
      type: "powershell",
      platform: "windows",
      config: { hysteriaConfig: { server: "example.com", auth: "secret" } },
      obfuscationLevel: 3,
      packingMethod: "upx",
      description: "Enhanced payload with obfuscation",
    }
    mockCreate.mockResolvedValue(makeBuild("pb-new", enhancedBody))

    const res = await POST(makeRequest({ body: enhancedBody }))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "enhanced-dropper",
        type: "powershell",
        platform: "windows",
        obfuscationLevel: 3,
        packingMethod: "upx",
        description: "Enhanced payload with obfuscation",
      })
    )
  })

  it("returns 400 for missing name", async () => {
    const res = await POST(makeRequest({ body: { type: "windows_exe", config: {} } }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it("returns 400 for missing config", async () => {
    const res = await POST(makeRequest({ body: { name: "dropper", type: "windows_exe" } }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for description over 500 chars", async () => {
    const res = await POST(
      makeRequest({ body: { ...validBody, description: "x".repeat(501) } }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid obfuscation level", async () => {
    const res = await POST(
      makeRequest({ body: { ...validBody, obfuscationLevel: 5 } }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid packing method", async () => {
    const res = await POST(
      makeRequest({ body: { ...validBody, packingMethod: "invalid" } }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 500 on unexpected createPayloadBuild error", async () => {
    mockCreate.mockRejectedValue(new Error("disk full"))
    const res = await POST(makeRequest({ body: validBody }))
    expect(res.status).toBe(500)
  })
})

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/security/payloads?id=...                                  */
/* ------------------------------------------------------------------ */
describe("DELETE /api/admin/security/payloads", () => {
  it("deletes and returns success", async () => {
    mockDelete.mockResolvedValue(true)

    const res = await DELETE(makeRequest({ url: "http://localhost/api/admin/security/payloads?id=pb1" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 400 when id param is missing", async () => {
    const res = await DELETE(makeRequest({ url: "http://localhost/api/admin/security/payloads" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/id/)
  })

  it("returns 404 when build not found", async () => {
    mockDelete.mockResolvedValue(false)

    const res = await DELETE(makeRequest({ url: "http://localhost/api/admin/security/payloads?id=missing" }))
    expect(res.status).toBe(404)
  })

  it("returns 500 on unexpected error", async () => {
    mockDelete.mockRejectedValue(new Error("db error"))

    const res = await DELETE(makeRequest({ url: "http://localhost/api/admin/security/payloads?id=pb1" }))
    expect(res.status).toBe(500)
  })
})
