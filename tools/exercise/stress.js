#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.
//
// Stress injector: writes Report Packets of made-up traffic for testing operators and the app.
//
//   node tools/exercise/stress.js --rate=2000 --hours=3 --out=<dir>
//
//   --rate=N       entries per hour (required)
//   --hours=M      hours of traffic, ending now (required)
//   --out=<dir>    folder to write into (required; created if missing)
//   --split=MIN    one file per MIN minutes instead of one file
//   --seed=N       same seed, same traffic (default 1)
//   --scenario=<folder>   draw teams and places from a scenario package (default: made-up Fernhollow-style ones)
//
// The files are Report Packets (.txt) the app imports like any other; every entry is marked EXERCISE.
// Nothing is sent anywhere.
import fs from 'node:fs'
import path from 'node:path'
import { stressPackets } from './lib/stress.js'
import { loadPackage, readPackageFolder } from './lib/package.js'

function parseArgs(argv) {
  const out = {}
  for (const a of argv) {
    const m = /^--([a-z]+)=(.*)$/.exec(a)
    if (!m) throw new Error(`Unrecognised argument "${a}". Use --name=value.`)
    out[m[1]] = m[2]
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const unknown = Object.keys(args).filter(k => !['rate', 'hours', 'out', 'split', 'seed', 'scenario'].includes(k))
  if (unknown.length) throw new Error(`Unknown option --${unknown[0]}.`)
  const rate = Number(args.rate), hours = Number(args.hours)
  if (!(rate > 0) || !(hours > 0) || !args.out) {
    throw new Error('Usage: node tools/exercise/stress.js --rate=2000 --hours=3 --out=<dir> [--split=30] [--seed=1] [--scenario=<folder>]')
  }
  let scenarioPkg = null
  if (args.scenario) {
    scenarioPkg = loadPackage(await readPackageFolder(args.scenario))
    if (!scenarioPkg.ok) throw new Error(`The scenario package has errors:\n  ${scenarioPkg.errors.join('\n  ')}`)
  }
  const files = stressPackets({
    rate, hours, nowMs: Date.now(), seed: args.seed ? Number(args.seed) : 1,
    splitMinutes: args.split ? Number(args.split) : 0, scenarioPkg,
  })
  fs.mkdirSync(args.out, { recursive: true })
  for (const f of files) fs.writeFileSync(path.join(args.out, f.filename), f.text, 'utf8')
  const total = files.reduce((a, f) => a + f.count, 0)
  console.log(`Wrote ${files.length} file${files.length === 1 ? '' : 's'} (${total} entries) to ${path.resolve(args.out)}`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
