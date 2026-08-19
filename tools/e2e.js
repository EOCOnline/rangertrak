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

    if (READ_ONLY) {
      note('read-only: skipping roster, photo and mission checks')
    } else {
      const fx = makeFixtures(path.join(tmp, 'fixtures'))
      await checkRosterLifecycle(fx)
      await checkFieldNameAliases(fx)
      await checkBundleZip(fx)
      await checkEntryPhoto()
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
