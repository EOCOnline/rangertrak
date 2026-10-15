/**
 * Reads a spreadsheet file (CSV or Excel) into plain rows of text, and writes rows back out
 * (E-187 Layers, phase A; ADR D-58).
 *
 * SheetJS (`xlsx`, ~800 KB) is loaded with `await import('xlsx')` only when a file is actually
 * read or written, so it stays out of the initial bundle - RangerService is injected on Entry,
 * and nothing on the first screen may pay for a button on the Rangers page.
 *
 * Everything the domain needs from here is a `string[][]` (header row first); the mapping and
 * merge rules live in `domain/roster-sheet.ts`.
 */

export type SheetFile = {
  /** Sheet names. A CSV has exactly one. */
  sheets: string[]
  /** The sheet to show first: "Roster" if there is one, else the first with anything in it. */
  defaultSheet: string
  /** The sheet's rows as text, leading blank rows removed. */
  rows(sheet: string): string[][]
}

/** Reads a CSV / XLSX / XLS file. Rejects with a message meant for a person. */
export async function readSheetFile(file: File): Promise<SheetFile> {
  const XLSX = await import('xlsx')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const isCsv = /\.(csv|txt|tsv)$/i.test(file.name) || file.type === 'text/csv'

  let workbook: import('xlsx').WorkBook
  try {
    if (isCsv) {
      const text = decodeCsvBytes(bytes)
      workbook = XLSX.read(text, { type: 'string', raw: true, FS: sniffDelimiter(text) })
    } else {
      workbook = XLSX.read(bytes, { type: 'array' })
    }
  } catch (e: any) {
    throw new Error(`Could not read "${file.name}" as a spreadsheet (${e?.message ?? e}).`)
  }

  const names = workbook.SheetNames
  if (!names.length) {
    throw new Error(`"${file.name}" has no sheets in it.`)
  }

  const rowsOf = (sheet: string): string[][] => {
    const ws = workbook.Sheets[sheet]
    if (!ws) return []
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '', blankrows: true })
    return tidy(raw.map(r => r.map(c => String(c ?? ''))))
  }

  const roster = names.find(n => n.trim().toLowerCase() === 'roster')
  const firstFilled = names.find(n => rowsOf(n).length > 0)
  return { sheets: names, defaultSheet: roster ?? firstFilled ?? names[0], rows: rowsOf }
}

/** Drops leading blank rows (a title row of blanks above the headings) and pads rows to one width. */
function tidy(rows: string[][]): string[][] {
  const start = rows.findIndex(r => r.some(c => c.trim() !== ''))
  if (start < 0) return []
  const body = rows.slice(start)
  const width = Math.max(...body.map(r => r.length))
  return body.map(r => (r.length < width ? [...r, ...Array(width - r.length).fill('')] : r))
}

/**
 * UTF-8 (with or without a BOM) if it decodes cleanly, else Windows-1252, which is what
 * Excel's plain "CSV" writes.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  const start = bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF ? 3 : 0
  const body = bytes.subarray(start)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body)
  } catch {
    return new TextDecoder('windows-1252').decode(body)
  }
}

/** The delimiter used by the header line: `,` `;` or tab, whichever is most frequent outside quotes. */
export function sniffDelimiter(text: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 }
  let quoted = false
  for (const ch of text) {
    if (ch === '"') quoted = !quoted
    else if (!quoted && (ch === '\n' || ch === '\r')) break
    else if (!quoted && ch in counts) counts[ch]++
  }
  return (Object.keys(counts) as string[]).reduce((best, d) => (counts[d] > counts[best] ? d : best), ',')
}

/**
 * A one-sheet Excel workbook as bytes, with every cell written as text so a leading zero or a
 * phone number survives the round trip.
 */
export async function rowsToXlsxBytes(rows: readonly (readonly string[])[], sheetName = 'Roster'): Promise<Uint8Array> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet(rows.map(r => [...r]))
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell) { cell.t = 's'; cell.z = '@' }
    }
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
}
