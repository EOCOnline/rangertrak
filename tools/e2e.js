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

/**
 * Navigates by CLICKING a nav link, i.e. Angular client-side routing - not a page load.
 *
 * This distinction turned out to be load-bearing. goto() issues Page.navigate, which is a
 * full reload: every service is reconstructed and re-reads localStorage, so state is always
 * fresh. Users don't do that - they click the nav, services stay alive, and stale in-memory
 * state survives. Two production bugs reported on 2026-08-19 reproduce ONLY this way and
 * were invisible to a suite that navigated exclusively by reload.
 */
async function navigateInApp(linkText, settleMs = 2500) {
  consoleErrors.length = 0
  const clicked = await evaluate(`(() => {
    const link = [...document.querySelectorAll('.main-nav ul a')]
      .find(a => a.textContent.trim().toLowerCase() === ${JSON.stringify(linkText)}.toLowerCase());
    if (!link) return false;
    link.click();
    return true;
  })()`)
  if (!clicked) throw new Error(`no nav link labelled "${linkText}"`)
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

/**
 * Bugs KNOWN to be open and not yet fixed.
 *
 * A permanently red suite is one people stop reading, so these are tracked separately:
 * reported as KNOWN rather than FAIL, and they do not fail the run. If one starts PASSING
 * that is announced loudly - it means the fix landed and the entry should be deleted from
 * here. See the Sprint E plan's "Known-open production bugs" section for diagnoses.
 */
// All three 2026-08-19 production bugs are fixed as of this commit - see the Sprint E plan's
// "Known-open production bugs" section for the (now-historical) diagnoses. Empty rather than
// deleted: the mechanism stays ready for whatever's found next.
const KNOWN_OPEN = new Set([])

function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  const known = KNOWN_OPEN.has(label)
  results.push({ pass, label, actual, expected, known })
  console.log(`  ${pass ? (known ? 'FIXED!' : 'PASS  ') : (known ? 'KNOWN ' : 'FAIL  ')}${label}`)
  if (!pass && !known) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  if (pass && known) console.log(`        ^ on the KNOWN_OPEN list but passing - delete it from that list`)
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

  // Poll for both photo keys rather than a flat sleep(7000): two IndexedDB photo writes
  // sometimes take longer than that under load. This check passed reliably earlier in this
  // same session, then failed twice in a row later, always missing exactly the SECOND
  // photo - the classic signature of a timeout that is usually enough but not tied to the
  // real completion condition. Same fix already applied twice elsewhere in this file.
  const readState = `(async () => {
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
  })()`

  let r = { rangers: 0, photoKeys: [] }
  for (let i = 0; i < 20 && r.photoKeys.length < 2; i++) {
    await sleep(500)
    r = await evaluate(readState)
  }
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

  // The regression this guards is an edit being LOST - the old debounce/merge dispatcher
  // swallowed a second field change that arrived inside its ~300ms window.
  //
  // Deliberately NOT asserted: two edits inside the same microtask. That genuinely does drop
  // the second, because the first edit's canonical->linkedSignal recompute writes model-derived
  // values back to the DOM before change detection has seen the second. It is also not
  // reachable by a human - every real keystroke gets its own task with CD in between - and an
  // earlier draft of this check that fired both edits ~60ms apart sat right on the CD boundary
  // and failed intermittently. So: drive each edit the way a fast typist would (wait for the
  // first to be visibly reflected, then immediately make the second), and assert the thing that
  // actually matters - that neither field clobbered the other.
  const rapid = await evaluate(`(async () => {
    const set = (id, v) => {
      const el = document.getElementById(id);
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const g = id => document.getElementById(id).value;
    const until = async (id, want) => {
      for (let i = 0; i < 40; i++) {
        if (Number(g(id)) === want) return true;
        await new Promise(r => setTimeout(r, 50));
      }
      return false;
    };

    set('enter__Where-latI', 45);
    const latLanded = await until('enter__Where-latDdmD', 45);
    set('enter__Where-lngI', -120);           // immediately follows, no artificial pause
    const lngLanded = await until('enter__Where-lngDdmD', -120) || await until('enter__Where-lngDdmD', 120);

    await new Promise(r => setTimeout(r, 400));  // let everything settle, then re-read BOTH
    return { latLanded, lngLanded, latFinal: g('enter__Where-latDdmD'), lngFinal: g('enter__Where-lngDdmD') };
  })()`)
  check('a lat edit lands', rapid.latLanded, true)
  check('a lng edit immediately after it also lands', rapid.lngLanded, true)
  // The real prize: the second edit must not have reverted the first.
  check('the lat edit survives the lng edit that followed it', Number(rapid.latFinal), 45)
  check('the lng edit is still there too', Math.abs(Number(rapid.lngFinal)), 120)
}

/**
 * Runs `body` with the browser emulating a given prefers-color-scheme, then restores.
 *
 * ADR D-24 requires verifying both colour schemes, but until Sprint E nothing in this harness
 * actually exercised them - every check ran in whatever scheme the headless default happened
 * to be. Light/dark is exactly where the token layer can silently fail (a colour defined in
 * one scheme and not the other is how the pre-Sprint-A dark mode broke).
 */
async function withColorScheme(scheme, body) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
  try {
    return await body()
  } finally {
    await send('Emulation.setEmulatedMedia', { features: [] })
  }
}

async function checkStatusColorsBothSchemes() {
  console.log(String.fromCharCode(10) + 'Status colours resolve per colour scheme (the point of storing keys, not hex)')
  const read = async () => {
    await goto('/')
    return evaluate(`[...document.querySelectorAll('.Enter__status-value')].map(s => getComputedStyle(s).color)`)
  }
  const light = await withColorScheme('light', read)
  const dark = await withColorScheme('dark', read)

  check('status labels render in light scheme', light.length > 0, true)
  check('status labels render in dark scheme', dark.length, light.length)

  // checkStatusColorMigration() above seeds six token-backed statuses plus ONE deliberately
  // customised hex (#FF00FF on Urgent). That split is the whole design in miniature, so assert
  // both halves of it: keys adapt per scheme, a custom colour is left exactly as the user set
  // it. A stored hex simply cannot adapt - it is one colour - which is why the migration moved
  // the defaults to keys and why keeping a custom override means accepting this tradeoff.
  const tokenBacked = light.slice(0, 6)
  check('every token-backed status colour changes with the scheme',
    tokenBacked.length === 6 && tokenBacked.every((c, i) => c !== dark[i]), true)
  check('a user-chosen custom colour stays put across schemes', light[6], dark[6])
  if (light.length) note(`token light[0]=${light[0]} dark[0]=${dark[0]} | custom light[6]=${light[6]} dark[6]=${dark[6]}`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  KNOWN-OPEN BUGS, reported from production v0.15.8 on 2026-08-19.
//
//  These three checks are EXPECTED TO FAIL until the fixes land. They are committed
//  failing on purpose: each one reproduces a real defect a user hit on rangertrak.org that
//  this suite did not catch, and a red check is the only honest record of that. See the
//  Sprint E plan's "Known-open production bugs" section for the diagnosis and fix plan.
// ─────────────────────────────────────────────────────────────────────────────

async function checkCallsignIsSaved() {
  console.log('\nBUG-1 (open): the callsign chosen on Entry must reach the saved report')
  await goto('/')
  const saved = await evaluate(`(async () => {
    const input = document.getElementById('enter__Callsign-input');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(input, 'E2E-AA1');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1200));   // past the 700ms autocomplete debounce
    document.querySelector('.enter__Submit-button').click();
    await new Promise(r => setTimeout(r, 1200));
    const reports = JSON.parse(localStorage.getItem('fieldReports') || '{}');
    const list = reports.fieldReportArray || [];
    const last = list[list.length - 1] || {};
    return { count: list.length, callsign: last.callsign, typedInto: 'E2E-AA1' };
  })()`)
  check('a report was actually stored', saved.count > 0, true)
  // The input has BOTH [formControl]="callsignCtrl" AND formControlName="callsign"; only one
  // can be the value accessor, so entryControlsForm.callsign never receives what was typed
  // and mergedFormValue() saves ''. The ICS-309 log is worthless without who filed the report.
  check('the saved report carries the callsign that was entered', saved.callsign, 'E2E-AA1')
}

async function checkReportsSurviveNavigation() {
  console.log('\nBUG-2 (open): reports entered on Entry must be visible on the Reports page')
  await goto('/')
  await evaluate(`localStorage.removeItem('fieldReports')`)
  await goto('/')

  for (const note of ['E2E-FIRST', 'E2E-SECOND']) {
    await evaluate(`(async () => {
      const ta = document.querySelector('textarea[placeholder="Enter Any Notes"]');
      if (ta) {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(ta, ${JSON.stringify(note)});
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await new Promise(r => setTimeout(r, 300));
      document.querySelector('.enter__Submit-button').click();
      await new Promise(r => setTimeout(r, 1200));
    })()`)
  }

  const stored = await evaluate(`(() => {
    const r = JSON.parse(localStorage.getItem('fieldReports') || '{}');
    return (r.fieldReportArray || []).length;
  })()`)
  check('both reports reached storage', stored, 2)

  // Click through, do NOT reload: a reload rebuilds every service and hides the bug.
  await navigateInApp('Reports', 3500)
  const shown = await evaluate(`(() => {
    const rows = document.querySelectorAll('.ag-center-cols-container .ag-row');
    return rows.length;
  })()`)
  // Entry declares providers:[FieldReportService,...], so it edits its OWN instance while the
  // Reports page reads the root one, which still holds its stale in-memory list.
  check('the Reports grid shows the reports that were just entered', shown, 2)
}

async function checkSettingsWithPersistedSettings() {
  console.log('\nBUG-3 (open): /settings must not throw for a RETURNING user (dates as ISO strings)')
  // A fresh browser gets initSettings() with real Date objects and never reproduces this.
  // A returning user's settings have round-tripped through JSON, so opPeriodStart/End come
  // back as STRINGS - which is the case the Settings page actually fails on. Seed that shape.
  await goto('/settings')
  await evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('appSettings'));
    s.opPeriodStart = new Date('2025-08-24T17:34:40.396Z').toISOString();
    s.opPeriodEnd = new Date('2025-08-25T05:34:40.396Z').toISOString();
    s.settingsDate = new Date('2025-08-24T17:34:40.396Z').toISOString();
    // The reporter's stored settings PREDATE googleGeocodingApiKey, so the key is simply
    // absent. settings-maps-section binds [formField]="form.googleGeocodingApiKey", and
    // Signal Forms cannot build a field for a property the model does not have. Reproduce
    // the real shape by removing it, not just by ageing the dates.
    delete s.googleGeocodingApiKey;
    delete s.schemaVersion;
    localStorage.setItem('appSettings', JSON.stringify(s));
  })()`)

  // Reached by CLICKING through, as the reporter did - the failure needs the live services
  // and the router, not a fresh page load.
  await goto('/')
  await navigateInApp('Rangers')
  await navigateInApp('Settings', 6000)   // the error repeats about once a second; give it room
  const errs = consoleErrors.slice(0, 3)
  check('the Settings page throws nothing for a returning user', errs, [])
  if (errs.length) note(`first error: ${String(errs[0]).slice(0, 160)}`)
}

async function checkStatusColorMigration() {
  console.log('\nSettings migration: v0 status colours upgrade to accessible semantic keys')

  // Seed a genuine pre-Sprint-E settings object: no schemaVersion, CSS named colours, and a
  // deliberately customised one that migration must NOT touch.
  await goto('/settings')
  await evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('appSettings'));
    delete s.schemaVersion;
    s.fieldReportStatuses = [
      { status: 'Normal', color: 'LightYellow', icon: 'a.png' },
      { status: 'Location Report', color: 'Aquamarine', icon: 'b.png' },
      { status: 'Evidence Report', color: 'DarkGoldenrod', icon: 'c.png' },
      { status: 'Need Rest/Food', color: 'Chartreuse', icon: 'd.png' },
      { status: 'Incident Check-in', color: 'Silver', icon: 'e.png' },
      { status: 'Incident Check-out', color: 'DimGray', icon: 'f.png' },
      { status: 'Urgent', color: '#FF00FF', icon: 'g.png' },
    ];
    s.defFieldReportStatus = 3;
    localStorage.setItem('appSettings', JSON.stringify(s));
  })()`)

  await goto('/settings')
  const migrated = await evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('appSettings'));
    return {
      schemaVersion: s.schemaVersion,
      colors: s.fieldReportStatuses.map(x => x.color),
      defaultStatus: s.fieldReportStatuses[s.defFieldReportStatus].status,
    };
  })()`)
  // Not pinned to a literal: SETTINGS_SCHEMA_VERSION moves as migration steps are added
  // (it went 1 -> 2 for BUG-3, 2026-08-19), and this check has no way to import the TS
  // constant from a page evaluate() string. The real assertion is just "some migration ran".
  check('a v0 settings object is stamped with a schema version', migrated.schemaVersion >= 1, true)
  check('legacy default colours become semantic keys', migrated.colors.slice(0, 6),
    ['normal', 'location-report', 'evidence-report', 'need-rest-food', 'incident-check-in', 'incident-check-out'])
  check('a user-customised colour survives migration', migrated.colors[6], '#FF00FF')
  // defFieldReportStatus is an index, so a reordering migration would silently repoint it.
  check('defFieldReportStatus still points at the same status', migrated.defaultStatus, 'Need Rest/Food')

  // The whole point of the exercise: the Entry radios must now paint from the token layer.
  await goto('/')
  const painted = await evaluate(`(() => {
    const spans = [...document.querySelectorAll('.Enter__status-value')];
    const styles = spans.map(s => getComputedStyle(s).color);
    return {
      count: spans.length,
      // 'LightYellow' would compute to rgb(255,255,224); a resolved token will not.
      anyLightYellow: styles.includes('rgb(255, 255, 224)'),
      allResolved: styles.every(c => c.indexOf('rgb') === 0),
      inlineAttrs: spans.filter(s => (s.getAttribute('style') || '').includes('text-shadow')).length,
    };
  })()`)
  check('every status radio label renders', painted.count > 0, true)
  check('no radio label is still painted LightYellow (1.07:1 on white)', painted.anyLightYellow, false)
  check('every radio label resolves to a real colour', painted.allResolved, true)
  check('the contrast-rescue text-shadow is gone', painted.inlineAttrs, 0)
}

async function checkEntryPhoto() {
  console.log('\nEntry form: the photo that confirms who a report is about (E-38)')
  for (const [callsign, expectDevicePhoto] of [['E2E-AA1', true], ['E2E-BB2', false]]) {
    await goto('/')
    const r = await evaluate(`(async () => {
      // #enter__Callsign-input is a stable id in the template; formcontrolname="callsign" was
      // REMOVED from this element as part of the BUG-1 fix (2026-08-19, callsignCtrl became
      // the single source of truth) and the old selector's querySelector('input') fallback
      // was silently grabbing the wrong element - first <input> in DOM order, not callsign.
      const input = document.getElementById('enter__Callsign-input');
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

  // Poll rather than sleep a fixed 3s: the download is disk+Chrome timing, and a flat wait
  // made this check fail intermittently on an otherwise-green run. Waiting for the condition
  // is both faster in the normal case and stable in the slow one. (.crdownload is Chrome's
  // in-progress marker, so only settled files count.)
  let files = []
  for (let i = 0; i < 40 && files.length === 0; i++) {
    await sleep(250)
    files = fs.readdirSync(downloads).filter(f => f.endsWith('.json') && !f.endsWith('.crdownload'))
  }
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
      await checkStatusColorMigration()
      await checkStatusColorsBothSchemes()

      // Known-open production bugs - see the banner above these three.
      await checkCallsignIsSaved()
      await checkReportsSurviveNavigation()
      await checkSettingsWithPersistedSettings()
      await checkMissionRoundTrip(downloads)
      await goto('/'); await evaluate(`localStorage.clear()`)
    }
  } catch (e) {
    // Without this, a throw inside any check (a bad selector, a malformed evaluate()) was
    // silently swallowed: the finally below calls process.exit() before main()'s own .catch()
    // can run, so the suite reported PASS while quietly skipping every remaining check. Found
    // exactly that way - a broken regex ate checkStatusColorMigration and checkMissionRoundTrip
    // and the run still exited 0.
    check(`harness completed without throwing (${e && e.message ? e.message : e})`, false, true)
  } finally {
    const failed = results.filter(r => !r.pass && !r.known)
    const knownOpen = results.filter(r => !r.pass && r.known)
    const fixed = results.filter(r => r.pass && r.known)
    console.log(`\n${results.filter(r => r.pass).length}/${results.length} passed`)
    if (knownOpen.length) {
      console.log(`\nKNOWN-OPEN (${knownOpen.length}) - already reported, not yet fixed; does not fail the run:`)
      knownOpen.forEach(f => console.log(`  - ${f.label}`))
    }
    if (fixed.length) {
      console.log(`\nNOW FIXED (${fixed.length}) - delete these from KNOWN_OPEN:`)
      fixed.forEach(f => console.log(`  - ${f.label}`))
    }
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
