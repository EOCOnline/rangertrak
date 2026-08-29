import { Subscription } from 'rxjs'

import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core'

import { PageComponent } from '../shared/page/page.component'
import { MATERIAL_IMPORTS } from '../material-imports'
import { formatReportTime } from '../shared'
import { fillIcs213Pdf } from '../shared/export/ics213-pdf'
import {
  FieldReportService, FieldReportType, LogService, MissionService, MissionType
} from '../shared/services'

/**
 * ICS-213 general messages - field reports with "Also generate an ICS-213" checked
 * (`generates213`), scoped 2026-08-27 as part of the ICS-309/213 IA restructuring (see the
 * roadmap's own scoping note for the full reasoning).
 *
 * Deliberately NOT a second AG Grid clone of Radio Log/field-reports.component.ts: a message
 * is opt-in per report, so this list is expected to stay short, and the useful unit here is
 * one whole message read at a time, not a row scanned across columns. List + expanded-detail
 * instead, with a "Print as ICS-213" button wired directly to `fillIcs213Pdf()` (`0.57.0`,
 * E-31/E-41 phase 3) - built the same day as the log-shaping half of that work, but never
 * wired to any UI until now.
 *
 * `FieldReportType` has no Subject or Approved-by-Name field today, so those two of the
 * form's eight fillable fields are left blank on the printed PDF rather than invented -
 * `fillIcs213Pdf()`'s own doc comment already states this principle for the Reply block, and
 * it applies just as much to data nobody has actually collected.
 */
@Component({
  selector: 'rangertrak-messages',
  standalone: true,
  imports: [CommonModule, PageComponent, ...MATERIAL_IMPORTS],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MessagesComponent implements OnInit, OnDestroy {
  private id = 'Messages'
  title = 'Messages'
  pageDescr = 'ICS-213 general messages generated from field reports.'

  messages = signal<FieldReportType[]>([])
  selectedId = signal<number | null>(null)
  printing = signal(false)

  private settings: MissionType | undefined
  private missionSubscription!: Subscription
  private fieldReportsSubscription!: Subscription

  constructor(
    private fieldReportService: FieldReportService,
    private missionService: MissionService,
    private log: LogService,
  ) { }

  ngOnInit(): void {
    this.missionSubscription = this.missionService.getMissionObserver().subscribe({
      next: (newMission) => { this.settings = newMission },
      error: (e) => this.log.error('Mission subscription got: ' + e, this.id),
    })

    this.fieldReportsSubscription = this.fieldReportService.getFieldReportsObserver().subscribe({
      next: (reports) => {
        const filtered = (reports.fieldReportArray ?? [])
          .filter(r => r.generates213)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        this.messages.set(filtered)
        // Keep the current selection if it still exists (e.g. a live-updating report);
        // otherwise default to the newest message rather than leaving the pane empty.
        if (!filtered.some(r => r.id === this.selectedId())) {
          this.selectedId.set(filtered[0]?.id ?? null)
        }
        this.log.verbose(`Received ${filtered.length} ICS-213 message(s) of ${reports.fieldReportArray?.length ?? 0} reports.`, this.id)
      },
      error: (e) => this.log.error('Field reports subscription got: ' + e, this.id),
    })
  }

  ngOnDestroy(): void {
    this.missionSubscription?.unsubscribe()
    this.fieldReportsSubscription?.unsubscribe()
  }

  get selected(): FieldReportType | undefined {
    return this.messages().find(r => r.id === this.selectedId())
  }

  select(report: FieldReportType): void {
    this.selectedId.set(report.id)
  }

  formatTime(date: Date | string): string {
    return formatReportTime(date)
  }

  async printAsIcs213(): Promise<void> {
    const report = this.selected
    if (!report || this.printing()) {
      return
    }

    this.printing.set(true)
    try {
      const res = await fetch('assets/forms/ics-213.pdf')
      if (!res.ok) {
        throw new Error(`Fetching the ICS-213 template failed: ${res.status}`)
      }
      const templateBytes = new Uint8Array(await res.arrayBuffer())
      const d = new Date(report.date)

      // F29-47 (2026-08-29): '4 Subject' and '8 Approved by Name' were both declared in
      // ICS213_FIELDS since E-31/E-41 phase 3 but never passed a value here, so every 213
      // generated printed them blank. Subject is its own scribe-entered field (subject213),
      // not derived from the message text; Approved by Name is the operator who filed the
      // report - D-e: never the CURRENT session's operator, only whatever was actually
      // stamped on this specific report at submit time, so a shift change can't
      // retroactively re-attribute it.
      const filled = await fillIcs213Pdf(templateBytes, {
        '1 Incident Name Optional': this.settings?.event || this.settings?.mission || '',
        '2 To Name and Position': (report.recipients213 ?? []).join(', '),
        '3 From Name and Position': report.callsign,
        '4 Subject': report.subject213 ?? '',
        '5 Date': d.toLocaleDateString(),
        '6 Time': d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        '7 Message': report.message213 ?? '',
        '8 Approved by Name': report.operator ?? '',
      })

      // TS's DOM lib types Uint8Array's `.buffer` as ArrayBufferLike (which could in theory
      // be a SharedArrayBuffer), stricter than BlobPart's ArrayBuffer requirement - a real
      // Uint8Array from pdf-lib's own save() is always backed by a plain ArrayBuffer at
      // runtime, so this is a type-only mismatch between library versions, not a real risk.
      const blob = new Blob([filled as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ics-213-${report.callsign || 'message'}-${report.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      this.log.info(`Printed ICS-213 for report ${report.id}`, this.id)
    } catch (e) {
      this.log.error(`Failed to fill ICS-213 for report ${report.id}: ${e}`, this.id)
    } finally {
      this.printing.set(false)
    }
  }
}
