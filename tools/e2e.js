#!/usr/bin/env node
/**
 * End-to-end checks against a running RangerTrak, driven over the Chrome DevTools Protocol.
 *
 * WHY THIS EXISTS
 * ---------------
 * The 96-spec unit suite passed continuously through 2026-08-15 while these defects were
 * live: an emptied roster silently refilling itself on reload; a roster import that stored
 * 286 people with 0 names; a zip import that reported success having saved no photos; three
 * Install buttons that did nothing; a navbar that drew on top of itself. Every one was found
 * by driving a real browser, and every harness that found them was written ad hoc and thrown
 * away with the session (PRIVATE-Roadmap.md E-39).
 *
 * Karma cannot catch these. They live in real navigation, real IndexedDB, real file inputs,
 * and real CSS layout.
 *
 * FIXTURES ARE SYNTHETIC ON PURPOSE
 * ---------------------------------
 * The roster and photos this generates are invented - fake callsigns, generated 1px PNGs.
 * Real rosters and photographs are operator data and never enter the repo (D-35). A fixture
 * that cannot be committed is a test that will not be run.
 *
 * USAGE
 *   npm run build && npm run server           # in one terminal (serves dist on :8080)
 *   node tools/e2e.js                         # in another
 *   node tools/e2e.js --base=https://rangertrak.org --read-only
 *
 *   --base=URL      what to test           (default http://localhost:8080)
 *   --read-only     skip anything that writes localStorage/IndexedDB. Use against
 *                   production unless you intend to clobber that browser profile's data.
 *   --keep-open     leave Chrome running for inspection
 *
 * Exits non-zero if any check fails, so CI can gate on it.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, execSync } = require('child_process')

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const hit = args.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}
const BASE = (arg('base', 'http://localhost:8080')).replace(/\/$/, '')
const READ_ONLY = args.includes('--read-only')
const KEEP_OPEN = args.includes('--keep-open')
const PORT = 9444

// ── tiny CDP client ──────────────────────────────────────────────────────────

let nextId = 1
const pending = new Map()
let ws
const consoleErrors = []
const dialogs = []

const send = (method, params = {}) => {
  const id = nextId++
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed')
  }
  return r.result.value
}

async function goto(route, settleMs = 3500) {
  consoleErrors.length = 0
  await send('Page.navigate', { url: BASE + route })
  await sleep(settleMs)
}

async function setFileInput(selector, filePath) {
  const doc = await send('DOM.getDocument', { depth: -1 })
  const node = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector })
  if (!node.nodeId) throw new Error(`no element matching ${selector}`)
  await send('DOM.setFileInputFiles', { files: [filePath], nodeId: node.nodeId })
}

// ── result tracking ──────────────────────────────────────────────────────────

const results = []
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  results.push({ pass, label, actual, expected })
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`)
  if (!pass) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  return pass
}
function note(text) { console.log(`  ....  ${text}`) }

// ── synthetic fixtures ───────────────────────────────────────────────────────

/** Smallest valid PNG: 1x1, opaque. Enough for "did this become a blob URL". */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64')

function makeFixtures(dir) {
  fs.mkdirSync(dir, { recursive: true })

  const rangers = [
    { callsign: 'E2E-AA1', fullName: 'Fixture Alpha', team: 'CERT', rew: 'VI-9001', role: 'REW / Active' },
    { callsign: 'E2E-BB2', fullName: 'Fixture Bravo', team: 'EOC', rew: 'VI-9002', role: 'REW / Active' },
    { callsign: 'E2E-CC3', fullName: 'Fixture Charlie', team: 'Radio', rew: 'VI-9003', role: 'TEW / Active' },
  ]
  const rosterPath = path.join(dir, 'roster.json')
  fs.writeFileSync(rosterPath, JSON.stringify({ rangers }, null, 2))

  // A roster in an alias-using shape, to pin the licensee/icon/status mapping.
  const aliasPath = path.join(dir, 'roster-aliases.json')
  fs.writeFileSync(aliasPath, JSON.stringify(
    [{ callsign: 'E2E-AA1', licensee: 'Aliased Name', icon: 'x.png', status: 'Licensed' }], null, 2))

  // Bundle zip. Uses BACKSLASH separators deliberately: PowerShell's Compress-Archive
  // writes them, they violate APPNOTE 4.4.17.1, and tolerating them is a fix this suite
  // exists to defend (0.15.6).
  const { zipSync } = require('fflate')
  const zipPath = path.join(dir, 'bundle.zip')
  fs.writeFileSync(zipPath, Buffer.from(zipSync({
    'roster.json': new Uint8Array(fs.readFileSync(rosterPath)),
    'photos\\E2E-AA1.png': new Uint8Array(PNG_1PX),
    'photos\\E2E-CC3.png': new Uint8Array(PNG_1PX),
  })))

  return { rangers, rosterPath, aliasPath, zipPath }
}

// ── the checks ───────────────────────────────────────────────────────────────

const ROUTES = ['/', '/lmap', '/map', '/reports', '/rangers', '/settings', '/about', '/log']

async function checkRoutesRender() {
  console.log('\nEvery route renders, with no console errors')
  for (const route of ROUTES) {
    await goto(route)
    const shell = await evaluate(`(() => {
      const page = document.querySelector('rangertrak-page');
      return {
        shell: !!page,
        main: !!document.querySelector('rangertrak-page .main'),
        strip: !!document.querySelector('.header'),
      };
    })()`)
    check(`${route} renders the page shell`, shell.shell && shell.main, true)
    check(`${route} has no console errors`, consoleErrors.slice(0, 2), [])
  }
}

async function checkNavbarLayout() {
  console.log('\nNavbar does not overlap itself (regression: .rightAlign was position:absolute)')
  await send('Emulation.setDeviceMetricsOverride', { width: 1360, height: 900, deviceScaleFactor: 1, mobile: false })
  await goto('/')
  const nav = await evaluate(`(() => {
    const links = [...document.querySelectorAll('.main-nav ul a')];
    const right = document.querySelector('.rightAlign');
    const rb = right && right.getBoundingClientRect();
    const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    let overlaps = 0;
    links.forEach(a => { if (rb && hit(a.getBoundingClientRect(), rb)) overlaps++ });
    for (let i = 0; i < links.length; i++) for (let j = i + 1; j < links.length; j++)
      if (hit(links[i].getBoundingClientRect(), links[j].getBoundingClientRect())) overlaps++;
    return { overlaps, labels: links.map(a => a.textContent.trim()) };
  })()`)
  check('no overlapping nav items at 1360px', nav.overlaps, 0)
  check('D-31 map names are in the nav', nav.labels.includes('Map') && nav.labels.includes('Backup map'), true)
  await send('Emulation.clearDeviceMetricsOverride')
}

async function checkRosterLifecycle(fx) {
  console.log('\nRoster: import JSON, empty it, confirm it stays empty, re-import')
  await goto('/')
  await evaluate(`localStorage.clear()`)
  await goto('/rangers')

  const seeded = await evaluate(`JSON.parse(localStorage.getItem('rangers')||'[]').length`)
  check('a fresh browser seeds the built-in station callsigns', seeded > 0, true)

  await setFileInput('#importRosterFile', fx.rosterPath)
  await sleep(4000)
  const imported = await evaluate(`(() => {
    const r = JSON.parse(localStorage.getItem('rangers')||'[]');
    return { count: r.length, named: r.filter(x => (x.fullName||'').trim()).length,
             teams: r.filter(x => x.team).length, rew: r.filter(x => x.rew).length };
  })()`)
  check('roster JSON imports every entry', imported.count, fx.rangers.length)
  check('...with names', imported.named, fx.rangers.length)
  check('...with teams', imported.teams, fx.rangers.length)
  check('...with REW numbers', imported.rew, fx.rangers.length)

  await goto('/rangers')
  await evaluate(`[...document.querySelectorAll('rangertrak-disclosure summary')].find(s => /Advanced/.test(s.textContent))?.click()`)
  await sleep(400)
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Delete all rangers')?.click()`)
  await sleep(3000)
  check('deleting stores an empty list, keeping the key', await evaluate(`localStorage.getItem('rangers')`), '[]')

  await goto('/rangers')
  check('an emptied roster STAYS empty across a reload', await evaluate(`JSON.parse(localStorage.getItem('rangers')||'[]').length`), 0)

  await setFileInput('#importRosterFile', fx.rosterPath)
  await sleep(4000)
  check('roster re-imports after being emptied', await evaluate(`JSON.parse(localStorage.getItem('rangers')||'[]').length`), fx.rangers.length)
}

async function checkFieldNameAliases(fx) {
  console.log('\nRoster aliases: a real FCC-derived file calls the person "licensee"')
  await goto('/rangers')
  await setFileInput('#importRosterFile', fx.aliasPath)
  await sleep(4000)
  const r = await evaluate(`(() => {
    const a = JSON.parse(localStorage.getItem('rangers')||'[]');
    return { count: a.length, name: a[0] && a[0].fullName, role: a[0] && a[0].role };
  })()`)
  check('licensee maps to fullName', r.name, 'Aliased Name')
  check('status maps to role', r.role, 'Licensed')
}

async function checkBundleZip(fx) {
  console.log('\nBundle zip: roster + photos in one action, with BACKSLASH separators')
  await goto('/rangers')
  await setFileInput('#importRosterFile', fx.zipPath)
  await sleep(7000)

  const r = await evaluate(`(async () => {
    const rangers = JSON.parse(localStorage.getItem('rangers')||'[]');
    const photos = await new Promise(res => {
      const req = indexedDB.open('rangertrak-photos');
      req.onsuccess = () => { const db = req.result;
        if (!db.objectStoreNames.contains('photos')) return res([]);
        const k = db.transaction('photos','readonly').objectStore('photos').getAllKeys();
        k.onsuccess = () => res(k.result); k.onerror = () => res([]); };
      req.onerror = () => res([]);
    });
    return { rangers: rangers.length, photoKeys: photos.sort() };
  })()`)
  check('zip imports the roster', r.rangers, fx.rangers.length)
  // The 0.15.6 regression: backslash paths made every photo "unmatched" while the roster
  // imported fine, and the dialog reported success.
  check('zip stores photos despite backslash paths', r.photoKeys, ['E2E-AA1', 'E2E-CC3'])
}

// ── Sprint D's keyboard-first pass and phone-width fix, retro-fitted with the checks its
// own plan specified but never committed. Written at the START of Sprint E, before any
// layout work, so they capture current-good behaviour rather than whatever Sprint E leaves
// behind. See the Sprint E plan, Step 0.
//
// NOTE for all synthetic edits below: Signal Forms' [formField] listens for the 'input' DOM
// event ONLY, never 'change' (nativeControlCreate in @angular/forms/fesm2022/signals.mjs).
// A real click/keystroke fires both; a dispatched 'change' alone silently does nothing.

async function checkEntryTabOrder() {
  console.log('\nEntry form: tab order is a strictly increasing sequence (Sprint D keyboard-first)')
  await goto('/')
  const r = await evaluate(`(() => {
    const form = document.querySelector('.enter__form');
    if (!form) return { error: 'no .enter__form' };
    // Only positive, explicitly-assigned tabindexes participate in the keyboard-first
    // sequence; -1 (programmatic focus only) and 0 (natural order) are deliberately excluded.
    const idx = [...form.querySelectorAll('[tabindex]')]
      .map(el => Number(el.getAttribute('tabindex')))
      .filter(n => Number.isFinite(n) && n > 0);
    const dupes = idx.filter((n, i) => idx.indexOf(n) !== i);
    let ascending = true;
    for (let i = 1; i < idx.length; i++) if (idx[i] <= idx[i - 1]) ascending = false;
    const contiguous = idx.length > 0 && idx.every((n, i) => n === i + 1);
    return { count: idx.length, first: idx[0], last: idx[idx.length - 1], dupes, ascending, contiguous };
  })()`)
  if (r.error) { check('Entry form present for tab-order check', r.error, null); return }
  check('every Entry tabindex is unique', r.dupes, [])
  check('Entry tabindexes ascend in DOM order', r.ascending, true)
  check('the sequence starts at callsign (tabindex 1)', r.first, 1)
  // callsign(1) + Location's 19 DD/DDM/DMS+address fields(2-20) + time-picker date(21) and
  // time(22) + status(23) + notes(24) + reset(25) + submit(26). Asserting CONTIGUITY rather
  // than just a count: a gap means a field was removed without renumbering, and a changed
  // total means one was added without re-planning the sequence. Sprint H adds coordinate
  // systems here and must renumber deliberately - this is the check that will tell it so.
  check('Entry tab stops are contiguous 1..N with no gaps', r.contiguous, true)
  check('Entry exposes the expected number of keyboard stops', r.count, 26)
}

async function checkEntryAutofocusAndReset() {
  console.log('\nEntry form: callsign holds focus on load and again after submit (no mouse needed)')
  await goto('/')
  const onLoad = await evaluate(`(document.activeElement && document.activeElement.id) || ''`)
  check('callsign is focused on load', onLoad, 'enter__Callsign-input')

  const submitted = await evaluate(`(async () => {
    const input = document.getElementById('enter__Callsign-input');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(input, 'E2E-AA1');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 600));
    const btn = document.querySelector('.enter__Submit-button');
    const wasDisabled = btn.disabled;
    btn.click();
    await new Promise(r => setTimeout(r, 1200)); // let resetEntryForm() settle before reading focus
    return {
      wasDisabled,
      focusedAfter: (document.activeElement && document.activeElement.id) || '',
      callsignCleared: document.getElementById('enter__Callsign-input').value === '',
    };
  })()`)
  check('Submit is enabled for a minimal valid entry', submitted.wasDisabled, false)
  check('callsign is re-focused after submit+reset', submitted.focusedAfter, 'enter__Callsign-input')
  check('callsign is cleared for the next report', submitted.callsignCleared, true)
}

async function checkEntryPhoneWidth() {
  console.log('\nEntry form fits a phone (regression: .enter__Callsign min-width:350px beat width:35%)')
  // 390x844 = iPhone 12/13/14 class. mobile:true so the layout viewport behaves like a phone's.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true })
  await goto('/')
  const r = await evaluate(`(() => {
    const form = document.querySelector('.enter__form');
    return {
      formScroll: form ? Math.ceil(form.scrollWidth) : -1,
      docScroll: Math.ceil(document.documentElement.scrollWidth),
      inner: window.innerWidth,
    };
  })()`)
  check('the Entry form does not exceed a phone viewport', r.formScroll <= r.inner, true)
  check('the page itself does not scroll horizontally on a phone', r.docScroll <= r.inner, true)
  if (r.formScroll > r.inner || r.docScroll > r.inner) {
    note(`widths: form ${r.formScroll}px, document ${r.docScroll}px, viewport ${r.inner}px`)
  }
  await send('Emulation.clearDeviceMetricsOverride')
}

async function checkLocationDdDdmDmsSync() {
  console.log('\nLocation: DD / DDM / DMS stay in sync, including a rapid second edit')
  await goto('/')
  // Vashon EOC-ish: 47.4472, -122.4627 -> 47deg 26.832' N / 47deg 26' 49.9" N
  const settled = await evaluate(`(async () => {
    const set = (id, v) => {
      const el = document.getElementById(id);
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true })); // (change) handlers drive the conversion
    };
    set('enter__Where-latI', 47); set('enter__Where-latF', 4472);
    await new Promise(r => setTimeout(r, 900));
    const g = id => document.getElementById(id).value;
    return { ddmDeg: g('enter__Where-latDdmD'), ddmMin: g('enter__Where-latDdmM'), dmsDeg: g('enter__Where-latD') };
  })()`)
  check('DDM degrees follow a DD edit', Number(settled.ddmDeg), 47)
  check('DMS degrees follow a DD edit', Number(settled.dmsDeg), 47)
  check('DDM minutes are ~26.8 for .4472 degrees', Math.abs(Number(settled.ddmMin) - 26.832) < 0.2, true)

  // The case the old debounce/merge dispatcher used to drop: a second edit landing while the
  // first is still in flight. linkedSignal should make this a non-event; assert that it does.
  //
  // The 60ms gap is deliberate and load-bearing. Firing both edits in the SAME microtask does
  // fail - the first edit's canonical->linkedSignal recompute writes model-derived values back
  // to the DOM before Angular's change detection has processed the second, clobbering it. That
  // is not a reachable user scenario though: no one can touch two fields inside one microtask,
  // and every real keystroke gets its own task with CD in between. 60ms is realistic fast
  // tab-and-type, while still far inside the ~300ms debounce window that used to swallow edits
  // outright - so this tests the real regression class rather than CD scheduling.
  const rapid = await evaluate(`(async () => {
    const set = (id, v) => {
      const el = document.getElementById(id);
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    set('enter__Where-latI', 45);
    await new Promise(r => setTimeout(r, 60));   // second edit lands mid-flight, not mid-microtask
    set('enter__Where-lngI', -120);
    await new Promise(r => setTimeout(r, 900));
    const g = id => document.getElementById(id).value;
    return { latDdm: g('enter__Where-latDdmD'), lngDdm: g('enter__Where-lngDdmD') };
  })()`)
  check('a rapid lat edit is not dropped', Number(rapid.latDdm), 45)
  check('a rapid lng edit is not dropped either', Math.abs(Number(rapid.lngDdm)), 120)
}

async function checkEntryPhoto() {
  console.log('\nEntry form: the photo that confirms who a report is about (E-38)')
  for (const [callsign, expectDevicePhoto] of [['E2E-AA1', true], ['E2E-BB2', false]]) {
    await goto('/')
    const r = await evaluate(`(async () => {
      const input = document.querySelector('input[formcontrolname="callsign"]') || document.querySelector('input');
      if (!input) return { error: 'no callsign input' };
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(input, ${JSON.stringify(callsign)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 1600));
      const img = (document.getElementById('enter__Callsign-image')||{}).querySelector
        ? document.getElementById('enter__Callsign-image').querySelector('img') : null;
      const src = img ? (img.getAttribute('src')||'') : '';
      return { present: !!img, isDevicePhoto: src.startsWith('blob:'), isSilhouette: src.includes('androgynous') };
    })()`)
    check(`${callsign}: a photo element renders`, r.present, true)
    if (expectDevicePhoto) check(`${callsign}: uses the device photo`, r.isDevicePhoto, true)
    else check(`${callsign}: falls back to the silhouette, not a broken image`, r.isSilhouette, true)
  }
}

async function checkSettingsFormSave() {
  console.log('\nSettings form (Sprint D, Signal Forms): edit fields in the UI, Save, reload, values persisted')
  await goto('/settings')
  const before = await evaluate(`(() => {
    const mission = document.querySelector('input[placeholder="Mission #"]');
    const debugMode = document.querySelector('input[placeholder="debugMode"]');
    const setNative = (el, value) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setNative(mission, 'E2E-SIGNAL-FORMS');
    debugMode.checked = !debugMode.checked;
    const debugModeSet = debugMode.checked;
    // Signal Forms' [formField] only listens for 'input' (see nativeControlCreate in
    // @angular/forms/signals), same as every other control - not 'change'. A real click
    // fires both natively; this synthetic toggle needs 'input' explicitly.
    debugMode.dispatchEvent(new Event('input', { bubbles: true }));
    const saveBtn = document.querySelector('.settings__Save-button');
    return { hasMission: !!mission, hasDebugMode: !!debugMode, hasSaveBtn: !!saveBtn, saveDisabled: saveBtn?.disabled, debugModeSet };
  })()`)
  check('mission input found', before.hasMission, true)
  check('debugMode checkbox found', before.hasDebugMode, true)
  check('Save button found and not disabled by required-field validation', before.hasSaveBtn && !before.saveDisabled, true)

  await evaluate(`document.querySelector('.settings__Save-button').click()`)
  await sleep(3000) // onFormSubmit() writes localStorage synchronously, then window.location.reload()

  const after = await evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('appSettings') || '{}');
    return { mission: s.mission, debugMode: s.debugMode };
  })()`)
  check('edited mission value survived Save + reload', after.mission, 'E2E-SIGNAL-FORMS')
  check('edited debugMode value survived Save + reload', after.debugMode, before.debugModeSet)
}

async function checkMissionRoundTrip(downloads) {
  console.log('\nMission export -> wipe all storage -> import: the disaster path')
  await goto('/settings')
  await evaluate(`(() => { const s = JSON.parse(localStorage.getItem('appSettings')); s.mission = 'E2E-MISSION'; localStorage.setItem('appSettings', JSON.stringify(s)); })()`)
  await goto('/settings')
  await evaluate(`[...document.querySelectorAll('button')].find(b => /Export Mission/i.test(b.textContent))?.click()`)
  await sleep(3000)

  const files = fs.readdirSync(downloads).filter(f => f.endsWith('.json'))
  if (!check('Export Mission produced a file', files.length > 0, true)) return
  const missionFile = path.join(downloads, files[0])

  await goto('/settings')
  await evaluate(`localStorage.clear()`)
  await goto('/settings')
  await setFileInput('#importMissionFile', missionFile)
  await sleep(5000)

  const restored = await evaluate(`(() => {
    const r = JSON.parse(localStorage.getItem('rangers')||'[]');
    const s = JSON.parse(localStorage.getItem('appSettings')||'{}');
    return { rangers: r.length, mission: s.mission };
  })()`)
  check('mission import restores the roster after a wipe', restored.rangers > 0, true)
  check('mission import restores the mission name', restored.mission, 'E2E-MISSION')
}

// ── runner ───────────────────────────────────────────────────────────────────

function findChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN
  const candidates = process.platform === 'win32'
    ? [`${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`]
    : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  const hit = candidates.find(p => p && fs.existsSync(p))
  if (!hit) throw new Error('Chrome not found. Set CHROME_BIN.')
  return hit
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rangertrak-e2e-'))
  const profile = path.join(tmp, 'profile')
  const downloads = path.join(tmp, 'downloads')
  fs.mkdirSync(downloads, { recursive: true })

  console.log(`RangerTrak e2e`)
  console.log(`  target : ${BASE}`)
  console.log(`  mode   : ${READ_ONLY ? 'read-only' : 'read-write (will clear this profile\'s storage)'}`)

  const chrome = spawn(findChrome(), [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000', 'about:blank',
  ], { stdio: 'ignore' })

  const cleanup = () => {
    if (!KEEP_OPEN) { try { chrome.kill() } catch { } }
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch { }
  }

  try {
    // Wait for the debugger, rather than sleeping a guessed amount.
    let target
    for (let i = 0; i < 40 && !target; i++) {
      await sleep(250)
      try {
        const list = await (await fetch(`http://localhost:${PORT}/json/list`)).json()
        target = list.find(t => t.type === 'page')
      } catch { }
    }
    if (!target) throw new Error('Chrome did not expose a debugging target')

    ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
    ws.onmessage = async ev => {
      const m = JSON.parse(ev.data)
      if (m.id && pending.has(m.id)) {
        const { resolve, reject } = pending.get(m.id); pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
        return
      }
      if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.text)
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        consoleErrors.push(m.params.args.map(a => a.value ?? a.description).join(' '))
      } else if (m.method === 'Page.javascriptDialogOpening') {
        dialogs.push(m.params.message.split('\n')[0].slice(0, 100))
        await send('Page.handleJavaScriptDialog', { accept: true })
      }
    }

    await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable')
    await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })

    await checkRoutesRender()
    await checkNavbarLayout()
    // Read-only: pure DOM/layout reads and in-memory form edits, nothing persisted - so these
    // are safe against production too, which is where phone-width regressions actually bite.
    await checkEntryTabOrder()
    await checkEntryPhoneWidth()
    await checkLocationDdDdmDmsSync()

    if (READ_ONLY) {
      note('read-only: skipping roster, photo, submit and mission checks')
    } else {
      const fx = makeFixtures(path.join(tmp, 'fixtures'))
      await checkRosterLifecycle(fx)
      await checkFieldNameAliases(fx)
      await checkBundleZip(fx)
      await checkEntryPhoto()
      await checkEntryAutofocusAndReset() // submits a real report, so read-write only
      await checkSettingsFormSave()
      await checkMissionRoundTrip(downloads)
      await goto('/'); await evaluate(`localStorage.clear()`)
    }
  } finally {
    const failed = results.filter(r => !r.pass)
    console.log(`\n${results.length - failed.length}/${results.length} passed`)
    if (failed.length) {
      console.log('\nFAILURES:')
      failed.forEach(f => console.log(`  - ${f.label}: expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual)}`))
    }
    try { ws && ws.close() } catch { }
    cleanup()
    process.exit(failed.length ? 1 : 0)
  }
}

main().catch(e => { console.error(`\nHARNESS ERROR: ${e.message}`); process.exit(2) })
