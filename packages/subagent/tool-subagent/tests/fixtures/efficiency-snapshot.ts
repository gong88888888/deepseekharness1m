/** Deterministic child settlements for structured results and final-output recovery. */
import type { Context } from '@deepseek-ai/cordis'
import { NO_START_CAPABILITIES } from '@deepseek-ai/dsh-subagent'
import { SessionId } from '@deepseek-ai/dsh-session'

/** Snapshot provider plugin name. */
export const name = 'subagent-efficiency-snapshot'
/** Provider registry required before registration. */
export const inject = ['subagents']

/**
 * Register a child provider with fixed acceptance evidence.
 * @param ctx - shipped profile context owning the provider.
 */
export function apply(ctx: Context): void {
  let starts = 0
  ctx.subagents.registerProvider({
    name: 'efficiency-fixture',
    inheritsParentContext: false,
    capabilities: { ...NO_START_CAPABILITIES, outputSchema: true },
    async start(request) {
      request.signal.throwIfAborted()
      return {
        id: SessionId(`efficiency-child-${++starts}`),
        localAgent: undefined,
        result: Promise.resolve({ stopReason: 'completed', output: [{ type: 'text', text: 'retained acceptance evidence' }],
          ...request.outputSchema === undefined ? {} : { structured: { verified: true } } }),
        dispose: async () => {},
      }
    },
  })
}
