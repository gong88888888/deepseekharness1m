/** Caller isolation, freshness, and memory bounds for web result reuse. */
import { describe, expect, it, vi } from 'vitest'
import { ResultCache } from '../src/result-cache.ts'

describe('result cache', () => {
  it('isolates callers and evicts least recently used entries within byte and count limits', () => {
    const cache = new ResultCache<string>({ entries: 2, bytes: 10, ttlMs: 1000 })
    const owner = {}
    const now = Date.now()
    cache.set(owner, 'a', 'a', 4, now)
    cache.set(owner, 'b', 'b', 4, now)
    expect(cache.get({}, 'a')).toBeUndefined()
    expect(cache.get(owner, 'a')?.value).toBe('a')
    cache.set(owner, 'c', 'c', 4, now)
    expect(cache.get(owner, 'b')).toBeUndefined()
    cache.set(owner, 'd', 'd', 8, now)
    expect(cache.get(owner, 'a')).toBeUndefined()
    expect(cache.get(owner, 'c')).toBeUndefined()
    expect(cache.set(owner, 'd', 'oversized', 11, now)).toBe(false)
    expect(cache.get(owner, 'd')).toBeUndefined()
  })

  it('expires at the TTL and refuses cache reuse after a backwards clock adjustment', () => {
    const cache = new ResultCache<string>({ entries: 1, bytes: 10, ttlMs: 100 })
    const owner = {}
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1100)
    try {
      cache.set(owner, 'a', 'a', 1, 1000)
      expect(cache.get(owner, 'a')).toBeUndefined()
      cache.set(owner, 'a', 'a', 1, 1200)
      expect(cache.get(owner, 'a')).toBeUndefined()
    } finally {
      clock.mockRestore()
    }
  })
})
