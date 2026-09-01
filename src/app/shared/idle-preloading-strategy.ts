import { Injectable } from '@angular/core'
import { PreloadingStrategy, Route } from '@angular/router'
import { Observable } from 'rxjs'

/**
 * Preloads every lazy route, same end state as Angular's own `PreloadAllModules` - but only
 * once the browser is idle, instead of immediately after the first navigation settles.
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
 * `requestIdleCallback` is the correct signal for "the browser has caught its breath from
 * the initial render," not a guessed setTimeout duration - Safari lacks it, so a 3s
 * setTimeout is the fallback there (Safari's own equivalent recommendation).
 */
@Injectable({ providedIn: 'root' })
export class IdlePreloadingStrategy implements PreloadingStrategy {
  preload(_route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return new Observable(subscriber => {
      const run = () => load().subscribe({
        next: v => subscriber.next(v),
        error: e => subscriber.error(e),
        complete: () => subscriber.complete(),
      })

      if (typeof requestIdleCallback === 'function') {
        const handle = requestIdleCallback(run, { timeout: 5000 })
        return () => cancelIdleCallback(handle)
      }
      const handle = setTimeout(run, 3000)
      return () => clearTimeout(handle)
    })
  }
}
