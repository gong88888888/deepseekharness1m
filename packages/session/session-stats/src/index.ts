/**
 * Function plugin registering the `sessionStats` projection unit: whole-log
 * turn/step counts and LLM/tool/first-token/decode wall times served through
 * the session-projection seam (registry snapshot, change feed, and every
 * projection carrier), so clients render full-session figures that paging and
 * compaction cannot change. The plugin owns only the fold; delivery is the
 * seam's.
 *
 * @module @deepseek-ai/dsh-session-stats
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { sessionStatsProjectionDefinition } from './projection.ts'
import { applyPerformance } from './performance.ts'

export type * from './types.ts'

/** Cordis plugin name. */
export const name = 'session-stats'
/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
export const inject = ['sessionProjections']

/** Optional local timing collection; disabled for ordinary deployments. */
export interface Config {
  /** Enable local JSONL model and tool performance records. Defaults to false. */
  performanceLogging?: boolean
  /** Absolute output file, required when performanceLogging is enabled. */
  performanceLogPath?: string
  /** Maximum pending records before dropping observations. Defaults to 256. */
  performanceMaxPending?: number
  /** Maximum bytes per record. Defaults to 8192. */
  performanceMaxRecordBytes?: number
}

/** Validated deployment settings for local measurements. */
export const Config: z<Config> = z.object({
  performanceLogging: z.boolean().default(false),
  performanceLogPath: z.string(),
  performanceMaxPending: z.number().default(256),
  performanceMaxRecordBytes: z.number().default(8192),
})

/**
 * Register the `sessionStats` unit; the registration is an effect on this
 * plugin's fiber, so unloading removes the key.
 * @param ctx - registrant context carrying the projection registry.
 * @param config - optional local measurement settings.
 */
export function apply(ctx: Context, config: Config = {}): void {
  ctx.sessionProjections.register(sessionStatsProjectionDefinition)
  if (config.performanceLogging === true) {
    const path = config.performanceLogPath
    if (path === undefined || path.length === 0) throw new Error('session-stats: performanceLogPath is required')
    const maxPending = config.performanceMaxPending ?? 256
    const maxRecordBytes = config.performanceMaxRecordBytes ?? 8192
    if (!Number.isSafeInteger(maxPending) || maxPending < 1 || !Number.isSafeInteger(maxRecordBytes) || maxRecordBytes < 1) {
      throw new Error('session-stats: performance limits must be positive safe integers')
    }
    ctx.inject(['sessions', 'tools', 'llm'], inner => applyPerformance(inner, { path, maxPending, maxRecordBytes }))
  }
}
