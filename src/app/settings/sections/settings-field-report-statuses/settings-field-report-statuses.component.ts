import { AgGridModule } from 'ag-grid-angular'
import { ColDef, GridOptions } from 'ag-grid-community'

import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges
} from '@angular/core'

import { ensureAgGridRegistered } from '../../../shared/ag-grid-setup'
import {
  FieldReportStatusType, LogService, statusColorMeetsAA, statusColorValue, statusInkValue
} from '../../../shared/services/'
import { ColorEditor } from '../../color-editor.component'

/**
 * The Field Report status/colour ag-Grid editor. Sprint C split out of the 429-line
 * settings.component template - see settings.component.ts for the rest.
 *
 * `rowData` is the same array reference the parent's `settings.fieldReportStatuses` (and
 * the `fieldReportStatuses` form control) point at - grid edits mutate it in place, exactly
 * as the monolithic component did. `ngOnChanges` re-syncs the local reference when the
 * parent reassigns it wholesale (import / reset), mirroring what the parent's settings
 * subscription already does.
 */
@Component({
  selector: 'rangertrak-settings-field-report-statuses',
  standalone: true,
  imports: [CommonModule, AgGridModule],
  templateUrl: './settings-field-report-statuses.component.html',
  styleUrls: ['./settings-field-report-statuses.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsFieldReportStatusesComponent implements OnChanges {
  private id = 'Settings Field Report Statuses Component'

  @Input({ required: true }) rowData: FieldReportStatusType[] = []

  private gridApi: any
  private gridColumnApi: any

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  // https://www.ag-grid.com/javascript-data-grid/row-styles/#highlighting-rows-and-columns
  gridOptions: GridOptions = {
    // Use the classic ag-theme-alpine CSS (imported in styles.scss) rather than v33+'s
    // Theming API - see the ModuleRegistry comment in main.ts.
    theme: 'legacy',
  }

  defaultColDef: ColDef = {
    flex: 1, //https://ag-grid.com/angular-data-grid/column-sizing/#column-flex
    minWidth: 30,
    editable: true,
    singleClickEdit: true,
    resizable: true,
    sortable: true,
    filter: true,
  }

  //? FUTURE: Consider replacing "Color" with "CSS_Style" to allow more options?
  columnDefs = [
    {
      headerName: "Status", field: "status", flex: 50,
      cellStyle: (params: { value: string; }) => {
        // Same fill+ink resolution as the Field Reports grid - see field-reports.component.ts.
        const stat = this.rowData.find(el => el.status == params.value)
        const stored = stat ? stat.color : '#A3A3A3'
        return { 'background-color': statusColorValue(stored), 'color': statusInkValue(stored) }
      }
    },
    {
      headerName: "Color", field: "color",
      tooltipField: "one of the built-in accessible colours, or your own CSS colour",
      cellStyle: (params: { value: string; }) => {
        this.refreshStatusGrid()
        const stored = String(params.value ?? '')
        return {
          backgroundColor: statusColorValue(stored),
          color: statusInkValue(stored),
          // A custom colour that fails WCAG AA against its own ink is flagged rather than
          // silently accepted - the whole point of Sprint E's colour work is that an
          // unreadable status is a safety problem, not a taste one. Built-in keys always pass.
          outline: statusColorMeetsAA(stored) ? 'none' : '2px dashed #B3261E',
          outlineOffset: '-3px',
        }
      },
      cellEditor: ColorEditor,
      cellEditorPopup: true,
      editable: true,
      width: 300,
    }
  ]

  constructor(private log: LogService) {
    ensureAgGridRegistered()
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Angular already assigns the new value to `rowData` before this runs - this just
    // makes sure the grid redraws when the parent swaps in a new array (import / reset),
    // matching what the parent's own settings subscription does for its copy.
    if (changes['rowData']) {
      this.refreshStatusGrid()
    }
  }

  onGridReady = (params: any) => {
    this.log.verbose(" onGridReady", this.id)

    this.gridApi = params.api
    this.gridColumnApi = params.columnApi

    this.refreshStatusGrid()
  }

  onFirstDataRendered(params: any) {
    this.refreshStatusGrid() // REVIEW: needed???
  }

  onBtnAddFRStatus() {
    this.rowData.push({ status: 'New Status', color: '', icon: '' })
    this.refreshStatusGrid()
    this.log.verbose(`Reloading window!`, this.id)
    window.location.reload()
  }

  refreshStatusGrid() {
    if (this.gridApi) {
      this.gridApi.refreshCells()
      this.gridApi.sizeColumnsToFit();
    } else {
      this.log.verbose("no this.gridApi yet in refreshStatusGrid()", this.id)
    }
  }

  // https://angular-get-selected-rows.stackblitz.io
  getSelectedRowData() {
    let selectedNodes = this.gridApi.getSelectedNodes();
  }
}
