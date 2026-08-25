import { RangerType } from './ranger.interface'

/**
 * Versioned, forward-only migration for the persisted ranger roster, plus the ID assignment
 * ADR D-42 introduced.
 *
 * Mirrors `settings-migration.ts` deliberately - same shape, same conventions, same purity
 * rules - rather than inventing a second way to do this. Settings has had real migration
 * machinery since Sprint E; rangers and field reports had **none at all** (both were bare
 * `JSON.parse()` calls), which is the gap this closes.
 *
 * Maintainer, 2026-08-26: *"there are no existing reports. no need for back fill at this
 * point. all should have some schema version of some sort for the future when we do need
 * this."* So this deliberately does NOT carry defensive backfill logic for legacy data that
 * does not exist - it establishes the **seam** a future migration hooks into, while the
 * install base is still small enough that introducing a versioned storage shape is free.
 * Doing it now is the whole point; it gets materially harder once real rosters are in the
 * field. (An earlier draft of this file carried a `backfillReportRangerIds()` that resolved
 * each stored report's ranger from its callsign - removed on that direction, since the data
 * it rescued does not exist. If a future build DOES need it, it belongs as a numbered
 * migration step in `field-report-migration.ts`, not as permanent defensive code.)
 *
 * Everything here is PURE - no injection, no logging, no storage access - so it is
 * unit-testable without a browser and safe to call from both entry points (RangerService's
 * load path and BackupService's importMission).
 */

/**
 * Bump when a migration step is added below, and add the matching `if (version < N)` block.
 *
 * 0 - (implicit) a BARE `RangerType[]` array, which is what localStorage holds today. Not a
 *     real version, just the absence of one.
 * 1 - the versioned `{ schemaVersion, rangers }` wrapper, with each ranger's identifier
 *     canonicalized into `id` (ADR D-42). Note "canonicalized", not "assigned": a ranger who
 *     has not checked in yet legitimately has no number, and this app does not mint them.
 */
export const RANGER_SCHEMA_VERSION = 1

/**
 * The persisted shape of the roster.
 *
 * Note this is the STORAGE format, deliberately distinct from the liberal IMPORT format
 * `RangerService.parseRosterJson()` accepts (a bare array, a `{rangers: []}` wrapper, or a
 * whole mission export). Import stays forgiving because it takes whatever file a team
 * actually has in hand; storage is strict and versioned because we own it.
 */
export type StoredRangers = {
  schemaVersion: number,
  rangers: RangerType[],
}

/** A well-formed ranger ID: a letter-led prefix, a hyphen, then digits. */
const ID_SHAPE = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/

/** Prefix applied to a credential recorded as a bare number, with no prefix of its own. */
const CREDENTIAL_PREFIX = 'REW'

/** Zero-padding applied ONLY when promoting a bare number to `REW-####`. */
const BARE_NUMBER_PAD = 4

/**
 * Canonicalizes a candidate identifier, or returns '' when it cannot serve as one.
 *
 * - `'VI-0038'` -> `'VI-0038'`   (already ID-shaped: kept verbatim, see below)
 * - `'vi-0038'` -> `'VI-0038'`   (prefix upper-cased so case can't split one identity in two)
 * - `'VI-00 '`  -> `'VI-00'`     (trimmed)
 * - `'38'`      -> `'REW-0038'`  (bare number: gets the credential prefix, zero-padded)
 * - `'CmdPost'` -> `''`          (not an identifier - reported as missing, never invented)
 * - `''`/null   -> `''`
 *
 * **Why an existing credential is preserved verbatim.** D-42 states the format as
 * `REW-0038`/`TEW-1003`, but real stored `rew` values in this codebase are already ID-shaped
 * with a REGIONAL prefix - `VI-0038`, `VI-01` ("VI" for Vashon Island) - which presumably
 * matches the issuing agency's own records. Rewriting those to `REW-0038` would destroy that
 * correspondence with no way back. Digits inside an already-shaped value are likewise NOT
 * re-padded: `VI-1` stays `VI-1`, because the stored string is what matches a real record.
 *
 * If the maintainer decides they DO want every credential force-normalized to `REW-`, that is
 * a one-line change here - but it should be a deliberate, stated decision, not a side effect.
 */
export function normalizeRangerId(raw: unknown): string {
  const value = String(raw ?? '').trim()
  if (!value) {
    return ''
  }

  const shaped = ID_SHAPE.exec(value)
  if (shaped) {
    return `${shaped[1].toUpperCase()}-${shaped[2]}`
  }

  if (/^\d+$/.test(value)) {
    return `${CREDENTIAL_PREFIX}-${value.padStart(BARE_NUMBER_PAD, '0')}`
  }

  return ''
}

/** True when a string is already a canonical ranger ID. */
export function isRangerId(value: unknown): boolean {
  const normalized = normalizeRangerId(value)
  return normalized !== '' && normalized === String(value ?? '').trim().replace(
    ID_SHAPE, (_m, p: string, d: string) => `${p.toUpperCase()}-${d}`)
}

/** What `normalizeRangerIds()` found, so a caller can log it or surface it as a warning. */
export type RangerIdAudit = {
  /** The roster with every recognizable id canonicalized. Nothing invented. */
  rangers: RangerType[],
  /** Carried a usable id already (in `id`, or seeded from `rew`). */
  identified: number,
  /**
   * Have NO usable identifier. These are not an error - a ranger on a pre-loaded roster who
   * has not checked in yet genuinely does not have a number, because the incident issues it.
   * Surface it so someone can fill it in at check-in; do NOT invent one.
   */
  missing: number,
  /**
   * Ids held by more than one ranger, in first-seen order. Genuinely ambiguous - every report
   * filed against one of these cannot be attributed to a single person - so this is worth a
   * loud warning, but it is the operator's data to fix, not ours to silently rewrite.
   */
  duplicates: string[],
}

/**
 * Canonicalizes whatever identifiers a roster already carries, and reports what is missing or
 * duplicated. **It never invents an identifier.**
 *
 * Maintainer, 2026-08-26: *"tew numbers are assigned at checkin, not by the app."* That is a
 * real-world organizational process - a Temporary Emergency Worker number is issued when
 * someone signs in at the incident - so an app-minted `TEW-1000` would be a fabricated
 * credential that could collide with a genuinely issued one. An earlier draft of this
 * function did exactly that; it was wrong and is gone.
 *
 * A blank id is therefore a legitimate, expected state ("hasn't checked in yet"), reported
 * via `missing` rather than papered over - consistent with how this app already treats a
 * blank callsign (the map's `UNASSIGNED_MARKER`, the Rangers grid's own "⚠ (none set)"):
 * flag the gap, don't hide it behind invented data.
 *
 * Exported separately from `migrateRangers()` because it is used in two places: as the
 * v0 -> v1 migration step, and as normalization on **import**, where a roster file may carry
 * a `rew` credential but no `id` at all.
 *
 * Source of an id, in priority order: an existing valid `id`, then `rew`. Nothing else.
 *
 * Pure and idempotent: returns new ranger objects, never mutates its input, and a second run
 * over its own output changes nothing.
 */
export function normalizeRangerIds(rangers: readonly RangerType[]): RangerIdAudit {
  const seen = new Set<string>()
  const duplicated = new Set<string>()

  let identified = 0
  let missing = 0

  const normalized = rangers.map(ranger => {
    // An explicit `id` wins; `rew` seeds one where no `id` exists yet (ADR D-42 folds the
    // WA-specific "REW" column into the generic identifier).
    const id = normalizeRangerId(ranger?.id) || normalizeRangerId(ranger?.rew)

    if (!id) {
      missing++
      return { ...ranger, id: '' }
    }

    identified++
    if (seen.has(id)) {
      duplicated.add(id)
    } else {
      seen.add(id)
    }
    return { ...ranger, id }
  })

  return {
    rangers: normalized,
    identified,
    missing,
    duplicates: [...duplicated],
  }
}

/**
 * Brings a persisted roster up to RANGER_SCHEMA_VERSION.
 *
 * Accepts what localStorage might actually hold: the versioned wrapper, a bare `RangerType[]`
 * (the pre-versioning shape, treated as version 0), or something unusable.
 *
 * Pure: returns a new object and never mutates its argument. A version NEWER than this build
 * understands is passed through untouched rather than mangled - same reasoning as
 * `migrateSettings()`: that is someone running an older build against newer data, and
 * silently "downgrading" it would lose information.
 *
 * Anything unparseable yields an empty, current-version roster. An empty roster is a
 * meaningful state in its own right since 0.55.0 ("Rangers should start blank. That should
 * indicate a new mission!"), so that is a correct answer rather than a papered-over failure.
 */
export function migrateRangers(raw: unknown): StoredRangers {
  // Version 0: a bare array, which is exactly what localStorage holds today.
  if (Array.isArray(raw)) {
    return {
      schemaVersion: RANGER_SCHEMA_VERSION,
      rangers: normalizeRangerIds(raw as RangerType[]).rangers,
    }
  }

  if (!raw || typeof raw !== 'object') {
    return { schemaVersion: RANGER_SCHEMA_VERSION, rangers: [] }
  }

  const incoming = raw as Partial<StoredRangers> & { schemaVersion?: unknown }
  const rangers = Array.isArray(incoming.rangers) ? incoming.rangers : []
  const version = typeof incoming.schemaVersion === 'number' ? incoming.schemaVersion : 0

  // Newer than we understand - hand it back as-is rather than "migrating" it backwards.
  if (version > RANGER_SCHEMA_VERSION) {
    return { schemaVersion: version, rangers }
  }

  if (version < RANGER_SCHEMA_VERSION) {
    // v0 -> v1: every ranger gains a unique id (ADR D-42).
    return {
      schemaVersion: RANGER_SCHEMA_VERSION,
      rangers: normalizeRangerIds(rangers).rangers,
    }
  }

  return { schemaVersion: RANGER_SCHEMA_VERSION, rangers }
}
