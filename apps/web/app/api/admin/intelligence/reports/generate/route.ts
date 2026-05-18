import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { reportGenerator, type ReportConfig, type ReportType, type ReportFormat } from "@c2panel/reports/generator"
import { z } from "zod"

const GenerateReportSchema = z.object({
  type: z.enum(["executive", "technical", "timeline", "comprehensive"]),
  format: z.enum(["markdown", "json", "html"]).default("markdown"),
  operationId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customSections: z.array(z.string()).optional(),
})

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)

    const body = await req.json().catch(() => null)
    const parsed = GenerateReportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "bad_request", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const config: ReportConfig = {
      type: parsed.data.type as ReportType,
      format: parsed.data.format as ReportFormat,
      operationId: parsed.data.operationId,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      customSections: parsed.data.customSections,
    }

    const report = await reportGenerator.generateReport(config)

    return NextResponse.json(
      {
        report: {
          id: report.id,
          type: report.type,
          format: report.format,
          title: report.title,
          generatedAt: report.generatedAt,
          metadata: report.metadata,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)

    const searchParams = new URL(req.url).searchParams
    const operationId = searchParams.get("operationId") || undefined

    const reports = await reportGenerator.getReports(operationId)

    return NextResponse.json({ reports })
  } catch (err) {
    return toErrorResponse(err)
  }
}