//import { Console } from 'console';
import { DOCUMENT, JsonPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnInit, ViewChild } from '@angular/core';
import * as L from 'leaflet';

import { SettingsComponent } from '../settings/settings.component';
import { MarkerService, ShapeService } from '../shared/services';

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
  shapeFile = '/assets/data/gz_2010_us_040_00_5m.json'
  private shapes = undefined

  constructor(
    private markerService: MarkerService,
    private shapeService: ShapeService
    //@Inject(DOCUMENT) private document: Document
  ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    //console.log("ngAfterViewInit..........")
    this.initMap()

    if (this.lmap) {
      //this.markerService.makeStationMarkers(this.lmap)
      this.markerService.makeCapitalCircleMarkers(this.lmap)
    }
    // NOTE: An even better approach would be to pre-load the data in a resolver.
    this.shapeService.getShapeShapes(this.shapeFile).subscribe((shapes: any) => {
      this.shapes = shapes
      this.initShapesLayer()
    });
  }

  private initMap() {
    //console.log("InitMap..........")
    this.lmap = L.map('lmap', {
      center: [SettingsComponent.DEF_LAT, SettingsComponent.DEF_LONG],
      zoom: 12
    })

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    tiles.addTo(this.lmap)
  }

  // Create GeoJSON layer & add to map
  // https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service
  private initShapesLayer() {

    const shapeLayer = L.geoJSON(this.shapes, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#008f68',
        fillOpacity: 0.8,
        fillColor: '#6DB65B'
      }),
      onEachFeature: (feature, layer) => (
        layer.on({
          mouseover: (e) => (this.highlightFeature(e)),
          mouseout: (e) => (this.resetFeature(e)),
        })
      )
    });

    if (this.lmap) {
      this.lmap.addLayer(shapeLayer);
    }
    shapeLayer.bringToBack();
  }

  //  attach mouseover & mouseout events to interact with each of the (state) shapes
  private highlightFeature(e: L.LeafletMouseEvent) {
    const layer = e.target;

    layer.setStyle({
      weight: 10,
      opacity: 1.0,
      color: '#DFA612',
      fillOpacity: 1.0,
      fillColor: '#FAE042'
    });
  }

  private resetFeature(e: L.LeafletMouseEvent) {
    const layer = e.target;

    layer.setStyle({
      weight: 3,
      opacity: 0.5,
      color: '#008f68',
      fillOpacity: 0.8,
      fillColor: '#6DB65B'
    });
  }
}
