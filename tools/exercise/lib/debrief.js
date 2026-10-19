// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.
import { rebaseMs } from './clock.js'
import { formatClock } from './time.js'

const STOP = new Set(('this that with from have been were will would could should there their they them then than what when where which '
  + 'into onto over under about after before while also just please time copy command dispatch request requesting').split(' '))

/** Words that identify a message: 4+ letters (not common ones) and any number. */
export function keyTokens(text) {
  const words = String(text ?? '').toLowerCase().match(/[a-z]{4,}|\d+/g) ?? []
  return [...new Set(words.filter(w => /\d/.test(w) || !STOP.has(w)))]
}

/** All the searchable text of one logged entry. */
export function entryText(e) {
  return [e.notes, e.message213, e.subject213, e.tacticalCall, e.toTactical, e.callsign, e.location?.address]
    .filter(Boolean).join(' \n ')
}

const digitsOf = s => String(s).replace(/\D/g, '')

/**
 * The bait for a `pii` row: what to search the class's log for. Order of preference:
 *   1. the quoted list in the row's teaching note ("search the log for 'Fenwick', 'Marnie', '1956' and '0147'");
 *   2. otherwise taken from the message itself: phone numbers, dates, and names after "Name",
 *      "husband", "wife" and the like.
 * Returns [{ term, type: 'phone' | 'text' }]. Phone terms are compared digit by digit, so
 * "805 555 0147" and "8055550147" both hit "0147" and the whole number.
 */
export function baitFor(row) {
  const out = new Map()
  const add = (term, type = 'text') => { const t = term.trim(); if (t.length >= 3 && !out.has(t.toLowerCase())) out.set(t.toLowerCase(), { term: t, type }) }
  const note = row.teaching_note ?? ''
  const listed = /search the log for\s+([^.]*)/i.exec(note)
  if (listed) for (const q of listed[1].matchAll(/'([^']+)'|"([^"]+)"/g)) {
    const t = q[1] ?? q[2]
    add(t, /^\d{7,}$/.test(t) ? 'phone' : 'text')
  }
  const msg = row.message ?? ''
  for (const m of msg.matchAll(/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g)) { add(digitsOf(m[0]), 'phone') }
  for (const m of msg.matchAll(/\b\d{1,2}\/\d{1,2}\/(\d{4})\b/g)) { add(m[0]); add(m[1]) }
  for (const m of msg.matchAll(/\b(?:Name|husband|wife|son|daughter|mother|father|neighbou?r)\s+((?:[A-Z][a-z]+(?:-[A-Z][a-z]+)?\s?){1,3})/g)) {
    const full = m[1].trim()
    add(full)
    for (const part of full.split(/\s+/)) add(part.split('-')[0])
  }
  return [...out.values()]
}

/**
 * Searches a log (array of entries) for the bait. Returns the hits, each with the entry's id,
 * time, station, and the terms found. `entries` may include the catch-up entries; they carry no
 * bait because test rows are never written to a catch-up file.
 */
export function findBait(entries, bait) {
  const hits = []
  for (const e of entries) {
    const text = entryText(e)
    const lower = text.toLowerCase()
    const digits = digitsOf(text)
    const found = bait.filter(b => (b.type === 'phone' ? digits.includes(b.term) : lower.includes(b.term.toLowerCase()))).map(b => b.term)
    if (found.length) hits.push({ id: e.id, uid: e.uid, date: e.date, station: e.tacticalCall || e.callsign || '', terms: found })
  }
  return hits
}

/**
 * Best matching entry for an inject: the unclaimed entry sharing the largest fraction of its key
 * words, at or after `notBefore` (ms). Players retype in their own words, so this is a score,
 * not an equality: at least `minScore` of the inject's key words must appear.
 */
export function matchInject(row, entries, claimed, { notBeforeMs = -Infinity, minScore = 0.4 } = {}) {
  const want = keyTokens(row.message)
  if (!want.length) return null
  let best = null
  for (const e of entries) {
    if (claimed.has(e)) continue
    const t = new Date(e.date).getTime()
    if (!Number.isFinite(t) || t < notBeforeMs) continue
    const have = new Set(keyTokens(entryText(e)))
    const score = want.filter(w => have.has(w)).length / want.length
    if (score >= minScore && (!best || score > best.score || (score === best.score && t < best.t))) best = { entry: e, score, t }
  }
  return best
}

/**
 * The debrief check. Inputs:
 *   script    the effective script rows (buildScript().rows)
 *   entries   the class's exported log (parseReportPacket(...).entries, or a bare array)
 *   anchor    { momentMin, nowMs }: the rebase the class ran under (scenario moment `momentMin`
 *             was real time `nowMs`), so scenario times map to real ones. Without it the check
 *             still says logged or missed, but gives no time differences.
 *   lateMin   an entry more than this many minutes after its inject counts as late (default 10)
 *
 * Output { injects: [...], tests: [...], checklist: [...], summary }.
 */
export function debriefCheck({ script, entries, anchor = null, lateMin = 10 }) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))
  const claimed = new Set()
  const injects = []
  for (const r of script.filter(x => x.role === 'inject' || x.role === 'played')) {
    if (r.kind === 'test') continue           // tests are reported on their own
    const dueMs = anchor ? rebaseMs(r.t, anchor.momentMin, anchor.nowMs) : null
    const m = matchInject(r, sorted, claimed, { notBeforeMs: dueMs == null ? -Infinity : dueMs - 5 * 60000 })
    if (m) claimed.add(m.entry)
    const delta = m && dueMs != null ? Math.round((m.t - dueMs) / 60000) : null
    injects.push({
      id: r.id, scenarioTime: r.scenario_time, clock: formatClock(r.t), from: r.from, message: r.message,
      status: !m ? 'missed' : delta != null && delta > lateMin ? 'late' : 'logged',
      entryId: m?.entry.id ?? null, entryDate: m?.entry.date ?? null, deltaMin: delta, score: m ? Math.round(m.score * 100) / 100 : null,
    })
  }

  const tests = []
  const checklist = []
  for (const r of script.filter(x => x.test)) {
    if (r.test === 'pii') {
      const bait = baitFor(r)
      const hits = findBait(sorted, bait)
      tests.push({ id: r.id, test: 'pii', scenarioTime: r.scenario_time, clock: formatClock(r.t), bait: bait.map(b => b.term), hits, passed: hits.length === 0, teachingNote: r.teaching_note })
    } else {
      checklist.push({ id: r.id, test: r.test, scenarioTime: r.scenario_time, clock: formatClock(r.t), message: r.message, expected: r.teaching_note })
    }
  }

  const count = s => injects.filter(i => i.status === s).length
  return {
    injects, tests, checklist,
    summary: {
      injects: injects.length, logged: count('logged'), late: count('late'), missed: count('missed'),
      piiTests: tests.length, piiFailed: tests.filter(t => !t.passed).length, evaluatorChecks: checklist.length, entriesRead: entries.length,
    },
  }
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const when = d => (d ? new Date(d).toISOString().slice(11, 16) + 'Z' : '')
const delta = m => (m == null ? '' : `${m >= 0 ? '+' : ''}${m} min`)

/** The debrief as Markdown. */
export function debriefMarkdown(report, title = 'Exercise') {
  const s = report.summary
  const L = [`# EXERCISE debrief: ${title}`, '',
    `Injects: ${s.injects} (logged ${s.logged}, late ${s.late}, missed ${s.missed}). PII traps: ${s.piiTests}, bait found in the log in ${s.piiFailed}. Evaluator checks by hand: ${s.evaluatorChecks}. Log entries read: ${s.entriesRead}.`, '',
    '## Injects', '', '| Row | Scenario time | From | Result | Logged at | Difference |', '|---|---|---|---|---|---|']
  for (const i of report.injects) L.push(`| ${i.id} | ${i.clock} | ${i.from} | ${i.status} | ${when(i.entryDate)} | ${delta(i.deltaMin)} |`)
  L.push('', '## Planted PII', '')
  if (!report.tests.length) L.push('None in this script.')
  for (const t of report.tests) {
    L.push(`### ${t.id} (${t.clock})`, '', `Searched for: ${t.bait.join(', ')}.`, '')
    if (t.passed) L.push('Not found in the log. Passed.')
    else for (const h of t.hits) L.push(`- Entry ${h.id}${h.station ? ' (' + h.station + ')' : ''} at ${when(h.date)}: ${h.terms.join(', ')}`)
    if (t.teachingNote) L.push('', `Teaching note: ${t.teachingNote}`)
    L.push('')
  }
  L.push('## Evaluator checklist (by hand)', '')
  if (!report.checklist.length) L.push('None in this script.')
  for (const c of report.checklist) L.push(`- [ ] ${c.id} (${c.clock}, ${c.test}): ${c.expected || c.message}`)
  return L.join('\n') + '\n'
}

/** The debrief as a small self-contained HTML page. */
export function debriefHtml(report, title = 'Exercise') {
  const s = report.summary
  const rows = report.injects.map(i => `<tr class="${i.status}"><td>${esc(i.id)}</td><td>${esc(i.clock)}</td><td>${esc(i.from)}</td><td>${esc(i.status)}</td><td>${esc(when(i.entryDate))}</td><td>${esc(delta(i.deltaMin))}</td></tr>`).join('')
  const tests = report.tests.map(t => `<section><h3>${esc(t.id)} (${esc(t.clock)})</h3><p>Searched for: ${esc(t.bait.join(', '))}</p>${
    t.passed ? '<p class="ok">Not found in the log. Passed.</p>'
      : `<ul>${t.hits.map(h => `<li>Entry ${esc(h.id)}${h.station ? ' (' + esc(h.station) + ')' : ''} at ${esc(when(h.date))}: ${esc(h.terms.join(', '))}</li>`).join('')}</ul>`
  }${t.teachingNote ? `<p><em>${esc(t.teachingNote)}</em></p>` : ''}</section>`).join('') || '<p>None in this script.</p>'
  const checks = report.checklist.map(c => `<li>&#9744; ${esc(c.id)} (${esc(c.clock)}, ${esc(c.test)}): ${esc(c.expected || c.message)}</li>`).join('') || '<li>None in this script.</li>'
  return `<h2>EXERCISE debrief: ${esc(title)}</h2>
<p>Injects: ${s.injects} (logged ${s.logged}, late ${s.late}, missed ${s.missed}). PII traps: ${s.piiTests}, bait found in the log in ${s.piiFailed}. Evaluator checks by hand: ${s.evaluatorChecks}. Log entries read: ${s.entriesRead}.</p>
<h3>Injects</h3><table class="debrief"><thead><tr><th>Row</th><th>Scenario time</th><th>From</th><th>Result</th><th>Logged at</th><th>Difference</th></tr></thead><tbody>${rows}</tbody></table>
<h3>Planted PII</h3>${tests}
<h3>Evaluator checklist (by hand)</h3><ul class="checks">${checks}</ul>`
}
