// Plain node:test - no framework, no build step. `npm run test:worker` (node --test
// worker/) runs this directly; nothing here touches Angular's Karma suite. worker/
// carries its own package.json ({"type":"module"}) since the repo root package.json has
// no "type" field (defaults CommonJS) but this file needs `import`/`export default`, the
// same syntax worker/index.js itself uses and Wrangler expects.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import worker from './index.js'

function req(body, { method = 'POST', path = '/api/feedback' } = {}) {
  return new Request(`https://rangertrak.org${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

test('rejects a non-POST method', async () => {
  const res = await worker.fetch(req(undefined, { method: 'GET' }), { GITHUB_FEEDBACK_TOKEN: 'x' })
  assert.equal(res.status, 405)
})

test('rejects invalid JSON', async () => {
  const badReq = new Request('https://rangertrak.org/api/feedback', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'not json{{{',
  })
  const res = await worker.fetch(badReq, { GITHUB_FEEDBACK_TOKEN: 'x' })
  assert.equal(res.status, 400)
})

test('rejects an empty message', async () => {
  const res = await worker.fetch(req({ message: '   ' }), { GITHUB_FEEDBACK_TOKEN: 'x' })
  assert.equal(res.status, 400)
})

test('rejects a message over the length cap', async () => {
  const res = await worker.fetch(req({ message: 'x'.repeat(4001) }), { GITHUB_FEEDBACK_TOKEN: 'x' })
  assert.equal(res.status, 400)
})

test('fails closed (503) when the GitHub token secret is not configured, never calling GitHub', async (t) => {
  const originalFetch = globalThis.fetch
  let called = false
  globalThis.fetch = async () => { called = true; throw new Error('should not be called') }
  t.after(() => { globalThis.fetch = originalFetch })

  const res = await worker.fetch(req({ message: 'hello' }), {})
  assert.equal(res.status, 503)
  assert.equal(called, false)
})

test('creates a labeled GitHub issue and returns its URL on success', async (t) => {
  const originalFetch = globalThis.fetch
  let capturedInit
  globalThis.fetch = async (url, init) => {
    capturedInit = { url, ...init }
    return new Response(JSON.stringify({ html_url: 'https://github.com/EOCOnline/rangertrak/issues/42' }), { status: 201 })
  }
  t.after(() => { globalThis.fetch = originalFetch })

  const res = await worker.fetch(
    req({ message: 'The map is upside down\nMore detail here.', contact: 'scribe@example.com' }),
    { GITHUB_FEEDBACK_TOKEN: 'secret-token' }
  )
  assert.equal(res.status, 201)
  const json = await res.json()
  assert.equal(json.url, 'https://github.com/EOCOnline/rangertrak/issues/42')

  assert.equal(capturedInit.url, 'https://api.github.com/repos/EOCOnline/rangertrak/issues')
  assert.equal(capturedInit.headers['Authorization'], 'Bearer secret-token')
  const sentBody = JSON.parse(capturedInit.body)
  assert.equal(sentBody.title, 'Feedback: The map is upside down')
  assert.match(sentBody.body, /The map is upside down/)
  assert.match(sentBody.body, /scribe@example\.com/)
  assert.deepEqual(sentBody.labels, ['feedback'])
})

test('never leaks the GitHub API response body to the client on failure', async (t) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('{"message":"Bad credentials"}', { status: 401 })
  t.after(() => { globalThis.fetch = originalFetch })

  const res = await worker.fetch(req({ message: 'hello' }), { GITHUB_FEEDBACK_TOKEN: 'bad-token' })
  assert.equal(res.status, 502)
  const json = await res.json()
  assert.doesNotMatch(JSON.stringify(json), /Bad credentials/)
})

test('.pmtiles requests still pass through the existing Range shim, unaffected by /api routing', async () => {
  const assetBody = new Uint8Array([1, 2, 3, 4, 5])
  const env = {
    ASSETS: {
      fetch: async () => new Response(assetBody, { status: 200 }),
    },
  }
  const rangeReq = new Request('https://rangertrak.org/assets/maps/vashon.pmtiles', {
    headers: { Range: 'bytes=1-3' },
  })
  const res = await worker.fetch(rangeReq, env)
  assert.equal(res.status, 206)
  assert.equal(res.headers.get('Content-Range'), 'bytes 1-3/5')
})

// --- CORS for the rangertrak.com front-door site (E-101 / ADR D-41) -------------------
// The .com site's feedback page posts to this same endpoint cross-origin. These lock in
// that the allowlist is an allowlist: a wildcard here would be invisible in the browser
// but would let any site file issues under the maintainer's token.

const DOT_COM = 'https://rangertrak.com'

function preflight(origin) {
  return new Request('https://rangertrak.org/api/feedback', {
    method: 'OPTIONS',
    headers: origin
      ? { 'Origin': origin, 'Access-Control-Request-Method': 'POST' }
      : { 'Access-Control-Request-Method': 'POST' },
  })
}

test('preflight from rangertrak.com is allowed, and echoes only that origin', async () => {
  const res = await worker.fetch(preflight(DOT_COM), { GITHUB_FEEDBACK_TOKEN: 'x' })
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), DOT_COM)
  assert.match(res.headers.get('Access-Control-Allow-Methods'), /POST/)
  assert.match(res.headers.get('Access-Control-Allow-Headers'), /Content-Type/)
  assert.equal(res.headers.get('Vary'), 'Origin')
})

test('preflight from an unlisted origin is refused, with no CORS headers', async () => {
  const res = await worker.fetch(preflight('https://evil.example'), { GITHUB_FEEDBACK_TOKEN: 'x' })
  assert.equal(res.status, 403)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null)
})

test('preflight is never answered with a wildcard', async () => {
  const res = await worker.fetch(preflight(DOT_COM), { GITHUB_FEEDBACK_TOKEN: 'x' })
  assert.notEqual(res.headers.get('Access-Control-Allow-Origin'), '*')
})

test('a real POST from rangertrak.com carries the CORS header through', async () => {
  // 400 (empty message) is enough: the header must ride on error responses too, or the
  // browser hides the status and the page cannot tell "rejected" from "unreachable".
  const withOrigin = new Request('https://rangertrak.org/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': DOT_COM },
    body: JSON.stringify({ message: '   ' }),
  })
  const res = await worker.fetch(withOrigin, { GITHUB_FEEDBACK_TOKEN: 'x' })
  assert.equal(res.status, 400)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), DOT_COM)
})

test('the in-app same-origin POST is unchanged - no Origin, no CORS headers', async () => {
  const res = await worker.fetch(req({ message: '   ' }), { GITHUB_FEEDBACK_TOKEN: 'x' })
  assert.equal(res.status, 400)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null)
})
