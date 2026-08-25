import * as L from 'leaflet'

import { hashString } from './hash-color'

/**
 * E-86 (narrowed 2026-08-24: "ignore the team concept for now, just make ranger markers
 * unique"): every ranger gets a distinct marker - shape AND colour, both derived purely
 * from their callsign - so the same ranger looks identical everywhere (main map, Entry
 * mini-map) and across sessions/devices, with no stored state and no roster lookup
 * needed at draw time. Team is deliberately not a factor here; see E-80's teamColorFor()
 * in mapLeaflet.component.ts for the separate, team-keyed colour used by route trails.
 */

// Plain shape outlines, stroked white so they stay legible over any tile colour
// (satellite, OpenTopoMap's greens/browns, etc.) - filled colour is what varies per ranger.
const MARKER_SHAPES: ((fill: string) => string)[] = [
  fill => `<circle cx="10" cy="10" r="8" fill="${fill}"/>`,
  fill => `<rect x="2" y="2" width="16" height="16" fill="${fill}"/>`,
  fill => `<polygon points="10,1 19,18 1,18" fill="${fill}"/>`,
  fill => `<polygon points="10,1 19,10 10,19 1,10" fill="${fill}"/>`,
  fill => `<polygon points="10,1 12.7,7.2 19.5,7.6 14.2,11.9 16.2,18.5 10,14.8 3.8,18.5 5.8,11.9 0.5,7.6 7.3,7.2" fill="${fill}"/>`,
]

/**
 * A deterministic, distinct Leaflet icon for a given ranger callsign - same callsign
 * always yields the same shape+colour, no lookup or stored assignment required. Shape and
 * colour are derived from independent bit ranges of one hash, so the two don't visibly
 * correlate (two rangers sharing a colour won't reliably also share a shape).
 */
export function rangerIconFor(callsign: string): L.DivIcon {
  const hash = hashString(callsign || 'Unknown')
  const color = `hsl(${hash % 360}, 65%, 42%)`
  const shape = MARKER_SHAPES[Math.floor(hash / 360) % MARKER_SHAPES.length](color)
  return L.divIcon({
    className: 'rt-ranger-marker',
    html: `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" stroke="white" stroke-width="1" stroke-linejoin="round">${shape}</svg>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  })
}
