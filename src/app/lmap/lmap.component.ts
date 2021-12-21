import { Component, ElementRef, Inject, OnInit, ViewChild, NgZone, AfterViewInit } from '@angular/core';
//import { Console } from 'console';
import { DOCUMENT, JsonPipe } from '@angular/common';
import { SettingsComponent } from '../settings/settings.component';
import * as L from 'leaflet';

@Component({
  selector: 'rangertrak-lmap',
  templateUrl: './lmap.component.html',
  styleUrls: [
    '../../../node_modules/leaflet/dist/leaflet.css',
    './lmap.component.scss'
  ]
})
export class LmapComponent implements  AfterViewInit {  //OnInit,

  lmap: L.Map | undefined


  constructor(
    //@Inject(DOCUMENT) private document: Document
    ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    //console.log("ngAfterViewInit..........")
    this.initMap()
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
