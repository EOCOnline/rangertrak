import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
//import { maps } from 'googlemaps'
import { snazzyMapsStyle } from './snazzy-maps';
import { DOCUMENT, JsonPipe } from '@angular/common';
import { SettingsComponent } from '../settings/settings.component';

/*
  https://angular-maps.com/guides/getting-started/
  https://github.com/angular-material-extensions/google-maps-autocomplete
*/

@Component({
  selector: 'rangertrak-gmap',
  templateUrl: './gmap.component.html',
  styleUrls: ['./gmap.component.scss',
  '../../../node_modules/snazzy-info-window/dist/snazzy-info-window.css']
})
export class GmapComponent implements OnInit {

  title = 'RangerTrak Google Map'
  lat = SettingsComponent.DEF_LAT
  lng = SettingsComponent.DEF_LONG
  //let map: maps.Map;
  //center: google.maps.LatLngLiteral = {lat: this.lat, lng: this.lng};
  static style: any = snazzyMapsStyle;

  constructor(@Inject(DOCUMENT) private document: Document) {
  }

  ngOnInit(): void {
  }


}
