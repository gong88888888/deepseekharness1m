/** Optional local performance measurements; records contain counters, never message bodies. */
import type { Context } from '@deepseek-ai/cordis'
import { mkdir, open } from 'node:fs/promises'
import { dirname, isAbsolute } from 'node:path'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import type { TokenUsage, ToolCallId } from '@deepseek-ai/dsh-llm'

/** Validated limits for the optional local measurement writer. */
export interface PerformanceOptions {
  /** Absolute JSONL output file; parent directories are created. */
  path: string
  /** Maximum queued records, excluding the one being written. */
  maxPending: number
  /** Maximum UTF-8 bytes per queued record. */
  maxRecordBytes: number
}

/**
 * Install non-blocking model/tool measurements and drain their writer on unload.
 * @param ctx - plugin context carrying sessions, tools, and llm.
 * @param options - validated writer limits and destination.
 */
export async function applyPerformance(ctx: Context, options: PerformanceOptions): Promise<void> {
  if (!isAbsolute(options.path)) throw new Error('session-stats: performanceLogPath must be absolute')
  await mkdir(dirname(options.path), { recursive: true })
  const file = await open(options.path, 'a')
  const queue: string[] = []
  let pending: Promise<void> | undefined
  let closed = false
  let dropped = 0
  let failure: unknown
  const write = (row: Record<string, string | number | boolean | null>) => {
    if (closed || failure !== undefined) return
    const line = `${JSON.stringify({ time: Date.now(), ...row, droppedRecords: dropped })}\n`
    if (queue.length >= options.maxPending || Buffer.byteLength(line) > options.maxRecordBytes) {
      dropped += 1
      return
    }
    dropped = 0
    queue.push(line)
    if (pending !== undefined) return
    pending = (async () => {
      try {
        while (true) {
          const line = queue.shift()
          if (line === undefined) break
          await file.appendFile(line, 'utf8')
        }
      } catch (error: unknown) {
        failure = error
        queue.length = 0
        ctx.logger.warn('performance log write failed: %s', String(error))
      } finally {
        pending = undefined
      }
    })()
  }
  ctx.effect(() => async () => {
    closed = true
    await pending
    try {
      if (dropped > 0 && failure === undefined) {
        const notice = `${JSON.stringify({ time: Date.now(), kind: 'dropped', droppedRecords: dropped })}\n`
        if (Buffer.byteLength(notice) <= options.maxRecordBytes) await file.appendFile(notice)
        else ctx.logger.warn('performance log dropped %d records', dropped)
      }
    } finally {
      await file.close()
    }
  })
  const steps = new WeakMap<Session, { start: number; turn: number; step: number; attempts: number }>()
  const queued = new WeakMap<Session, Map<ToolCallId, number>>()
  ctx.on('session/event', (session, event) => {
    if (event.type === 'step/start') {
      steps.set(session, { start: performance.now(), ...event.data, attempts: 0 })
      queued.set(session, new Map())
    }
    if (event.type === 'tool/call') queued.get(session)?.set(event.data.callId, performance.now())
    if (event.type === 'step/end' || event.type === 'turn/end') {
      steps.delete(session)
      queued.delete(session)
    }
  })
  ctx.on('llm/stream', async function* (request, next) {
    const session = request.sessionId === undefined ? undefined : ctx.sessions.get(request.sessionId)
    const step = session === undefined || request.purpose !== undefined ? undefined : steps.get(session)
    const started = performance.now()
    const preparationMs = step === undefined || step.attempts > 0 ? null : Math.max(0, started - step.start)
    if (step !== undefined) step.attempts += 1
    let firstTokenMs: number | null = null
    let usage: TokenUsage | undefined
    let outcome = 'interrupted'
    let terminalOutcome: string | undefined
    try {
      for await (const chunk of next()) {
        if (firstTokenMs === null && ((chunk.type === 'text-delta' || chunk.type === 'reasoning-delta') && chunk.text.length > 0
          || chunk.type === 'tool-call-delta' && (chunk.argumentsDelta.length > 0 || chunk.name !== undefined))) firstTokenMs = performance.now() - started
        if (chunk.type === 'usage') usage = chunk.usage
        if (chunk.type === 'finish') {
          // Other merge-extensible finish reasons are normal provider settlements.
          terminalOutcome = chunk.reason.kind === 'error' ? 'error'
            : chunk.reason.kind === 'aborted' ? 'interrupted' : 'completed'
        }
        yield chunk
      }
      outcome = terminalOutcome ?? 'completed'
    } catch (error: unknown) {
      outcome = request.signal?.aborted === true ? 'interrupted' : 'error'
      throw error
    } finally {
      write({ kind: 'model', sessionId: request.sessionId ?? null, turn: step?.turn ?? null, step: step?.step ?? null,
        attempt: step?.attempts ?? 1, purpose: request.purpose ?? 'conversation', provider: request.provider, model: request.model,
        preparationMs, providerMs: performance.now() - started, firstTokenMs, outcome,
        toolCount: request.tools?.length ?? 0, schemaBytes: Buffer.byteLength(JSON.stringify(request.tools ?? [])),
        inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null,
        cacheReadTokens: usage?.cacheReadTokens ?? null })
    }
  })
  const calls = new Map<ToolExecutionToken, {
    start: number
    executionMs: number | null
    policyMs: number | null
    callToStartMs: number | null
  }>()
  ctx.on('tools/pre-execute', async (exec, next) => {
    const announced = exec.agent === undefined ? undefined : queued.get(exec.agent.session)?.get(exec.callId)
    if (exec.agent !== undefined) queued.get(exec.agent.session)?.delete(exec.callId)
    const timing = { start: performance.now(), executionMs: null as number | null, policyMs: null as number | null,
      callToStartMs: announced === undefined ? null : Math.max(0, performance.now() - announced) }
    calls.set(exec.token, timing)
    try { return await next() } finally { timing.policyMs = performance.now() - timing.start }
  }, { prepend: true })
  ctx.on('tools/execute', async (exec, next) => {
    const started = performance.now()
    try { return await next() } finally {
      const timing = calls.get(exec.token)
      if (timing !== undefined) timing.executionMs = performance.now() - started
    }
  }, { prepend: true })
  ctx.on('tools/result', (exec, result) => {
    const timing = calls.get(exec.token)
    calls.delete(exec.token)
    write({ kind: 'tool', sessionId: exec.agent?.id ?? null, callId: exec.callId, tool: exec.name,
      totalMs: timing === undefined ? null : performance.now() - timing.start,
      policyMs: timing?.policyMs ?? null, executionMs: timing?.executionMs ?? null,
      callToStartMs: timing?.callToStartMs ?? null,
      outputBytes: Buffer.byteLength(JSON.stringify(result.content)), isError: result.isError })
    return undefined
  })
  ctx.effect(() => () => { calls.clear() })
}
