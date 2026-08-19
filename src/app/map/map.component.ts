import { GeoJSONSource, Map as MaplibreMap, MapLayerMouseEvent, MapMouseEvent, Popup } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { Subscription } from 'rxjs'

import { DOCUMENT } from '@angular/common'
import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild,
  signal
} from '@angular/core'

import { buildPmtilesStyle, registerPmtilesProtocol } from '../shared/mapping/map-style'
import {
  FieldReportsType, FieldReportService, FieldReportType, LogService, SettingsService, SettingsType
} from '../shared/services'
import { DisclosureComponent } from '../shared/disclosure/disclosure.component'
import { PageComponent } from '../shared/page/page.component'
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
  imports: [PageComponent, DisclosureComponent],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {

  // D-31: "Backup map" rather than "Offline Map" - the Leaflet map is offline-capable too,
  // so "offline" never was the distinction. This is the one that works when nothing else does.
  public title = 'Backup map'
  public pageDescr = 'Bundled fallback map: works with no connection, pilot region only, no street names.'

  // Resolved from this component's own view, never by DOM id. Three map components once
  // all used id="map", and both MapLibre and Leaflet resolve a string container globally -
  // so whichever matching element the document happened to hold first won. See D-30.
  @ViewChild('mapContainer') private mapContainer!: ElementRef<HTMLDivElement>
  @ViewChild('overviewContainer') private overviewContainer!: ElementRef<HTMLDivElement>

  private map!: MaplibreMap
  private overviewMap: MaplibreMap | undefined
  private settings!: SettingsType
  private fieldReports: FieldReportsType | undefined
  private showingSelectedOnly = false

  private settingsSubscription!: Subscription
  private fieldReportsSubscription!: Subscription

  // Mutated from MapLibre's own event listeners / an RxJS subscribe callback, not
  // Angular template bindings - this app is zoneless, so a plain field written there
  // has no guaranteed path back into change detection. Signals close that gap. (Sprint G)
  public numAllRows = signal(0)
  public numSelectedRows = signal(0)
  public zoomDisplay = signal(15)

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
        this.numAllRows.set(newReports.numReport)
        this.refreshMarkers()
      },
      error: (e) => this.log.error('MapComponent field reports subscription error: ' + e, 'MapComponent')
    })
  }

  ngOnInit(): void {
    this.fieldReports = this.fieldReportService.getCurrentFieldReports()
    this.numAllRows.set(this.fieldReports.numReport)
    this.zoomDisplay.set(this.settings.google.defZoom)
  }

  ngAfterViewInit(): void {
    this.map = new MaplibreMap({
      container: this.mapContainer.nativeElement,
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

    this.map.on('zoomend', () => { this.zoomDisplay.set(Math.round(this.map.getZoom())) })

    this.map.on('click', (ev: MapMouseEvent) => this.onMapClick(ev))

    this.initOverviewMap()
  }

  private initOverviewMap(): void {
    this.overviewMap = new MaplibreMap({
      container: this.overviewContainer.nativeElement,
      style: buildPmtilesStyle(),
      center: [this.settings.defLng, this.settings.defLat],
      zoom: this.settings.google.overviewMinZoom,
      interactive: false,
      // The main map above carries the attribution, which is what OSM's terms require of
      // the page. A second copy inside a 175px decorative thumbnail only wrapped to three
      // lines and spilled out the bottom - see 25a item 6.
      attributionControl: false
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
    if (this.showingSelectedOnly) {
      this.numSelectedRows.set(this.fieldReportService.getSelectedFieldReports().fieldReportArray.length)
    }
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
