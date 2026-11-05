/** A released V2 Mnemon recall message remains readable through the Web Host. */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zstdCompressSync } from 'node:zlib'
import { expect, it } from 'vitest'
import { SESSION_FORMAT_VERSION, SessionId } from '@deepseek-ai/dsh-session'
import { generationLogPath } from '../../../packages/session/session-persistence-jsonl/src/format.ts'
import { launchWebScaffold, webSnapshotMode } from './scaffold.ts'

const fixturePath = fileURLToPath(new URL('../../../snapshots/web/mnemon-source-compat/session.v2.jsonl', import.meta.url))

it.skipIf(webSnapshotMode() === 'record')('restores V2 Mnemon recall through the Web Host without rewriting V2', async () => {
  const scaffold = await launchWebScaffold()
  try {
    const id = SessionId('mnemon-source-compat')
    const [fixtureHeader, ...fixtureEvents] = (await readFile(fixturePath, 'utf8')).trimEnd().split('\n')
      .map((line): Record<string, unknown> => JSON.parse(line) as Record<string, unknown>)
    const header = { ...fixtureHeader, id, cwd: scaffold.workspaceCwd }
    const rows = fixtureEvents.map((event, seq) => ({ ...event, seq, time: seq + 2 }))
    const predecessor = generationLogPath(scaffold.persistenceRoot, scaffold.workspaceCwd, id, 2, 'zstd')
    const successor = generationLogPath(scaffold.persistenceRoot, scaffold.workspaceCwd, id, SESSION_FORMAT_VERSION, 'zstd')
    const source = Buffer.concat([header, ...rows].map(row => zstdCompressSync(Buffer.from(JSON.stringify(row) + '\n'))))
    await mkdir(dirname(predecessor), { recursive: true })
    await writeFile(predecessor, source)

    using observation = await scaffold.ctx.sessionQuery.observeSession(id)
    expect(observation.events.find(event => event.type === 'user/message')?.data).toMatchObject({
      content: [{ type: 'text', text: 'Historical recall context.' }],
      source: { kind: 'plugin:dsh-mnemon', form: 'recall', summary: 'Historical recall' },
    })
    await expect(readFile(successor)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(predecessor)).toEqual(source)
  } finally {
    await scaffold.close()
  }
})
