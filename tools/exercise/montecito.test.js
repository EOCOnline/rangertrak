// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { loadPackage, readPackageFolder } from './lib/package.js'

const DIR = fileURLToPath(new URL('./samples/montecito', import.meta.url))

test('montecito sample: loads with no validation errors', async () => {
  const p = loadPackage(await readPackageFolder(DIR))
  assert.deepEqual(p.errors, [])
  assert.ok(p.ok)
  assert.equal(p.msel.length, 437)
  assert.equal(p.places.length, 61)
  assert.equal(p.teams.length, 31)
  assert.deepEqual(p.opPeriods.map(o => o.n), [0, 1, 2])
  assert.ok(p.hasCasualty)
  assert.ok(p.scenario.contentNote.length > 20)
})

test('montecito sample: P28 label keeps its comma (the quoted fix)', async () => {
  const p = loadPackage(await readPackageFolder(DIR))
  assert.equal(p.places.find(x => x.id === 'P28').label, 'Corridor E (east, Toro/Sun Valley) mid')
})
