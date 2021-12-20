import { Component, ElementRef, Inject, OnInit, ViewChild, NgZone } from '@angular/core';
//import { maps } from 'google.maps'
import { snazzyMapsStyle } from './snazzy-maps';
import { MapsAPILoader } from '@agm/core';
import { DOCUMENT, JsonPipe } from '@angular/common';
//import { MarkerClusterer } from "@googlemaps/markerclusterer";

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
  styleUrls: ['./gmap.component.scss',
    '../../../node_modules/snazzy-info-window/dist/snazzy-info-window.css']
})
export class GmapComponent implements OnInit {

  zoom = 10;
  title = 'RangerTrak Google Map'
  label = 'RangerTrak Label'
  latitude = SettingsComponent.DEF_LAT
  longitude = SettingsComponent.DEF_LONG
  markerLocations: marker[] = []
  //let map: maps.Map;
  //center: google.maps.LatLngLiteral = {lat: this.lat, lng: this.lng};
  static style: any = snazzyMapsStyle;

  constructor(@Inject(DOCUMENT) private document: Document) {
  }

  ngOnInit(): void {
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
  Map(mapDiv: Node, opts?: google.maps.MapOptions) {
    // Supposedly Creates a new map inside of the given HTML container — which is typically a DIV element — using any (optional) parameters that are passed.
    // no effect seemingly...
  }

  clickedMarker(label: string = 'nolabel', index: number) {
    console.log(`clicked the marker: ${label || index}`)
  }

  mapClicked($event: google.maps.MouseEvent) {
    this.markerLocations.push({
      lat: $event.latLng.lat(),
      lng: $event.latLng.lng(),
      label: new Date().getTime().toString(),
      draggable: true
    });
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

  labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  initMap(): void {
    const map = new google.maps.Map(
      document.getElementById("mapdiv") as HTMLElement,
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
