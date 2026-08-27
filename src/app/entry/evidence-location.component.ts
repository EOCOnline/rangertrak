import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, effect, input, signal
} from '@angular/core'
import { form, FormField, max, min } from '@angular/forms/signals'

import { MATERIAL_IMPORTS } from '../material-imports'
import { bearingAndDistance, destinationPoint } from '../shared/mapping/coordinate'
import { LocationType, undefinedAddressFlag } from '../shared/services'

/**
 * Architecture decision, 2026-08-26 (raised live, resolving the "second coordinate" question
 * left open in the Five Open Questions discussion doc, topic 1/6): a clue/evidence location
 * is a SEPARATE small component, not a second instance of LocationComponent. Range-and-
 * bearing from the reporter's own position, not a second absolute coordinate - this is how a
 * clue is actually called in over radio ("I'm at grid B4, found a boot about 200m north of
 * here"), not by reading a second GPS fix standing at the clue itself. LocationComponent's
 * multi-format (DD/DDM/DMS/MGRS/UTM/address) editor is built for "where am I right now,"
 * which is a materially different interaction - reusing it here would mean asking a scribe to
 * either already know the clue's own absolute coordinates (rare) or awkwardly repurpose an
 * "enter your position" widget for "enter someone else's." A full absolute-coordinate
 * fallback (for the rarer case where a second GPS fix genuinely exists) is a reasonable
 * fast-follow, not built here - this phase is range-and-bearing only.
 */
@Component({
  selector: 'rangertrak-evidence-location',
  standalone: true,
  imports: [CommonModule, FormField, ...MATERIAL_IMPORTS],
  templateUrl: './evidence-location.component.html',
  styleUrls: ['./evidence-location.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class EvidenceLocationComponent implements OnChanges {
  // A signal input, not a classic @Input(): computedLocation (below) reads this inside a
  // computed(), and only a signal read is tracked as a reactive dependency there - a plain
  // @Input() field would have made computedLocation silently stale whenever the reporter's
  // OWN position changed after a range/bearing was already entered (caught before this
  // shipped, not after - the first draft used a classic @Input() here).
  origin = input<LocationType | null>(null)

  @Input() tabIndexStart?: number
  @Output() locationChange = new EventEmitter<LocationType | null>()

  // Same reset idiom LocationComponent's own derived-block already uses: the parent bumps
  // this on submit/reset (entry.component.ts's resetAll()), so a distance/bearing left over
  // from the last report doesn't silently carry forward onto the next one's map marker.
  @Input() formGeneration = 0

  // E-105 (2026-08-27): the mini-map's Alt+click handler (entry.component.ts's
  // onEvidenceMapClick) sets this to a fresh object each click - ngOnChanges fires on
  // reference change, not a diff, which is exactly right here: clicking the same spot
  // twice in a row should still register as two clicks, not be silently ignored as "no
  // change." null on init/reset; the click handler never reads it back.
  @Input() clickedPosition: { lat: number, lng: number } | null = null

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formGeneration'] && !changes['formGeneration'].firstChange) {
      this.reset()
    }
    if (changes['clickedPosition'] && this.clickedPosition) {
      this.setFromAbsolute(this.clickedPosition.lat, this.clickedPosition.lng)
    }
  }

  private model = signal({ distance: null as number | null, unit: 'm' as 'm' | 'ft', bearing: null as number | null })
  form = form(this.model, (p) => {
    min(p.distance, 0)
    min(p.bearing, 0); max(p.bearing, 359)
  })

  /** Base tabindex offset, matching LocationComponent's own ti() idiom. */
  ti(offset: number): number | null {
    return this.tabIndexStart != null ? this.tabIndexStart + offset : null
  }

  /**
   * The computed absolute location, or null until distance AND bearing are both real
   * numbers and an origin exists - deliberately not emitting a half-entered guess.
   */
  readonly computedLocation = computed<LocationType | null>(() => {
    const { distance, unit, bearing } = this.model()
    const origin = this.origin()
    if (distance == null || bearing == null || !origin || origin.lat == null) {
      return null
    }
    const distanceMeters = unit === 'ft' ? distance * 0.3048 : distance
    const { lat, lng } = destinationPoint(origin.lat, origin.lng, distanceMeters, bearing)
    return { lat, lng, address: undefinedAddressFlag, derivedFromAddress: false }
  })

  // Single emission point for every reason computedLocation can change - a field edit
  // (model changes) or the reporter's own position moving (origin changes, e.g. a fresh
  // GPS fix or address lookup landing after a range/bearing was already entered) both flow
  // through the same computed signal, so both correctly notify the parent the same way,
  // rather than a manual .emit() call needing to be repeated at every call site that could
  // change either input.
  private readonly emitOnChange = effect(() => {
    this.locationChange.emit(this.computedLocation())
  })

  reset(): void {
    this.model.set({ distance: null, unit: 'm', bearing: null })
  }

  /**
   * E-105 (2026-08-27): fills distance/bearing from an absolute point instead of typed
   * numbers - the mini-map's Alt+click handler calls this with wherever the scribe clicked.
   * Silently does nothing without an origin (can't compute a bearing FROM nowhere) - the
   * map click handler itself is expected not to fire before a position exists, but this
   * stays defensive rather than trusting that at a distance. Always reports in meters
   * (matches destinationPoint()'s own units); a scribe who prefers feet can still switch
   * the unit afterward without losing the computed distance - the model stores meters
   * regardless of displayed unit today (see the 'ft' branch in computedLocation above),
   * so this is consistent with typing a distance in meters and picking meters as the unit.
   */
  setFromAbsolute(lat: number, lng: number): void {
    const origin = this.origin()
    if (!origin || origin.lat == null) return
    const { distanceMeters, bearingDegrees } = bearingAndDistance(origin.lat, origin.lng, lat, lng)
    this.model.set({ distance: Math.round(distanceMeters), unit: 'm', bearing: Math.round(bearingDegrees) })
  }
}
