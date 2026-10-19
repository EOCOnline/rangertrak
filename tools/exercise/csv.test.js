// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, toCsv } from './lib/csv.js'
import { parseStamp, formatStamp } from './lib/time.js'

test('csv: quoted commas, doubled quotes and embedded newlines', () => {
  const { rows, errors } = parseCsv('id,msg,n\r\nA,"one, two",1\r\nB,"say ""go""",2\r\nC,"line1\nline2",3\r\n')
  assert.deepEqual(errors, [])
  assert.equal(rows.length, 3)
  assert.equal(rows[0].msg, 'one, two')
  assert.equal(rows[1].msg, 'say "go"')
  assert.equal(rows[2].msg, 'line1\nline2')
  assert.equal(rows[2]._line, 4)
})

test('csv: BOM, LF-only, blank lines and a missing final newline', () => {
  const { header, rows, errors } = parseCsv('﻿a,b\n1,2\n\n3,4')
  assert.deepEqual(header, ['a', 'b'])
  assert.deepEqual(errors, [])
  assert.equal(rows.length, 2)
  assert.equal(rows[1].b, '4')
})

test('csv: empty cells survive, and a wrong width is reported, not guessed', () => {
  const { rows, errors } = parseCsv('a,b,c\n1,,3\n4,5\n6,7,8,9\n')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].b, '')
  assert.equal(errors.length, 2)
  assert.match(errors[0], /Line 3/)
})

test('csv: an unterminated quote is an error', () => {
  const r = parseCsv('a,b\n1,"oops\n')
  assert.equal(r.rows.length, 0)
  assert.match(r.errors[0], /quoted/)
})

test('csv: toCsv round trips awkward cells', () => {
  const cols = ['a', 'b']
  const objs = [{ a: 'x,y', b: 'q"r' }, { a: 'l1\nl2', b: '' }]
  const back = parseCsv(toCsv(cols, objs)).rows
  assert.equal(back[0].a, 'x,y'); assert.equal(back[0].b, 'q"r'); assert.equal(back[1].a, 'l1\nl2')
})

test('time: stamps parse to exact minutes and refuse impossible dates', () => {
  assert.equal(parseStamp('2018-01-09T03:45') - parseStamp('2018-01-09T03:00'), 45)
  assert.equal(parseStamp('2018-01-09T00:00') - parseStamp('2018-01-08T00:00'), 1440)
  assert.ok(Number.isNaN(parseStamp('2018-02-30T10:00')))
  assert.ok(Number.isNaN(parseStamp('nope')))
  assert.equal(formatStamp(parseStamp('2018-01-09T03:45')), '2018-01-09T03:45')
})
