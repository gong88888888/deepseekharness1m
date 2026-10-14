/**
 * Local capacity ladder for retained-message pricing, projection, and DeepSeek
 * request serialization. Token targets use the meter's heuristic, not a tokenizer
 * or provider acceptance. Each invocation measures one case in a fresh process.
 */
import { monitorEventLoopDelay, performance } from 'node:perf_hooks'
import { cpus, totalmem } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { Session, SessionId, canonicalHeader } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import TokenMeter from '@deepseek-ai/dsh-token-meter'
import { resolveAdapterOptions } from '../packages/llm/llm-deepseek/src/config.ts'
import { serialize } from '../packages/llm/llm-deepseek/src/serialize.ts'

const [tokensArg = '1000000', nodesArg = '2000', textKind = 'code'] = process.argv.slice(2)
const targetTokens = Number(tokensArg)
const nodes = Number(nodesArg)
if (!Number.isSafeInteger(targetTokens) || targetTokens < 1 || targetTokens > 2_000_000
  || !Number.isSafeInteger(nodes) || nodes < 1 || nodes > 20_000
  || targetTokens <= nodes * 8 || !['code', 'cjk', 'json'].includes(textKind)) {
  throw new Error('Usage: benchmark-long-context.ts <tokens:1..2000000> <nodes:1..20000> <code|cjk|json>; tokens must exceed 8 per node')
}
const pattern = textKind === 'cjk' ? '函数定义需要保留调用关系与边界条件。'
  : textKind === 'json' ? '{"path":"src/example.ts","symbol":"parse","line":42}\n'
    : 'export function parse(input: string) { return input.trim() }\n'
const characters = Math.floor((targetTokens / nodes - 8) * 4)
const text = pattern.repeat(Math.ceil(characters / pattern.length)).slice(0, characters)
const ctx = new Context()
new SessionProjectionRegistry(ctx)
const meter = new TokenMeter(ctx)
const connection = resolveAdapterOptions({})
const session = Session.create(SessionId('benchmark-long-context'))
session.append('request/header', { reason: 'initial', header: canonicalHeader({ config: { provider: 'benchmark', model: 'text' } }) })
for (let index = 0; index < nodes; index++) {
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: `${String(index).padStart(10, '0')}:${text}`.slice(0, characters) }], source: { kind: 'user' },
  }), { surfaceOp: 'append' })
}
const delay = monitorEventLoopDelay({ resolution: 10 })
delay.enable()
const measurements: Array<{
  meterMs: number
  projectionMs: number
  serializationMs: number
  preparationMs: number
  heapBytes: number
  rssBytes: number
}> = []
let requestBytes = 0
let estimatedTokens = 0
try {
  for (let index = -5; index < 30; index++) {
    await new Promise(resolve => setTimeout(resolve, 15))
    const started = performance.now()
    estimatedTokens = meter.measure(session).totalTokens
    const metered = performance.now()
    const messages = session.deriveMessages()
    const projected = performance.now()
    const payload = JSON.stringify(serialize({ provider: 'benchmark', model: 'text', messages }, connection,
      messages, new Map(), () => undefined))
    const serialized = performance.now()
    requestBytes = Buffer.byteLength(payload)
    const memory = process.memoryUsage()
    if (index >= 0) measurements.push({ meterMs: metered - started, projectionMs: projected - metered,
      serializationMs: serialized - projected, preparationMs: serialized - started,
      heapBytes: memory.heapUsed, rssBytes: memory.rss })
  }
  const values = measurements.map(row => row.preparationMs).sort((left, right) => left - right)
  const medianLow = values.at(14)
  const medianHigh = values.at(15)
  const preparationP95Ms = values.at(28)
  if (medianLow === undefined || medianHigh === undefined || preparationP95Ms === undefined) {
    throw new Error('benchmark did not collect 30 samples')
  }
  console.log(JSON.stringify({
    node: process.version, platform: process.platform, cpu: cpus()[0]?.model, memoryBytes: totalmem(),
    targetTokens, estimatedTokens, nodes, textKind, requestBytes, samples: measurements,
    preparationMedianMs: (medianLow + medianHigh) / 2, preparationP95Ms,
    peakRssBytes: process.resourceUsage().maxRSS * 1024,
    eventLoopP95Ms: delay.percentile(95) / 1_000_000,
    limitation: 'Synthetic heuristic tokens; excludes provider calls, persistence, tools, and full application boot.',
  }, null, 2))
} finally {
  delay.disable()
}
