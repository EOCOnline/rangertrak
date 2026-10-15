#!/usr/bin/env node
/*
 * Builds src/assets/templates/roster-template.xlsx from roster-template.csv (beside it) and
 * src/app/domain/testing/roster-example.csv.
 *
 *   node tools/make-template-xlsx.js
 *
 * Three sheets: "Roster" (headers only, the one to fill in), "Example" (made-up Fernhollow
 * people) and "How to fill this in". The headers sit on row 1 of Roster and Example so an
 * importer never has to hunt for them. ID and phone columns are formatted as text, so Excel
 * keeps leading zeros and does not turn 555-0101 into a date or a number.
 *
 * Uses SheetJS from node_modules (it is already an app dependency).
 * PII-free: every row it writes comes from the made-up example CSV.
 */
const fs = require('fs')
const path = require('path')

const XLSX = require(path.resolve(__dirname, '../node_modules/xlsx'))

// Where things live in the repo: the template (CSV in, XLSX out) is served from the app's assets;
// the made-up example people are the unit tests' fixture.
const ROOT = path.resolve(__dirname, '..')
const HERE = path.join(ROOT, 'src', 'assets', 'templates')
const EXAMPLE_DIR = path.join(ROOT, 'src', 'app', 'domain', 'testing')
const readCsv = (name, dir = HERE) => XLSX.read(fs.readFileSync(path.join(dir, name), 'utf8'), { type: 'string', raw: true })
  .Sheets.Sheet1

const HELP = [
  ['How to fill in this roster'],
  [''],
  ['One row per person. Put your people on the "Roster" sheet; "Example" shows made-up ones.'],
  ['Keep the headings on row 1 exactly as they are. Add columns of your own if you like: RangerTrak ignores them.'],
  [''],
  ['Column', 'Needed?', 'What goes in it'],
  ['Ranger ID', 'This or Call Sign', 'The ID your people know: REW#, DSW#, member number. RangerTrak shows it and searches on it. Leave blank if not issued yet.'],
  ['Call Sign', 'This or Ranger ID', 'FCC amateur call, e.g. WZ0HAZ. Blank for people who are not licensed - that is fine.'],
  ['Full Name', 'Recommended', 'As you would say it on the radio or read it on a badge.'],
  ['Phone', 'Optional', 'The number to reach them during an incident. Any format.'],
  ['Team', 'Optional', 'Their group or affiliation: CERT, EOC, Radio Club, MRC, a neighbourhood team.'],
  ['Role', 'Optional', 'What they usually do: Net control, First aid, Shelter lead.'],
  ['Notes', 'Optional', 'Anything a scribe should see: qualifications, "no phone on file".'],
  [''],
  ['Every row needs a Ranger ID or a Call Sign (or both). Each Ranger ID should belong to one person.'],
  ['Photos are separate: name each photo file after the person\'s Ranger ID (or call sign if they have no ID), e.g. DM-0001.jpg, then use Import photos.'],
  ['Addresses and e-mail are not stored by RangerTrak, so you can leave them out.'],
  [''],
  ['THIS FILE WILL HOLD PERSONAL INFORMATION once you fill it in. Keep it on a computer you control.'],
  ['If it lives in Google Sheets, never use "Publish to the web": that makes the whole roster public.'],
]

/** Formats every cell in columns A (Ranger ID) and D (Phone) as text, down to `rows`. */
function textColumns(ws, rows) {
  for (let r = 0; r < rows; r++) {
    for (const c of [0, 3]) {
      const ref = XLSX.utils.encode_cell({ r, c })
      if (!ws[ref]) ws[ref] = { t: 's', v: '' }
      ws[ref].t = 's'
      ws[ref].z = '@'
    }
  }
  const range = XLSX.utils.decode_range(ws['!ref'])
  range.e.r = Math.max(range.e.r, rows - 1)
  ws['!ref'] = XLSX.utils.encode_range(range)
}

const widths = [{ wch: 12 }, { wch: 11 }, { wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 44 }]

const roster = readCsv('roster-template.csv')
textColumns(roster, 300)   // pre-formatted rows; an importer must skip blank ones
roster['!cols'] = widths
roster['!autofilter'] = { ref: 'A1:G1' }

const example = readCsv('roster-example.csv', EXAMPLE_DIR)
example['!cols'] = widths

const help = XLSX.utils.aoa_to_sheet(HELP)
help['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 100 }]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, roster, 'Roster')
XLSX.utils.book_append_sheet(wb, example, 'Example')
XLSX.utils.book_append_sheet(wb, help, 'How to fill this in')
wb.Props = { Title: 'RangerTrak roster template', Author: 'RangerTrak' }

const out = path.join(HERE, 'roster-template.xlsx')
XLSX.writeFile(wb, out)
console.log(`Wrote ${out}`)
