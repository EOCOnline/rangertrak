const test = require('node:test');
const assert = require('node:assert');
const { classifyIPv4, privateAddresses } = require('./net');

test('classifyIPv4: RFC 1918 ranges, edges included', () => {
  for (const ip of ['10.0.0.1', '10.255.255.254', '172.16.0.1', '172.31.255.1', '192.168.0.10']) {
    assert.strictEqual(classifyIPv4(ip), 'private', ip);
  }
  for (const ip of ['172.15.255.255', '172.32.0.1', '192.167.1.1', '192.169.1.1', '11.0.0.1']) {
    assert.strictEqual(classifyIPv4(ip), 'public', ip);
  }
});

test('classifyIPv4: link-local, loopback, carrier-grade NAT, garbage', () => {
  assert.strictEqual(classifyIPv4('169.254.10.20'), 'link-local');
  assert.strictEqual(classifyIPv4('169.253.10.20'), 'public');
  assert.strictEqual(classifyIPv4('127.0.0.1'), 'loopback');
  assert.strictEqual(classifyIPv4('127.5.5.5'), 'loopback');
  assert.strictEqual(classifyIPv4('100.64.1.1'), 'public');
  assert.strictEqual(classifyIPv4('8.8.8.8'), 'public');
  assert.strictEqual(classifyIPv4('fe80::1'), null);
  assert.strictEqual(classifyIPv4('999.1.1.1'), null);
  assert.strictEqual(classifyIPv4('not an ip'), null);
});

test('privateAddresses: splits listen / lan / skipped and ignores IPv6', () => {
  const nets = {
    lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    wifi: [
      { family: 'IPv6', address: 'fe80::1', internal: false },
      { family: 'IPv4', address: '192.168.1.7', internal: false },
    ],
    eth: [{ family: 'IPv4', address: '203.0.113.9', internal: false }],
    auto: [{ family: 4, address: '169.254.3.3', internal: false }],
    dup: [{ family: 'IPv4', address: '192.168.1.7', internal: false }],
  };
  assert.deepStrictEqual(privateAddresses(nets), {
    listen: ['127.0.0.1', '192.168.1.7', '169.254.3.3'],
    lan: ['192.168.1.7', '169.254.3.3'],
    skipped: ['203.0.113.9'],
  });
});

test('privateAddresses: no private address leaves lan empty', () => {
  const r = privateAddresses({ eth: [{ family: 'IPv4', address: '198.51.100.4' }], lo: [{ family: 'IPv4', address: '127.0.0.1' }] });
  assert.deepStrictEqual(r.lan, []);
  assert.deepStrictEqual(r.skipped, ['198.51.100.4']);
});

test('privateAddresses: tolerates empty input', () => {
  assert.deepStrictEqual(privateAddresses({}), { listen: [], lan: [], skipped: [] });
  assert.deepStrictEqual(privateAddresses(undefined), { listen: [], lan: [], skipped: [] });
});
