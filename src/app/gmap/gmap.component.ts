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
  lat = SettingsComponent.DEF_LAT
  lng = SettingsComponent.DEF_LONG
  //let map: maps.Map;
  //center: google.maps.LatLngLiteral = {lat: this.lat, lng: this.lng};
  static style: any = snazzyMapsStyle;

  constructor(@Inject(DOCUMENT) private document: Document) {
  }

  ngOnInit(): void {
  }

  // MapOptions:any = ''
  Map( mapDiv:Node, opts?:google.maps.MapOptions ) {
    // Supposedly Creates a new map inside of the given HTML container — which is typically a DIV element — using any (optional) parameters that are passed.

  }

  clickedMarker(label: string = 'nolabel', index: number) {
    console.log(`clicked the marker: ${label || index}`)
  }

  mapClicked($event: google.maps.MouseEvent) {
    this.markers.push({
      lat: $event.latLng.lat(),
      lng: $event.latLng.lng(),
      draggable: true
    });
  }

  markerDragEnd(m: marker, $event: google.maps.MouseEvent) {
    console.log('dragEnd', m, $event);
    this.lat = $event.latLng.lat();
    this.lng = $event.latLng.lng();
    this.getAddress(this.lat, this.lng);
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
/*
  // use default algorithm and renderer
  const markerCluster = new MarkerClusterer({ map, markers });

  DefaultRenderer() {
      algorithm?: Algorithm;
      map?: google.maps.Map;
      markers?: google.maps.Marker[];
      renderer?: Renderer;
      onClusterClick?: onClusterClickHandler;
  }
*/

  markers: marker[] = [
    {
      lat: this.lat,
      lng: this.lng,
      label: 'A',
      draggable: true
    },
    {
      lat: this.lat + 0.01,
      lng: this.lng + 0.01,
      label: 'B',
      draggable: false
    },
    {
      lat: this.lat - 0.02,
      lng: this.lng - 0.025,
      label: 'C',
      draggable: true
    }
  ]

}

interface marker {
  lat: number;
  lng: number;
  label?: string;
  draggable: boolean;
}


/*
BUG:
core.mjs:6484 ERROR TypeError: Cannot read properties of undefined (reading 'then')
    at Observable._subscribe (agm-core.js:299)
    at Observable._trySubscribe (Observable.js:37)
    at Observable.js:31
    at errorContext (errorContext.js:19)
    at Observable.subscribe (Observable.js:22)
    at agm-core.js:1543
    at Map.forEach (<anonymous>)
    at AgmCircle._registerEventListeners (agm-core.js:1542)
    at AgmCircle.ngOnInit (agm-core.js:1493)
    at callHook (core.mjs:2533)
    */
