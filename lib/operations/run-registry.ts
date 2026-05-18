export type ExecLogLevel = "info" | "ok" | "err"

export interface ExecLogEntry {
  ts: number
  level: ExecLogLevel
  msg: string
}

export interface ExecResult {
  profileId: string
  payloadId: string
  implantId: string
  sentCount: number
  failedCount: number
}

export type DoneEvent = { done: true; result?: ExecResult; error?: string }
export type RunEvent = ExecLogEntry | DoneEvent

export interface RunState {
  logs: ExecLogEntry[]
  done: boolean
  result?: ExecResult
  error?: string
}

type Listener = (event: RunEvent) => void

const runs = new Map<string, RunState>()
const listeners = new Map<string, Set<Listener>>()

export function initRun(runId: string): void {
  runs.set(runId, { logs: [], done: false })
  listeners.set(runId, new Set())
}

export function emitLog(runId: string, level: ExecLogLevel, msg: string): void {
  const run = runs.get(runId)
  if (!run) return
  const entry: ExecLogEntry = { ts: Date.now(), level, msg }
  run.logs.push(entry)
  for (const fn of listeners.get(runId) ?? []) fn(entry)
}

export function emitDone(runId: string, result?: ExecResult, error?: string): void {
  const run = runs.get(runId)
  if (!run) return
  run.done = true
  run.result = result
  run.error = error
  const evt: DoneEvent = { done: true, result, error }
  for (const fn of listeners.get(runId) ?? []) fn(evt)
  listeners.delete(runId)
  // Evict after 30 min
  setTimeout(() => runs.delete(runId), 30 * 60 * 1000)
}

export function getRun(runId: string): RunState | null {
  return runs.get(runId) ?? null
}

export function subscribeRun(runId: string, fn: Listener): () => void {
  const set = listeners.get(runId)
  if (!set) return () => {}
  set.add(fn)
  return () => set.delete(fn)
}
