import { FieldReportType } from './field-report.interface'
import { RangerType } from './ranger.interface'

/**
 * ADR D-42: assigning every ranger a generic, unique `id`, and resolving each field report's
 * `rangerId` from the `callsign` it was filed against.
 *
 * PHASE 1 SCAFFOLDING - written ahead of the wiring, deliberately. Nothing calls this yet.
 * See `D-42 Callsign to ID Migration.md` (rangertrak-InternalDocs) for the phased plan this
 * belongs to and what wires it up. It is pure, dependency-free and fully unit-tested on its
 * own so the risky half of D-42 (silently orphaning stored data) is settled before any
 * service starts depending on it.
 *
 * ## Why a backfill at all, and why unconditional
 *
 * Neither rangers nor field reports have ANY migration path today - `field-report.service.ts`
 * and `ranger.service.ts` both just `JSON.parse()` whatever localStorage holds (unlike
 * `SettingsType`, which has real `migrateSettings()` machinery). So a returning user's stored
 * rangers have no `id` and their stored reports have no `rangerId`. Renaming the join key
 * without a backfill orphans every report they have ever filed.
 *
 * These functions are therefore written to be called UNCONDITIONALLY on every load, not
 * behind a schema-version gate. That is this project's own hard-won pattern: see
 * [[settings-schema-version-discipline]] and the `0.16.8` post-mortem, where a version gate
 * around an additive backfill was itself the bug, twice, for two different fields. Both
 * functions are pure and idempotent - running them on already-migrated data returns
 * equivalent data and reports zero changes.
 *
 * ## Why existing credential numbers are preserved verbatim
 *
 * D-42's stated format is `REW-0038` / `TEW-1003`. But real stored `rew` values in this
 * codebase are already ID-shaped with a REGIONAL prefix - `VI-0038`, `VI-01` ("VI" for
 * Vashon Island) - which presumably matches the issuing agency's own records. Rewriting
 * `VI-0038` to `REW-0038` during a silent automatic migration would destroy that
 * correspondence with no way back.
 *
 * So the rule here is: **an already-ID-shaped credential is kept as-is** (only trimmed and
 * prefix-upper-cased); a BARE NUMBER gets the `REW-` prefix; anything else unusable as an
 * identifier (`CmdPost`, ``) falls through to a synthesized `TEW-####`. If the maintainer
 * decides they DO want every credential force-normalized to `REW-`, that is a one-line change
 * in `normalizeRangerId()` below - but it should be a deliberate, stated decision, not a
 * side effect, so it is not the default here.
 */

/** A well-formed ranger ID: a letter-led prefix, a hyphen, then digits. */
const ID_SHAPE = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/

/** Prefix for a synthesized ID, where no usable credential number existed. */
const TEMP_PREFIX = 'TEW'

/** Prefix applied to a credential recorded as a bare number, with no prefix of its own. */
const CREDENTIAL_PREFIX = 'REW'

/** Where synthesized TEW numbering starts. Above any plausible real small-roster number. */
const TEMP_START = 1000

/** Zero-padding applied ONLY when promoting a bare number to `REW-####`. */
const BARE_NUMBER_PAD = 4

/**
 * Canonicalizes a candidate identifier, or returns '' when it cannot serve as one.
 *
 * - `'VI-0038'` -> `'VI-0038'`   (already ID-shaped: kept verbatim, see the note above)
 * - `'vi-0038'` -> `'VI-0038'`   (prefix upper-cased so case can't split one identity in two)
 * - `'VI-00 '`  -> `'VI-00'`     (trimmed)
 * - `'38'`      -> `'REW-0038'`  (bare number: gets the credential prefix, zero-padded)
 * - `'CmdPost'` -> `''`          (not an identifier - caller synthesizes a TEW instead)
 * - `''`/null   -> `''`
 *
 * Digits inside an already-shaped value are NOT re-padded: `VI-1` stays `VI-1` rather than
 * becoming `VI-0001`, because the stored string is what matches an agency's own record.
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

/** What `assignRangerIds()` did, so a caller can log or surface it. */
export type RangerIdAssignment = {
  rangers: RangerType[],
  /** Already had a usable, unique id - left completely untouched. */
  unchanged: number,
  /** Took an id derived from an existing credential (`id` or `rew`). */
  fromCredential: number,
  /** Got a synthesized `TEW-####` because no usable credential existed. */
  synthesized: number,
  /**
   * Had a usable credential that ANOTHER ranger had already claimed, so this one was given a
   * synthesized `TEW-####` instead (and is counted in `synthesized` too). Non-zero here means
   * the roster held a genuine duplicate credential worth showing someone - see
   * `rosterWarnings()`.
   */
  collisions: number,
}

/**
 * Gives every ranger a unique `id`, in place of nothing (fresh migration) or alongside ids
 * that are already correct (a re-run).
 *
 * **Uniqueness is guaranteed by construction**, deliberately - unlike the import-time
 * duplicate-callsign handling, which only warns. The difference is that this runs
 * automatically with no operator watching: leaving two rangers sharing a join key here would
 * silently make every report filed against either one ambiguous, with nobody prompted to fix
 * it. A duplicate credential therefore loses the tie (first ranger in array order keeps it)
 * and the later one gets a synthesized `TEW-####`, which `collisions` reports so the app can
 * tell someone rather than hiding it.
 *
 * Source of an id, in priority order: an existing valid `id`, then `rew`, then synthesis.
 *
 * Pure: returns new ranger objects, does not mutate the input array or its members.
 */
export function assignRangerIds(rangers: readonly RangerType[]): RangerIdAssignment {
  const taken = new Set<string>()

  // Pass 1 - claim every id that is ALREADY valid, first-come-wins. Doing this before any
  // assignment is what makes a re-run a no-op: an already-migrated roster fills `taken` with
  // exactly its own ids, and pass 2 then finds every ranger already holding a unique one.
  for (const ranger of rangers) {
    const existing = normalizeRangerId((ranger as Partial<RangerType> & { id?: unknown }).id)
    if (existing && !taken.has(existing)) {
      taken.add(existing)
    }
  }

  let unchanged = 0
  let fromCredential = 0
  let synthesized = 0
  let collisions = 0

  // Monotonic cursor rather than rescanning from TEMP_START for each ranger - keeps a large
  // roster linear instead of quadratic.
  let tempCursor = TEMP_START
  const nextTempId = (): string => {
    while (taken.has(`${TEMP_PREFIX}-${tempCursor}`)) {
      tempCursor++
    }
    const id = `${TEMP_PREFIX}-${tempCursor}`
    tempCursor++
    return id
  }

  const claimed = new Set<string>()
  const migrated = rangers.map(ranger => {
    const loose = ranger as Partial<RangerType> & { id?: unknown, rew?: unknown }
    const existing = normalizeRangerId(loose.id)

    // Already holds a valid id that nothing else has claimed this pass - leave it alone.
    if (existing && !claimed.has(existing)) {
      claimed.add(existing)
      unchanged++
      return { ...ranger, id: existing } as RangerType
    }

    const credential = normalizeRangerId(loose.rew)
    if (credential && !taken.has(credential) && !claimed.has(credential)) {
      claimed.add(credential)
      taken.add(credential)
      fromCredential++
      return { ...ranger, id: credential } as RangerType
    }

    // Either there was no usable credential, or someone else already holds it.
    if (credential) {
      collisions++
    }
    const fresh = nextTempId()
    claimed.add(fresh)
    taken.add(fresh)
    synthesized++
    return { ...ranger, id: fresh } as RangerType
  })

  return { rangers: migrated, unchanged, fromCredential, synthesized, collisions }
}

/** What `backfillReportRangerIds()` did. */
export type ReportBackfillResult = {
  reports: FieldReportType[],
  /** Already carried a `rangerId` - untouched. */
  unchanged: number,
  /** Resolved a `rangerId` from the report's `callsign`. */
  resolved: number,
  /**
   * Could not be matched to any ranger in the current roster - the callsign is blank, or
   * belongs to someone since deleted or renamed. These keep their original `callsign` and are
   * left with an empty `rangerId`; the data is NOT discarded.
   */
  unmatched: number,
}

/**
 * Resolves each report's `rangerId` from the `callsign` it was filed against.
 *
 * **`callsign` is deliberately kept on the report**, not replaced. Two reasons, both real:
 * a report can outlive the ranger it names (deleted or re-keyed roster row), and the callsign
 * is what a scribe actually heard over the radio - it is the primary evidence of who reported,
 * and a resolved-at-migration-time id is a derived convenience on top of it. A report that
 * cannot be matched keeps its callsign and an empty `rangerId` rather than being dropped or
 * silently attached to the wrong person.
 *
 * Matching is case-insensitive on trimmed callsigns, mirroring `rosterWarnings()`' own
 * duplicate detection and `RangerPhotoService`'s filename matching.
 *
 * Pure: returns new report objects, does not mutate its inputs.
 */
export function backfillReportRangerIds(
  reports: readonly FieldReportType[],
  rangers: readonly RangerType[],
): ReportBackfillResult {
  const byCallsign = new Map<string, string>()
  for (const ranger of rangers) {
    const key = String(ranger.callsign ?? '').trim().toUpperCase()
    const id = normalizeRangerId((ranger as Partial<RangerType> & { id?: unknown }).id)
    // First-come-wins on a duplicated callsign, matching assignRangerIds' own tie-breaking so
    // the two can't disagree about which ranger a duplicated key refers to.
    if (key && id && !byCallsign.has(key)) {
      byCallsign.set(key, id)
    }
  }

  let unchanged = 0
  let resolved = 0
  let unmatched = 0

  const migrated = reports.map(report => {
    const loose = report as FieldReportType & { rangerId?: unknown }
    const existing = normalizeRangerId(loose.rangerId)
    if (existing) {
      unchanged++
      return { ...report, rangerId: existing } as FieldReportType
    }

    const key = String(report.callsign ?? '').trim().toUpperCase()
    const match = key ? byCallsign.get(key) : undefined
    if (match) {
      resolved++
      return { ...report, rangerId: match } as FieldReportType
    }

    unmatched++
    return { ...report, rangerId: '' } as FieldReportType
  })

  return { reports: migrated, unchanged, resolved, unmatched }
}
