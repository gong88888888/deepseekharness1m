/** Mount the production presentation plugin in each replay agent's own scope. */
import type { Context } from '@deepseek-ai/cordis'
import * as presentation from '../../src/index.ts'
import type {} from '@deepseek-ai/dsh-agent'

/** Snapshot composition name. */
export const name = 'discovery-snapshot'

/**
 * Give each created agent an initially empty discoverable native catalog.
 * @param ctx - shipped profile context owning the scenario.
 */
export function apply(ctx: Context): void {
  ctx.on('agent/created', ({ agent }) => {
    agent.ctx.plugin(presentation, { mode: 'native', discovery: true, initialTools: [] })
  })
}
