import { Injectable } from '@angular/core'

import * as packageJson from '../../../../package.json'
import {
  FieldReportsType, FieldReportService, LogService, RangerService, RangerType, SettingsService,
  SettingsType
} from './'
import { migrateSettings } from './settings-migration'

/**
 * A full mission backup: everything needed to restore the app to its
 * current state on another device/browser, or after clearing storage.
 * `fieldReports.bounds` is intentionally omitted - it's derived data
 * (recalculated by FieldReportService.recalcFieldBounds() on every load),
 * not source-of-truth data, so there is nothing to usefully export there.
 */
export type MissionExport = {
  schemaVersion: number,
  exportedAt: string,
  appVersion: string,
  settings: SettingsType,
  rangers: RangerType[],
  fieldReports: Omit<FieldReportsType, 'bounds'>,
}

export const MISSION_EXPORT_SCHEMA_VERSION = 1

/**
 * Exports/imports a full mission (settings + rangers + field reports) as a
 * single JSON file, so a mission survives clearing browser storage and can
 * move between devices/browsers. PRIVATE-Roadmap.md Section 8/R3.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {

  private id = 'Backup Service'

  constructor(
    private settingsService: SettingsService,
    private rangerService: RangerService,
    private fieldReportService: FieldReportService,
    private log: LogService,
  ) { }

  /**
   * Pure data assembly, no DOM/file access - kept separate from
   * exportMission() so the actual export contents are easy to test.
   */
  buildExportPayload(): MissionExport {
    const currentFieldReports = this.fieldReportService.getCurrentFieldReports()
    const { bounds: _omitted, ...fieldReportsSansBounds } = currentFieldReports

    // REVIEW: Workaround for "Error: Should not import the named export ... from
    // default-exporting module" - same pattern already used in settings.service.ts.
    const appVersion = JSON.parse(JSON.stringify(packageJson)).version

    return {
      schemaVersion: MISSION_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion,
      settings: this.settingsService.settings,
      rangers: this.rangerService.rangers,
      fieldReports: fieldReportsSansBounds,
    }
  }

  /**
   * Triggers a browser download of the current mission as a JSON file.
   */
  exportMission(): void {
    const payload = this.buildExportPayload()
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const missionLabel = (payload.settings.mission || 'mission').replace(/[^a-z0-9_-]+/gi, '_')
    const filename = `rangertrak-${missionLabel}-${payload.exportedAt.slice(0, 10)}.json`

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    this.log.info(`Exported mission to ${filename}`, this.id)
  }

  /**
   * Validates and applies a MissionExport, replacing current settings,
   * rangers, and field reports. Throws on structurally invalid input rather
   * than silently partially-applying a corrupt import.
   */
  importMission(payload: MissionExport): void {
    this.validatePayload(payload)

    // Settings first: FieldReportService.recalcFieldBounds() (called inside
    // replaceAllFieldReports()) requires settings to already be current, and
    // the settings->FieldReportService subscription is synchronous (both are
    // signal+ReplaySubject-backed - see settings.service.ts), so this
    // ordering is safe.
    // Migrated, not applied raw: an export can be arbitrarily old (this is the restore-after-
    // disaster path, and a mission file may sit on a thumb drive for months), and this call
    // bypasses settings.service.ts's load path entirely - so without this the import would
    // reinstate a pre-migration shape over freshly-migrated settings. See settings-migration.ts.
    this.settingsService.updateSettings(migrateSettings(payload.settings, this.settingsService.initSettings()))
    this.rangerService.replaceAllRangers(payload.rangers)
    this.fieldReportService.replaceAllFieldReports(payload.fieldReports)

    this.log.warn(`Imported mission from export dated ${payload.exportedAt} (schema v${payload.schemaVersion}, app v${payload.appVersion})`, this.id)
  }

  /**
   * Reads a File (from an <input type="file"> change event) and parses it
   * as a MissionExport. Rejects on invalid JSON or an invalid shape.
   */
  readFileAsMissionExport(file: File): Promise<MissionExport> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string)
          this.validatePayload(parsed)
          resolve(parsed)
        } catch (error: any) {
          this.log.error(`Failed to parse mission import file: ${error.message}`, this.id)
          reject(error)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  private validatePayload(payload: any): asserts payload is MissionExport {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Import file is not a valid mission export (not an object).')
    }
    for (const key of ['schemaVersion', 'settings', 'rangers', 'fieldReports']) {
      if (!(key in payload)) {
        throw new Error(`Import file is not a valid mission export (missing "${key}").`)
      }
    }
    if (!Array.isArray(payload.rangers)) {
      throw new Error('Import file is not a valid mission export ("rangers" is not an array).')
    }
    if (!Array.isArray(payload.fieldReports?.fieldReportArray)) {
      throw new Error('Import file is not a valid mission export ("fieldReports.fieldReportArray" is not an array).')
    }
  }
}
