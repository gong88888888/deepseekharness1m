/** Session-local, replay-derived discovery of already authorized native tools. */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolSchemaSelector } from '@deepseek-ai/dsh-tools'
import { SessionSeq, type Session } from '@deepseek-ai/dsh-session'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import type {} from '@deepseek-ai/dsh-agent'

const DISCOVER = 'tool_discover'

interface DiscoveryState {
  cursor: number
  calls: Set<string>
  loaded: Set<string>
}

/**
 * Advertise initial tools and definitions loaded by accepted discovery results.
 * Complete definitions still come from the current registry, never from logs.
 * @param ctx - preset scope owning the discovery tool and schema selector.
 * @param initial - initial tool names, validated against the preset's catalog.
 * @param maxResults - maximum tools loaded per call.
 * @param descriptionChars - description preview limit per match.
 */
export function applyDiscovery(ctx: Context, initial: readonly string[], maxResults: number, descriptionChars: number): void {
  if (new Set(initial).size !== initial.length || initial.some(name => name.trim().length === 0)) {
    throw new Error('tool-presentation: initialTools must contain unique non-empty names')
  }
  const states = new WeakMap<Session, DiscoveryState>()
  const loadedFor = (session: Session): Set<string> => {
    let state = states.get(session)
    if (state === undefined) {
      state = { cursor: 0, calls: new Set(), loaded: new Set() }
      states.set(session, state)
    }
    while (state.cursor < session.seq) {
      const event = session.eventAt(SessionSeq(state.cursor))
      if (event === undefined) throw new Error('tool discovery requires a contiguous session log')
      if (event.type === 'tool/call' && event.data.name === DISCOVER) state.calls.add(event.data.callId)
      if (event.type === 'tool/result') {
        const result = event.data.message
        if (state.calls.delete(result.toolCallId) && result.isError !== true) {
          const meta = event.data.meta
          if (typeof meta === 'object' && meta !== null && !Array.isArray(meta)) {
            const names = meta['loadedTools']
            if (Array.isArray(names) && names.every(name => typeof name === 'string')) {
              for (const name of names) state.loaded.add(name)
            }
          }
        }
      }
      state.cursor += 1
    }
    return state.loaded
  }
  const select: ToolSchemaSelector = (scope, schemas) => {
    const agent = ctx.agents.list().find(candidate => candidate === scope)
    if (agent === undefined) return schemas.map(schema => schema.name)
    const catalog = new Set(ctx.tools.schemas(scopeOf(ctx)).map(schema => schema.name))
    for (const name of initial) {
      if (!catalog.has(name)) throw new Error(`tool-presentation: initialTools names unavailable tool "${name}"`)
    }
    const available = new Set(schemas.map(schema => schema.name))
    return [...new Set([DISCOVER, ...initial, ...loadedFor(agent.session)])].filter(name => available.has(name))
  }
  ctx.tools.selectSchemas(select)
  ctx.tools.register(defineTool({
    name: DISCOVER,
    description: 'Find and load additional tools. Search English keywords from the task, or provide exact tool names. Matching tools become available on the next request and remain loaded for this session.',
    parameters: {
      query: { type: 'string', description: 'Keywords in tool names or descriptions; empty string lists the first available tools.' },
      names: { type: 'array', items: { type: 'string' }, description: 'Exact tool names to load instead of a keyword search.' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          tools: { type: 'array', required: true, items: {
            type: 'object', additionalProperties: false,
            properties: { name: { type: 'string', required: true }, description: { type: 'string', required: true } },
          } },
          remaining: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      presentationMeta: (_args, value) => ({ loadedTools: value.tools.map(tool => tool.name) }),
    },
    execute(args, exec) {
      if (args.query === undefined && args.names === undefined) throw new Error('Provide query or names to discover tools')
      if (args.query !== undefined && args.names !== undefined) throw new Error('Provide query or names, not both')
      const available = ctx.tools.schemas(exec.agent).filter(tool => tool.name !== DISCOVER)
      let matches: typeof available
      if (args.names !== undefined) {
        const names = [...new Set(args.names)]
        if (names.length === 0 || names.length > maxResults) throw new Error(`names must contain 1-${maxResults} unique tool names`)
        matches = names.map((name) => {
          const found = available.find(tool => tool.name === name)
          if (found === undefined) throw new Error(`Tool "${name}" is unavailable in this session`)
          return found
        })
      } else {
        const terms = (args.query ?? '').toLowerCase().split(/[\s_-]+/u).filter(Boolean)
        matches = available.map(tool => ({ tool, score: terms.reduce((sum, term) => sum
          + (tool.name.toLowerCase().includes(term) ? 3 : 0)
          + (tool.description.toLowerCase().includes(term) ? 1 : 0), 0) }))
          .filter(entry => terms.length === 0 || entry.score > 0)
          .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name, 'en'))
          .map(entry => entry.tool)
      }
      return Promise.resolve({
        tools: matches.slice(0, maxResults).map(tool => ({ name: tool.name, description: tool.description.slice(0, descriptionChars) })),
        remaining: Math.max(0, matches.length - maxResults),
      })
    },
    presentCall: args => ({ card: 'generic', title: args.names?.join(', ') ?? args.query ?? '', kind: 'search' }),
  }))
}
