/// <reference types="@types/google.maps" />

import { DOCUMENT, JsonPipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { GoogleMap } from '@angular/google-maps'
import { MarkerClusterer } from '@googlemaps/markerclusterer'

import { Utility } from '../shared/'
import { AbstractMap } from '../shared/'
import { Map } from '../shared/mapping/map.interface';
import {
  FieldReportService, FieldReportStatusType, FieldReportType, LogService,
  SettingsService
} from '../shared/services'

/*
google-maps: OLD
google.maps: BEST

GoogleMapsModule (their Angular wrapper) exports three components that we can use:
- GoogleMap: this is the wrapper around Google Maps, available via the google-map selector
- MapMarker: used to add markers on the map, available via the map-marker selector
- MapInfoWindow: the info window of a marker, available via the map-info-window selector

@google/markerclusterer: OLD
@googlemaps/markerclustererplus: OLD
@googlemaps/markerclusterer: BEST

  https://googlemaps.github.io/js-markerclusterer/
  https://developers.google.com/maps/support/
  https://angular-maps.com/
  https://github.com/atmist/snazzy-info-window#html-structure // Customizable google map info windows
  https://angular-maps.com/api-docs/agm-core/interfaces/lazymapsapiloaderconfigliteral
 https://github.com/timdeschryver/timdeschryver.dev/blob/main/content/blog/google-maps-as-an-angular-component/index.md
 TODO: Allow geocoding: https://rapidapi.com/blog/google-maps-api-react/
 Option doc: https://developers.google.com/maps/documentation/javascript/reference/map#MapOptions

 per https://stackoverflow.com/a/44339169/18004414
 https://developers.google.com/maps/documentation/javascript/overview supports client-side usage
 https://console.cloud.google.com/google/maps-apis/ does *NOT* support client side usage?!
*/

declare const google: any // declare tells compiler "this variable exists (from elsewhere) & can be referenced by other code. There's no need to compile this statement"
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
  /** Details:
   * https://github.com/timdeschryver/timdeschryver.dev/blob/main/content/blog/google-maps-as-an-angular-component/index.md#methods-and-getters
   * https://github.com/angular/components/blob/master/src/google-maps/google-map/README.md
   * https://stackblitz.com/edit/angular-9-google-maps-5v2cu8?file=src%2Fapp%2Fapp.component.ts
   */

  public override id = 'Google Map Component'
  public override title = 'Google Map'
  public override pageDescr = 'Google Map'

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
    // If stored in settings, could reset it in onMapInitialized(), also allows 'terrain'
    mapTypeId: google.maps.MapTypeId.TERRAIN,  // https://developers.google.com/maps/documentation/javascript/maptypes
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
  markerCluster!: MarkerClusterer
  // markerPositions: google.maps.LatLngLiteral[] angular brain-dead wrapper
  markerClustererImagePath =
    'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m';
  // markerOptions = { draggable: false }
  // label = 'RangerTrak Label'

  labelIndex = 0;
  // infoContent = ''
  apiLoaded //: Observable<boolean> // used by template

  iconBase = "./../../../assets/icons/"


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
    //! Also gMap not set yet!
    // this.initMainMap()

    this.log.excessive("done with ngOnInit()", this.id)

  }

  // ---------------- Init Main Map -----------------
  /**
   *
   * @returns
   */
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



    if (this.gMap) {
      /*
      ERROR TypeError: Cannot read properties of undefined (reading 'setCenter')
      at GmapComponent.initMainMap (gmap.component.ts:237:15)
      */

      this.gMap.setCenter({ lat: this.settings ? this.settings.defLat : 0, lng: this.settings ? this.settings.defLng : 0 })
      this.gMap.setZoom(this.settings ? this.settings.google.defZoom : 15)
      this.gMap.fitBounds(this.fieldReportService.boundsToBound(this.fieldReports!.bounds))
      //      this.gMap.setMapTypeId("roadmap")
      //this.gMap.setMapTypeId('terrain')
    } else {
      this.log.error(`initMainMap(): this.gMap NOT INitialized yet! `, this.id)
    }
  }

  /**
   *
   * @param mappy
   */
  // this.ngMap: GoogleMap (Angular wrapper for the same underlying map!)
  // this.gMap: google.maps.Map (JavaScript core map) - made available in onMapInitialized()
  onMapInitialized(mappy: google.maps.Map) {
    this.log.verbose(`onMapInitialized()`, this.id)

    // This event is ONLY registered for the main map, not overview
    this.gMap = mappy
    // Listen in on mouse moves/zooms
    this.captureGMoveAndZoom(this.gMap)
    if (this.displayReports) {
      // gets: core.mjs:6485 ERROR TypeError: bounds.getEast is not a function at FieldReportService.boundsToBound (field-report.service.ts:193:56)
      // this.gMap.fitBounds(this.fieldReportService.boundsToBound(this.fieldReports!.bounds))

      // https://github.com/googlemaps/js-markerclusterer
      // https://newbedev.com/google-markerclusterer-decluster-markers-below-a-certain-zoom-level
      this.markerCluster = new MarkerClusterer({
        map: this.gMap,
        markers: this.markers,
        // algorithm?: Algorithm,
        // renderer?: Renderer,
        // onClusterClick?: onClusterClickHandler,
      })

      this.getAndDisplayFieldReports() // REVIEW: Works with NO Markers?


      //  this.log.excessive("into updateFieldReports()", this.id)

      this.updateFieldReports()

    }
    /* TODO: Emit update for subscribers: instead of always reloading at init stage...
        this.fieldReportArray = this.fieldReportService.getFieldReports().valueChanges.subscribe(x => {
          this.log.verbose(`Subscription to location got: ${x}`, this.id)
        })
        */
  }

  /**
   *
   * @param mappy
   */
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


  apiLoadedCallbackUNUSED() {
    this.log.verbose("got apiLoadedCallback()", this.id)
    this.apiLoaded = true
  }

  // -----------------------------------  Markers  --------------------------------------


  // !REVIEW: Need to explicitly set each marker to null? https://developers.google.com/maps/documentation/javascript/markers#remove
  override clearMarkers() {
    this.markers = []
  }

  // --------------------------------  displayMarkers  ------------------------------
  /**
   *
   */
  // https://developers.google.com/maps/documentation/javascript/markers#marker_labels
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

      // !TODO: Add filters: Only show selected teams, for last hours:minutes, with status XYZ,
      // or assume any selection/filtering in the Reports page...

      fr = this.fieldReportArray[i]
      latlng = new google.maps.LatLng(fr.location.lat, fr.location.lng)
      title = `${fr.callsign} (${fr.status}) at ${fr.date} at lat ${fr.location.lat}, lng ${fr.location.lng} with "${fr.notes}".`
      //title = infoContent

      //! TODO: Provide a better icon generating mechanism...available via Dependency Injection/service?!
      labelText = fr.callsign

      for (let j = 0; j < fieldReportStatuses.length; j++) {
        if (fieldReportStatuses[j].status != fr.status) continue
        icon = fieldReportStatuses[j].icon
        labelColor = fieldReportStatuses[j].color
        break
      }

      // this.log.excessive(`displayMarkers adding marker #${i} at ${JSON.stringify(latlng)} with ${labelText}, ${title}, ${labelColor}`, this.id)

      this.addMarker(latlng.lat(), latlng.lng(), title, labelText, title, labelColor, "14px", icon)
    }

    // this.showMarkers() //! This directly adds to map - not in clusters...
    this.markerCluster.addMarkers(this.markers)

    this.log.verbose(`displayMarkers added ${this.fieldReportArray.length} markers`, this.id)
  }


  // --------------------------------  addMarker  ------------------------------
  /**
   *
   * @param lat
   *
   * @param lng\u\0\calls
   * @param infoContent
   * @param labelText
   * @param title
   * @param labelColor
   * @param fontSize
   * @param icon
   * @param animation
   * @param msDelay
   */
  override addMarker(lat: number, lng: number, infoContent = "", labelText = "", title = "", labelColor = "aqua", fontSize = "8px", icon = "unpublished_FILL0_wght400_GRAD0_opsz48.png", animation = google.maps.Animation.DROP, msDelay = 100) {

    //this.log.excessive(`addMarker`, this.id)

    if (infoContent == "") {
      infoContent = `Manual Marker dropped ${lat}, ${lng} at ${Date()}`
    }
    /*  Somehow this breaks following code!!!
        let myIcon5 = new google.maps.Icon({
          url: this.iconBase + icon,
          anchor: new google.maps.Point(5, 5),
        })
        */

    // https://developers.google.com/maps/documentation/javascript/examples/marker-symbol-custom
    const svgMarker = {
      //url: this.iconBase + icon,
      path: "M10.453 14.016l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM12 2.016q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
      fillColor: "blue",
      fillOpacity: 0.7,
      strokeWeight: 0,
      rotation: 0,
      scale: 2,
      //anchor: new google.maps.Point(5, 0),
    };


    // https://developers.google.com/maps/documentation/javascript/examples/marker-modern
    // https://material.angular.io/components/icon/overview
    // https://developers.google.com/fonts/docs/material_icons
    // https://fonts.google.com/icons
    if (lat && lng) {
      let time = Utility.time()

      // https://developers.google.com/maps/documentation/javascript/reference/marker
      let m = new google.maps.Marker({
        // draggable: true,
        animation: animation,
        // map: this.gMap,
        position: { lat: lat, lng: lng },
        title: infoContent, // Hover/Rollover text

        // https://developers.google.com/maps/documentation/javascript/reference/marker#Icon
        // icon: this.iconBase + icon,  // works
        icon: svgMarker, // works
        // icon: google.maps.SymbolPath.CIRCLE,  // gets ignored

        icon_BROKEN: {  // gets ignored
          // from: https://jsfiddle.net/geocodezip/voeqsw6j/
          // & https://stackoverflow.com/questions/34001414/google-maps-api-v-3-changing-the-origin-of-custom-marker-icon
          //path: this.iconBase + icon,
          //url: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          labelOrigin: new google.maps.Point(10, 30),
          //strokeColor: myPoint.color,
          //fillColor: myPoint.color,
          fillOpacity: 0.6,
          scale: this.gMap.getZoom()! / 2,
          strokeWeight: this.gMap.getZoom()! / 3,
          //rotation: myPoint.heading,
        },

        label: {
          // https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel
          //! BUG: a letter or number that appears inside a marker: We're putting a phrase in!!!
          // anchor: new google.maps.Point(50, 50),
          //labelOrigin: new google.maps.Point(0, 0),
          // origin: new google.maps.Point(5, 20), // refocuses map on this point, if set to lat/lng, not 100/200!
          // scaledSize: new google.maps.Size(50, 50),
          // label: this.labels[this.labelIndex++ % this.labels.length],
          text: labelText, // shows up along with icon
          // https://fonts.google.com/icons: rocket, join_inner, noise_aware, water_drop, etc.
          fontFamily: 'Jacques Francois Shadow', // 'Tourney', //"Material Icons",
          color: labelColor,
          fontSize: fontSize,
          //fontWeight: "bold",
        },
      })

      // infoWindow = tooltips
      m.addListener("click",   // this.toggleBounce)
        () => {
          //this.infowindow.setContent(`${ SpecialMsg } `)
          //`Manually dropped: ${ time } at ${ pos } `
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


  /**
   *
   *
   * https://github.com/googlemaps/js-markerclusterer - current!
   * https://github.com/angular/components/tree/master/src/google-maps/map-marker-clusterer -
   * Angular components doesn't encapulate options functionality: identical clones only: ugg.
   * MarkerClustererPlus Library - also old
  */
  refreshMap() {

    if (this.gMap) {
      //this.gMap.clear()
      // google.maps.event.trigger(this.gMap, 'resize');
      // this.gMap.setZoom(map.getZoom());
      this.gMap.panBy(0, 0);
    } else {
      this.log.warn(`ResetMap called, but gMap not created yet!`, this.id)
    }
    /*
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
        */
  }

  /**
   *
   * @param event
   */
  addManualMarkerEvent(event: google.maps.MapMouseEvent) {
    if (this.settings!.allowManualPinDrops) {
      if (event.latLng) {
        this.addMarker(event.latLng.lat(), event.latLng.lng(), `Manual Marker dropped ${event.latLng.lat}, ${event.latLng.lng} at ${Date()}`)
      } else {
        this.log.error(`addManualMarkerEvent: no latlng`, this.id)
      }
    }
  }

  /**
   *
   */
  override onSwitchSelectedFieldReports() {
    super.onSwitchSelectedFieldReports()
    this.log.excessive(`onSwitchSelectedFieldReports()`, this.id)

    this.getAndDisplayFieldReports() // REVIEW: !!!!
  }

  /**
   *
   */
  getAndDisplayFieldReports() {
    super.onSwitchSelectedFieldReports()
    //this.onSwitchSelectedFieldReports()

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
    /*this.markerCluster = new MarkerClusterer({
      map: this.gMap,
      markers: this.markers,
      // algorithm?: Algorithm,
      // renderer?: Renderer,
      // onClusterClick?: onClusterClickHandler,
    })*/
  }

  // Removes the markers from the map, but keeps them in the array
  // https://developers.google.com/maps/documentation/javascript/markers#remove
  override hideMarkers(): void {
    this.markers.forEach((i) => i.setMap(null))
  }

  /**
   *
   * @returns
   */
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
    this.markerCluster.clearMarkers()
  }




  // -------------------------------  Buttons  ----------------------------

  // consider: https://developers.google.com/maps/documentation/javascript/examples/control-custom-state
  // https://developers.google.com/maps/documentation/javascript/examples/split-map-panes

  // or on centerChanged
  logCenter() {
    this.log.verbose(`Map center is at ${JSON.stringify(this.ngMap.getCenter())} `, this.id)
  }


  toggleTrafficLayer() {
    this.trafficLayer.setMap(
      (this.trafficLayerVisible ^= 1) ? this.gMap : null) // toggle trafficLayerVisible to 0 or 1
    // map.setTilt(45);
    this.log.info(`TrafficLayer made ${this.trafficLayerVisible ? 'visible' : 'hidden'} `, this.id)
  }
}
