

// also: https://github.com/onthegomap/planetiler
//import { openDB, deleteDB, wrap, unwrp } from 'idb'
import 'leaflet.markercluster'
import 'leaflet.offline' // https://github.com/allartk/leaflet.offline

import * as L from 'leaflet'
import pc from 'picocolors' // https://github.com/alexeyraspopov/picocolors
import { throwError } from 'rxjs'

import { DOCUMENT } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { AfterViewInit, Component, Inject, Input, OnDestroy, OnInit } from '@angular/core'

import { AbstractMap } from '../shared/map'
import { FieldReportService, LocationType, LogService, SettingsService } from '../shared/services'

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
//type LatLng = { lat: number, lng: number }

// From package.json
//  "leaflet.markercluster": "^1.5.3",
//    "leaflet.offline": "^2.1.0"

// devedependencies:  "@types/leaflet": "^1.7.9",
//    "@types/leaflet.markercluster": "^1.4.6",

/* Angular.json: Styles

"./node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css",
              "./node_modules/leaflet.markercluster/dist/MarkerCluster.css",
              "./node_modules/leaflet/dist/leaflet.css",
              */

@Component({
  selector: 'rangertrak-lmap',
  templateUrl: './lmap.component.html',
  styleUrls: [
    './lmap.component.scss'
    //,     "../../../node_modules/leaflet.markercluster/dist/MarkerCluster.css", // REVIEW: also added to angular.json: needed there?
    // "../../../node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css" // (not needed if you use your own iconCreateFunction instead of the default one)
    //'../../../node_modules/leaflet/dist/leaflet.css' // only seems to work when embedded in angular.json & Here! (chgs there REQUIRE restart!)
  ],
  providers: [SettingsService]
})
export class LmapComponent extends AbstractMap implements AfterViewInit, OnDestroy {  //OnInit,

  public override id = 'Leaflet Map Component'
  public override title = 'Leaflet Map'
  private lMap!: L.Map
  private overviewLMap!: L.Map

  // TODO: Leaflet's version of following?
  overviewLMapType = { cur: 0, types: { type: ['roadmap', 'terrain', 'satellite', 'hybrid',] } }

  mymarkers = L.markerClusterGroup()
  mapOptions = ""

  markerClusterGroup: L.MarkerClusterGroup // MarkerClusterGroup extends FeatureGroup, retaining it's methods, e.g., clearLayers() & removeLayers()
  markerClusterData = []

  constructor(
    settingsService: SettingsService,
    fieldReportService: FieldReportService,
    httpClient: HttpClient,
    log: LogService,
    @Inject(DOCUMENT) protected override document: Document
  ) {
    super(settingsService,
      fieldReportService,
      httpClient,
      log,
      document)

    this.log.verbose(`Constructing Leaflet Map, using https://www.LeafletJS.com version ${L.version}`, this.id)

    this.hasOverviewMap = true
    this.displayReports = true
    this.hasSelectedReports = true

    this.markerClusterGroup = L.markerClusterGroup({ removeOutsideVisibleBounds: true });
  }

  // override ngOnInit() {
  //   super.ngOnInit()
  //   this.log.excessive("ngOnInit()", this.id)
  // }

  override ngAfterViewInit() {
    super.ngAfterViewInit()
    this.log.excessive("ngAfterViewInit()", this.id)

    this.initMap()
  }


  override initMap() {

    this.log.excessive("initMap()  pre-super", this.id)

    super.initMap()

    this.log.excessive("initMap() post-super", this.id)


    // ! Repeat of the guards in super:
    if (this.settings === null) {
      this.log.error(`Settings still NULL! while initializing the Leaflet Map!`, this.id)
      return
    }
    this.log.excessive("initMap() post null check", this.id)

    if (this.settings === undefined) {
      this.log.error(`Settings still UNDEFINED! while initializing the Leaflet Map!`, this.id)
      return
    }


    this.log.excessive("initMap()   1", this.id)

    if (this.displayReports && !this.fieldReports) { //! or displayedFieldReportArray
      this.log.error(`fieldReports not yet initialized while initializing the Leaflet Map!`, this.id)
      return
    }

    this.log.excessive("initMap()  2", this.id)

    this.zoom = this.settings.leaflet.defZoom
    this.zoomDisplay = this.zoom

    this.mymarkers = L.markerClusterGroup()

    // ---------------- Init Main Map -----------------


    //? Per guidence on settings page: Maps do not use defLat/lng... They are auto-centered on the bounding coordinates centroid of all points entered and the map is then zoomed to show all points.

    this.zoom = this.settings ? this.settings.google.defZoom : 15
    this.zoomDisplay = this.settings ? this.settings.google.defZoom : 15

    this.log.excessive("initMap()  3", this.id)

    this.lMap = L.map('map', {
      center: [this.settings ? this.settings.defLat : 0, this.settings ? this.settings.defLng : 0],
      zoom: this.settings ? this.settings.leaflet.defZoom : 15
    }) // Default view set at map creation

    if (!this.lMap) {
      this.log.error(`this.lMap not created!`, this.id)
      return
    }

    // map can be either Leaflet or Google Map (in the abstract class) -
    // But we know it is JUST Leaflet map in this file!
    // Doing this avoids lots of type guards/hassles.
    this.map = this.lMap

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,  // REVIEW: put into settings?
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    tiles.addTo(this.lMap)


    if (this.displayReports && this.fieldReports) {
      // ! REVIEW: need to see which way switch is set and maybe set: displayedFieldReportArray 1st....
      // maybe do this further down?!
      this.displayMarkers()
      this.lMap.fitBounds(this.fieldReports.bounds)
      //this.lMap.fitBounds(: L.LatLngBoundsExpression)
    }

    this.log.excessive("initMap()   5", this.id)

    //! BUG: not working....
    this.lMap.on('zoomend', (ev: L.LeafletEvent) => { //: MouseEvent  :PointerEvent //HTMLDivElement L.LeafletEvent L.LeafletMouseEvent
      this.log.excessive(`leaflet map got zoomed ${this.lMap.getZoom()} event!`, this.id)

      if (this.lMap) { // this.zoomDisplay &&
        this.zoom = this.lMap.getZoom()
        this.zoomDisplay = this.lMap.getZoom()
      }
    })

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



    // ! Already done in super:
    // this.lMap.on('click', (ev: L.LeafletMouseEvent) => {
    //   // TODO: If enabled, drop a marker there...
    //   if (ev.latlng.lat) {
    //     this.log.verbose(`Click at lat: ${ev.latlng.lat}, lng: ${ev.latlng.lng}`, this.id)

    //     // TODO: Add Marker if settings ask for it...
    //   }
    // })

    //! BUG: not working....
    // this.lMap.on('mousemove', (ev: L.LeafletMouseEvent) => {
    //   if (ev.latlng.lat) {
    //     this.log.excessive(`Mouse at lat: ${ev.latlng.lat}, lng: ${ev.latlng.lng}`, this.id)
    //     this.mouseLatLng = ev.latlng
    //   } else {
    //     debugger // ! ==========================
    //     this.log.warn(`Mouse moved, but did not get an reasonable event to figure out lat/lng ${JSON.stringify(ev)}`, this.id)
    //   }
    // })

    if (this.hasOverviewMap) {
      this.initOverviewMap()

      this.lMap.on("move", () => {
        if (this.overviewLMap instanceof L.Map) {
          this.overviewLMap.setView(this.lMap.getCenter()!,
            this.clamp(
              this.lMap.getZoom() -
              (this.settings.leaflet.overviewDifference),
              (this.settings.leaflet.overviewMinZoom),
              (this.settings.leaflet.overviewMaxZoom)
            ))
        }
      })
    }
  }

  onZoomEnd_unused(event: any) {
    this.log.excessive(`onZoomEnd() got ${JSON.stringify(event)}`, this.id)
  }

  /**
   *   ---------------- Init OverView Map -----------------
   *
   */
  initOverviewMap() {
    //! No super.initOverviewMap(), correct?!

    // TODO: Add a light grey rectangle on overview map to show extend/bounods of main map

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

    this.overviewMap = this.overviewLMap

    const overviewTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: this.settings.leaflet.overviewMaxZoom,
      minZoom: this.settings.leaflet.overviewMinZoom,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    overviewTiles.addTo(this.overviewLMap)

    // if (this.overviewLMap === null || this.overviewLMap === undefined) {
    //   this.log.error(`Could not create overview map!`, this.id)
    //   return
    // }
    // if (this.lMap == null || this.lMap == undefined) {
    //   this.log.error(`map doesn't exist when creating overview map!`, this.id)
    //   return
    // }

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
      if (this.zoomDisplay) {
        this.zoomDisplay = this.overviewLMap!.getZoom()!
      }
      if ($event.latlng) {
        this.mouseLatLng = $event.latlng //.toJSON()
      } else {
        this.log.warn(`No latlng on event in leaflet overview - initMap()`, this.id)
      }
    })

    this.overviewLMap.on("bounds_changed", () => {
      this.overviewLMap!.setView(this.lMap.getCenter(), this.clamp(
        this.lMap!.getZoom()! - (this.settings.leaflet.overviewDifference),
        (this.settings.leaflet.overviewMaxZoom),
        (this.settings.leaflet.overviewMinZoom)
      ))
    })
  }


  onMapReady(ev: any) {
    this.log.verbose(`OnMapReady()`, this.id)
  }



  override refreshMap() {
    // Try map.remove(); before you try to reload the map. This removes the previous map element using Leaflet's library
    if (this.lMap) {
      this.lMap.invalidateSize() // https://github.com/Leaflet/Leaflet/issues/690
      //or
      // this.lMap.off()
      // this.lMap.remove() // removing ALSO destroys the div id reference, so then rebuild the map div
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


  // ------------------------------------  Markers  ---------------------------------------

  override hideMarkers() {
    //! unimplemented
  }

  override clearMarkers() {
    //!this.mymarkers = []
  }

  override displayMarkers() {
    super.displayMarkers()

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
        this.log.excessive(`displayMarkers: ${i}: ${JSON.stringify(i)}`, this.id)

        let marker = L.marker(new L.LatLng(i.lat, i.lng), { title: title })
        marker.bindPopup(title)
        this.mymarkers.addLayer(marker);
      } else {
        console.warn(`displayAllMarkers: skipping report # ${i.id}; bad lat/lng: ${i}: ${JSON.stringify(i)}`)
      }
    })

    this.lMap.addLayer(this.mymarkers);

    // to refresh markers that have changed:
    // https://github.com/Leaflet/Leaflet.markercluster#refreshing-the-clusters-icon
  }

  override onSwitchSelectedFieldReports() {
    super.onSwitchSelectedFieldReports()
    this.log.excessive(`onSwitchSelectedFieldReports()`, this.id)

  }


  // displayAMarker() {
  //   this.addMarker(this.settings ? this.settings.defLat : 0 - 0.001, this.settings ? this.settings.defLng : 0 - 0.001, "Home Base")
  // }

  // override displayAllMarkers() {
  //   // this.addMarker(this.fieldReports[i].lat, this.fieldReports[i].lng, this.fieldReports[i].status)
  // }


  // https://blog.mestwin.net/leaflet-angular-marker-clustering/
  private getDefaultIcon() {
    return L.icon({
      iconSize: [25, 41],
      iconAnchor: [13, 41],
      iconUrl: './../../assets/icons/marker-icon.png'
    })
  }

  createMarker() {
    const mapIcon = this.getDefaultIcon();
    // const coordinates = latLng([this.mapPoint.latitude, this.mapPoint.longitude]);
    // this.lastLayer = marker(coordinates).setIcon(mapIcon);
    // this.markerClusterGroup.addLayer(this.lastLayer)
  }

  override addMarker(lat: number, lng: number, title: string = '') {
    this.log.excessive(`addMarker at ${lat}. ${lng}, ${title}`, this.id)

    if (!lat || !lng || !this.lMap) {
      console.error(`bad lat: ${lat} or lng: ${lng} or lmap: ${this.lMap}`)
    } else {
      let _marker = new L.Marker([lat, lng], {
        icon: iconDefault
        // ??: title
      })
      /*
      https://javascript.plainenglish.io/how-to-create-marker-and-marker-cluster-with-leaflet-map-95e92216c391

        _marker.bindPopup(city);
        _marker.on('popupopen', function() {
          this.log.excessive('open popup', this.id);
        });
        _marker.on('popupclose', function() {
          this.log.excessive('close popup', this.id);
        });
        _marker.on('mouseout', function() {
          this.log.excessive('close popup with mouseout', this.id);
          _map.closePopup();
        });
        this.log.excessive(_map.getZoom());
        if (_map.getZoom() > 15 && _map.hasLayer(_marker)) {
          _map.closePopup();
          this.log.excessive('zoom > 15 close popup', this.id);
        }
      */

      //markerCluster.addLayer(_mar);
      //}
      //_map.addLayer(markerCluster);

      _marker.addTo(this.lMap)

      _marker.addEventListener('click', this.addManualMarkerEvent);
    }
  }

  override addManualMarkerEvent(event: any) {
    this.log.warn(`Got Marker Click!!!! event= ${JSON.stringify(event)}`, this.id)
    if (this.settings!.allowManualPinDrops) {
      if (event.latLng) {
        this.addMarker(event.latLng.lat, event.latLng.lng, `Manual Marker dropped ${event.latLng.lat}, ${event.latLng.lng} at ${Date()}`)
      } else {
        this.log.error(`addMarker FAILED`, this.id)
      }
    }
  }

  private addCircle(lat: number, lng: number, status: string = '') {
    const circle = new L.CircleMarker([lat, lng], { radius: 20 })
    if (this.lMap) {
      circle.addTo(this.lMap)
    }
  }

  /* some error on map clicking
  733786.png:1          GET https://c.tile.openstreetmap.org/21/335179/733786.png 400
  Image (async)
  createTile @ leaflet-src.js:11702
  733787.png:1          GET https://a.tile.openstreetmap.org/21/335179/733787.png 400
  */

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






}
