import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnInit, ViewChild, OnDestroy } from '@angular/core'
import { DOCUMENT, JsonPipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Observable, Subscription } from 'rxjs'
import { tileLayer, latLng, control, marker, icon, divIcon, LatLngBounds, Map, MapOptions, MarkerClusterGroup, MarkerClusterGroupOptions } from 'leaflet'
import * as L from 'leaflet'
//import { tileLayer, latLng, control, marker, icon, divIcon, LatLngBounds, Map, MapOptions, MarkerClusterGroup, MarkerClusterGroupOptions } from 'leaflet'
import 'leaflet.markercluster';
//import { openDB, deleteDB, wrap, unwrp } from 'idb'
import 'leaflet.offline' // https://github.com/allartk/leaflet.offline

import { SettingsService, FieldReportService, FieldReportType, FieldReportStatusType, FieldReportsType, LogService } from '../shared/services'
//import { CodeArea, OpenLocationCode, Utility } from '../shared/'
//import { Context } from 'ag-grid-community'
import { MDCSwitch } from '@material/switch'

// https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet
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


@Component({
  selector: 'rangertrak-lmap',
  templateUrl: './lmap.component.html',
  styleUrls: [
    './lmap.component.scss',
    "../../../node_modules/leaflet.markercluster/dist/MarkerCluster.css", // REVIEW: also added to angular.json: needed there?
    "../../../node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css", // (not needed if you use your own iconCreateFunction instead of the default one)
    '../../../node_modules/leaflet/dist/leaflet.css' // only seems to work when embedded in angular.json & Here! (chgs there REQUIRE restart!)
  ],
  providers: [SettingsService]
})
export class LmapComponent implements OnInit, AfterViewInit, OnDestroy {
  private id = 'Leaflet Map Component'
  public title = 'Leaflet Map'
  public eventInfo = ''
  public dateNow = Date.now()
  lmap?: L.Map
  overviewLMap?: L.Map
  overviewLMapType = { cur: 0, types: { type: ['roadmap', 'terrain', 'satellite', 'hybrid',] } } // TODO: Leaflet's version?
  zoom // actual zoom level of main map
  zoomDisplay // what's displayed below main map
  center = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng }
  mouseLatLng = this.center
  mymarkers = L.markerClusterGroup()
  mapOptions = ""

  markerClusterGroup: L.MarkerClusterGroup//  the MarkerClusterGroup class extends the FeatureGroup so it has all of the handy methods like clearLayers() or removeLayers()
  markerClusterData = []

  private fieldReports: FieldReportsType | undefined
  private latestReport: FieldReportsType | undefined
  public fieldReportArray: FieldReportType[] = []
  private fieldReportsSubscription$!: Subscription
  private fieldReportStatuses: FieldReportStatusType[] = []
  selectedRows = 0
  allRows = 0

  //selectedFieldReports: FieldReportType[] = []
  filterSwitch: MDCSwitch | null = null
  filterButton: HTMLButtonElement | null = null

  constructor(private settingsService: SettingsService,
    private fieldReportService: FieldReportService,
    private httpClient: HttpClient,
    private log: LogService,
    @Inject(DOCUMENT) private document: Document) {

    this.fieldReportService = fieldReportService
    this.zoom = SettingsService.Settings.defZoom
    this.zoomDisplay = SettingsService.Settings.defZoom
    this.center = { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng }
    //this.settings = SettingsService.Settings
    this.eventInfo = `Event: ; Mission: ; Op Period: ; `
    this.markerClusterGroup = L.markerClusterGroup({ removeOutsideVisibleBounds: true });
  }

  ngOnInit() {
    this.fieldReportsSubscription$ =
      this.fieldReportService.getFieldReportsObserver().subscribe({
        next: (newReport) => {
          this.latestReport = newReport
          this.gotNewFieldReports(newReport)
        },
        error: (e) => this.log.error('Field Reports Subscription got:' + e, this.id),
        complete: () => this.log.info('Field Reports Subscription complete', this.id)
      })

    this.filterButton = document.querySelector('#selectedFieldReports') as HTMLButtonElement
    if (!this.filterButton) { throw ("Could not find Field Report Selection button!") }

    this.selectedRows = this.fieldReportService.getSelectedFieldReports().fieldReportArray.length
    this.filterSwitch = new MDCSwitch(this.filterButton)
    if (!this.filterSwitch) throw ("Could not find Field Report Selection Switch!")
  }

  ngAfterViewInit() {
    this.initMap();
    this.mymarkers = L.markerClusterGroup()
  }

  gotNewFieldReports(newReports: FieldReportsType) {
    this.log.verbose(`New collection of ${newReports.numReport} Field Reports observed.`, this.id)

    this.allRows = newReports.numReport
    this.fieldReports = newReports
    this.fieldReportArray = newReports.fieldReportArray
    console.assert(this.allRows == this.fieldReportArray.length, `this.allRows=${this.allRows} != this.fieldReportArray.length ${this.fieldReportArray.length}`)
    //this.refreshMap()
    // this.reloadPage()  // TODO: needed?
  }

  onMapReady(ev: any) {
    this.log.verbose(`Leaflet OnMapReady`, this.id)
  }

  private initMap() {
    this.log.verbose("Init Leaflet Map", this.id)


    // ---------------- Init Main Map -----------------


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

    if (this.lmap && this.fieldReports) {
      this.displayAllMarkers()

      this.log.info(`E: ${this.fieldReports.bounds.getEast()};  N: ${this.fieldReports.bounds.getNorth()};  W: ${this.fieldReports.bounds.getWest()};  S: ${this.fieldReports.bounds.getSouth()};  `, this.id)
      this.lmap.fitBounds(this.fieldReports.bounds)
    }

    // BUG: not working....
    this.lmap?.on('zoomend', (ev: L.LeafletEvent) => { //: MouseEvent  :PointerEvent //HTMLDivElement L.LeafletEvent L.LeafletMouseEvent
      if (this.lmap) { // this.zoomDisplay &&
        this.zoom = this.lmap.getZoom()
        this.zoomDisplay = this.lmap.getZoom()
      }
    })

    this.lmap.on('click', (ev: L.LeafletMouseEvent) => {
      // TODO: If enabled, drop a marker there...
      if (ev.latlng.lat) {
        this.log.verbose(`Click at lat: ${ev.latlng.lat}, lng: ${ev.latlng.lng}`, this.id)
      }
    })

    this.lmap.on('mousemove', (ev: L.LeafletMouseEvent) => {
      if (ev.latlng.lat) {
        //this.log.verbose(`Mouse at lat: ${ev.latlng.lat}, lng: ${ev.latlng.lng}`, this.id)
        this.mouseLatLng = ev.latlng
      }
    })

    this.lmap.on("move", () => {
      this.overviewLMap!.setView(this.lmap!.getCenter()!, this.clamp(
        this.lmap!.getZoom()! - OVERVIEW_DIFFERENCE,
        OVERVIEW_MIN_ZOOM,
        OVERVIEW_MAX_ZOOM
      ))
    })


    // ---------------- Init OverView Map -----------------


    // TODO: Add a light grey rectangle on overview map to show extend/bounods of main map
    // TODO: Add a switch to only show 'selected' reports from the FieldReport page...
    const OVERVIEW_DIFFERENCE = 5
    const OVERVIEW_MIN_ZOOM = 5
    const OVERVIEW_MAX_ZOOM = 16
    // instantiate the overview map without controls
    // https://leafletjs.com/reference.html#map-example
    this.overviewLMap = L.map('overview', {
      center: [SettingsService.Settings.defLat, SettingsService.Settings.defLng],
      zoom: SettingsService.Settings.defZoom,
      zoomControl: false,
      keyboard: false,
      scrollWheelZoom: false,
      dragging: false,
    })

    const overviewTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: OVERVIEW_MAX_ZOOM,
      minZoom: OVERVIEW_MIN_ZOOM,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    overviewTiles.addTo(this.overviewLMap)

    // TODO: Switch map type on click on the overview map
    /* this.overviewLMap!.addListener("click", () => {
      let mapId = this.overviewMapType.cur++ % 4
      this.overviewLMap!.setMapTypeId(this.overviewMapType.types.type[mapId])
      this.log.verbose(`Overview map set to ${this.overviewMapType.types.type[mapId]}`, this.id)
    })*/

    // const infowindow = new google.maps.InfoWindow({
    //   content: "Mouse location...",
    //   position: { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLng },
    // })
    //infowindow.open(this.overviewLMap);

    this.overviewLMap?.on('mousemove', ($event: L.LeafletMouseEvent) => {
      // TODO: Only do while mouse is over map for efficiency?! mouseover & mouseout events...
      if (this.zoomDisplay && this.overviewLMap) {
        this.zoomDisplay = this.overviewLMap.getZoom()!
      }
      if ($event.latlng) {
        this.mouseLatLng = $event.latlng //.toJSON()
      } else {
        this.log.warn(`No latlng on event in initMap()`, this.id)
      }
    })

    this.overviewLMap!.on("bounds_changed", () => {
      this.overviewLMap!.setView(this.lmap!.getCenter()!, this.clamp(
        this.lmap!.getZoom()! - OVERVIEW_DIFFERENCE,
        OVERVIEW_MIN_ZOOM,
        OVERVIEW_MAX_ZOOM
      ))
    })
  }

  clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
  }


  // TODO: Unset the following if SWITCH is unset!!!!
  getAndDisplayFieldReports() {
    if (!this.filterSwitch || !this.filterSwitch.selected) {
      this.log.verbose(`Displaying ALL ${this.fieldReportArray.length} field Reports`, this.id)
    } else {
      this.fieldReportArray = this.fieldReportService.getSelectedFieldReports().fieldReportArray
      this.log.verbose(`Displaying ${this.fieldReportArray.length} SELECTED field Reports`, this.id)
    }
  }

  displayAllMarkers() {
    // REVIEW: wipes out any not previously saved...

    this.log.verbose(`displayAllMarkers: all ${this.fieldReports?.numReport} of 'em`, this.id)
    this.fieldReports?.fieldReportArray.forEach(i => {
      if (i.lat && i.lng) {  // TODO: Do this in the FieldReports Service - or also the GMap; thewse only happened when location was broken???
        let title = `${i.callsign} at ${i.date} with ${i.status}`
        //this.log.verbose(`displayAllMarkers: ${i}: ${JSON.stringify(i)}`, this.id)

        let marker = L.marker(new L.LatLng(i.lat, i.lng), { title: title })
        marker.bindPopup(title)
        this.mymarkers.addLayer(marker);
      } else {
        console.warn(`displayAllMarkers: skipping report # ${i.id}; bad lat/lng: ${i}: ${JSON.stringify(i)}`)
      }
    })

    this.lmap?.addLayer(this.mymarkers);

    // to refresh markers that have changed:
    // https://github.com/Leaflet/Leaflet.markercluster#refreshing-the-clusters-icon
  }


  // https://blog.mestwin.net/leaflet-angular-marker-clustering/
  private getDefaultIcon() {
    return icon({
      iconSize: [25, 41],
      iconAnchor: [13, 41],
      iconUrl: './../../assets/icons/marker-icon.png'
    })
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
        this.log.verbose(_map.getZoom());
        if (_map.getZoom() > 15 && _map.hasLayer(_marker)) {
          _map.closePopup();
          this.log.verbose('zoom > 15 close popup', this.id);
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
    this.log.warn(`Got Marker Click!!!! e= ${JSON.stringify(e)}`, this.id)
  }

  /* some error on map clicking
  733786.png:1          GET https://c.tile.openstreetmap.org/21/335179/733786.png 400
  Image (async)
  createTile @ leaflet-src.js:11702
  733787.png:1          GET https://a.tile.openstreetmap.org/21/335179/733787.png 400
  */

  ngOnDestroy() {
    this.fieldReportsSubscription$.unsubscribe()
  }


  //  -------------------------------------  UNUSED  -------------------------------------

  public onMapMouseMove_unused(event: MouseEvent) {
    this.log.verbose(`onMapMouseMove: ${JSON.stringify(event)}`, this.id)
    //let ev = event as L.LeafletMouseEvent
    //this.mouseLatLng = { lat: event.latlng.lat, lng: event.latlng.lng }
  }


  private displayAllMarkers_NoCluster_Unused() {
    // REVIEW: wipes out any not previously saved...
    this.fieldReports?.fieldReportArray.forEach(i => {
      this.addMarker(i.lat, i.lng, i.status)
    })
  }

  private zoomed_unused() {
    if (this.zoom && this.lmap) {
      this.zoom = this.lmap.getZoom()
    }
  }

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


  private createMarker() {
    const mapIcon = this.getDefaultIcon();
    // const coordinates = latLng([this.mapPoint.latitude, this.mapPoint.longitude]);
    // this.lastLayer = marker(coordinates).setIcon(mapIcon);
    // this.markerClusterGroup.addLayer(this.lastLayer)
  }

  private addLayersToMap() {
    this.markerClusterGroup.addTo(this.lmap!);
  }

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

}
