/// <reference types="@types/google.maps" />
import { LatLng, LatLngBounds } from 'leaflet'
import { catchError, map, Observable, of, Subscription } from 'rxjs'

import { DOCUMENT, JsonPipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, ElementRef, Inject, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { GoogleMap, MapInfoWindow, MapMarker } from '@angular/google-maps'
import * as GMC from '@googlemaps/markerclusterer'
// Map
import { MDCSwitch } from '@material/switch'

import { CodeArea, OpenLocationCode, Utility } from '../shared/'
import { AbstractMap } from '../shared/map'
import {
    FieldReportService, FieldReportStatusType, FieldReportsType, FieldReportType, LogService,
    SettingsService, SettingsType
} from '../shared/services'

/*
google-maps: OLD
google.maps: BEST

  https://developers.google.com/maps/support/
  https://angular-maps.com/
  https://github.com/atmist/snazzy-info-window#html-structure
  https://angular-maps.com/api-docs/agm-core/interfaces/lazymapsapiloaderconfigliteral
 https://github.com/timdeschryver/timdeschryver.dev/blob/main/content/blog/google-maps-as-an-angular-component/index.md
 TODO: Allow geocoding: https://rapidapi.com/blog/google-maps-api-react/
 Option doc: https://developers.google.com/maps/documentation/javascript/reference/map#MapOptions

GoogleMapsModule (their Angular wrapper) exports three components that we can use:
- GoogleMap: this is the wrapper around Google Maps, available via the google-map selector
- MapMarker: used to add markers on the map, available via the map-marker selector
- MapInfoWindow: the info window of a marker, available via the map-info-window selector
*/

declare const google: any
let marker: google.maps.Marker
/**
 * @ignore
 */
@Component({
  selector: 'rangertrak-gmap',
  templateUrl: './gmap.component.html',
  styleUrls: ['./gmap.component.scss'],
  providers: [SettingsService]
})
export class GmapComponent extends AbstractMap implements OnInit, OnDestroy {

  // Get reference to map components, for later use
  @ViewChild(GoogleMap, { static: false }) ngMap!: GoogleMap
  @ViewChild(GoogleMap, { static: false }) overviewNgMap!: GoogleMap
  //@ViewChild(MapInfoWindow, { static: false }) infoWindow!: MapInfoWindow
  // MapInfoWindow: a map's tooltip: https://developers.google.com/maps/documentation/javascript/infowindows
  /** Details:
   * https://github.com/timdeschryver/timdeschryver.dev/blob/main/content/blog/google-maps-as-an-angular-component/index.md#methods-and-getters
   * https://github.com/angular/components/blob/master/src/google-maps/google-map/README.md
   * https://stackblitz.com/edit/angular-9-google-maps-5v2cu8?file=src%2Fapp%2Fapp.component.ts
   */

  public override id = 'Google Map Component'
  public override title = 'Google Map'
  public override pageDescr = 'Google Map'

  // items for template
  override mouseLatLng!: google.maps.LatLngLiteral;

  // this.ngMap: GoogleMap (Angular wrapper for the same underlying map!)
  // this.gMap: google.maps.Map (JavaScript core map) - made available in onMapInitialized()
  gMap!: google.maps.Map
  overviewGMap!: google.maps.Map
  overviewMapType = { cur: 0, types: { type: ['roadmap', 'terrain', 'satellite', 'hybrid',] } }
  // overviewGMapOptions: google.maps.MapOptions
  // items for <google-map>
  trafficLayer = new google.maps.TrafficLayer()
  trafficLayerVisible = 0

  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: true,
    mapTypeId: 'hybrid',
    zoom: 18,
    maxZoom: 21,
    minZoom: 4,
    draggableCursor: 'crosshair', //https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
    //heading: 90,
  }

  overviewMapOptions: google.maps.MapOptions = {
    ...this.mapOptions,
    disableDefaultUI: true,
    gestureHandling: "none",
    zoomControl: false,
    mapTypeId: 'terrain',
  }

  infowindow = new google.maps.InfoWindow({
    maxwidth: "150px",
  });

  // Google MapMarker only wraps google.maps.LatLngLiteral (positions) - NOT google.maps.Marker: styles, behaviors, etc. -- But might be able to set marker options?
  markers: google.maps.Marker[] = []
  markerCluster!: GMC.MarkerClusterer
  // markerPositions: google.maps.LatLngLiteral[] angular brain-dead wrapper
  markerClustererImagePath =
    'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m';
  // markerOptions = { draggable: false }
  // label = 'RangerTrak Label'

  labelIndex = 0;
  // infoContent = ''
  apiLoaded //: Observable<boolean> // used by template


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

    this.log.verbose(`======== Constructor() ============ Google Map, using version ${google.maps.version}`, this.id)

    this.hasOverviewMap = true
    this.displayReports = true
    this.hasSelectedReports = true

    // https://github.com/angular/components/tree/master/src/google-maps/map-marker-clusterer
    // this.markerPositions = []; evil angular wrapper

    // https://github.com/googlemaps/js-markerclusterer
    // use default algorithm and renderer
    /*

    constructor MarkerClusterer(map: google.maps.Map, markers?: google.maps.Marker[] | undefined, options?: MarkerClustererOptions | undefined): MarkerClusterer
Class for clustering markers on a Google Map.

See googlemaps.github.io/v3-utility-library/classes/_google_markerclustererplus.markerclusterer.html

*/

    // https://developers.google.com/maps/documentation/javascript/examples/map-latlng-literal
    // https://developers.google.com/maps/documentation/javascript/reference/coordinates

    // this.circleCenter: google.maps.LatLngLiteral = {lat: this.settings.defLat, lng: this.settings.defLng};
    // https://github.com/angular/components/tree/master/src/google-maps
    // this.apiLoaded = httpClient.jsonp(`https://maps.googleapis.com/maps/api/js?key=${SettingsService.secrets[3].key}`, 'callback')
    // this.apiLoaded = true
    /*
    httpClient.jsonp(`https://maps.googleapis.com/maps/api/js?key=YOUR_API_HERE`, "callback")
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
    */
    // google.maps.event.addDomListener(window, 'load', this.initMap);
    // this.LoadMap()
    //super('MyName')
    this.apiLoaded = true  //! bogus...
  }


  // override ngOnInit(): void {
  //   super.ngOnInit()

  //   this.log.excessive('ngOnInit()', this.id)

  // https://developers.google.com/maps/documentation/geolocation/overview
  // Works - *if* you want map zoomed on user's device...
  // navigator.geolocation.getCurrentPosition((position) => {
  //   this.center = {
  //     lat: position.coords.latitude,
  //     lng: position.coords.longitude
  //   }
  // })
  // }

  // Initialize data or fetch external data from services or API (https://geeksarray.com/blog/angular-component-lifecycle)
  override ngOnInit() {
    super.ngOnInit()
    this.log.excessive("ngOnInit()", this.id)

    // Following just sets zoom...
    // this.initMainMap()

    if (this.displayReports) {
      this.log.excessive("into getAndDisplayFieldReports()", this.id)
      this.getAndDisplayFieldReports() // REVIEW: Works with NO Markers?

      // https://github.com/googlemaps/js-markerclusterer
      // https://newbedev.com/google-markerclusterer-decluster-markers-below-a-certain-zoom-level
      this.markerCluster = new GMC.MarkerClusterer({
        map: this.gMap,
        markers: this.markers,
        // algorithm?: Algorithm,
        // renderer?: Renderer,
        // onClusterClick?: onClusterClickHandler,
      })
      this.log.excessive("into updateFieldReports()", this.id)

      this.updateFieldReports()
    }

    this.log.excessive("done with ngOnInit()", this.id)

  }

  // ---------------- Init Main Map -----------------
  override initMainMap() {
    super.initMainMap()

    this.log.excessive("initMap()", this.id)

    // ! Repeat of the guards in super:
    if (!this.settings) {
      this.log.error(`Settings not yet initialized while in initMap()!`, this.id)
      return
    }

    //? Per guidence on settings page: Maps do not use defLat/lng... They are auto-centered on the bounding coordinates centroid of all points entered and the map is then zoomed to show all points.

    this.zoom = this.settings ? this.settings.google.defZoom : 15
    this.zoomDisplay = this.settings ? this.settings.google.defZoom : 15

    this.log.verbose(`Setting G map Center= lat:${this.settings ? this.settings.defLat : 0}, lng: ${this.settings ? this.settings.defLng : 0}, zoom: ${this.settings ? this.settings.google.defZoom : 15}`, this.id)

    if (this.gMap) {
      /*
      ERROR TypeError: Cannot read properties of undefined (reading 'setCenter')
      at GmapComponent.initMainMap (gmap.component.ts:237:15)
      */

      this.gMap.setCenter({ lat: this.settings ? this.settings.defLat : 0, lng: this.settings ? this.settings.defLng : 0 })
      this.gMap.setZoom(this.settings ? this.settings.google.defZoom : 15)
      this.gMap.fitBounds(this.fieldReportService.boundsToBound(this.fieldReports!.bounds))
    }
  }

  override onMapZoomed() {
    super.onMapZoomed()
    if (this.zoom && this.gMap) {
      this.zoom = this.gMap.getZoom()!
      this.zoomDisplay = this.gMap.getZoom()!
    }
  }

  onMapMouseMove(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.mouseLatLng = event.latLng.toJSON()
    }
  }


  // this.ngMap: GoogleMap (Angular wrapper for the same underlying map!)
  // this.gMap: google.maps.Map (JavaScript core map) - made available in onMapInitialized()
  onMapInitialized(mappy: google.maps.Map) {
    this.log.verbose(`onMapInitialized()`, this.id)

    // This event is ONLY registered for the main map, not overview
    this.gMap = mappy
    this.captureGMoveAndZoom(this.gMap)
    if (this.displayReports) {
      // gets: core.mjs:6485 ERROR TypeError: bounds.getEast is not a function at FieldReportService.boundsToBound (field-report.service.ts:193:56)
      // this.gMap.fitBounds(this.fieldReportService.boundsToBound(this.fieldReports!.bounds))
    }
    /* TODO: Emit update for subscribers: instead of always reloading at init stage...
        this.fieldReportArray = this.fieldReportService.getFieldReports().valueChanges.subscribe(x => {
          this.log.verbose(`Subscription to location got: ${x}`, this.id)
        })
        */
  }

  onOverviewMapInitialized(mappy: google.maps.Map) {
    this.log.verbose(`onOverviewMapInitialized()`, this.id)

    // This event is ONLY registered for the overview map
    this.overviewGMap = mappy
    this.overviewMap = this.overviewGMap // REVIEW: this creates another reference (used by abstract class..) - NOT a copy that evolves seperately - right?!.
    this.captureGMoveAndZoom(this.overviewGMap)

    let rectangle = new google.maps.Rectangle({
      strokeColor: 'blue',
      strokeOpacity: 0.8,
      strokeWeight: 1,
      fillColor: 'blue',
      fillOpacity: 0.07,
      map: this.overviewGMap,
      bounds: this.gMap.getBounds()
    })

    this.gMap.addListener("bounds_changed", () => {
      this.overviewGMap.setCenter(this.gMap.getCenter()!);
      this.overviewGMap.setZoom(
        this.clamp(
          this.gMap.getZoom()! - this.settings!.google.overviewDifference,
          this.settings!.google.overviewMinZoom,
          this.settings!.google.overviewMaxZoom
        )
      )
      rectangle.LatLngBounds =
        rectangle.setOptions({
          bounds: this.gMap.getBounds() as google.maps.LatLngBounds
        })
    })

    // cycle through map types when map is clicked
    this.overviewGMap.addListener("click", () => {
      let mapId = this.overviewMapType.cur++ % 4
      this.overviewGMap.setMapTypeId(this.overviewMapType.types.type[mapId])
      this.log.verbose(`Overview map set to ${this.overviewMapType.types.type[mapId]}`, this.id)
    })

  }

  apiLoadedCallbackUNUSED() {
    this.log.verbose("got apiLoadedCallback()", this.id)
    this.apiLoaded = true
  }

  // -----------------------------------  Markers  --------------------------------------


  override clearMarkers() {
    this.markers = []
  }

  /*
  https://github.com/googlemaps/js-markerclusterer - current!
https://github.com/angular/components/tree/master/src/google-maps/map-marker-clusterer - Angular components doesn't encapulate options functionality: identical clones only: ugg.
MarkerClustererPlus Library - also old
    refreshMap() {
      let data
      if (this.markerCluster) {
        this.markerCluster.clearMarkers();
      }
      var markers = [];

      var markerImage = new google.maps.MarkerImage(imageUrl,
        new google.maps.Size(24, 32));

      for (var i = 0; i < data.photos.length; ++i) {
        markers.push(new marker());
      }
      var zoom = parseInt(document.getElementById('zoom').value, 10);
      var size = parseInt(document.getElementById('size').value, 10);
      var style = parseInt(document.getElementById('style').value, 10);
      zoom = zoom === -1 ? null : zoom;
      size = size === -1 ? null : size;
      style = style === -1 ? null : style;

      markerClusterer = new MarkerClusterer(map, markers, {
        maxZoom: zoom,
        gridSize: size,
        styles: styles[style],
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
      });
    }
  */

  addManualMarkerEvent(event: google.maps.MapMouseEvent) {
    if (this.settings!.allowManualPinDrops) {
      if (event.latLng) {
        this.addMarker(event.latLng.lat(), event.latLng.lng(), `Manual Marker dropped ${event.latLng.lat}, ${event.latLng.lng} at ${Date()}`)
      } else {
        this.log.error(`addMarker FAILED`, this.id)
      }
    }
  }

  override onSwitchSelectedFieldReports() {
    super.onSwitchSelectedFieldReports()
    this.log.excessive(`onSwitchSelectedFieldReports()`, this.id)

    this.getAndDisplayFieldReports() // REVIEW: !!!!
  }

  getAndDisplayFieldReports() {
    //super.onSwitchSelectedFieldReports()

    if (!this.filterSwitch || !this.filterSwitch.selected) {
      this.log.verbose(`Displaying ALL ${this.fieldReportArray.length} field Reports`, this.id)
    } else {
      this.fieldReportArray = this.fieldReportService.getSelectedFieldReports().fieldReportArray
      this.log.verbose(`Displaying ${this.fieldReportArray.length} SELECTED field Reports`, this.id)
    }
    this.displayMarkers()
    // this.markerCluster.clearMarkers()
    // this.markerCluster.addMarkers(this.markers)

    // TODO: Duplicate code as in InitMap: move to a new routine...
    /*this.markerCluster = new GMC.MarkerClusterer({
      map: this.gMap,
      markers: this.markers,
      // algorithm?: Algorithm,
      // renderer?: Renderer,
      // onClusterClick?: onClusterClickHandler,
    })*/
  }

  // Removes the markers from the map, but keeps them in the array.
  override hideMarkers(): void {
    this.markers.forEach((i) => i.setMap(null))
  }

  // Shows any markers currently in the array.
  showMarkers(): void {
    if (!this.gMap) {
      this.log.error(`showMarkers() got null gMap`, this.id)
      return
    }
    this.markers.forEach((i) => i.setMap(this.gMap))
  }

  // Deletes all markers in the array by removing references to them.
  override removeAllMarkers() {
    this.log.verbose(`removeAllMarkers()`, this.id)
    this.hideMarkers()
    this.markers = []
    // this.gMap.clear();
    // this.markerCluster.clearMarkers()
  }

  override displayMarkers() {
    let latlng
    //let infoContent
    let labelText
    let title
    let icon
    let labelColor
    let fr: FieldReportType

    let fieldReportStatuses: FieldReportStatusType[] = this.settings!.fieldReportStatuses
    // REVIEW: Might this mess with existing fr's? (User instructed NOT to rename existing statuses...)
    this.log.verbose(`displayMarkers got ${this.fieldReportArray.length} field reports to display`, this.id)

    //! TODO: Start by hiding/clearing existing markers & rebuilding....
    //this.markerCluster.clearMarkers()
    this.removeAllMarkers()

    //if (!this.fieldReportArray.length) {
    //this.removeAllMarkers()
    //this.markerCluster.removeMarkers(this.markers)
    //}

    // this.markerCluster.addMarkers(this.markers)

    for (let i = 0; i < this.fieldReportArray.length; i++) {
      fr = this.fieldReportArray[i]
      latlng = new google.maps.LatLng(fr.lat, fr.lng)
      title = `${fr.callsign} (${fr.status}) at ${fr.date} at lat ${fr.lat}, lng ${fr.lng} with "${fr.notes}".`
      //title = infoContent

      switch (fr.callsign) {
        case "W7VMI":
          //icon = "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png"
          icon = "http://maps.gstatic.com/mapfiles/ms2/micons/sunny.png"
          break;
        case "!Team3":
          icon = "http://maps.gstatic.com/mapfiles/ms2/micons/blue.png"
          break;
        case "!Team2":
          icon = "http://maps.google.com/mapfiles/kml/paddle/2.png"
          break;
        case "!Team1":
          icon = "http://maps.google.com/mapfiles/kml/paddle/1.png"
          break;
        case "KI7SWF":
          icon = "http://maps.google.com/mapfiles/kml/shapes/capital_big_highlight.png"
          break;
        default:
          icon = ''
          break;
      }

      for (let j = 0; j < fieldReportStatuses.length; j++) {
        if (fieldReportStatuses[j].status != fr.status) continue
        labelText = fieldReportStatuses[j].icon
        labelColor = fieldReportStatuses[j].color
        break
      }

      this.log.excessive(`displayMarkers adding marker #${i} at ${JSON.stringify(latlng)} with ${labelText}, ${title}, ${labelColor}`, this.id)

      this.addMarker(latlng.lat(), latlng.lng(), title, labelText, title, labelColor, "28px", icon)
    }

    //! now all markers are in: this.markers[]  HOW TO DISPLAY/ATTACH TO MAP?!
    this.showMarkers()
    this.markerCluster.addMarkers(this.markers)
    // ????


    this.log.verbose(`displayMarkers added ${this.fieldReportArray.length} markers`, this.id)
  }

  override addMarker(lat: number, lng: number, infoContent = "", labelText = "grade", title = "", labelColor = "aqua", fontSize = "12px", icon = "", animation = google.maps.Animation.DROP, msDelay = 100) {
    this.log.excessive(`addMarker(G)`, this.id)

    if (infoContent == "") {
      infoContent = `Manual Marker dropped ${lat}, ${lng} at ${Date()}`
    }
    if (title == "") {
      title = infoContent
    }
    labelText = "grade"
    fontSize = "16px"
    /*
        //icon = "rocket"
        animation = google.maps.Animation.DROP
    */

    let labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    // https://developers.google.com/maps/documentation/javascript/examples/marker-modern
    // https://material.angular.io/components/icon/overview
    //https://developers.google.com/fonts/docs/material_icons
    //https://fonts.google.com/icons
    if (lat && lng) {
      let dt = new Date();
      let time = `${Utility.zeroFill(dt.getHours(), 2)}:${Utility.zeroFill(dt.getMinutes(), 2)}:${Utility.zeroFill(dt.getSeconds(), 2)}` // :${Utility.zeroFill(dt.getMilliseconds(), 4)}`
      /* REVIEW:
       let lat:number = event.latLng.lat  // gets:  Type '() => number' is not assignable to type 'number'.
       let lng:number = event.latLng.lng
       lat = Math.round(lat * 1000.0) / 1000.0
       lng = Math.round(lng * 1000.0) / 1000.0
       let pos = `lat: ${lat}; lng: ${lng} `
       */
      let pos = `lat: ${lat}; lng: ${lng}`
      //let pos = `lat: ${ Math.round(Number(event.latLng.lat * 1000) / 1000}; lng: ${ Math.round(Number(event.latLng.lng) * 1000) / 1000 } `

      this.log.excessive("addMarker(G) Actually adding marker now...", this.id)

      let m = new google.maps.Marker({
        draggable: true,
        animation: animation,
        map: this.gMap,
        position: { lat: lat, lng: lng },
        title: title,
        icon: icon,
        label: {
          // label: this.labels[this.labelIndex++ % this.labels.length],
          text: labelText, // https://fonts.google.com/icons: rocket, join_inner, noise_aware, water_drop, etc.
          fontFamily: "Material Icons",
          color: labelColor,

          fontSize: fontSize,
        },
        // label: labels[labelIndex++ % labels.length],
      })

      // markers can only be keyboard focusable when they have click listeners
      // open info window when marker is clicked
      // marker.addListener("click", () => {
      //this.infoWindow.setContent(label);
      //this.infoWindow.open(this.gMap, marker);
      // })

      m.addListener("click",   // this.toggleBounce)
        () => {
          //this.infowindow.setContent(`${ SpecialMsg } `)
          //`Manually dropped: ${time} at ${pos} `
          this.infowindow.setContent(infoContent)
          this.infowindow.open({
            // new google.maps.InfoWindow.open({
            //content: 'How now red cow.',
            anchor: m,
            //setPosition: event.latLng,
            //map: this.gMap,
            // shouldFocus: false,
          })
        }
      )
      //this.markerPositions.push(latLng.toJSON()); evil angular wrapper

      // Drop each marker - potentially with a bit of delay to create an anination effect
      //window.setTimeout(() => {

      this.markers.push(m)

      //}, msDelay)

    } else {
      this.log.error("event.latLng is BAD; can not add marker..", this.id)
    }
    //this.refreshMarkerDisplay()
  }


  // -----------------------------------------------------------
  // Buttons
  // consider: https://developers.google.com/maps/documentation/javascript/examples/control-custom-state
  // https://developers.google.com/maps/documentation/javascript/examples/split-map-panes

  // or on centerChanged
  logCenter() {
    this.log.verbose(`Map center is at ${JSON.stringify(this.ngMap.getCenter())}`, this.id)
  }


  toggleTrafficLayer() {
    this.trafficLayer.setMap(
      (this.trafficLayerVisible ^= 1) ? this.gMap : null) // toggle trafficLayerVisible to 0 or 1
    // map.setTilt(45);
    this.log.info(`TrafficLayer made ${this.trafficLayerVisible ? 'visible' : 'hidden'}`, this.id)
  }
}
