import { Injectable } from '@angular/core'
import { PreloadingStrategy, Route } from '@angular/router'
import { Observable } from 'rxjs'

/**
 * Preloads every lazy route, same end state as Angular's own `PreloadAllModules` - but only
 * once the page has actually settled, instead of immediately after the first navigation.
 *
 * ROOT-CAUSED live 2026-09-01 via a real PageSpeed/Lighthouse run (Slow 4G, Moto G Power):
 * `PreloadAllModules` was firing right after Entry's own bootstrap, so a dozen unrelated
 * lazy-route chunks (Messages, Rangers, Mission, Log, Prep, Map - none of which Entry needs)
 * were mid-download/mid-execution in Entry's own critical path. The Lighthouse report named
 * the exact cost: `chunk-B1AbbR2g.js` alone was 306 KiB transferred with 254 KiB (83%)
 * unused on this page, and the CLS/LCP culprit was `<main>` itself - 0.294 of 0.296 total
 * CLS, with the LCP breakdown showing 0ms time-to-first-byte but 1,770ms of "element render
 * delay" on the welcome text. TTFB 0 + all the delay in render means the network wasn't the
 * bottleneck - the main thread was, busy parsing/running chunks Entry never asked for.
 *
 * Removing preloading outright was considered and rejected: `ngsw-config.json`'s "app" asset
 * group already prefetches every `/*.js` file unconditionally on service-worker install, so
 * offline completeness never actually depended on the ROUTER preloading anything - that
 * argument in app.routes.ts's own doc comment (now corrected) no longer holds. But
 * `PreloadAllModules` was doing more than caching bytes: it PARSES and EXECUTES each lazy
 * component's module top-level code ahead of time, which is what makes a ranger's later
 * Map -> Radio Log -> Rangers navigation mid-mission instant rather than a JS-parse stall.
 * That's a real, worth-keeping benefit - just not one that should compete with Entry's own
 * first paint for the same main thread.
 *
 * ATTEMPT 1 (shipped `0.91.0`, `requestIdleCallback` alone, no `load`-event gate): DID NOT
 * WORK - a second live PageSpeed run afterward showed the exact same chunks still fully
 * present in Entry's own critical path, still fetching out to 4.7s, CLS unchanged at 0.31,
 * Performance score unchanged at 45. Root cause of the non-fix: `requestIdleCallback` only
 * means "the JS event loop has a free tick," which under async load (lots of in-flight
 * promises/fetches) can happen almost immediately after boot - well before the page has
 * actually finished loading its own resources. It answers "is the CPU free right now," not
 * "has the page settled," which is the question that actually matters here.
 *
 * ATTEMPT 2 (this version): gate on the native `window` `'load'` event FIRST, then layer
 * `requestIdleCallback` on top as a secondary refinement. `load` only fires once every
 * sub-resource the initial render actually needs - fonts, the Entry mini-map's raster tiles,
 * etc. - has finished, which is a much stronger "the critical path is actually done" signal
 * than a free CPU tick. It does NOT wait on unrelated async work like the Nominatim
 * reverse-geocode fetch (that's a plain `fetch()`, not a declarative sub-resource, so it
 * doesn't block `load`) - exactly the scope this needs: wait for Entry's OWN rendering work,
 * not for everything the page happens to also be doing. Adaptive by construction: a fast
 * connection reaches `load` quickly and starts preloading sooner; a slow one defers longer -
 * unlike a fixed `setTimeout` guess, which would either be too short for a slow connection or
 * needlessly late for a fast one. NOT YET VERIFIED against a third live PageSpeed run - next
 * step for whoever picks this up next.
 */
@Injectable({ providedIn: 'root' })
export class IdlePreloadingStrategy implements PreloadingStrategy {
  private static windowLoaded: Promise<void> | undefined

  private static afterWindowLoad(): Promise<void> {
    if (!IdlePreloadingStrategy.windowLoaded) {
      IdlePreloadingStrategy.windowLoaded = document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise(resolve => window.addEventListener('load', () => resolve(), { once: true }))
    }
    return IdlePreloadingStrategy.windowLoaded
  }

  preload(_route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return new Observable(subscriber => {
      let cancelled = false
      let idleHandle: number | undefined
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined

      const run = () => load().subscribe({
        next: v => subscriber.next(v),
        error: e => subscriber.error(e),
        complete: () => subscriber.complete(),
      })

      IdlePreloadingStrategy.afterWindowLoad().then(() => {
        if (cancelled) {
          return
        }
        if (typeof requestIdleCallback === 'function') {
          idleHandle = requestIdleCallback(run, { timeout: 5000 })
        } else {
          timeoutHandle = setTimeout(run, 3000)
        }
      })

      return () => {
        cancelled = true
        if (idleHandle !== undefined && typeof cancelIdleCallback === 'function') {
          cancelIdleCallback(idleHandle)
        }
        if (timeoutHandle !== undefined) {
          clearTimeout(timeoutHandle)
        }
      }
    })
  }
}
