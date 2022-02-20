/// <reference types="@types/google.maps" />

import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'
import { MatIconModule } from '@angular/material/icon'
import { Component, ElementRef, Inject, OnInit, ViewChild, NgZone } from '@angular/core';
import { DOCUMENT, JsonPipe } from '@angular/common';
import { ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

//import { MarkerClusterer } from "@google-maps/markerclusterer";
import { SettingsService, FieldReportService, FieldReportType, FieldReportStatusType } from '../shared/services';
import { Map, CodeArea, OpenLocationCode, Utility } from '../shared/'
//import { LatLng, latLng } from 'leaflet';

/*
  https://developers.google.com/maps/support/
  https://angular-maps.com/
  https://github.com/atmist/snazzy-info-window#html-structure
  https://angular-maps.com/api-docs/agm-core/interfaces/lazymapsapiloaderconfigliteral
  https://stackblitz.com/edit/angular-google-maps-demo
  https://github.com/googlemaps/js-markerclusterer
  https://github.com/angular-material-extensions/google-maps-autocomplete

   https://developers.google.com/maps/documentation/javascript/using-typescript
 TODO: https://github.com/angular/components/tree/master/src/google-maps/map-marker-clusterer
 https://github.com/timdeschryver/timdeschryver.dev/blob/main/content/blog/google-maps-as-an-angular-component/index.md
 TODO: Allow geocoding: https://rapidapi.com/blog/google-maps-api-react/

 https://timdeschryver.dev/blog/google-maps-as-an-angular-component
 Option doc: https://developers.google.com/maps/documentation/javascript/reference/map#MapOptions


GoogleMapsModule exports three components that we can use:
- GoogleMap: this is the wrapper around Google Maps, available via the google-map selector
- MapMarker: used to add markers on the map, available via the map-marker selector
- MapInfoWindow: the info window of a marker, available via the map-info-window selector
*/

declare const google: any

// const kaanapali: google.maps.LatLngLiteral = { lat: 20.9338, lng: -156.7168 }
// const kahanaRidge: google.maps.LatLngLiteral = { lat: 20.973375, lng: -156.664915 }
// const vashon: google.maps.LatLngLiteral = { lat: 47.4471, lng: -122.4627 }

let marker: google.maps.Marker

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
  // markerOptions = { draggable: false }
  // label = 'RangerTrak Label'

  labelIndex = 0;
  // infoContent = ''
  apiLoaded //: Observable<boolean>

  // next 2 even used?
  circleCenter: google.maps.LatLngLiteral = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng }  // this.Vashon// kahanaRidge
  radius = 10;

  fieldReports?: FieldReportType[]

  constructor(
    private settingsService: SettingsService,
    private fieldReportService: FieldReportService,
    private httpClient: HttpClient,
    @Inject(DOCUMENT) private document: Document) {

    this.fieldReportService = fieldReportService
    this.zoom = SettingsService.Settings.defZoom
    this.zoomDisplay = SettingsService.Settings.defZoom
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
    /*
    navigator.geolocation.getCurrentPosition((position) => {
      this.center = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
    })
    */

    // gMap is still null...
  }

  onMapInitialized(mappy: google.maps.Map) {
    console.log(`onMapInitialized()`)
    this.gMap = mappy

    this.displayAllMarkers()
    // REVIEW: Doesn't work with NO Markers?
    console.log(`Setting G map Center= lat:${SettingsService.Settings.defLat}, lng: ${SettingsService.Settings.defLng}, zoom: ${SettingsService.Settings.defZoom}`)
    this.gMap.setCenter({ lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng })
    this.gMap.setZoom(SettingsService.Settings.defZoom)
    this.fitBounds() // typically obviates the above set Center/Zoom


    const OVERVIEW_DIFFERENCE = 5
    const OVERVIEW_MIN_ZOOM = 5
    const OVERVIEW_MAX_ZOOM = 16
    // https://developers.google.com/maps/documentation/javascript/examples/inset-map
    // instantiate the overview map without controls
    this.overviewGMap = new google.maps.Map(
      document.getElementById("overview") as HTMLElement,
      {
        ...this.mapOptions,
        disableDefaultUI: true,
        gestureHandling: "none",
        zoomControl: false,
        mapTypeId: 'terrain', // 'roadmap' https://developers.google.com/maps/documentation/javascript/maptypes
      }
    );

    this.overviewGMap!.addListener("click", () => {
      let mapId = this.overviewMapType.cur++ % 4
      this.overviewGMap!.setMapTypeId(this.overviewMapType.types.type[mapId])
      console.log(`Overview map set to ${this.overviewMapType.types.type[mapId]}`)
    })

    // const infowindow = new google.maps.InfoWindow({
    //   content: "Mouse location...",
    //   position: { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng },
    // })
    //infowindow.open(this.overviewGMap);

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
  }

  clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
  }

  fitBounds() {
    this.fieldReportService.recalcFieldBounds()
    let bound = this.fieldReportService.getFieldReportBound()
    //console.log(`Fitting bounds= :${JSON.stringify(bound)}`)
    this.gMap?.fitBounds({ south: bound.south, west: bound.west, north: bound.north, east: bound.east }) //SW, NE)
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

  addManualMarkerEvent(event: google.maps.MapMouseEvent) {
    if (SettingsService.Settings.allowManualPinDrops) {
      if (event.latLng) {
        this.addMarker(event.latLng)
      } else {
        console.log(`addMarker FAILED`)
      }
    }
  }

  addMarker(latLng: google.maps.LatLng, infoContent = "", labelText = "grade", title = "", labelColor = "aqua", fontSize = "18px", icon = "", animation = google.maps.Animation.DROP) {
    console.log(`addMarker`)

    if (infoContent == "") {
      infoContent = `Manual Marker dropped ${JSON.stringify(latLng)} at ${new Date()}`
    }
    if (title == "") {
      title = infoContent
    }
    labelText = "grade"

    fontSize = "20px"
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
        map: this.gMap,
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
            map: this.gMap,
            // shouldFocus: false,
          })
        }
      )
      this.markers.push(m)
    } else {
      console.log("event.latLng is BAD; can not add marker..")
    }
    //this.refreshMarkerDisplay()
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
    this.fieldReports = this.fieldReportService.getFieldReports()
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
      this.addMarker(latlng, title, labelText, title, labelColor, "28px", icon)
    }

    console.log(`displayAllMarkers added ${this.fieldReports.length} markers`)

    //   addMarker(latLng: google.maps.LatLng, infoContent = "InfoWindow Content", labelText = "grade", title = "RangerTitle", labelColor = "#ffffff", fontSize = "18px", icon = "rocket", animation = google.maps.Animation.DROP)
    // addMarker(latLng: google.maps.LatLng, infoContent = "InfoWindow Content", labelText= "grade", title="RangerTitle", labelColor = "#ffffff", fontSize="18px", icon = "rocket", animation= google.maps.Animation.DROP) {
  }

  onMapMouseMove(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.mouseLatLng = event.latLng.toJSON()
    }
  }

  addTrafficLayer() {
    /*
      MapTypes:
      roadmap - displays the default road map view. This is the default map type.
      satellite - displays Google Earth satellite images.
      hybrid - displays a mixture of normal and satellite views.
      terrain - displays a physical map based on terrain information.
    */
    console.log(`addTrafficLayer(): this.map: ${this.map} `)
    console.log(`addTrafficLayer(): this.map.center: ${this.map.center} `)
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(this.gMap);

    // https://developers.google.com/maps/documentation/javascript/maptypes
    // map.setTilt(45);
  }


  // ---------------------------------------------------------------------------------------------------
  // Google PlusCodes: Open Location Code
  // https://github.com/tspoke/typescript-open-location-code
  // https://github.com/google/open-location-code




}


/*


markerDragEnd(m: marker, $event: google.maps.MouseEvent) {
  console.log('dragEnd', m, $event);
  this.latitude = $event.latLng.lat();
  this.longitude = $event.latLng.lng();
  this.getAddress(this.latitude, this.longitude);
}
  markerDragEnd2($event: google.maps.MouseEvent) {
    console.log($event);
    this.lat = $event.coords.lat;
    this.lng = $event.coords.lng;
    this.getAddress(this.latitude, this.longitude);
  }
  */
    // TODO: Add a marker clusterer to manage the markers.
    // new MarkerClusterer({ markers, map });


