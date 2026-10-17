const test = require('node:test');
const assert = require('node:assert');
const { encodeQuery, encodeAnswer, decodeMessage, isConflict, sanitizeLabel } = require('./mdns');

// "rangertrak-board.local" on the wire: length-prefixed labels, zero terminator.
const NAME_HEX = '10' + '72616e6765727472616b2d626f617264' + '05' + '6c6f63616c' + '00';

test('encodeQuery: header, one A/IN question, no answers', () => {
  const expected = '000000000001000000000000' + NAME_HEX + '00010001';
  assert.strictEqual(encodeQuery('rangertrak-board.local').toString('hex'), expected);
});

test('encodeAnswer: authoritative response, cache-flush bit, TTL, one A record per address', () => {
  const packet = encodeAnswer('rangertrak-board.local', ['192.168.1.7', '10.0.0.5'], 120);
  const expected = '0000' + '8400' + '0000' + '0002' + '00000000'
    + NAME_HEX + '0001' + '8001' + '00000078' + '0004' + 'c0a80107'
    + NAME_HEX + '0001' + '8001' + '00000078' + '0004' + '0a000005';
  assert.strictEqual(packet.toString('hex'), expected);
});

test('decodeMessage: reads back what encodeAnswer wrote', () => {
  const m = decodeMessage(encodeAnswer('rangertrak-board.local', ['192.168.1.7'], 0));
  assert.strictEqual(m.response, true);
  assert.deepStrictEqual(m.records.map((r) => [r.name, r.type, r.address, r.ttl, r.flush]),
    [['rangertrak-board.local', 1, '192.168.1.7', 0, true]]);
});

test('decodeMessage: a query', () => {
  const m = decodeMessage(encodeQuery('rangertrak-board.local'));
  assert.strictEqual(m.response, false);
  assert.deepStrictEqual(m.questions, [{ name: 'rangertrak-board.local', type: 1, class: 1, unicast: false }]);
});

// A captured-style answer from another responder: the question is echoed, and the answer's name
// is a two-byte pointer (c00c = "the name at offset 12") instead of being spelled out again.
const COMPRESSED_ANSWER_HEX = '0000' + '8400' + '0001' + '0001' + '0000' + '0000'
  + NAME_HEX + '0001' + '0001'
  + 'c00c' + '0001' + '8001' + '00000078' + '0004' + 'c0a80109';

test('decodeMessage: follows a compressed name in an answer', () => {
  const m = decodeMessage(Buffer.from(COMPRESSED_ANSWER_HEX, 'hex'));
  assert.strictEqual(m.questions[0].name, 'rangertrak-board.local');
  assert.strictEqual(m.records.length, 1);
  assert.strictEqual(m.records[0].name, 'rangertrak-board.local');
  assert.strictEqual(m.records[0].address, '192.168.1.9');
  assert.strictEqual(m.records[0].ttl, 120);
});

test('decodeMessage: rejects a pointer loop, a truncated packet, and a short header', () => {
  // The answer's name is a pointer to itself (offset 12).
  const loop = Buffer.from('000084000000000100000000' + 'c00c' + '00010001' + '00000078' + '0004' + 'c0a80101', 'hex');
  assert.throws(() => decodeMessage(loop), /loop/);
  assert.throws(() => decodeMessage(Buffer.from(COMPRESSED_ANSWER_HEX.slice(0, 90), 'hex')));
  assert.throws(() => decodeMessage(Buffer.alloc(5)));
});

test('isConflict: another device answering for our name is a conflict', () => {
  const theirs = decodeMessage(Buffer.from(COMPRESSED_ANSWER_HEX, 'hex'));
  assert.strictEqual(isConflict(theirs, 'rangertrak-board.local', '192.168.1.9', ['192.168.1.7']), true);
  assert.strictEqual(isConflict(theirs, 'RangerTrak-Board.local', '192.168.1.9', ['192.168.1.7']), true);
});

test('isConflict: an answer from our own address (a quick restart) is not', () => {
  const ours = decodeMessage(Buffer.from(COMPRESSED_ANSWER_HEX, 'hex'));
  assert.strictEqual(isConflict(ours, 'rangertrak-board.local', '192.168.1.9', ['192.168.1.9', '10.0.0.5']), false);
});

test('isConflict: queries and answers for other names are not', () => {
  const query = decodeMessage(encodeQuery('rangertrak-board.local'));
  assert.strictEqual(isConflict(query, 'rangertrak-board.local', '192.168.1.9', []), false);
  const theirs = decodeMessage(Buffer.from(COMPRESSED_ANSWER_HEX, 'hex'));
  assert.strictEqual(isConflict(theirs, 'rangertrak-board-2.local', '192.168.1.9', []), false);
});

test('sanitizeLabel', () => {
  assert.strictEqual(sanitizeLabel('Camp Hope.local'), 'camp-hope');
  assert.strictEqual(sanitizeLabel(' --Board_1-- '), 'board-1');
});
