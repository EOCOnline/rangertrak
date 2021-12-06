import { Component, OnInit } from '@angular/core';
// im   p mm  ort { maps } from 'google.maps'; //@types/
import { snazzyMapsStyle } from './snazzy-maps';
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

  constructor() { }

  ngOnInit(): void {
            // init Google Maps itself
/*             this.map = new google.maps.Map(this.$(MapController.canvas)[0], {
              center: google.maps.LatLngLiteral = {lat: 30, lng: -110},
              scrollwheel: false,
                  styles: MapController.style,
              zoom: 5
              });
              */
  }

  //export
   initMap(): void {
/*     map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
      center,
      zoom: 8
    }); */
  }


}
