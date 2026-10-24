// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak's service worker: Angular's ngsw-worker.js plus the one rule it cannot express.
// The tour lives at /tour/, a directory URL, and ngsw only caches files, so offline /tour/
// would fail. This listener runs first (it is registered before the import) and handles only
// /tour and /tour/: network first, keeping a copy, and the copy when the network is down.
// Everything else falls through to ngsw untouched.
const TOUR_CACHE = 'rt-tour-v1'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname !== '/tour' && url.pathname !== '/tour/') return
  event.stopImmediatePropagation()
  event.respondWith(tourPage(event.request, url))
})

async function tourPage(request, url) {
  const cache = await caches.open(TOUR_CACHE)
  try {
    const res = await fetch(request)
    if (res.ok && url.pathname === '/tour/') await cache.put('/tour/', res.clone())
    return res
  } catch {
    // /tour must become /tour/ so the page's relative tour.css resolves.
    if (url.pathname === '/tour') return Response.redirect(new URL('/tour/', url), 302)
    return (await cache.match('/tour/')) || (await caches.match('/tour/index.html')) || Response.error()
  }
}

importScripts('./ngsw-worker.js')
