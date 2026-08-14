import { GeoJSONSource, Map as MaplibreMap } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { Subscription } from 'rxjs'

import {
  ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit
} from '@angular/core'

import { buildPmtilesStyle, registerPmtilesProtocol } from '../shared/mapping/map-style'
import {
  FieldReportsType, FieldReportService, FieldReportType, LocationType, LogService, SettingsService,
  SettingsType, undefinedAddressFlag, undefinedLocation
} from '../shared/services'

const REPORTS_SOURCE_ID = 'field-reports'
const LOCATION_SOURCE_ID = 'current-location'

/**
 * MapLibre + PMTiles mini-map for the Entry form. A sibling to MiniLMapComponent
 * (Leaflet), built and tested but NOT wired into Entry yet - which engine powers
 * Entry's single mini-map slot is deferred (see PRIVATE-Roadmap.md "Mapping" section).
 */
@Component({
  selector: 'rangertrak-mini-map',
  standalone: true,
  imports: [],
  templateUrl: './mini-map.component.html',
  styleUrls: ['./mini-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class MiniMapComponent implements OnInit, OnDestroy {

  private _location = undefinedLocation
  @Input() set locationUpdated(newLocation: LocationType) {
    if (newLocation && newLocation.lat !== undefined) {
      this._location = newLocation
      this.setCurrentLocationMarker(newLocation)
    }
  }
  get locationUpdated(): LocationType {
    return this._location
  }

  private map!: MaplibreMap
  private settings!: SettingsType
  private fieldReports: FieldReportsType | undefined

  private settingsSubscription!: Subscription
  private fieldReportsSubscription!: Subscription

  constructor(
    private settingsService: SettingsService,
    private fieldReportService: FieldReportService,
    private log: LogService
  ) {
    registerPmtilesProtocol()

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => { this.settings = newSettings },
      error: (e) => this.log.error('MiniMapComponent settings subscription error: ' + e, 'MiniMapComponent')
    })

    this.fieldReportsSubscription = this.fieldReportService.getFieldReportsObserver().subscribe({
      next: (newReports) => {
        this.fieldReports = newReports
        this.refreshReportMarkers()
      },
      error: (e) => this.log.error('MiniMapComponent field reports subscription error: ' + e, 'MiniMapComponent')
    })
  }

  ngOnInit(): void {
    this.fieldReports = this.fieldReportService.getCurrentFieldReports()

    this.map = new MaplibreMap({
      container: 'mini-map',
      style: buildPmtilesStyle(),
      center: [this.settings.defLng, this.settings.defLat],
      zoom: this.settings.google.defZoom
    })

    this.map.on('load', () => {
      this.addReportsSource()
      this.addLocationSource()
      this.refreshReportMarkers()

      if (this._location !== undefinedLocation && this._location.address !== undefinedAddressFlag) {
        this.setCurrentLocationMarker(this._location)
      } else if (this.fieldReports && this.fieldReports.numReport > 0) {
        const b = this.fieldReports.bounds
        // MapLibre wants [[west, south], [east, north]] as [lng, lat] pairs
        this.map.fitBounds([[b.west, b.south], [b.east, b.north]], { padding: 30 })
      }
    })
  }

  private addReportsSource(): void {
    this.map.addSource(REPORTS_SOURCE_ID, {
      type: 'geojson',
      data: this.buildReportsGeoJson(),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40
    })

    this.map.addLayer({
      id: 'mini-clusters',
      type: 'circle',
      source: REPORTS_SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#2266aa',
        'circle-opacity': 0.75,
        'circle-radius': ['step', ['get', 'point_count'], 12, 10, 18, 50, 24]
      }
    })

    this.map.addLayer({
      id: 'mini-unclustered-point',
      type: 'circle',
      source: REPORTS_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#c0392b',
        'circle-radius': 6,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff'
      }
    })
  }

  private addLocationSource(): void {
    this.map.addSource(LOCATION_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })

    this.map.addLayer({
      id: 'current-location-point',
      type: 'circle',
      source: LOCATION_SOURCE_ID,
      paint: {
        'circle-color': '#f1c40f',
        'circle-radius': 9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#000000'
      }
    })
  }

  private buildReportsGeoJson(): FeatureCollection<Point, { title: string }> {
    const reports = this.fieldReports?.fieldReportArray ?? []
    return {
      type: 'FeatureCollection',
      features: reports
        .filter((r: FieldReportType) => r.location?.lat && r.location?.lng)
        .map((r: FieldReportType) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [r.location.lng, r.location.lat] },
          properties: { title: `${r.callsign} at ${r.date} with ${r.status}` }
        }))
    }
  }

  private refreshReportMarkers(): void {
    const source = this.map?.getSource<GeoJSONSource>(REPORTS_SOURCE_ID)
    if (!source) {
      return
    }
    source.setData(this.buildReportsGeoJson())
  }

  private setCurrentLocationMarker(location: LocationType): void {
    const source = this.map?.getSource<GeoJSONSource>(LOCATION_SOURCE_ID)
    if (!source) {
      return
    }

    const feature: FeatureCollection<Point, { title: string }> = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
        properties: { title: location.address }
      }]
    }

    source.setData(feature)
    this.map.setCenter([location.lng, location.lat])
  }

  ngOnDestroy(): void {
    this.settingsSubscription?.unsubscribe()
    this.fieldReportsSubscription?.unsubscribe()
    this.map?.remove()
  }
}
