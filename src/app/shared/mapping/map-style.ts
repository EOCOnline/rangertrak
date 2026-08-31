import { addProtocol, setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import { FileSource, PMTiles, Protocol } from 'pmtiles'

import { DEFAULT_PMTILES_URL } from './pmtiles-config'

export { DEFAULT_PMTILES_URL }

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
// Module-scoped, not local to registerPmtilesProtocol() below: registerCustomPmtilesSource()
// needs to add() to the SAME Protocol instance MapLibre was pointed at, not a second one -
// two Protocol instances would each keep their own `tiles` map, and only the one actually
// wired via addProtocol() ever gets asked to resolve a `pmtiles://` URL.
let pmtilesProtocol: Protocol | undefined

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
  pmtilesProtocol = new Protocol()
  addProtocol('pmtiles', pmtilesProtocol.tile)
  maplibreInitialized = true
}

/**
 * Registers a scribe-supplied `.pmtiles` File as a usable `pmtiles://` source, for
 * CustomPmtilesService (shared/services/custom-pmtiles.service.ts) - the "let a scribe
 * supply their own .pmtiles file" half of the offline-coverage backlog item, since PMTiles'
 * one-archive-per-region shape has no per-tile "save what I'm looking at" equivalent to
 * Leaflet's `leaflet.offline`.
 *
 * `pmtiles-js`'s `FileSource` reads directly from the browser `File` object via
 * `file.slice()` - no fetch, no service worker, no network involved at all, which is exactly
 * what makes this buildable without any of the bundled-tileset's own coverage/regeneration
 * problems. `Protocol.add()` keys the registration on `source.getKey()`, which for a
 * `FileSource` is the file's own `name` - callers pass that same name back into
 * `buildPmtilesStyle()` as its `pmtilesUrl` argument so `pmtiles://<name>` resolves here
 * instead of attempting an HTTP fetch.
 *
 * Must be called after `registerPmtilesProtocol()` has run at least once (any map
 * component's constructor already guarantees this before building a style).
 */
export function registerCustomPmtilesSource(file: File): string {
  if (!pmtilesProtocol) {
    registerPmtilesProtocol()
  }
  pmtilesProtocol!.add(new PMTiles(new FileSource(file)))
  return file.name
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
