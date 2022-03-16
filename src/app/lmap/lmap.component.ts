import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnInit, ViewChild, OnDestroy } from '@angular/core'
import { DOCUMENT, JsonPipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Observable, Subscription } from 'rxjs'
import { MDCSwitch } from '@material/switch'

import { tileLayer, latLng, control, marker, icon, divIcon, LatLngBounds, Map, MapOptions, MarkerClusterGroup, MarkerClusterGroupOptions } from 'leaflet'
import * as L from 'leaflet'
import 'leaflet.markercluster';

//import { openDB, deleteDB, wrap, unwrp } from 'idb'
import 'leaflet.offline' // https://github.com/allartk/leaflet.offline
// also: https://github.com/onthegomap/planetiler

import { SettingsService, FieldReportService, FieldReportType, FieldReportStatusType, FieldReportsType, LogService, SettingsType } from '../shared/services'

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

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  private fieldReportsSubscription!: Subscription
  private fieldReports: FieldReportsType | undefined

  // What gets displayed: alternates between all & selected rows, based on the switch
  private selectedReports: FieldReportsType | null = null
  public displayedFieldReportArray: FieldReportType[] = []
  //!this is just a subcomponent of the above: use the above if possible...  OH NO: this actually flipps back & forth between all & selected field reports, based on the switch...
  // following doesn't need a subscription as user selections are auto-saved & available,
  // if they switch to this page
  // REVIEW: UNLESS the switch was already on "selected rows" and isn't reswitched!!!: so just check/reset in ngOnInit?!
  // Also # selected rows = ALL when initialized...

  numSelectedRows = 0
  allRows = 0

  lmap!: L.Map
  overviewLMap!: L.Map
  // TODO: Leaflet's version of following?
  overviewLMapType = { cur: 0, types: { type: ['roadmap', 'terrain', 'satellite', 'hybrid',] } }
  zoom = 15 // actual zoom level of main map
  zoomDisplay = 15 // what's displayed below main map
  center = { lat: 0, lng: 0 }
  mouseLatLng = this.center
  mymarkers = L.markerClusterGroup()
  mapOptions = ""

  markerClusterGroup: L.MarkerClusterGroup // MarkerClusterGroup extends FeatureGroup, retaining it's methods, e.g., clearLayers() & removeLayers()
  markerClusterData = []

  filterSwitch: MDCSwitch | null = null
  filterButton: HTMLButtonElement | null = null

  constructor(
    private settingsService: SettingsService,
    private fieldReportService: FieldReportService,
    private httpClient: HttpClient,
    private log: LogService,
    @Inject(DOCUMENT) private document: Document) {

    this.fieldReportService = fieldReportService

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        // REVIEW: Any new settings just ripple thru, or does anything need pushing?!
        this.settings = newSettings
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.fieldReportsSubscription =
      this.fieldReportService.getFieldReportsObserver().subscribe({
        next: (newReport) => {
          this.gotNewFieldReports(newReport)
        },
        error: (e) => this.log.error('Field Reports Subscription got:' + e, this.id),
        complete: () => this.log.info('Field Reports Subscription complete', this.id)
      })

    this.markerClusterGroup = L.markerClusterGroup({ removeOutsideVisibleBounds: true });
  }

  ngOnInit() {
    this.filterButton = document.querySelector('#selectedFieldReports') as HTMLButtonElement
    if (!this.filterButton) { throw ("Could not find Field Report Selection button!") }

    // Selected Field Reports are retrieved when user clicks the slider switch...but we do need the #!
    //! 2TEST: Does this get re-hit if user swittches back, adjusts # selected rows and returns???
    // BUG: refresh page resets selected switch
    this.onSwitchSelectedFieldReports()

    // Just get the # of rows in the selection (if any), so we can properly display that # next to the switch
    if (this.selectedReports = this.fieldReportService.getSelectedFieldReports()) {
      this.numSelectedRows = this.selectedReports.numReport
      if (this.numSelectedRows != this.selectedReports.fieldReportArray.length) {
        this.log.error(`ngOnInit issue w/ selected rows ${this.numSelectedRows} != ${this.selectedReports.fieldReportArray.length}`, this.id)
        this.selectedReports.numReport = this.selectedReports.fieldReportArray.length
        this.numSelectedRows = this.selectedReports.fieldReportArray.length
      }
    } else {
      this.log.warn(`Could not retrieve selected Field Reports in ngOnInit.`, this.id)
      this.numSelectedRows = 0
    }

    this.filterSwitch = new MDCSwitch(this.filterButton)
    if (!this.filterSwitch) throw ("Could not find Field Report Selection Switch!")

    // REVIEW: Following code is duplicated in ngAfterViewInit: which does the task?!
    if (!this.settings) {
      this.log.error(`this.settings not yet established in ngInit()`, this.id)
      return
    }
    this.center = { lat: this.settings.defLat, lng: this.settings.defLng }
    this.zoom = this.settings.leaflet.defZoom
    this.zoomDisplay = this.zoom
  }

  ngAfterViewInit() {
    if (!this.settings) {
      this.log.error(`this.settings not yet established in ngAfterViewInit()`, this.id)
      // REVIEW: Can initMap run OK w/ defaults, but w/o settings
    } else {
      this.center = { lat: this.settings.defLat, lng: this.settings.defLng }
      this.zoom = this.settings.leaflet.defZoom
      this.zoomDisplay = this.zoom
    }

    this.initMap()
    this.mymarkers = L.markerClusterGroup()
  }

  gotNewFieldReports(newReports: FieldReportsType) {
    this.log.verbose(`New collection of ${newReports.numReport} Field Reports observed.`, this.id)

    this.allRows = newReports.numReport
    this.fieldReports = newReports
    this.displayedFieldReportArray = newReports.fieldReportArray
    console.assert(this.allRows == this.displayedFieldReportArray.length, `this.allRows=${this.allRows} != this.fieldReportArray.length ${this.displayedFieldReportArray.length}`)
    this.refreshMap()
    // this.reloadPage()  // TODO: needed?
  }

  onMapReady(ev: any) {
    this.log.verbose(`Leaflet OnMapReady`, this.id)
  }


  private initMap() {
    this.log.verbose("Init Leaflet Map", this.id)

    if (!this.settings) {
      this.log.error(`Settings not yet initialized while initializing the Leaflet Map!`, this.id)
      return
    }

    if (!this.fieldReports) { //! or displayedFieldReportArray
      this.log.error(`fieldReports not yet initialized while initializing the Leaflet Map!`, this.id)
      return
    }

    // ---------------- Init Main Map -----------------


    //? Per guidence on settings page: Maps do not use defLat/lng... They are auto-centered on the bounding coordinates centroid of all points entered and the map is then zoomed to show all points.
    this.lmap = L.map('lmap', {
      center: [this.settings.defLat, this.settings.defLng],
      zoom: this.settings.leaflet.defZoom
    })

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    tiles.addTo(this.lmap)

    if (this.lmap && this.displayedFieldReportArray) {
      // ! REVIEW: need to see which way switch is set and maybe set: displayedFieldReportArray 1st....
      // maybe do this further down?!
      this.displayMarkers()



      // debugger
      //! this.fieldReports.bounds.getEast is not a function
      //!this.log.info(`E: ${this.fieldReports.bounds.getEast()};  N: ${this.fieldReports.bounds.getNorth()};  W: ${this.fieldReports.bounds.getWest()};  S: ${this.fieldReports.bounds.getSouth()};  `, this.id)

      /*
            core.mjs:6485 ERROR Error: Bounds are not valid.
          at NewClass.fitBounds (leaflet-src.js:3254:12)
          at LmapComponent.initMap (lmap.component.ts:216:17)
          at LmapComponent.ngAfterViewInit (lmap.component.ts:162:10)
          */
      // bnd: L.latLngBounds = this.fieldReports.bounds
      // ! displayedFieldReportArray
      this.lmap.fitBounds(this.fieldReports.bounds)
    }

    //! BUG: not working....
    this.lmap.on('zoomend', (ev: L.LeafletEvent) => { //: MouseEvent  :PointerEvent //HTMLDivElement L.LeafletEvent L.LeafletMouseEvent
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

    //! BUG: not working....
    this.lmap.on('mousemove', (ev: L.LeafletMouseEvent) => {
      if (ev.latlng.lat) {
        this.log.verbose(`Mouse at lat: ${ev.latlng.lat}, lng: ${ev.latlng.lng}`, this.id)
        this.mouseLatLng = ev.latlng
      } else {
        debugger // ! ==========================
        this.log.warn(`Mouse moved, but did not get an reasonable event to figure out lat/lng ${JSON.stringify(ev)}`, this.id)
      }
    })

    this.lmap.on("move", () => {
      this.overviewLMap.setView(this.lmap.getCenter()!, this.clamp(
        this.lmap.getZoom() - (this.settings.leaflet.overviewDifference),
        (this.settings.leaflet.overviewMinZoom),
        (this.settings.leaflet.overviewMaxZoom)
      ))
    })


    // ---------------- Init OverView Map -----------------


    // TODO: Add a light grey rectangle on overview map to show extend/bounods of main map
    // TODO: Add a switch to only show 'selected' reports from the FieldReport page...

    // instantiate the overview map without controls
    // https://leafletjs.com/reference.html#map-example
    this.overviewLMap = L.map('overview', {
      center: [this.settings.defLat, this.settings.defLng],
      zoom: this.settings.leaflet.defZoom,
      zoomControl: false,
      keyboard: false,
      scrollWheelZoom: false,
      dragging: false,
    })

    const overviewTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: this.settings.leaflet.overviewMaxZoom,
      minZoom: this.settings.leaflet.overviewMinZoom,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    overviewTiles.addTo(this.overviewLMap)

    // TODO: Switch map type on click on the overview map
    /* this.overviewLMap.addListener("click", () => {
      let mapId = this.overviewMapType.cur++ % 4
      this.overviewLMap.setMapTypeId(this.overviewMapType.types.type[mapId])
      this.log.verbose(`Overview map set to ${this.overviewMapType.types.type[mapId]}`, this.id)
    })*/

    // const infowindow = new google.maps.InfoWindow({
    //   content: "Mouse location...",
    //   position: { lat: this.settings.defLat, lng: this.settings.defLng },
    // })
    //infowindow.open(this.overviewLMap);

    this.overviewLMap.on('mousemove', ($event: L.LeafletMouseEvent) => {
      // TODO: Only do while mouse is over map for efficiency?! mouseover & mouseout events...
      if (this.zoomDisplay && this.overviewLMap) {
        this.zoomDisplay = this.overviewLMap.getZoom()!
      }
      if ($event.latlng) {
        this.mouseLatLng = $event.latlng //.toJSON()
      } else {
        this.log.warn(`No latlng on event in leaflet overview - initMap()`, this.id)
      }
    })

    this.overviewLMap.on("bounds_changed", () => {
      this.overviewLMap.setView(this.lmap.getCenter(), this.clamp(
        this.lmap.getZoom() - (this.settings.leaflet.overviewDifference),
        (this.settings.leaflet.overviewMaxZoom),
        (this.settings.leaflet.overviewMinZoom)
      ))
    })
  }

  clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
  }

  refreshMap() {
    // Try map.remove(); before you try to reload the map. This removes the previous map element using Leaflet's library
    if (this.lmap) {
      this.lmap.invalidateSize() // https://github.com/Leaflet/Leaflet/issues/690
      //or
      // this.lmap.off()
      // this.lmap.remove() // removing ALSO destroys the div id reference, so then rebuild the map div
      // this.initMap() // ?????????? Need testing!!!!
      // or
      /*
      for (i=0;i<points.length;i++) {
        map.removeLayer(points[i]);
      }
      points=[];
      */
      // or
      /* for angular: https://stackoverflow.com/a/50386028/18004414
        $scope.$on('$locationChangeStart', function( event ) {
          if(map != undefined)
          {
            map.remove();
            map = undefined
            document.getElementById('mapLayer').innerHTML = "";
          }
      });
      Without document.getElementById('mapLayer').innerHTML = "" the map was not displayed on the next page.

      This helped me. I am using Angular 6 and changing the map depending on locations the user clicks on. I just have a method to create a new map which return the map object. When I update the map, I pass the existing map object in and do the above without the innerHTML part.
      */
      //or tiles.redraw();
    }
  }

  onSwitchSelectedFieldReports() { //event: any) {
    if (!this.filterSwitch || !this.filterSwitch.selected) {
      if (!this.fieldReports) {
        this.log.error(`field Reports not yet set in onSwitchSelectedFieldReports()`, this.id)
        return
      }
      this.displayedFieldReportArray = this.fieldReports.fieldReportArray
      this.log.verbose(`Displaying ALL ${this.displayedFieldReportArray.length} field Reports`, this.id)
      if (this.numSelectedRows != this.displayedFieldReportArray.length) {
        this.log.warn(`Need to update numSelectedRows ${this.numSelectedRows} != actual array length ${this.displayedFieldReportArray.length}`)
      }
    } else {
      this.displayedFieldReportArray = this.fieldReportService.getSelectedFieldReports().fieldReportArray
      // ! REVIEW: we did NOT grab the whole selectedFieldReports structure, JUST the report array: OK?!
      this.numSelectedRows = this.displayedFieldReportArray.length
      this.log.verbose(`Displaying ${this.displayedFieldReportArray.length} SELECTED field Reports`, this.id)
    }
    // TODO: Need to refresh map?!
    this.refreshMap()
    // this.reloadPage()  // TODO: needed?
  }


  // ------------------------------------  Markers  ---------------------------------------


  displayMarkers() {
    // REVIEW: wipes out any manually dropped markers. Could save 'em, but no request for that...
    //! This needs to be rerun & ONLY display selected rows/markers: i.e., to use  displayedFieldReportArray
    if (!this.displayedFieldReportArray) {
      this.log.error(`displayAllMarkers did not find field reports to display`, this.id)
      return
    }
    this.log.verbose(`displayMarkers: all ${this.displayedFieldReportArray.length} of 'em`, this.id)
    this.displayedFieldReportArray.forEach(i => {
      if (i.lat && i.lng) {  // TODO: Do this in the FieldReports Service - or also the GMap; thewse only happened when location was broken???
        let title = `${i.callsign} at ${i.date} with ${i.status}`
        //this.log.verbose(`displayMarkers: ${i}: ${JSON.stringify(i)}`, this.id)

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
    this.fieldReportsSubscription.unsubscribe()
    this.settingsSubscription.unsubscribe()
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
