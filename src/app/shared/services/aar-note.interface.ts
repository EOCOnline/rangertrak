/**
 * E-116: an After Action note - something noticed during or after a mission, to fix or improve
 * later. Mission data, stored per device (RecordStore key `aarNotes`, encrypted with the roster
 * when device encryption is on: a note can name people and places).
 *
 * Captured with one field (`text`) from the header's "AAR note" button on any page; the review
 * fields (`area`, `recommendation`, `owner`) are filled in on the After Action page at the
 * hotwash. All free text - capability, not policy (D-46): no fixed list of areas.
 */
export interface AarNoteType {
  uid: string
  /** ISO timestamp, set at capture. */
  createdAt: string
  text: string
  /** The page it was noted on (Entry, Map, ...), recorded automatically as context. */
  page: string
  /** `incident`: about the operation itself (HSEEP AAR/IP material). `app`: about RangerTrak. */
  about: AarNoteAbout
  area?: string
  recommendation?: string
  owner?: string
  /**
   * E-04 / D-63: `aar` (default) is a note for the debrief; `activity` is a line for the ICS-214
   * activity log. A 214 line is a time and a line of text: it keeps `about: 'incident'`
   * internally and never carries area/recommendation/owner. Schema 1 data has no kind and reads
   * as `aar`.
   */
  kind: AarNoteKind
  /**
   * E-04 / D-63: the line's own time (ISO) when the scribe edited it - they log late. `createdAt`
   * stays the capture time; the time to show and sort by is `noteTime()` (`at ?? createdAt`),
   * the same split as `loggedAt` on radio entries. Set only when it differs from capture.
   */
  at?: string
}

export type AarNoteKind = 'aar' | 'activity'

export type AarNoteAbout = 'incident' | 'app'

export const AAR_NOTE_ABOUT_LABELS: Record<AarNoteAbout, string> = {
  incident: 'This incident',
  app: 'RangerTrak',
}
