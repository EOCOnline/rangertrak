import { Injectable, signal } from '@angular/core'

export type MapEngine = 'leaflet' | 'maplibre'

/**
 * Holds the user's choice between the two map engines for the current session only - never
 * persisted to storage (E-64 decision: a full reload always returns to the Leaflet default,
 * which is what keeps this pass schema-free - no SettingsType field, no migration). A
 * root-provided singleton rather than component state so the choice survives navigating
 * away from /map and back, mirroring Entry's existing "Show all coordinate systems (this
 * session only)" pattern (Sprint H).
 */
@Injectable({ providedIn: 'root' })
export class MapEngineService {
  readonly engine = signal<MapEngine>('leaflet')

  setEngine(engine: MapEngine): void {
    this.engine.set(engine)
  }
}
