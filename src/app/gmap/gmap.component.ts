/// <reference types="@types/google.maps" />

import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'
import { MatIconModule } from '@angular/material/icon'
import { Component, ElementRef, Inject, OnInit, ViewChild, NgZone } from '@angular/core';
import { Map, CodeArea, OpenLocationCode, Utility } from '../shared/'
import { DOCUMENT, JsonPipe } from '@angular/common';
//import { MarkerClusterer } from "@google-maps/markerclusterer";
// import "./style.css";
import { SettingsService, FieldReportService, FieldReportType, FieldReportStatuses } from '../shared/services';
import { ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { LatLng } from 'leaflet';

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

const kaanapali: google.maps.LatLngLiteral = { lat: 20.9338, lng: -156.7168 }
const kahanaRidge: google.maps.LatLngLiteral = { lat: 20.973375, lng: -156.664915 }
const vashon: google.maps.LatLngLiteral = { lat: 47.4471, lng: -122.4627 }

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
  title = 'Google Map (implemented as an Angular Component)'
  display?: google.maps.LatLngLiteral;
  Vashon = new google.maps.LatLng(47.4471, -122.4627)
  Kaanapali = new google.maps.LatLng(20.9338, -156.7168)

  // google.maps.Map is NOT the same as GoogleMap...
  gMap?: google.maps.Map

  // items for <google-map>
  zoom
  center: google.maps.LatLngLiteral
  options: google.maps.MapOptions = {
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
  infoContent = ''
  apiLoaded //: Observable<boolean>

  // next 2 even used?
  circleCenter: google.maps.LatLngLiteral = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong }  // this.Vashon// kahanaRidge
  radius = 10;

  fieldReports?: FieldReportType[]

  constructor(
    private settingsService: SettingsService,
    private fieldReportService: FieldReportService,
    private httpClient: HttpClient,
    @Inject(DOCUMENT) private document: Document) {

    this.fieldReportService = fieldReportService
    this.zoom = SettingsService.Settings.defZoom
    // https://developers.google.com/maps/documentation/javascript/examples/map-latlng-literal
    // https://developers.google.com/maps/documentation/javascript/reference/coordinates

    this.center = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong }
    // this.circleCenter: google.maps.LatLngLiteral = {lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong};
    // https://github.com/angular/components/tree/master/src/google-maps
    // this.apiLoaded = httpClient.jsonp(`https://maps.googleapis.com/maps/api/js?key=${SettingsService.secrets[3].key}`, 'callback')
    this.apiLoaded = true
    /*
    httpClient.jsonp(`https://maps.googleapis.com/maps/api/js?key=AIzaSyDDPgrn2iLu2p4II4H1Ww27dx6pVycHVs4`, "callback")
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
    // https://developers.google.com/maps/documentation/geolocation/overview
    navigator.geolocation.getCurrentPosition((position) => {
      this.center = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
    })
    // https://github.com/angular/components/tree/master/src/google-maps
    if (this.map == null) {
      console.log("This.map is null")
    } else {
      console.log(`this.map zoom =${this.map.getZoom()}`)
    }
    // gMap is still null...
  }

  onMapInitialized(mappy: google.maps.Map) {
    console.log(`onMapInitialized()`)
    this.gMap = mappy

    /*
    if (this.gMap == null) {
      console.log("onMapInitialized(): This.gMap is null")
    } else {
      console.log(`onMapInitialized(): this.gMap zoom =${this.gMap.getZoom()}`)
    }
*/

    //  this.initZoomControl(this.gMap) gets...
    /* BUG:
    core.mjs:6461 ERROR TypeError: Cannot set properties of null (setting 'onclick')
      at GmapComponent.initZoomControl (gmap.component.ts:197:72)
      at GmapComponent.onMapInitialized (gmap.component.ts:177:10)
      at GmapComponent_div_26_Template_google_map_mapInitialized_1_listener (gmap.component.html:25:23)
      at executeListenerWithErrorHandling (core.mjs:14952:1)
      at Object.wrapListenerIn_markDirtyAndPreventDefault [as next] (core.mjs:14990:1)
      at Object.next (Subscriber.js:110:1)
      at SafeSubscriber._next (Subscriber.js:60:1)
      at SafeSubscriber.next (Subscriber.js:31:1)
      at Subject.js:31:1
      at errorContext (errorContext.js:19:1)
      */
    this.displayAllMarkers()
    // REVIEW: Doesn't work with NO Markers?
    console.log(`Setting Center= lat:${SettingsService.Settings.defLat}, lng: ${SettingsService.Settings.defLong}, zoom: ${SettingsService.Settings.defZoom}`)
    this.gMap.setCenter({ lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong })
    this.gMap.setZoom(SettingsService.Settings.defZoom)
    this.fitBounds()
  }

  fitBounds() {
    //let reportBounds = this.fieldReportService.getFieldReportBounds()
    //var southWest = new google.maps.LatLng(reportBounds, reportBounds.west);
    //var northEast = new google.maps.LatLng(reportBounds.north,reportBounds.east);
    //var bounds = new google.maps.LatLngBounds(southWest,northEast);
    this.fieldReportService.recalcFieldBounds()
    let bounds = this.fieldReportService.getFieldReportBounds()
    console.log(`Fitting bounds= :${JSON.stringify(bounds)}`)
    this.gMap?.fitBounds(bounds)
  }

  // -----------------------------------------------------------
  // Buttons
  // TODO: Use mouse wheel to control zoom? Unused currently...
  // consider: https://developers.google.com/maps/documentation/javascript/examples/control-custom-state
  // https://developers.google.com/maps/documentation/javascript/examples/split-map-panes
  // https://developers.google.com/maps/documentation/javascript/examples/inset-map

  /*
  // from https://developers.google.com/maps/documentation/javascript/examples/control-replacement
  initZoomControl(map: google.maps.Map) {
    console.log('starting initZoomControl()');
    // TODO: Doesn't work...

    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(
      document.querySelector(".zoom-control") as HTMLElement
    );

    (document.querySelector(".zoom-control-in") as HTMLElement).onclick =
      function () {
        map.setZoom(map.getZoom()! + 1);
      };

    (document.querySelector(".zoom-control-out") as HTMLElement).onclick =
      function () {
        map.setZoom(map.getZoom()! - 1);
      };
  }

  initZoomControl2() {
    if (this.gMap) {
      console.log('try initZoomControl()')
      this.initZoomControl(this.gMap)
    } else {
      console.log('gMap is null, so no initZoomControl()')
    }
  }

  zoomIn() {
    if (this.options.maxZoom != null) {
      if (this.zoom < this.options.maxZoom) this.zoom++
    }
  }

  zoomOut() {
    if (this.options.minZoom != null) {
      if (this.zoom > this.options.minZoom) this.zoom--
    }
  }
*/
  // or on centerChanged
  logCenter() {
    console.log(`Map center is at ${JSON.stringify(this.map.getCenter())}`)
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

  addMarker(latLng: google.maps.LatLng, infoContent = "", labelText = "grade", title = "", labelColor = "aqua", fontSize = "18px", icon = "rocket", animation = google.maps.Animation.DROP) {
    console.log(`addMarker`)

    if (infoContent == "") {
      infoContent = `Manual Marker dropped ${JSON.stringify(latLng)} at ${new Date()}`
    }
    if (title == "") {
      title = infoContent
    }
    labelText = "grade"
    //icon = "rocket"
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
       let pos = `lat: ${lat}; long: ${lng} `
       */
      let pos = `lat: ${latLng.lat}; long: ${latLng.lng}`
      //let pos = `lat: ${ Math.round(Number(event.latLng.lat * 1000) / 1000}; long: ${ Math.round(Number(event.latLng.lng) * 1000) / 1000 } `

      console.log("Actually adding marker now...")
      let m = new google.maps.Marker({
        draggable: true,
        animation: animation,
        map: this.gMap,
        position: latLng,
        title: title,
        //icon: icon, //"https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png",
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
    let infoContent
    let labelText
    let title
    let labelColor
    let fr: FieldReportType

    let FieldReportStatuses = ['None', 'Normal', 'Need Rest', 'Urgent', 'Objective Update', 'Check-in', 'Check-out'] // TODO: Grab it from FieldReportStatuses!!!
    // REVIEW: Might this mess with existing fr's?
    this.fieldReports = this.fieldReportService.getFieldReports()
    console.log(`displayAllMarkers got ${this.fieldReports.length} field reports`)
    for (let i = 0; i < this.fieldReports.length; i++) {
      fr = this.fieldReports[i]
      latlng = new google.maps.LatLng(fr.lat, fr.long)
      infoContent = `${fr.callsign} (${fr.status}) at ${fr.date} at lat ${fr.lat}, long ${fr.long} with "${fr.note}".`
      title = infoContent
      switch (fr.status) {
        case 'None': {
          labelText = "grade"
          labelColor = "pink"
          break
        }
        case 'Normal': {
          labelText = "water_drop"
          labelColor = "grey"
          break
        }
        case 'Need Rest': {
          labelText = "join_inner"
          labelColor = "orange"
          break
        }
        case 'Urgent': {
          labelText = "rocket"
          labelColor = "black"
          break
        }
        case 'Objective Update': {
          labelText = "noise_aware"
          labelColor = "blue"
          break
        }
        case 'Check-in': {
          labelText = "rowing"
          labelColor = "green"
          break
        }
        case 'Check-out': {
          labelText = "next_plan"
          labelColor = "yellow"
          break
        }
        default: {
          labelText = "question_mark"
          labelColor = "aqua"
          break
        }
      }
      console.log(`displayAllMarkers adding marker #${i} at ${JSON.stringify(latlng)} with ${labelText}, ${title}, ${labelColor}`)
      this.addMarker(latlng, infoContent, labelText, title, labelColor)
    }
    console.log(`displayAllMarkers added ${this.fieldReports.length} markers`)

    //   addMarker(latLng: google.maps.LatLng, infoContent = "InfoWindow Content", labelText = "grade", title = "RangerTitle", labelColor = "#ffffff", fontSize = "18px", icon = "rocket", animation = google.maps.Animation.DROP)
    // addMarker(latLng: google.maps.LatLng, infoContent = "InfoWindow Content", labelText= "grade", title="RangerTitle", labelColor = "#ffffff", fontSize="18px", icon = "rocket", animation= google.maps.Animation.DROP) {
  }

  onMapMouseMove(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.display = event.latLng.toJSON()
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


