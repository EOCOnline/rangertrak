/// <reference types="@types/google.maps" />
import { Subscription } from 'rxjs'

//import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'
//import { DDToDMS, CodeArea, OpenLocationCode } from '../shared/' // BUG: , What3Words, Map, , GoogleGeocode
//import { LatLng } from 'leaflet';
import { DOCUMENT } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import {
  AfterViewInit, Component, Inject, Input, isDevMode, OnDestroy, OnInit
} from '@angular/core'

import { AbstractMap } from '../shared/'
import {
  FieldReportService, LocationType, LogService, SettingsService, SettingsType
} from '../shared/services/'

//const Vashon: google.maps.LatLngLiteral = { lat: 47.4471, lng: -122.4627 }

@Component({
    selector: 'mini-gmap',
    templateUrl: './mini-gmap.component.html',
    styleUrls: ['./mini-gmap.component.scss'],
    standalone: false
})
export class MiniGMapComponent extends AbstractMap implements OnInit, OnDestroy {

  @Input() set locationUpdated(value: LocationType) {
    if (value && value.lat != undefined) {
      this.location = {
        lat: value.lat,
        lng: value.lng,
        address: value.address,
        derivedFromAddress: value.derivedFromAddress
      }
      this.log.verbose(`New location passed in ${JSON.stringify(value)}`, this.id)
    } else {
      this.log.error(`Bad location passed in ${JSON.stringify(value)}`, this.id)
    }
  }

  public override id = "Google mini-map Component"

  // ------------------ MAP STUFF  ------------------
  // imports this.map as a GoogleMap which is the Angular wrapper around a google.maps.Map...
  //@ViewChild(GoogleMap, { static: false }) map!: GoogleMap // even needed?
  // google.maps.Map is NOT the same as GoogleMap - but does refer to the same underlying map...
  gMap!: google.maps.Map

  onlyMarker = new google.maps.Marker({
    draggable: false,
    animation: google.maps.Animation.DROP
  }) // i.e., a singleton...

  // TODO: move to abstracted x instead of google.maps
  //mouseLatLng?: google.maps.LatLngLiteral
  //vashon = new google.maps.LatLng(47.4471, -122.4627)

  // zoom = 11
  // center: google.maps.LatLngLiteral = Vashon
  mapOptions: google.maps.MapOptions = {
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
    settingsService: SettingsService,
    fieldReportService: FieldReportService,
    httpClient: HttpClient,
    log: LogService,
    @Inject(DOCUMENT) protected override document: Document
  ) {
    super(settingsService,
      fieldReportService,
      httpClient,
      log,
      document)

    this.log.verbose(`======== Constructor() ============ with development mode ${isDevMode() ? "" : "NOT "}enabled`, this.id)


    this.hasOverviewMap = false
    this.displayReports = false
    this.hasSelectedReports = false
    //! TODO: Move ALL subscribes to AfterViewInit() !!!!
    // https://angular.io/tutorial/toh-pt4#call-it-in-ngoninit states subscribes should happen in OnInit()
    // this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
    //   next: (newSettings) => {
    //     this.settings = newSettings
    //     this.log.excessive('Received new Settings via subscription.', this.id)
    //   },
    //   error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
    //   complete: () => this.log.info('Settings Subscription complete', this.id)
    // })

    /*
    this.locationSubscription = this.locationService.getSettingsObserver().subscribe({
      next: (newLocation) => {
        this.log.verbose(`mini-map got newLocation: ${JSON.stringify(newLocation)}`)
        this.location = newLocation
      },
      error: (e) => this.log.error('Location Subscription got:' + e, this.id),
      complete: () => this.log.info('Location Subscription complete', this.id)
    })*/
  }

  override ngOnInit(): void {
    super.ngOnInit()

    this.log.verbose('ngOnInit()', this.id)

    // displayReports = false

    /* subscribe to addresses value changes
this.entryDetailsForm.controls['location'].valueChanges.subscribe(x => {
  this.log.verbose(`Subscription to location got: ${x}`, this.id);
})
*/

    // https://developers.google.com/maps/documentation/geolocation/overview
    // Works - *if* you want map zoomed on user's device...
    // navigator.geolocation.getCurrentPosition((position) => {
    //   this.center = {
    //     lat: position.coords.latitude,
    //     lng: position.coords.longitude
    //   }
    // })

    // this.center = { lat: this.settings.defLat, lng: this.settings.defLng }
    // this.zoom = this.settings.leaflet.defZoom
    // this.zoomDisplay = this.zoom
    // this.mouseLatLng = this.center

    this.initMainMap()
    this.updateFieldReports()
  }

  apiLoadedCallbackUNUSED() {
    this.log.verbose("got apiLoadedCallback()", this.id)
  }



  // -----------------------------  MAP STUFF -----------------------------------


  onMapInitialized(newMapReference: google.maps.Map) {
    this.log.excessive(`onMapInitialized()`)
    this.gMap = newMapReference
    /*
        if (this.gMap == null) {
          this.log.verbose("onMapInitialized(): This.gMap is null", this.id)
        } else {
          this.log.excessive(`onMapInitialized(): this.gMap zoom =${this.gMap.getZoom()}`, this.id)
        }
        */
    this.updateOverviewMap()
    this.log.excessive(`onMapInitialized done`, this.id)
  }

  refreshMap() {

    //this.gMap.clear()
    //google.maps.event.trigger(this.gMap, 'resize');
    this.gMap.panBy(0, 0);
  }

  updateOverviewMap() {
    this.log.excessive(`updateOverviewMap`, this.id)

    //let latlng = new google.maps.LatLng(this.settings.defLat, this.settings.deflng)
    //let latlngL = {lat: this.settings.defLat, lng: this.settings.deflng}

    // TODO: FitBounds to new point, not to DefLat & Deflng  -- do it on addMarker?
    // this.gMap?.setCenter(latlng) // REVIEW: this and/or next line. (Bounds should be private though!)
    //this.gMap?.fitBounds(this.fieldReportService.bounds.extend({ lat: this.settings.defLat, lng: this.settings.defLng })) // zooms to max!
    //   this.gMap?.setZoom(17) // no effect
  }

  // onMapMouseMove(event: google.maps.MapMouseEvent) {
  //   if (event.latLng) {
  //     this.mouseLatLng = event.latLng.toJSON()
  //     //this.log.excessive('moving()', this.id);
  //   }
  //   else {
  //     this.log.warn('move(): NO event.latLng!!!!!!!!!!!!!', this.id);
  //   }
  // }

  // onMapZoomed() {
  //   if (this.zoom && this.gMap) {
  //     this.zoom = this.gMap.getZoom()!
  //   }
  // }

  onMapMouseMove(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      // this.mouseLatLng = event.latLng.toJSON()
    }
  }

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


  addMarker(lat: number, lng: number, title: string): void {
    //throw new Error('Method not implemented.')
  }
  hideMarkers(): void {
    //throw new Error('Method not implemented.')
  }
  clearMarkers(): void {
    throw new Error('Method not implemented.')
  }
  addManualMarkerEvent(event: any): void {
    //throw new Error('Method not implemented.')
  }
}
