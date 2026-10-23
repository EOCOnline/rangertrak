import { boardCause } from './board-causes'

/**
 * E-216 slice 2: "Test connection". Pure: given what the device could find out, name the most likely cause.
 * The fetches themselves are in `shared/services/command-post-publish.service.ts`. The sentences come from the
 * shared list (`board-causes.json`), so the app, the server and the viewer say the same thing.
 *
 * A browser cannot see WHY a request failed, so the fast/slow split below is a guess; the cause sentences say
 * "most likely" and name the next suspect rather than state a cause as fact.
 */

/** The browser's local network permission for this site: the Chrome prompt for public sites reaching private addresses. */
export type LocalNetworkPermission = 'granted' | 'denied' | 'prompt' | 'unknown'

/** What asking the Board `GET /api/hello` came to. */
export type HelloResult =
  | { kind: 'ok', name: string }
  | { kind: 'not-board' }
  | { kind: 'failed', elapsedMs: number }
  | { kind: 'timeout' }

export type BoardDiagnosis = {
  ok: boolean
  /** The id in board-causes.json; absent when connected. */
  cause?: string
  /** One sentence for the scribe. */
  message: string
  /** The technical line for whoever is helping (shown under "Details"). */
  detail: string
  /** The Board's name, when it answered. */
  name?: string
}

/** A failure faster than this is most likely a certificate not yet accepted (or nothing running); slower, a network problem. */
export const QUICK_FAIL_MS = 3000

export function diagnoseBoard(f: { online: boolean, localNetwork: LocalNetworkPermission, hello: HelloResult }): BoardDiagnosis {
  const fail = (cause: string, values: Record<string, string> = {}): BoardDiagnosis => ({ ok: false, cause, ...boardCause(cause, values) })
  if (!f.online) return fail('no-network')
  if (f.localNetwork === 'denied') return fail('blocked-by-browser')
  switch (f.hello.kind) {
    case 'ok':
      return {
        ok: true,
        message: `Connected to the Board ${f.hello.name || 'on this network'}.`,
        detail: 'The Board answered and identified itself as a RangerTrak Board.',
        name: f.hello.name,
      }
    case 'not-board':
      return fail('not-a-board')
    case 'failed':
      return fail(f.hello.elapsedMs < QUICK_FAIL_MS ? 'certificate-not-accepted' : 'different-network')
    case 'timeout':
      return fail('different-network')
  }
}
