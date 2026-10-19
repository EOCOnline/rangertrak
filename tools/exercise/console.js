// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.
//
// The controller console: browser glue around the tested modules in lib/. Everything it knows
// comes from the scenario package the instructor opens. It sends nothing over a network; it
// writes files (catch-up Report Packets, debrief Markdown) for a person to carry to the app.
import { loadPackage } from './lib/package.js'
import { buildScript, normalizeSettings, PACES, INTENSITIES, expectedAction, fatalitiesOn } from './lib/settings.js'
import { createClock, scenarioNow, pause, resume, setRate, jumpTo, jumpToOpPeriod } from './lib/clock.js'
import { buildCatchUp, placesList } from './lib/packet.js'
import { stressPackets } from './lib/stress.js'
import { debriefCheck, debriefHtml, debriefMarkdown } from './lib/debrief.js'
import { formatClock, formatLong, formatStamp, parseStamp } from './lib/time.js'

const CHANNEL_NAME = 'rangertrak-exercise-room'   // same name as room.js
const CORE = ['scenario.json', 'msel.csv', 'places.csv', 'teams.csv']

const $ = id => document.getElementById(id)

/** Tiny element builder. Text goes in as text, never as HTML. */
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (v === true) el.setAttribute(k, '')
    else if (v !== false && v != null) el.setAttribute(k, v)
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)))
  return el
}

function download(filename, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  const a = h('a', { href: url, download: filename })
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

const S = {
  texts: null,          // { scenario, msel, places, teams }
  media: new Map(),     // 'media/x.jpg' -> File
  pkg: null,
  settings: null,       // working copy edited by the form
  applied: null,        // the settings the running script was built with
  script: [], cueRows: [], clock: null, lastTick: 0, lastCatchUp: -Infinity,
  anchor: null, runId: '', stopMin: Infinity, started: false,
  lastReport: null, localInjects: [], room: null, roomWin: null, mediaUrls: new Map(),
}

// ── tabs ───────────────────────────────────────────────────────────────────────────────────
document.querySelectorAll('nav.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)))
function showTab(name) {
  document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)))
  document.querySelectorAll('main > section.tab').forEach(s => { s.hidden = s.id !== `tab-${name}` })
  if (name === 'debrief') prefillAnchor()
}

// ── opening a package ──────────────────────────────────────────────────────────────────────
async function readPicked(fileList) {
  const files = [...fileList]
  const rel = f => (f.webkitRelativePath || f.name).split('/').slice(1).join('/') || f.name
  const texts = {}
  S.media = new Map()
  for (const f of files) {
    const path = f.webkitRelativePath ? rel(f) : f.name
    const base = path.split('/').pop()
    if (CORE.includes(base) && (!path.includes('/') || path.split('/').length === 1)) texts[base.replace(/\.(json|csv)$/, '')] = await f.text()
    else if (!CORE.includes(base)) S.media.set(path.startsWith('media/') ? path : `media/${base}`, f)
  }
  return texts
}

async function openFromTexts(texts, label) {
  S.texts = texts
  S.pkg = loadPackage(texts)
  S.started = false
  S.localInjects = []
  S.settings = normalizeSettings(S.pkg.scenario?.defaults)
  $('pkg-title').textContent = (S.pkg.scenario?.title || label || 'Scenario') + (S.pkg.ok ? '' : ' (has errors)')
  renderLoadReport()
  if (S.pkg.ok) buildSettingsForm()
  $('settings-area').hidden = !S.pkg.ok
  $('run-area').hidden = true
  $('run-empty').hidden = false
}

$('pick-folder').addEventListener('change', async e => { if (e.target.files.length) await openFromTexts(await readPicked(e.target.files)) })
$('pick-files').addEventListener('change', async e => { if (e.target.files.length) await openFromTexts(await readPicked(e.target.files)) })
$('load-sample').addEventListener('click', async () => {
  try {
    const texts = {}
    for (const name of CORE) {
      const r = await fetch(`samples/montecito/${name}`)
      if (!r.ok) throw new Error(`${name}: ${r.status}`)
      texts[name.replace(/\.(json|csv)$/, '')] = await r.text()
    }
    S.media = new Map()
    await openFromTexts(texts, 'Montecito sample')
  } catch (e) {
    $('load-report').replaceChildren(h('p', { class: 'errors' }, `Could not load the sample (${e.message}). Serve this folder with node tools/exercise/serve.js, or open the sample folder with the buttons.`))
  }
})

function renderLoadReport() {
  const p = S.pkg
  const out = $('load-report')
  const box = []
  if (p.ok) box.push(h('p', { class: 'ok' }, `Loaded: ${p.msel.length} rows, ${p.places.length} places, ${p.teams.length} teams, ${p.opPeriods.length} op periods. No validation errors.`))
  else box.push(h('p', { class: 'errors' }, `This package has ${p.errors.length} error${p.errors.length === 1 ? '' : 's'}. Fix the files and open it again.`),
    h('ul', { class: 'errors' }, p.errors.slice(0, 60).map(e => h('li', {}, e))),
    p.errors.length > 60 ? h('p', { class: 'note' }, `...and ${p.errors.length - 60} more.`) : null)
  if (p.warnings.length) box.push(h('ul', { class: 'warnings' }, p.warnings.map(w => h('li', {}, w))))
  out.replaceChildren(...box)
  const sc = p.scenario || {}
  $('about-box').replaceChildren(
    sc.title ? h('h2', {}, sc.title) : null,
    sc.about ? h('p', {}, sc.about) : null,
    sc.contentNote ? h('div', { class: 'box content-note' }, h('b', {}, 'Content note. '), sc.contentNote) : null,
    Array.isArray(sc.sources) && sc.sources.length ? h('details', {}, h('summary', {}, `${sc.sources.length} sources`),
      h('ul', {}, sc.sources.map(s => h('li', {}, `${s.id}: ${s.title} `, s.url ? h('span', { class: 'note' }, s.url) : null)))) : null)
}

// ── settings form ──────────────────────────────────────────────────────────────────────────
function buildSettingsForm() {
  const s = S.settings
  $('s-start').value = s.start; $('s-stop').value = s.stop
  $('s-pace').replaceChildren(...PACES.map(p => h('option', { value: p, selected: p === s.pace }, `${p}x`)))
  $('s-intensity').replaceChildren(...INTENSITIES.map(p => h('option', { value: p, selected: p === s.intensity }, `${p}%`)))
  $('s-reveal').checked = s.revealReal
  document.querySelectorAll('input[name=s-cas]').forEach(r => { r.checked = r.value === s.casualtyRealism })
  $('s-off').value = s.rowOff.join(', ')
  const calls = [...new Set(S.pkg.teams.map(t => t.tactical_call))]
  $('s-played').replaceChildren(...calls.map(c => h('label', {}, h('input', { type: 'checkbox', 'data-team': c, checked: s.playedTeams.includes(c) }), c)))
  const cas = S.pkg.msel.filter(r => r.kind === 'casualty')
  $('cas-rows').replaceChildren(...cas.map(r => h('label', {},
    h('select', { 'data-cas': r.id }, h('option', { value: 'softened' }, 'softened'), h('option', { value: 'recorded', selected: s.casualtyPerRow[r.id] === 'recorded' }, 'as recorded')),
    `${r.id} ${formatClock(r.t)} `, h('span', { class: 'note' }, r.casualty_softened.slice(0, 70)))))
  syncCasRows()
  renderLocalInjects()
  renderRowsTable()
}
document.querySelectorAll('input[name=s-cas]').forEach(r => r.addEventListener('change', syncCasRows))
function syncCasRows() {
  const mode = document.querySelector('input[name=s-cas]:checked')?.value
  $('cas-rows').hidden = mode !== 'per-row'
}

function readSettingsForm() {
  const per = {}
  document.querySelectorAll('select[data-cas]').forEach(sel => { if (sel.value === 'recorded') per[sel.dataset.cas] = 'recorded' })
  return normalizeSettings(S.pkg.scenario?.defaults, {
    start: $('s-start').value.trim(), stop: $('s-stop').value.trim(),
    pace: Number($('s-pace').value), intensity: Number($('s-intensity').value), revealReal: $('s-reveal').checked,
    casualtyRealism: document.querySelector('input[name=s-cas]:checked')?.value || 'softened', casualtyPerRow: per,
    playedTeams: [...document.querySelectorAll('input[data-team]:checked')].map(i => i.dataset.team),
    rowOff: $('s-off').value.split(/[\s,]+/).filter(Boolean), localInjects: S.localInjects,
  })
}

$('li-add').addEventListener('click', () => {
  const time = $('li-time').value.trim(), msg = $('li-msg').value.trim()
  if (Number.isNaN(parseStamp(time)) || !msg) { $('li-list').textContent = 'A local inject needs a time as YYYY-MM-DDTHH:MM and the words to say.'; return }
  S.localInjects.push({ id: `L${S.localInjects.length + 1}`, scenario_time: time, from: $('li-from').value.trim(), to: $('li-to').value.trim(), message: msg, teaching_note: $('li-note').value.trim() })
  $('li-msg').value = ''; $('li-note').value = ''
  renderLocalInjects()
})
function renderLocalInjects() {
  $('li-list').textContent = S.localInjects.length ? `Added: ${S.localInjects.map(l => `${l.id} at ${l.scenario_time.slice(11)}`).join(', ')}` : ''
}

function renderRowsTable() {
  const { rows } = buildScript(S.pkg, readSettingsForm())
  const head = h('tr', {}, ['Id', 'Time', 'OP', 'Role', 'From', 'To', 'Words'].map(t => h('th', {}, t)))
  $('rows-table').replaceChildren(h('table', { class: 'rows' }, head, ...rows.slice(0, 600).map(r => h('tr', {},
    h('td', {}, r.id), h('td', {}, formatClock(r.t)), h('td', {}, r.op), h('td', {}, r.role + (r.decision_point ? ' + decision' : '') + (r.test ? ' + test' : '')),
    h('td', {}, r.from), h('td', {}, r.to), h('td', {}, r.message.slice(0, 110))))),
    rows.length > 600 ? h('p', { class: 'note' }, `Showing the first 600 of ${rows.length}.`) : null)
}

$('apply').addEventListener('click', () => {
  S.settings = readSettingsForm()
  startRun()
  showTab('run')
})

// ── running ────────────────────────────────────────────────────────────────────────────────
function startRun() {
  const built = buildScript(S.pkg, S.settings)
  S.applied = built.settings
  S.script = built.rows
  S.cueRows = S.script.filter(r => r.role !== 'background')
  const first = S.script[0]?.t ?? parseStamp(S.pkg.scenario.startTime)
  const startMin = S.settings.start ? parseStamp(S.settings.start) : Math.min(first, parseStamp(S.pkg.scenario.startTime))
  S.stopMin = S.settings.stop ? parseStamp(S.settings.stop) : Infinity
  S.clock = createClock(startMin, Date.now(), S.applied.pace)
  S.lastTick = startMin - 1
  S.lastCatchUp = -Infinity
  S.anchor = null
  S.runId = String(Date.now())
  S.started = true
  const bg = S.script.filter(r => r.role === 'background').length
  $('apply-summary').textContent = `${S.script.length} rows: ${bg} background, ${S.cueRows.length} cues.`
  $('cues').replaceChildren(); $('decision-slot').replaceChildren()
  $('run-empty').hidden = true; $('run-area').hidden = false
  const sc = S.pkg.scenario
  $('content-note').hidden = !sc.contentNote
  $('content-note').replaceChildren(h('b', {}, 'Content note. '), sc.contentNote || '')
  $('debrief-prompt').hidden = !fatalitiesOn(S.pkg, S.applied)
  $('run-pace').replaceChildren(...PACES.map(p => h('option', { value: p, selected: p === S.applied.pace }, `${p}x`)))
  $('jump-op').replaceChildren(...S.pkg.opPeriods.map(o => h('option', { value: o.n }, o.label)))
  $('jump-time').value = formatStamp(startMin)
  status(`Ready at ${formatLong(startMin)}. Press Play. Background traffic is not read out: write a catch-up file when the class needs it in the app.`)
  render()
  openChannel()
}

function status(msg) { $('run-status').textContent = msg }

function render() {
  if (!S.clock) return
  const t = scenarioNow(S.clock, Date.now())
  $('clock').firstChild.textContent = formatClock(t)
  $('clock-date').textContent = formatLong(t) + (S.clock.paused ? '  (paused)' : `  (${S.clock.rate}x)`)
  const ops = opStrip(t)
  $('op-label').textContent = ops.find(o => o.state === 'now')?.label || ''
  $('opstrip').replaceChildren(...ops.map(o => h('span', { class: o.state }, o.label)))
  $('play').disabled = !S.clock.paused; $('pause').disabled = S.clock.paused
}

function opStrip(t) {
  let nowIdx = 0
  S.pkg.opPeriods.forEach((o, i) => { if (o.startMin <= t) nowIdx = i })
  return S.pkg.opPeriods.map((o, i) => ({ label: o.label, state: i < nowIdx ? 'past' : i === nowIdx ? 'now' : 'next' }))
}

function tick() {
  if (!S.clock || !S.started) return
  const now = Date.now()
  const t = scenarioNow(S.clock, now)
  if (!S.clock.paused) {
    const due = S.cueRows.filter(r => r.t > S.lastTick && r.t <= t)
    for (const r of due) {
      fire(r)
      if (r.decision_point) {                      // decision points stop the clock exactly there
        S.clock = jumpTo(pause(S.clock, now), now, r.t)
        S.lastTick = r.t
        status(`Paused at the decision point (${formatClock(r.t)}). Discuss, then press Play.`)
        render(); sendClock()
        return
      }
    }
    S.lastTick = t
    if (t >= S.stopMin) { S.clock = jumpTo(pause(S.clock, now), now, S.stopMin); status('Reached the stop point you set.') }
  }
  render()
}
setInterval(tick, 250)
setInterval(() => sendClock(), 1000)

$('play').addEventListener('click', () => {
  const now = Date.now()
  S.clock = resume(S.clock, now)
  S.anchor = { momentMin: scenarioNow(S.clock, now), nowMs: now }
  status('Running.')
  render()
})
$('pause').addEventListener('click', () => { S.clock = pause(S.clock, Date.now()); status('Paused. The real clock runs on; the class can talk.'); render() })
$('run-pace').addEventListener('change', e => { S.clock = setRate(S.clock, Date.now(), Number(e.target.value)); render() })

function doJump(min) {
  const now = Date.now()
  const skipped = S.cueRows.filter(r => r.t > S.lastTick && r.t <= min && r.role !== 'media').length
  S.clock = jumpTo(S.clock, now, min)
  S.lastTick = min
  if (!S.clock.paused) S.anchor = { momentMin: min, nowMs: now }
  status(`Jumped to ${formatLong(min)}.` + (skipped > 0 ? ` ${skipped} cue card${skipped === 1 ? '' : 's'} passed over; write a catch-up file if the class needs the traffic.` : ''))
  render(); sendClock()
}
$('jump-go').addEventListener('click', () => {
  const m = parseStamp($('jump-time').value.trim())
  if (Number.isNaN(m)) { status('Type the time as YYYY-MM-DDTHH:MM.'); return }
  doJump(m)
})
$('jump-op-go').addEventListener('click', () => {
  try { doJump(jumpToOpPeriod(S.clock, Date.now(), S.pkg.opPeriods, Number($('jump-op').value)).scenarioMin) } catch (e) { status(e.message) }
})

function writeCatchUp(toMin) {
  const now = Date.now()
  const r = buildCatchUp({ pkg: S.pkg, script: S.script, toMin, fromMin: S.lastCatchUp, nowMs: now, runId: S.runId })
  download(r.filename, r.text)
  S.lastCatchUp = toMin
  S.anchor = { momentMin: toMin, nowMs: now }
  return r
}
$('catchup').addEventListener('click', () => {
  const t = Math.floor(scenarioNow(S.clock, Date.now()))
  const r = writeCatchUp(t)
  status(`Wrote ${r.filename} (${r.count} entries up to ${formatClock(t)}, dated to end at now). Import it in the app (Report Packet import).`)
})
$('advance').addEventListener('click', () => {
  const t = scenarioNow(S.clock, Date.now())
  const next = S.pkg.opPeriods.find(o => o.startMin > t)
  if (!next) { status('There is no later op period.'); return }
  doJump(next.startMin)
  const r = writeCatchUp(next.startMin)
  status(`Advanced to ${next.label}. Wrote ${r.filename} (${r.count} entries). Import it, then press Play.`)
})

// ── cue cards ──────────────────────────────────────────────────────────────────────────────
function placeLabel(r) { return S.pkg.places.find(p => p.id === r.place_id)?.label || '' }

function fire(r) {
  if (r.role === 'media') { showMedia(r); }
  const hidden = expectedAction(r)
  const card = h('div', { class: `cue ${r.decision_point ? 'decision' : r.role}` },
    h('div', { class: 'meta' },
      h('span', { class: 'badge' }, r.role === 'played' ? 'played' : r.role), r.test ? h('span', { class: 'badge test' }, `test: ${r.test}`) : null,
      r.kind === 'casualty' ? h('span', { class: 'badge cas' }, 'casualty') : null, r.local ? h('span', { class: 'badge' }, 'local') : null,
      `${formatClock(r.t)}  OP ${r.op}  |  ${r.from} to ${r.to}${r.channel ? '  on ' + r.channel : ''}`, placeLabel(r) ? `  |  ${placeLabel(r)}` : ''),
    r.role === 'media' ? h('div', { class: 'meta' }, 'Sent to the room display.') : null,
    h('div', { class: 'words' }, r.role === 'played' ? `${r.from} should send: ${r.message}` : r.message),
    hidden ? revealer(r.role === 'played' ? 'Show the teaching note' : 'Show expected action / teaching note', r.role === 'played' ? (r.teaching_note || 'Log it as heard.') : hidden) : null)
  $('cues').prepend(card)
  if (r.decision_point) decisionPanel(r)
}

function revealer(label, body) {
  const out = h('div', { class: 'note', hidden: true }, body)
  const btn = h('button', { class: 'btn secondary', onclick: () => { out.hidden = !out.hidden; btn.textContent = out.hidden ? label : 'Hide' } }, label)
  return h('div', {}, btn, out)
}

function decisionPanel(r) {
  const real = r.what_really_happened
  const body = h('div', { class: 'note', hidden: true }, S.applied.revealReal ? real : 'Held back: "What really happened" is switched off in the settings.')
  const btn = h('button', { class: 'btn secondary', onclick: () => { body.hidden = !body.hidden } }, 'What really happened')
  $('decision-slot').replaceChildren(h('div', { class: 'cue decision' },
    h('h3', {}, `Decision point at ${formatClock(r.t)}`), h('div', { class: 'words' }, r.decision_point), real ? h('div', {}, btn, body) : null,
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { $('decision-slot').replaceChildren(); $('play').click() } }, 'Close and play on'))))
}

// ── room display ───────────────────────────────────────────────────────────────────────────
function openChannel() {
  if (S.room) return
  S.room = new BroadcastChannel(CHANNEL_NAME)
  S.room.onmessage = ev => { if (ev.data?.type === 'hello') sendClock() }
}
function sendClock() {
  if (!S.room || !S.clock) return
  const t = scenarioNow(S.clock, Date.now())
  S.room.postMessage({ type: 'clock', clock: formatClock(t), date: formatLong(t).slice(0, 10), opLabel: '', ops: opStrip(t).map(o => ({ label: o.label.split(' - ')[0], state: o.state })) })
}
$('open-room').addEventListener('click', () => {
  openChannel()
  S.roomWin = window.open('room.html', 'rangertrak-exercise-room', 'popup,width=1280,height=720')
  setTimeout(sendClock, 800)
})
$('blank-room').addEventListener('click', () => { openChannel(); S.blankOn = !S.blankOn; S.room.postMessage({ type: 'blank', on: S.blankOn }) })

const IMG = /\.(png|jpe?g|gif|webp|svg)$/i, VID = /\.(mp4|webm|ogv)$/i
function mediaItem(r) {
  const item = { caption: r.message, source: /^https?:/.test(r.source_ref) ? r.source_ref : (r.source_ref === 'invented' ? '' : r.source_ref), license: r.license, scenarioTime: formatClock(r.t), mediaType: 'card', url: '' }
  const local = [r.photo, r.source_ref].map(x => (x || '').trim()).find(x => x && S.media.has(x.startsWith('media/') ? x : `media/${x}`))
  if (local) {
    const key = local.startsWith('media/') ? local : `media/${local}`
    if (!S.mediaUrls.has(key)) S.mediaUrls.set(key, URL.createObjectURL(S.media.get(key)))
    item.url = S.mediaUrls.get(key)
    item.mediaType = VID.test(key) ? 'video' : IMG.test(key) ? 'image' : 'card'
  } else if (/^https?:/.test(r.source_ref) && IMG.test(r.source_ref.split('?')[0]) && navigator.onLine) {
    item.url = r.source_ref; item.mediaType = 'image'
  }
  return item
}
function showMedia(r) { openChannel(); S.room.postMessage({ type: 'media', item: mediaItem(r) }) }

// ── controller packet (print) ──────────────────────────────────────────────────────────────
$('print-packet').addEventListener('click', () => {
  const sc = S.pkg.scenario
  const t0 = h('div', {},
    h('h1', {}, `EXERCISE controller packet: ${sc.title}`), h('p', {}, sc.about),
    sc.contentNote ? h('p', {}, h('b', {}, 'Content note. '), sc.contentNote) : null,
    h('p', {}, `Settings: pace ${S.applied.pace}x, background ${S.applied.intensity}%, casualty realism ${S.applied.casualtyRealism}, played teams: ${S.applied.playedTeams.join(', ') || 'none'}.`),
    h('h2', {}, 'Effective MSEL'),
    h('table', { class: 'rows' }, h('tr', {}, ['Id', 'Time', 'OP', 'Role', 'From', 'To', 'Channel', 'Words', 'Expected action / teaching note'].map(x => h('th', {}, x))),
      ...S.script.map(r => h('tr', {}, h('td', {}, r.id), h('td', {}, formatClock(r.t)), h('td', {}, r.op), h('td', {}, r.role + (r.test ? ` (${r.test})` : '') + (r.decision_point ? ' DECISION' : '')),
        h('td', {}, r.from), h('td', {}, r.to), h('td', {}, r.channel), h('td', {}, r.message), h('td', {}, expectedAction(r) + (r.decision_point ? ' | Discuss: ' + r.decision_point : '') + (r.real ? ' | Real: ' + r.real : ''))))),
    h('h2', { class: 'page-break' }, 'Places'), h('pre', {}, placesList(S.pkg)),
    h('p', {}, 'The catch-up files do not carry places. Add them to the app by hand or from the region you already use; the list above is for the controller.'),
    h('h2', { class: 'page-break' }, 'Cue cards'),
    ...S.cueRows.filter(r => r.role !== 'media').map(r => h('div', { class: 'print-card' },
      h('h4', {}, `${r.id}  ${formatClock(r.t)}  OP ${r.op}  ${r.test ? 'TEST ' + r.test : r.role}`),
      h('div', {}, `${r.from} to ${r.to} on ${r.channel}`), h('div', {}, h('b', {}, r.role === 'played' ? 'Trainee should send: ' : 'Say: '), r.message),
      expectedAction(r) ? h('div', {}, h('b', {}, 'Expected action: '), expectedAction(r)) : null,
      r.decision_point ? h('div', {}, h('b', {}, 'Discuss: '), r.decision_point) : null)),
    h('h2', { class: 'page-break' }, 'Message cards (ICS-213 style)'),
    ...S.cueRows.filter(r => r.role === 'inject' && r.kind !== 'media').map(r => h('div', { class: 'print-card' },
      h('h4', {}, 'EXERCISE - GENERAL MESSAGE (ICS 213 style)'),
      h('div', { class: 'field' }, h('b', {}, 'To: '), r.to), h('div', { class: 'field' }, h('b', {}, 'From: '), r.from),
      h('div', { class: 'field' }, h('b', {}, 'Date/time: '), formatLong(r.t)), h('div', { class: 'field' }, h('b', {}, 'Subject: '), placeLabel(r) || r.kind),
      h('div', { class: 'field big' }, h('b', {}, 'Message: '), r.message),
      h('div', { class: 'field' }, h('b', {}, 'Approved by (name / position): ')), h('div', { class: 'field big' }, h('b', {}, 'Reply: ')),
      h('div', { class: 'note' }, 'EXERCISE, EXERCISE, EXERCISE'))))
  $('print-area').replaceChildren(t0)
  window.print()
})

// ── debrief ────────────────────────────────────────────────────────────────────────────────
function prefillAnchor() {
  if (!S.anchor) return
  if (!$('an-scn').value) $('an-scn').value = formatStamp(S.anchor.momentMin)
  if (!$('an-real').value) $('an-real').value = new Date(S.anchor.nowMs).toISOString()
}

$('debrief-run').addEventListener('click', async () => {
  const out = $('debrief-out')
  const file = $('debrief-file').files[0]
  if (!S.script.length) { out.replaceChildren(h('p', { class: 'errors' }, 'Open a scenario and apply settings first, so the check knows the script.')); return }
  if (!file) { out.replaceChildren(h('p', { class: 'errors' }, 'Choose the exported Report Packet first.')); return }
  let packet
  try { packet = JSON.parse(await file.text()) } catch (e) { out.replaceChildren(h('p', { class: 'errors' }, `That file is not a Report Packet (${e.message}).`)); return }
  const entries = Array.isArray(packet) ? packet : packet.entries
  if (!Array.isArray(entries)) { out.replaceChildren(h('p', { class: 'errors' }, 'That file is not a Report Packet ("entries" is not a list).')); return }
  const scn = parseStamp($('an-scn').value.trim()), real = Date.parse($('an-real').value.trim())
  const anchor = !Number.isNaN(scn) && !Number.isNaN(real) ? { momentMin: scn, nowMs: real } : null
  S.lastReport = debriefCheck({ script: S.script, entries, anchor, lateMin: Number($('an-late').value) || 10 })
  const box = h('div', {}); box.innerHTML = debriefHtml(S.lastReport, S.pkg.scenario.title)   // built by lib/debrief.js, which escapes every value
  out.replaceChildren(box)
  $('debrief-md').disabled = false; $('debrief-print').disabled = false
})
$('debrief-md').addEventListener('click', () => download('EXERCISE-debrief.md', debriefMarkdown(S.lastReport, S.pkg.scenario.title), 'text/markdown'))
$('debrief-print').addEventListener('click', () => {
  $('print-area').replaceChildren(h('div', {}, h('h1', {}, 'EXERCISE debrief')), Object.assign(h('div', {}), { innerHTML: debriefHtml(S.lastReport, S.pkg.scenario.title) }))
  window.print()
})

// ── stress injector ────────────────────────────────────────────────────────────────────────
$('st-go').addEventListener('click', async () => {
  const rate = Number($('st-rate').value), hours = Number($('st-hours').value)
  if (!(rate > 0) || !(hours > 0)) { $('st-status').textContent = 'Rate and hours must be above zero.'; return }
  const files = stressPackets({
    rate, hours, nowMs: Date.now(), seed: Number($('st-seed').value) || 1, splitMinutes: Number($('st-split').value) || 0,
    scenarioPkg: $('st-use-pkg').checked && S.pkg?.ok ? S.pkg : null,
  })
  for (const f of files) { download(f.filename, f.text); await new Promise(r => setTimeout(r, 400)) }
  $('st-status').textContent = `Wrote ${files.length} file${files.length === 1 ? '' : 's'}, ${files.reduce((a, f) => a + f.count, 0)} entries.`
})
