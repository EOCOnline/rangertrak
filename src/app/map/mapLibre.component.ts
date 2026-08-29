import { GeoJSONSource, Map as MaplibreMap, MapLayerMouseEvent, MapMouseEvent, Popup } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { Subscription } from 'rxjs'

import { DOCUMENT, NgTemplateOutlet } from '@angular/common'
import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, Input, OnDestroy, OnInit,
  TemplateRef, ViewChild, signal
} from '@angular/core'
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle'

import { buildPmtilesStyle, DEFAULT_PMTILES_URL, registerPmtilesProtocol } from '../shared/mapping/map-style'
import { fieldReportStatusColor, resolveCssColorForCanvas } from '../shared/mapping/report-marker-status'
// F29-7/8 (2026-08-29): rangerColorFor's own file imports Leaflet (for rangerIconFor's return
// type - a real, if type-only-adjacent, module import), which E-64 otherwise keeps out of
// MapLibre's lazy chunk on purpose. Accepted here anyway: Leaflet is ALWAYS the default
// engine and mounts first on every /map visit (see checkMapEngineSwitch), so by the time a
// visitor has switched engines and MapLibre's own chunk loads, Leaflet is already loaded
// regardless - this costs nothing extra in practice, only a "this chunk technically imports
// Leaflet" purity concern, not a real download. Reusing the SAME function as the Leaflet
// map's markers/trails (rather than a second colour scheme) is the actual point - ranger-
// icon.ts's own doc comment on why this exists at all.
import { rangerColorFor } from '../shared/mapping/ranger-icon'
import {
  FieldReportsType, FieldReportService, FieldReportType, LogService, MissionService, MissionType
} from '../shared/services'
import { Utility, formatReportTime } from '../shared'

const REPORTS_SOURCE_ID = 'field-reports'

/**
 * MapLibre + PMTiles full-page map. A sibling to LmapComponent (Leaflet), not a
 * replacement - both engines ship side by side until real usage shows which is better.
 * See PRIVATE-Roadmap.md "Mapping" section.
 */
@Component({
  selector: 'rangertrak-mapLibre',
  standalone: true,
  imports: [NgTemplateOutlet, MatSlideToggleModule],
  templateUrl: './mapLibre.component.html',
  styleUrls: ['./mapLibre.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class MapLibreComponent implements OnInit, AfterViewInit, OnDestroy {

  // Owned and templated by MapPageComponent (the page shell), passed through
  // ngComponentOutletInputs since this component is mounted dynamically - this component
  // only decides WHERE in its own layout to render it (see the template, right before
  // Instructions). See map-page.component.html's own comment for why.
  @Input() engineSwitchTemplate?: TemplateRef<unknown>

  // Resolved from this component's own view, never by DOM id. Three map components once
  // all used id="map", and both MapLibre and Leaflet resolve a string container globally -
  // so whichever matching element the document happened to hold first won. See D-30.
  @ViewChild('mapContainer') private mapContainer!: ElementRef<HTMLDivElement>
  @ViewChild('overviewContainer') private overviewContainer!: ElementRef<HTMLDivElement>

  private map!: MaplibreMap
  private overviewMap: MaplibreMap | undefined
  private settings!: MissionType
  private fieldReports: FieldReportsType | undefined
  private showingSelectedOnly = false

  private missionSubscription!: Subscription
  private fieldReportsSubscription!: Subscription

  // Mutated from MapLibre's own event listeners / an RxJS subscribe callback, not
  // Angular template bindings - this app is zoneless, so a plain field written there
  // has no guaranteed path back into change detection. Signals close that gap. (Sprint G)
  public numAllRows = signal(0)
  public numSelectedRows = signal(0)
  public zoomDisplay = signal(15)
  // E-64: mirrors LmapComponent's readout - cheap to add since the map/mousemove idiom is
  // already used here for zoomend. Stays at its initial value on touch devices (no
  // `mousemove` event there), same as the Leaflet readout - not a regression.
  public mouseLatLng = signal({ lat: 0, lng: 0 })

  // Terrain overlay, off by default (same default as Leaflet's own equivalent checkbox
  // below) - see addHillshadeLayer()'s own comment for the source and why it's a real
  // MapLibre layer rather than a second style.
  public hillshadeVisible = signal(false)

  constructor(
    private missionService: MissionService,
    private fieldReportService: FieldReportService,
    private log: LogService,
    @Inject(DOCUMENT) private document: Document
  ) {
    registerPmtilesProtocol()

    this.missionSubscription = this.missionService.getMissionObserver().subscribe({
      next: (newMission) => { this.settings = newMission },
      error: (e) => this.log.error('MapLibreComponent mission subscription error: ' + e, 'MapLibreComponent')
    })

    this.fieldReportsSubscription = this.fieldReportService.getFieldReportsObserver().subscribe({
      next: (newReports) => {
        this.fieldReports = newReports
        this.numAllRows.set(newReports.numReport)
        this.refreshMarkers()
      },
      error: (e) => this.log.error('MapLibreComponent field reports subscription error: ' + e, 'MapLibreComponent')
    })
  }

  ngOnInit(): void {
    this.fieldReports = this.fieldReportService.getCurrentFieldReports()
    this.numAllRows.set(this.fieldReports.numReport)
    this.zoomDisplay.set(this.settings.maplibre.defZoom)
    this.mouseLatLng.set({ lat: this.settings.defLat, lng: this.settings.defLng })
  }

  ngAfterViewInit(): void {
    this.map = new MaplibreMap({
      container: this.mapContainer.nativeElement,
      style: buildPmtilesStyle(),
      center: [this.settings.defLng, this.settings.defLat],
      zoom: this.settings.maplibre.defZoom
    })

    // Without a listener MapLibre swallows source/tile failures into a console warning at
    // most, so a basemap that never loads looks identical to one that loaded empty. Log
    // them: an offline map silently showing blank is the single most confusing failure
    // this screen can have.
    this.map.on('error', (ev: any) => {
      this.log.error(`MapLibre error${ev?.sourceId ? ` (source "${ev.sourceId}")` : ''}: ${ev?.error?.message ?? JSON.stringify(ev)}`, 'MapLibreComponent')
    })

    this.map.on('load', () => {
      this.addHillshadeLayer()
      this.addReportsSource()
      this.refreshMarkers()
      this.fitToBounds()
      this.warmBundledPmtilesCache()
    })

    this.map.on('zoomend', () => { this.zoomDisplay.set(Math.round(this.map.getZoom())) })

    // Mirrors LmapComponent's own readout. `mousemove` fires continuously - if this ever
    // causes jank, throttle it - but Leaflet's own mousemove-driven readout does the same
    // thing today with no reported issue, so this is not a new pattern. No-op on touch
    // devices (no `mousemove` there), same as the Leaflet readout - not a regression.
    this.map.on('mousemove', (ev: MapMouseEvent) => {
      this.mouseLatLng.set({ lat: ev.lngLat.lat, lng: ev.lngLat.lng })
    })

    this.map.on('click', (ev: MapMouseEvent) => this.onMapClick(ev))

    this.initOverviewMap()
  }

  private initOverviewMap(): void {
    this.overviewMap = new MaplibreMap({
      container: this.overviewContainer.nativeElement,
      style: buildPmtilesStyle(),
      center: [this.settings.defLng, this.settings.defLat],
      zoom: this.settings.maplibre.overviewMinZoom,
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
        this.map.getZoom() - this.settings.maplibre.overviewDifference,
        this.settings.maplibre.overviewMinZoom,
        this.settings.maplibre.overviewMaxZoom
      )
      this.overviewMap.jumpTo({ center, zoom: targetZoom })
    })
  }

  private clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max)
  }

  /**
   * Mission Readiness's "bundled MapLibre asset warmed" signal (mission-readiness.service.ts)
   * does a plain, read-only `caches.match(DEFAULT_PMTILES_URL)` - but this map's own tile
   * source (pmtiles-js, via registerPmtilesProtocol) only ever fetches that file with Range
   * headers, which Angular's service worker deliberately never intercepts or caches (its
   * documented limitation: caching a partial-content response under a full-file URL would
   * wrongly serve a byte range to a later full-file request). One plain, non-Range fetch
   * here - cached under this app's own name, not ngsw's internal one - is enough: the
   * readiness check's `caches.match()` searches every cache in this origin, so the two never
   * needed to share one, only the URL key.
   *
   * ROOT-CAUSED 2026-08-27, moved out of the constructor to here (called from `'load'`, so
   * it only runs after the map's own critical basemap fetches have already resolved): a live
   * report found the basemap rendering blank - `pmtiles-js`'s Range-fetch of this same URL
   * was getting back a plain 200 response with the FULL file's Content-Length instead of a
   * 206 partial one, which its own `FetchSource.getBytes()` treats as fatal ("Server
   * returned no content-length header or content-length exceeding request"). Confirmed via
   * `tools/serve-dist.js`'s own Range logic being correct in isolation (206 + proper
   * Content-Range/Content-Length when `req.headers.range` is present) - so the request that
   * arrived at the server without triggering that branch must have lost its Range header,
   * which points at browser-level request coalescing: this plain fetch and pmtiles-js's own
   * Range fetch, both firing within milliseconds of each other at the *same URL* from the
   * constructor and `ngAfterViewInit()` respectively, are exactly the shape of request a
   * browser may de-duplicate/merge, handing the Range caller back whatever the plain request
   * received. Sequencing this to run only after `'load'` (i.e., after the basemap's own
   * fetches are done, not racing them) removes that window entirely for a fresh mount.
   *
   * `cache: 'no-store'` kept as defense in depth for a *repeat* mount (navigate away from
   * `/map` and back, or flip engines twice): without it, this fetch's own response could sit
   * in the browser's ambient HTTP cache and be there to interfere with a LATER instance's
   * pmtiles-js Range fetch, even though this instance's own race is already closed by the
   * sequencing above.
   */
  private warmBundledPmtilesCache(): void {
    fetch(DEFAULT_PMTILES_URL, { cache: 'no-store' })
      .then(res => res.ok ? caches.open('rangertrak-pmtiles-warm').then(c => c.put(DEFAULT_PMTILES_URL, res)) : undefined)
      .catch(err => this.log.warn(`Failed to warm bundled PMTiles cache entry: ${err}`, 'MapLibreComponent'))
  }

  /**
   * Terrain relief overlay - raised in the same backlog row as a request for "a real
   * layer-visibility toggle... once this or any other overlay exists." Esri's
   * World_Hillshade REST tile service (free, no API key), same source used for Leaflet's
   * equivalent checkbox (mapLeaflet.component.ts) - kept as ONE real MapLibre layer added
   * on top of the vector basemap, not a second style, so toggling it is a plain
   * `setLayoutProperty` visibility flip rather than swapping the whole map's style (which
   * would flash/reload the basemap and lose the reports source). Starts hidden
   * (`visibility: 'none'`) so the default view is unchanged; `raster-opacity` matches
   * Leaflet's own 50% so the vector roads/water/buildings stay legible underneath.
   *
   * Fixed 2026-08-26 (live report, found via the Leaflet side - same URL bug here, not yet
   * separately reported for this engine): the URL was missing Esri's `Elevation/` folder
   * segment - `.../rest/services/World_Hillshade/MapServer/...` 404s ("Service not found",
   * confirmed with `?f=json`); the real service lives at
   * `.../rest/services/Elevation/World_Hillshade/MapServer/...`. See mapLeaflet.component.ts's
   * matching layer for the full diagnosis.
   */
  private addHillshadeLayer(): void {
    this.map.addSource('hillshade-source', {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 16,
      attribution: 'Hillshade: &copy; <a href="https://www.esri.com">Esri</a>',
    })
    this.map.addLayer({
      id: 'hillshade',
      type: 'raster',
      source: 'hillshade-source',
      layout: { visibility: 'none' },
      paint: { 'raster-opacity': 0.5 },
    })
  }

  onToggleHillshade(event: MatSlideToggleChange): void {
    const checked = event.checked
    this.hillshadeVisible.set(checked)
    this.map.setLayoutProperty('hillshade', 'visibility', checked ? 'visible' : 'none')
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
        // F29-7/8 (2026-08-29): was a single hardcoded colour for every report regardless of
        // which ranger filed it - "only as red dots, not as unique per ranger markers" was
        // the maintainer's exact complaint, and reading this code confirmed it directly: no
        // per-ranger marker system was ever built for MapLibre, unlike Leaflet's
        // rangerIconFor(). Data-driven off each feature's own `rangerColor` property
        // (buildGeoJson() resolves it per point, same rangerColorFor() Leaflet's markers and
        // trails already use), same treatment as `statusColor` below already gets. Distinct
        // per-ranger SHAPES (not just colour) would need MapLibre's `symbol` layer type with
        // pre-registered images instead of a plain `circle` layer - a bigger change, not
        // attempted here; colour alone already answers the complaint as reported.
        'circle-color': ['get', 'rangerColor'],
        'circle-radius': 8,
        // Raised live 2026-08-26: a status "shadow" ring, data-driven off each feature's own
        // `statusColor` property (buildGeoJson() resolves it per point) - same treatment as
        // the Leaflet markers' halo, same colour lookup. Widened from a plain 2px white
        // outline to carry that colour visibly.
        'circle-stroke-width': 4,
        'circle-stroke-color': ['get', 'statusColor']
      }
    })

    this.map.on('click', 'clusters', (ev) => this.onClusterClick(ev))
    this.map.on('click', 'unclustered-point', (ev) => this.onPointClick(ev))
    this.map.on('mouseenter', 'clusters', () => { this.map.getCanvas().style.cursor = 'pointer' })
    this.map.on('mouseleave', 'clusters', () => { this.map.getCanvas().style.cursor = '' })
    this.map.on('mouseenter', 'unclustered-point', () => { this.map.getCanvas().style.cursor = 'pointer' })
    this.map.on('mouseleave', 'unclustered-point', () => { this.map.getCanvas().style.cursor = '' })
  }

  private buildGeoJson(): FeatureCollection<Point, { title: string, statusColor: string, rangerColor: string }> {
    const reportsToShow = this.showingSelectedOnly
      ? this.fieldReportService.getSelectedFieldReports().fieldReportArray
      : (this.fieldReports?.fieldReportArray ?? [])

    return {
      type: 'FeatureCollection',
      features: reportsToShow
        .filter((r: FieldReportType) => r.location?.lat && r.location?.lng)
        .map((r: FieldReportType) => {
          // Raised live 2026-08-26: a status "shadow" ring around each point, same colour
          // lookup as the Leaflet markers (report-marker-status.ts). MapLibre's paint
          // expressions run in its own WebGL renderer, not the DOM/CSSOM, so a semantic
          // `var(--rt-status-*)` token has to be resolved to a concrete colour up front -
          // resolveCssColorForCanvas() is exactly that, and a raw custom colour passes
          // through unchanged either way. Falls back to a neutral grey (not the ring's own
          // default absence) so an unknown/blank status is visibly "unset," not silently
          // invisible in a paint expression that expects a string every time.
          const rawColor = fieldReportStatusColor(r.status, this.settings.fieldReportStatuses)
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [r.location.lng, r.location.lat] },
            properties: {
              title: `${r.callsign} at ${formatReportTime(r.date)} with ${r.status}`,
              statusColor: rawColor ? resolveCssColorForCanvas(rawColor) : '#888888',
              // F29-7/8: same identity key (rangerUid preferred, callsign fallback - D-42
              // phase 5) and same colour function Leaflet's markers/trails already use, so a
              // ranger's dot is the same colour on both map engines.
              rangerColor: rangerColorFor(r.rangerUid || r.callsign),
            }
          }
        })
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
    }).catch((e: unknown) => this.log.warn(`onClusterClick: ${e}`, 'MapLibreComponent'))
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
      .catch((err) => this.log.error(`onMapClick: coords NOT copied to clipboard: ${err}`, 'MapLibreComponent'))
  }

  ngOnDestroy(): void {
    this.missionSubscription?.unsubscribe()
    this.fieldReportsSubscription?.unsubscribe()
    this.overviewMap?.remove()
    this.map?.remove()
  }
}
