import { FieldReportStatusType } from './field-report.interface'
import { SettingsType } from './settings.interface'
import { StatusKey } from './status-color'

/**
 * Versioned, forward-only migration for the persisted settings object.
 *
 * Settings are stored in localStorage and also travel inside a mission export, so an object
 * written by an older build can arrive at any time - on load, or through Import Mission
 * months later. Before Sprint E there was no mechanism for this at all: `settings.version`
 * was stamped from package.json on every load and never compared, so a stale object was
 * simply used as-is.
 *
 * Everything here is PURE - no injection, no logging, no storage - so it is unit-testable
 * without a browser and safe to call from both entry points (see settings.service.ts's load
 * path and backup.service.ts's importMission).
 */

/**
 * Bump when a migration step is added below, and add the matching `if (version < N)` block.
 * Mirrors MISSION_EXPORT_SCHEMA_VERSION in backup.service.ts rather than inventing a second
 * convention.
 *
 * 1 - status colours become semantic keys rather than raw CSS colour strings.
 * 2 - backfill any field SettingsType declares that the stored object lacks (BUG-3).
 * 3 - rename the legacy `google` settings block to `maplibre` (E-70).
 * 4 - drop `w3wLocale` and `defPlusCode`, both dead controls removed from SettingsType
 *     during the E-84 audit's cleanup (E-89/E-90).
 */
export const SETTINGS_SCHEMA_VERSION = 4

/**
 * The status colours as shipped before v1, paired with the semantic key each becomes.
 *
 * Matched on BOTH status name and colour, deliberately. Matching on colour alone would
 * rewrite a status the user had recoloured to some other status's old default; matching on
 * name alone would discard a custom colour the user chose on purpose. A stored colour is
 * only replaced where it is still the untouched factory default for that status - anything
 * else is the user's decision and is left exactly as it is.
 */
const V0_STATUS_DEFAULTS: ReadonlyArray<{ status: string; color: string; key: StatusKey }> = [
  { status: 'Normal', color: 'lightyellow', key: 'normal' },
  { status: 'Location Report', color: 'aquamarine', key: 'location-report' },
  { status: 'Evidence Report', color: 'darkgoldenrod', key: 'evidence-report' },
  { status: 'Need Rest/Food', color: 'chartreuse', key: 'need-rest-food' },
  { status: 'Incident Check-in', color: 'silver', key: 'incident-check-in' },
  { status: 'Incident Check-out', color: 'dimgray', key: 'incident-check-out' },
  { status: 'Urgent', color: 'crimson', key: 'urgent' },
]

/** The v1 (current) factory defaults, for initSettings() - accessible from a fresh install. */
export const DEFAULT_FIELD_REPORT_STATUSES: ReadonlyArray<FieldReportStatusType> = [
  { status: 'Normal', color: 'normal', icon: 'check_FILL0_wght400_GRAD0_opsz48.png' },
  { status: 'Location Report', color: 'location-report', icon: 'where_to_vote_FILL0_wght400_GRAD0_opsz48.png' },
  { status: 'Evidence Report', color: 'evidence-report', icon: 'add_photo_alternate_FILL0_wght400_GRAD0_opsz48.png' },
  { status: 'Need Rest/Food', color: 'need-rest-food', icon: 'mood_bad_FILL0_wght400_GRAD0_opsz48.png' },
  { status: 'Incident Check-in', color: 'incident-check-in', icon: 'person_add_FILL0_wght400_GRAD0_opsz48.png' },
  { status: 'Incident Check-out', color: 'incident-check-out', icon: 'person_remove_FILL0_wght400_GRAD0_opsz48.png' },
  { status: 'Urgent', color: 'urgent', icon: 'crisis_alert_FILL0_wght400_GRAD0_opsz48.png' },
]

/**
 * E-103 starter list, for initSettings() - the maintainer's own suggested routine ICS
 * positions, editable per-mission via Settings > Field Report Recipients. Additive-only field
 * (see SettingsType.recipientOptions213's own comment) - backfillMissingFields hands this to
 * any returning user whose stored settings predate the field, same as DEFAULT_FIELD_REPORT_STATUSES.
 */
export const DEFAULT_RECIPIENT_OPTIONS_213: ReadonlyArray<string> = [
  'Incident Commander', 'Ops Section', 'Planning Section', 'Situation Awareness',
  'Logistics Section', 'Finance/Admin Section', 'EOC', 'Sheriff/Police', 'Air unit', 'Utilities',
]

/**
 * Brings a persisted settings object up to SETTINGS_SCHEMA_VERSION.
 *
 * Pure: returns a new object and never mutates its argument. Unknown or missing
 * `schemaVersion` is treated as 0 (pre-Sprint-E) and migrated forward. A version NEWER than
 * this build understands is left alone rather than mangled - that is a user who has opened an
 * older build against newer data, and silently "downgrading" their settings would lose
 * information.
 */
export function migrateSettings(raw: SettingsType, defaults?: SettingsType): SettingsType {
  const incoming = (raw ?? {}) as SettingsType & { schemaVersion?: unknown }
  const version = typeof incoming.schemaVersion === 'number' ? incoming.schemaVersion : 0

  let settings: SettingsType = { ...incoming }

  if (version < SETTINGS_SCHEMA_VERSION) {
    if (version < 1) {
      settings = { ...settings, fieldReportStatuses: toSemanticStatusColors(settings.fieldReportStatuses) }
    }
    if (version < 3) {
      settings = renameGoogleToMaplibre(settings)
    }
    if (version < 4) {
      settings = dropDeadLocationFields(settings)
    }
    settings = { ...settings, schemaVersion: SETTINGS_SCHEMA_VERSION }
  }

  // Recurrence of BUG-3 (2026-08-20): Sprint H added six new SettingsType fields
  // (showDD/showDDM/showDMS/showMGRS/showUTM/showMaidenhead) without bumping
  // SETTINGS_SCHEMA_VERSION, so this ran once for every user already at version 2 and never
  // again - `this.field() is not a function`, firing on every change-detection pass (once a
  // second, from the live clock in Header), for every returning user who had settings before
  // Sprint H shipped. Confirmed live on 0.16.7 from a real user's exported log: schemaVersion
  // was 2, and none of the six fields were present.
  //
  // Fixed at the root rather than by bumping to a version 3 that only defers the next
  // occurrence: backfillMissingFields is deliberately unconditional now, run on EVERY load
  // regardless of the version comparison above, not gated behind `version < N`. It was
  // already documented as safe to call repeatedly (pure, additive-only, never overwrites a
  // real value) - the version gate around it was the bug, not the function itself.
  return backfillMissingFields(settings, defaults)
}

/**
 * v1 -> v2. Adds any top-level key `SettingsType` has that this stored object does not.
 *
 * Why this exists (BUG-3, 2026-08-19): settings saved before `googleGeocodingApiKey` was
 * introduced simply have no such property. `settings-maps-section` binds
 * `[formField]="form.googleGeocodingApiKey"`, and Signal Forms cannot build a field for a
 * property absent from the model - it threw `this.field(...) is not a function` on every
 * change-detection pass, making the whole Settings page unusable for returning users while a
 * fresh install was perfectly fine.
 *
 * Deliberately GENERAL rather than special-casing that one key: every setting added from now
 * on has exactly the same failure mode, and a targeted patch would only postpone the next
 * occurrence. Nested objects (`google`, `leaflet`) are filled one level deep for the same
 * reason.
 *
 * Only ever ADDS. An existing value - including a falsy one like `false` or `''` - is the
 * user's and is never overwritten.
 */
function backfillMissingFields(settings: SettingsType, defaults?: SettingsType): SettingsType {
  if (!defaults) return settings

  const out = { ...settings } as Record<string, unknown>
  const src = defaults as unknown as Record<string, unknown>

  for (const key of Object.keys(src)) {
    if (!(key in out) || out[key] === undefined || out[key] === null) {
      out[key] = src[key]
      continue
    }
    // One level of nesting covers `google` and `leaflet`, whose sub-keys can go missing the
    // same way the top-level ones do.
    const defaultValue = src[key]
    const currentValue = out[key]
    if (isPlainObject(defaultValue) && isPlainObject(currentValue)) {
      out[key] = { ...defaultValue, ...currentValue }
    }
  }

  return out as unknown as SettingsType
}

/**
 * v2 -> v3 (E-70): `google` was a legacy name for the MapLibre + PMTiles map's zoom/overview
 * settings, left over from the old Google Maps display this block predates (GmapComponent is
 * long gone). Renames the key in place, preserving every sub-value untouched. A stored object
 * with no `google` key at all - either written after this migration already shipped, or
 * pre-dating the block entirely - is left alone; backfillMissingFields (below) supplies a
 * fresh `maplibre` default the same way it would for any other missing field.
 */
function renameGoogleToMaplibre(settings: SettingsType): SettingsType {
  const raw = settings as unknown as Record<string, unknown>
  if (!('google' in raw)) return settings
  const { google, ...rest } = raw
  return { ...rest, maplibre: google } as unknown as SettingsType
}

/**
 * v3 -> v4 (E-89/E-90): `w3wLocale` and `defPlusCode` were both settings for controls
 * verified dead during the E-84 documentation audit - `w3wLocale` was read by nothing at
 * all, and `defPlusCode`'s only consumer was `shared/mapping/plus-code.ts`, itself imported
 * by nothing (deleted the same day). Both are removed from `SettingsType`; this drops them
 * from a returning user's stored object too, rather than leaving them as inert orphaned
 * keys forever. A stored object with neither key - either written after this migration
 * already shipped, or pre-dating both fields entirely - is left alone.
 */
function dropDeadLocationFields(settings: SettingsType): SettingsType {
  const raw = settings as unknown as Record<string, unknown>
  const { w3wLocale, defPlusCode, ...rest } = raw
  return rest as unknown as SettingsType
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
}

/**
 * v0 -> v1. Array ORDER is preserved exactly: `defFieldReportStatus` is an index into this
 * array, and sample-data.service.ts documents the same index-dependence, so reordering here
 * would silently repoint the default status and every generated sample report.
 */
function toSemanticStatusColors(
  statuses: readonly FieldReportStatusType[] | undefined
): FieldReportStatusType[] {
  if (!Array.isArray(statuses)) return [...DEFAULT_FIELD_REPORT_STATUSES]

  return statuses.map(entry => {
    const match = V0_STATUS_DEFAULTS.find(
      d => d.status === entry?.status && String(entry?.color ?? '').trim().toLowerCase() === d.color
    )
    return match ? { ...entry, color: match.key } : { ...entry }
  })
}
