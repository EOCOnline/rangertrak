// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { loadPackage, readPackageFolder } from './lib/package.js'
import { buildScript } from './lib/settings.js'
import { baitFor, findBait, debriefCheck, debriefMarkdown, debriefHtml } from './lib/debrief.js'
import { rebaseMs } from './lib/clock.js'
import { parseStamp } from './lib/time.js'

const DIR = fileURLToPath(new URL('./samples/montecito', import.meta.url))
const NOW = Date.UTC(2026, 9, 18, 15, 0)
const MOMENT = parseStamp('2018-01-09T04:00')

const entry = (id, mins, notes, extra = {}) => ({
  id, date: new Date(NOW + mins * 60000).toISOString(), callsign: 'X', tacticalCall: 'Net Control', status: 'Normal', notes,
  location: { lat: 1, lng: 1, address: '', derivedFromAddress: false }, ...extra,
})

test('bait: the Montecito PII row yields the terms its teaching note lists', async () => {
  const pkg = loadPackage(await readPackageFolder(DIR))
  const row = pkg.msel.find(r => r.id === 'M0146')
  const terms = baitFor(row).map(b => b.term)
  for (const t of ['Fenwick', 'Marnie', '1956', '0147']) assert.ok(terms.includes(t), `${t} in ${terms}`)
})

test('bait: without a listed search, names, dates and phone numbers come from the message', () => {
  const terms = baitFor({ message: 'Caller gives Name Pat Quill-Ames, born 3/14/1956, husband Lee Quill-Ames, phone 805-555-0147.', teaching_note: '' }).map(b => b.term)
  for (const t of ['Pat Quill-Ames', 'Pat', 'Quill', '3/14/1956', '1956', '8055550147', 'Lee']) assert.ok(terms.includes(t), `${t} in ${terms}`)
})

test('bait: found in notes, in other fields, across phone formats, with entry times', () => {
  const bait = baitFor({ message: 'Name Marnie Fenwick-Aldous. Phone 805-555-0147.', teaching_note: '' })
  const hits = findBait([
    entry(1, 5, 'Injured woman, home site 8, name withheld'),
    entry(2, 10, 'Caller marnie says medics needed'),
    entry(3, 12, 'callback 805 555 0147 please'),
    entry(4, 20, 'nothing here', { location: { lat: 1, lng: 1, address: 'Fenwick lane', derivedFromAddress: false } }),
  ], bait)
  assert.deepEqual(hits.map(h => h.id), [2, 3, 4])
  assert.equal(hits[0].station, 'Net Control')
  assert.ok(hits[1].terms.includes('8055550147'))
})

test('debrief: injects logged, late and missed, with time differences', async () => {
  const pkg = loadPackage(await readPackageFolder(DIR))
  const script = buildScript(pkg, { start: '2018-01-09T03:44', stop: '2018-01-09T04:20' }).rows
  const injects = script.filter(r => (r.role === 'inject' || r.role === 'played') && r.kind !== 'test')
  assert.ok(injects.length >= 3)
  const due = r => (rebaseMs(r.t, MOMENT, NOW) - NOW) / 60000
  const [a, b] = injects
  const entries = [
    entry(1, due(a) + 2, a.message),                       // logged, 2 minutes after
    entry(2, due(b) + 30, 'Re: ' + b.message),             // logged, but 30 minutes late
  ]
  const rep = debriefCheck({ script, entries, anchor: { momentMin: MOMENT, nowMs: NOW }, lateMin: 10 })
  const byId = id => rep.injects.find(i => i.id === id)
  assert.equal(byId(a.id).status, 'logged'); assert.equal(byId(a.id).deltaMin, 2)
  assert.equal(byId(b.id).status, 'late'); assert.equal(byId(b.id).deltaMin, 30)
  assert.ok(rep.injects.filter(i => i.status === 'missed').length >= injects.length - 2)
  assert.equal(rep.summary.logged + rep.summary.late + rep.summary.missed, rep.summary.injects)
})

test('debrief: one entry cannot satisfy two injects', () => {
  const script = [
    { id: 'A', t: 0, role: 'inject', kind: 'status', from: 'X', message: 'Bridge washed out at Elm Street crossing' },
    { id: 'B', t: 1, role: 'inject', kind: 'status', from: 'X', message: 'Bridge washed out at Elm Street crossing' },
  ]
  const rep = debriefCheck({ script, entries: [entry(1, 0, 'bridge washed out elm street crossing')] })
  assert.deepEqual(rep.injects.map(i => i.status), ['logged', 'missed'])
})

test('debrief: the PII test reports the planted bait, and a clean log passes', async () => {
  const pkg = loadPackage(await readPackageFolder(DIR))
  const script = buildScript(pkg, {}).rows
  const dirty = debriefCheck({ script, entries: [entry(7, 3, 'woman injured, Marnie Fenwick-Aldous, Alder Bluff') , entry(8, 4, 'ok')] })
  const pii = dirty.tests.find(t => t.id === 'M0146')
  assert.equal(pii.passed, false); assert.equal(pii.hits[0].id, 7)
  assert.equal(dirty.summary.piiFailed, 1)
  const clean = debriefCheck({ script, entries: [entry(8, 4, 'injured woman at home site 6, name withheld')] })
  assert.equal(clean.tests.find(t => t.id === 'M0146').passed, true)
  assert.equal(clean.summary.piiFailed, 0)
  // Non-PII tests land on the evaluator checklist.
  assert.ok(clean.checklist.some(c => c.test === 'wrong-grid'))
})

test('debrief: Markdown and HTML outputs carry the findings and escape markup', () => {
  const script = [
    { id: 'T1', t: 0, role: 'inject', kind: 'test', test: 'pii', from: 'X', message: 'Name Pat Quill. Phone 805-555-0147.', teaching_note: "Search the log for 'Quill'." },
    { id: 'I1', t: 1, role: 'inject', kind: 'status', from: 'X', message: '<b>bold</b> culvert failure at north gate' },
  ]
  const rep = debriefCheck({ script, entries: [entry(1, 1, 'Pat Quill called')] })
  const md = debriefMarkdown(rep, 'Test <class>')
  assert.match(md, /missed/); assert.match(md, /Entry 1/); assert.match(md, /Quill/)
  const html = debriefHtml(rep, 'Test <class>')
  assert.ok(!html.includes('<class>')); assert.match(html, /&lt;class&gt;/)
  assert.match(html, /Entry 1/)
})
