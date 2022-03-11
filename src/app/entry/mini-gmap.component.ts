/// <reference types="@types/google.maps" />
import { Component, Inject, isDevMode, OnInit } from '@angular/core';
import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'
//import { addressType } from '../lmap/lmap.component' // BUG:
import { DDToDMS, CodeArea, OpenLocationCode } from '../shared/' // BUG: , What3Words, Map, , GoogleGeocode
import { LatLng } from 'leaflet';
import { DOCUMENT } from '@angular/common';

const Vashon: google.maps.LatLngLiteral = { lat: 47.4471, lng: -122.4627 }

@Component({
  selector: 'rangertrak-mini-gmap',
  templateUrl: './mini-gmap.component.html',
  styleUrls: ['./mini-gmap.component.scss']
})
export class MiniGMapComponent implements OnInit {


  // ------------------ MAP STUFF  ------------------
  // imports this.map as a GoogleMap which is the Angular wrapper around a google.maps.Map...
  //@ViewChild(GoogleMap, { static: false }) map!: GoogleMap // even needed?
  // google.maps.Map is NOT the same as GoogleMap - but does refer to the same underlying map...
  gMap?: google.maps.Map

  onlyMarker = new google.maps.Marker({
    draggable: false,
    animation: google.maps.Animation.DROP
  }) // i.e., a singleton...

  // TODO: move to abstracted x instead of google.maps
  mouseLatLng?: google.maps.LatLngLiteral
  vashon = new google.maps.LatLng(47.4471, -122.4627)

  zoom = 11
  center: google.maps.LatLngLiteral = Vashon
  options: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: true,
    mapTypeId: 'hybrid',
    maxZoom: 21,
    minZoom: 7,
    draggableCursor: 'crosshair', // https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
    //heading: 90,
  }
  //geocoder = new GoogleGeocode



  constructor(
    @Inject(DOCUMENT) private document: Document
  ) {
    console.log(`MiniGMapComponent constructed with development mode ${isDevMode() ? "" : "NOT "}enabled`)

  }

  ngOnInit(): void {
    console.log(`MiniGMapComponent onInit() with development mode ${isDevMode() ? "" : "NOT "}enabled`)

    // subscribe to addresses value changes
    /* TODO: How?!
    this.entryDetailsForm.controls['location'].valueChanges.subscribe(x => {
      console.log(`Subscription to location got: ${x}`);
    })
*/

  }



  // ------------------------------------------------------------------------
  // Map stuff below
  //#region

  onMapInitialized(newMapReference: google.maps.Map) {
    console.log(`onMapInitialized()`)
    this.gMap = newMapReference
    /*
        if (this.gMap == null) {
          console.log("onMapInitialized(): This.gMap is null")
        } else {
          console.log(`onMapInitialized(): this.gMap zoom =${this.gMap.getZoom()}`)
        }
        */
    this.updateOverviewMap()
    console.log(`onMapInitialized done`)
  }

  updateOverviewMap() {
    console.log(`updateOverviewMap`)

    //let latlng = new google.maps.LatLng(this.settingsService.settings.defLat, this.settingsService.settings.deflng)
    //let latlngL = {lat: this.settingsService.settings.defLat, lng: this.settingsService.settings.deflng}

    // TODO: FitBounds to new point, not to DefLat & Deflng  -- do it on addMarker?
    // this.gMap?.setCenter(latlng) // REVIEW: this and/or next line. (Bounds should be private though!)
    //this.gMap?.fitBounds(this.fieldReportService.bounds.extend({ lat: this.settingsService.settings.defLat, lng: this.settingsService.settings.defLng })) // zooms to max!
    this.gMap?.setZoom(17) // no effect
  }

  onMapMouseMove(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.mouseLatLng = event.latLng.toJSON()
      //console.log('moving()');
    }
    else {
      console.warn('move(): NO event.latLng!!!!!!!!!!!!!');
    }
  }

  zoomed() {
    if (this.zoom && this.gMap) {
      this.zoom = this.gMap.getZoom()!
    }
  }
  // TODO: chg miniMap out with Leaflet map (for offline use)
  //#endregion





  displayMarker(pos: google.maps.LatLngLiteral, title = 'Latest Location') {
    console.log(`displayMarker at ${pos}, title: ${title}`)

    // Review: will this overwrite/remove any previous marker?
    if (this.gMap) {
      this.onlyMarker.setMap(this.gMap)
    } else {
      console.warn('gMap NOT set in displayMarker!!!!')
    }
    this.onlyMarker.setPosition(pos)
    this.onlyMarker.setTitle(title)
    this.gMap?.setCenter(pos)

    /* label: {
       // label: this.labels[this.labelIndex++ % this.labels.length],
       text: "grade", // https://fonts.google.com/icons: rocket, join_inner, noise_aware, water_drop, etc.
       fontFamily: "Material Icons",
       color: "#ffffff",
       fontSize: "18px",
     },
     */
  }














}
