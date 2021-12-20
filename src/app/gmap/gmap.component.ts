import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
//import { maps } from 'google.maps'
import { snazzyMapsStyle } from './snazzy-maps';
import { DOCUMENT, JsonPipe } from '@angular/common';

/*
  https://github.com/devpato/angular-google-maps-tutorial
  https://github.com/angular-material-extensions/google-maps-autocomplete
*/

@Component({
  selector: 'rangertrak-gmap',
  templateUrl: './gmap.component.html',
  styleUrls: ['./gmap.component.scss']
})
export class GmapComponent implements OnInit {

  //let map: maps.Map;
  //const center: google.maps.LatLngLiteral = {lat: 30, lng: -110};
  static style: any = snazzyMapsStyle;

  constructor(@Inject(DOCUMENT) private document: Document) {
  }

  ngOnInit(): void {

//    let map: google.maps.Map;
 //   const center: google.maps.LatLngLiteral = { lat: 30, lng: -110 };

    //{ center: {lat: 30, lng: -110}, zoom: 8, mapId: '1234' } as google.maps.MapOptions
    // init Google Maps itself
    /*             this.map = new google.maps.Map(this.$(MapController.canvas)[0], {
                  center: google.maps.LatLngLiteral = {lat: 30, lng: -110},
                  scrollwheel: false,
                      styles: MapController.style,
                  zoom: 5
                  });
                  */
  }

  initMap(): void {
    let map = new google.maps.Map(this.document.getElementById("map") as HTMLElement, {
      center: new google.maps.LatLng(51.508742, -0.120850), //  {lat: SettingsComponent.DEF_LAT, lng: DEF_LONG},
      zoom: 8
    })
  }

  initGoogMap() {
    var mapProp = {
      center: new google.maps.LatLng(51.508742, -0.120850),
      zoom: 5,
    };
    var map = new google.maps.Map(this.document.getElementById("googleMap") as HTMLElement, mapProp);
  }
}
