/** Bounded, expiring result reuse owned by one tool registration and caller. */

interface Entry<T> {
  value: T
  storedAt: number
  bytes: number
  generation?: object
}

/** Limits resolved by the web tool plugin before registrations are installed. */
export interface CacheLimits {
  /** Positive maximum live entries per caller. */
  entries: number
  /** Positive maximum retained UTF-8 bytes per caller. */
  bytes: number
  /** Positive lifetime in milliseconds, measured from successful retrieval. */
  ttlMs: number
}

/** A caller-local LRU cache; failed and oversized retrievals are never retained. */
export class ResultCache<T> {
  private readonly callers = new WeakMap<object, Map<string, Entry<T>>>()

  constructor(private readonly limits: CacheLimits) {}

  /**
   * Read a live entry, removing expired entries and refreshing LRU order.
   * @param owner - exact caller identity.
   * @param key - exact request identity.
   * @param generation - current provider registration identity, when supplied.
   * @returns a cached immutable value and its retrieval timestamp, when live.
   */
  get(owner: object, key: string, generation?: object): { value: T; storedAt: number } | undefined {
    const entries = this.callers.get(owner)
    if (entries === undefined) return undefined
    const now = Date.now()
    for (const [id, entry] of entries) {
      if (now - entry.storedAt >= this.limits.ttlMs || now < entry.storedAt || entry.generation !== generation) entries.delete(id)
    }
    const entry = entries.get(key)
    if (entry === undefined) return undefined
    entries.delete(key)
    entries.set(key, entry)
    return { value: entry.value, storedAt: entry.storedAt }
  }

  /**
   * Retain one owned value within both byte and entry limits.
   * @param owner - exact caller identity.
   * @param key - exact request identity.
   * @param value - immutable result owned by this cache.
   * @param bytes - retained UTF-8 size, including the key.
   * @param storedAt - successful retrieval timestamp.
   * @param generation - provider registration identity that produced the value.
   * @returns whether the result fits and was retained.
   */
  set(owner: object, key: string, value: T, bytes: number, storedAt: number, generation?: object): boolean {
    const entries = this.callers.get(owner) ?? new Map<string, Entry<T>>()
    entries.delete(key)
    if (bytes > this.limits.bytes) return false
    let retained = [...entries.values()].reduce((sum, entry) => sum + entry.bytes, 0)
    for (const [id, entry] of entries) {
      if (entries.size < this.limits.entries && retained + bytes <= this.limits.bytes) break
      retained -= entry.bytes
      entries.delete(id)
    }
    entries.set(key, { value, bytes, storedAt, ...generation === undefined ? {} : { generation } })
    this.callers.set(owner, entries)
    return true
  }
}
