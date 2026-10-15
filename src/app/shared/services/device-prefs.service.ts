import { Injectable } from "@angular/core"

import {
  COLUMN_TARGETS, ImportMappings, parseImportMappings, PLACE_TARGET_WORDS, rememberMapping,
} from "../../domain/roster-sheet"

// Keys unchanged from when the components wrote them directly, so nothing stored moves.
const LAST_COORDINATE_FORMAT_KEY = 'lastCoordinateFormat'
const RANGERS_PRIVACY_DISMISSED_KEY = 'rangertrak.rangers.privacyNoticeDismissed'
// E-187: remembered spreadsheet column mappings, keyed by header set. Header names only, never cell values.
const IMPORT_MAPPINGS_KEY = 'rt-import-mappings'

/**
 * Small per-device UI preferences that used to be read and written by components straight
 * from localStorage (ADR D-57: components go through a service, never storage). Each is a
 * convenience only: if storage throws (private browsing, full quota) a read gives the default
 * and a write is dropped, which is the safe direction to fail in.
 */
@Injectable({ providedIn: 'root' })
export class DevicePrefsService {

  /**
   * E-114 §1a: the coordinate format this device last actually used on Entry. It outranks the
   * mission's own preferred format (see LocationComponent's constructor). Unvalidated: the
   * caller checks it against the formats it knows.
   */
  getLastCoordinateFormat(): string | null {
    return this.read(LAST_COORDINATE_FORMAT_KEY)
  }

  setLastCoordinateFormat(system: string): void {
    this.write(LAST_COORDINATE_FORMAT_KEY, system)
  }

  /** The Rangers page's "Confidential" bar (the roster holds personal data), once dismissed. */
  isRangersPrivacyNoticeDismissed(): boolean {
    return this.read(RANGERS_PRIVACY_DISMISSED_KEY) === 'true'
  }

  /** False when storage refused the write: the bar still goes, but comes back next visit. */
  dismissRangersPrivacyNotice(): boolean {
    return this.write(RANGERS_PRIVACY_DISMISSED_KEY, 'true')
  }

  /** E-187: the column mappings remembered for roster and places spreadsheets. Bad or missing data reads as none. */
  getImportMappings(): ImportMappings {
    // Roster and places sheets share this one key (places under a `places:` prefix), so both
    // kinds of target must survive a read-modify-write.
    return parseImportMappings(this.read(IMPORT_MAPPINGS_KEY), [...COLUMN_TARGETS, ...PLACE_TARGET_WORDS])
  }

  /** Remembers the mapping used for this header set (at most 20 are kept, oldest dropped). */
  rememberImportMapping(headerKey: string, targets: readonly string[]): boolean {
    const next = rememberMapping(this.getImportMappings(), headerKey, targets)
    return this.write(IMPORT_MAPPINGS_KEY, JSON.stringify(next))
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  private write(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value)
      return true
    } catch {
      // See the class comment: a lost preference just comes back next visit.
      return false
    }
  }
}
