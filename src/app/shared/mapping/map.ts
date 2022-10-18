/**
 * Abstract class serving as a repository for common/reused map functions
 */
import L from 'leaflet'
import { fromEvent, Observable, Subscription } from 'rxjs'
//import { catchError, mergeMap, toArray } from 'rxjs/operators'

import { DOCUMENT, JsonPipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import {
  AfterViewInit, Component, ElementRef, Inject, isDevMode, NgZone, OnDestroy, OnInit, ViewChild
} from '@angular/core'
import { MDCSwitch } from '@material/switch'

import {
  FieldReportService, FieldReportStatusType, FieldReportsType, FieldReportType, LocationType,
  LogService, SettingsService, SettingsType
} from '../services'

import { Utility } from '..'
import { LayerType, MapType, Map } from './map.interface'


/**
 * per https://ozak.medium.com/stop-repeating-yourself-in-angular-how-to-create-abstract-components-9726d43c99ab,
 * do NOT use "abstract"!
 *
 * Needs template: https://stackoverflow.com/questions/62222979/angular-9-decorators-on-abstract-base-class
 *
 * https://www.tutorialsteacher.com/typescript/abstract-class
 * https://www.cloudhadoop.com/angular-model-class-interface/
 * https://angular.io/guide/migration-undecorated-classes
 */


/**
 * AbstractMap conceived to handle:
 * - Large (fullpage) Leaflet or Google maps, likely with location markers w/ tooltips
 * - small overview Leaflet or Google maps, at a much larger scale to help locate where one is
 * - mid-sized Current Location map displaying user provided coordinates, as a verification for them
 *
 * Parameters that specify map:
 * - Leaflet or Google
 * - Overview Map : boolean
 * - Display fieldReports : boolean
 * - Various Settings: Def_Lat/Lng/Zoom/etc.
 */
@Component({ template: '' })
export abstract class AbstractMap implements OnInit, OnDestroy {

  protected id = 'Abstract Map Component'
  public title = 'Abstract Map'
  public pageDescr = 'Abstract Map'

  protected settingsSubscription!: Subscription
  protected settings!: SettingsType

  protected map!: Map
  public location!: LocationType
  public center = { lat: 0, lng: 0 }
  public mouseLatLng = this.center // google.maps.LatLngLiteral |
  public zoom = 10 // actual zoom level of main map
  public zoomDisplay = 10 // what's displayed below main map

  protected displayReports = false // Guard for the following
  protected fieldReportsSubscription!: Subscription
  protected fieldReports: FieldReportsType | undefined
  protected fieldReportArray: FieldReportType[] = []  // just the individual reports array portion of fieldReports
  // The displayedFieldReportArray can either be all (fieldReports) or selectedReports!
  protected displayedFieldReportArray: FieldReportType[] = []
  // protected markers: clusters?

  protected hasSelectedReports = false // Guard for the following
  protected selectedReports: FieldReportsType | undefined = undefined
  protected filterSwitch: MDCSwitch | undefined = undefined
  protected filterButton: HTMLButtonElement | undefined = undefined
  public numSelectedRows = 0
  public numAllRows = 0

  protected hasOverviewMap = false // Guard for overview map logic
  protected overviewMap: L.Map | google.maps.Map | undefined = undefined

  //protected iconBase = "./../../../assets/icons/"

  constructor(protected settingsService: SettingsService,
    protected fieldReportService: FieldReportService,
    protected httpClient: HttpClient,
    protected log: LogService,
    @Inject(DOCUMENT) protected document: Document) {

    this.log.excessive(`(Abstract) ======== Constructor() ============`, this.id)

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        // REVIEW: Any new settings just ripple thru, or does anything need pushing?!
        this.settings = newSettings
        this.log.excessive('(Abstract) Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('(Abstract) Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('(Abstract) Settings Subscription complete', this.id)
    })

    this.fieldReportsSubscription =
      this.fieldReportService.getFieldReportsObserver().subscribe({
        next: (newReport) => {
          this.gotNewFieldReports(newReport)
        },
        error: (e) => this.log.error('(Abstract) Field Reports Subscription got:' + e, this.id),
        complete: () => this.log.info('(Abstract) Field Reports Subscription complete', this.id)
      })
  }

  /**
   *
   */
  ngOnInit() {
    this.log.verbose("(Abstract) ngOnInit()", this.id)

    if (!this.settings) {
      this.log.error(`(Abstract) this.settings not yet established in ngOnInit()`, this.id)
      // REVIEW: Can initMap run OK w/ defaults, but w/o settings?
    } else {
      this.center = { lat: this.settings.defLat, lng: this.settings.defLng }
      this.mouseLatLng = this.center
    }

    // Derivitive maps should call this.initMap() themselves!
  }

  /**
   *
   * @returns
   */
  initMainMap() {
    this.log.verbose("(Abstract) initMainMap()", this.id)

    if (!this.settings) {
      this.log.error(`(Abstract) initMainMap(): Settings not yet initialized while initializing the abstract Map!`, this.id)
      return
    }

    this.center = { lat: this.settings ? this.settings.defLat : 0, lng: this.settings ? this.settings.defLng : 0 }
    this.mouseLatLng = this.center

    if (!this.fieldReports) { //! or displayedFieldReportArray
      this.log.error(`(Abstract) initMainMap(): fieldReports not yet initialized while initializing abstract Map!`, this.id)
      return
    }
  }

  /*
    Not needed, but available...
    if (this.map instanceof L.Map) {
      // leaflet map
      // TODO
    } else if (this.map instanceof google.maps.Map) {
      // google map
      // TODO
    } else {
      this.log.warn(`(Abstract) map initMainMap(): map not a leaflet or google map - ignoring as uninitialized?`, this.id)
    }
    */

  captureLMoveAndZoom(map: L.Map) {
    if (!map) {
      this.log.warn(`(Abstract) No map in captureLMoveAndZoom()`, this.id)
      return
    }

    map.on('mousemove', ($event: L.LeafletMouseEvent) => {
      // if (this.zoomDisplay) {
      this.zoomDisplay = map.getZoom()
      //}
      if ($event.latlng) {
        this.mouseLatLng = $event.latlng //.toJSON()
      } else {
        this.log.warn(`(Abstract) No latlng on event in captureLMoveAndZoom()`, this.id)
      }
    })
  }

  captureGMoveAndZoom(map: google.maps.Map) {
    if (!map) {
      this.log.warn(`(Abstract) No map in captureGMoveAndZoom()`, this.id)
      return
    }

    map.addListener("mousemove", ($event: any) => {
      //if (this.zoomDisplay) {
      this.zoomDisplay = map.getZoom()!
      //}

      if ($event.latLng) {
        this.mouseLatLng = $event.latLng.toJSON()
      } else {
        this.log.warn(`(Abstract) No latlng on event in captureGMoveAndZoom()`, this.id)
      }
    })

  }

  /**
  * Store Lat/Lng in Clipboard
  *! REVIEW: AND/ OR (do both?!)
  *! Or use this event to create a new marker?!
  *
  *! Review: Alternative approach: Use event listeners:
  * https://developers.google.com/maps/documentation/javascript/examples/event-click-lat lng
  * https://developers.google.com/maps/documentation/javascript/events#EventProperties
  *
  * @param ev
  */
  onMouseClick(ev: MouseEvent) {
    // lMap has override onMouseClick()

    if (!this.map) {
      this.log.error(`(Abstract) onMouseClick: Map not created, so can't get lat & lng`, this.id)
      return
    }

    if (this.settings.allowManualPinDrops) {
      // Put coordinates into a new non-permanent marker & drop on to map
      this.log.error(`(Abstract) onMouseClick() to create markers not implemented yet!`, this.id)
      // call: addManualMarkerEvent(event: google.maps.MapMouseEvent)
      // or
      //
      // this actualy works for one map type, just need to be wired up...
    } else {
      // Put coordinates into clipboard
      if (this.isGoogleMap(this.map)) {
        this.log.error(`(Abstract) onMouseClick() not implemented for Google Maps yet! `, this.id)
        /*
         ev.x
        this.map.addListener("click", (mapsMouseEvent) => {
          let position = mapsMouseEvent.latLng
        })
        JSON.stringify(mapsMouseEvent.latLng.toJSON(), null, 2)
        */
        // this.log.excessive(`(Abstract) ${coords} copied to clipboard`, this.id)
      } else {

        let latlng = this.map.mouseEventToLatLng(ev)
        let coords = `${Math.round(latlng.lat * 10000) / 10000}, ${Math.round(latlng.lng * 10000) / 10000}`
        navigator.clipboard.writeText(coords)
          .then(() => {
            let status = document.getElementById('map-status')
            if (status) {
              status.innerText = `${coords} copied to clipboard`
              //status.style.visibility = "visible"
              Utility.resetMaterialFadeAnimation(status)
            } else {
              this.log.info(`(Abstract) onMouseClick Entry__Minimap-status not found!`, this.id)
            }
            this.log.excessive(`(Abstract) ${coords} copied to clipboard`, this.id)
          })
          .catch(err => {
            this.log.error(`(Abstract) onMouseClick latlng NOT copied to clipboard, error: ${err}`, this.id)
          })
      }
    }
  }

  // updateOverviewMap() {
  //   this.log.verbose(`updateOverviewMap`, this.id)

  // TODO: display a small semi-transparent rectangle showing where the main map is

  //let latlng = new google.maps.LatLng(this.settings.defLat, this.settings.deflng)
  //let latlngL = {lat: this.settings.defLat, lng: this.settings.deflng}

  // TODO: FitBounds to new point, not to DefLat & Deflng  -- do it on addMarker?
  // this.map?.setCenter(latlng) // REVIEW: this and/or next line. (Bounds should be private though!)
  //this.map?.fitBounds(this.fieldReportService.bounds.extend({ lat: this.settings.defLat, lng: this.settings.defLng })) // zooms to max!

  //   this.map.setZoom(17) // no effect
  // }

  // onMapMouseMove(event: L.LeafletMouseEvent | google.maps.MapMouseEvent) {
  //   if (event.latLng) {
  //     this.mouseLatLng = event.latLng.toJSON()
  //     //this.log.excessive('moving()', this.id);
  //   }
  //   else {
  //     this.log.warn('move(): NO event.latLng!!!!!!!!!!!!!', this.id);
  //   }
  // }

  isLeafletMap(map: Map): map is L.Map {
    return true;
  }

  isGoogleMap(map: Map): map is google.maps.Map {
    return true
  }

  onMapZoomed() {
    if (this.zoom && this.map) {
      this.zoom = this.map.getZoom()!
    }
  }

  clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
  }

  abstract refreshMap(): void
  //  {
  //   this.log.error(`(Abstract) refreshMap() is unimplemented!`, this.id)
  // }

  // ------------------------------------  Field Reports  ---------------------------------------

  updateFieldReports() {
    this.log.excessive(`updateFieldReports()`, this.id)
    if (this.hasSelectedReports) {

      if (this.selectedReports = this.fieldReportService.getSelectedFieldReports()) {
        this.numSelectedRows = this.selectedReports.numReport
        if (this.numSelectedRows != this.selectedReports.fieldReportArray.length) {

          //! BUG: At start, if no rows were selected, then this.selectedReports.fieldReportArray.length reports all rows, not zero...
          this.log.error(`(Abstract) updateFieldReports:  # rows in selected array ${this.numSelectedRows} != # rows supposed to be there: ${this.selectedReports.fieldReportArray.length}. Resetting`, this.id)
          this.selectedReports.numReport = this.selectedReports.fieldReportArray.length
          this.numSelectedRows = this.selectedReports.fieldReportArray.length
        }
      } else {
        this.numSelectedRows = 0
      }

      this.filterButton = document.querySelector('#selectedFieldReports') as HTMLButtonElement
      if (this.filterButton == undefined) {
        this.log.error("(Abstract) updateFieldReports() could not find selectedFieldReports", this.id)
      } else {
        // No need to *subscribe*, as everytime there is a selection made,
        // it currently gets stored and won't change once we're on this screen
        this.numSelectedRows = this.fieldReportService.getSelectedFieldReports().fieldReportArray.length
        // Selected Field Reports are retrieved when user clicks the slider switch...but we do need the #!
        this.filterSwitch = new MDCSwitch(this.filterButton)
        if (!this.filterSwitch) {
          throw ("(Abstract) updateFieldReports(): Found filterButton - but NOT Field Report Selection Switch!")
        }

        //! TEST: Does this get re-hit if user swittches back, adjusts # selected rows and returns???
        // BUG: refresh page resets selected switch
        this.onSwitchSelectedFieldReports()

        // Just get the # of rows in the selection (if any), so we can properly display that # next to the switch
        if (this.selectedReports = this.fieldReportService.getSelectedFieldReports()) {
          this.numSelectedRows = this.selectedReports.numReport
          if (this.numSelectedRows != this.selectedReports.fieldReportArray.length) {
            this.log.error(`(Abstract) updateFieldReports(): ngOnInit issue w/ selected rows ${this.numSelectedRows} != ${this.selectedReports.fieldReportArray.length}`, this.id)
            this.selectedReports.numReport = this.selectedReports.fieldReportArray.length
            this.numSelectedRows = this.selectedReports.fieldReportArray.length
          }
        } else {
          this.log.warn(`(Abstract) updateFieldReports(): Could not retrieve selected Field Reportst.`, this.id)
          this.numSelectedRows = 0
        }

        this.filterButton = document.querySelector('#selectedFieldReports') as HTMLButtonElement
        if (!this.filterButton) { throw ("(Abstract) updateFieldReports(): Could not find Field Report Selection button!") }

        this.filterSwitch = new MDCSwitch(this.filterButton)
        if (!this.filterSwitch) throw ("(Abstract) updateFieldReports(): Could not find Field Report Selection Switch!")

      }
    } else {
      this.log.error(`(Abstract) updateFieldReports got no Selected reports`)
    }
  }



  /*
  What gets displayed: alternates between all & selected rows, based on the switch
  private override selectedReports: FieldReportsType | null = null
  public override displayedFieldReportArray: FieldReportType[] = []
  !this is just a subcomponent of the above: use the above if possible...  OH NO: this actually flipps back & forth between all & selected field reports, based on the switch...
  following doesn't need a subscription as user selections are auto-saved & available,
  if they switch to this page
  REVIEW: UNLESS the switch was already on "selected rows" and isn't reswitched!!!: so just check/reset in ngOnInit?!
  */

  gotNewFieldReports(newReports: FieldReportsType) {
    this.log.verbose(`(Abstract) gotNewFieldReports(): New collection of ${newReports.numReport} Field Reports observed.`, this.id)

    this.numAllRows = newReports.numReport
    this.fieldReports = newReports
    this.fieldReportArray = newReports.fieldReportArray
    console.assert(this.numAllRows == this.fieldReportArray.length)
    if (this.map) {
      this.refreshMap()
    }
    // this.reloadPage()  // TODO: needed?
  }

  /**
   *
   * @returns
   */

  //! BUG: Resets slected reports to ALL!!!!
  onSwitchSelectedFieldReports() { //event: any) {
    if (!this.fieldReports) {
      this.log.error(`(Abstract) onSwitchSelectedFieldReports(): Field Reports not yet set`, this.id)
      return
    }

    if (!this.filterSwitch) {
      this.log.error(`(Abstract) onSwitchSelectedFieldReports(): filterSwitch not found`, this.id)
      return
    }

    if (this.filterSwitch.selected) {
      this.displayedFieldReportArray = this.fieldReportService.getSelectedFieldReports().fieldReportArray
      // ! REVIEW: we did NOT grab the whole selectedFieldReports structure, JUST the report array: OK?!
      this.numSelectedRows = this.displayedFieldReportArray.length
      this.log.verbose(`(Abstract) onSwitchSelectedFieldReports():Displaying ${this.displayedFieldReportArray.length} SELECTED field Reports`, this.id)
    } else {
      this.displayedFieldReportArray = this.fieldReports.fieldReportArray
      this.log.verbose(`(Abstract) onSwitchSelectedFieldReports():Displaying ALL ${this.displayedFieldReportArray.length} field Reports`, this.id)
      if (this.numSelectedRows != this.displayedFieldReportArray.length) {
        this.log.error(`(Abstract) onSwitchSelectedFieldReports():Having to update numSelectedRows ${this.numSelectedRows} to match actual array length ${this.displayedFieldReportArray.length}`, this.id)

        this.numSelectedRows = this.displayedFieldReportArray.length
      }
    }

    // TODO: Need to refresh map?!
    this.refreshMap()
    // this.reloadPage()  // TODO: needed?
  }

  // ------------------------------------  Markers  ---------------------------------------

  abstract addMarker(lat: number, lng: number, title: string): void
  abstract hideMarkers(): void
  abstract clearMarkers(): void
  abstract addManualMarkerEvent(event: any): void

  displayMarkers() {
    this.log.verbose(`(Abstract) displayMarkers()`, this.id)

    if (!this.displayReports) {
      this.log.error(`(Abstract) displayMarkers() BUT displayReports is false!`, this.id)
    }

    if (!this.displayedFieldReportArray) {
      this.log.error(`(Abstract) displayMarkers() BUT No Field Reports received yet!`, this.id)
      return
    }

    //! this.addMarker(this.fieldReports[i].location.lat, this.fieldReports[i].location.lng, this.fieldReports[i].status)
  }

  // Deletes all markers in the array by removing references to them
  // https://developers.google.com/maps/documentation/javascript/markers#remove
  removeAllMarkers() {
    this.log.verbose(`(Abstract) removeAllMarkers()`, this.id)
    this.hideMarkers()
    // this.clearMarkers = [] // BUG: this won't work!
    // this.map.clear();
    // this.markerCluster.clearMarkers()
  }

  ngOnDestroy() {
    // this.locationSubscription?.unsubscribe()
    this.fieldReportsSubscription?.unsubscribe()
    this.settingsSubscription?.unsubscribe()
  }
}
