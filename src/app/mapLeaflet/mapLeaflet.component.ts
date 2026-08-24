

// also: https://github.com/onthegomap/planetiler
//import { openDB, deleteDB, wrap, unwrp } from 'idb'
// Leaflet must be *evaluated* before leaflet.markercluster: the plugin is old-style and
// reads the global `L` at module-evaluation time ("L is not defined" otherwise). This bare
// side-effect import guarantees that, and sorts ahead of the plugin alphabetically so
// import-sort cannot undo it. It used to work only by accident, via the eager
// `import L from 'leaflet'` that FieldReportService no longer has.
import 'leaflet'
import 'leaflet.markercluster'
import { getStorageInfo, getTilePoints, savetiles, tileLayerOffline } from 'leaflet.offline' // https://github.com/allartk/leaflet.offline
//import { markerClusterGroup } from 'leaflet'
import * as L from 'leaflet'

//import pc from 'picocolors' // https://github.com/alexeyraspopov/picocolors
import { throwError } from 'rxjs'

import { DOCUMENT } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { AfterViewInit, Component, ElementRef, Inject, Input, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core'

import { AbstractMap, Utility } from '../shared'
import { FieldReportService, FieldReportType, LocationType, LogService, RangerService, SettingsService } from '../shared/services'

import { DisclosureComponent } from '../shared/disclosure/disclosure.component';

// https://www.digitalocean.com/community/tutorials/angular-angular-and-leaflet
// Markers are copied into project via virtue of angular.json: search it for leaflet!!!

// TODO: Add heatmap: https://www.patrick-wied.at/static/heatmapjs/example-heatmap-leaflet.html

const iconRetinaUrl = 'assets/icons/marker-icon-2x.png'
const iconUrl = 'assets/icons/marker-icon.png'
const shadowUrl = 'assets/icons/marker-shadow.png'
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

// Offline-area sizing (roadmap: "Offline map area: saved-file sizes, anticipated MB").
// Real tile bytes aren't known until a tile is actually downloaded, so the "anticipated"
// number falls back to this - a typical 256px OSM PNG raster tile - until at least one real
// tile has been saved, at which point the average of what's actually stored is used instead.
const FALLBACK_TILE_BYTES = 15 * 1024

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// E-80 phase 1: team route trails. Drawn directly on map tiles (not app chrome), so these
// don't need to track the app's light/dark scheme - a fixed, saturated hash colour reads
// fine against OSM tiles either way. UNKNOWN_TEAM_TRAIL_COLOR covers a callsign the current
// roster doesn't recognise (free-text team on RangerType, see E-40) or has no team set.
const UNKNOWN_TEAM_TRAIL_COLOR = '#6B7280'

function teamColorFor(team: string): string {
  if (!team) return UNKNOWN_TEAM_TRAIL_COLOR
  let hash = 0
  for (let i = 0; i < team.length; i++) {
    hash = (hash * 31 + team.charCodeAt(i)) | 0
  }
  return `hsl(${Math.abs(hash) % 360}, 65%, 42%)`
}


@Component({
  selector: 'rangertrak-mapLeaflet',
  standalone: true,
  imports: [DisclosureComponent],
  templateUrl: './mapLeaflet.component.html',
  styleUrls: [
    './mapLeaflet.component.scss'
    //,     "../../../node_modules/leaflet.markercluster/dist/MarkerCluster.css", // REVIEW: also added to angular.json: needed there?
    // "../../../node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css" // (not needed if you use your own iconCreateFunction instead of the default one)
    //'../../../node_modules/leaflet/dist/leaflet.css' // only seems to work when embedded in angular.json & Here! (chgs there REQUIRE restart!)
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  // Deliberately NOT providing SettingsService: it is providedIn:'root' and a second
  // instance here would diverge from everyone else's. See BUG-2 in entry.component.ts.
})
export class LmapComponent extends AbstractMap implements OnInit, AfterViewInit, OnDestroy {  //OnInit,



  public override id = 'Leaflet Map Component'

  // static: true - these divs sit in the template unconditionally, so the query resolves
  // before ngOnInit, which is where the maps are built. Resolved from this component's own
  // view rather than by DOM id: Leaflet looks a string container up globally, and three map
  // components once all used id="map". See D-30.
  @ViewChild('mapContainer', { static: true }) private mapContainer!: ElementRef<HTMLDivElement>
  @ViewChild('overviewContainer', { static: true }) private overviewContainer!: ElementRef<HTMLDivElement>

  private lMap!: L.Map
  private overviewMapLeaflet!: L.Map

  // TODO: Leaflet's version of following?
  overviewMapLeafletType = { cur: 2, types: { type: ['roadmap', 'terrain', 'satellite', 'hybrid',] } }

  // https://leafletjs.com/reference.html#icon
  mapCursor = L.icon({
    iconUrl: '../../assets/icons/my-icon.png',
    //iconSize: [38, 95],
    //iconAnchor: [22, 94],
    //popupAnchor: [-3, -76],
    //shadowUrl: 'my-icon-shadow.png',
    //shadowSize: [68, 95],
    //shadowAnchor: [22, 94]
  })

  myMarkerCluster = new window.L.MarkerClusterGroup()
  // E-80 phase 1: per-callsign route trails, static (no animation/timer - see the roadmap
  // scoping). A plain layer group, not clustered - clustering exists to collapse crowded
  // point markers and would be actively wrong for line geometry.
  myTrailsLayer = L.layerGroup()
  mapOptions = ""

  //markerClusterGroup: L.MarkerClusterGroup // MarkerClusterGroup extends FeatureGroup, retaining it's methods, e.g., clearLayers() & removeLayers()
  //markerClusterData = []

  //!TODO: Add fullscreen button: https://tomik23.github.io/leaflet-examples/#27.fullscreen

  constructor(
    settingsService: SettingsService,
    fieldReportService: FieldReportService,
    httpClient: HttpClient,
    log: LogService,
    private rangerService: RangerService,
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

    // this.markerClusterGroup = L.markerClusterGroup({ removeOutsideVisibleBounds: true });
  }

  // override ngOnInit() {
  //   super.ngOnInit()
  //   this.log.excessive("ngOnInit()", this.id)
  // }

  // Initialize data or fetch external data from services or API (https://geeksarray.com/blog/angular-component-lifecycle)
  override ngOnInit() {
    super.ngOnInit()
    this.log.excessive("ngOnInit()", this.id)

    this.initMainMap()  //! REVIEW: Causes LOTS of "mapLeaflet:1 Uncaught (in promise) {message: 'A listener indicated an asynchronous response by r…age channel closed before a response was received'}" May need to wait, or ?????

    if (this.hasOverviewMap) {
      this.initOverviewMap()

      // Highlight main map location via a rectangle on the overview map
      let rectangle = L.rectangle(this.lMap.getBounds(), { color: 'Blue', fillOpacity: 0.07, weight: 1 })
      rectangle.addTo(this.overviewMapLeaflet)

      this.lMap.on("move", () => {
        //if (this.overviewMapLeaflet instanceof L.Map) {
        this.overviewMapLeaflet.setView(this.lMap.getCenter()!,
          this.clamp(
            this.lMap.getZoom() -
            (this.settings.leaflet.overviewDifference),
            (this.settings.leaflet.overviewMinZoom),
            (this.settings.leaflet.overviewMaxZoom)
          ))
        rectangle.setBounds(this.lMap.getBounds())
      }
        //}
      )
    }

    if (this.displayReports && this.fieldReports) {
      // updateFieldReports() first: it is what fills displayedFieldReportArray for
      // the current all/selected choice, and displayMarkers() draws from that.
      this.updateFieldReports()
      this.displayMarkers()
      // Re-enabled: bounds used to be a Leaflet LatLngBounds that arrived from
      // localStorage as a plain object, so this threw "Bounds are not valid" and was
      // commented out - leaving markers off-screen on open. It is now a plain
      // BoundsType, converted to Leaflet's [SW, NE] form right here.
      const b = this.fieldReports.bounds
      this.lMap.fitBounds(L.latLngBounds([b.south, b.west], [b.north, b.east]))
    }

    this.log.excessive("out of ngOnInit()", this.id)
  }

  /**
   * Called once all HTML elements have been created.
   *
   * Leaflet measures its container when the map is constructed, and ngOnInit runs
   * before the view is laid out. On a full page load that happened to work; on a
   * client-side navigation to /mapLeaflet the container was still 0x0, so Leaflet loaded
   * no tiles and the page looked blank until a manual refresh. invalidateSize()
   * re-measures. The extra tick lets the browser finish layout first - calling it
   * synchronously here still measures 0 in some browsers.
   */
  // Cleared in ngOnDestroy - see there for why this became necessary once that method
  // actually removes the maps instead of leaving them dangling.
  private afterViewInitTimer?: ReturnType<typeof setTimeout>

  // Offline-area sizing: kept for teardown (.off()) in ngOnDestroy, since these listeners
  // are registered directly on the layer/map objects, not through Angular's own bindings.
  private offlineTileLayer?: ReturnType<typeof tileLayerOffline>
  private refreshSavedAreaInfo?: () => void
  private refreshEstimatedAreaInfo?: () => void

  ngAfterViewInit() {
    this.afterViewInitTimer = setTimeout(() => {
      this.lMap?.invalidateSize()
      this.overviewMapLeaflet?.invalidateSize()
    })
  }

  onInstallBtn() {
    this.log.error("onInstallBtn onInstallBtn onInstallBtn onInstallBtn UNIMPLEMENTED!!!!!!!!!!!!!!!!!!!!!!", this.id)
  }

  override initMainMap() {
    //this.log.excessive("initMainMap()  pre-super", this.id)
    super.initMainMap()
    this.log.excessive("initMainMap() post-super", this.id)


    // ! Repeat of the guards in super:
    if (this.settings === null) {
      this.log.error(`Settings still NULL! while initializing the Leaflet Map!`, this.id)
      return
    }
    this.log.excessive("initMainMap() post null check", this.id)

    if (this.settings === undefined) {
      this.log.error(`initMainMap(): Settings still UNDEFINED! while initializing the Leaflet Map!`, this.id)
      return
    }

    if (this.displayReports && !this.fieldReports) { //! or displayedFieldReportArray
      this.log.error(`initMainMap():fieldReports not yet initialized while initializing the Leaflet Map!`, this.id)
      return
    }

    // MarkerClusterGroup extends FeatureGroup, retaining it's methods, e.g., clearLayers() & removeLayers()
    // https://leaflet.github.io/Leaflet.markercluster/
    // per https://stackoverflow.com/a/71574063/18004414 & https://github.com/Leaflet/Leaflet/issues/8451
    this.myMarkerCluster = new window.L.MarkerClusterGroup({ removeOutsideVisibleBounds: true })


    // ---------------- Init Main Map -----------------


    //? Per guidence on settings page: Maps do not use defLat/lng... They are auto-centered on the bounding coordinates centroid of all points entered and the map is then zoomed to show all points.

    this.zoom.set(this.settings ? this.settings.leaflet.defZoom : 15)

    // this.log.excessive("initMainMap(): 3", this.id)

    // TODO: Allow centering map on user's position (geolocation): https://leafletjs.com/reference.html#locate-options
    // TODO: Provide fullscreen button: https://tomik23.github.io/leaflet-examples/#27.fullscreen

    // https://leafletjs.com/reference.html#map-locate
    this.lMap = L.map(this.mapContainer.nativeElement, {
      center: [this.settings ? this.settings.defLat : 0, this.settings ? this.settings.defLng : 0],
      zoom: this.settings ? this.settings.leaflet.defZoom : 15,
      // https://github.com/Leaflet/Leaflet.fullscreen
      // https://github.com/Runette/Leaflet.fullscreen
      // https://brunob.github.io/leaflet.fullscreen/
      // ! fullscreenControl: true
    }) // Default view set at map creation

    if (!this.lMap) {
      this.log.error(`initMainMap(): this.lMap not created!`, this.id)
      return
    }

    // https://stackoverflow.com/questions/14106687/how-do-i-change-the-default-cursor-in-leaflet-maps
    L.DomUtil.addClass(this.lMap.getContainer(), 'crosshair-cursor-enabled')  //  Enable crosshairs
    // L.DomUtil.removeClass(map._container,'crosshair-cursor-enabled') // Disable crosshairs

    // gmap: draggableCursor: 'crosshair', //https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
    //L.marker([50.505, 30.57], { icon: this.mapCursor }).addTo(this.lMap)

    // map can be either Leaflet or Google Map (in the abstract class) -
    // But we know it is JUST Leaflet map in this file!
    // Doing this avoids lots of type guards/hassles.
    this.map = this.lMap

    // tileLayerOffline (not plain L.tileLayer) caches tiles in IndexedDB as they're
    // viewed, and the savetiles control below lets a user explicitly save the visible
    // area for offline use - giving this engine a real offline story to compare against
    // the PMTiles map, rather than the previously-unused `leaflet.offline` import.
    const tiles = tileLayerOffline('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,  // REVIEW: put into settings?
      minZoom: 3,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    // TODO!
    //! REVIEW: Causes LOTS of "mapLeaflet:1 Uncaught (in promise) {message: 'A listener indicated an asynchronous response by r…age channel closed before a response was received'}" May need to wait, or ?????
    tiles.addTo(this.lMap)

    const saveTilesControl = savetiles(tiles, {
      saveText: '💾 Save this area for offline use',
      rmText: '🗑️ Remove saved tiles',
      maxZoom: 19,
      parallel: 3
    }).addTo(this.lMap)
    this.offlineTileLayer = tiles
    this.wireOfflineAreaInfo(tiles, saveTilesControl)

    // TODO: Consider allowing addition of SVG overlay (of known trails and other overlays): https://leafletjs.com/reference.html#svgoverlay
    // TODO: ...or add D3 too: https://bl.ocks.org/xEviL/4921fff1d70f5601d159, w/ GeoJson: https://bl.ocks.org/xEviL/0c4f628645c6c21c8b3a https://github.com/topojson/us-atlas
    // https://www.w3schools.com/graphics/svg_examples.asp & https://commons.wikimedia.org/wiki/SVG_examples

    // https://plnkr.co/edit/zK6Ync2o23viZxSugBoX?preview
    // let svgElement = document.createElementNS("src/assets/data/King_County_Washington_Incorporated_and_Unincorporated_areas_Burien_Highlighted.svg", "svg") as SVGElement
    /*
      let svgElement = document.createElementNS("https://www.w3.org/2000/svg", "svg") as SVGElement
      svgElement.setAttribute('xmlns', "https://www.w3.org/2000/svg");
      svgElement.setAttribute('viewBox', "0 0 200 200");
      svgElement.innerHTML = '<rect width="200" height="200"/><rect x="75" y="23" width="50" height="50" style="fill:red"/><rect x="75" y="123" width="50" height="50" style="fill:#0013ff"/>';
      svgElement.innerHTML = '<rect x="80" y="60" width="250" height="250" rx="20" fill="#F00"/> <rect x="140" y="120" width="250" height="250" rx="40" fill="#00F" fill-opacity=".7"/>';
      L.svgOverlay(svgElement, [[0, 0], [1024, 1152]]).addTo(this.lMap);

      // let svgElementBounds = [[32, -130], [13, -100]]  // as number[][]
      // L.svgOverlay(svgElement, svgElementBounds).addTo(this.lMap);
  */

    if (!this.fieldReports) {
      this.log.error(`initMainMap(): this.fieldReports is null/undefined!`, this.id)
    } else {
      const b = this.fieldReports.bounds
      this.log.info(`initMainMap() E: ${b.east};  N: ${b.north};  W: ${b.west};  S: ${b.south};  `, this.id)
    }

    this.captureLMoveAndZoom(this.lMap)

    // Sprint G: this.zoom was previously only set once, above, at init - never on an
    // actual zoom, so the "Zoom:" display went stale as soon as the user touched the
    // map. Mirrors mini-mapLeaflet.component.ts's zoomend handler.
    this.lMap.on('zoomend', () => {
      if (this.lMap) {
        this.zoom.set(this.lMap.getZoom() ?? this.settings.leaflet.defZoom)
      }
    })

    // this.lMap.on('moveend', ($event: L.LeafletEvent) => {
    //   rectangle.setBounds(this.lMap.getBounds())
    // })


    // force tile display
    /**
     * Using CSS rules for width and height with percentage (%) values. This normally doesn't cause problems
     * unless the ngx-leaflet directive is on an element that has not had its width/height explicitly set.
     * You could try using viewport-percentage units (vh or vw) which can be read about here.
     *
     * Using ngIf or CSS rule display: none. Both of these turn your Angular component into a
     * 0 size element. After an ngIf is true or display:none is reversed, your problem may be
     * solved by having the leaflet map call invalidateSize after one of those events happen.
     *
     * If neither of these suggestions are applicable, try adding a setTimeout call that then has the leaflet map call invalidateSize.
     *
     * ALSO see https://github.com/bluehalo/ngx-leaflet/issues/104#issuecomment-394883609
     */

    // https://stackoverflow.com/questions/61461292/leaflet-map-not-updating-background-tile-correctly-until-resize-or-pan-is-made
    // Call invalidateSize once the tab containing your map becomes visible
    //$('#mapcontainer').width('0');
    //this.lMap.invalidateSize();
    //$('#mapcontainer').width('50%');
    this.lMap.invalidateSize();


  }



  // ------------ Legend ---------------
  // create legend

  //let scale = new L.control
  //scale.scale().addTo(this.lMap)


  /* from  https://tomik23.github.io/leaflet-examples/#28.adding-map-description
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = function () {
    let div = L.DomUtil.create("div", "description");
    L.DomEvent.disableClickPropagation(div);
    const text =
      "<b>Lorem Ipsum</b> is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book...";
    div.insertAdjacentHTML("beforeend", text);
    return div;
  };

  legend.addTo(map);
  */

  // ----------------------- Scale

  // https://leafletjs.com/reference.html#control-scale
  /*
    L.control
  .scale({
    imperial: false,
  })
  .addTo(map);
  */

  /**
   * Roadmap "Offline map area" item, parts (1) and (2): shows each saved area's actual
   * file size next to "Remove saved tiles", and an anticipated MB estimate next to "Save
   * this area for offline use" before the user commits to a download. Both numbers are
   * appended as plain text next to the plugin's own buttons rather than through an Angular
   * template - `ControlSaveTiles` renders its own DOM outside Angular's view, the same way
   * the rest of this plugin's UI already does, so there is no template-reactivity gap to
   * close (see Sprint G's own scoping rule for why that matters here).
   *
   * `tiles`' URL template is what `getStorageInfo` keys off, and it never changes after
   * construction, so it's read once and captured rather than re-read per refresh.
   */
  private wireOfflineAreaInfo(tiles: ReturnType<typeof tileLayerOffline>, control: L.Control) {
    const container = control.getContainer()
    if (!container) {
      this.log.error('wireOfflineAreaInfo(): saveTilesControl has no container', this.id)
      return
    }
    const urlTemplate = (tiles as any)._url as string

    const savedInfo = this.document.createElement('div')
    savedInfo.className = 'offline-area-info offline-area-info--saved'
    container.appendChild(savedInfo)

    const estimateInfo = this.document.createElement('div')
    estimateInfo.className = 'offline-area-info offline-area-info--estimate'
    container.insertBefore(estimateInfo, container.firstChild)

    this.refreshSavedAreaInfo = () => {
      getStorageInfo(urlTemplate).then((stored) => {
        if (stored.length === 0) {
          savedInfo.textContent = 'No tiles saved for offline use yet'
          return
        }
        const bytes = stored.reduce((sum, t) => sum + (t.blob?.size ?? 0), 0)
        savedInfo.textContent = `Saved: ${stored.length} tiles, ~${formatBytes(bytes)}`
      }).catch((err) => this.log.error(`refreshSavedAreaInfo(): ${err}`, this.id))
    }

    this.refreshEstimatedAreaInfo = () => {
      // Mirrors ControlSaveTiles' own _calculateTiles() for the options actually passed
      // above (no saveWhatYouSee, no custom zoomlevels): a single zoom level, the current
      // one, over the current visible bounds - not a private API, just not exported, so
      // replicated here from its public building blocks (getTilePoints, map.project()).
      const zoom = this.lMap.getZoom()
      const bounds = this.lMap.getBounds()
      const area = L.bounds(
        this.lMap.project(bounds.getNorthWest(), zoom),
        this.lMap.project(bounds.getSouthEast(), zoom)
      )
      const tileCount = getTilePoints(area, tiles.getTileSize()).length

      getStorageInfo(urlTemplate).then((stored) => {
        const avgBytes = stored.length > 0
          ? stored.reduce((sum, t) => sum + (t.blob?.size ?? 0), 0) / stored.length
          : FALLBACK_TILE_BYTES
        estimateInfo.textContent = `Current view: ~${tileCount} tiles, ~${formatBytes(tileCount * avgBytes)}`
      }).catch((err) => this.log.error(`refreshEstimatedAreaInfo(): ${err}`, this.id))
    }

    tiles.on('saveend', this.refreshSavedAreaInfo)
    tiles.on('tilesremoved', this.refreshSavedAreaInfo)
    this.lMap.on('moveend zoomend', this.refreshEstimatedAreaInfo)

    this.refreshSavedAreaInfo()
    this.refreshEstimatedAreaInfo()
  }

  /**
   *   ---------------- Init OverView Map -----------------
   *  or consider https://tomik23.github.io/leaflet-examples/#30.mini-map
   */
  initOverviewMap() {
    //! No super.initOverviewMap(), correct?!

    // TODO: Add a light grey rectangle on overview map to show extend/bounods of main map
    this.log.info(`initOverviewMap()`, this.id)


    // instantiate the overview map without controls
    // https://leafletjs.com/reference.html#map-example
    this.overviewMapLeaflet = L.map(this.overviewContainer.nativeElement, {
      center: [this.settings.defLat, this.settings.defLng],
      zoom: this.settings.leaflet.defZoom,
      zoomControl: false,
      keyboard: false,
      scrollWheelZoom: false,
      dragging: false,
    })

    this.overviewMap = this.overviewMapLeaflet

    const overviewTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: this.settings.leaflet.overviewMaxZoom,
      minZoom: this.settings.leaflet.overviewMinZoom,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })

    overviewTiles.addTo(this.overviewMapLeaflet)

    L.DomUtil.addClass(this.overviewMapLeaflet.getContainer(), 'crosshair-cursor-enabled')  //  Enable crosshairs

    // if (this.overviewMapLeaflet === null || this.overviewMapLeaflet === undefined) {
    //   this.log.error(`Could not create overview map!`, this.id)
    //   return
    // }
    // if (this.lMap == null || this.lMap == undefined) {
    //   this.log.error(`map doesn't exist when creating overview map!`, this.id)
    //   return
    // }

    // TODO: Switch map type on click on the overview map
    /* this.overviewMapLeaflet.addListener("click", () => {
      let mapId = this.overviewMapType.cur++ % 4
      this.overviewMapLeaflet.setMapTypeId(this.overviewMapType.types.type[mapId])
      this.log.verbose(`Overview map set to ${this.overviewMapType.types.type[mapId]}`, this.id)
    })*/

    // const infowindow = new google.maps.InfoWindow({
    //   content: "Mouse location...",
    //   position: { lat: this.settings.defLat, lng: this.settings.defLng },
    // })
    //infowindow.open(this.overviewMapLeaflet);

    this.captureLMoveAndZoom(this.overviewMapLeaflet)

    // this.overviewMapLeaflet.on("bounds_changed", () => {
    //   this.overviewMapLeaflet!.setView(this.lMap.getCenter(), this.clamp(
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

    // following from https://github.com/bluehalo/ngx-leaflet/issues/104
    setTimeout(() => {
      this.lMap.invalidateSize()
    }, 0)
  }

  onMapReady2(map: L.Map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 0);
  }

  /**
   * Store Lat/Lng in Clipboard (if enabled in html...)
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
        let status = document.getElementById('Lmap-status')
        if (status) {
          status.innerText = `${coords} copied to clipboard`
          //status.style.visibility = "visible"
          Utility.resetMaterialFadeAnimation(status)
        } else {
          this.log.info(`onMouseClick(): Entry__Minimap-status not found!`, this.id)
        }
        this.log.excessive(`onMouseClick(): ${latlng} copied to clipboard`, this.id)
      })
      .catch(err => {
        this.log.error(`onMouseClick(): latlng NOT copied to clipboard, error: ${err}`, this.id)
      })
  }

  refreshMap() {
    this.log.info(`refreshMap()`, this.id)
    // Try map.remove(); before you try to reload the map. This removes the previous map element using Leaflet's library
    if (this.lMap) {
      this.lMap.invalidateSize() // https://github.com/Leaflet/Leaflet/issues/690
      // Redraw the markers too: this only resized the canvas, so every caller that
      // changed *which* reports should be shown (the all/selected switch, a new
      // report arriving) left the old markers on screen.
      if (this.displayReports) {
        this.displayMarkers()
      }
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
    this.clearMarkers()
  }

  override clearMarkers() {
    // Every marker on this map lives in the cluster group, so emptying it is the
    // whole job. Both of these logged "UNIMPLEMENTED!" and did nothing, which is
    // why switching to "just the selected reports" could never remove anything.
    this.myMarkerCluster.clearLayers()
    // Trails share the same redraw-from-scratch lifecycle as markers (E-80) - without
    // this they'd pile up on every toggle/new-report exactly the way markers used to.
    this.myTrailsLayer.clearLayers()
  }

  override displayMarkers() {
    super.displayMarkers()


    // REVIEW: wipes out any manually dropped markers. Could save 'em, but no request for that...
    if (!this.displayedFieldReportArray) {
      this.log.error(`displayAllMarkers did not find field reports to display`, this.id)
      return
    }

    // Redraw from scratch. Without this, toggling all/selected or receiving new
    // reports piled fresh markers on top of the old ones - and the line removed
    // just above reassigned displayedFieldReportArray to *all* reports, so the
    // selected-only view could never be honoured no matter what the switch said.
    this.clearMarkers()

    this.log.verbose(`displayMarkers: ${this.displayedFieldReportArray.length} of 'em`, this.id)
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

    this.drawTrails()
    this.lMap.addLayer(this.myTrailsLayer)

    // to refresh markers that have changed:
    // https://github.com/Leaflet/Leaflet.markercluster#refreshing-the-clusters-icon
  }

  /**
   * E-80 phase 1: static per-callsign route trails, coloured by the callsign's current
   * team. Drawn from the same displayedFieldReportArray markers use, so the all/selected
   * switch and new-report redraws are honoured automatically (both call displayMarkers(),
   * which calls this after clearMarkers() has emptied myTrailsLayer).
   *
   * Deliberately no animation, timer, or elapsed-time readout - decided out of scope by
   * the maintainer 2026-08-24. Direction is conveyed without a clock: each trail is drawn
   * as N-1 separate segments with stepped opacity (oldest faintest, newest strongest)
   * rather than a gradient-along-path, which Leaflet has no native support for.
   */
  private drawTrails() {
    const byCallsign = new Map<string, FieldReportType[]>()
    this.displayedFieldReportArray.forEach(r => {
      if (!r.location.lat || !r.location.lng) return // same guard displayMarkers() uses
      const group = byCallsign.get(r.callsign)
      if (group) group.push(r)
      else byCallsign.set(r.callsign, [r])
    })

    byCallsign.forEach((reports, callsign) => {
      if (reports.length < 2) return // nothing to trail for a single check-in

      // Reports aren't guaranteed sorted - the trail is meaningless (and will look
      // plausible while being wrong) if drawn in array order instead of report date.
      const ordered = [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const ranger = this.rangerService.rangers.find(r => r.callsign === callsign)
      const color = teamColorFor(ranger?.team ?? '')
      const segmentCount = ordered.length - 1

      for (let i = 0; i < segmentCount; i++) {
        const opacity = segmentCount === 1 ? 0.9 : 0.25 + (0.65 * i / (segmentCount - 1))
        const segment = L.polyline(
          [
            [ordered[i].location.lat, ordered[i].location.lng],
            [ordered[i + 1].location.lat, ordered[i + 1].location.lng]
          ],
          { color, opacity, weight: 3 }
        )
        this.myTrailsLayer.addLayer(segment)
      }
    })
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
    // TODO: https://github.com/lennardv2/Leaflet.awesome-markers
    const mapIcon = this.getDefaultIcon();
    // const coordinates = latLng([this.mapPoint.latitude, this.mapPoint.longitude]);
    // this.lastLayer = marker(coordinates).setIcon(mapIcon);
    // this.markerClusterGroup.addLayer(this.lastLayer)
  }

  override addMarker(lat: number, lng: number, title: string = '') {
    this.log.excessive(`addMarker at ${lat}. ${lng}, ${title}`, this.id)

    if (!lat || !lng || !this.lMap) {
      console.error(`bad lat: ${lat} or lng: ${lng} or mapLeaflet: ${this.lMap}`)
    } else {
      let _marker = new L.Marker([lat, lng], {
        icon: iconDefault
        // ??: title
      })

      // TODO: Could add tabs on tooltips: https://tomik23.github.io/leaflet-examples/#51.tabs-in-popup
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


  /**
   * from https://tomik23.github.io/leaflet-examples/#49.location-button
   */
  AddLocationButton() {
    /*
    // create custom button
  const customControl = L.Control.extend({
    // button position
    options: {
      position: "topleft",
      className: "locate-button leaflet-bar",
      html: '<svg viewBox="0 0 24 24" xmlns="https://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>',
      style:
        "margin-top: 0; left: 0; display: flex; cursor: pointer; justify-content: center; font-size: 2rem;",
    },

    // method
    onAdd: function (map) {
      this._map = map;
      const button = L.DomUtil.create("div");
      L.DomEvent.disableClickPropagation(button);

      button.title = "locate";
      button.innerHTML = this.options.html;
      button.className = this.options.className;
      button.setAttribute("style", this.options.style);

      L.DomEvent.on(button, "click", this._clicked, this);

      return button;
    },
    _clicked: function (e) {
      L.DomEvent.stopPropagation(e);

      // this.removeLocate();

      this._checkLocate();

      return;
    },
    _checkLocate: function () {
      return this._locateMap();
    },

    _locateMap: function () {
      const locateActive = document.querySelector(".locate-button");
      const locate = locateActive.classList.contains("locate-active");
      // add/remove class from locate button
      locateActive.classList[locate ? "remove" : "add"]("locate-active");

      // remove class from button
      // and stop watching location
      if (locate) {
        this.removeLocate();
        this._map.stopLocate();
        return;
      }

      // location on found
      this._map.on("locationfound", this.onLocationFound, this);
      // locataion on error
      this._map.on("locationerror", this.onLocationError, this);

      // start locate
      this._map.locate({ setView: true, enableHighAccuracy: true });
    },
    onLocationFound: function (e) {
      // add circle
      this.addCircle(e).addTo(this.featureGroup()).addTo(map);

      // add marker
      this.addMarker(e).addTo(this.featureGroup()).addTo(map);

      // add legend
    },
    // on location error
    onLocationError: function (e) {
      this.addLegend("Location access denied.");
    },
    // feature group
    featureGroup: function () {
      return new L.FeatureGroup();
    },
    // add legend
    addLegend: function (text) {
      const checkIfDescriotnExist = document.querySelector(".description");

      if (checkIfDescriotnExist) {
        checkIfDescriotnExist.textContent = text;
        return;
      }

      const legend = L.control({ position: "bottomleft" });

      legend.onAdd = function () {
        let div = L.DomUtil.create("div", "description");
        L.DomEvent.disableClickPropagation(div);
        const textInfo = text;
        div.insertAdjacentHTML("beforeend", textInfo);
        return div;
      };
      legend.addTo(this._map);
    },
    addCircle: function ({ accuracy, latitude, longitude }) {
      return L.circle([latitude, longitude], accuracy / 2, {
        className: "circle-test",
        weight: 2,
        stroke: false,
        fillColor: "#136aec",
        fillOpacity: 0.15,
      });
    },
    addMarker: function ({ latitude, longitude }) {
      return L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: "located-animation",
          iconSize: L.point(17, 17),
          popupAnchor: [0, -15],
        }),
      }).bindPopup("Your are here :)");
    },
    removeLocate: function () {
      this._map.eachLayer(function (layer) {
        if (layer instanceof L.Marker) {
          const { icon } = layer.options;
          if (icon?.options.className === "located-animation") {
            map.removeLayer(layer);
          }
        }
        if (layer instanceof L.Circle) {
          if (layer.options.className === "circle-test") {
            map.removeLayer(layer);
          }
        }
      });
    },
  });

  // adding new button to map controll
  map.addControl(new customControl());
  */
  }

  /**
   * E-64/E-70 blocker: this class declared `implements OnDestroy` but never defined one,
   * so it inherited AbstractMap.ngOnDestroy() (unsubscribes only) and never called
   * `.remove()` on either Leaflet instance. Invisible on a route change - the DOM node
   * goes away and nobody notices the map, its tile layer, its markercluster group, its
   * zoomend/moveend listeners, and leaflet.offline's handles are all still alive and
   * detached. E-64's engine switch turns that latent leak into a real one: a user
   * repeatedly flipping the "try the other map" toggle constructs a fresh Leaflet
   * instance on every flip back and abandons the previous one. The old "removing ALSO
   * destroys the div id reference" worry above (refreshMap()) does not apply here: with
   * @if, Angular destroys and recreates the container element along with the component,
   * so the container is fresh every time by construction.
   *
   * Also clears ngAfterViewInit's deferred invalidateSize() timer: with .remove() now
   * actually running, a component destroyed before that timer fires (confirmed live by
   * this fix's own unit test, which destroys immediately after detectChanges()) would
   * otherwise call invalidateSize() on an already-removed map and throw - previously
   * harmless only because the map was never really removed.
   */
  override ngOnDestroy(): void {
    super.ngOnDestroy()
    clearTimeout(this.afterViewInitTimer)
    if (this.refreshSavedAreaInfo) {
      this.offlineTileLayer?.off('saveend', this.refreshSavedAreaInfo)
      this.offlineTileLayer?.off('tilesremoved', this.refreshSavedAreaInfo)
    }
    if (this.refreshEstimatedAreaInfo) {
      this.lMap?.off('moveend zoomend', this.refreshEstimatedAreaInfo)
    }
    this.lMap?.remove()
    this.overviewMapLeaflet?.remove()
  }
}
