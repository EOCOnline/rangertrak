import { ErrorHandler, inject, Injectable } from '@angular/core'

import { LogService } from './log.service'

/**
 * Routes otherwise-invisible failures into the in-app Log page.
 *
 * Until this existed the Log only ever contained what code explicitly chose to log, so the
 * single most useful thing in a trouble report - the exception that actually broke the
 * screen - was the one thing missing from it. A scribe on a field tablet has no devtools,
 * so an uncaught error simply looked like "the page stopped working".
 *
 * Covers all three routes a failure can take:
 *  - Angular's own error path (this class, via the ErrorHandler token)
 *  - uncaught exceptions outside Angular (`window.onerror`)
 *  - rejected promises nobody caught (`unhandledrejection`) - especially relevant in a
 *    zoneless app, where those do not necessarily reach Angular's handler
 */
@Injectable({ providedIn: 'root' })
export class GlobalErrorHandler implements ErrorHandler {

  private id = 'Unhandled Error'
  private log = inject(LogService)

  constructor() {
    window.addEventListener('error', (ev: ErrorEvent) => {
      this.record(ev.error ?? ev.message, 'window.onerror')
    })

    window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
      this.record(ev.reason, 'unhandled promise rejection')
    })
  }

  handleError(error: unknown): void {
    this.record(error, 'Angular ErrorHandler')

    // Still surface it the normal way: the console keeps the live, clickable stack trace,
    // which is more useful than our flattened copy whenever devtools are actually open.
    console.error(error)
  }

  private record(error: unknown, origin: string): void {
    // Never let logging an error throw an error - that recurses straight into this handler.
    try {
      this.log.error(`${origin}: ${this.describe(error)}`, this.id)
    } catch {
      console.error('GlobalErrorHandler failed to record an error', error)
    }
  }

  private describe(error: unknown): string {
    if (error instanceof Error) {
      // The stack is the point of capturing this at all, but a full trace crowds out every
      // other line on the Log page, so keep the top few frames.
      const stack = error.stack?.split('\n').slice(0, 5).join(' | ') ?? '(no stack)'
      return `${error.name}: ${error.message} — ${stack}`
    }
    if (typeof error === 'string') {
      return error
    }
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
}
