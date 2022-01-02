import { Component, ElementRef, Inject, OnInit, ViewChild, NgZone } from '@angular/core';
import { Map } from '../shared/'
//import { snazzyMapsStyle } from './snazzy-maps';
import { MapsAPILoader } from '@agm/core';
import { DOCUMENT, JsonPipe } from '@angular/common';
//import { MarkerClusterer } from "@googlemaps/markerclusterer";
// import "./style.css";
import { SettingsComponent } from '../settings/settings.component';

/*
  https://developers.google.com/maps/support/
  https://angular-maps.com/
  https://github.com/atmist/snazzy-info-window#html-structure
  https://angular-maps.com/api-docs/agm-core/interfaces/lazymapsapiloaderconfigliteral
  https://stackblitz.com/edit/angular-google-maps-demo
  https://github.com/googlemaps/js-markerclusterer
  https://github.com/angular-material-extensions/google-maps-autocomplete
*/

interface marker {
  lat: number;
  lng: number;
  label?: string;
  draggable: boolean;
}
@Component({
  selector: 'rangertrak-gmap',
  templateUrl: './gmap.component.html',
  styleUrls: ['./gmap.component.scss'
  //  ,'../../../node_modules/snazzy-info-window/dist/snazzy-info-window.css'
  ]
})

/*
Initial Chunk Files   | Names         |      Size
vendor.js             | vendor        |   9.36 MB
styles.css, styles.js | styles        | 575.38 kB
polyfills.js          | polyfills     | 339.13 kB
main.js               | main          | 282.01 kB
runtime.js            | runtime       |   6.86 kB

                      | Initial Total |  10.54 MB

to

Initial Chunk Files | Names   |      Size
main.js             | main    | 263.40 kB
runtime.js          | runtime |   6.86 kB

... so no big deal?!

*/

//extends Map
export class GmapComponent  implements OnInit {

  zoom = 10;
  title = 'RangerTrak Google Map'
  label = 'RangerTrak Label'
  latitude = SettingsComponent.DEF_LAT
  longitude = SettingsComponent.DEF_LONG
  markerLocations: marker[] = []
  //let map: maps.Map;
  //center: google.maps.LatLngLiteral = {lat: this.lat, lng: this.lng};
  //static style: any = snazzyMapsStyle;

  constructor(@Inject(DOCUMENT) private document: Document) {
    //super('MyName')
  }


  ngOnInit(): void {
    //this.initMap()
   /* causes:
core.mjs:6484 ERROR ReferenceError: google is not defined
    at GmapComponent.initMap (gmap.component.ts:114)
    at GmapComponent.ngOnInit (gmap.component.ts:48)
    */

  }
  /* BUG:
  core.mjs:6484 ERROR TypeError: Cannot read properties of undefined (reading 'then')
    at Observable._subscribe (agm-core.js:299)
    at Observable._trySubscribe (Observable.js:37)
    at Observable.js:31
    at errorContext (errorContext.js:19)
    at Observable.subscribe (Observable.js:22)
    at agm-core.js:1543
    at Map.forEach (<anonymous>)
    at AgmCircle._registerEventListeners (agm-core.js:1542)

    ====>    at AgmCircle.ngOnInit (agm-core.js:1493)

    at callHook (core.mjs:2533)
    */

  // MapOptions:any = ''
  //Map(mapDiv: Node, opts?: google.maps.MapOptions) {
    // Supposedly Creates a new map inside of the given HTML container — which is typically a DIV element — using any (optional) parameters that are passed.
    // no effect seemingly...
  //}

  initMap() {
    // https://developers.google.com/maps/documentation/
    let googMap = new google.maps.Map(document.getElementById('bigGoogMapId') as HTMLElement, {
      center: {lat: SettingsComponent.DEF_LAT, lng: SettingsComponent.DEF_LONG},
      zoom: 11,
      mapTypeId: 'terrain'
    });
    /*
      MapTypes:
      roadmap - displays the default road map view. This is the default map type.
      satellite - displays Google Earth satellite images.
      hybrid - displays a mixture of normal and satellite views.
      terrain - displays a physical map based on terrain information.
    */

    var trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(googMap);

    // https://developers.google.com/maps/documentation/javascript/maptypes
    // map.setTilt(45);
  }

  clickedMarker(label: string = 'nolabel', index: number) {
    console.log(`clicked the marker: ${label || index}`)
  }

  onMapClicked($event: google.maps.MouseEvent) {
    this.markerLocations.push({
      lat: $event.latLng.lat(),
      lng: $event.latLng.lng(),
      label: new Date().getTime().toString(),
      draggable: true
    });
  }

  display() {
    console.log('display() not implemented...');
  }

  markerDragEnd(m: marker, $event: google.maps.MouseEvent) {
    console.log('dragEnd', m, $event);
    this.latitude = $event.latLng.lat();
    this.longitude = $event.latLng.lng();
    this.getAddress(this.latitude, this.longitude);
  }
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
  */

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
      content: "",
      disableAutoPan: true,
    });

    // Create an array of alphabetical characters used to label the markers.
    this.generateFakeData()

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
    });

    // Add a marker clusterer to manage the markers.
    //new MarkerClusterer({ markers, map });
  }

  // TODO: Following has been moved to marker.service.ts: use that version!
  labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  generateFakeData(num: number = 15) {

    console.log("Generating " + num + " more rows of FAKE field reports!")

    for (let i = 0; i < num; i++) {
      this.markerLocations.push(
        {
          lat: 45 + Math.floor(Math.random() * 2000) / 1000,
          lng: -121 + Math.floor(Math.random() * 1000) / 1000,
          label: this.labels[Math.floor(Math.random() * this.labels.length)],
          draggable: true
        }
      )
    }
    //console.log("Pushed # " + numberPushed++)
  }
}


/*

OLD CODE ===============================

function initGoogMap() {
    // https://developers.google.com/maps/documentation/
    googMap = new google.maps.Map(document.getElementById('bigGoogMapId'), {
      center: {lat: DEF_LAT, lng: DEF_LONG},
      zoom: 11,
      mapTypeId: 'terrain' // line is optional
    });
    /*
      MapTypes:
      roadmap - displays the default road map view. This is the default map type.
      satellite - displays Google Earth satellite images.
      hybrid - displays a mixture of normal and satellite views.
      terrain - displays a physical map based on terrain information.
    *  /

      var trafficLayer = new google.maps.TrafficLayer();
      trafficLayer.setMap(googMap);

      // https://developers.google.com/maps/documentation/javascript/maptypes
      // map.setTilt(45);
    }

    */
