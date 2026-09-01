/**
 * Range-request shim for the PMTiles basemap.
 *
 * Cloudflare Workers static assets do not honour HTTP Range: a request for a byte
 * slice comes back 200 with the whole file and no Accept-Ranges. The pmtiles
 * library reads its header and directory by byte range, so on the live site the
 * offline map failed with "Server returned no content-length header or
 * content-length exceeding request. Check that your storage backend supports HTTP
 * Byte Serving." and rendered blank. DEVELOPING.md has always listed range support
 * as a hosting requirement; this is what satisfies it here.
 *
 * Only /assets/maps/*.pmtiles is routed through this Worker (`run_worker_first` in
 * wrangler.jsonc). Every other request is served straight from the asset store, so
 * the fast path is untouched.
 *
 * The file is ~1.7 MB, so buffering it to slice is well within a Worker's memory.
 * If the basemap ever grows past a few tens of MB, move it to R2, which does byte
 * serving natively, rather than raising the buffer.
 */

const PMTILES_HEADERS = {
  'Content-Type': 'application/octet-stream',
  'Accept-Ranges': 'bytes',
  // Content-addressed by build: the filename changes when the map data changes.
  'Cache-Control': 'public, max-age=31536000, immutable'
}

/**
 * ADR D-15: in-app feedback, primary path. Creates a labeled GitHub issue on the public
 * repo from a POSTed { message, contact? } body - decided 2026-08-20 (maintainer: "public
 * issues, as-is... standard for an open-source project"), so this deliberately does NOT
 * try to keep submissions private. The in-app form is responsible for telling the user
 * that up front, before they submit; this endpoint just does what it's told.
 *
 * Requires a `GITHUB_FEEDBACK_TOKEN` Worker secret - a GitHub PAT (fine-grained, scoped to
 * this repo only, Issues: Read and write) - set via
 * `wrangler secret put GITHUB_FEEDBACK_TOKEN`, never committed. Missing/invalid token
 * fails closed (503), which the frontend treats the same as "unreachable" and falls back
 * to a direct GitHub issue link - see feedback.component.ts.
 */
const GITHUB_REPO = 'EOCOnline/rangertrak'
const FEEDBACK_MESSAGE_MAX = 4000
const FEEDBACK_CONTACT_MAX = 200

async function handleFeedback(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400)
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const contact = typeof body.contact === 'string' ? body.contact.trim() : ''

  if (!message) {
    return jsonResponse({ error: 'message is required' }, 400)
  }
  if (message.length > FEEDBACK_MESSAGE_MAX) {
    return jsonResponse({ error: `message exceeds ${FEEDBACK_MESSAGE_MAX} characters` }, 400)
  }
  if (contact.length > FEEDBACK_CONTACT_MAX) {
    return jsonResponse({ error: `contact exceeds ${FEEDBACK_CONTACT_MAX} characters` }, 400)
  }

  if (!env.GITHUB_FEEDBACK_TOKEN) {
    return jsonResponse({ error: 'feedback endpoint not configured' }, 503)
  }

  // Title is the message's first line, truncated - GitHub issue titles are meant to be
  // short; the full message is always in the body regardless of how it truncates here.
  const firstLine = message.split('\n')[0].trim()
  const title = `Feedback: ${firstLine.length > 70 ? firstLine.slice(0, 67) + '...' : firstLine}`

  const issueBody = [
    message,
    '',
    '---',
    `Submitted via in-app feedback.`,
    `Contact: ${contact || '(not provided)'}`,
  ].join('\n')

  const ghResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_FEEDBACK_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      // GitHub's API rejects requests with no User-Agent.
      'User-Agent': 'rangertrak-feedback-worker',
    },
    body: JSON.stringify({ title, body: issueBody, labels: ['feedback'] }),
  })

  if (!ghResponse.ok) {
    // Never forward GitHub's own response body to the client - it can include detail
    // about the token/permissions. Logged (Observability is enabled) for the maintainer,
    // not shown to the submitter.
    console.error(`GitHub issue creation failed: ${ghResponse.status} ${await ghResponse.text()}`)
    return jsonResponse({ error: 'could not submit feedback' }, 502)
  }

  const issue = await ghResponse.json()
  return jsonResponse({ url: issue.html_url }, 201)
}

/**
 * CORS for the public marketing site (E-101 / ADR D-41).
 *
 * rangertrak.com serves the static front-door site from its own Worker, but its feedback
 * page posts to THIS endpoint - the same one the in-app form uses, so there is one code
 * path filing issues, not two. A browser will not make that cross-origin POST without a
 * preflight and a matching Access-Control-Allow-Origin, so without this the .com page
 * silently falls through to its GitHub-link fallback forever.
 *
 * Apex only, deliberately. www.rangertrak.com is redirect-only (DEPLOYING.md), so a page
 * is only ever served from the apex and the browser's Origin is only ever the apex.
 *
 * This does not widen the abuse surface: CORS restrains browsers, not clients. Any
 * non-browser caller could already POST here from anywhere, which is why the real limits
 * on this endpoint are the length caps and the fail-closed token check above, not origin.
 */
const FEEDBACK_ALLOWED_ORIGINS = new Set([
  'https://rangertrak.com'
])

function feedbackCorsOrigin(request) {
  const origin = request.headers.get('Origin')
  return origin && FEEDBACK_ALLOWED_ORIGINS.has(origin) ? origin : null
}

/** Preflight. Content-Type: application/json is not CORS-safelisted, so this always fires. */
function handleFeedbackPreflight(request) {
  const origin = feedbackCorsOrigin(request)
  if (!origin) {
    return new Response(null, { status: 403 })
  }
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      // Same URL answers differently per Origin; without this a cache could serve one
      // origin's headers to another.
      'Vary': 'Origin'
    }
  })
}

/** Copies an allowed Origin's CORS headers onto an already-built response. */
function withFeedbackCors(response, request) {
  const origin = feedbackCorsOrigin(request)
  if (!origin) {
    return response
  }
  const withCors = new Response(response.body, response)
  withCors.headers.set('Access-Control-Allow-Origin', origin)
  withCors.headers.set('Vary', 'Origin')
  return withCors
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/feedback') {
      if (request.method === 'OPTIONS') {
        return handleFeedbackPreflight(request)
      }
      return withFeedbackCors(await handleFeedback(request, env), request)
    }

    if (!url.pathname.endsWith('.pmtiles')) {
      return env.ASSETS.fetch(request)
    }

    // Ask the asset store for the whole object; it ignores Range anyway.
    const asset = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }))
    if (!asset.ok) {
      return asset
    }

    const body = await asset.arrayBuffer()
    const total = body.byteLength
    const range = request.headers.get('Range')

    if (!range) {
      return new Response(request.method === 'HEAD' ? null : body, {
        status: 200,
        headers: { ...PMTILES_HEADERS, 'Content-Length': String(total) }
      })
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (!match || (match[1] === '' && match[2] === '')) {
      // Unsatisfiable or malformed: answer with the whole file rather than failing.
      return new Response(body, {
        status: 200,
        headers: { ...PMTILES_HEADERS, 'Content-Length': String(total) }
      })
    }

    let start
    let end
    if (match[1] === '') {
      // Suffix form: "bytes=-500" means the final 500 bytes.
      const suffix = parseInt(match[2], 10)
      start = Math.max(0, total - suffix)
      end = total - 1
    } else {
      start = parseInt(match[1], 10)
      end = match[2] === '' ? total - 1 : Math.min(parseInt(match[2], 10), total - 1)
    }

    if (!Number.isFinite(start) || start >= total || start > end) {
      return new Response(null, {
        status: 416,
        headers: { ...PMTILES_HEADERS, 'Content-Range': `bytes */${total}` }
      })
    }

    const slice = body.slice(start, end + 1)
    return new Response(request.method === 'HEAD' ? null : slice, {
      status: 206,
      headers: {
        ...PMTILES_HEADERS,
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Content-Length': String(slice.byteLength)
      }
    })
  }
}
