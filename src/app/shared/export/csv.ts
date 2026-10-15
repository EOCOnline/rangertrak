/**
 * Shared CSV helpers (E-189 moved these out of after-action.component.ts so the AAR notes and
 * the Mission summary use one copy). RFC 4180 quoting; the BOM makes Excel read UTF-8.
 */

/** Quotes one CSV cell: wrap in quotes, double any quote inside. */
export function csvCell(value: string | number | undefined | null): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/** One CSV line from already-stringified or numeric cells. */
export function csvRow(cells: ReadonlyArray<string | number | undefined | null>): string {
  return cells.map(csvCell).join(',')
}

/** Saves `csv` as a file download, with a BOM so Excel opens accented names as UTF-8. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
