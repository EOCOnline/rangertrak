/// <reference types="@types/google.maps" />
import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'
import { MatIconModule, SafeResourceUrlWithIconOptions } from '@angular/material/icon'
import { Component, ElementRef, Inject, OnInit, ViewChild, NgZone } from '@angular/core'
import { DOCUMENT, JsonPipe } from '@angular/common'
import { ComponentFixture } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
//import { catchError, map, Observable, of } from 'rxjs'
import * as GMC from "@googlemaps/markerclusterer"
import { SettingsService, FieldReportService, FieldReportType, FieldReportStatusType } from '../shared/services'
import { Map, CodeArea, OpenLocationCode, Utility } from '../shared/'
import { MDCSwitch } from '@material/switch'

/*
  https://developers.google.com/maps/support/
  https://angular-maps.com/
  https://github.com/atmist/snazzy-info-window#html-structure
  https://angular-maps.com/api-docs/agm-core/interfaces/lazymapsapiloaderconfigliteral
 https://github.com/timdeschryver/timdeschryver.dev/blob/main/content/blog/google-maps-as-an-angular-component/index.md
 TODO: Allow geocoding: https://rapidapi.com/blog/google-maps-api-react/
 Option doc: https://developers.google.com/maps/documentation/javascript/reference/map#MapOptions

GoogleMapsModule exports three components that we can use:
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
export class GmapComponent implements OnInit {    //extends Map

  // Keep reference to map component, w/ @ViewChild decorator, allows:
  // https://github.com/timdeschryver/timdeschryver.dev/blob/main/content/blog/google-maps-as-an-angular-component/index.md#methods-and-getters
  // https://angular.io/api/core/ViewChild
  // next line provides this.map!
  //@ViewChild(google.maps.Map, { static: false }) map!: google.maps.Map
  //@ViewChild(google.maps.InfoWindow, { static: false }) info!: google.maps.InfoWindow //| undefined
  // following was in https://github.com/timdeschryver/timdeschryver.dev/blob/main/content/blog/google-maps-as-an-angular-component/index.md#mapinfowindow
  // also: https://github.com/angular/components/blob/master/src/google-maps/google-map/README.md &
  // https://stackblitz.com/edit/angular-9-google-maps-5v2cu8?file=src%2Fapp%2Fapp.component.ts


  @ViewChild(GoogleMap, { static: false }) map!: GoogleMap // even needed?
  @ViewChild(MapInfoWindow, { static: false }) infoWindow!: MapInfoWindow

  // items for template
  title = 'Google Map'
  mouseLatLng?: google.maps.LatLngLiteral;
  //Vashon = new google.maps.LatLng(47.4471, -122.4627)
  //Kaanapali = new google.maps.LatLng(20.9338, -156.7168)

  // google.maps.Map is NOT the same as GoogleMap...
  gMap?: google.maps.Map
  overviewGMap?: google.maps.Map
  overviewMapType = { cur: 0, types: { type: ['roadmap', 'terrain', 'satellite', 'hybrid',] } }
  // overviewGMapOptions: google.maps.MapOptions
  // items for <google-map>
  zoom // actual zoom level of main map
  zoomDisplay // what's displayed below main map
  center: google.maps.LatLngLiteral
  trafficLayer = new google.maps.TrafficLayer()
  trafficLayerVisible = 0
  usingSelectedFieldReports = false
  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: true,
    mapTypeId: 'hybrid',
    zoom: 17,
    maxZoom: 21,
    minZoom: 4,
    draggableCursor: 'crosshair', //https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
    //heading: 90,
  }

  infowindow = new google.maps.InfoWindow({
    maxwidth: "150px",
  });

  // Google MapMarker only wraps google.maps.LatLngLiteral (positions) - NOT google.maps.Marker: styles, behaviors, etc
  markers: google.maps.Marker[] = []
  markerCluster!: GMC.MarkerClusterer
  // markerPositions: google.maps.LatLngLiteral[] angular brain-dead wrapper
  markerClustererImagePath =
    'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m';
  // markerOptions = { draggable: false }
  // label = 'RangerTrak Label'

  labelIndex = 0;
  // infoContent = ''
  apiLoaded //: Observable<boolean>

  // next 2 even used?
  circleCenter: google.maps.LatLngLiteral = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng }
  radius = 10;

  fieldReports: FieldReportType[] = []
  //selectedFieldReports: FieldReportType[] = []
  filterSwitch: MDCSwitch | null = null
  filterButton: HTMLButtonElement | null = null

  constructor(
    private settingsService: SettingsService,
    private fieldReportService: FieldReportService,
    private httpClient: HttpClient,
    @Inject(DOCUMENT) private document: Document) {

    this.fieldReportService = fieldReportService
    this.zoom = SettingsService.Settings.defZoom
    this.zoomDisplay = SettingsService.Settings.defZoom

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

    this.center = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng }
    // this.circleCenter: google.maps.LatLngLiteral = {lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng};
    // https://github.com/angular/components/tree/master/src/google-maps
    // this.apiLoaded = httpClient.jsonp(`https://maps.googleapis.com/maps/api/js?key=${SettingsService.secrets[3].key}`, 'callback')
    this.apiLoaded = true
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
  }

  apiLoadedCallbackUNUSED() {
    console.log("got apiLoadedCallback()")
  }

  ngOnInit(): void {
    console.log('into ngOnInit()')

    // https://developers.google.com/maps/documentation/geolocation/overview Works - if you want map zoomed on user's device...
    // navigator.geolocation.getCurrentPosition((position) => {
    //   this.center = {
    //     lat: position.coords.latitude,
    //     lng: position.coords.longitude
    //   }
    // })

    // gMap is still null...

    this.filterButton = document.querySelector('#selectedFieldReports') as HTMLButtonElement
    if (!this.filterButton) { throw ("Could not find gMap Selection button!") }

    this.filterSwitch = new MDCSwitch(this.filterButton)
    if (!this.filterSwitch) throw ("Could not find gMap Selection Switch!")
  }

  onMapInitialized(mappy: google.maps.Map) {
    console.log(`onMapInitialized()`)
    this.gMap = mappy
    /* TODO: Emit update for subscribers: instead of always reloading at init stage...
        this.fieldReports = this.fieldReportService.getFieldReports().valueChanges.subscribe(x => {
          console.log(`Subscription to location got: ${x}`);
        })
        */
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

    console.log(`Setting G map Center= lat:${SettingsService.Settings.defLat}, lng: ${SettingsService.Settings.defLng}, zoom: ${SettingsService.Settings.defZoom}`)
    this.gMap.setCenter({ lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng })
    this.gMap.setZoom(SettingsService.Settings.defZoom)
    this.fitBounds() // typically obviates the above set Center/Zoom

    // Overview map: https://developers.google.com/maps/documentation/javascript/examples/inset-map
    const OVERVIEW_DIFFERENCE = 6
    const OVERVIEW_MIN_ZOOM = 5
    const OVERVIEW_MAX_ZOOM = 16
    this.overviewGMap = new google.maps.Map(
      document.getElementById("overview") as HTMLElement,
      {
        ...this.mapOptions,
        disableDefaultUI: true,
        gestureHandling: "none",
        zoomControl: false,
        mapTypeId: 'terrain',
      }
    );

    // cycle through map types when map is clicked
    this.overviewGMap!.addListener("click", () => {
      let mapId = this.overviewMapType.cur++ % 4
      this.overviewGMap!.setMapTypeId(this.overviewMapType.types.type[mapId])
      console.log(`Overview map set to ${this.overviewMapType.types.type[mapId]}`)
    })

    this.overviewGMap!.addListener("mousemove", ($event: any) => { // TODO: Only do while mouse is over map for efficiency?!
      if (this.zoomDisplay && this.overviewGMap) {
        this.zoomDisplay = this.overviewGMap.getZoom()!
      }
      if ($event.latLng) {
        this.mouseLatLng = $event.latLng.toJSON()
      }
      //console.log(`Overview map at ${JSON.stringify(this.mouseLatLng)}`)
      //infowindow.setContent(`${JSON.stringify(latlng)}`)
    })

    this.gMap!.addListener("bounds_changed", () => {
      this.overviewGMap!.setCenter(this.gMap!.getCenter()!);
      this.overviewGMap!.setZoom(
        this.clamp(
          this.gMap!.getZoom()! - OVERVIEW_DIFFERENCE,
          OVERVIEW_MIN_ZOOM,
          OVERVIEW_MAX_ZOOM
        )
      );
    })

    // const infowindow = new google.maps.InfoWindow({
    //   content: "Mouse location...",
    //   position: { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng },
    // })
    //infowindow.open(this.overviewGMap);

  }

  clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
  }

  /**
   * Fit map bounds to all field reports (above a minimum size)
   *
   */

  fitBounds() {
    this.fieldReportService.recalcFieldBounds()
    let bound = this.fieldReportService.getFieldReportBound()
    //console.log(`Fitting bounds= :${JSON.stringify(bound)}`)
    this.gMap?.fitBounds({ south: bound.south, west: bound.west, north: bound.north, east: bound.east }) //SW, NE)
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
    if (SettingsService.Settings.allowManualPinDrops) {
      if (event.latLng) {
        this.addMarker(event.latLng)
      } else {
        console.log(`addMarker FAILED`)
      }
    }
  }

  getAndDisplayFieldReports() {
    if (!this.filterSwitch || !this.filterSwitch.selected) {
      this.fieldReports = this.fieldReportService.getFieldReports()
      console.log(`Displaying ALL ${this.fieldReports.length} field Reports`)

    } else {
      this.fieldReports = this.fieldReportService.getSelectedFieldReports()
      console.log(`Displaying ${this.fieldReports.length} SELECTED field Reports`)
    }
    this.displayAllMarkers()
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

  displayAllMarkers() {
    let latlng
    //let infoContent
    let labelText
    let title
    let icon
    let labelColor
    let fr: FieldReportType

    let fieldReportStatuses: FieldReportStatusType[] = this.settingsService.getFieldReportStatuses()
    // REVIEW: Might this mess with existing fr's?
    console.log(`displayAllMarkers got ${this.fieldReports.length} field reports`)
    for (let i = 0; i < this.fieldReports.length; i++) {
      fr = this.fieldReports[i]
      latlng = new google.maps.LatLng(fr.lat, fr.lng)
      title = `${fr.callsign} (${fr.status}) at ${fr.date} at lat ${fr.lat}, lng ${fr.lng} with "${fr.note}".`
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

      console.log(`displayAllMarkers adding marker #${i} at ${JSON.stringify(latlng)} with ${labelText}, ${title}, ${labelColor}`)
      this.addMarker(latlng, title, labelText, title, labelColor, "28px", icon,)
    }

    console.log(`displayAllMarkers added ${this.fieldReports.length} markers`)
  }

  addMarker(latLng: google.maps.LatLng, infoContent = "", labelText = "grade", title = "", labelColor = "aqua", fontSize = "12px", icon = "", animation = google.maps.Animation.DROP) {
    console.log(`addMarker`)

    if (infoContent == "") {
      infoContent = `Manual Marker dropped ${JSON.stringify(latLng)} at ${new Date()}`
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
    if (latLng) {
      let dt = new Date();
      let time = `${Utility.zeroFill(dt.getHours(), 2)}:${Utility.zeroFill(dt.getMinutes(), 2)}:${Utility.zeroFill(dt.getSeconds(), 2)}` // :${Utility.zeroFill(dt.getMilliseconds(), 4)}`
      /* REVIEW:
       let lat:number = event.latLng.lat  // gets:  Type '() => number' is not assignable to type 'number'.
       let lng:number = event.latLng.lng
       lat = Math.round(lat * 1000.0) / 1000.0
       lng = Math.round(lng * 1000.0) / 1000.0
       let pos = `lat: ${lat}; lng: ${lng} `
       */
      let pos = `lat: ${latLng.lat}; lng: ${latLng.lng}`
      //let pos = `lat: ${ Math.round(Number(event.latLng.lat * 1000) / 1000}; lng: ${ Math.round(Number(event.latLng.lng) * 1000) / 1000 } `

      console.log("Actually adding marker now...")
      let m = new google.maps.Marker({
        draggable: true,
        animation: animation,
        // map: this.gMap,
        position: latLng,
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
      //this.infoWindow.open(this.map, marker);
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

      this.markers.push(m)
    } else {
      console.log("event.latLng is BAD; can not add marker..")
    }
    //this.refreshMarkerDisplay()
  }

  onMapMouseMove(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.mouseLatLng = event.latLng.toJSON()
    }
  }

  // -----------------------------------------------------------
  // Buttons
  // consider: https://developers.google.com/maps/documentation/javascript/examples/control-custom-state
  // https://developers.google.com/maps/documentation/javascript/examples/split-map-panes

  // or on centerChanged
  logCenter() {
    console.log(`Map center is at ${JSON.stringify(this.map.getCenter())}`)
  }

  zoomed() {
    if (this.zoom && this.gMap) {
      this.zoom = this.gMap.getZoom()!
      this.zoomDisplay = this.gMap.getZoom()!
    }
  }

  toggleTrafficLayer() {
    this.trafficLayer.setMap(
      (this.trafficLayerVisible ^= 1) ? this.gMap : null) // toggle trafficLayerVisible to 0 or 1
    // map.setTilt(45);
    console.log(`TrafficLayer made ${this.trafficLayerVisible ? 'visible' : 'hidden'}`)
  }
}
