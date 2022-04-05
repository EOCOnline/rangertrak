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
  selector: 'mini-lmap',
  templateUrl: './mini-lmap.component.html',
  styleUrls: ['./mini-lmap.component.scss',
    '../../../node_modules/leaflet/dist/leaflet.css'], // only seems to work when embedded in angula.json & Here! (chgs there REQUIRE restart!)]
  providers: [SettingsService]
})
export class MiniLMapComponent extends AbstractMap implements AfterViewInit, OnDestroy { // OnInit,

  //@Input() set locationUpdated(newLocation: LocationType) {
  // ! Entry form hasn't received new location yet???
  @Input() set locationUpdated(newLocation: LocationType) { // ! Or might this be an event???????????????????
    if ((newLocation && newLocation.lat) != undefined) {
      this.log.verbose(pc.red(`Parent sent on a location event to child: ${JSON.stringify(newLocation)}`), this.id)
      //! Gets hit - BUT spits out 'undefined'
      this.onNewLocationChild(newLocation)
    } else {
      this.log.error(pc.red(`DRATS: Parent sent undefined location event to child`), this.id)
    }
  }
  // @Input() set locationUpdated(value: LocationType) {
  //   this.onNewLocation(value)
  // }

  override id = 'Leaflet MiniMap Component'
  override title = 'Leaflet MiniMap'
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

    this.hasOverviewMap = false
    this.displayReports = false
    this.hasSelectedReports = false

    this.markerClusterGroup = L.markerClusterGroup({
      removeOutsideVisibleBounds: true
    })

    /*
    this.locationSubscription = this.locationService.getSettingsObserver().subscribe({
      next: (newLocation) => {
        console.log(`Got newLocation: ${JSON.stringify(newLocation)}`)
        this.location = newLocation
      },
      error: (e) => this.log.error('Location Subscription got:' + e, this.id),
      complete: () => this.log.info('Location Subscription complete', this.id)
    })
*/

  }

  // override ngOnInit() {
  //   super.ngOnInit()
  //   this.log.excessive("ngOnInit()", this.id)
  // }

  override ngAfterViewInit() {
    super.ngAfterViewInit()
    this.log.excessive("ngAfterViewInit()", this.id)

    //!Verify settings exist?!
    // this.center = { lat: this.settings.defLat, lng: this.settings.defLng }
    // this.zoom = this.settings.leaflet.defZoom
    // this.zoomDisplay = this.zoom
    // this.mouseLatLng = this.center

    this.mymarkers = L.markerClusterGroup()
  }


  override initMap() {
    super.initMap()

    this.log.excessive("initMap()", this.id)

    // ! Repeat of the guards in super:
    if (!this.settings) {
      this.log.error(`Settings not yet initialized while initializing the Leaflet Map!`, this.id)
      return
    }

    if (this.displayReports && !this.fieldReports) { //! or displayedFieldReportArray
      this.log.error(`fieldReports not yet initialized while initializing the Leaflet Map!`, this.id)
      return
    }


    // ---------------- Init Map -----------------


    //? Per guidence on settings page: Maps do not use defLat/lng... They are auto-centered on the bounding coordinates centroid of all points entered and the map is then zoomed to show all points.
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
    // ! REVIEW: Does this make a copy (that devolves) or a reference (always in sync)
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
      //this.lMap.fitBounds()
    }


    this.lMap.on('zoomend', (ev: L.LeafletEvent) => { //: MouseEvent  :PointerEvent //HTMLDivElement L.LeafletEvent L.LeafletMouseEvent
      if (this.zoomDisplay && this.lMap) {
        let z = this.lMap.getZoom()
        if (z === undefined) {
          z = this.settings.leaflet.defZoom
        }
        this.zoom = z
        this.zoomDisplay = z
      }
    })


    // this.lMap.on('mousemove', (evt: L.LeafletMouseEvent) => {
    //   this.mouseLatLng = evt.latlng
    // })

    /*
        // TODO: Use an Observable, from https://angular.io/guide/rx-library#observable-creation-functions
        const lMapElement = document.getElementById('map')!

        // Create an Observable that will publish mouse movements
        const mouseMoves = fromEvent<MouseEvent>(lMapElement, 'mousemove')

        // Subscribe to start listening for mouse-move events
        const subscription = mouseMoves.subscribe(evt => {
          // Log coords of mouse movements
          //this.log.verbose(`Coords: ${evt.clientX} X ${evt.clientY}`, this.id)

          TODO: If mouse moves off of the map do we need to unsubscribe (and resubscribe when over it)?
          The subscription is only on the map, so won't apply (???) unless over it - maybe?!
          // if (evt.clientX < 40 && evt.clientY < 40) {
          //   subscription.unsubscribe()
          // }
        })
        */

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




  // TODO: Just rename MoveExistingMarker(), or AddNewMarker()?
  // !From Leaflet MiniMap - new location passed in undefined
  // @Input statement (above) catches parents update of 'this.location' & sends it to us
  // Based on listing 8.8 in TS dev w/ TS, pg 188
  public onNewLocationChild(newLocation: LocationType) {
    this.log.verbose(`new location received in ${JSON.stringify(newLocation)}`, this.id)

    if (newLocation && newLocation != undefined) {
      this.location = {
        lat: newLocation.lat,
        lng: newLocation.lng,
        address: newLocation.address
      }
      this.addMarker(this.location.lat, this.location.lng, this.location.address)
      this.addCircle(this.location.lat, this.location.lng, this.location.address)

    } else {
      this.log.error(`Bad location passed in to onNewLocationChild(): ${JSON.stringify(newLocation)}`, this.id)
    }
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

  // displayAMarker() {
  //   this.addMarker(this.settings ? this.settings.defLat : 0 - 0.001, this.settings ? this.settings.defLng : 0 - 0.001, "Home Base")
  // }

  // override displayAllMarkers() {
  //   // this.addMarker(this.fieldReports[i].lat, this.fieldReports[i].lng, this.fieldReports[i].status)
  // }


  // https:/ / blog.mestwin.net / leaflet - angular - marker - clustering /
  getDefaultIcon() {
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
        this.log.excessive(_map.getZoom(), this.id)
        if (_map.getZoom() > 15 && _map.hasLayer(_marker)) {
          _map.closePopup();
          this.log.excessive('zoom > 15 close popup', this.id);
        }
      */

      //markerCluster.addLayer(_mar);
      //}
      //_map.addLayer(markerCluster);


      _marker.addTo(this.lMap)

      _marker.addEventListener('click', this._markerOnClick);
    }
  }

  private addCircle(lat: number, lng: number, status: string = '') {
    const circle = new L.CircleMarker([lat, lng], { radius: 20 })
    if (this.lMap) {
      circle.addTo(this.lMap)
    }
  }

  private _markerOnClick(e: any) {
    this.log.warn(`Got Marker Click!!!! e= ${JSON.stringify(e)}`, this.id)
  }

  /* some error on map clicking
  733786.png:1          GET https://c.tile.openstreetmap.org/21/335179/733786.png 400
  Image (async)
  createTile @ leaflet-src.js:11702
  733787.png:1          GET https://a.tile.openstreetmap.org/21/335179/733787.png 400
  */


  hideMarkers(): void {
    //throw new Error('Method not implemented.')
  }
  clearMarkers(): void {
    throw new Error('Method not implemented.')
  }
  addManualMarkerEvent(event: any): void {
    //throw new Error('Method not implemented.')
  }

}
