import { AgGridModule } from 'ag-grid-angular'
import { ColDef, GridOptions } from 'ag-grid-community'

import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges
} from '@angular/core'

import { ensureAgGridRegistered } from '../../../shared/ag-grid-setup'
import { rangertrakGridTheme } from '../../../shared/ag-grid-theme'
import { LocationCategoryType, statusColorMeetsAA, statusColorValue, statusInkValue } from '../../../shared/services/'
import { ColorEditor } from '../../color-editor.component'

/**
 * ADR D-49: the mission-editable Location category list (Command Post, Staging Area, Ranger
 * First Aid, EOC, Fire Station, Dock, ...) - the same indirection FieldReportType.status
 * already has against `fieldReportStatuses`, reusing the identical grid pattern
 * (MissionFieldReportStatusesComponent) rather than inventing a second list-editor widget.
 *
 * `rowData` is the same array reference as `settings.locationTypes` (mission.component.ts's
 * `applyMissionToForm()`) - grid edits mutate it in place, so nothing needs to sync it back
 * on Save, mirroring the field-report-statuses grid exactly.
 *
 * No "renaming a category in use" lock (contrast MissionFieldReportStatusesComponent's
 * `isStatusInUse()`): field reports accumulate in bulk over a mission and status renames were
 * a reported real hazard (E-73); Locations are placed one at a time and this same protection
 * hasn't been asked for here. Add later if it turns out to matter in practice.
 *
 * Icon selection per category was raised live (2026-08-30) as a possible follow-on -
 * `LocationCategoryType` has no `icon` field yet and `locationIconFor()` keys off the
 * category NAME, not a stored icon id, so that would need its own pass. Not attempted here.
 */
@Component({
  selector: 'rangertrak-mission-location-types',
  standalone: true,
  imports: [CommonModule, AgGridModule],
  templateUrl: './mission-location-types.component.html',
  styleUrls: ['./mission-location-types.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MissionLocationTypesComponent implements OnChanges {
  private id = 'Mission Location Types Component'

  @Input({ required: true }) rowData: LocationCategoryType[] = []

  private gridApi: any

  gridOptions: GridOptions = {
    theme: rangertrakGridTheme,
  }

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 30,
    editable: true,
    singleClickEdit: true,
    resizable: true,
    sortable: true,
    filter: true,
  }

  columnDefs = [
    { headerName: "Category", field: "type", flex: 50 },
    {
      headerName: "Color", field: "color",
      tooltipField: "one of the built-in accessible colors, or your own CSS color",
      cellStyle: (params: { value: string; }) => {
        this.refreshGrid()
        const stored = String(params.value ?? '')
        return {
          backgroundColor: statusColorValue(stored),
          color: statusInkValue(stored),
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

  constructor() {
    ensureAgGridRegistered()
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Same reasoning as MissionFieldReportStatusesComponent's own copy of this guard: the
    // grid redraws when the parent swaps in a new array (import/reset), not on first bind
    // (ag-Grid hasn't mounted yet at that point - onGridReady() below does its own refresh).
    if (changes['rowData'] && !changes['rowData'].firstChange) {
      this.refreshGrid()
    }
  }

  onGridReady = (params: any) => {
    this.gridApi = params.api
    this.refreshGrid()
  }

  onBtnAddLocationType() {
    this.rowData.push({ type: 'New Category', color: '' })
    this.refreshGrid()
  }

  refreshGrid() {
    if (this.gridApi) {
      this.gridApi.refreshCells()
      this.gridApi.sizeColumnsToFit()
    }
  }
}
