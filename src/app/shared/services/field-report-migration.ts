import { FieldReportsType } from './field-report.interface'

/**
 * Versioned, forward-only migration for the persisted field-report store.
 *
 * Mirrors `mission-migration.ts` and `ranger-migration.ts` - same shape, same conventions,
 * same purity rules. Field reports had **no migration machinery at all** before this: the
 * load path was a bare `JSON.parse()`, so an object written by an older build was simply used
 * as-is and hoped for.
 *
 * Maintainer, 2026-08-26: *"there are no existing reports. no need for back fill at this
 * point. all should have some schema version of some sort for the future when we do need
 * this."* This file is exactly that - the **seam**, established while it is free, with no
 * transform behind it yet because there is no legacy data to transform. When a future change
 * does need one, it becomes a numbered `if (version < N)` block below and the version bumps.
 *
 * ## The `"version"` substring trap - read before touching FieldReportsType
 *
 * `field-report.service.ts`'s load path decides whether stored data is valid with
 * `localStorageFieldReports.indexOf("version") <= 0` - a naive SUBSTRING search over the raw
 * JSON text. Anything that removes the literal string `version` from the serialized object
 * makes every returning user's reports read as "corrupted" and silently reset to defaults.
 *
 * This is the same class of bug as [[settings-marker-field-trap]], which already bit this
 * project once. Adding `schemaVersion` is safe *because* it contains the substring `version`,
 * but that is luck, not design. Replacing that check with a real structural test is worth
 * doing when the load path is next touched.
 *
 * Everything here is PURE - no injection, no logging, no storage access.
 */

/**
 * Bump when a migration step is added below, and add the matching `if (version < N)` block.
 *
 * 0 - (implicit) the unversioned `FieldReportsType` wrapper written before 2026-08-26. Note
 *     its own `version` field is the APP version string (e.g. "0.54.1"), stamped for
 *     information and never compared - it is not, and never was, a schema version.
 * 1 - the same wrapper carrying an explicit numeric `schemaVersion`.
 */
export const FIELD_REPORT_SCHEMA_VERSION = 1

/**
 * Brings a persisted field-report store up to FIELD_REPORT_SCHEMA_VERSION.
 *
 * Returns `null` when the input is not a usable store, rather than inventing one: building a
 * fresh empty store needs `MissionService` (for the app version and event name) and that
 * default-construction logic already lives in `FieldReportService.initEmptyFieldReports()`.
 * Duplicating it here would be a second source of truth for what "empty" means. A `null`
 * return means "call your own initializer".
 *
 * Pure: returns a new object and never mutates its argument. A version NEWER than this build
 * understands is passed through untouched rather than mangled - same reasoning as
 * `migrateMission()`.
 */
export function migrateFieldReports(raw: unknown): FieldReportsType | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  const incoming = raw as FieldReportsType & { schemaVersion?: unknown }

  // Not a field-report store at all - the array is the one field nothing else here can stand
  // in for.
  if (!Array.isArray(incoming.fieldReportArray)) {
    return null
  }

  const version = typeof incoming.schemaVersion === 'number' ? incoming.schemaVersion : 0

  // Newer than we understand - hand it back as-is rather than "migrating" it backwards.
  if (version > FIELD_REPORT_SCHEMA_VERSION) {
    return { ...incoming }
  }

  // v0 -> v1 is a pure stamp: there is no legacy report data in the field to transform, which
  // is precisely why this seam is cheap to add right now. Future steps go here.
  return { ...incoming, schemaVersion: FIELD_REPORT_SCHEMA_VERSION }
}
