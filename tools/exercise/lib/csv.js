// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Copyright (C) the RangerTrak contributors.
// Free software under the GNU Affero General Public License, version 3 or (at your option) any
// later version. It comes WITHOUT ANY WARRANTY.

/**
 * Minimal RFC 4180 reader: quoted cells, doubled quotes, embedded commas and newlines, CRLF or
 * LF, an optional byte-order mark. Pure; no file access.
 *
 * Returns { header, rows, errors }. `rows` are objects keyed by header, each carrying `_line`
 * (the 1-based line of the file the row starts on, for error messages). A row whose width does
 * not match the header is NOT guessed at: it goes to `errors` and is left out of `rows`.
 */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '')
  const cells = []        // [{ row: string[], line }]
  let row = [], cell = '', quoted = false, line = 1, rowLine = 1, sawAny = false

  const endRow = () => {
    row.push(cell)
    cells.push({ row, line: rowLine })
    row = []; cell = ''; sawAny = false
  }

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '\n') line++
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
      continue
    }
    if (!sawAny) { rowLine = line; sawAny = true }
    if (c === '"' && cell === '') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') { i++; line++ }
      endRow()
    } else cell += c
  }
  if (quoted) {
    return { header: [], rows: [], errors: [`The file ends inside a quoted cell (opened near line ${rowLine}).`] }
  }
  if (cell !== '' || row.length) endRow()

  const nonEmpty = cells.filter(r => r.row.some(x => x.trim() !== ''))
  if (!nonEmpty.length) return { header: [], rows: [], errors: ['The file is empty.'] }
  const header = nonEmpty.shift().row.map(h => h.trim())
  const errors = []
  const rows = []
  for (const r of nonEmpty) {
    if (r.row.length !== header.length) {
      errors.push(`Line ${r.line}: ${r.row.length} cells, expected ${header.length} (an unquoted comma?).`)
      continue
    }
    const o = Object.fromEntries(header.map((h, i) => [h, r.row[i]]))
    o._line = r.line
    rows.push(o)
  }
  return { header, rows, errors }
}

/** One cell, quoted only when it has to be. */
export function csvCell(value) {
  const s = String(value ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Rows (arrays or objects with `columns`) back to CSV text. */
export function toCsv(columns, objects) {
  return [columns.map(csvCell).join(','), ...objects.map(o => columns.map(c => csvCell(o[c])).join(','))].join('\r\n') + '\r\n'
}
