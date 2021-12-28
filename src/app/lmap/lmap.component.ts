import { Component, ElementRef, Inject, OnInit, ViewChild, NgZone, AfterViewInit } from '@angular/core';
//import { Console } from 'console';
import { DOCUMENT, JsonPipe } from '@angular/common';
import { SettingsComponent } from '../settings/settings.component';
import { MarkerService } from '../shared/services';
import * as L from 'leaflet';
// https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet
// °°°°

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'rangertrak-lmap',
  templateUrl: './lmap.component.html',
  styleUrls: [
    './lmap.component.scss',
    '../../../node_modules/leaflet/dist/leaflet.css'
  ]
})
export class LmapComponent implements AfterViewInit {  //OnInit,

  lmap: L.Map | undefined

  constructor(
    private markerService: MarkerService
    //@Inject(DOCUMENT) private document: Document
    ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    //console.log("ngAfterViewInit..........")
    this.initMap()
    //this.markerService.makeStationMarkers(this.lmap!)
    this.markerService.makeCapitalCircleMarkers(this.lmap!)
  }

  private initMap() {
    //console.log("InitMap..........")
    this.lmap = L.map('lmap', {
      center: [ SettingsComponent.DEF_LAT, SettingsComponent.DEF_LONG ],
      zoom:12
    })

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    tiles.addTo(this.lmap)
  }
}
