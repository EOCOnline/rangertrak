import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnInit, ViewChild } from '@angular/core'
import { DOCUMENT, JsonPipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
/*
import * as LMC from "leaflet.markercluster"  // https://github.com/Leaflet/Leaflet.markercluster
//import {} from LeafletMarkerClusterModule
//import { LeafletMarkerClusterModule } from 'leaflet.markercluster' //https://javascript.plainenglish.io/how-to-create-marker-and-marker-cluster-with-leaflet-map-95e92216c391
// https://stackblitz.com/edit/typescript-leaflet-marker-cluster   MarkerClusterGroup
// better: https://blog.mestwin.net/leaflet-angular-marker-clustering/
//import 'leaflet.markercluster/dist/MarkerCluster.Default.css' // also in angular.json
import { tileLayer, latLng, control, marker, icon, divIcon, LatLngBounds } from 'leaflet';
// MarkerClusterGroup, MarkerClusterGroupOptions
//import {icon, latLng, marker} from 'leaflet';
//import * as L from 'leaflet'
import * as L from 'leaflet';
import 'leaflet.markercluster';
https://stackoverflow.com/questions/58847492/error-typeerror-a-markerclustergroup-is-not-a-function

another guess would be that the timing in production is different than on develop. your initMarkers gets called via ngOnChanges but that might be to early. The map or the cluster might not be initialized yet. Try to call initMarkers within markerClusterReady or mapReady
*/


import * as L from 'leaflet';
//import { Map, MapOptions, MarkerClusterGroup, MarkerClusterGroupOptions } from 'leaflet';
import { tileLayer, latLng, control, marker, icon, divIcon, LatLngBounds, Map, MapOptions, MarkerClusterGroup, MarkerClusterGroupOptions } from 'leaflet';
import 'leaflet.markercluster';





import { SettingsService, FieldReportService, FieldReportType, FieldReportStatusType } from '../shared/services'
import { CodeArea, OpenLocationCode, Utility } from '../shared/'
import { Context } from 'ag-grid-community'

// https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet
// °°°°

// Markers are copied into project via virtue of angular.json: search it for leaflet!!!

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

export type addressType = {
  title: string;
  num: number
}

//type LatLng = { lat: number, lng: number }

@Component({
  selector: 'rangertrak-lmap',
  templateUrl: './lmap.component.html',
  styleUrls: [
    './lmap.component.scss',
    "../../../node_modules/leaflet.markercluster/dist/MarkerCluster.css", // REVIEW: also added to angular.json: needed there?
    "../../../node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css", // (not needed if you use your own iconCreateFunction instead of the default one)
    '../../../node_modules/leaflet/dist/leaflet.css' // only seems to work when embedded in angula.json & Here! (chgs there REQUIRE restart!)
  ],
  providers: [SettingsService]
})
export class LmapComponent implements OnInit, AfterViewInit {

  //const L = window['L'];
  title = 'Leaflet Map'
  lmap?: L.Map
  overviewLMap?: L.Map
  overviewLMapType = { cur: 0, types: { type: ['roadmap', 'terrain', 'satellite', 'hybrid',] } } // TODO: Leaflet's version?
  //markers = L.markerClusterGroup()// google.maps.Marker[] = []  // TODO: google?!
  //markers: MarkerClusterGroup
  zoom // actual zoom level of main map
  zoomDisplay // what's displayed below main map
  center = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng }
  mouseLatLng = this.center
  fieldReports: FieldReportType[] = []
  //settings
  mymarkers = L.markerClusterGroup()
  mapOptions = ""


  markerClusterGroup: L.MarkerClusterGroup//  the MarkerClusterGroup class extends the FeatureGroup so it has all of the handy methods like clearLayers() or removeLayers()
  markerClusterData = []

  constructor(private settingsService: SettingsService,
    private fieldReportService: FieldReportService,
    private httpClient: HttpClient,
    @Inject(DOCUMENT) private document: Document) {

    this.fieldReportService = fieldReportService
    this.zoom = SettingsService.Settings.defZoom
    this.zoomDisplay = SettingsService.Settings.defZoom
    this.center = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng }
    //this.settings = SettingsService.Settings

    this.markerClusterGroup = L.markerClusterGroup({ removeOutsideVisibleBounds: true });
  }

  ngOnInit() {
    //https://www.npmjs.com/package/leaflet.markercluster
    //https://blog.mestwin.net/leaflet-angular-marker-clustering/
    //this.markerClusterGroup = L.markerClusterGroup({removeOutsideVisibleBounds: true});
  }

  ngAfterViewInit() {
    this.initMap();
    this.mymarkers = L.markerClusterGroup()

    /*
        // https://github.com/Leaflet/Leaflet.markercluster#defaults
        var markers3 = L.markerClusterGroup({
          spiderfyOnMaxZoom: false,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: false
        })

        var markers4 = L.markerClusterGroup({
          iconCreateFunction: function (cluster) {
            return L.divIcon({ html: '<b>' + cluster.getChildCount() + '</b>' });
          }
        });
    */

    /* https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service
    this.markerService.makeCapitalCircleMarkers(this.map);
    this.shapeService.getStateShapes().subscribe(states => {
      this.states = states;
      this.initStatesLayer(); //create a new GeoJSON layer and adds it to the map
    });
    */
  }
  onMapReady(ev: any) {
    console.log(`Leaflet OnMapReady`)
  }

  private initMap() {
    console.log("Init Leaflet Map..........")

    this.lmap = L.map('lmap', {
      center: [SettingsService.Settings.defLat, SettingsService.Settings.defLng],
      zoom: SettingsService.Settings.defZoom
    })

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    tiles.addTo(this.lmap)
    this.displayAllMarkers()
    this.fitBounds()

    this.lmap?.on('zoomend', (ev: L.LeafletEvent) => { //: MouseEvent  :PointerEvent //HTMLDivElement L.LeafletEvent L.LeafletMouseEvent
      if (this.zoomDisplay && this.lmap) {
        this.zoom = this.lmap.getZoom()
        this.zoomDisplay = this.lmap.getZoom()

      }
      //this.zoom! = this.lmap?.getZoom()
    })

    this.lmap.on('click', (ev: L.LeafletMouseEvent) => {
      // TODO: If enabled, drop a marker there...
      if (ev.latlng.lat) {
        console.log(`Click at lat: ${ev.latlng.lat}, lng: ${ev.latlng.lng}`)
      }
    })


    const OVERVIEW_DIFFERENCE = 6
    const OVERVIEW_MIN_ZOOM = 5
    const OVERVIEW_MAX_ZOOM = 16
    // https://developers.google.com/maps/documentation/javascript/examples/inset-map
    // instantiate the overview map without controls
    // https://leafletjs.com/reference.html#map-example
    this.overviewLMap = L.map('overview', {
      center: [SettingsService.Settings.defLat, SettingsService.Settings.defLng],
      zoom: SettingsService.Settings.defZoom,
      zoomControl: false,
      keyboard: false,
      scrollWheelZoom: false,
    })

    const overviewTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: OVERVIEW_MAX_ZOOM,
      minZoom: OVERVIEW_MIN_ZOOM,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    overviewTiles.addTo(this.overviewLMap)

    // TODO:
    /*this.overviewLMap!.addListener("click", () => {
      let mapId = this.overviewMapType.cur++ % 4
      this.overviewLMap!.setMapTypeId(this.overviewMapType.types.type[mapId])
      console.log(`Overview map set to ${this.overviewMapType.types.type[mapId]}`)
    })*/

    // const infowindow = new google.maps.InfoWindow({
    //   content: "Mouse location...",
    //   position: { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng },
    // })
    //infowindow.open(this.overviewLMap);

    this.overviewLMap?.on('mousemove', ($event: L.LeafletMouseEvent) => { // TODO: Only do while mouse is over map for efficiency?!
      if (this.zoomDisplay && this.overviewLMap) {
        this.zoomDisplay = this.overviewLMap.getZoom()!
      }
      if ($event.latlng) {
        this.mouseLatLng = $event.latlng //.toJSON()
      }
      //console.log(`Overview map at ${JSON.stringify(this.mouseLatLng)}`)
      //infowindow.setContent(`${JSON.stringify(latlng)}`)
    })

    this.overviewLMap!.on("bounds_changed", () => {
      this.overviewLMap!.setView(this.lmap!.getCenter()!, this.clamp(
        this.lmap!.getZoom()! - OVERVIEW_DIFFERENCE,
        OVERVIEW_MIN_ZOOM,
        OVERVIEW_MAX_ZOOM
      ))
    }
    )
  }

  clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
  }

  /*initMap2() {
    let tile2 = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Points &copy 2012 LINZ'
      }),
      latlng = L.latLng(SettingsService.Settings.defLat, SettingsService.Settings.defLng)

    let map = L.map('map', {
      center: [SettingsService.Settings.defLat, SettingsService.Settings.defLng],
      zoom: SettingsService.Settings.defZoom,
      layers: [tile2]
    });

    let mymarkers = L.markerClusterGroup();

    for (let i = 0; i < this.fieldReports.length; i++) {
      let title = `${this.fieldReports[i].callsign} at ${this.fieldReports[i].date} with ${this.fieldReports[i].status}`
      let marker = L.marker(new L.LatLng(this.fieldReports[i].lat, this.fieldReports[i].lng), { title: title })
      // = L.marker(new L.LatLng(a[0], a[1]), { title: title });
      marker.bindPopup(title)
      mymarkers.addLayer(marker);
    }

    map.addLayer(mymarkers);
  }*/


  private fitBounds() {
    this.fieldReportService.recalcFieldBounds()
    let bound = this.fieldReportService.getFieldReportBound()  // { east: east, north: north, south: south, west: west } //e,n,s,w
    console.log(`Fitting bounds= :${JSON.stringify(bound)}`)
    this.lmap?.fitBounds([
      [bound.south, bound.west],
      [bound.north, bound.east]
    ]);
  }

  displayAllMarkers() {
    this.fieldReports = this.fieldReportService.getFieldReports() // REVIEW: wipes out any not previously saved...
    console.log(`displayAllMarkers: all ${this.fieldReports.length} of 'em`)

    for (let i = 0; i < this.fieldReports.length; i++) {
      let title = `${this.fieldReports[i].callsign} at ${this.fieldReports[i].date} with ${this.fieldReports[i].status}`
      let marker = L.marker(new L.LatLng(this.fieldReports[i].lat, this.fieldReports[i].lng), { title: title })
      marker.bindPopup(title)
      this.mymarkers.addLayer(marker);
    }

    this.lmap?.addLayer(this.mymarkers);
    //console.log(`displayAllMarkers: created ${this.mymarkers.getChildCount()} of 'em`) //this.mymarkers.getChildCount is not a function

    // to refresh markers that have changed:
    // https://github.com/Leaflet/Leaflet.markercluster#refreshing-the-clusters-icon
  }


  private displayAllMarkers_NoCluster_Unused() {
    this.fieldReports = this.fieldReportService.getFieldReports() // REVIEW: wipes out any not previously saved...
    for (let i = 0; i < this.fieldReports.length; i++) {
      this.addMarker(this.fieldReports[i].lat, this.fieldReports[i].lng, this.fieldReports[i].status)
    }
  }

  private onMapMouseMove_Unused(event: L.LeafletEvent) {  // MouseEvent) { //google.maps.MapMouseEvent) {
    console.log(`onMapMouseMove: ${JSON.stringify(event)}`)
    //if (event.type. .lat) {
    //this.mouseLatLng = { lat: event.lat, lng: event.lng }
    //}
  }

  private zoomed_unused() {
    if (this.zoom && this.lmap) {
      this.zoom = this.lmap.getZoom()
    }
  }

  // https://blog.mestwin.net/leaflet-angular-marker-clustering/
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

  private addLayersToMap() {
    this.markerClusterGroup.addTo(this.lmap!);
  }


  private addMarker(lat: number, lng: number, status: string = '') {
    //console.log(`addMarker at ${lat}. ${lng}, ${status}`)

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
          console.log('open popup');
        });
        _marker.on('popupclose', function() {
          console.log('close popup');
        });
        _marker.on('mouseout', function() {
          console.log('close popup with mouseout');
          _map.closePopup();
        });
        console.log(_map.getZoom());
        if (_map.getZoom() > 15 && _map.hasLayer(_marker)) {
          _map.closePopup();
          console.log('zoom > 15 close popup');
        }
      */

      //markerCluster.addLayer(_mar);
      //}
      //_map.addLayer(markerCluster);


      _marker.addTo(this.lmap)

      _marker.addEventListener('click', this._markerOnClick);
    }
  }

  // TODO: https://stackoverflow.com/questions/30190268/leaflet-how-to-add-click-event-listener-to-popup
  /*
  for (var i = 0; i < users.length; i++) {
    (function (user) {
        var marker = L.marker([users[i].lat, users[i].lon], {icon: iconOff})
            .on('mouseover', function() { this.setIcon(iconOn); })
            .on('mouseout', function() { this.setIcon(iconOff); })
            .addTo(map);

        var myPopup = L.DomUtil.create('div', 'infoWindow');
        myPopup.innerHTML = "<div id='info'><p id='title'>" + users[i].title + "</p><p>" + users[i].addr + "</p></div>";

            marker.bindPopup(myPopup);

        $('#info', myPopup).on('click', function() {
            $("#userTitle").html(users[i].title).html();
            $("#userAddr").html(users[i].addr).html();
            $("#userDesc").html(users[i].desc).html();

            $("#userDetails").modal("show");
        });
    })(users[i]);
}
*/

  private _markerOnClick(e: any) {
    console.warn(`Got Marker Click!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! e= ${JSON.stringify(e)}`)
  }

  /* some error on map clicking
  733786.png:1          GET https://c.tile.openstreetmap.org/21/335179/733786.png 400
Image (async)
createTile @ leaflet-src.js:11702
733787.png:1          GET https://a.tile.openstreetmap.org/21/335179/733787.png 400
*/

  private addCircle_unused(lat: number, lng: number, status: string = '') {
    const circle = new L.CircleMarker([lat, lng], { radius: 20 })
    if (this.lmap) {
      circle.addTo(this.lmap)
    }
  }

  private static scaledRadius_unused(val: number, maxVal: number): number {
    return 20 * (val / maxVal);
  }

  // https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-marker-service
  private addCircles() {
    //const maxPop = Math.max(...res.features.map(x => x.properties.population), 0);
    /*
     this.httpClient.get(this.capitals).subscribe((res: any) => {

       const maxPop = Math.max(...res.features.map(x => x.properties.population), 0);

       for (const c of res.features) {
         const lon = c.geometry.coordinates[0];
         const lat = c.geometry.coordinates[1];
         const circle = L.circleMarker([lat, lon], {
           radius: MarkerService.scaledRadius(c.properties.population, maxPop)
         });

          circle.bindPopup(this.popupService.makeCapitalPopup(c.properties));

         circle.addTo(map);
       }
     });
     */
  }

  // do this in a service??
  private makeCapitalPopup(data: any): string {
    return `` +
      `<div>Capital: ${data.name}</div>` +
      `<div>State: ${data.state}</div>` +
      `<div>Population: ${data.population}</div>`
  }

  private initStatesLayer() {
    /* https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service Show borders of all the states in the US
      const stateLayer = L.geoJSON(this.states, {
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

      this.lmap!.addLayer(stateLayer);
      */
  }

  // https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service
  private highlightFeature(e: { target: any; }) {
    const layer = e.target;

    layer.setStyle({
      weight: 10,
      opacity: 1.0,
      color: '#DFA612',
      fillOpacity: 1.0,
      fillColor: '#FAE042'
    });
  }

  private resetFeature(e: { target: any; }) {
    const layer = e.target;

    layer.setStyle({
      weight: 3,
      opacity: 0.5,
      color: '#008f68',
      fillOpacity: 0.8,
      fillColor: '#6DB65B'
    });
  }

  // or on centerChanged
  private logCenter() {
    console.log(`Map center is at ${JSON.stringify(this.lmap?.getCenter())}`)
    this.lmap?.on("moveend", () => {
      console.log(this.lmap?.getCenter().toString());
    });
  }


  /*
    addMarker(latLng: google.maps.LatLng, infoContent = "", labelText = "grade", title = "", labelColor = "aqua", fontSize = "18px", icon = "rocket", animation = google.maps.Animation.DROP) {
      console.log(`addMarker`)

      if (infoContent == "") {
        infoContent = `Manual Marker dropped ${JSON.stringify(latLng)} at ${new Date()}`
      }
      if (title == "") {
        title = infoContent
      }
      labelText = "grade"
      //icon = "rocket"
      fontSize = "20px"

          //icon = "rocket"
          animation = google.maps.Animation.DROP


      let labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      // https://developers.google.com/maps/documentation/javascript/examples/marker-modern
      // https://material.angular.io/components/icon/overview
      //https://developers.google.com/fonts/docs/material_icons
      //https://fonts.google.com/icons
      if (latLng) {
        let dt = new Date();
        let time = `${Utility.zeroFill(dt.getHours(), 2)}:${Utility.zeroFill(dt.getMinutes(), 2)}:${Utility.zeroFill(dt.getSeconds(), 2)}` // :${Utility.zeroFill(dt.getMilliseconds(), 4)}`
        * REVIEW:
         let lat:number = event.latLng.lat  // gets:  Type '() => number' is not assignable to type 'number'.
         let lng:number = event.latLng.lng
         lat = Math.round(lat * 1000.0) / 1000.0
         lng = Math.round(lng * 1000.0) / 1000.0
         let pos = `lat: ${lat}; long: ${lng} `
         *
        let pos = `lat: ${latLng.lat}; long: ${latLng.lng}`
        //let pos = `lat: ${ Math.round(Number(event.latLng.lat * 1000) / 1000}; long: ${ Math.round(Number(event.latLng.lng) * 1000) / 1000 } `

        console.log("Actually adding marker now...")
        let m = new google.maps.Marker({
          draggable: true,
          animation: animation,
          map: this.gMap,
          position: latLng,
          title: title,
          //icon: icon, //"https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png",
          label: {
            // label: this.labels[this.labelIndex++ % this.labels.length],
            text: labelText, // https://fonts.google.com/icons: rocket, join_inner, noise_aware, water_drop, etc.
            fontFamily: "Material Icons",
            color: labelColor,

            fontSize: fontSize,
          },
          // label: labels[labelIndex++ % labels.length],
        })
        // markers can only be keyboard focusable when they have click listeners
        // open info window when marker is clicked
        // marker.addListener("click", () => {
        //this.infoWindow.setContent(label);
        //this.infoWindow.open(this.map, marker);
        // })

        m.addListener("click",   // this.toggleBounce)
          () => {
            //this.infowindow.setContent(`${ SpecialMsg } `)
            //`Manually dropped: ${time} at ${pos} `
            this.infowindow.setContent(infoContent)
            this.infowindow.open({
              // new google.maps.InfoWindow.open({
              //content: 'How now red cow.',
              anchor: m,
              //setPosition: event.latLng,
              map: this.gMap,
              // shouldFocus: false,
            })
          }
        )
        this.markers.push(m)
      } else {
        console.log("event.latLng is BAD; can not add marker..")
      }
      //this.refreshMarkerDisplay()
    }
  */




  // https://stackblitz.com/edit/ts-leaflet-markercluster

  /*
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


  // https://developer.what3words.com/tutorial/displaying-the-what3words-grid-on-a-leafletjs-map
  // https://developer.what3words.com/tutorial/combining-the-what3words-js-autosuggest-component-with-a-leafletjs-map


  const map2 = L.map('googleMapsPlaner', {
  center: [POLSKA_SZER_GEOGR, POLSKA_DL_GEOGR],
  zoom: POLSKA_ZOOM,
  zoomControl: true, layers: [tiles]
  });

  const markerIcon =
  L.icon({
  iconSize: [25, 41],
  iconAnchor: [10, 41],
  popupAnchor: [2, -40],
  // specify the path here
  iconUrl: "https://unpkg.com/leaflet@1.4.0/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.4.0/dist/images/marker-shadow.png"
  })


  const bergen = {lat:60.3948648649804, long:5.321473714945354}

  const markerCluster = new L.MarkerClusterGroup();

  let marker = L.marker(new L.LatLng(POLSKA_SZER_GEOGR, POLSKA_DL_GEOGR), { title: 'my', icon: markerIcon });
  markerCluster.addLayer(marker);

  marker = L.marker(new L.LatLng(POLSKA_SZER_GEOGR + 1, POLSKA_DL_GEOGR + 1), { title: 'my', icon: markerIcon });
  markerCluster.addLayer(marker);

  map2.addLayer(markerCluster);


  marker = L.marker(new L.LatLng(POLSKA_SZER_GEOGR, POLSKA_DL_GEOGR), { title: 'my', icon: markerIcon });
  markerCluster.addLayer(marker);

  marker = L.marker(new L.LatLng(POLSKA_SZER_GEOGR + 1, POLSKA_DL_GEOGR + 1), { title: 'my', icon: markerIcon });
  markerCluster.addLayer(marker);

  map2.addLayer(markerCluster);



  /*const addressPoints = [
    [POLSKA_SZER_GEOGR, POLSKA_DL_GEOGR, '1'],
    [POLSKA_SZER_GEOGR + 1, POLSKA_DL_GEOGR + 1, '1'],
  ]
  */
  //  const markers = L.markerClusterGroup();

  /*

  for (let i = 0; i < addressPoints.length; i++) {
    //if (addressPoints[i]) {      }
    let a = addressPoints[i];
    let title = a[2];
    let marker = L.marker(new L.LatLng(a[0], a[1]), {
      title: title,
      icon: markerIcon
    });
    marker.bindPopup(title);
    markers.addLayer(marker);
  }
  */
  //map2.addLayer(markers);



  // Create GeoJSON layer & add to map
  // https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet-shape-service
  initShapesLayer() {
    /*
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
      */
  }
}



function initShapesLayer() {
  throw new Error('Function not implemented.');
}
/*
OLD CODE from Ranger 4.2 ===============================================

TODO: Abstract common code to here, unique to calling routine..

 initLeafletMap() {
    // https://leaflet.github.io/Leaflet.markercluster/example/marker-clustering-zoomtobounds.html
    // https://leafletjs.com/examples/layers-control/
    // TODO: This needs to get moved to actual point/marker display...
    let //p1 = L.marker([DEF_LAT, DEF_LONG]).bindPopup('Person 1 - John'),
        //p2 = L.marker([DEF_LAT-.1, DEF_LONG-.02]).bindPopup('Person 2 - Fred'),
        //p3 = L.marker([DEF_LAT+.02, DEF_LONG+.01]).bindPopup('Person 3 - Sally'),
        //p4 = L.marker([DEF_LAT+.01, DEF_LONG+.02]).bindPopup('Person 4 - Bucky'),
        //p5 = L.marker([DEF_LAT, DEF_LONG]).bindPopup('Person 5 - maryAnne'),
        //p6 = L.marker([DEF_LAT-.13, DEF_LONG-.025]).bindPopup('Person 6 - Cathy'),
        //p7 = L.marker([DEF_LAT+.022, DEF_LONG+.014]).bindPopup('Person 7 - Michael'),
        p8 = L.marker([DEF_LAT+.011, DEF_LONG+.022]).bindPopup('Person 8 - Olivia');

    //Instead of adding them directly to the map, you can do the following, using the LayerGroup class:
    let Team1 = L.layerGroup([p8]); //, p2, p3, p4]);
    let Team2 = L.layerGroup([p8]); //, p6, p7, p8]);

    let grayscale = L.tileLayer(mapboxUrl, {id: 'mapId1', attribution: mapboxAttribution});
    let streets   = L.tileLayer(mapboxUrl, {id: 'mapId2', attribution: mapboxAttribution});
    let mstreets  = L.tileLayer(mapboxUrl, {maxZoom: 16, attribution: mapboxAttribution, id: 'mapbox.streets'})
    let estreets = L.esri.basemapLayer('Streets');

    //https://leafletjs.com/reference-1.4.0.html#control-layers
    let baseMaps = {
      //"<span style='color: gray'>Grayscale</span>": grayscale,    // grayscale may no longer exist??
      //"Streets": streets
    };
    let overlayMaps = {
      "Team1": Team1,
      "Team2": Team2
    };

    bigMap   = L.map('bigLeafletMapId', {maxZoom: 20,
      layers: [estreets] // actual layers on map   //, Team1, Team2
    });
    bigMap.setView([DEF_LAT, DEF_LONG], 8);


    // Add the layer widget to the map, requires maxzoom?
    L.control.layers(baseMaps, overlayMaps).addTo(bigMap);

    //L.tileLayer(mapboxUrl, {maxZoom: 18, attribution: mapboxAttribution,id: 'mapbox.streets'}).addTo(bigMap);
  }

  initSmallMap() {
    smallMap = L.map('smallMapId' ).setView([DEF_LAT, DEF_LONG], 12);
    L.esri.basemapLayer('Streets').addTo(smallMap);

    /*
    L.tileLayer(mapboxUrl, {
      maxZoom: 18,
      attribution: mapboxAttribution,
      id: 'mapbox.streets'
    }).addTo(smallMap);
    *  /
    smallMap.setView([DEF_LAT,DEF_LONG], 12);

    smallMap.on('click', onSmallMapClick);
    // TODO: There are now 2 leaflet containers. OK?
    $('.leaflet-container').css('cursor','crosshair'); // reset cursor with ''!

    // Display coordinates if map is clicked
    let popup2 = L.popup();

    function onSmallMapClick(e) {
      popup2
        .setLatLng(e.latlng)
        .setContent(e.latlng.toString())
        .openOn(smallMap);
    }
  }

  filterLeafletMap() {
    dbug("filterLeafletMap...");
    /* Sorting:
      let points = [40, 100, 1, 5, 25, 10];
      points.sort(function(a, b){return a - b});
    * /
      let team = document.getElementById("teamFilterId").value;
      let call = document.getElementById("callFilterId").value;
      let filters = {
        Team: document.getElementById("teamFilterId").value,
        CallSign: document.getElementById("callFilterId").value,
        Minutes: document.getElementById("minuteFilterId").value,
        BaseTime: document.getElementById("baseTimeFilterId").value
      };

      dbug("Filtering on: "
        + filters.Team + " AND "
        + filters.CallSign + " AND "
        + filters.Minutes + " AND "
        + filters.BaseTime);

      filterLocations(filters);
    }
  */
