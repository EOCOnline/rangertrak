import { addProtocol, setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import { Protocol } from 'pmtiles'

// The v1 offline basemap: a single bundled PMTiles extract, used identically whether
// online or offline (a normal static asset, precached by the existing /assets/**
// service-worker group). Panning outside this region shows blank background - only the
// Vashon Island pilot area is bundled today. See PRIVATE-Roadmap.md "Future map features" for
// the planned low-res world background + region-download manager.
export const DEFAULT_PMTILES_URL = '/assets/maps/vashon.pmtiles'

/**
 * Where the MapLibre worker bundle is served from. maplibre-gl v6 splits its worker into
 * a separate ES module (plus a large shared chunk it imports by relative path), rather
 * than inlining it as v5 and earlier did.
 *
 * By default v6 derives the worker URL from its own module URL, which after Angular's
 * esbuild bundling resolves to `/maplibre-gl-worker.mjs` at the site root - a file no
 * build step ever emits. The request then hit the dev-preview server's SPA fallback and
 * came back as index.html with `Content-Type: text/html`, so the worker was constructed
 * from HTML and died on the spot.
 *
 * That failure is completely silent: MapLibre fires no error event, the map still paints
 * background layers on the main thread, and the map simply shows blank forever - because
 * both vector tiles AND GeoJSON sources are parsed in the worker. Pointing MapLibre at a
 * copy we actually ship (see angular.json's assets entry, which copies the worker and its
 * shared chunk side by side so the worker's relative import resolves) is the fix.
 */
const MAPLIBRE_WORKER_URL = 'assets/maplibre/maplibre-gl-worker.mjs'

let maplibreInitialized = false

/**
 * One-time global MapLibre setup: points it at the worker bundle we ship, and registers
 * the `pmtiles://` protocol handler. Idempotent - safe to call from every map
 * component's constructor, which is exactly how it is used.
 */
export function registerPmtilesProtocol(): void {
  if (maplibreInitialized) {
    return
  }
  setWorkerUrl(MAPLIBRE_WORKER_URL)
  const protocol = new Protocol()
  addProtocol('pmtiles', protocol.tile)
  maplibreInitialized = true
}

/**
 * Builds a MapLibre style pointed at the bundled PMTiles basemap. No text-label glyphs
 * in v1 (see PRIVATE-Roadmap.md) - water/roads/buildings/landuse render with color/shape
 * distinction only.
 */
export function buildPmtilesStyle(pmtilesUrl: string = DEFAULT_PMTILES_URL): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'vector',
        url: 'pmtiles://' + pmtilesUrl,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#e0e0e0' } },
      { id: 'water', type: 'fill', source: 'basemap', 'source-layer': 'water', paint: { 'fill-color': '#8ec6ec' } },
      { id: 'landuse', type: 'fill', source: 'basemap', 'source-layer': 'landuse', paint: { 'fill-color': '#c8e6c0' } },
      { id: 'roads', type: 'line', source: 'basemap', 'source-layer': 'roads', paint: { 'line-color': '#888', 'line-width': 1 } },
      { id: 'buildings', type: 'fill', source: 'basemap', 'source-layer': 'buildings', paint: { 'fill-color': '#c0a080' } }
    ]
  }
}
