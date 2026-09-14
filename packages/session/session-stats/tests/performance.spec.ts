/** Local measurements preserve model/tool outcomes and drain without logging content. */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import ToolRuntime, { defineTool } from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import LlmRuntime, { LlmAdapter, ToolCallId, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { applyPerformance } from '../src/performance.ts'

class Adapter extends LlmAdapter {
  async *stream(): AsyncIterable<StreamChunk> {
    yield { type: 'text-delta', index: 0, text: 'private response' }
    yield { type: 'usage', usage: { inputTokens: 100, outputTokens: 2, cacheReadTokens: 80 } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

describe('local performance observations', () => {
  it('preserves a provider failure and records its outcome without its diagnostic', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-performance-'))
    const ctx = new Context()
    const failure = new Error('private provider diagnostic')
    class FailingAdapter extends Adapter {
      override async *stream(): AsyncIterable<StreamChunk> {
        yield { type: 'text-delta', index: 0, text: 'partial private answer' }
        throw failure
      }
    }
    try {
      await ctx.plugin(SessionStore)
      await ctx.plugin(SystemPrompt)
      await ctx.plugin(ToolRuntime)
      await ctx.plugin(LlmRuntime)
      ctx.llm.registerAdapter(['test'], new FailingAdapter())
      const path = join(root, 'metrics.jsonl')
      const fiber = await ctx.plugin({ inject: ['sessions', 'tools', 'llm'],
        apply: (inner: Context) => applyPerformance(inner, { path, maxPending: 1, maxRecordBytes: 4096 }) })
      const chunks = []
      for await (const chunk of ctx.llm.stream({ provider: 'test', model: 'test', messages: [] })) chunks.push(chunk)
      expect(chunks[0]).toMatchObject({ type: 'text-delta', text: 'partial private answer' })
      expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'error' } })
      await fiber.dispose()
      const text = await readFile(path, 'utf8')
      expect(text).toContain('"outcome":"error"')
      expect(text).not.toContain('private')
    } finally {
      await ctx.fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('counts oversized measurements without changing model chunks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-performance-'))
    const ctx = new Context()
    try {
      await ctx.plugin(SessionStore)
      await ctx.plugin(SystemPrompt)
      await ctx.plugin(ToolRuntime)
      await ctx.plugin(LlmRuntime)
      ctx.llm.registerAdapter(['test'], new Adapter())
      const path = join(root, 'metrics.jsonl')
      const fiber = await ctx.plugin({ inject: ['sessions', 'tools', 'llm'],
        apply: (inner: Context) => applyPerformance(inner, { path, maxPending: 1, maxRecordBytes: 200 }) })
      const chunks = []
      for await (const chunk of ctx.llm.stream({ provider: 'test', model: 'test', messages: [] })) chunks.push(chunk)
      expect(chunks).toHaveLength(3)
      await fiber.dispose()
      const text = await readFile(path, 'utf8')
      expect(Buffer.byteLength(text)).toBeLessThanOrEqual(200)
      expect(JSON.parse(text) as Record<string, unknown>).toMatchObject({ kind: 'dropped', droppedRecords: 1 })
    } finally {
      await ctx.fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('writes counters after successful work and drains on disposal without retaining content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-performance-'))
    const ctx = new Context()
    try {
      await ctx.plugin(SessionStore)
      await ctx.plugin(SystemPrompt)
      await ctx.plugin(ToolRuntime)
      await ctx.plugin(LlmRuntime)
      ctx.llm.registerAdapter(['test'], new Adapter())
      ctx.tools.register(defineTool({ name: 'echo', description: 'Echo.', parameters: {},
        output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
        execute: () => Promise.resolve('private tool result') }))
      const path = join(root, 'metrics.jsonl')
      const fiber = await ctx.plugin({ inject: ['sessions', 'tools', 'llm'],
        apply: (inner: Context) => applyPerformance(inner, { path, maxPending: 16, maxRecordBytes: 4096 }) })
      const session = ctx.sessions.create(SessionId('measure'))
      session.append('step/start', { turn: 0, step: 0 })
      const chunks = []
      for await (const chunk of ctx.llm.stream({ provider: 'test', model: 'test', messages: [], sessionId: session.id })) chunks.push(chunk)
      expect(chunks).toHaveLength(3)
      const result = await ctx.tools.execute({ name: 'echo', arguments: {}, callId: ToolCallId('one'), signal: new AbortController().signal })
      expect(result.isError).toBe(false)
      await fiber.dispose()
      const text = await readFile(path, 'utf8')
      const rows: Record<string, unknown>[] = text.trim().split('\n').map(line => JSON.parse(line) as Record<string, unknown>)
      expect(rows).toHaveLength(2)
      expect(rows[0]).toMatchObject({ kind: 'model', inputTokens: 100, outputTokens: 2, cacheReadTokens: 80, outcome: 'completed', attempt: 1 })
      expect(rows[0]?.preparationMs).toEqual(expect.any(Number))
      expect(rows[1]).toMatchObject({ kind: 'tool', tool: 'echo', isError: false })
      expect(rows[1]?.executionMs).toEqual(expect.any(Number))
      expect(text).not.toContain('private response')
      expect(text).not.toContain('private tool result')
    } finally {
      await ctx.fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })
})
