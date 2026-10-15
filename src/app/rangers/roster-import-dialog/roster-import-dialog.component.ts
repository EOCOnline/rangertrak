import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

import { MATERIAL_IMPORTS } from '../../material-imports'
import { mergeRangers, RangerMergeResult } from '../../domain/ranger-migration'
import {
  applyMapping, ColumnMapping, exitedStatusLabel, ColumnTarget, guessMapping, headerSetKey, idColumnLabel, recallMapping,
} from '../../domain/roster-sheet'
import { SheetFile } from '../../shared/import/sheet-reader'
import { RangerService, RangerType } from '../../shared/services'
import { DevicePrefsService } from '../../shared/services/device-prefs.service'

/** What the Rangers page hands the dialog. */
export type RosterImportDialogData = {
  fileName: string
  /** The mission's name for the ID column ("REW #"), used when guessing the mapping. */
  idFieldLabel: string
  /** The roster now on the device: the preview is a merge into this, never saved here. */
  existing: RangerType[]
  /** People already read from a RangerTrak file (.json / Setup file): no mapping step. */
  incoming?: RangerType[]
  /** A spreadsheet to map. */
  sheet?: SheetFile
  /** Extra lines for the preview (e.g. what else a Setup file carries). */
  notes?: string[]
}

/** What the dialog hands back. Nothing has been saved yet. */
export type RosterImportDialogResult = {
  action: 'add' | 'replace'
  incoming: RangerType[]
  merge: RangerMergeResult
}

type Step = 'map' | 'preview'

/** The order the pick-list offers the targets in. */
const TARGET_CHOICES: ColumnTarget[] = [
  'id', 'callsign', 'fullName', 'firstName', 'lastName', 'phone', 'homePhone', 'team', 'role', 'note', 'uid',
  'ignore', 'ignoreNotStored',
]

/**
 * Import a list (E-187, ADR D-58): map the columns of a spreadsheet, preview what the import
 * would do, then Add to the roster (the default) or Replace it.
 *
 * The preview IS `mergeRangers()` run against the current roster and thrown away - not a second
 * merge - so what is shown is exactly what Add will do. Nothing is saved here; the Rangers page
 * applies the result.
 */
@Component({
  selector: 'rangertrak-roster-import-dialog',
  standalone: true,
  imports: [...MATERIAL_IMPORTS],
  templateUrl: './roster-import-dialog.component.html',
  styleUrls: ['./roster-import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class RosterImportDialogComponent {
  readonly data = inject<RosterImportDialogData>(MAT_DIALOG_DATA)
  private ref = inject<MatDialogRef<RosterImportDialogComponent, RosterImportDialogResult>>(MatDialogRef)
  private rangerService = inject(RangerService)
  private prefs = inject(DevicePrefsService)

  readonly isSheet = !!this.data.sheet
  readonly sheets = this.data.sheet?.sheets ?? []
  readonly choices = TARGET_CHOICES

  step = signal<Step>(this.isSheet ? 'map' : 'preview')
  sheetName = signal(this.data.sheet?.defaultSheet ?? '')
  rows = signal<string[][]>([])
  targets = signal<ColumnTarget[]>([])
  statusColumn = signal<number | null>(null)
  /** The statuses the skip option names, from the same list the matching uses. */
  readonly exitedLabel = exitedStatusLabel()
  skipExited = signal(false)
  /** The headings were all understood (or remembered). */
  confident = signal(false)
  remembered = signal(false)

  headers = computed(() => this.rows()[0] ?? [])

  /** True when at least one column identifies a person. */
  canContinue = computed(() => this.targets().some(t =>
    ['id', 'callsign', 'fullName', 'firstName', 'lastName'].includes(t)))

  incoming = signal<RangerType[]>(this.data.incoming ?? [])
  merge = signal<RangerMergeResult | null>(null)
  skipped = signal(0)
  warnings = signal<string[]>([])

  updatedShown = computed(() => (this.merge()?.overwritten ?? []).slice(0, 10))
  updatedHidden = computed(() => Math.max(0, (this.merge()?.overwritten.length ?? 0) - 10))

  notStoredHeaders = computed(() => this.headers().filter((h, i) => this.targets()[i] === 'ignoreNotStored' && h.trim()))
  ignoredHeaders = computed(() => this.headers().filter((h, i) => this.targets()[i] === 'ignore' && h.trim()))

  constructor() {
    if (this.isSheet) {
      this.loadSheet(this.sheetName())
    } else {
      this.buildPreview()
    }
  }

  idLabel(): string {
    return idColumnLabel(this.data.idFieldLabel)
  }

  targetLabel(t: ColumnTarget): string {
    switch (t) {
      case 'id': return this.idLabel()
      case 'callsign': return 'Call sign'
      case 'fullName': return 'Full name'
      case 'firstName': return 'First name'
      case 'lastName': return 'Last name'
      case 'phone': return 'Phone'
      case 'homePhone': return 'Home phone'
      case 'team': return 'Team'
      case 'role': return 'Role'
      case 'note': return 'Notes'
      case 'uid': return 'RangerTrak uid'
      case 'ignore': return 'Ignore'
      case 'ignoreNotStored': return 'Ignored (not stored)'
    }
  }

  /** Up to three example values from a column, so the user can see what it holds. */
  samples(col: number): string {
    const out: string[] = []
    for (const row of this.rows().slice(1)) {
      const v = String(row[col] ?? '').trim()
      if (v) out.push(v.length > 24 ? v.slice(0, 23) + '…' : v)
      if (out.length === 3) break
    }
    return out.join('  ·  ')
  }

  onSheetChange(name: string) {
    this.sheetName.set(name)
    this.loadSheet(name)
  }

  setTarget(col: number, target: ColumnTarget) {
    this.targets.update(t => t.map((x, i) => (i === col ? target : x)))
  }

  private loadSheet(name: string) {
    const rows = this.data.sheet?.rows(name) ?? []
    this.rows.set(rows)
    const headers = rows[0] ?? []
    const guess = guessMapping(headers, this.data.idFieldLabel)
    const recalled = recallMapping(this.prefs.getImportMappings(), headers)
    this.targets.set(recalled ?? guess.targets)
    this.statusColumn.set(guess.statusColumn)
    this.skipExited.set(guess.statusColumn !== null)
    this.remembered.set(!!recalled)
    this.confident.set(!!recalled || guess.unrecognised.length === 0)
  }

  toPreview() {
    this.buildPreview()
    this.step.set('preview')
  }

  toMapping() {
    this.step.set('map')
  }

  private buildPreview() {
    let incoming = this.data.incoming ?? []
    if (this.isSheet) {
      const mapping: ColumnMapping = { targets: this.targets(), statusColumn: this.statusColumn(), unrecognised: [] }
      const applied = applyMapping(this.rows(), mapping, { skipExited: this.skipExited() })
      incoming = applied.rangers
      this.skipped.set(applied.skipped)
      this.warnings.set([...applied.warnings.slice(0, 5),
        ...(applied.warnings.length > 5 ? [`...and ${applied.warnings.length - 5} more rows skipped for the same reason.`] : []),
        ...this.rangerService.rosterWarnings(incoming, this.data.idFieldLabel)])
    } else {
      this.warnings.set(this.rangerService.rosterWarnings(incoming, this.data.idFieldLabel))
    }
    this.incoming.set(incoming)
    this.merge.set(mergeRangers(this.data.existing, incoming))
  }

  ambiguousNames(m: RangerMergeResult): string {
    return m.ambiguous.slice(0, 5).map(r => r.callsign || r.id || '(unidentified)').join(', ')
      + (m.ambiguous.length > 5 ? ', ...' : '')
  }

  cancel() {
    this.ref.close()
  }

  add() {
    this.finish('add')
  }

  replace() {
    const current = this.data.existing.length
    if (!confirm(
      `Replace the roster with ${this.incoming().length} people from "${this.data.fileName}"?\n\n`
      + `This REPLACES the current roster of ${current}: anyone not in this file is removed. `
      + `Radio log entries and settings are not affected.\n\n`
      + `Tip: use "Export roster" first if you want to keep the current one.`)) {
      return
    }
    this.finish('replace')
  }

  private finish(action: 'add' | 'replace') {
    const merge = this.merge()
    if (!merge) return
    if (this.isSheet) {
      this.prefs.rememberImportMapping(headerSetKey(this.headers()), this.targets())
    }
    this.ref.close({ action, incoming: this.incoming(), merge })
  }
}
