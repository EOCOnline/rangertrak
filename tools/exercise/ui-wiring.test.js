// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The console pages cannot be opened by a script here (no browsers are launched), so this checks
// the wiring that a browser would trip over: every element id console.js and room.js look up exists
// in the HTML, every lib module they import exists, and every page carries the EXERCISE banner.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const read = f => readFileSync(path.join(DIR, f), 'utf8')
const idsIn = html => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))

for (const [html, js] of [['console.html', 'console.js'], ['room.html', 'room.js']]) {
  test(`${js}: every $('id') exists in ${html}`, () => {
    const have = idsIn(read(html))
    const want = [...read(js).matchAll(/\$\('([^']+)'\)/g)].map(m => m[1])
    assert.ok(want.length >= 3)
    assert.deepEqual([...new Set(want)].filter(id => !have.has(id)), [])
  })

  test(`${js}: imports resolve to files that exist`, () => {
    for (const m of read(js).matchAll(/from '(\.\/[^']+)'/g)) assert.ok(existsSync(path.join(DIR, m[1])), m[1])
    assert.ok(read(html).includes(`src="${js}"`))
  })

  test(`${html}: carries the EXERCISE banner`, () => {
    assert.match(read(html), /EXERCISE.*EXERCISE.*EXERCISE/s)
  })
}

test('console.html: each tab button has a section, and the stylesheet exists', () => {
  const html = read('console.html')
  const have = idsIn(html)
  for (const m of html.matchAll(/data-tab="([^"]+)"/g)) assert.ok(have.has(`tab-${m[1]}`), m[1])
  assert.ok(existsSync(path.join(DIR, 'console.css')))
})

test('console.js and room.js use the same room channel name', () => {
  const name = src => /CHANNEL_NAME = '([^']+)'/.exec(src)?.[1]
  assert.ok(name(read('console.js')))
  assert.equal(name(read('console.js')), name(read('room.js')))
})

test('the pages load nothing from the network', () => {
  for (const f of ['console.html', 'room.html', 'console.js', 'room.js', 'console.css']) {
    assert.doesNotMatch(read(f).replace(/<!--[\s\S]*?-->/g, ''), /(src|href)="https?:|@import|fetch\(['"`]https?:/, f)
  }
})
