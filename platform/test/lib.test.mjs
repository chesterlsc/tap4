import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, cleanUrl, newCode, normalizeCode, CODE_RE, isBot, checklist, slugify, initials, hashPassword, verifyPassword, passwordProblem, tempPassword, newToken, safeNext, sniffMenuFile, hasChip, hasQr, csvCell, reviewLinkFromPlaceId, placeIdFromFid, parseMapsUrl, isMapsLink, isReviewLink, isGoogleHost, designOf, productImage, parseProductChoice, slotsFor, productOptions } from '../src/lib.js';

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

test('Google review link from a Place ID', () => {
  assert.equal(reviewLinkFromPlaceId(' ChIJN1t_tDeuEmsRUsoyG83frY4 '), 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4');
  assert.equal(reviewLinkFromPlaceId('place_id:ChIJN1t_tDeuEmsRUsoyG83frY4'), 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4');
  for (const bad of ['', 'short', 'ChIJ<script>alert(1)</script>', 'https://evil.example/ChIJN1t_tDeuEmsRUsoyG83frY4', 'ChIJN1t tDeuEmsRUsoyG83frY4']) assert.equal(reviewLinkFromPlaceId(bad), null, bad);
});

test('Maps link → Place ID without an API', () => {
  // Sydney Opera House: feature ID in Maps links ↔ Google's published Place ID
  assert.equal(placeIdFromFid('0x6b12ae665e892fdd:0x3133f8d75a1ac251'), 'ChIJ3S-JXmauEmsRUcIaWtf4MzE');
  assert.equal(placeIdFromFid('not a fid'), null);
  const full = 'https://www.google.com/maps/place/Sydney+Opera+House/@-33.8567844,151.213108,17z/data=!3m1!4b1!4m6!3m5!1s0x6b12ae665e892fdd:0x3133f8d75a1ac251!8m2!3d-33.8567844!4d151.2152967!16zL20vMDZfbmQ?entry=ttu';
  assert.deepEqual(parseMapsUrl(full), { placeId: 'ChIJ3S-JXmauEmsRUcIaWtf4MzE', name: 'Sydney Opera House', fid: '0x6b12ae665e892fdd:0x3133f8d75a1ac251' });
  assert.equal(parseMapsUrl('https://www.google.com/maps/search/?api=1&query=x&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4').placeId, 'ChIJN1t_tDeuEmsRUsoyG83frY4');
  assert.equal(parseMapsUrl('https://www.google.com/maps/place/?q=place_id%3AChIJN1t_tDeuEmsRUsoyG83frY4').placeId, 'ChIJN1t_tDeuEmsRUsoyG83frY4');
  assert.equal(parseMapsUrl('https://maps.google.com/?cid=123').placeId, null);
});

test('only Google links are treated as Maps links / fetched', () => {
  assert.ok(isMapsLink('https://maps.app.goo.gl/AbC123') && isMapsLink('https://www.google.com/maps/place/X'));
  assert.ok(!isMapsLink('https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4'), 'already a review link');
  assert.ok(!isMapsLink('https://g.page/r/CabcDEF/review') && isReviewLink('https://g.page/r/CabcDEF/review'));
  for (const bad of ['evil.com', 'google.com.evil.com', 'maps.app.goo.gl.evil.com', 'localhost', '169.254.169.254']) assert.ok(!isGoogleHost(bad), bad);
});


test('real share-link shapes', () => {
  // maps.app.goo.gl → maps.google.com/?q=…&ftid=… (Philippine café)
  const q = parseMapsUrl('https://maps.google.com/?q=77V3+6JV+Lacafera-Malandag,+Malungon,+Sarangani&ftid=0x32f779004e157d59:0x4a8a4c9315dc2947&entry=gps');
  assert.deepEqual([q.placeId, q.name], ['ChIJWX0VTgB59zIRRyncFZNMiko', 'Lacafera-Malandag']);
  // a link to one person's review has an empty (0x0) half: not a business, must not produce an ID
  assert.equal(parseMapsUrl('https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sChdDSUhN!2m1!1s0x0:0xf31d0a7030cc7f1e').placeId, null);
});

test('TAP4.1 lineup: designs, photos, picker', () => {
  assert.deepEqual(slotsFor('TF-L41-BLK', 'menu'), [['main', 'google'], ['menu', 'menu']]);
  assert.equal(designOf('main:links'), 'links');
  assert.equal(designOf([{ slot: 'main', link_key: 'google' }, { slot: 'menu', link_key: 'menu' }]), 'menu');
  assert.equal(productImage('TF-L41-WHT', 'main:google'), 'tapfour-l-white-review.jpg');
  assert.equal(productImage('TF-BAR', 'z1:google'), 'bar-4tap.jpg');
  assert.deepEqual(parseProductChoice('TF-L41-BLK:links'), { sku: 'TF-L41-BLK', design: 'links' });
  for (const bad of ['TF-L41-BLK', 'TF-L41-BLK:nope', 'TF-STAND-ACR', 'TF-BAR:menu', '']) assert.equal(parseProductChoice(bad), null, bad);
  assert.ok(!productOptions().some(([v]) => v.startsWith('TF-STAND') || v === 'TF-CARD'), 'retired products are not offered');
  assert.ok(!hasQr('TF-L41-BLK', 'main') && hasQr('TF-L41-BLK', 'menu'), 'only the menu design has a printed QR');
});
