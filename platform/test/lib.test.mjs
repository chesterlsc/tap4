import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, cleanUrl, newCode, normalizeCode, CODE_RE, isBot, checklist, slugify, initials, hashPassword, verifyPassword, passwordProblem, tempPassword, newToken, safeNext, sniffMenuFile, hasChip, hasQr, csvCell } from '../src/lib.js';

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

test('passwords: salted PBKDF2, verify only the right one', async () => {
  const h = await hashPassword('correct horse battery');
  assert.match(h, /^pbkdf2\$100000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.notEqual(h, await hashPassword('correct horse battery'), 'salted');
  assert.equal(await verifyPassword('correct horse battery', h), true);
  assert.equal(await verifyPassword('correct horse batterx', h), false);
  assert.equal(await verifyPassword('anything', 'garbage'), false);
  assert.equal(await verifyPassword('anything', null), false);
  assert.equal(passwordProblem('short'), 'Use at least 10 characters.');
  assert.equal(passwordProblem('long enough!'), null);
});

test('one-time passwords and session tokens', () => {
  assert.match(tempPassword(), /^[0-9a-hjkmnp-tv-z]{4}-[0-9a-hjkmnp-tv-z]{4}-[0-9a-hjkmnp-tv-z]{4}$/);
  assert.equal(passwordProblem(tempPassword()), null, 'temp passwords satisfy the length rule');
  const t = newToken();
  assert.match(t, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(t, newToken());
});

test('safeNext keeps redirects inside the area', () => {
  assert.equal(safeNext('/admin/b/3', '/admin'), '/admin/b/3');
  assert.equal(safeNext('/admin', '/admin'), '/admin');
  for (const bad of ['https://evil.example', '//evil.example', '/app/destinations', '/admin//evil', '/adminx', '/admin/\\evil', '', null]) assert.equal(safeNext(bad, '/admin'), '/admin', String(bad));
});

test('sniffMenuFile: accepts real menus by their bytes, rejects anything scriptable', () => {
  const bytes = s => Uint8Array.from([...s].map(ch => ch.charCodeAt(0)));
  assert.deepEqual(sniffMenuFile(bytes('%PDF-1.7 ...')), ['application/pdf', 'pdf']);
  assert.deepEqual(sniffMenuFile(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), ['image/jpeg', 'jpg']);
  assert.deepEqual(sniffMenuFile(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), ['image/png', 'png']);
  assert.deepEqual(sniffMenuFile(bytes('RIFF\0\0\0\0WEBPVP8 ')), ['image/webp', 'webp']);
  assert.deepEqual(sniffMenuFile(bytes('\0\0\0\x18ftypheic')), ['image/heic', 'heic']);
  assert.equal(sniffMenuFile(bytes('<svg onload=alert(1)>')), null);
  assert.equal(sniffMenuFile(bytes('<!doctype html><script>')), null);
  assert.equal(sniffMenuFile(new Uint8Array()), null);
});

test('supplier files: which parts get a chip or a printed QR', () => {
  assert.ok(hasChip('main') && hasChip('z3') && !hasChip('menu'));
  assert.ok(hasQr('TF-STAND-ACR', 'main'), 'acrylic has a QR backup');
  assert.ok(!hasQr('TF-CARD', 'main') && !hasQr('TF-BAR', 'z1'), 'cards and bar zones are chip-only');
  assert.ok(hasQr('TF-STAND-PVC', 'menu'), 'menu is a printed QR');
});

test('csvCell quotes and blocks spreadsheet formulas', () => {
  assert.equal(csvCell('Kape Norte'), 'Kape Norte');
  assert.equal(csvCell('Café, "Anino"'), '"Café, ""Anino"""');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+639170000'), "'+639170000");
  assert.equal(csvCell(null), '');
});
