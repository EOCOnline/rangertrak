import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnInit, ViewChild } from '@angular/core'
import { DOCUMENT, JsonPipe } from '@angular/common'
import { fromEvent } from 'rxjs'
import * as L from 'leaflet'
//import { Map, MapOptions, MarkerClusterGroup, MarkerClusterGroupOptions } from 'leaflet';
import { tileLayer, latLng, control, marker, icon, divIcon, LatLngBounds, Map, MapOptions, MarkerClusterGroup, MarkerClusterGroupOptions } from 'leaflet';
//import 'leaflet.markercluster';
import { SettingsService, FieldReportService, FieldReportType, FieldReportStatusType, LogService } from '../shared/services'
import { openDB, deleteDB, wrap, unwrap } from 'idb';
import 'leaflet.offline' // https://github.com/allartk/leaflet.offline

const iconRetinaUrl = 'assets/imgs/marker-icon-2x.png'
const iconUrl = 'assets/imgs/marker-icon.png'
const shadowUrl = 'assets/imgs/marker-shadow.png'
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
})
const markerIcon = L.icon({
  iconSize: [20, 25],
  iconUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png'
})
L.Marker.prototype.options.icon = iconDefault;
//type LatLng = { lat: number, lng: number }


@Component({
  selector: 'rangertrak-mini-lmap',
  templateUrl: './mini-lmap.component.html',
  styleUrls: ['./mini-lmap.component.scss',
    '../../../node_modules/leaflet/dist/leaflet.css'] // only seems to work when embedded in angula.json & Here! (chgs there REQUIRE restart!)]
})
export class MiniLMapComponent implements AfterViewInit {

  id = 'Leaflet MiniMap'
  title = 'Leaflet Map'
  lmap?: L.Map

  zoom // actual zoom level of main map
  zoomDisplay // what's displayed below main map
  center = { lat: this.settings.defLat, lng: this.settings.defLng }
  mouseLatLng = this.center
  mapOptions = ""
  //mymarkers = L.markerClusterGroup()

  constructor(
    private log: LogService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.log.verbose("constructor()", this.id)
    this.zoom = this.settings.defZoom
    this.zoomDisplay = this.settings.defZoom
    this.center = { lat: this.settings.defLat, lng: this.settings.defLng }
  }

  ngAfterViewInit() {
    this.log.verbose("ngAfterViewInit()", this.id)
    this.initMap();
    //this.mymarkers = L.markerClusterGroup()
    // TODO: How & Where to subscribe for location updates?!
  }

  onMapReady(ev: any) {
    this.log.verbose(` OnMapReady`)
  }

  private initMap() {
    this.log.verbose("initMap() ", this.id)

    this.lmap = L.map('lmap', {
      center: [this.settings.defLat, this.settings.defLng],
      zoom: this.settings.defZoom + 2
    })

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    tiles.addTo(this.lmap)
    this.addMarker(this.settings.defLat - 0.001, this.settings.defLng - 0.001, "Home Base #2")
    this.addCircle(this.settings.defLat + 0.001, this.settings.defLng + 0.001, "Home Base")
    //this.displayAllMarkers()
    //this.fitBounds()

    this.lmap.on('zoomend', (ev: L.LeafletEvent) => { //: MouseEvent  :PointerEvent //HTMLDivElement L.LeafletEvent L.LeafletMouseEvent
      if (this.zoomDisplay && this.lmap) {
        this.zoom = this.lmap.getZoom()
        this.zoomDisplay = this.lmap.getZoom()
      }
      //this.zoom! = this.lmap?.getZoom()
    })


    // TODO: Use an Observable, from https://angular.io/guide/rx-library#observable-creation-functions
    const lmap = document.getElementById('lmap')!

    // Create an Observable that will publish mouse movements
    const mouseMoves = fromEvent<MouseEvent>(lmap, 'mousemove')

    // Subscribe to start listening for mouse-move events
    const subscription = mouseMoves.subscribe(evt => {
      // Log coords of mouse movements
      this.log.verbose(`Coords: ${evt.clientX} X ${evt.clientY}`, this.id)

      // When the mouse is over the upper-left of the screen,
      // unsubscribe to stop listening for mouse movements
      if (evt.clientX < 40 && evt.clientY < 40) {
        subscription.unsubscribe()
      }
    })

    this.lmap.on('mousemove', (evt: L.LeafletMouseEvent) => {
      this.mouseLatLng = evt.latlng
    })
  }

  /*
  onMapMouseMove(event: any) {
    //L.LeafletMouseEvent) { //LeafletEvent) {  // MouseEvent) { //google.maps.MapMouseEvent) {
    this.log.verbose(`onMapMouseMove: ${JSON.stringify(event)}`, this.id)
    //if (event.type. .lat) {
    this.mouseLatLng = { lat: event.lat, lng: event.lng }
    //}
  }
*/
  private addCircle(lat: number, lng: number, status: string = '') {
    const circle = new L.CircleMarker([lat, lng], { radius: 20 })
    if (this.lmap) {
      circle.addTo(this.lmap)
    }
  }

  displayAMarker() {
    this.addMarker(this.settings.defLat - 0.001, this.settings.defLng - 0.001, "Home Base")
  }

  displayAllMarkers() {
    // this.addMarker(this.fieldReports[i].lat, this.fieldReports[i].lng, this.fieldReports[i].status)
  }

  // https:/ / blog.mestwin.net / leaflet - angular - marker - clustering /
  private getDefaultIcon() {
    return icon({
      iconSize: [25, 41],
      iconAnchor: [13, 41],
      iconUrl: './../../assets/icons/marker-icon.png'
    })
  }

  private createMarker() {
    const mapIcon = this.getDefaultIcon();
    // const coordinates = latLng([this.mapPoint.latitude, this.mapPoint.longitude]);
    // this.lastLayer = marker(coordinates).setIcon(mapIcon);
    // this.markerClusterGroup.addLayer(this.lastLayer)
  }

  private addMarker(lat: number, lng: number, status: string = '') {
    //this.log.verbose(`addMarker at ${lat}. ${lng}, ${status}`, this.id)

    //iconDefault


    if (!lat || !lng || !this.lmap) {
      console.error(`bad lat: ${lat} or lng: ${lng} or lmap: ${this.lmap}`)
    } else {
      let _marker = new L.Marker([lat, lng], {
        icon: iconDefault
      })
      /*
      https://javascript.plainenglish.io/how-to-create-marker-and-marker-cluster-with-leaflet-map-95e92216c391

        _marker.bindPopup(city);
        _marker.on('popupopen', function() {
          this.log.verbose('open popup', this.id);
        });
        _marker.on('popupclose', function() {
          this.log.verbose('close popup', this.id);
        });
        _marker.on('mouseout', function() {
          this.log.verbose('close popup with mouseout', this.id);
          _map.closePopup();
        });
        this.log.verbose(_map.getZoom(), this.id)
        if (_map.getZoom() > 15 && _map.hasLayer(_marker)) {
          _map.closePopup();
          this.log.verbose('zoom > 15 close popup', this.id);
        }
      */

      //markerCluster.addLayer(_mar);
      //}
      //_map.addLayer(markerCluster);


      _marker.addTo(this.lmap)

      //_marker.addEventListener('click', this._markerOnClick);
    }
  }


}
