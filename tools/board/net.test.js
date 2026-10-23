const test = require('node:test');
const assert = require('node:assert');
const { classifyIPv4, privateAddresses, isVirtualAdapter } = require('./net');

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
    virtual: [],
  });
});

test('privateAddresses: no private address leaves lan empty', () => {
  const r = privateAddresses({ eth: [{ family: 'IPv4', address: '198.51.100.4' }], lo: [{ family: 'IPv4', address: '127.0.0.1' }] });
  assert.deepStrictEqual(r.lan, []);
  assert.deepStrictEqual(r.skipped, ['198.51.100.4']);
});

test('privateAddresses: tolerates empty input', () => {
  assert.deepStrictEqual(privateAddresses({}), { listen: [], lan: [], skipped: [], virtual: [] });
  assert.deepStrictEqual(privateAddresses(undefined), { listen: [], lan: [], skipped: [], virtual: [] });
});

test('isVirtualAdapter: names of virtual machines, containers, tunnels and capture drivers', () => {
  for (const n of ['vEthernet (WSL)', 'vEthernet (Default Switch)', 'VirtualBox Host-Only Network', 'VMware Network Adapter VMnet8',
    'VMnet1', 'docker0', 'br-3f2a1c', 'veth12ab', 'Npcap Loopback Adapter', 'TAP-Windows Adapter V9', 'NordLynx', 'ZeroTier One [8056]',
    'utun3', 'Ethernet 2 (Hyper-V Virtual Ethernet Adapter)']) assert.strictEqual(isVirtualAdapter(n), true, n);
  // The real ones, including Windows' own hotspot, must never be treated as virtual.
  for (const n of ['Wi-Fi', 'Wi-Fi 2', 'Ethernet', 'Ethernet 3', 'en0', 'en1', 'wlan0', 'eth0', 'Local Area Connection* 10', 'Local Area Connection* 2', 'lo', '']) {
    assert.strictEqual(isVirtualAdapter(n), false, n);
  }
  assert.strictEqual(isVirtualAdapter(undefined), false);
});

test('privateAddresses: virtual adapters are left out of listen and lan, and named in virtual', () => {
  const r = privateAddresses({
    lo: [{ family: 'IPv4', address: '127.0.0.1' }],
    'Wi-Fi': [{ family: 'IPv4', address: '192.168.1.7' }],
    'Local Area Connection* 10': [{ family: 'IPv4', address: '192.168.137.1' }],
    'vEthernet (WSL)': [{ family: 'IPv4', address: '172.28.64.1' }],
    'vEthernet (Default Switch)': [{ family: 'IPv4', address: '172.24.16.1' }],
    docker0: [{ family: 'IPv4', address: '203.0.113.50' }],
  });
  assert.deepStrictEqual(r.listen, ['127.0.0.1', '192.168.1.7', '192.168.137.1']);
  assert.deepStrictEqual(r.lan, ['192.168.1.7', '192.168.137.1']);
  assert.deepStrictEqual(r.skipped, []);
  assert.deepStrictEqual(r.virtual, [
    { name: 'vEthernet (WSL)', address: '172.28.64.1' },
    { name: 'vEthernet (Default Switch)', address: '172.24.16.1' },
    { name: 'docker0', address: '203.0.113.50' },
  ]);
});
