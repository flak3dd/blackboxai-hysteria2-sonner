import { type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import { getRun, subscribeRun, type RunEvent } from "@/lib/operations/run-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  try {
    await verifyAdmin(req)
    const { runId } = await params

    const run = getRun(runId)
    if (!run) {
      return Response.json({ error: "not_found" }, { status: 404 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const send = (evt: RunEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`))
          } catch {
            // controller already closed
          }
        }

        // Replay existing logs
        for (const entry of run.logs) send(entry)

        if (run.done) {
          send({ done: true, result: run.result, error: run.error })
          controller.close()
          return
        }

        const unsub = subscribeRun(runId, (evt) => {
          send(evt)
          if ("done" in evt && evt.done) {
            clearTimeout(stuckTimer)
            unsub()
            try { controller.close() } catch { /* already closed */ }
          }
        })

        // Force-close streams where the run never emits done (hung executor, process crash)
        const stuckTimer = setTimeout(() => {
          unsub()
          send({ done: true, error: "Stream timed out — run did not complete within 5 minutes" })
          try { controller.close() } catch { /* already closed */ }
        }, 5 * 60 * 1000)

        req.signal.addEventListener("abort", () => {
          clearTimeout(stuckTimer)
          unsub()
          try { controller.close() } catch { /* already closed */ }
        })
      },
    })

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-store",
        connection: "keep-alive",
      },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
