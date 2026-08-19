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
 */
export const SETTINGS_SCHEMA_VERSION = 1

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
 * Brings a persisted settings object up to SETTINGS_SCHEMA_VERSION.
 *
 * Pure: returns a new object and never mutates its argument. Unknown or missing
 * `schemaVersion` is treated as 0 (pre-Sprint-E) and migrated forward. A version NEWER than
 * this build understands is left alone rather than mangled - that is a user who has opened an
 * older build against newer data, and silently "downgrading" their settings would lose
 * information.
 */
export function migrateSettings(raw: SettingsType): SettingsType {
  const incoming = (raw ?? {}) as SettingsType & { schemaVersion?: unknown }
  const version = typeof incoming.schemaVersion === 'number' ? incoming.schemaVersion : 0

  if (version >= SETTINGS_SCHEMA_VERSION) {
    // Already current (or newer - see above). Still stamp a numeric version so a missing or
    // malformed one does not keep re-triggering this path on every load.
    return { ...incoming, schemaVersion: version }
  }

  let settings: SettingsType = { ...incoming }

  if (version < 1) {
    settings = { ...settings, fieldReportStatuses: toSemanticStatusColors(settings.fieldReportStatuses) }
  }

  return { ...settings, schemaVersion: SETTINGS_SCHEMA_VERSION }
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
