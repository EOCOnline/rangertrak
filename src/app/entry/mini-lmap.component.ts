import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core'

import pc from "picocolors" // https://github.com/alexeyraspopov/picocolors

import * as L from 'leaflet'
import { icon } from 'leaflet'
import 'leaflet.offline' // https://github.com/allartk/leaflet.offline
import 'leaflet.markercluster';

import { SettingsService, FieldReportService, LocationType, LogService } from '../shared/services'


import { AbstractMap } from '../shared/map'
import { HttpClient } from '@angular/common/http'
import { throwError } from 'rxjs';


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
export class MiniLMapComponent extends AbstractMap implements AfterViewInit, OnDestroy {

  //@Input() set locationUpdated(newLocation: LocationType) {
  // ! Entry form hasn't received new location yet???
  @Input() set locationUpdated(newLocation: LocationType) { // ! Or might this be an event???????????????????
    if ((newLocation && newLocation.lat) != undefined) {
      this.log.verbose(pc.red(`Parent sent on a location event to child: ${JSON.stringify(newLocation)}`), this.id)
      //! spits out 'undefined'
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

  constructor(
    settingsService: SettingsService,
    fieldReportService: FieldReportService,
    httpClient: HttpClient,
    log: LogService,
    document: Document
  ) {
    super(settingsService,
      fieldReportService,
      httpClient,
      log,
      document)

    this.log.verbose("constructor()", this.id)

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

  override ngOnInit() {
    super.ngOnInit()
    this.log.excessive("ngOnInit()", this.id)

    // displayReports = false
  }

  override ngAfterViewInit() {
    super.ngAfterViewInit()
    this.log.excessive("ngAfterViewInit()", this.id)

    //!Verify settings exist?!
    this.center = { lat: this.settings.defLat, lng: this.settings.defLng }
    this.zoom = this.settings.leaflet.defZoom
    this.zoomDisplay = this.zoom
    this.mouseLatLng = this.center

    //this.mymarkers = L.markerClusterGroup()
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

    this.map = L.map('lmap', {
      center: [this.settings ? this.settings.defLat : 0, this.settings ? this.settings.defLng : 0],
      zoom: this.settings ? this.settings.leaflet.defZoom : 15
    })

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,  // REVIEW: put into settings?
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })
    tiles.addTo(this.map)

    if (this.displayReports) {
      // ! REVIEW: need to see which way switch is set and maybe set: displayedFieldReportArray 1st....
      // maybe do this further down?!
      this.displayMarkers()
      //this.map.fitBounds(this.fieldReports.bounds)
      this.map.fitBounds()
    }

    this.map.on('zoomend', (ev: L.LeafletEvent) => {
      if (this.zoomDisplay && this.map) {
        let z = this.map.getZoom()
        if (z === undefined) {
          z = this.settings.leaflet.defZoom
        }
        this.zoom = z
        this.zoomDisplay = z
      }
    })


    // this.map.on('mousemove', (evt: L.LeafletMouseEvent) => {
    //   this.mouseLatLng = evt.latlng
    // })

    /*
        // TODO: Use an Observable, from https://angular.io/guide/rx-library#observable-creation-functions
        const lMapElement = document.getElementById('lmap')!

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

      this.map.on("move", () => {

        if (this.overviewMap instanceof L.Map) {

          this.overviewMap.setView(this.map.getCenter()!,
            this.clamp(
              this.map.getZoom() -
              (this.settings.leaflet.overviewDifference),
              (this.settings.leaflet.overviewMinZoom),
              (this.settings.leaflet.overviewMaxZoom)
            ))
        }
      })
    }
  }
}

initOverviewMap() {
  //! TODO

}


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


// displayAMarker() {
//   this.addMarker(this.settings ? this.settings.defLat : 0 - 0.001, this.settings ? this.settings.defLng : 0 - 0.001, "Home Base")
// }

// override displayAllMarkers() {
//   // this.addMarker(this.fieldReports[i].lat, this.fieldReports[i].lng, this.fieldReports[i].status)
// }

// https:/ / blog.mestwin.net / leaflet - angular - marker - clustering /
getDefaultIcon() {
  return icon({
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

  override addMarker(lat: number, lng: number, status: string = '') {
  this.log.excessive(`addMarker at ${lat}. ${lng}, ${status}`, this.id)

  if (!lat || !lng || !this.map) {
    console.error(`bad lat: ${lat} or lng: ${lng} or lmap: ${this.map}`)
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


    _marker.addTo(this.map)

    //_marker.addEventListener('click', this._markerOnClick);
  }
}

  private addCircle(lat: number, lng: number, status: string = '') {
  const circle = new L.CircleMarker([lat, lng], { radius: 20 })
  if (this.map) {
    circle.addTo(this.map)
  }
}

}
