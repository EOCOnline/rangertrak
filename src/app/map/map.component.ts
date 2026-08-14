import { GeoJSONSource, Map as MaplibreMap, MapLayerMouseEvent, MapMouseEvent, Popup } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { Subscription } from 'rxjs'

import { DOCUMENT } from '@angular/common'
import {
  AfterViewInit, ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit
} from '@angular/core'

import { buildPmtilesStyle, registerPmtilesProtocol } from '../shared/mapping/map-style'
import {
  FieldReportsType, FieldReportService, FieldReportType, LogService, SettingsService, SettingsType
} from '../shared/services'
import { HeaderComponent } from '../shared/header/header.component'
import { Utility } from '../shared'

const REPORTS_SOURCE_ID = 'field-reports'

/**
 * MapLibre + PMTiles full-page map. A sibling to LmapComponent (Leaflet), not a
 * replacement - both engines ship side by side until real usage shows which is better.
 * See PRIVATE-Roadmap.md "Mapping" section.
 */
@Component({
  selector: 'rangertrak-map',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {

  public title = 'Offline Map'
  public pageDescr = 'MapLibre + PMTiles (offline-capable)'

  private map!: MaplibreMap
  private overviewMap: MaplibreMap | undefined
  private settings!: SettingsType
  private fieldReports: FieldReportsType | undefined
  private showingSelectedOnly = false

  private settingsSubscription!: Subscription
  private fieldReportsSubscription!: Subscription

  public numAllRows = 0
  public numSelectedRows = 0
  public zoomDisplay = 15

  constructor(
    private settingsService: SettingsService,
    private fieldReportService: FieldReportService,
    private log: LogService,
    @Inject(DOCUMENT) private document: Document
  ) {
    registerPmtilesProtocol()

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => { this.settings = newSettings },
      error: (e) => this.log.error('MapComponent settings subscription error: ' + e, 'MapComponent')
    })

    this.fieldReportsSubscription = this.fieldReportService.getFieldReportsObserver().subscribe({
      next: (newReports) => {
        this.fieldReports = newReports
        this.numAllRows = newReports.numReport
        this.refreshMarkers()
      },
      error: (e) => this.log.error('MapComponent field reports subscription error: ' + e, 'MapComponent')
    })
  }

  ngOnInit(): void {
    this.fieldReports = this.fieldReportService.getCurrentFieldReports()
    this.numAllRows = this.fieldReports.numReport
    // Set before the first change-detection pass, not in ngAfterViewInit - mutating a
    // template-bound property there trips NG0100 (ExpressionChangedAfterItHasBeenChecked).
    this.zoomDisplay = this.settings.google.defZoom
  }

  ngAfterViewInit(): void {
    this.map = new MaplibreMap({
      container: 'map',
      style: buildPmtilesStyle(),
      center: [this.settings.defLng, this.settings.defLat],
      zoom: this.settings.google.defZoom
    })

    // Without a listener MapLibre swallows source/tile failures into a console warning at
    // most, so a basemap that never loads looks identical to one that loaded empty. Log
    // them: an offline map silently showing blank is the single most confusing failure
    // this screen can have.
    this.map.on('error', (ev: any) => {
      this.log.error(`MapLibre error${ev?.sourceId ? ` (source "${ev.sourceId}")` : ''}: ${ev?.error?.message ?? JSON.stringify(ev)}`, 'MapComponent')
    })

    this.map.on('load', () => {
      this.addReportsSource()
      this.refreshMarkers()
      this.fitToBounds()
    })

    this.map.on('zoomend', () => { this.zoomDisplay = Math.round(this.map.getZoom()) })

    this.map.on('click', (ev: MapMouseEvent) => this.onMapClick(ev))

    this.initOverviewMap()
  }

  private initOverviewMap(): void {
    this.overviewMap = new MaplibreMap({
      container: 'overview',
      style: buildPmtilesStyle(),
      center: [this.settings.defLng, this.settings.defLat],
      zoom: this.settings.google.overviewMinZoom,
      interactive: false
    })

    this.map.on('move', () => {
      if (!this.overviewMap) {
        return
      }
      const center = this.map.getCenter()
      const targetZoom = this.clamp(
        this.map.getZoom() - this.settings.google.overviewDifference,
        this.settings.google.overviewMinZoom,
        this.settings.google.overviewMaxZoom
      )
      this.overviewMap.jumpTo({ center, zoom: targetZoom })
    })
  }

  private clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max)
  }

  private addReportsSource(): void {
    this.map.addSource(REPORTS_SOURCE_ID, {
      type: 'geojson',
      data: this.buildGeoJson(),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    })

    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: REPORTS_SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#2266aa',
        'circle-opacity': 0.75,
        'circle-radius': ['step', ['get', 'point_count'], 14, 10, 20, 50, 28]
      }
    })

    this.map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: REPORTS_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#c0392b',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    })

    this.map.on('click', 'clusters', (ev) => this.onClusterClick(ev))
    this.map.on('click', 'unclustered-point', (ev) => this.onPointClick(ev))
    this.map.on('mouseenter', 'clusters', () => { this.map.getCanvas().style.cursor = 'pointer' })
    this.map.on('mouseleave', 'clusters', () => { this.map.getCanvas().style.cursor = '' })
    this.map.on('mouseenter', 'unclustered-point', () => { this.map.getCanvas().style.cursor = 'pointer' })
    this.map.on('mouseleave', 'unclustered-point', () => { this.map.getCanvas().style.cursor = '' })
  }

  private buildGeoJson(): FeatureCollection<Point, { title: string }> {
    const reportsToShow = this.showingSelectedOnly
      ? this.fieldReportService.getSelectedFieldReports().fieldReportArray
      : (this.fieldReports?.fieldReportArray ?? [])

    return {
      type: 'FeatureCollection',
      features: reportsToShow
        .filter((r: FieldReportType) => r.location?.lat && r.location?.lng)
        .map((r: FieldReportType) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [r.location.lng, r.location.lat] },
          properties: { title: `${r.callsign} at ${r.date} with ${r.status}` }
        }))
    }
  }

  private refreshMarkers(): void {
    const source = this.map?.getSource<GeoJSONSource>(REPORTS_SOURCE_ID)
    if (!source) {
      return
    }
    source.setData(this.buildGeoJson())
  }

  private fitToBounds(): void {
    if (!this.fieldReports || this.fieldReports.numReport === 0) {
      return
    }
    const b = this.fieldReports.bounds
    // MapLibre wants [[west, south], [east, north]] as [lng, lat] pairs
    this.map.fitBounds([[b.west, b.south], [b.east, b.north]], { padding: 40 })
  }

  onSwitchSelectedFieldReports(): void {
    this.showingSelectedOnly = !this.showingSelectedOnly
    this.numSelectedRows = this.showingSelectedOnly
      ? this.fieldReportService.getSelectedFieldReports().fieldReportArray.length
      : this.numSelectedRows
    this.refreshMarkers()
  }

  private onClusterClick(ev: MapLayerMouseEvent): void {
    const features = this.map.queryRenderedFeatures(ev.point, { layers: ['clusters'] })
    const clusterId = features[0]?.properties?.['cluster_id']
    const source = this.map.getSource<GeoJSONSource>(REPORTS_SOURCE_ID)
    if (clusterId === undefined || !source) {
      return
    }
    source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
      const geometry = features[0].geometry
      if (geometry.type !== 'Point') {
        return
      }
      this.map.easeTo({ center: geometry.coordinates as [number, number], zoom })
    }).catch((e: unknown) => this.log.warn(`onClusterClick: ${e}`, 'MapComponent'))
  }

  private onPointClick(ev: MapLayerMouseEvent): void {
    const feature = ev.features?.[0]
    if (!feature || feature.geometry.type !== 'Point') {
      return
    }
    const coordinates = feature.geometry.coordinates.slice() as [number, number]
    const title = String(feature.properties?.['title'] ?? '')
    new Popup().setLngLat(coordinates).setText(title).addTo(this.map)
  }

  private onMapClick(ev: MapMouseEvent): void {
    const hitMarker = this.map.queryRenderedFeatures(ev.point, { layers: ['clusters', 'unclustered-point'] })
    if (hitMarker.length > 0) {
      return
    }

    const coords = `${Math.round(ev.lngLat.lat * 10000) / 10000}, ${Math.round(ev.lngLat.lng * 10000) / 10000}`
    navigator.clipboard.writeText(coords)
      .then(() => {
        const status = this.document.getElementById('map-status')
        if (status) {
          status.innerText = `${coords} copied to clipboard`
          Utility.resetMaterialFadeAnimation(status)
        }
      })
      .catch((err) => this.log.error(`onMapClick: coords NOT copied to clipboard: ${err}`, 'MapComponent'))
  }

  ngOnDestroy(): void {
    this.settingsSubscription?.unsubscribe()
    this.fieldReportsSubscription?.unsubscribe()
    this.overviewMap?.remove()
    this.map?.remove()
  }
}
