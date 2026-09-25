import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, cleanUrl, newCode, normalizeCode, CODE_RE, isBot, checklist, slugify, initials } from '../src/lib.js';

const tap = { code: 'K7M2QX', slot: 'main', source: 'nfc' };
const live = { status: 'active', business_id: 1, link_key: 'google', url: 'https://g.page/r/x/review', slug: 'kape-norte' };

test('resolve: live device goes straight to its destination and logs', () => {
  assert.deepEqual(resolve(live, tap), { location: 'https://g.page/r/x/review', log: true });
  assert.deepEqual(resolve({ ...live, status: 'qc_passed' }, tap).location, live.url);
});

test('resolve: hosted, missing or unknown slot falls back to the links page', () => {
  assert.equal(resolve({ ...live, link_key: 'links', url: null }, tap).location, '/p/kape-norte?d=K7M2QX');
  assert.equal(resolve({ ...live, url: null }, tap).location, '/p/kape-norte?d=K7M2QX');
  assert.equal(resolve({ ...live, link_key: null, url: null }, tap).location, '/p/kape-norte?d=K7M2QX');
});

test('resolve: lifecycle gates', () => {
  assert.deepEqual(resolve(null, tap), { page: 'notfound' });
  assert.deepEqual(resolve({ ...live, status: 'disabled' }, tap), { page: 'disabled' });
  assert.deepEqual(resolve({ ...live, status: 'active', business_id: null }, tap), { page: 'unassigned' });
  const qc = resolve({ ...live, status: 'new' }, { ...tap, source: 'qr', slot: 'menu' });
  assert.equal(qc.location, '/admin/d/K7M2QX?scan=qr&slot=menu');
  assert.ok(qc.qcScan && !qc.log, 'QC scans must not count as customer taps');
});

test('cleanUrl: https only, blocks script schemes', () => {
  assert.equal(cleanUrl(' https://instagram.com/kape '), 'https://instagram.com/kape');
  assert.equal(cleanUrl(''), '');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'http://x.com', 'https://localhost', 'not a url']) assert.equal(cleanUrl(bad), null, bad);
});

test('codes: random, 6 chars, Crockford-normalised', () => {
  const codes = new Set(Array.from({ length: 2000 }, () => newCode()));
  assert.ok(codes.size > 1990);
  for (const c of codes) assert.match(c, CODE_RE);
  assert.equal(newCode(new Uint8Array([0, 31, 32, 255, 10, 20])), '0Z0ZAM');
  assert.equal(normalizeCode('k7m2qo'), 'K7M2Q0');
  assert.equal(normalizeCode('il0000'), '110000');
});

test('helpers', () => {
  assert.ok(isBot('facebookexternalhit/1.1') && isBot('') && !isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'));
  assert.equal(slugify('Café Añino & Co.'), 'cafe-anino-co');
  assert.equal(initials('Kape Norte'), 'KN');
  const items = checklist('TF-BAR', [{ slot: 'z1', link_key: 'google' }]).map(([id]) => id);
  assert.ok(items.includes('dest_z1') && items.includes('nfc') && !items.includes('qr'));
});

test('seed device codes are valid tap codes', async () => {
  const { readFile } = await import('node:fs/promises');
  const seed = await readFile(new URL('../seed.sql', import.meta.url), 'utf8');
  const codes = [...seed.matchAll(/\('([0-9A-Z]{6})', 'TF-/g)].map(m => m[1]);
  assert.ok(codes.length >= 10);
  for (const c of codes) assert.match(c, CODE_RE, c);
});
