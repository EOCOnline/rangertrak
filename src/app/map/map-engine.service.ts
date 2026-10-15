import { Injectable, signal } from '@angular/core'

import type { PlaceBounds } from '../domain/places-file'

export type MapEngine = 'leaflet' | 'maplibre'

/**
 * Holds the user's choice between the two map engines for the current session only - never
 * persisted to storage (E-64 decision: a full reload always returns to the Leaflet default,
 * which is what keeps this pass schema-free - no MissionType field, no migration). A
 * root-provided singleton rather than component state so the choice survives navigating
 * away from /map and back, mirroring Entry's existing "Show all coordinate systems (this
 * session only)" pattern (Sprint H).
 */
@Injectable({ providedIn: 'root' })
export class MapEngineService {
  readonly engine = signal<MapEngine>('leaflet')

  /**
   * What the Leaflet map is showing right now, or null when it is not mounted (MapLibre, or
   * another page). The Map page's Export places card reads it for "Only places in the current
   * map view" (E-187 phase B; offered on Leaflet only, D-56). Written by the Leaflet component on
   * every move, and cleared when it goes away.
   */
  readonly viewBounds = signal<PlaceBounds | null>(null)

  setEngine(engine: MapEngine): void {
    this.engine.set(engine)
  }
}
