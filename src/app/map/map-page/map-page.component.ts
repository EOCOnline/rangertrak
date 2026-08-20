import { NgComponentOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, Type, signal } from '@angular/core'

import { LmapComponent } from '../../lmap/lmap.component'
import { PageComponent } from '../../shared/page/page.component'
import { MapEngineService } from '../map-engine.service'

/**
 * E-64: a thin shell owning route `/map`. It owns ONLY the page wrapper, the engine
 * switch, and mounting exactly one engine at a time - everything else (each engine's own
 * coordinate/zoom readout, overview map, Instructions, All/Selected checkbox) stays inside
 * LmapComponent/MapComponent, per the maintainer's explicit "should not be merged without
 * reason." No shared base class, no changes to either engine's internals.
 *
 * Leaflet is imported eagerly here (it's the hardcoded default - no auto-detection, that
 * mechanism is deferred pending real usage). MapLibre is `await import()`ed only when the
 * switch is actually flipped, so a visitor who never touches it never downloads its ~966KB
 * chunk - this is the entire reason a route-level shell exists rather than statically
 * importing both engines into one component.
 */
@Component({
  selector: 'rangertrak-map-page',
  standalone: true,
  imports: [PageComponent, LmapComponent, NgComponentOutlet],
  templateUrl: './map-page.component.html',
  styleUrls: ['./map-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MapPageComponent {
  // D-31: "the primary takes the plain name" - now the only nav item, so no scribe-facing
  // reason to distinguish it from either engine by name.
  title = 'Map'
  pageDescr = 'Leaflet is shown by default. Use the switch below to try the MapLibre + PMTiles backup engine.'

  // MapLibre's component class, once dynamically imported. null until the switch is first
  // flipped to 'maplibre' - stays cached afterward so flipping back and forth doesn't
  // re-fetch the module (the browser's own module cache would dedupe this anyway, but
  // avoiding a repeat dynamic import() call keeps the toggle handler simple either way).
  maplibreComponentType = signal<Type<unknown> | null>(null)

  constructor(private engineService: MapEngineService) { }

  get engine() {
    return this.engineService.engine
  }

  async onEngineSwitchChanged(event: Event): Promise<void> {
    const useMaplibre = (event.target as HTMLInputElement).checked

    if (useMaplibre && !this.maplibreComponentType()) {
      const { MapComponent } = await import('../map.component')
      this.maplibreComponentType.set(MapComponent)
    }

    this.engineService.setEngine(useMaplibre ? 'maplibre' : 'leaflet')
  }
}
