
/// <reference types="@types/google.maps" />

import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'
import { MatIconModule } from '@angular/material/icon'
import { Component, ElementRef, Inject, OnInit, ViewChild, NgZone } from '@angular/core';
import { Map } from '../shared/'
import { DOCUMENT, JsonPipe } from '@angular/common';
//import { MarkerClusterer } from "@google-maps/markerclusterer";
// import "./style.css";
import { SettingsService } from '../shared/services';
import { ComponentFixture } from '@angular/core/testing';

/* Status:
This version tries to display map markers using markers[]: google.Map.Marker[]
but I cann't resolve [position]="marker" in HTML: not 'quite' the right types...

Using markerPosition[]:google.maps.LatLngLiteral[] DOES work, but doesn't carry the icon/titles, etc that I want.

Tried doing it all in code, as in https://developers.google.com/maps/documentation/javascript/examples/marker-labels,
but markers don't show up...
TODO: 1) Continue on last idea? Maybe in a fresh project??

TODO: 2) Create a type (like google.Map.Marker) and use that???

TODO: 3) peruse https://github.com/angular/components/blob/master/src/google-maps/README.md more...

  https://developers.google.com/maps/support/
  https://angular-maps.com/
  https://github.com/atmist/snazzy-info-window#html-structure
  https://angular-maps.com/api-docs/agm-core/interfaces/lazymapsapiloaderconfigliteral
  https://stackblitz.com/edit/angular-google-maps-demo
  https://github.com/googlemaps/js-markerclusterer
  https://github.com/angular-material-extensions/google-maps-autocomplete

   https://developers.google.com/maps/documentation/javascript/using-typescript
 TODO: https:github.com/angular/components/tree/master/src/google-maps/map-marker-clusterer
 https://github.com/timdeschryver/timdeschryver.dev/blob/main/content/blog/google-maps-as-an-angular-component/index.md
 TODO: Allow geocoding: https://rapidapi.com/blog/google-maps-api-react/
 TODO: Different layers: https://developers.google.com/maps/documentation/javascript/trafficlayer#transit_layer

 https://timdeschryver.dev/blog/google-maps-as-an-angular-component
 Option doc: https://developers.google.com/maps/documentation/javascript/reference/map#MapOptions
 https://stackblitz.com/edit/angular-9-google-maps-5v2cu8?file=src%2Fapp%2Fapp.component.html


GoogleMapsModule exports three components that we can use:
- GoogleMap: this is the wrapper around Google Maps, available via the google-map selector
- MapMarker: used to add markers on the map, available via the map-marker selector
- MapInfoWindow: the info window of a marker, available via the map-info-window selector
*/

declare const google: any
const Kaanapali = new google.maps.LatLng(-34.397, 150.644)
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
  title = '<a href="https://developers.google.com/maps/documentation/javascript/reference/map">Google Map</a> implemented as an Angular Component'
  display?: google.maps.LatLngLiteral;

  // items for <google-map>
  zoom
  center: google.maps.LatLngLiteral
  options: google.maps.MapOptions = {
    zoomControl: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    mapTypeId: 'hybrid',
    maxZoom: 18,
    minZoom: 8,
    //heading: 90,
  }
  //latitude
  //longitude
  // https://fonts.google.com/icons
  myIcon = "home"
  myIcon1 = "explore"
  myIcon2 = "sentiment_very_dissatisfied"
  myIcon3 = "alarm add"

  markers: google.maps.Marker[] = []
  markerOptions = { draggable: false }
  label = 'RangerTrak Label'
  labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  labelIndex = 0;
  infoContent = ''

  infowindow5 = new google.maps.InfoWindow({
    content: 'How now Brown cow.',
  });

  constructor(
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {

    // this.latitude = SettingsService.Settings.defLat
    // this.longitude = SettingsService.Settings.defLong
    this.zoom = SettingsService.Settings.defZoom
    // https://developers.google.com/maps/documentation/javascript/examples/map-latlng-literal
    // https://developers.google.com/maps/documentation/javascript/reference/coordinates

    this.center = {lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong}

    //google.maps.event.addDomListener(window, 'load', this.initMap);
    // this.LoadMap()

    //this.map = document.getElementById("google-map") //as HTMLElement
    console.log('Google Maps API version: ' + google.maps.version)

    //super('MyName')
  }

  ngOnInit(): void {
    console.log('into ngOnInit()')

    // position: new google.maps.LatLng(-34.397, 150.644)
    // position: { lat: -34.397, lng: 150.644 },

    navigator.geolocation.getCurrentPosition((position) => {
      this.center = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
    })

    if (this.map == null) {
      console.log("This.map is null")
    } else {
      console.log(`this.map zoom =${this.map.getZoom()}`)
      /* displays: this.map zoom =getZoom() {
        this._assertInitialized();
        return this.googleMap.getZoom(); }*/
    }


    console.log('out of ngOnInit()')
  }

 // -----------------------------------------------------------
  // Buttons
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

  // or on centerChanged
  logCenter() {
    console.log(`Map center is at ${JSON.stringify(this.map.getCenter())}`)
  }


  infowindow = new google.maps.InfoWindow({
    content: 'How now Brown cow.',
    maxwidth: "200px",
  });

  addMarker(event: google.maps.MapMouseEvent) {
    console.log(`addMarker`)

    // https://developers.google.com/maps/documentation/javascript/examples/marker-modern
    // https://material.angular.io/components/icon/overview
    //https://developers.google.com/fonts/docs/material_icons
    //https://fonts.google.com/icons
    if (event.latLng) {
      let m = new google.maps.Marker({
        draggable: true,
        animation: google.maps.Animation.DROP,
        position: event.latLng, //.toJSON()
        title: new Date().getTime().toString(),
        label: {
          text: "\ue530", // codepoint from https://fonts.google.com/icons
          fontFamily: "Material Icons",
          color: "#ffffff",
          fontSize: "18px",
        },
      })
/* next line gets:
RROR TypeError: Cannot read properties of undefined (reading 'addListener')
    at GmapComponent.addMarker (gmap.component.ts:207:14)
    at GmapComponent_Template_google_map_mapClick_24_listener (gmap.component.html:19:15)
    at executeListenerWithErrorHandling (core.mjs:14952:1)
    at wrapListenerIn_markDirtyAndPreventDefault (core.mjs:14990:1)
    at Object.next (Subscriber.js:110:1)
    at SafeSubscriber._next (Subscriber.js:60:1)
    at SafeSubscriber.next (Subscriber.js:31:1)
    at subscribe._OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber.innerSubscriber (switchMap.js:14:102)
    at OperatorSubscriber._next (OperatorSubscriber.js:9:1)
    at OperatorSubscriber.next (Subscriber.js:31:1) */
    // google.maps.MapsEventListener
      marker.addListener("click",
        //this.toggleBounce)
        () => {
          this.infowindow.open({
            anchor: m,
            setPosition: event.latLng,
            map: this.map,
            shouldFocus: false,
          })
        }
      )

      this.markers.push(m)
    }
  }

  openInfoWindow(event: any ) {
    this.infowindow.open({
      //anchor: m,
      setPosition: event.latLng,
      map: this.map,
      shouldFocus: false,
    })
  }
/*
 // Add some markers to the map.
      const markers = this.markerLocations.map((position, i) => {
      const label = this.labels[i % this.labels.length];
      const marker = new google.maps.Marker({
        position,
        label,
      });

      // markers can only be keyboard focusable when they have click listeners
      // open info window when marker is clicked
      marker.addListener("click", () => {
        infoWindow.setContent(label);
        infoWindow.open(map, marker);
      });

      return marker;
      */


  toggleBounce() {
    if (marker.getAnimation() !== null) {
      marker.setAnimation(null);
    } else {
      marker.setAnimation(google.maps.Animation.BOUNCE);
    }
  }




  move(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.display = event.latLng.toJSON()
    }
  }

  // MapOptions:any = ''
  //Map(mapDiv: Node, opts?: google.maps.MapOptions) {
  // Supposedly Creates a new map inside of the given HTML container — which is typically a DIV element — using any (optional) parameters that are passed.
  // no effect seemingly...
  //}

  addTrafficLayer() {
    /*
      MapTypes:
      roadmap - displays the default road map view. This is the default map type.
      satellite - displays Google Earth satellite images.
      hybrid - displays a mixture of normal and satellite views.
      terrain - displays a physical map based on terrain information.
    */
    var trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(this.map);

    // https://developers.google.com/maps/documentation/javascript/maptypes
    // map.setTilt(45);
  }

  clickedMarkerxxx(label: string = 'nolabel', index: number) {
    console.log(`clicked the marker: ${label || index}`)
  }

  /*
  onMapClicked($event: google.maps.MapMouseEvent) {
    this.markerLocations.push({
      lat: $event.latLng.lat(),
      lng: $event.latLng.lng(),
      label: new Date().getTime().toString(),
      draggable: true
    });
  }

  display3() {
    console.log('display() not implemented...');
  }

  markerDragEnd(m: marker, $event: google.maps.MouseEvent) {
    console.log('dragEnd', m, $event);
    this.latitude = $event.latLng.lat();
    this.longitude = $event.latLng.lng();
    this.getAddress(this.latitude, this.longitude);
  }*/
  /*
    markerDragEnd2($event: google.maps.MouseEvent) {
      console.log($event);
      this.lat = $event.coords.lat;
      this.lng = $event.coords.lng;
      this.getAddress(this.latitude, this.longitude);
    }

    markerDragEnd3($event: google.maps.MouseEvent) {
      console.log($event);
      this.lat = $event.latLng.lat();
      this.lng = $event.latLng.lng();
      this.getAddress(this.lat, this.lng);
    }


  getAddress(latitude: any, longitude: any) {
    throw new Error('Method not implemented.');
  }

  initMap2(): void {
    console.log('initMap is running')
      let myMap = document.getElementById("mapdiv") as HTMLElement

      console.log('myMap = ' + myMap)
      console.log('myMap = ' + myMap.innerHTML)
      console.log('myMap = ' + myMap.style)

      myMap.innerText = "<h1 style='background-color: aqua;'>Watch the lazy fox...</h1>"

      const map = new google.maps.Map(
      myMap,
      {
        zoom: 12,
        center: { lat: this.latitude, lng: this.longitude },
      }
    );

    const infoWindow = new google.maps.InfoWindow({
      content: "Yes mamma!!!",
      disableAutoPan: true,
    });

    */
    // Add a marker clusterer to manage the markers.
    // new MarkerClusterer({ markers, map });


}
