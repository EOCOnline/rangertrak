import { addProtocol, type StyleSpecification } from 'maplibre-gl'
import { Protocol } from 'pmtiles'

// The v1 offline basemap: a single bundled PMTiles extract, used identically whether
// online or offline (a normal static asset, precached by the existing /assets/**
// service-worker group). Panning outside this region shows blank background - only the
// Vashon Island pilot area is bundled today. See PRIVATE-Roadmap.md "Future map features" for
// the planned low-res world background + region-download manager.
export const DEFAULT_PMTILES_URL = '/assets/maps/vashon.pmtiles'

let protocolRegistered = false

/**
 * Registers MapLibre's `pmtiles://` protocol handler. Idempotent - safe to call from
 * multiple component constructors, only wires up the handler once.
 */
export function registerPmtilesProtocol(): void {
  if (protocolRegistered) {
    return
  }
  const protocol = new Protocol()
  addProtocol('pmtiles', protocol.tile)
  protocolRegistered = true
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
