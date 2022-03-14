/// <reference types="@types/google.maps" />
import { Component, Inject, Input, isDevMode, OnDestroy, OnInit } from '@angular/core';
import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'
import { DDToDMS, CodeArea, OpenLocationCode } from '../shared/' // BUG: , What3Words, Map, , GoogleGeocode
import { LatLng } from 'leaflet';
import { DOCUMENT } from '@angular/common';
import { Subscription } from 'rxjs';
import { LogService, SettingsService, SettingsType, LocationType } from '../shared/services/';

const Vashon: google.maps.LatLngLiteral = { lat: 47.4471, lng: -122.4627 }

@Component({
  selector: 'mini-gmap',
  templateUrl: './mini-gmap.component.html',
  styleUrls: ['./mini-gmap.component.scss']
})
export class MiniGMapComponent implements OnInit, OnDestroy {
  @Input() set locationUpdated(value: LocationType) {
    if (value && value.lat != undefined) {
      this.location = {
        lat: value.lat,
        lng: value.lng,
        address: value.address
      }
      this.log.verbose(`new location passed in ${JSON.stringify(value)}`, this.id)
    } else {
      this.log.error(`Bad location passed in ${JSON.stringify(value)}`, this.id)
    }
  }

  private id = "Google mini-map Component"
  //private locationSubscription$!: Subscription
  private location?: LocationType

  private settingsSubscription$!: Subscription
  private settings?: SettingsType

  // ------------------ MAP STUFF  ------------------
  // imports this.map as a GoogleMap which is the Angular wrapper around a google.maps.Map...
  //@ViewChild(GoogleMap, { static: false }) map!: GoogleMap // even needed?
  // google.maps.Map is NOT the same as GoogleMap - but does refer to the same underlying map...
  gMap?: google.maps.Map

  onlyMarker = new google.maps.Marker({
    draggable: false,
    animation: google.maps.Animation.DROP
  }) // i.e., a singleton...

  // TODO: move to abstracted x instead of google.maps
  mouseLatLng?: google.maps.LatLngLiteral
  vashon = new google.maps.LatLng(47.4471, -122.4627)

  zoom = 11
  center: google.maps.LatLngLiteral = Vashon
  options: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: true,
    mapTypeId: 'hybrid',
    maxZoom: 21,
    minZoom: 7,
    draggableCursor: 'crosshair', // https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
    //heading: 90,
  }
  //geocoder = new GoogleGeocode



  constructor(
    private log: LogService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.log.verbose(`MiniGMapComponent constructed with development mode ${isDevMode() ? "" : "NOT "}enabled`, this.id)

    this.log.verbose("constructor()", this.id)
    this.settingsSubscription$ = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    /*
    this.locationSubscription$ = this.locationService.getSettingsObserver().subscribe({
      next: (newLocation) => {
        this.log.verbose(`mini-map got newLocation: ${JSON.stringify(newLocation)}`)
        this.location = newLocation
      },
      error: (e) => this.log.error('Location Subscription got:' + e, this.id),
      complete: () => this.log.info('Location Subscription complete', this.id)
    })*/
  }

  ngOnInit(): void {
    this.log.verbose(`MiniGMapComponent onInit() with development mode ${isDevMode() ? "" : "NOT "}enabled`, this.id)

    // subscribe to addresses value changes
    /* TODO: How?!
    this.entryDetailsForm.controls['location'].valueChanges.subscribe(x => {
      this.log.verbose(`Subscription to location got: ${x}`, this.id);
    })
*/

  }

  // ------------------------------------------------------------------------
  // Map stuff below
  //#region

  onMapInitialized(newMapReference: google.maps.Map) {
    this.log.verbose(`onMapInitialized()`)
    this.gMap = newMapReference
    /*
        if (this.gMap == null) {
          this.log.verbose("onMapInitialized(): This.gMap is null", this.id)
        } else {
          this.log.verbose(`onMapInitialized(): this.gMap zoom =${this.gMap.getZoom()}`, this.id)
        }
        */
    this.updateOverviewMap()
    this.log.verbose(`onMapInitialized done`, this.id)
  }

  updateOverviewMap() {
    this.log.verbose(`updateOverviewMap`, this.id)

    //let latlng = new google.maps.LatLng(this.settings.defLat, this.settings.deflng)
    //let latlngL = {lat: this.settings.defLat, lng: this.settings.deflng}

    // TODO: FitBounds to new point, not to DefLat & Deflng  -- do it on addMarker?
    // this.gMap?.setCenter(latlng) // REVIEW: this and/or next line. (Bounds should be private though!)
    //this.gMap?.fitBounds(this.fieldReportService.bounds.extend({ lat: this.settings.defLat, lng: this.settings.defLng })) // zooms to max!
    this.gMap?.setZoom(17) // no effect
  }

  onMapMouseMove(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.mouseLatLng = event.latLng.toJSON()
      //this.log.verbose('moving()', this.id);
    }
    else {
      this.log.warn('move(): NO event.latLng!!!!!!!!!!!!!', this.id);
    }
  }

  onMapZoomed() {
    if (this.zoom && this.gMap) {
      this.zoom = this.gMap.getZoom()!
    }
  }
  // TODO: chg miniMap out with Leaflet map (for offline use)
  //#endregion

  displayMarker(pos: google.maps.LatLngLiteral, title = 'Latest Location') {
    this.log.verbose(`displayMarker at ${pos}, title: ${title}`, this.id)

    // Review: will this overwrite/remove any previous marker?
    if (this.gMap) {
      this.onlyMarker.setMap(this.gMap)
    } else {
      this.log.warn('gMap NOT set in displayMarker!!!!', this.id)
    }
    this.onlyMarker.setPosition(pos)
    this.onlyMarker.setTitle(title)
    this.gMap?.setCenter(pos)

    /* label: {
       // label: this.labels[this.labelIndex++ % this.labels.length],
       text: "grade", // https://fonts.google.com/icons: rocket, join_inner, noise_aware, water_drop, etc.
       fontFamily: "Material Icons",
       color: "#ffffff",
       fontSize: "18px",
     },
     */
  }


  ngOnDestroy() {
    // this.locationSubscription$.unsubscribe()
    this.settingsSubscription$.unsubscribe()
  }
}
