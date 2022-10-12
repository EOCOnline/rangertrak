import 'leaflet.markercluster'
import 'leaflet.offline' // https://github.com/allartk/leaflet.offline
//import { markerClusterGroup } from 'leaflet'
import * as L from 'leaflet'

//import pc from 'picocolors' // https://github.com/alexeyraspopov/picocolors
import { delay, throwError } from 'rxjs'

import { DOCUMENT } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { AfterViewInit, Component, Inject, Input, OnDestroy, OnInit } from '@angular/core'

import { AbstractMap, Utility } from '../shared'
import {
  FieldReportService, LocationType, LogService, SettingsService, undefinedAddressFlag,
  undefinedLocation
} from '../shared/services'

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
  iconUrl: '../../assets/icons/marker-icon.png',
  shadowUrl: '../../assets/icons/marker-shadow.png'
})
L.Marker.prototype.options.icon = iconDefault;
//or L.Marker.prototype.options.icon = new L.Icon.Default;
//type LatLng = { lat: number, lng: number }


@Component({
  selector: 'mini-lmap',
  templateUrl: './mini-lmap.component.html',
  styleUrls: ['./mini-lmap.component.scss',
    '../../../node_modules/leaflet/dist/leaflet.css'], // only seems to work when embedded in angular.json & Here! (chgs there REQUIRE restart!)]
  providers: [SettingsService]
})
export class MiniLMapComponent extends AbstractMap implements OnInit, AfterViewInit, OnDestroy {

  _location = undefinedLocation
  // Use setter get notification of new locations from parent entry form (pg 182 & 188)
  @Input() set locationUpdated(newLocation: LocationType) {
    this.log.error((`LMini-Map location Setter called! ${JSON.stringify(newLocation)}`), this.id)

    if (newLocation && (newLocation.lat != undefined)) {
      if (newLocation.address == undefinedAddressFlag) {
        this.log.verbose((`Entry form has no address yet:  ${undefinedAddressFlag}`), this.id)
      } else {
        this.log.verbose((`Received new location from entry form: ${JSON.stringify(newLocation)}`), this.id)
      }
      // All we need to display is lat & long: address is superfluious, just used for the title
      this._location = newLocation

      if (!this.lMap) {
        this.log.error(`Setting new location, but L.Map not yet set!!!`, this.id)
      }
      this.addMarker(newLocation.lat, newLocation.lng, newLocation.address)
      //this.onNewLocation(newLocation)
    } else {
      this.log.error((`DRATS: Parent sent undefined location event to child`), this.id)
    }
  }
  get locationUpdated(): LocationType {
    return this._location
  }

  override id = 'Leaflet MiniMap Component'
  override title = 'Leaflet MiniMap'
  private lMap!: L.Map
  private overviewLMap!: L.Map

  // TODO: Leaflet's version of following?
  overviewLMapType = { cur: 0, types: { type: ['roadmap', 'terrain', 'satellite', 'hybrid',] } }

  myMarkerCluster = new window.L.MarkerClusterGroup()
  //myMarkers: L.Marker[] = []
  mapOptions = ""

  //markerClusterGroup_UNUSED: L.MarkerClusterGroup // MarkerClusterGroup extends FeatureGroup, retaining it's methods, e.g., clearLayers() & removeLayers()
  // markerClusterData = []

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

    this.log.verbose(`======== Constructor() ============, using https://www.LeafletJS.com version ${L.version}`, this.id)

    this.hasOverviewMap = false
    this.displayReports = true  //! Hides ALL markers, not just all reports???
    this.hasSelectedReports = false
    // per https://stackoverflow.com/a/71574063/18004414 & https://github.com/Leaflet/Leaflet/issues/8451
    this.myMarkerCluster = new window.L.MarkerClusterGroup()
  }

  // override ngOnInit() {
  //   super.ngOnInit()
  //   this.log.excessive("ngOnInit()", this.id)
  // }

  override ngOnInit() {
    super.ngOnInit()
    this.log.excessive("ngOnInit()", this.id)

    if (!this.settings) {
      this.log.error(`ngOnInit - Settings have yet to be read!`, this.id)
    }

    // let i = 0
    // let msMaxDelay = 5000
    // while (!this.settings) {
    //   setTimeout(() => {
    //     this.log.error(`ngOnInit - Settings have yet to be read! Delayed ${i / 10 * msMaxDelay} ms. Retrying.`, this.id)
    //     //this.logPanel = this.document.getElementById("log")
    //   }, msMaxDelay / 10)
    //   if (++i > 9) {
    //     return
    //   }
    // }

    if (this.settings?.debugMode) {
      Utility.displayShow(this.document.getElementById("Entry__LMinimap-debug")!)
    } else {

    }

    // Following moved from InitMainMap to avoid: map not a leaflet or google map
    //? Per guidence on settings page: Maps do not use defLat/lng... They are auto-centered on the bounding coordinates centroid of all points entered and the map is then zoomed to show all points.
    this.lMap = L.map('map', {
      center: [this.settings ? this.settings.defLat : 0, this.settings ? this.settings.defLng : 0],
      zoom: this.settings ? this.settings.leaflet.defZoom : 15
    }) // Default view set at map creation

    if (!this.lMap) {
      this.log.error(`this.lMap not created!`, this.id)
      return
    }


    this.initMainMap()
    this.updateFieldReports()

    //! Force output of 1st location received (which happened before the map was ready...) - might have to move this to OnMapReady()???
    // this.onNewLocation(this._location)
    this.addMarker(this._location.lat, this._location.lng, this._location.address)

    this.log.excessive("exiting ngOnInit() ...", this.id)
  }

  /**
   * Called once all HTML elements have been created
   */
  ngAfterViewInit() {

  }

  override initMainMap() {
    //!Gets: Leaflet MiniMap Component: InitMap(): map not a leaflet or google map - ignoring as uninitialized?  i.e., this.map is NOT yet an instance of LMap...
    // ! REVIEW: Does this make a copy (that devolves) or a reference (always in sync)
    this.map = this.lMap
    super.initMainMap()

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


    // map can be either Leaflet or Google Map (in the abstract class) -
    // But we know it is JUST Leaflet map in this file!
    // Doing this avoids lots of type guards/hassles.


    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,  // REVIEW: put into settings?
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    // TODO: Consider allowing addition of SVG overlay (of known trails and other overlays): https://leafletjs.com/reference.html#svgoverlay
    /*
      var svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgElement.setAttribute('xmlns', "http://www.w3.org/2000/svg");
      svgElement.setAttribute('viewBox', "0 0 200 200");
      svgElement.innerHTML = '<rect width="200" height="200"/><rect x="75" y="23" width="50" height="50" style="fill:red"/><rect x="75" y="123" width="50" height="50" style="fill:#0013ff"/>';
      var svgElementBounds = [ [ 32, -130 ], [ 13, -100 ] ];
      L.svgOverlay(svgElement, svgElementBounds).addTo(map);
    */

    tiles.addTo(this.lMap)
    // !debugger
    if (this.displayReports && this.fieldReports) {
      // ! REVIEW: need to see which way switch is set and maybe set: displayedFieldReportArray 1st....
      // maybe do this further down?!
      this.displayMarkers()
      this.lMap.fitBounds(this.fieldReports.bounds)
      //this.lMap.fitBounds()
    } else {
      this.log.error(`initMainMap() did not have displayReports or fieldReports!`, this.id)
    }

    L.DomUtil.addClass(this.lMap.getContainer(), 'crosshair-cursor-enabled')  //  Enable crosshairs

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

    this.captureLMoveAndZoom(this.lMap)
  }

  forceMarker() {
    const myLocation = {
      lat: 47.43,
      lng: -122.45,
      address: "ThisMustWork Road, Pluto",
      derivedFromAddress: false
    }

    this.addMarker(myLocation.lat, myLocation.lng, myLocation.address)
    this.addCircle(myLocation.lat + 0.002, myLocation.lng + 0.002, myLocation.address)
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

    this.captureLMoveAndZoom(this.overviewLMap)

    // this.overviewLMap.on("bounds_changed", () => {
    //   this.overviewLMap!.setView(this.lMap.getCenter(), this.clamp(
    //     this.lMap!.getZoom()! - (this.settings.leaflet.overviewDifference),
    //     (this.settings.leaflet.overviewMaxZoom),
    //     (this.settings.leaflet.overviewMinZoom)
    //   ))
    // })
  }

  /**
   *
   * @param ev
   */
  onMapReady(ev: any) {
    this.log.verbose(`OnMapReady()`, this.id)
  }

  /**
   * Store Lat/Lng in Clipboard
   * @param ev
   */
  override onMouseClick(ev: MouseEvent) {
    if (!this.lMap) {
      this.log.error(`Leaflet map not created, so can't get lat & lng`, this.id)
      return
    }
    let latlng = this.lMap.mouseEventToLatLng(ev)
    let coords = `${Math.round(latlng.lat * 10000) / 10000}, ${Math.round(latlng.lng * 10000) / 10000}`
    navigator.clipboard.writeText(coords)
      .then(() => {
        let status = document.getElementById('Entry__LMinimap-status')
        if (status) {
          status.innerText = `${coords} copied to clipboard`
          //status.style.visibility = "visible"
          Utility.resetMaterialFadeAnimation(status) //! BUG: doesn't work?!
        } else {
          this.log.info(`Entry__LMinimap-status not found!`, this.id)
        }
        this.log.excessive(`${coords} copied to clipboard`, this.id)
      })
      .catch(err => {
        this.log.error(`latlng NOT copied to clipboard, error: ${err}`, this.id)
      })
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
  // Act on new location from parent (i.e., the entry form)
  // Based on Mediator pattern: listing 8.8 in TS dev w/ TS, pg 188
  public onNewLocation_UNUSED(newLocation: LocationType) {
    this.log.verbose(`onNewLocation received in ${JSON.stringify(newLocation)}`, this.id)

    if (!newLocation) {
      this.log.error(`Bad location passed in to onNewLocation(): ${JSON.stringify(newLocation)}`, this.id)
    } else {
      this.location = {
        lat: newLocation.lat,
        lng: newLocation.lng,
        address: newLocation.address,  //! might be undefinedAddressFlag!
        derivedFromAddress: newLocation.derivedFromAddress
      }
      // TODO: Consider displaying previous points too - not just the new one?
      let newMarker = L.marker([this.location.lat, this.location.lng], { title: this.location.address })
      //this.addMarker(this.location.lat, this.location.lng, this.location.address)
      //this.addCircle(this.location.lat, this.location.lng, this.location.address)

      //! resize map to fit?
      this.lMap.setView([this.location.lat, this.location.lng])

      /*
            let ptNE = L.point(this.location.lat + 0.01, this.location.lng + 0.01)
            let ptSW = L.point(this.location.lat - 0.01, this.location.lng - 0.01)
            let bnd = this.lMap.getBounds()
            this.log.error(`Bounds=${JSON.stringify(bnd)}`)
            bnd.extend.
            .extend(ptNE)

            // https://gis.stackexchange.com/questions/301286/how-to-fit-bounds-after-adding-multiple-markers
            // You could use a featuregroup, it's like a layergroup but better.

            var myFGMarker = L.FeatureGroup;
            marker = L.marker(lat_lng);
            myFGMarker.addLayer(marker);
            myFGMarker.addTo(map);
            map.fitBounds(myFGMarker.getBounds());

            // You can instantiate a LatLngBounds object and then extend() it with the coordinates of the companies.After adding the markers you can call map.fitBounds(<LatLngBounds>).

            //function addCompanies() {
            var bounds = L.latLngBounds() // Instantiate LatLngBounds object
            //for (let c of companies) {
            let lat_lng = [this.location.lat, this.location.lng]
            var marker = L.marker(lat_lng).addTo(this.lMap);
            marker.bindPopup(`<b>${this.location.address}</b>`)
            bounds.extend(lat_lng)      // Extend LatLngBounds with coordinates
            //  }
            this.lMap.fitBounds(bounds)
            //  }
      */
    }
  }


  override displayMarkers() {
    super.displayMarkers()

    // REVIEW: wipes out any manually dropped markers. Could save 'em, but no request for that...
    //! This needs to be rerun & ONLY display selected rows/markers: i.e., to use  displayedFieldReportArray
    if (!this.displayedFieldReportArray) {
      this.log.error(`displayMarkers did not find field reports to display`, this.id)
      //return
    }
    this.log.verbose(`displayMarkers: all ${this.displayedFieldReportArray.length} of 'em`, this.id)
    this.displayedFieldReportArray.forEach(i => {
      if (i.location.lat && i.location.lng) {  // TODO: Do this in the FieldReports Service - or also the GMap; thewse only happened when location was broken???
        let title = `${i.callsign} at ${i.date} with ${i.status}`
        //this.log.excessive(`displayMarkers: ${i}: ${JSON.stringify(i)}`, this.id)

        let marker = L.marker(new L.LatLng(i.location.lat, i.location.lng), { title: title })
        marker.bindPopup(title)
        this.myMarkerCluster.addLayer(marker);
      } else {
        console.warn(`displayAllMarkers: skipping report # ${i.id}; bad lat/lng: ${i}: ${JSON.stringify(i)}`)
      }
    })

    this.lMap.addLayer(this.myMarkerCluster);

    // to refresh markers that have changed:
    // https://github.com/Leaflet/Leaflet.markercluster#refreshing-the-clusters-icon
  }

  // override displayAllMarkers() {
  //   // this.addMarker(this.fieldReports[i].lat, this.fieldReports[i].lng, this.fieldReports[i].status)
  // }


  // https:/ / blog.mestwin.net / leaflet - angular - marker - clustering /
  getIcon() {
    const number = Math.floor(Math.random() * 6)
    return L.icon({
      iconSize: [25, 41],
      iconAnchor: [13, 41],
      iconUrl: `./../../assets/icons/t${number}.png`
      //iconUrl: `./../../assets/icons/marker-icon.png`
    })
  }

  createMarker_UNUSED() {
    const mapIcon = this.getIcon();
    // or const mapIcon = L.Icon.Default

    // const coordinates = latLng([this.mapPoint.latitude, this.mapPoint.longitude]);
    // this.lastLayer = marker(coordinates).setIcon(mapIcon);
    // this.markerClusterGroup.addLayer(this.lastLayer)
  }

  override addMarker(lat: number, lng: number, title: string = '') {
    this.log.excessive(`addMarker at ${lat}. ${lng}, ${title}`, this.id)

    if (!lat || !lng || !this.lMap) {
      this.log.error(`addMarker(): bad lat: ${lat} or lng: ${lng} or lmap: ${this.lMap}`, this.id)
      return
    }

    // 1st dim all previous markers: How to iterate them though?!
    //this.myMarkers.eachChildLayer(fn <= {

    this.clearMarkers()

    let marker = L.marker(new L.LatLng(lat, lng), { title: title }) //, icon: iconDefault,
    marker.bindPopup(title)  //! Needed?!
    this.myMarkerCluster.addLayer(marker);

    //this.myMarkers.push(marker)
    marker.addTo(this.lMap)

    // Refit map
    this.lMap.setView([lat, lng])
    //marker.addEventListener('click', this._markerOnClick);

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

  hideMarkers(): void {
    //throw new Error('Method not implemented.')
  }
  clearMarkers(): void {
    this.log.info(`MarkclearMarkers()`, this.id)

    // https://stackoverflow.com/questions/24772022/using-leaflet-js-how-do-i-iterate-through-markers-in-a-cluster
    // if(this.myMarkers.hasLayer(marker) this.myMarkers.removeLayer(marker);
    // if (this.lMap.hasLayer(marker) this.lMap.removeLayer(marker);

    //this.lMap._panes.markerPane.remove()
    //this.lMap.eachLayer((layer) => { layer.remove() }) // !Removes the base map layer too!!!

    this.myMarkerCluster.clearLayers()
    //    throw new Error('Method not implemented.')
  }
  addManualMarkerEvent(event: any): void {
    //throw new Error('Method not implemented.')
  }
}

