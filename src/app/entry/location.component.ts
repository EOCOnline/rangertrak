import { Subscription } from 'rxjs'

import { CommonModule, DOCUMENT } from '@angular/common'
import {
  AfterViewInit, Component, EventEmitter, Inject, Input, linkedSignal, OnChanges, OnDestroy,
  OnInit, Output, signal, SimpleChanges, ChangeDetectionStrategy
} from '@angular/core'
import { form, FormField, max, min, pattern } from '@angular/forms/signals'

// https://floating-ui.com superceeds popper.js; https://lokesh-coder.github.io/toppy may be simpler!
//import { computePosition } from '@floating-ui/dom'

import { faInfoCircle, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'
import { mdiAccount, mdiInformationOutline } from '@mdi/js'

//import { MatIconRegistry } from '@angular/material/icon'

// Imported from their own files rather than the '../shared/' barrel on purpose: that
// barrel also re-exports the MapLibre style helpers, so pulling anything through it from
// the eagerly-loaded Entry page drags MapLibre (~800KB) into the initial bundle even
// though this page never shows a MapLibre map. Same reasoning as app.config.ts.
import {
  DDMToDD, DDToDDM, DDToDMS, DDToMaidenhead, DDToMGRS, DDToUTM, DMSToDD, isMaidenhead,
  MaidenheadToDD, MGRSToDD, UTMToDD
} from '../shared/mapping/coordinate'
import { GEOCODING_PROVIDER, GeocodingProvider } from '../shared/mapping/geocoding-provider.interface'
import { OpenLocationCode } from '../shared/mapping/open-location-code'

import {
  LocationType, LogService, SettingsService, SettingsType, undefinedAddressFlag, undefinedLocation
} from '../shared/services'

import { MATERIAL_IMPORTS } from '../material-imports'

//! import { What3Words} from '../shared/'
/*
https://stackoverflow.com/questions/43270564/dividing-a-form-into-multiple-components-with-validation
https://www.digitalocean.com/community/tutorials/how-to-build-nested-model-driven-forms-in-angular-2
https://stackblitz.com/edit/angular-azzmhu?file=src/app/hello.component.ts
*/

@Component({
  //moduleId: module.id,
  selector: 'rangertrak-location',
  standalone: true,
  imports: [CommonModule, FormField, ...MATERIAL_IMPORTS],
  templateUrl: './location.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./location.component.scss']
})
export class LocationComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  // Using mediation pattern (pg 188), this child component emits following event to parent,
  // parent's template has: (newLocationEvent)="onNewLocationParent($event)"
  // Parent's onNewLocationParent($event) gets called.
  // Parent then passes the new location (via binding), to any children (e.g., mini-maps) as needed
  @Input() location: LocationType = undefinedLocation
  @Output() locationChange = new EventEmitter<LocationType>()

  // E-48(1): bumped by the parent Entry form on submit/reset (see resetAll() there) so the
  // derived-output block below can be told "a fresh report started" independently of
  // whether the position itself also changed - a scribe entering several reports from the
  // same spot keeps the coordinates but shouldn't keep seeing the PREVIOUS report's derived
  // Address/+Codes/What3Words text as if it belonged to the new one.
  @Input() formGeneration = 0

  // E-48(1): starts false so the block stays hidden until a derivation has actually
  // completed for the current report - set true at the end of updateDerivedLocations()
  // below, reset to false in ngOnChanges whenever formGeneration bumps (submit/reset). This
  // is what stops a fresh report from briefly showing the PREVIOUS report's derived
  // Address/+Codes/What3Words text before its own position has resolved.
  showDerived = signal(false)

  // Base tabindex for this leaf's fields (DD/DDM/DMS lat+lng, MGRS, UTM, then address),
  // in the exact top-to-bottom/left-to-right DOM order the template renders them.
  // Unset (no tabindex attribute rendered) unless Entry's keyboard-first pass supplies
  // one - see ti() below and Entry's usage.
  //
  // Sprint H: each field still gets a fixed offset slot regardless of whether its
  // system is currently visible - hiding a system just leaves a gap, which is harmless
  // (tab order stays monotonic, per the roadmap's own reasoning) and far simpler than
  // recomputing offsets from the live-visible set on every settings change.
  // TAB_SLOT_COUNT is the total reservation the parent (Entry) needs to leave before
  // its own next tabbable field - see entry.component.ts.
  @Input() tabIndexStart?: number

  static readonly TAB_SLOT_COUNT = 26 // DD(4) + DDM(6) + DMS(8) + MGRS(3) + UTM(4) + address(1)

  /** Field position within this leaf, 0-25 in template order. See tabIndexStart above. */
  ti(offset: number): number | null {
    return this.tabIndexStart != null ? this.tabIndexStart + offset : null
  }

  /**
   * Entry-side, per-session override: shows every coordinate system regardless of the
   * settings.showXxx flags below. Not persisted - a scribe flips it on when they need
   * to see a format the mission hid, not a mission-wide setting change.
   */
  showAllSystems = signal(false)

  /**
   * True if `system` is visible AND at least one earlier-in-order system is also
   * visible - used to render the "or" separator DD/DDM/DMS already join each Lat/Lng
   * group with, without ever leaving a dangling one when something is hidden. Only
   * DD/DDM/DMS participate in this inline join - MGRS and UTM encode a whole position
   * rather than one axis, so they render as their own standalone rows below, with no
   * "or" to manage.
   */
  orBefore(system: 'DDM' | 'DMS'): boolean {
    if (!this.isVisible(system)) return false
    const order: ('DD' | 'DDM' | 'DMS')[] = ['DD', 'DDM', 'DMS']
    return order.slice(0, order.indexOf(system)).some(s => this.isVisible(s))
  }

  isVisible(system: 'DD' | 'DDM' | 'DMS' | 'MGRS' | 'UTM'): boolean {
    if (this.showAllSystems()) return true
    if (!this.settings) return true // before settings arrive, show everything
    switch (system) {
      case 'DD': return this.settings.showDD
      case 'DDM': return this.settings.showDDM
      case 'DMS': return this.settings.showDMS
      case 'MGRS': return this.settings.showMGRS
      case 'UTM': return this.settings.showUTM
    }
  }

  private id = "Location Component"

  // Single source of truth for the whole component - replaces the old locationFormModel
  // FormGroup. Every displayed representation (DD/DDM/DMS) below is a *pure* linkedSignal
  // derived from this. linkedSignal's "recompute fresh from source, but stay manually
  // writable until the source changes again" semantics are exactly what replaces the old
  // debounce/merge/switch dispatcher (mergeForm()) and its `{ emitEvent: false }` loop guard -
  // no manual loop-breaking is needed anywhere in this file anymore.
  private canonical = signal<{ lat: number; lng: number }>({ lat: 0, lng: 0 })

  // Coordinates as Decimal Degrees (DD)
  ddModel = linkedSignal(() => {
    const { lat, lng } = this.canonical()
    const latI = Math.trunc(lat)
    const lngI = Math.trunc(lng)
    return {
      latI,
      latF: Math.abs(Math.round((lat - latI) * 10000)),
      lngI,
      lngF: Math.abs(Math.round((lng - lngI) * 10000)),
    }
  })
  // Sprint E, step 5 (2026-08-19): min/max were static HTML attributes stripped to fix
  // NG8022 ([formField] cannot coexist with them - Signal Forms owns them from schema). This
  // schema restores them as real validators AND fixes two bugs found while restoring it:
  // latI's range was -180..180 (longitude's range, copy-pasted onto latitude) rather than
  // the correct -90..90.
  ddForm = form(this.ddModel, (p) => {
    min(p.latI, -90); max(p.latI, 90)
    min(p.latF, 0); max(p.latF, 99999)
    min(p.lngI, -180); max(p.lngI, 180)
    min(p.lngF, 0); max(p.lngF, 99999)
  })

  // Coordinates as Degrees & Decimal Minutes (DDM)
  ddmModel = linkedSignal(() => {
    const { lat, lng } = this.canonical()
    const latDDM = DDToDDM(lat)
    const lngDDM = DDToDDM(lng, true)
    // DDToDDM()'s `.min` property is scaled *100 - divide back down to real decimal minutes
    // for display/editing. DDMToDD() (used in onDdmChg() below) takes real minutes back, no
    // scaling. This exact scaling was already load-bearing in the pre-conversion code
    // (`latDdmM: latDDM.min / 100`) - easy to get backwards, preserved precisely here.
    return {
      latDdmQ: latDDM.dir, latDdmD: latDDM.deg, latDdmM: latDDM.min / 100,
      lngDdmQ: lngDDM.dir, lngDdmD: lngDDM.deg, lngDdmM: lngDDM.min / 100,
    }
  })
  // Same restoration, plus the same latitude-range-onto-longitude bug for the degrees
  // component (lngDdmD was capped at 90, not 180), AND a separate, longstanding one: the
  // direction-letter pattern (and the template's title=) were SWAPPED between lat and lng -
  // latDdmQ validated/labelled E-or-W, lngDdmQ validated/labelled N-or-S. DDMToDD()'s parser
  // only checks for a literal 'w' or 's' to negate, so it silently accepted whichever letter
  // arrived regardless of which field it came from - the math was never wrong, only the
  // on-screen hint telling the user which letters were valid where.
  ddmForm = form(this.ddmModel, (p) => {
    min(p.latDdmD, 0); max(p.latDdmD, 90)
    min(p.latDdmM, 0); max(p.latDdmM, 59)
    pattern(p.latDdmQ, /^[NnSs]$/)
    min(p.lngDdmD, 0); max(p.lngDdmD, 180)
    min(p.lngDdmM, 0); max(p.lngDdmM, 59)
    pattern(p.lngDdmQ, /^[EeWw]$/)
  })

  // Coordinates as Degrees, Minutes & Seconds (DMS)
  dmsModel = linkedSignal(() => {
    const { lat, lng } = this.canonical()
    const latDMS = DDToDMS(lat)
    const lngDMS = DDToDMS(lng, true)
    // Unlike DDM above, DDToDMS's min/sec need no scaling - direct pass-through.
    return {
      latQ: latDMS.dir, latD: latDMS.deg, latM: latDMS.min, latS: latDMS.sec,
      lngQ: lngDMS.dir, lngD: lngDMS.deg, lngM: lngDMS.min, lngS: lngDMS.sec,
    }
  })
  // Same two fixes as ddmForm above, applied to the DMS representation.
  dmsForm = form(this.dmsModel, (p) => {
    min(p.latD, 0); max(p.latD, 90)
    min(p.latM, 0); max(p.latM, 59)
    min(p.latS, 0); max(p.latS, 59.99)
    pattern(p.latQ, /^[NnSs]$/)
    min(p.lngD, 0); max(p.lngD, 180)
    min(p.lngM, 0); max(p.lngM, 59)
    min(p.lngS, 0); max(p.lngS, 59.99)
    pattern(p.lngQ, /^[EeWw]$/)
  })

  // Coordinates as MGRS (US military / FEMA grid standard), split into three fields -
  // Grid Reference (zone+band+100km-square), Easting, Northing - rather than one
  // opaque string, matching how MGRS is actually read aloud over radio and the same
  // "split by component" convention DD/DDM/DMS use above. Sprint H.
  mgrsModel = linkedSignal(() => {
    const { lat, lng } = this.canonical()
    return DDToMGRS(lat, lng)
  })
  mgrsForm = form(this.mgrsModel, (p) => {
    pattern(p.gridRef, /^[0-9]{1,2}[C-HJ-NP-Xc-hj-np-x][A-HJ-NP-Za-hj-np-z]{2}$/)
    min(p.easting, 0); max(p.easting, 99999)
    min(p.northing, 0); max(p.northing, 99999)
  })

  // Coordinates as UTM - Zone/Hemisphere/Easting/Northing. Hemisphere is a plain N/S
  // letter (same pattern idiom as the DDM/DMS lat-direction fields), not the `utm`
  // package's own latitude-band letter, which would need a second letter system users
  // don't otherwise touch. Sprint H.
  utmModel = linkedSignal(() => {
    const { lat, lng } = this.canonical()
    return DDToUTM(lat, lng)
  })
  utmForm = form(this.utmModel, (p) => {
    min(p.zone, 1); max(p.zone, 60)
    pattern(p.hemisphere, /^[NnSs]$/)
    min(p.easting, 0); max(p.easting, 999999)
    min(p.northing, 0); max(p.northing, 10000000)
  })

  addressModel = signal('')
  addressForm = form(this.addressModel)

  /**
   * One summary error line per coordinate, rather than nine - three representations (DD/
   * DDM/DMS) times three-ish fields each would otherwise need nine separate messages
   * crammed into an already-dense row. `touched()` gates each check so nothing shows before
   * the user has actually reached that field.
   */
  latInvalid(): boolean {
    return (this.ddForm.latI().touched() && this.ddForm.latI().invalid())
      || (this.ddForm.latF().touched() && this.ddForm.latF().invalid())
      || (this.ddmForm.latDdmD().touched() && this.ddmForm.latDdmD().invalid())
      || (this.ddmForm.latDdmM().touched() && this.ddmForm.latDdmM().invalid())
      || (this.ddmForm.latDdmQ().touched() && this.ddmForm.latDdmQ().invalid())
      || (this.dmsForm.latD().touched() && this.dmsForm.latD().invalid())
      || (this.dmsForm.latM().touched() && this.dmsForm.latM().invalid())
      || (this.dmsForm.latS().touched() && this.dmsForm.latS().invalid())
      || (this.dmsForm.latQ().touched() && this.dmsForm.latQ().invalid())
  }

  lngInvalid(): boolean {
    return (this.ddForm.lngI().touched() && this.ddForm.lngI().invalid())
      || (this.ddForm.lngF().touched() && this.ddForm.lngF().invalid())
      || (this.ddmForm.lngDdmD().touched() && this.ddmForm.lngDdmD().invalid())
      || (this.ddmForm.lngDdmM().touched() && this.ddmForm.lngDdmM().invalid())
      || (this.ddmForm.lngDdmQ().touched() && this.ddmForm.lngDdmQ().invalid())
      || (this.dmsForm.lngD().touched() && this.dmsForm.lngD().invalid())
      || (this.dmsForm.lngM().touched() && this.dmsForm.lngM().invalid())
      || (this.dmsForm.lngS().touched() && this.dmsForm.lngS().invalid())
      || (this.dmsForm.lngQ().touched() && this.dmsForm.lngQ().invalid())
  }

  /** MGRS and UTM each encode one whole position (not separate lat/lng blocks like
   * DD/DDM/DMS above), so one combined check each is enough. */
  mgrsInvalid(): boolean {
    return (this.mgrsForm.gridRef().touched() && this.mgrsForm.gridRef().invalid())
      || (this.mgrsForm.easting().touched() && this.mgrsForm.easting().invalid())
      || (this.mgrsForm.northing().touched() && this.mgrsForm.northing().invalid())
  }

  utmInvalid(): boolean {
    return (this.utmForm.zone().touched() && this.utmForm.zone().invalid())
      || (this.utmForm.hemisphere().touched() && this.utmForm.hemisphere().invalid())
      || (this.utmForm.easting().touched() && this.utmForm.easting().invalid())
      || (this.utmForm.northing().touched() && this.utmForm.northing().invalid())
  }

  //!w3w = new What3Words()

  faInfoCircle = faInfoCircle
  faMapMarkedAlt = faMapMarkedAlt
  mdiAccount: string = mdiAccount
  mdiInformationOutline: string = mdiInformationOutline

  private settingsSubscription!: Subscription
  // Public (not private): the template reads settings.showXxx to decide which
  // coordinate systems to render (Sprint H).
  public settings!: SettingsType

  // Tracks our own most recent emission so ngOnChanges (the opportunistic re-centering fix,
  // see below) can tell "parent gave us a genuinely new location" apart from "parent just
  // echoed back the [(location)] value we ourselves emitted a moment ago" - without this guard
  // that echo would loop forever.
  private lastEmitted: { lat: number; lng: number } | null = null

  constructor(
    private settingsService: SettingsService,
    private log: LogService,
    @Inject(GEOCODING_PROVIDER) private geocodingProvider: GeocodingProvider,
    // private _toppy: Toppy,
    @Inject(DOCUMENT) private document: Document) {
    this.log.info("======== Constructor() ============", this.id)

    // https://angular.io/tutorial/toh-pt4#call-it-in-ngoninit states subscribes should happen in OnInit()
    // Settings only needed for Check PCode & What3Words...
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.log.verbose("Out of constructor", this.id)
  }

  // Initialize data or fetch external data from services or API (https://geeksarray.com/blog/angular-component-lifecycle)
  ngOnInit(): void {
    this.log.info("ngOnInit", this.id)

    // NOTE: gets called before ngOnInit, during parent's construction (via ngOnChanges too,
    // if the input already had a non-default value at that point)
    this.newLocationToFormAndEmit(this.location)
  }

  /**
    * Called once all HTML elements have been created
    */
  ngAfterViewInit() {
    // doing emit here causes: NG0100: Expression has changed after it was checked
    // this.newLocationToFormAndEmit(this.location)
  }

  /**
   * Opportunistic fix (Sprint D): the pre-conversion code never re-centered on later changes
   * to [location] after its initial value (flagged there as `!BUG: Doesn't center on initial
   * (previously received) location...`). Guarded via lastEmitted against re-processing our
   * own [(location)] echo, which would otherwise loop forever through the parent's two-way
   * binding.
   */
  ngOnChanges(changes: SimpleChanges): void {
    // E-48(1): a fresh report started, so the derived block clears - which is the
    // requirement as stated ("should clear once the report is submitted"), not merely a
    // side effect. It stays cleared until this report's own position resolves; it is NOT
    // re-derived from the outgoing position here.
    //
    // That distinction is deliberate and was got wrong once. The position deliberately
    // survives a reset (consecutive reports from one spot are normal - see resetAll() in
    // entry.component.ts), so re-deriving "for free" is tempting. But the whole complaint
    // was that this block showed text belonging to a report the scribe had already filed;
    // anything auto-refilled before the new report has a position of its own recreates
    // exactly that, just one step later. Empty is honest.
    if (changes['formGeneration'] && !changes['formGeneration'].firstChange) {
      this.showDerived.set(false)
      this.clearDerivedText()
    }

    if (!changes['location'] || changes['location'].firstChange) return

    const incoming = this.location
    if (this.lastEmitted && incoming.lat === this.lastEmitted.lat && incoming.lng === this.lastEmitted.lng) {
      return // our own emission, echoed back via the parent's [(location)] binding
    }
    const current = this.canonical()
    if (incoming.lat === current.lat && incoming.lng === current.lng) {
      return // no real change
    }
    this.newLocationToFormAndEmit(incoming)
  }

  /**
   * https://angular.io/guide/template-reference-variables
   */
  onDdChg() {
    const { latI, latF, lngI, lngF } = this.ddModel()
    this.log.verbose(`new DD values: ${latI}.${latF}°, ${lngI}.${lngF}°`, this.id)

    const enteredLocation = {
      lat: parseFloat(`${latI}.${latF}`),
      lng: parseFloat(`${lngI}.${lngF}`),
      address: undefinedAddressFlag,
      derivedFromAddress: false
    }
    this.newLocationToFormAndEmit(enteredLocation)
  }

  onDdmChg() {
    const { latDdmD, latDdmM, latDdmQ, lngDdmD, lngDdmM, lngDdmQ } = this.ddmModel()
    this.log.excessive(`DDM value changed:  ${latDdmD}° ${latDdmM}' ${latDdmQ}, ${lngDdmD}° ${lngDdmM}' ${lngDdmQ}`, this.id)

    const latLng = {
      lat: DDMToDD(<string>latDdmQ, latDdmD, latDdmM)!,
      lng: DDMToDD(<string>lngDdmQ, lngDdmD, lngDdmM)!
    }
    this.log.verbose(`DDM converted to DD: ${latLng.lat}° ${latLng.lng}°`, this.id)

    const enteredLocation = {
      lat: latLng.lat,
      lng: latLng.lng,
      address: undefinedAddressFlag,
      derivedFromAddress: false
    }

    this.newLocationToFormAndEmit(enteredLocation)
  }

  onDmsChg() {
    const { latD, latM, latS, latQ, lngD, lngM, lngS, lngQ } = this.dmsModel()
    this.log.verbose(`DMS value changed:  ${latD}° ${latM}' ${latS}" ${latQ}, ${lngD}° ${lngM}' ${lngS}" ${lngQ}`, this.id)

    const latLng = {
      lat: DMSToDD(latQ, latD, latM, latS)!,
      lng: DMSToDD(lngQ, lngD, lngM, lngS)!
    }
    this.log.verbose(`DMS converted to DD: ${latLng.lat}° ${latLng.lng}°`, this.id)

    const enteredLocation = {
      lat: latLng.lat,
      lng: latLng.lng,
      address: undefinedAddressFlag,
      derivedFromAddress: false
    }
    this.newLocationToFormAndEmit(enteredLocation)
  }

  onMgrsChg() {
    const { gridRef, easting, northing } = this.mgrsModel()
    this.log.verbose(`MGRS value changed: ${gridRef} ${easting} ${northing}`, this.id)

    const converted = MGRSToDD(gridRef, easting, northing)
    if (!converted) {
      this.log.warn(`onMgrsChg: MGRSToDD rejected "${gridRef}" ${easting} ${northing}`, this.id)
      return
    }
    this.log.verbose(`MGRS converted to DD: ${converted.lat}° ${converted.lng}°`, this.id)

    const enteredLocation = {
      lat: converted.lat,
      lng: converted.lng,
      address: undefinedAddressFlag,
      derivedFromAddress: false
    }
    this.newLocationToFormAndEmit(enteredLocation)
  }

  onUtmChg() {
    const { zone, hemisphere, easting, northing } = this.utmModel()
    this.log.verbose(`UTM value changed: ${zone}${hemisphere} ${easting} ${northing}`, this.id)

    const converted = UTMToDD(zone, hemisphere, easting, northing)
    if (!converted) {
      this.log.warn(`onUtmChg: UTMToDD rejected ${zone}${hemisphere} ${easting} ${northing}`, this.id)
      return
    }
    this.log.verbose(`UTM converted to DD: ${converted.lat}° ${converted.lng}°`, this.id)

    const enteredLocation = {
      lat: converted.lat,
      lng: converted.lng,
      address: undefinedAddressFlag,
      derivedFromAddress: false
    }
    this.newLocationToFormAndEmit(enteredLocation)
  }

  /**
   * Any user change to a coordinate representation (above), an address lookup (below), or the
   * parent handing us a new @Input() location (via ngOnChanges) funnels through here: update
   * the canonical lat/lng - which every DD/DDM/DMS linkedSignal above recomputes from
   * automatically - resolve/derive the address, and notify the parent.
   *
   * NOTE: gets called before ngOnInit, during parent's construction
   * !TODO: Validate values here or in calling routines?
   *
   * @param newLocation: LocationType
   */
  newLocationToFormAndEmit(newLocation: LocationType) {
    this.log.info(`newLocationToFormAndEmit() got a new Location: ${JSON.stringify(newLocation)}`, this.id);

    this.canonical.set({ lat: newLocation.lat, lng: newLocation.lng })
    this.lastEmitted = { lat: newLocation.lat, lng: newLocation.lng }

    let address = ''
    if (newLocation.derivedFromAddress) {
      address = newLocation.address
      this.updateDerivedLocations(newLocation)
    } else {
      // Async routine to geocode from lat/lng & update location.address
      // REVIEW: Do this early in HOPES that the async geocoding routine will have returned by time we emit a new location... (though mini-map really only needs lat/long)

      // DDToAddress (asynchroniously) calls updateDerivedLocations() too
      this.DDToAddress(newLocation)
    }
    // Set model value - which updates the display & is the only place the current address is kept.
    this.addressModel.set(address)

    // Emit new location event to parent: so it & any children can react
    this.log.warn(`newLocationToFormAndEmit() Emitting new Location ${JSON.stringify(newLocation)}`, this.id)
    this.locationChange.emit(newLocation)
  }

  /**
   * Update labels with derived locations
   * REVIEW: Should LocationType also store PCode/What3Words addresses?
   *
   * @param location
   */


  chkPCodes(pCode: string) {
    this.log.verbose(`User entered potential pCode: '${pCode}'. Verify it.`, this.id);
    if (pCode.length) {
      if (!this.settings) {
        this.log.error(`this.settings was null in chkPCodes`, this.id)
        return
      }

      if (OpenLocationCode.isValid(pCode)) {
        if (OpenLocationCode.isShort(pCode)) {
          pCode = OpenLocationCode.recoverNearest(pCode, this.settings.defLat, this.settings.defLng)
        }

        // Following needs a full (Global) code
        let coord = OpenLocationCode.decode(pCode)
        this.log.verbose("chkPCodes got " + pCode + "; returned: lat=" + coord.latitudeCenter + ', lng=' + coord.longitudeCenter, this.id);
        //let newLocation: LocationType =
        this.newLocationToFormAndEmit({ lat: coord.latitudeCenter, lng: coord.longitudeCenter, address: "", derivedFromAddress: false })
      }

      else {
        //    document.getElementById("addressLabel")!.innerHTML = " is <strong style='color: darkorange;'>Invalid </strong> Try: " + this.settings.defPlusCode
        //document.getElementById("pCodeGlobal")!.innerHTML = this.settings.defPlusCode
      }
    }
  }

  /**
   * Sprint H: Maidenhead grid locators typed into the shared address/Plus-Code/
   * What3Words field, detected the same way those two already are - checked by
   * onAddressChg() before the street-address fallback. No dedicated input field: a
   * 4-6 character token has no natural sub-component split the way DD/DDM/DMS do.
   */
  chkMaidenhead(locator: string) {
    this.log.verbose(`User entered potential Maidenhead locator: '${locator}'. Verify it.`, this.id)
    const converted = MaidenheadToDD(locator)
    if (!converted) {
      this.log.warn(`chkMaidenhead: MaidenheadToDD rejected "${locator}"`, this.id)
      return
    }
    this.newLocationToFormAndEmit({ lat: converted.lat, lng: converted.lng, address: "", derivedFromAddress: false })
  }

  updateDerivedLocations(location: LocationType) {
    this.log.verbose(`updateDerivedLocations()`, this.id)

    // DDToAddress already called - if needed...
    //if (location.derivedFromAddress == false) {
    // Updates location.address, but asyncronously
    //let result = this.DDToAddress(location)
    //this.log.verbose(`DDToAddress returned ${result} & ${JSON.stringify(location)}`, this.id)
    //}

    //! duplicate code in ChkPCode()!
    // Check for https://github.com/google/open-location-code (works offline!)
    let pCode = OpenLocationCode.encode(location.lat, location.lng, 11); // OpenLocationCode.encode using default accuracy returns an INVALID +Code!!!
    this.log.verbose(`updateCoords: Encode returned PlusCode: ${pCode}`, this.id)
    let fullCode
    if (pCode.length) {
      if (OpenLocationCode.isValid(pCode)) {
        if (OpenLocationCode.isShort(pCode)) {
          // Recover the full code from a short code:
          fullCode = OpenLocationCode.recoverNearest(pCode, this.settings.defLat, this.settings.defLng)
        } else {
          fullCode = pCode
          this.log.verbose(`Shorten +Codes, Global: ${fullCode}, Lat: ${this.settings.defLat}; lng: ${this.settings.defLng}`, this.id)
          // Attempt to trim the first characters from a code; may return same innerText...
          pCode = OpenLocationCode.shorten(fullCode, this.settings.defLat, this.settings.defLng)
        }
        this.log.verbose(`New PlusCodes: ${pCode} ; Global: ${fullCode}`, this.id)
        this.setDerivedText("pCodes", `+Code: ${pCode}  Global: ${fullCode}`)
      } else {
        this.log.verbose(`Invalid +PlusCode: ${pCode}`, this.id)
        this.setDerivedText("pCodes", "Unable to get +Code")
      }
    }

    this.setDerivedText("derivedAddress", location.address)

    // Sprint H: no dedicated Maidenhead input field, but the position is still shown
    // here as a derived readout - setDerivedText() already no-ops if the element isn't
    // rendered (showMaidenhead off, and showAllSystems off).
    this.setDerivedText("maidenhead", DDToMaidenhead(location.lat, location.lng))

    // E-48(1): now that every line above has real text, the block can actually be shown.
    // Deliberately after the setDerivedText() calls, not before - the elements themselves
    // stay permanently in the DOM (see the --hidden class on .enter__Where-Results in the
    // template) rather than an @if, specifically so this ordering can't race a render.
    this.showDerived.set(true)
  }

  /**
   * Writes one of the read-only "derived location" lines at the bottom of the template.
   *
   * Guarded because this runs from ASYNC callbacks (the geocoder's, via DDToAddress()) that
   * can land after this component's DOM is gone - navigate away from Entry with a geocode in
   * flight and the old unguarded `getElementById(...)!.innerText` threw
   * "Cannot set properties of null". It surfaced as an intermittent unit-test failure once
   * the suite grew long enough for a stray callback to outlive its fixture, but the
   * production path is the same one.
   *
   * These stay direct DOM writes rather than becoming bindings: they are display-only strings
   * with no model behind them, and converting them properly belongs with the wider
   * signals cleanup (roadmap Sprint G), not here.
   *
   * E-48(2): the targets are `readonly` inputs, not spans, as of Sprint I - `.value`, not
   * `.innerText`, is what actually shows.
   */
  /**
   * E-48(1): blanks every derived readout. Separate from hiding the block, because the
   * elements stay in the DOM either way (see the template's --hidden class) - leaving the
   * previous report's text sitting in a hidden element would mean it flashes back the
   * moment the block is shown again for the next report.
   */
  private clearDerivedText() {
    for (const id of ['derivedAddress', 'pCodes', 'maidenhead']) {
      this.setDerivedText(id, '')
    }
  }

  private setDerivedText(elementId: string, text: string) {
    const el = this.document.getElementById(elementId) as HTMLInputElement | null
    if (el) {
      el.value = text
    } else {
      this.log.verbose(`No #${elementId} element to update - view likely destroyed`, this.id)
    }
  }


  /**
   * NOTE: following sets DERIVED address
   * in an async manner (i.e., doesn't return an address)
   * Requires Internet access!
   *
   * !TODO: Should it ALSO emit an updated location?!
   *
   * @param location: locationType
   * @returns
   */
  DDToAddress(location: LocationType) {
    this.log.verbose(`DDToAddress() Looking up address: ${location.lat}, ${location.lng}`, this.id)
    // assert(!location.derivedFromAddress)
    if (location.derivedFromAddress) {
      this.log.error(`DDToAddress got a primary address NOT needing derivation!`, this.id)
    }

    // Only show address in model during location emition
    // This control ONLY shows main address if user entered it there
    // for this control/widget: differentiate between derived & 'primary' or user entered addresses
    this.addressModel.set("")

    this.geocodingProvider.reverseGeocode(location.lat, location.lng)
      .then((result) => {
        // Async: likely runs after subroutine returns
        if (!result.found) {
          this.log.warn(`DDToAddress: ${result.error}`, this.id)
          return
        }

        this.log.info(`DDToAddress(): Received a new geocoded address: ${result.address}`, this.id)

        location.address = result.address
        // Async update of DERIVED address fields...
        this.updateDerivedLocations(location)

        this.log.warn(`DDToAddress() Emitting new Location ${JSON.stringify(location)}`, this.id)
        this.locationChange.emit(location)
      })
    return ("No immediate address available: await the result!")
  }

  onAddressChg() { //newAddress: string = "undefined address"
    const newAddress = this.addressModel()
    this.log.verbose(`onAddressChg got newAddress: ${JSON.stringify(newAddress)}`, this.id)

    if (!newAddress || !newAddress.length) {
      this.log.error(`onAddressChggot null or undefined address`, this.id)
      return
    }

    // Now see what kind/format of address we have and get DD
    if (newAddress.includes("+")) {
      this.log.verbose("Got PCode: " + newAddress, this.id)
      this.chkPCodes(newAddress)
    } else {
      let tWords = newAddress.split(".")
      if (tWords.length == 3) {
        this.log.verbose("Got What 3 Words: " + newAddress, this.id)
        this.chk3Words(newAddress)
      } else if (isMaidenhead(newAddress)) {
        this.log.verbose("Got Maidenhead grid locator: " + newAddress, this.id)
        this.chkMaidenhead(newAddress)
      } else {
        this.chkStreetAddress(newAddress)
      }
    }
  }

  //----------------------------------------------------------------------------------------
  // Address stuff

  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address
  // https://developer.what3words.com/tutorial/javascript
  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address
  chk3Words(tWords: string) {
    this.log.verbose("chk3Words", this.id)
    // A commented-out jQuery $.ajax call to the w3w autosuggest endpoint used to sit
    // here, carrying an API key. It was verbatim from what3words' own tutorial (London
    // coordinates, clip-to-country=BE,GB), so the key was theirs rather than ours - but a
    // key-shaped string in tracked source is a finding whoever reads the repo, and the
    // snippet was dead anyway (jQuery is not a dependency). Removed; see
    // PRIVATE-Roadmap.md Section 9d item 1b. The real integration lives in
    // shared/mapping/3words.ts and takes its key from settings.

    // No 3 word results outside these values allowed!!
    // south_lat <= north_lat & west_lng <= east_lng
    let south_lat = 46.0;
    let north_lat = 49.0;
    let west_lng = -124.0;
    let east_lng = -120.0;
    let errMsg = "";

    // let tWords = document.getElementById("addresses")!.innerText;// as HTMLInputElement).value
    this.log.verbose('chk3Words - ' + tWords, this.id);
    if (tWords.length) {
      // soemthing entered...
      this.log.verbose("3Words='" + tWords + "'", this.id);
      //this.w3w.w3wAuto(tWords)
      /* BUG:
          this.w3w.w3wAuto.autosuggest(tWords, {
            nFocusResults: 1,
            //clipTo####: ["US"],
            cliptoboundingbox: { south_lat, west_lng, north_lat, east_lng }, // Clip prevents ANY values outside region
            focus: { lat: this.settings.defLat, lng: this.settings.deflng }, // Focus prioritizes words closer to this point
            nResults: 1
          })
            .then((response: { suggestions: { words: any }[] }) => {
              const verifiedWords = response.suggestions[0].words;
              this.log.verbose("Verified Words='" + verifiedWords + "'", this.id);
              if (tWords != verifiedWords) {
                document.getElementById("addressLabel")!.textContent = " Verified as: " + verifiedWords; // as HTMLLabelElement
              } else {
                document.getElementById("addressLabel")!.textContent = " Verified.";
              }
              // this.w3w.GetLatlngFrom3Words(verifiedWords)
              this.w3w.convertToCoordinates(verifiedWords).then((response: { coordinates: { lat: any; lng: any }; nearestPlace: string }) => {
                //async call HAS returned!
                this.updateCoords(response.coordinates.lat, response.coordinates.lng);
                // NOTE: Not saving nearest place: too vague to be of value
                document.getElementById("addressLabel")!.textContent += "; Near: " + response.nearestPlace; // as HTMLLabelElement
              });
            })
            .catch(function (error: { code: string; message: string }) {
              errMsg = "[code]=" + error.code + "; [message]=" + error.message + ".";
              */

      // TODO:       this.updateCoords(lat,lng)
      errMsg = ""
      this.log.info("Unable to verify 3 words entered: " + errMsg, this.id);
      document.getElementById("addressLabel")!.textContent = "*** Not able to verify 3 words! ***"; // as HTMLLabelElement
      //})
    }
    // async call not returned yet
  }

  chkStreetAddress(addrText: string) {
    this.log.verbose("Got street address to check: " + addrText, this.id)

    this.geocodingProvider.geocodeAddress(addrText).then((result) => {
      if (!result.found) {
        this.log.warn(`chkStreetAddress: ${result.error}`, this.id)
        return
      }

      let enteredLocation: LocationType = {
        lat: result.lat,
        lng: result.lng,
        address: addrText,
        derivedFromAddress: true
      }

      this.newLocationToFormAndEmit(enteredLocation)
    })
  }

  ngOnDestroy() {
    this.settingsSubscription?.unsubscribe()
  }
}
