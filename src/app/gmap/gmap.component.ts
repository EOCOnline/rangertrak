
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
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

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
//const Kaanapali = new google.maps.LatLng(-34.397, 150.644)
const kaanapali: google.maps.LatLngLiteral = { lat: -34.397, lng: 150.644 }
const kahanaRidge: google.maps.LatLngLiteral = { lat: 20.973375, lng: -156.664915 }
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


  // google.maps.Map is NOT the same as GoogleMap...
  gMap?: google.maps.Map

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
    draggableCursor: 'crosshair', //https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
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

  apiLoaded //: Observable<boolean>
  // infowindow5 = new google.maps.InfoWindow({ content: 'How now Brown cow.', });

 // center: google.maps.LatLngLiteral = {lat: 24, lng: 12};
  //zoom = 4;

  circleCenter: google.maps.LatLngLiteral = kahanaRidge //{lat: 24, lng: 12}
  radius = 30;




  constructor(
    private settingsService: SettingsService,
    httpClient: HttpClient,
    @Inject(DOCUMENT) private document: Document) {

    // this.latitude = SettingsService.Settings.defLat
    // this.longitude = SettingsService.Settings.defLong
    this.zoom = SettingsService.Settings.defZoom
    // https://developers.google.com/maps/documentation/javascript/examples/map-latlng-literal
    // https://developers.google.com/maps/documentation/javascript/reference/coordinates

    this.center = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong }
   // this.circleCenter: google.maps.LatLngLiteral = {lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong};
    // https://github.com/angular/components/tree/master/src/google-maps
    // this.apiLoaded = httpClient.jsonp(`https://maps.googleapis.com/maps/api/js?key=${SettingsService.secrets[3].key}`, 'callback')
    this.apiLoaded = true
    /*httpClient.jsonp(`https://maps.googleapis.com/maps/api/js?key=AIzaSyDDPgrn2iLu2p4II4H1Ww27dx6pVycHVs4`, "callback")
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
*/
    //google.maps.event.addDomListener(window, 'load', this.initMap);
    // this.LoadMap()

    //console.log('Google Maps API version: ' + google.maps.version)
    //super('MyName')
  }

  apiLoadedCallbackUNUSED() {
    console.log("got apiLoadedCallback()")
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

    // https://github.com/angular/components/tree/master/src/google-maps
    if (this.map == null) {
      console.log("This.map is null")
    } else {
      console.log(`this.map zoom =${this.map.getZoom()}`)
      /* displays: this.map zoom =getZoom() {
        this._assertInitialized();
        return this.googleMap.getZoom(); }*/

      // Add a marker at the center of the map.
      //addMarker(kaanapali, this.map);
    }
    if (this.gMap) {
      console.log('try initZoomControl()')
      this.initZoomControl(this.gMap)
    } else {
      console.log('gMap is null, so no initZoomControl()')
    }

    console.log('out of ngOnInit()')
  }

  // -----------------------------------------------------------
  // Buttons
  // TODO: Use mouse wheel to control zoom? Unused currently...
  // consider: https://developers.google.com/maps/documentation/javascript/examples/control-custom-state
  // https://developers.google.com/maps/documentation/javascript/examples/split-map-panes
  // https://developers.google.com/maps/documentation/javascript/examples/inset-map

  // from https://developers.google.com/maps/documentation/javascript/examples/control-replacement
  initZoomControl(map: google.maps.Map) {
    console.log('starting initZoomControl()');

    (document.querySelector(".zoom-control-in") as HTMLElement).onclick =
      function () {
        map.setZoom(map.getZoom()! + 1);
      };

    (document.querySelector(".zoom-control-out") as HTMLElement).onclick =
      function () {
        map.setZoom(map.getZoom()! - 1);
      };

    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(
      document.querySelector(".zoom-control") as HTMLElement
    );
  }

  initZoomControl2() {
    if (this.gMap) {
      console.log('try initZoomControl()')
      this.initZoomControl(this.gMap)
    } else {
      console.log('gMap is null, so no initZoomControl()')
    }
  }

  onAustralia(){
    console.log('Lets visit Australia!')

    //directly from
    // https://developers.google.com/maps/documentation/javascript/examples/marker-simple#maps_marker_simple-typescript
    const myLatLng = { lat: -25.363, lng: 131.044 };

    const map = new google.maps.Map(
      document.getElementById("map2") as HTMLElement,
      {
        zoom: 4,
        center: myLatLng,
        draggableCursor:'crosshair'
      }
    );
/*
    map.addListener("mousemove", () => {
      map.setOptions({draggableCursor:'crosshair'});
    }); */
    // draggableCursor: The name or url of the cursor to display when mousing over a draggable map.
    // draggingCursor:  The name or url of the cursor to display when the map is being dragged.

    new google.maps.Marker({
      position: myLatLng,
      map,
      title: "Hello World!",
    });
  }

  onMapInitialized(mappy: google.maps.Map) {
    console.log(`onMapInitialized()`)

    this.gMap = mappy

    if (this.gMap == null) {
      console.log("onMapInitialized(): This.gMap is null")
    } else {
      console.log(`onMapInitialized(): this.gMap zoom =${this.gMap.getZoom()}`)

      // Add a marker at the center of the map.
     /* new google.maps.Marker({
        position: kahanaRidge,
        map: this.gMap,
        title: "Hello  kahanaRidge"
      });*/
    }

    //this.gMap = document.getElementById("google-map") //as HTMLElement
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

  // or on centerChanged
  logCenter() {
    console.log(`Map center is at ${JSON.stringify(this.map.getCenter())}`)
  }


    infowindow = new google.maps.InfoWindow({
      //content: 'How now Brown cow.',
      maxwidth: "200px",
    });

  addMarker(event: google.maps.MapMouseEvent) {
    console.log(`addMarker`)

    // https://developers.google.com/maps/documentation/javascript/examples/marker-modern
    // https://material.angular.io/components/icon/overview
    //https://developers.google.com/fonts/docs/material_icons
    //https://fonts.google.com/icons
    if (event.latLng) {
      console.log("Actually adding marker now...")
      let m = new google.maps.Marker({
        draggable: true,
        animation: google.maps.Animation.DROP,
        map:this.gMap,
        position: event.latLng, //.toJSON()
        title: Date.now,
        label: {
             text: "\ue530", // codepoint from https://fonts.google.com/icons
             fontFamily: "Material Icons",
             color: "#ffffff",
             fontSize: "18px",
           },

        // label: labels[labelIndex++ % labels.length],
      })

      /*
      if (0) {
        // Add some markers to the map.
        const markers = this.markers.map((position, i) => {
          const label = this.labels[i % this.labels.length];
          const marker = new google.maps.Marker({
            position,
            label,
          });

          // markers can only be keyboard focusable when they have click listeners
          // open info window when marker is clicked
          marker.addListener("click", () => {
            //this.infoWindow.setContent(label);
            //this.infoWindow.open(this.map, marker);
          });
        })
        return marker;
      }
      */
     let time = Date.now()
     let pos = JSON.stringify(event.latLng)
     console.log(`addMarker: ${time}`)
     console.log(`addMarker: ${pos}`)

            m.addListener("click",   // this.toggleBounce)
              () => {
                this.infowindow.setContent(`time:, pos: `)
                this.infowindow.open({
                 // new google.maps.InfoWindow.open({
                  //content: 'How now red cow.',
                 // anchor: m,
                  //setPosition: event.latLng,
                  map: this.gMap,
                  // shouldFocus: false,
                })
              }
            )

      // This event listener calls addMarker() when the map is clicked.
      /*  vs
          google.maps.event.addListener(map, "click", (event) => {
            addMarker(event.latLng, map);
        });  */

      this.markers.push(m)
    } else {
      console.log("event.latLng is BAD; can not add marker..")
    }
    //this.refreshMarkerDisplay()
  }


  // Adds a marker to the map.
  addMarker55(location: google.maps.LatLngLiteral, map: google.maps.Map) {
    // Add the marker at the clicked location, and add the next-available label
    // from the array of alphabetical characters.
    new google.maps.Marker({
      position: location,
      label: this.labels[this.labelIndex++ % this.labels.length],
      map: map,
    });
  }

  // not needed: The new adds them to the map I guess. How to remove them?!
  refreshMarkerDisplay() {
    for (let i = 0; i < this.markers.length; i++) {
      // markerDiv
      // Add a marker at the center of the map.
      //addMarker(bangalore, map);
    }
  }

  openInfoWindow(event: any) {
    /* this.infowindow.open({
       //anchor: m,
       setPosition: event.latLng,
       map: this.gMap,
       shouldFocus: false,
     })
     */
  }

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
    console.log(`addTrafficLayer(): this.map: ${this.map}`)
    console.log(`addTrafficLayer(): this.map.center: ${this.map.center}`)
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(this.gMap);

    // https://developers.google.com/maps/documentation/javascript/maptypes
    // map.setTilt(45);
  }

  clickedMarkerxxx(label: string = 'nolabel', index: number) {
    console.log(`clicked the marker: ${label || index}`)
  }
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


