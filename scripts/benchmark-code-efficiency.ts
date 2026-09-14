/** Deterministic local measurements of context-meter latency and default read output, without model calls. */

import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { Session, SessionId, canonicalHeader } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import TokenMeter from '@deepseek-ai/dsh-token-meter'
import { buildWindow, formatReadOutput, READ_MAX_BYTES } from '../packages/fs/tool-fs/src/read-render.ts'

const Meter: typeof TokenMeter = process.argv[2] === undefined
  ? TokenMeter
  : (await import(pathToFileURL(resolve(process.argv[2])).href) as { default: typeof TokenMeter }).default
const ctx = new Context()
new SessionProjectionRegistry(ctx)
const meter = new Meter(ctx)
const session = Session.create(SessionId('benchmark-code-efficiency'))
session.append('request/header', {
  reason: 'initial',
  header: canonicalHeader({ config: { provider: 'benchmark', model: 'text' } }),
})
for (let index = 0; index < 2_000; index++) {
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: `Source observation ${index}: ${'code '.repeat(80)}` }],
    source: { kind: 'user' },
  }), { surfaceOp: 'append' })
}
for (let index = 0; index < 20; index++) meter.measure(session)
const samples: number[] = []
let tokens = 0
for (let sample = 0; sample < 7; sample++) {
  const started = performance.now()
  for (let index = 0; index < 100; index++) tokens = meter.measure(session).totalTokens
  samples.push((performance.now() - started) / 100)
}
samples.sort((left, right) => left - right)
const source = Array.from({ length: 2_000 }, (_, index) => `export const value${index} = ${index};`).join('\n')
const reads = []
for (const limit of [2_000, 300]) {
  const window = await buildWindow([source], { offset: 1, limit, maxBytes: READ_MAX_BYTES, maxLineLength: 2_000 }, 'fixture.ts')
  const output = formatReadOutput('fixture.ts', {
    lines: window.lines,
    totalLines: window.totalLines,
    offset: 1,
    ...window.truncatedByBytes ? { truncatedByBytes: true as const } : {},
  })
  reads.push({ limit, lines: window.lines.length, bytes: Buffer.byteLength(output), heuristicTokens: Math.ceil(output.length / 4) })
}
console.log(JSON.stringify({ nodes: 2_000, medianMillisecondsPerMeasure: samples[3], totalTokens: tokens, reads }, null, 2))
