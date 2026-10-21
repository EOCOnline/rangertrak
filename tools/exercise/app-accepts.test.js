// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Does the app accept what this tool writes? This test bundles the APP'S OWN code - parseReportPacket()
// from src/app/shared/export/report-packet.ts and mergeEntries() from src/app/domain/entry-merge.ts,
// read only, never edited - with esbuild (already a dev dependency of the Angular build), then
// runs a catch-up packet and a stress packet through them and checks every entry merges in.
// If esbuild or the sources are not there (a copy of tools/ on its own), the test is skipped.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { loadPackage, readPackageFolder } from './lib/package.js'
import { buildScript } from './lib/settings.js'
import { buildCatchUp } from './lib/packet.js'
import { stressPackets } from './lib/stress.js'
import { parseStamp } from './lib/time.js'

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..')
const SRC = path.join(ROOT, 'src', 'app')
const NOW = Date.UTC(2026, 9, 18, 15, 0)

async function loadAppCode() {
  const require = createRequire(import.meta.url)
  let esbuild
  try { esbuild = require(path.join(ROOT, 'node_modules', 'esbuild')) } catch { return null }
  if (!existsSync(path.join(SRC, 'domain', 'entry-merge.ts'))) return null
  const out = await esbuild.build({
    stdin: {
      contents: `export { parseReportPacket } from './shared/export/report-packet'\nexport { mergeEntries } from './domain/entry-merge'`,
      resolveDir: SRC, sourcefile: 'app-accepts-entry.ts', loader: 'ts',
    },
    bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent', tsconfigRaw: '{}',
  })
  const url = 'data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64')
  return import(url)
}

const app = await loadAppCode()
const skip = app ? false : 'esbuild or the app sources are not available'

test('app accepts: the Montecito catch-up packet parses and every entry merges in', { skip }, async () => {
  const pkg = loadPackage(await readPackageFolder(fileURLToPath(new URL('./samples/montecito', import.meta.url))))
  assert.ok(pkg.ok)
  const script = buildScript(pkg, {}).rows
  const r = buildCatchUp({ pkg, script, toMin: parseStamp('2018-01-09T07:00'), nowMs: NOW })
  assert.ok(r.count > 100)

  const parsed = app.parseReportPacket(r.text)          // the app's own parser, on the file text
  assert.equal(parsed.entries.length, r.count)
  assert.deepEqual(parsed.scenarioClock, r.packet.scenarioClock, 'the app keeps the scenarioClock from the packet')
  assert.ok(parsed.scenarioClock)
  const merged = app.mergeEntries([], parsed.entries, { nextId: 0 })
  assert.equal(merged.rejected, 0, JSON.stringify(merged.rejectedNotes.slice(0, 3)))
  assert.equal(merged.added, r.count)
  assert.ok(merged.entries.every(e => e.date instanceof Date), 'dates come back as Date objects')

  // Importing the same file again adds nothing; an overlapping one adds only the new rows.
  const again = app.mergeEntries(merged.entries, parsed.entries, { nextId: merged.nextId })
  assert.equal(again.added, 0); assert.equal(again.unchanged, r.count)
  const later = buildCatchUp({ pkg, script, toMin: parseStamp('2018-01-09T08:00'), nowMs: NOW })
  const overlap = app.mergeEntries(merged.entries, app.parseReportPacket(later.text).entries, { nextId: merged.nextId })
  assert.equal(overlap.rejected, 0)
  assert.equal(overlap.added, later.count - r.count)
})

test('app accepts: a stress packet parses and merges', { skip }, () => {
  const [p] = stressPackets({ rate: 500, hours: 1, nowMs: NOW })
  const parsed = app.parseReportPacket(p.text)
  const merged = app.mergeEntries([], parsed.entries, { nextId: 0 })
  assert.equal(merged.rejected, 0)
  assert.equal(merged.added, 500)
})

test('app accepts: the check can go red (a bad entry is rejected)', { skip }, () => {
  const bad = { id: 1, callsign: 'A', status: 'Normal', date: 'not a date', location: { lat: 1, lng: 1 } }
  const merged = app.mergeEntries([], [bad], { nextId: 0 })
  assert.equal(merged.rejected, 1)
  assert.throws(() => app.parseReportPacket('{"entries": []}'), /schemaVersion/)
})
