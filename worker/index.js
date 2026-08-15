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

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

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
