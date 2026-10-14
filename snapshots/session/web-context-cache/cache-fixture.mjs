/** Deterministic provider payloads and retrieval clock for the cache transcript. */
export const name = 'web-context-cache-fixture'
export const inject = ['web']
export function apply(ctx) {
  ctx.effect(() => {
    const original = Date.now
    Date.now = () => 1789012800000
    return () => { Date.now = original }
  })
  let fetched = 0
  let searched = 0
  ctx.web.registerFetchProvider({ id: 'cache-fixture', available: () => true,
    fetch: async ({ url }) => ({ url, statusCode: 200, body: { kind: 'text', content: 'abcdef' + String(++fetched) }, truncated: false }) })
  ctx.web.registerSearchProvider({ id: 'cache-fixture', available: () => true,
    search: async () => ({ sources: [{ url: 'https://example.test/evidence', title: 'Evidence', snippet: 'search ' + String(++searched) }], truncated: false }) })
}
