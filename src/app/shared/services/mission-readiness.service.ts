import { Injectable, computed, signal } from '@angular/core'

import { DEFAULT_PMTILES_URL } from '../mapping/pmtiles-config'
import { LogService, RangerService, SettingsService, StoragePersistenceService } from './'

export type ReadinessLevel = 'red' | 'amber' | 'green'

/**
 * ADR D-32: a persistent readiness indicator reporting whether *this device* is actually
 * prepared for an unattended, offline mission - not whether the app is technically usable.
 * All six signals were already measurable with nothing new to persist; this is the service
 * that surfaces them. Never reads as "you cannot work" - a scribe can always log a report
 * regardless of state.
 *
 * Two signals are synchronous (mission named, roster loaded - both driven off subscriptions
 * this service already holds). Three are async (offline map tiles saved, the bundled
 * MapLibre asset warmed, storage-eviction protection granted) and only refreshed on
 * `refresh()` - called by MissionReadinessComponent's ngOnInit, which runs fresh on every
 * page since HeaderComponent (and therefore this component) is instantiated per page by
 * PageComponent.
 *
 * **Level formula (a judgment call, not specified elsewhere - documented here so it can be
 * revisited deliberately rather than rediscovered by reading the code):**
 * - **red** - mission not named, or roster still the untouched hardcoded sample. Nothing
 *   resembling real setup has happened yet.
 * - **amber** - basic setup is done (mission + real roster) but a resilience gap remains:
 *   the operating period has expired, or any of the three offline-prep signals is missing.
 *   The app works fine online; a real network loss would expose the gap.
 * - **green** - all six signals pass. Prepared for the worst case (total network loss).
 */
@Injectable({ providedIn: 'root' })
export class MissionReadinessService {
  private id = 'Mission Readiness Service'

  readonly missionNamed = signal(false)
  readonly opPeriodCurrent = signal(false)
  readonly rosterLoaded = signal(false)
  readonly offlineTilesSaved = signal(false)
  readonly bundledMapWarmed = signal(false)
  readonly storagePersisted = signal(false)

  readonly level = computed<ReadinessLevel>(() => {
    if (!this.missionNamed() || !this.rosterLoaded()) {
      return 'red'
    }
    if (
      !this.opPeriodCurrent() ||
      !this.offlineTilesSaved() ||
      !this.bundledMapWarmed() ||
      !this.storagePersisted()
    ) {
      return 'amber'
    }
    return 'green'
  })

  constructor(
    private settingsService: SettingsService,
    private rangerService: RangerService,
    private storagePersistenceService: StoragePersistenceService,
    private log: LogService,
  ) {
    this.settingsService.getSettingsObserver().subscribe({
      next: settings => {
        this.missionNamed.set(settings.mission.trim() !== '')
        this.opPeriodCurrent.set(new Date(settings.opPeriodEnd).getTime() > Date.now())
      },
      error: e => this.log.error(`Settings subscription error: ${e}`, this.id),
    })

    this.rangerService.getRangersObserver().subscribe({
      next: rangers => this.rosterLoaded.set(RangerService.isRealRosterLoaded(rangers)),
      error: e => this.log.error(`Rangers subscription error: ${e}`, this.id),
    })
  }

  /** Re-checks the three async signals. Safe to call repeatedly; each check is read-only. */
  async refresh(): Promise<void> {
    this.storagePersisted.set(this.storagePersistenceService.persisted() === true)

    try {
      // Dynamic, not static: leaflet.offline pulls in Leaflet itself, and this service is
      // root-provided and rendered on every page (including the eager Entry page) via
      // HeaderComponent - a static import here measurably grew the INITIAL bundle (~160KB
      // raw, caught by comparing `npm run build` output before/after). Same fix as E-64
      // used for MapLibre: keep it out of the eager graph, fetch only when actually needed.
      const { getStorageLength } = await import('leaflet.offline')
      const tileCount = await getStorageLength()
      this.offlineTilesSaved.set(tileCount > 0)
    } catch (e) {
      this.log.warn(`getStorageLength() failed: ${e}`, this.id)
      this.offlineTilesSaved.set(false)
    }

    try {
      const match = await caches.match(DEFAULT_PMTILES_URL)
      this.bundledMapWarmed.set(!!match)
    } catch (e) {
      this.log.warn(`caches.match() failed: ${e}`, this.id)
      this.bundledMapWarmed.set(false)
    }
  }
}
