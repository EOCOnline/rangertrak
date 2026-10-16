import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { LayerKind, LayerRecord, layersOfKind, liveCount } from '../../domain/layers'
import { LogService } from '../services/log.service'
import { MissionLocationService } from '../services/mission-location.service'
import { RangerService } from '../services/ranger.service'
import { LayerService } from '../services/layer.service'

/**
 * "Layers on this device" (E-187 phase C, ADR D-58 point 7): the lists this device remembers
 * importing, in the "Import, export & print" panel on Rangers (people) and Map (places). Each
 * can be removed - which takes out what that layer brought in and keeps anything another layer
 * also holds. Records added by hand are in no layer, so they are never touched.
 *
 * Not tracked: edits made on this device after the import. A person or place the layer brought
 * in is removed even if it was edited since; the confirm says so.
 */
@Component({
  selector: 'rangertrak-layers-card',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './layers-card.component.html',
  styleUrls: ['./layers-card.component.scss'],
})
export class LayersCardComponent {
  readonly kind = input.required<LayerKind>()

  private readonly id = 'Layers card'
  private readonly layerService = inject(LayerService)
  private readonly rangerService = inject(RangerService)
  private readonly locationService = inject(MissionLocationService)
  private readonly log = inject(LogService)

  /** The uids now on the device for this kind, so counts reflect hand deletions too. */
  private readonly peopleUids = signal<ReadonlySet<string>>(new Set())
  private readonly placeUids = signal<ReadonlySet<string>>(new Set())
  private readonly liveUids = computed(() => this.kind() === 'people' ? this.peopleUids() : this.placeUids())

  readonly layers = computed(() => layersOfKind(this.layerService.layers(), this.kind()))

  constructor() {
    this.rangerService.getRangersObserver().pipe(takeUntilDestroyed())
      .subscribe(list => this.peopleUids.set(uidSet(list)))
    this.locationService.getLocationsObserver().pipe(takeUntilDestroyed())
      .subscribe(list => this.placeUids.set(uidSet(list)))
  }

  noun(count: number): string {
    return this.kind() === 'people' ? (count === 1 ? 'person' : 'people') : (count === 1 ? 'place' : 'places')
  }

  count(layer: LayerRecord): number {
    return liveCount(layer, this.liveUids())
  }

  importedOn(layer: LayerRecord): string {
    return layer.importedAt ? layer.importedAt.slice(0, 10) : 'unknown'
  }

  remove(layer: LayerRecord): void {
    const kind = this.kind()
    const live = this.liveUids()
    const removal = this.layerService.removalFor(layer.name, kind)
    const toRemove = removal.remove.filter(u => live.has(u))
    const shared = removal.keptShared.filter(u => live.has(u)).length
    const noun = this.noun(toRemove.length)
    const message = `Remove the layer "${layer.name}"?\n\n`
      + `This removes ${toRemove.length} ${noun} that only this layer brought in.`
      + (shared ? ` ${shared} also in another layer stay.` : '')
      + `\n\nAnything added by hand stays, and so does anything from another layer. `
      + `Changes made on this device since the import are not tracked: a ${kind === 'people' ? 'person' : 'place'} `
      + `this layer brought in is removed even if you edited it.`
      + (kind === 'people' ? `\n\nRadio log entries that name them are not changed: they keep the call sign as it was written.` : '')
    if (!confirm(message)) return

    if (toRemove.length) {
      const gone = new Set(toRemove)
      if (kind === 'people') {
        this.rangerService.replaceAllRangers(this.rangerService.rangers.filter(r => !r.uid || !gone.has(r.uid)))
      } else {
        this.locationService.replaceAllLocations(
          this.locationService.getCurrentLocations().filter(l => !l.uid || !gone.has(l.uid)))
      }
    }
    this.layerService.forget(layer.name, kind)
    this.log.warn(`Removed layer "${layer.name}" (${kind}): ${toRemove.length} removed, ${shared} kept because another layer holds them.`, this.id)
  }
}

function uidSet(list: readonly { uid?: string }[]): ReadonlySet<string> {
  return new Set(list.map(r => r.uid).filter((u): u is string => !!u))
}
