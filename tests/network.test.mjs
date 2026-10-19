import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIPv4, formatIPv4, parsePrefix, calculateSubnet, createChallenge, checkAnswer, IPv4Error } from '../dist/assets/network.mjs';

test('IPv4: extremes and values above signed integer range', () => {
  assert.equal(parseIPv4('0.0.0.0'), 0);
  assert.equal(parseIPv4('255.255.255.255'), 4294967295);
  assert.equal(parseIPv4(' 192.168.1.42 '), 3232235818);
  for (const ip of ['0.0.0.0','127.0.0.1','128.0.0.1','192.168.1.42','224.0.0.1','255.255.255.255']) {
    assert.equal(formatIPv4(parseIPv4(ip)), ip);
  }
});
test('IPv4: malformed, missing or ambiguous inputs are rejected', () => {
  for (const ip of ['', '1.2.3', '1.2.3.4.5', '256.0.0.1', '-1.0.0.1', '1.2.3.4/24', '01.2.3.4', '1.2.3. 4', '1e2.2.3.4', 'a.b.c.d', '1.2.3.', null, undefined, 42, '<script>']) {
    assert.throws(() => parseIPv4(ip), error => error instanceof IPv4Error && error.code === 'invalidIp');
  }
});
test('prefix: valid range 0 through 32, with optional slash', () => {
  for (let prefix = 0; prefix <= 32; prefix++) {
    assert.equal(parsePrefix(prefix), prefix);
    assert.equal(parsePrefix(`/${prefix}`), prefix);
  }
  for (const prefix of ['', '33', '-1', '24.1', '2e1', '/ 24', '024', undefined, null, NaN, Infinity]) {
    assert.throws(() => parsePrefix(prefix), error => error.code === 'invalidPrefix');
  }
});
test('/24: all fields', () => {
  const s = calculateSubnet('192.168.1.42', 24);
  assert.equal(s.cidr, '192.168.1.0/24');
  assert.equal(s.mask, '255.255.255.0');
  assert.equal(s.wildcard, '0.0.0.255');
  assert.equal(s.broadcast, '192.168.1.255');
  assert.equal(s.firstHost, '192.168.1.1');
  assert.equal(s.lastHost, '192.168.1.254');
  assert.equal(s.hostCount, 254);
  assert.equal(s.binary, '11000000101010000000000100101010');
  assert.equal(s.kind, 'subnet');
});
test('non-octet prefix /26 and final /30 block', () => {
  const s = calculateSubnet('10.42.7.81', 26);
  assert.equal(s.network, '10.42.7.64');
  assert.equal(s.broadcast, '10.42.7.127');
  assert.equal(s.mask, '255.255.255.192');
  assert.equal(s.hostCount, 62);
  const edge = calculateSubnet('255.255.255.255', 30);
  assert.equal(edge.network, '255.255.255.252');
  assert.equal(edge.firstHost, '255.255.255.253');
  assert.equal(edge.lastHost, '255.255.255.254');
});
test('/0: unsigned 32-bit address space', () => {
  const s = calculateSubnet('203.0.113.7', 0);
  assert.equal(s.network, '0.0.0.0');
  assert.equal(s.mask, '0.0.0.0');
  assert.equal(s.broadcast, '255.255.255.255');
  assert.equal(s.hostCount, 4294967294);
  assert.equal(s.firstHost, '0.0.0.1');
  assert.equal(s.lastHost, '255.255.255.254');
});
test('/31: point-to-point semantics, no fictitious broadcast', () => {
  for (const ip of ['10.0.0.0', '10.0.0.1']) {
    const s = calculateSubnet(ip, 31);
    assert.equal(s.network, '10.0.0.0');
    assert.equal(s.firstHost, '10.0.0.0');
    assert.equal(s.lastHost, '10.0.0.1');
    assert.equal(s.hostCount, 2);
    assert.equal(s.broadcast, null);
    assert.equal(s.kind, 'pointToPoint');
  }
});
test('/32: single address, no fictitious broadcast', () => {
  const s = calculateSubnet('203.0.113.7', 32);
  assert.equal(s.network, '203.0.113.7');
  assert.equal(s.firstHost, s.lastHost);
  assert.equal(s.firstHost, '203.0.113.7');
  assert.equal(s.mask, '255.255.255.255');
  assert.equal(s.wildcard, '0.0.0.0');
  assert.equal(s.hostCount, 1);
  assert.equal(s.broadcast, null);
  assert.equal(s.kind, 'singleHost');
});
test('all prefixes: arithmetic invariants across 2,145 deterministic samples', () => {
  let seed = 45;
  for (let prefix = 0; prefix <= 32; prefix++) {
    for (let i = 0; i < 65; i++) {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      const s = calculateSubnet(formatIPv4(seed), prefix);
      assert.ok(s.networkNumber <= seed && seed <= s.lastNumber);
      assert.equal(s.networkNumber % s.size, 0);
      assert.equal(s.lastNumber - s.networkNumber + 1, 2 ** (32 - prefix));
      assert.equal(parseIPv4(s.mask) + parseIPv4(s.wildcard), 4294967295);
      assert.equal(s.binary.length, 32);
      assert.ok(s.hostCount > 0);
    }
  }
});
test('challenge generation and answer checking', () => {
  for (const random of [0, .1, .3, .5, .7, .9, .99999, 1]) {
    const c = createChallenge(() => random);
    assert.ok(c.address.startsWith('10.'));
    assert.ok(c.prefix >= 16 && c.prefix <= 30);
    assert.ok(['network', 'broadcast', 'hostCount'].includes(c.field));
    assert.equal(checkAnswer(c, ` ${c.answer} `), true);
    assert.equal(checkAnswer(c, ''), false);
    assert.equal(checkAnswer(c, 'nope'), false);
    assert.equal(checkAnswer(c, '<script>'), false);
  }
});
