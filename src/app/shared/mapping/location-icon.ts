import * as L from 'leaflet'

/**
 * Marker icons for the Locations feature (ADR D-49) - Command Post, Staging Area, Ranger
 * First Aid, and whatever else a mission adds. Deliberately hand-drawn inline SVG, not an
 * icon font/library: the same choice `ranger-icon.ts` already made for ranger/evidence
 * markers, kept consistent here rather than introducing a second way to draw a map marker.
 *
 * Shapes are loosely modelled on real NWCG (National Wildfire Coordinating Group) incident
 * symbology - a public-domain federal standard reviewed against a real IMT ops-map legend
 * (see the roadmap's "Icon-based map annotation/editing" backlog row) - not invented from
 * scratch: a flag for a command post, an "S" panel for staging, a cross for an aid station.
 * A future pass adopting the full NWCG set wholesale can replace these without changing this
 * function's signature or call sites.
 */

const SHAPES: Record<string, (color: string) => string> = {
  'Command Post': color => `
    <line x1="5" y1="24" x2="5" y2="2" stroke="${color}" stroke-width="2.5"/>
    <polygon points="5,2 22,6 5,11" fill="${color}"/>`,
  'Staging Area': color => `
    <rect x="1" y="1" width="22" height="22" rx="3" fill="${color}"/>
    <text x="12" y="17" text-anchor="middle" font-size="14" font-weight="700" font-family="sans-serif" fill="white">S</text>`,
  'Ranger First Aid': color => `
    <rect x="1" y="1" width="22" height="22" rx="3" fill="${color}"/>
    <rect x="10" y="5" width="4" height="14" fill="white"/>
    <rect x="5" y="10" width="14" height="4" fill="white"/>`,
}

/** Generic pin, used for "Other" and any category with no dedicated shape above. */
const GENERIC_PIN = (color: string) => `
  <path d="M12 1c-5 0-9 3.8-9 8.5C3 16 12 23 12 23s9-7 9-13.5C21 4.8 17 1 12 1z" fill="${color}" stroke="white" stroke-width="1"/>
  <circle cx="12" cy="9.5" r="3" fill="white"/>`

/**
 * The raw `<svg>` markup for a location category name + its configured colour
 * (`MissionType.locationTypes`). Falls back to a generic pin for a category with no dedicated
 * shape (including the built-in "Other") - a location always draws as SOMETHING recognisable,
 * never blank, even for a category name the app has never seen before.
 *
 * Engine-agnostic on purpose (no Leaflet import, unlike this file's own `locationIconFor()`
 * below): MapLibreComponent builds a `maplibregl.Marker` DOM element from this same string
 * rather than a `L.DivIcon`, so both map engines draw an identical marker from one definition.
 */
export function locationMarkerSvg(type: string, color: string): string {
  const draw = SHAPES[type] ?? GENERIC_PIN
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="white" stroke-width="1" stroke-linejoin="round">${draw(color)}</svg>`
}

/**
 * A distinct Leaflet icon for a given location category name + its configured colour. See
 * `locationMarkerSvg()` for the shared drawing logic and MapLibre's own equivalent.
 */
export function locationIconFor(type: string, color: string): L.DivIcon {
  return L.divIcon({
    className: 'rt-location-marker',
    html: locationMarkerSvg(type, color),
    iconSize: [24, 24],
    iconAnchor: [12, 22],
    popupAnchor: [0, -20],
  })
}
