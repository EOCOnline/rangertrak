// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The two sides of the "scenario traffic" rule must agree on the controller's name (ADR D-66).
// The console writes it into every entry (EXERCISE_OPERATOR in lib/packet.js); the app marks an entry
// as scenario traffic when its operator equals EXERCISE_CONTROLLER in src/app/domain/scenario.ts.
// This test reads the app's source text, so renaming either side alone goes red.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { EXERCISE_OPERATOR } from './lib/packet.js'

const APP_FILE = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'src', 'app', 'domain', 'scenario.ts')
const skip = existsSync(APP_FILE) ? false : 'the app sources are not available (a copy of tools/ on its own)'

/** The string the app assigns to EXERCISE_CONTROLLER, or null when the line is not found. */
export function appControllerName(source) {
  const m = /export const EXERCISE_CONTROLLER\s*=\s*(['"`])(.*?)\1/.exec(source)
  return m ? m[2] : null
}

test('the app and the console name the exercise controller the same', { skip }, () => {
  const app = appControllerName(readFileSync(APP_FILE, 'utf8'))
  assert.ok(app, 'EXERCISE_CONTROLLER was not found in src/app/domain/scenario.ts')
  assert.equal(app, EXERCISE_OPERATOR)
})

test('the check can go red (a renamed constant on either side is caught)', () => {
  assert.equal(appControllerName("export const EXERCISE_CONTROLLER = 'EXERCISE controller'"), 'EXERCISE controller')
  assert.notEqual(appControllerName("export const EXERCISE_CONTROLLER = 'Exercise controller'"), EXERCISE_OPERATOR)
  assert.equal(appControllerName('export const SOMETHING_ELSE = 1'), null)
})
