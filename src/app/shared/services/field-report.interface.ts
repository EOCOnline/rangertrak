import { LocationType } from './location.interface'

// E-41 phase 1 (2026-08-26): was a dead, commented-out field (`// source: FieldReportSource`
// below) until the maintainer confirmed it directly - "Yes, we should include a field
// acknowledging source type." Every entry gathers this now, not just ones flagged for a 213.
//
// A string-literal union, not a numeric TS `enum` (this file's original commented-out sketch
// used one) - same idiom as this project's own StatusKey (status-color.ts), and a deliberate
// choice, not just a style preference: Signal Forms' native `[formField]` binding for a
// radio input compares the model value against `element.value` with `===`
// (`node_modules/@angular/forms/fesm2022/signals.mjs`'s `setNativeControlValue`), and every
// DOM attribute value is a string - a numeric model value could never strictly-equal a radio
// element's own string `value`, so the control would silently never show as checked. Confirmed
// by reading that file before choosing this, not guessed.
export const FIELD_REPORT_SOURCES = ['Voice', 'Packet', 'APRS', 'Email'] as const
export type FieldReportSource = typeof FIELD_REPORT_SOURCES[number]

/**
 * A plain, serializable bounding box.
 *
 * Deliberately NOT a Leaflet `LatLngBounds`: FieldReportsType is round-tripped
 * through localStorage as JSON, and a class instance comes back as a bare object
 * with no methods, so every `.getEast()` on a reloaded value threw. Map engines
 * (Leaflet, MapLibre) each take their own bounds shape - convert at the point of
 * use, not in the stored model.
 */
export type BoundsType = {
  north: number,
  south: number,
  east: number,
  west: number
}

/**
 * A packet of all (or selected/filtered) field data for the op period except Rangers or Settings
 */
export type FieldReportsType = {
  version: string,
  date: Date,
  event: string,
  bounds: BoundsType,
  numReport: number,
  maxId: number,
  filter: string, // All reports or not? Guard to ensure a subset never gets writen to localstorage?
  fieldReportArray: FieldReportType[]
}

/**
 * Data to store for each field report
 *
 * E-41 phase 1 (2026-08-26): five fields added for ICS-309/213 support - data collection
 * only, per the maintainer's own explicit scoping ("does not want export/reporting logic
 * built yet, only the fields and the model to hold them"). `source` is gathered on every
 * report, always. The four `*213` fields are opt-in per entry (`generates213` gates the
 * other three) - "the 213 stays opt-in per entry... the scribe should be able to click a
 * 'Yes, generate an ICS-213' [button/flag] from this message." All optional rather than a
 * schema-version bump: existing stored reports simply lack them (`undefined`), which is a
 * safe, already-correct answer for a plain `JSON.parse()` (field-report.service.ts has no
 * migration path today, unlike SettingsType) - nothing reads these fields yet, so there is
 * nothing for their absence to break. `message213`/`replyRequested213`/`recipients213` are
 * a best-effort answer to "whatever the 213's initial version requires" - the roadmap's own
 * notes say this was "not confirmed against the actual ICS-213 form fields yet," carried
 * forward here rather than resolved, since this session didn't verify the real form either.
 */
export type FieldReportType = {
  id: number,
  callsign: string,
  //team: string,
  location: LocationType,
  date: Date,
  status: string,
  notes: string,
  source?: FieldReportSource,
  generates213?: boolean,
  replyRequested213?: boolean,
  message213?: string,
  recipients213?: string,
  // Architecture decision, 2026-08-26: resolves the "second coordinate" question the Five
  // Open Questions discussion doc left open (topic 1/6) - where a clue/evidence item
  // actually IS, distinct from the reporting ranger's own position (`location` above).
  // Entered as range-and-bearing from the reporter (evidence-location.component.ts),
  // stored as the resulting absolute LocationType so the rest of the app (the map marker,
  // any future export) never needs to know how it was entered. Optional, same reasoning
  // as the E-41 fields above: no schema-version bump, a returning user's older reports
  // simply lack it.
  evidenceLocation?: LocationType | null,
}

/**
 * Field Reports can be tagged with a status. These can have color & associated icons & can be edited by the user.
 * ? FUTURE: Consider replacing "Color" with "CSS_Style" to allow more options?
 */
export type FieldReportStatusType = {
  status: string,
  color: string,
  icon: string
}
