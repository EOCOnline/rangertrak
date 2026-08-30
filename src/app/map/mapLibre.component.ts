import { GeoJSONSource, Map as MaplibreMap, MapLayerMouseEvent, MapMouseEvent, Marker, Popup } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { Subscription } from 'rxjs'

import { DOCUMENT, NgTemplateOutlet } from '@angular/common'
import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, Input, OnDestroy, OnInit,
  TemplateRef, ViewChild, signal
} from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle'

import { buildPmtilesStyle, DEFAULT_PMTILES_URL, registerPmtilesProtocol } from '../shared/mapping/map-style'
import {
  fieldReportStatusColor, locationCategoryColor, resolveCssColorForCanvas
} from '../shared/mapping/report-marker-status'
// F29-7/8 (2026-08-29): rangerColorFor's own file imports Leaflet (for rangerIconFor's return
// type - a real, if type-only-adjacent, module import), which E-64 otherwise keeps out of
// MapLibre's lazy chunk on purpose. Accepted here anyway: Leaflet is ALWAYS the default
// engine and mounts first on every /map visit (see checkMapEngineSwitch), so by the time a
// visitor has switched engines and MapLibre's own chunk loads, Leaflet is already loaded
// regardless - this costs nothing extra in practice, only a "this chunk technically imports
// Leaflet" purity concern, not a real download. Reusing the SAME function as the Leaflet
// map's markers/trails (rather than a second color scheme) is the actual point - ranger-
// icon.ts's own doc comment on why this exists at all.
import { rangerColorFor } from '../shared/mapping/ranger-icon'
// ADR D-49: same Leaflet-import acceptance as rangerColorFor above - locationMarkerSvg()
// itself touches no Leaflet API (it returns a plain SVG string), but its file also exports
// the Leaflet-typed locationIconFor(), so importing it here pulls that module in regardless.
import { locationMarkerSvg } from '../shared/mapping/location-icon'
import {
  FieldReportsType, FieldReportService, FieldReportType, LogService, MissionLocationService,
  MissionLocationType, MissionService, MissionType
} from '../shared/services'
import { Utility, formatReportTime } from '../shared'
import { LocationDialogComponent } from './location-dialog/location-dialog.component'

const REPORTS_SOURCE_ID = 'field-reports'

/**
 * MapLibre + PMTiles full-page map. A sibling to LmapComponent (Leaflet), not a
 * replacement - both engines ship side by side until real usage shows which is better.
 * See PRIVATE-Roadmap.md "Mapping" section.
 */
@Component({
  selector: 'rangertrak-mapLibre',
  standalone: true,
  imports: [NgTemplateOutlet, MatSlideToggleModule, MatButtonModule, MatIconModule],
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
  // REVERTED live 2026-08-30, same day it was turned on: a live report (screenshots, phone,
  // zoomed both out and in to Vashon) showed hillshade rendering as a full-viewport pale
  // relief texture with NO visible basemap underneath at all - no roads, no water, no land
  // colour. This engine's bundled vashon.pmtiles is already known to have very sparse tile
  // coverage (Private Roadmap.md's own root-cause note: ~350 tiles total for the whole-island
  // bounds its header claims), a data problem, not a code one. With hillshade off, a missing
  // basemap read as an obviously-blank map; with it on, the same gap gets dressed up in a
  // relief texture that looks like it might be real terrain, which is worse - it hides the
  // fact that the basemap itself failed to render rather than surfacing it. Back to off by
  // default until the tileset itself is regenerated with real coverage.
  public hillshadeVisible = signal(false)

  // ADR D-49: Locations (Command Post, Staging Area, Ranger First Aid, ...). Plain
  // `maplibregl.Marker` DOM overlays, not a GeoJSON `symbol` layer like the field-report
  // dots above - locations are few and named, and a real DOM element is the simplest way to
  // reuse locationMarkerSvg()'s own SVG string unchanged (a `symbol` layer would need each
  // shape pre-registered as a raster/SDF image via `map.addImage()` instead).
  private locationMarkers: Marker[] = []
  private locations: MissionLocationType[] = []
  private locationsSubscription!: Subscription

  // Armed by the "Add Location" button (template) - the next plain map click places a
  // location there instead of copying coordinates (onMapClick, below), then disarms itself.
  // Mirrors LmapComponent's own placingLocation - see its comment for why one-shot.
  public placingLocation = signal(false)

  constructor(
    private missionService: MissionService,
    private fieldReportService: FieldReportService,
    private locationService: MissionLocationService,
    private dialog: MatDialog,
    private log: LogService,
    @Inject(DOCUMENT) private document: Document
  ) {
    registerPmtilesProtocol()

    this.missionSubscription = this.missionService.getMissionObserver().subscribe({
      next: (newMission) => { this.settings = newMission },
      error: (e) => this.log.error('MapLibreComponent mission subscription error: ' + e, 'MapLibreComponent')
    })

    // Cached here rather than only read on demand, same reasoning as LmapComponent's own
    // constructor subscription: the ReplaySubject(1) replays synchronously, before `this.map`
    // exists - refreshLocationMarkers() guards on it, and the `'load'` handler below calls it
    // again once the map is actually built.
    this.locationsSubscription = this.locationService.getLocationsObserver().subscribe({
      next: (newLocations) => {
        this.locations = newLocations
        this.refreshLocationMarkers()
      },
      error: (e) => this.log.error(`MapLibreComponent locations subscription error: ${e}`, 'MapLibreComponent')
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
      this.refreshLocationMarkers()
      this.fitToBounds()
      // Not called here directly - see warmBundledPmtilesCache()'s own doc comment for why
      // firing it inside this same handler reopens exactly the race it was written to close.
      this.map.once('idle', () => this.warmBundledPmtilesCache())
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
   * Range fetch, both firing within milliseconds of each other at the *same URL*, are exactly
   * the shape of request a browser may de-duplicate/merge, handing the Range caller back
   * whatever the plain request received.
   *
   * RE-ROOT-CAUSED 2026-08-30 (live report: main map stayed grey background + hillshade only,
   * while the overview thumbnail - same style, same URL, just no warming call - rendered the
   * real basemap correctly at the identical location): sequencing this call to fire from
   * inside the `'load'` handler was *not* enough, because that handler's own `fitToBounds()`
   * call (just above) changes the viewport, which itself kicks off a fresh round of Range
   * fetches for whatever tiles the new bounds need - fired at the exact point `'load'` had
   * already fired, i.e. exactly when this function used to run. So the plain warming fetch
   * was racing THOSE fetches instead, the same failure mode moved one step later rather than
   * closed. Deferred to the map's `'idle'` event (fired once no source has outstanding
   * requests) instead of calling this synchronously in the `'load'` handler - by then every
   * Range fetch fitToBounds() triggered has already resolved, so there is nothing left for
   * this plain fetch to race.
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
   * (`visibility: 'none'`) so the default view is unchanged - briefly turned on by default
   * 2026-08-30, reverted the same day (see `hillshadeVisible`'s own comment for why);
   * `raster-opacity` matches Leaflet's own 50% so the vector roads/water/buildings stay
   * legible underneath.
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
      layout: { visibility: this.hillshadeVisible() ? 'visible' : 'none' },
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
        // F29-7/8 (2026-08-29): was a single hardcoded color for every report regardless of
        // which ranger filed it - "only as red dots, not as unique per ranger markers" was
        // the maintainer's exact complaint, and reading this code confirmed it directly: no
        // per-ranger marker system was ever built for MapLibre, unlike Leaflet's
        // rangerIconFor(). Data-driven off each feature's own `rangerColor` property
        // (buildGeoJson() resolves it per point, same rangerColorFor() Leaflet's markers and
        // trails already use), same treatment as `statusColor` below already gets. Distinct
        // per-ranger SHAPES (not just color) would need MapLibre's `symbol` layer type with
        // pre-registered images instead of a plain `circle` layer - a bigger change, not
        // attempted here; color alone already answers the complaint as reported.
        'circle-color': ['get', 'rangerColor'],
        'circle-radius': 8,
        // Raised live 2026-08-26: a status "shadow" ring, data-driven off each feature's own
        // `statusColor` property (buildGeoJson() resolves it per point) - same treatment as
        // the Leaflet markers' halo, same color lookup. Widened from a plain 2px white
        // outline to carry that color visibly.
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
          // Raised live 2026-08-26: a status "shadow" ring around each point, same color
          // lookup as the Leaflet markers (report-marker-status.ts). MapLibre's paint
          // expressions run in its own WebGL renderer, not the DOM/CSSOM, so a semantic
          // `var(--rt-status-*)` token has to be resolved to a concrete color up front -
          // resolveCssColorForCanvas() is exactly that, and a raw custom color passes
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
              // phase 5) and same color function Leaflet's markers/trails already use, so a
              // ranger's dot is the same color on both map engines.
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

    // ADR D-49: armed by the "Add Location" button. Takes over this one click instead of the
    // usual copy-to-clipboard, then disarms - see placingLocation's own comment for why.
    if (this.placingLocation()) {
      this.placingLocation.set(false)
      this.openLocationDialog(undefined, { lat: ev.lngLat.lat, lng: ev.lngLat.lng })
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

  /**
   * ADR D-49: redraws every Location marker from scratch - same "clear and rebuild" approach
   * refreshMarkers() takes for field reports, cheap at the count a mission's own location
   * list reaches. Guarded on `this.map`: the locations subscription (constructor) can fire
   * before the map exists (ReplaySubject(1) replays synchronously) - see its own comment.
   */
  private refreshLocationMarkers(): void {
    if (!this.map) {
      return
    }
    this.locationMarkers.forEach(m => m.remove())
    this.locationMarkers = this.locations.map(loc => {
      const color = locationCategoryColor(loc.type, this.settings.locationTypes)
      const el = document.createElement('div')
      el.className = 'rt-location-marker'
      el.innerHTML = locationMarkerSvg(loc.type, color)
      el.title = loc.name
      // MapLibre's marker element sits in the same container the map's own 'click' listener
      // is bound to (unlike Leaflet's synthetic event system) - without stopping propagation
      // here, clicking a location would ALSO fire onMapClick, copying its coordinates and,
      // worse, triggering the "place a new location" flow if placingLocation were armed.
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        this.openLocationDialog(loc)
      })
      return new Marker({ element: el, anchor: 'bottom' })
        .setLngLat([loc.lng, loc.lat])
        .addTo(this.map)
    })
  }

  /** Opens the add/edit dialog. `coords` for a fresh placement; `existing` to edit/delete one already on the map. */
  private openLocationDialog(existing?: MissionLocationType, coords?: { lat: number, lng: number }): void {
    this.dialog.open(LocationDialogComponent, {
      data: {
        lat: coords?.lat ?? existing?.lat ?? this.settings.defLat,
        lng: coords?.lng ?? existing?.lng ?? this.settings.defLng,
        locationTypes: this.settings.locationTypes,
        existing,
      }
    })
  }

  /** Toggled by the "Add Location" button (template). Arms the next plain map click. */
  onToggleAddLocation(): void {
    this.placingLocation.set(!this.placingLocation())
  }

  ngOnDestroy(): void {
    this.missionSubscription?.unsubscribe()
    this.fieldReportsSubscription?.unsubscribe()
    this.locationsSubscription?.unsubscribe()
    this.locationMarkers.forEach(m => m.remove())
    this.overviewMap?.remove()
    this.map?.remove()
  }
}
