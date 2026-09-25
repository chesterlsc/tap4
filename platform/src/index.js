import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { secureHeaders } from 'hono/secure-headers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import qrcode from 'qrcode-generator';
import { CODE_RE, SLOT_RE, LINK_KEYS, URL_KEYS, PRODUCTS, newCode, normalizeCode, cleanUrl, slugify, initials, isBot, resolve, checklist } from './lib.js';
import * as V from './views.js';

const app = new Hono();

// Two hostnames, one Worker: TAP_BASE (go.tap4.ph) serves taps + links pages, ADMIN_HOST (admin.tap4.ph) serves
// only the dashboard. The public host never answers /admin. Unset ADMIN_HOST (local dev) = one host serves both.
const isAdminPath = path => path === '/admin' || path.startsWith('/admin/');
app.use('*', async (c, next) => {
  const adminHost = c.env.ADMIN_HOST;
  if (!adminHost) return next();
  const onAdmin = new URL(c.req.url).hostname === adminHost;
  if (onAdmin && !isAdminPath(c.req.path)) return c.redirect('/admin', 302);
  if (!onAdmin && isAdminPath(c.req.path)) return c.notFound();
  return next();
});
const adminUrl = (env, path) => (env.ADMIN_HOST ? `https://${env.ADMIN_HOST}` : '') + path;
const TZ = '+8 hours'; // group days in Philippine time
const NO_STORE = { 'Cache-Control': 'no-store' };
// Every tap must reach the Worker (analytics + instant edits), so redirects are 302 + no-store.
const go = (c, location) => { c.header('Cache-Control', 'no-store'); return c.redirect(location, 302); };

/* ---------- taps: the product. Must never 500. ---------- */
const tapUrl = (env, src, code, slot) => `${env.TAP_BASE}/${src}/${code}${slot === 'main' ? '' : '/' + slot}`;

async function visitorHash(env, ip, ua) {
  if (!env.HASH_SECRET) return null;
  const day = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.HASH_SECRET + day), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip + '|' + ua));
  return [...new Uint8Array(sig).slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function logEvent(c, e) {
  const ua = c.req.header('user-agent') || '';
  const visitor = await visitorHash(c.env, c.req.header('cf-connecting-ip') || '', ua);
  // Same visitor + target within 10s = one tap (phones often read a tag twice).
  await c.env.DB.prepare(`INSERT INTO events (device_code, business_id, slot, source, link_key, visitor, country, bot)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
    WHERE ?6 IS NULL OR NOT EXISTS (SELECT 1 FROM events WHERE device_code IS ?1 AND ts > datetime('now', '-10 seconds') AND visitor = ?6 AND slot IS ?3 AND link_key IS ?5)`)
    .bind(e.code ?? null, e.business_id ?? null, e.slot ?? null, e.source, e.link_key ?? null, visitor, c.req.raw.cf?.country ?? null, isBot(ua) ? 1 : 0).run();
}
const later = (c, p) => c.executionCtx.waitUntil(p.catch(err => console.error('background write failed', err)));

app.get('/:src{t|q}/:code/:slot?', async c => {
  const source = c.req.param('src') === 't' ? 'nfc' : 'qr';
  const code = normalizeCode(c.req.param('code'));
  const slot = (c.req.param('slot') || 'main').toLowerCase();
  if (!CODE_RE.test(code) || !SLOT_RE.test(slot)) return c.html(V.messagePage('notfound'), 404, NO_STORE);
  let row;
  try {
    row = await c.env.DB.prepare(`SELECT d.status, d.business_id, s.link_key, l.url, b.slug
      FROM devices d
      LEFT JOIN device_slots s ON s.device_code = d.code AND s.slot = ?2
      LEFT JOIN business_links l ON l.business_id = d.business_id AND l.key = s.link_key
      LEFT JOIN businesses b ON b.id = d.business_id
      WHERE d.code = ?1`).bind(code, slot).first();
  } catch (err) {
    console.error('tap lookup failed', err);
    return c.html(V.messagePage('down'), 503, { ...NO_STORE, 'Retry-After': '3' });
  }
  const r = resolve(row, { code, slot, source });
  if (r.page) return c.html(V.messagePage(r.page), r.page === 'notfound' ? 404 : 200, NO_STORE);
  if (r.qcScan) later(c, c.env.DB.prepare('UPDATE devices SET first_scan_at = COALESCE(first_scan_at, CURRENT_TIMESTAMP) WHERE code = ?').bind(code).run());
  if (r.log) later(c, logEvent(c, { code, business_id: row.business_id, slot, source, link_key: row.link_key || 'links' }));
  return go(c, r.qcScan ? adminUrl(c.env, r.location) : r.location);
});

/* ---------- hosted 4-in-1 links page ---------- */
async function businessLinks(db, slug) {
  const b = await db.prepare('SELECT * FROM businesses WHERE slug = ?').bind(slug).first();
  if (!b) return {};
  const { results } = await db.prepare('SELECT key, url FROM business_links WHERE business_id = ? AND url IS NOT NULL').bind(b.id).all();
  return { b, links: Object.fromEntries(results.map(r => [r.key, r.url])) };
}
const refCode = c => { const d = normalizeCode(c.req.query('d')); return CODE_RE.test(d) ? d : null; };

app.get('/p/:slug', async c => {
  const { b, links } = await businessLinks(c.env.DB, c.req.param('slug'));
  if (!b) return c.html(V.messagePage('notfound'), 404);
  return c.html(V.linksPage(b, links, refCode(c)), 200, { 'Cache-Control': 'public, max-age=60' });
});

app.get('/p/:slug/go/:key', async c => {
  const { b, links } = await businessLinks(c.env.DB, c.req.param('slug'));
  const key = c.req.param('key');
  if (!b || !links[key]) return c.redirect(b ? `/p/${b.slug}` : '/', 302);
  later(c, logEvent(c, { code: refCode(c), business_id: b.id, source: 'page', link_key: key }));
  return go(c, links[key]);
});

app.get('/', c => c.env.SITE_URL ? c.redirect(c.env.SITE_URL, 302) : c.html(V.messagePage('notfound'), 404));

/* ---------- admin (behind Cloudflare Access) ---------- */
const admin = new Hono();
let jwks;
admin.use('*', secureHeaders());
admin.use('*', async (c, next) => {
  // AUTH_DEV only ever lives in .dev.vars. Production requires a valid Cloudflare Access JWT: fail closed.
  if (c.env.AUTH_DEV === '1') { c.set('actor', 'dev@local'); return next(); }
  const token = c.req.header('cf-access-jwt-assertion');
  if (!token || !c.env.CF_ACCESS_TEAM || !c.env.CF_ACCESS_AUD) return c.text('Forbidden', 403);
  try {
    const issuer = `https://${c.env.CF_ACCESS_TEAM}.cloudflareaccess.com`;
    jwks ||= createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs'));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: c.env.CF_ACCESS_AUD });
    c.set('actor', payload.email || payload.sub);
  } catch {
    return c.text('Forbidden', 403);
  }
  return next();
});
admin.use('*', csrf());

const page = (c, nav, title, body) => c.html(V.adminPage({ title, nav, actor: c.get('actor'), body }));
const back = (c, path, key, text) => c.redirect(`${path}${path.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(text)}`, 303);
const audit = (c, entity, id, change) => c.env.DB.prepare('INSERT INTO audit_log (actor, entity, entity_id, change) VALUES (?, ?, ?, ?)').bind(c.get('actor'), entity, String(id), typeof change === 'string' ? change : JSON.stringify(change));
const flashQ = c => ({ msg: c.req.query('msg'), err: c.req.query('err') });

async function stats(db, col, val) {
  const w = col ? `AND ${col} = ?` : ''; // col is always a literal from this file, never user input
  const p = col ? [val] : [];
  const [tot, days, split] = await db.batch([
    db.prepare(`SELECT SUM(source IN ('nfc','qr')) taps, SUM(source = 'nfc') nfc, SUM(source = 'qr') qr,
      COUNT(DISTINCT visitor) visitors, SUM(link_key = 'google') review, SUM(link_key = 'menu') menu
      FROM events WHERE bot = 0 AND ts >= datetime('now', '-30 days') ${w}`).bind(...p),
    db.prepare(`SELECT date(ts, '${TZ}') d, COUNT(*) n FROM events WHERE bot = 0 AND source IN ('nfc','qr')
      AND ts >= datetime('now', '-15 days') ${w} GROUP BY d`).bind(...p),
    db.prepare(`SELECT link_key k, COUNT(*) n FROM events WHERE bot = 0 AND ts >= datetime('now', '-30 days')
      AND link_key IS NOT NULL AND link_key != 'links' ${w} GROUP BY k ORDER BY n DESC`).bind(...p)
  ]);
  const t = tot.results[0] || {};
  const byDay = Object.fromEntries(days.results.map(r => [r.d, r.n]));
  const today = Date.now() + 8 * 3600e3;
  return {
    taps: t.taps || 0, nfc: t.nfc || 0, qr: t.qr || 0, visitors: t.visitors || 0, review: t.review || 0, menu: t.menu || 0,
    days: Array.from({ length: 14 }, (_, i) => { const d = new Date(today - (13 - i) * 864e5).toISOString().slice(0, 10); return { d, n: byDay[d] || 0 }; }),
    split: split.results
  };
}

const RECENT = `SELECT e.ts, e.source, e.link_key, e.device_code, d.label, b.name bname, b.id bid FROM events e
  LEFT JOIN devices d ON d.code = e.device_code LEFT JOIN businesses b ON b.id = e.business_id WHERE e.bot = 0`;

admin.get('/', async c => {
  const db = c.env.DB;
  const [s, counts, top, recent] = await Promise.all([
    stats(db),
    db.prepare(`SELECT CASE WHEN status = 'new' AND first_scan_at IS NOT NULL THEN 'scanned' ELSE status END st, COUNT(*) n FROM devices GROUP BY st`).all(),
    db.prepare(`SELECT b.id, b.name, (SELECT COUNT(*) FROM devices d WHERE d.business_id = b.id) devices,
      (SELECT COUNT(*) FROM events e WHERE e.business_id = b.id AND e.bot = 0 AND e.source IN ('nfc','qr') AND e.ts >= datetime('now', '-30 days')) taps
      FROM businesses b ORDER BY taps DESC, b.name LIMIT 8`).all(),
    db.prepare(RECENT + ' ORDER BY e.ts DESC, e.id DESC LIMIT 12').all()
  ]);
  return page(c, 'overview', 'Overview', V.overviewView({ stats: s, counts: Object.fromEntries(counts.results.map(r => [r.st, r.n])), top: top.results, recent: recent.results, q: flashQ(c) }));
});

/* businesses */
admin.get('/businesses', async c => {
  const { results } = await c.env.DB.prepare(`SELECT b.*, (SELECT COUNT(*) FROM devices d WHERE d.business_id = b.id) devices,
    (SELECT COUNT(*) FROM devices d WHERE d.business_id = b.id AND d.status = 'active') active,
    (SELECT COUNT(*) FROM events e WHERE e.business_id = b.id AND e.bot = 0 AND e.source IN ('nfc','qr') AND e.ts >= datetime('now', '-30 days')) taps
    FROM businesses b ORDER BY b.name`).all();
  return page(c, 'businesses', 'Businesses', V.businessesView({ rows: results, q: flashQ(c) }));
});

const text = (v, max) => String(v ?? '').trim().slice(0, max) || null;

admin.post('/businesses', async c => {
  const f = await c.req.parseBody();
  const name = text(f.name, 60);
  if (!name) return back(c, '/admin/businesses', 'err', 'Business name is required.');
  const base = slugify(name);
  for (let i = 1; i < 20; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    try {
      const b = await c.env.DB.prepare('INSERT INTO businesses (slug, name, contact_name, email, phone) VALUES (?, ?, ?, ?, ?) RETURNING id')
        .bind(slug, name, text(f.contact_name, 60), text(f.email, 120), text(f.phone, 30)).first();
      await audit(c, 'business', b.id, { created: name }).run();
      return back(c, `/admin/b/${b.id}`, 'msg', 'Business created. Add destinations, then devices.');
    } catch (err) {
      if (!String(err).includes('UNIQUE')) throw err;
    }
  }
  return back(c, '/admin/businesses', 'err', 'Could not pick a unique slug.');
});

const getBusiness = (db, id) => db.prepare('SELECT * FROM businesses WHERE id = ?').bind(Number(id) || 0).first();

admin.get('/b/:id', async c => {
  const db = c.env.DB, b = await getBusiness(db, c.req.param('id'));
  if (!b) return c.notFound();
  const [links, devices, s, recent] = await Promise.all([
    db.prepare('SELECT key, url FROM business_links WHERE business_id = ?').bind(b.id).all(),
    db.prepare(`SELECT d.*, (SELECT group_concat(slot || ':' || link_key, ' ') FROM device_slots s WHERE s.device_code = d.code) slots,
      (SELECT COUNT(*) FROM events e WHERE e.device_code = d.code AND e.bot = 0 AND e.source IN ('nfc','qr')) taps,
      (SELECT MAX(ts) FROM events e WHERE e.device_code = d.code AND e.bot = 0) last_ts
      FROM devices d WHERE d.business_id = ? ORDER BY d.label, d.created_at`).bind(b.id).all(),
    stats(db, 'business_id', b.id),
    db.prepare(RECENT + ' AND e.business_id = ? ORDER BY e.ts DESC, e.id DESC LIMIT 10').bind(b.id).all()
  ]);
  return page(c, 'businesses', b.name, V.businessView({ b, tapBase: c.env.TAP_BASE, links: Object.fromEntries(links.results.map(r => [r.key, r.url])), devices: devices.results, stats: s, recent: recent.results, q: flashQ(c) }));
});

admin.post('/b/:id', async c => {
  const b = await getBusiness(c.env.DB, c.req.param('id'));
  if (!b) return c.notFound();
  const f = await c.req.parseBody(), path = `/admin/b/${b.id}`;
  const next = {
    name: text(f.name, 60), slug: slugify(f.slug || ''), contact_name: text(f.contact_name, 60), email: text(f.email, 120), phone: text(f.phone, 30),
    brand_color: /^#[0-9a-f]{6}$/i.test(f.brand_color) ? f.brand_color.toLowerCase() : null, logo_url: cleanUrl(f.logo_url)
  };
  if (!next.name) return back(c, path, 'err', 'Business name is required.');
  if (next.logo_url === null) return back(c, path, 'err', 'Logo URL must be an https:// link.');
  next.logo_url ||= null;
  const changed = Object.fromEntries(Object.entries(next).filter(([k, v]) => (b[k] ?? null) !== v));
  if (!Object.keys(changed).length) return back(c, path, 'msg', 'No changes.');
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE businesses SET ${Object.keys(changed).map(k => k + ' = ?').join(', ')} WHERE id = ?`).bind(...Object.values(changed), b.id),
      audit(c, 'business', b.id, changed)
    ]);
  } catch (err) {
    if (String(err).includes('UNIQUE')) return back(c, path, 'err', `The slug “${next.slug}” is taken.`);
    throw err;
  }
  return back(c, path, 'msg', 'Details saved.');
});

admin.post('/b/:id/links', async c => {
  const db = c.env.DB, b = await getBusiness(db, c.req.param('id'));
  if (!b) return c.notFound();
  const f = await c.req.parseBody(), path = `/admin/b/${b.id}`;
  const { results } = await db.prepare('SELECT key, url FROM business_links WHERE business_id = ?').bind(b.id).all();
  const old = Object.fromEntries(results.map(r => [r.key, r.url]));
  const stmts = [], changes = {};
  for (const [key, label] of URL_KEYS) {
    const url = cleanUrl(f[key]);
    if (url === null) return back(c, path, 'err', `${label}: enter a valid https:// link.`);
    if ((old[key] || '') === url) continue;
    changes[key] = { from: old[key] || null, to: url || null };
    stmts.push(url
      ? db.prepare('INSERT INTO business_links (business_id, key, url) VALUES (?, ?, ?) ON CONFLICT (business_id, key) DO UPDATE SET url = excluded.url').bind(b.id, key, url)
      : db.prepare('DELETE FROM business_links WHERE business_id = ? AND key = ?').bind(b.id, key));
  }
  if (!stmts.length) return back(c, path, 'msg', 'No changes.');
  await db.batch([...stmts, audit(c, 'business', b.id, { links: changes })]);
  return back(c, path, 'msg', `Saved. ${stmts.length} destination${stmts.length > 1 ? 's' : ''} updated. Live on every device now.`);
});

/* devices */
async function createDevices(c, { sku, qty, business, branch }) {
  const p = PRODUCTS[sku];
  if (!p) throw new Error('Unknown product');
  const db = c.env.DB, prefix = `TF-${business ? initials(business.name) : 'STOCK'}-`;
  const { n: start } = await db.prepare('SELECT COUNT(*) n FROM devices WHERE label LIKE ?').bind(prefix + '%').first();
  const codes = [];
  for (let i = 0; i < qty; i++) {
    for (let attempt = 0; ; attempt++) {
      const code = newCode(), label = prefix + String(start + i + 1).padStart(4, '0');
      try {
        await db.batch([
          db.prepare('INSERT INTO devices (code, label, business_id, product_sku, branch) VALUES (?, ?, ?, ?, ?)').bind(code, label, business?.id ?? null, sku, branch),
          ...p.slots.map(([slot, key]) => db.prepare('INSERT INTO device_slots (device_code, slot, link_key) VALUES (?, ?, ?)').bind(code, slot, key))
        ]);
        codes.push(code);
        break;
      } catch (err) {
        if (!String(err).includes('UNIQUE') || attempt >= 4) throw err; // random-code collision: retry
      }
    }
  }
  await audit(c, business ? 'business' : 'stock', business?.id ?? sku, { created_devices: codes, sku }).run();
  return codes;
}
const qtyOf = v => Math.min(100, Math.max(1, Number.parseInt(v, 10) || 1));

admin.post('/b/:id/devices', async c => {
  const b = await getBusiness(c.env.DB, c.req.param('id'));
  if (!b) return c.notFound();
  const f = await c.req.parseBody();
  if (!PRODUCTS[f.sku]) return back(c, `/admin/b/${b.id}`, 'err', 'Pick a product.');
  const codes = await createDevices(c, { sku: f.sku, qty: qtyOf(f.qty), business: b, branch: text(f.branch, 40) });
  return codes.length === 1
    ? back(c, `/admin/d/${codes[0]}`, 'msg', 'Device created. Write its URL to the chip, lock it, then tap it.')
    : back(c, '/admin/devices', 'msg', `${codes.length} devices created for ${b.name}.`);
});

admin.post('/devices', async c => {
  const f = await c.req.parseBody();
  if (!PRODUCTS[f.sku]) return back(c, '/admin/devices', 'err', 'Pick a product.');
  const codes = await createDevices(c, { sku: f.sku, qty: qtyOf(f.qty), business: null, branch: null });
  return back(c, '/admin/devices', 'msg', `${codes.length} blank ${PRODUCTS[f.sku].name} devices created.`);
});

admin.get('/devices', async c => {
  const { results } = await c.env.DB.prepare(`SELECT d.code, d.label, d.product_sku, d.branch, d.status, d.first_scan_at, b.name bname,
    CASE WHEN d.status = 'new' AND d.first_scan_at IS NOT NULL THEN 'scanned' ELSE d.status END st
    FROM devices d LEFT JOIN businesses b ON b.id = d.business_id ORDER BY d.created_at DESC, d.label`).all();
  const cols = {};
  for (const d of results) {
    const col = cols[d.st] ||= Object.assign([], { total: 0 });
    col.total++;
    if (col.length < 30) col.push(d);
  }
  return page(c, 'devices', 'Devices', V.devicesView({ cols, q: flashQ(c) }));
});

admin.get('/find', c => {
  const code = normalizeCode(c.req.query('code'));
  return CODE_RE.test(code) ? c.redirect(`/admin/d/${code}`, 303) : back(c, '/admin/devices', 'err', 'Codes are 6 characters, like K7M2QX.');
});

async function getDevice(db, raw) {
  const code = normalizeCode(raw);
  if (!CODE_RE.test(code)) return {};
  const d = await db.prepare('SELECT * FROM devices WHERE code = ?').bind(code).first();
  if (!d) return {};
  try { d.qc = JSON.parse(d.qc || '{}'); } catch { d.qc = {}; }
  const { results: slots } = await db.prepare(`SELECT s.slot, s.link_key, l.url FROM device_slots s
    LEFT JOIN business_links l ON l.business_id = ? AND l.key = s.link_key WHERE s.device_code = ? ORDER BY s.slot = 'main' DESC, s.slot`).bind(d.business_id, code).all();
  return { d, slots };
}

function qrSvg(url) {
  const q = qrcode(0, 'M');
  q.addData(url);
  q.make();
  return q.createSvgTag({ cellSize: 8, margin: 4, scalable: true });
}

admin.get('/d/:code', async c => {
  const db = c.env.DB, { d, slots } = await getDevice(db, c.req.param('code'));
  if (!d) return c.notFound();
  const [b, businesses, s] = await Promise.all([
    d.business_id ? getBusiness(db, d.business_id) : null,
    db.prepare('SELECT id, name FROM businesses ORDER BY name').all(),
    stats(db, 'device_code', d.code)
  ]);
  const qc = Object.fromEntries(slots.map(x => [x.slot, qrSvg(tapUrl(c.env, 'q', d.code, x.slot))]));
  const q = { ...flashQ(c), scan: ['nfc', 'qr'].includes(c.req.query('scan')) ? c.req.query('scan') : null, slot: SLOT_RE.test(c.req.query('slot') || '') ? c.req.query('slot') : null };
  return page(c, 'devices', d.label || d.code, V.deviceView({ d, b, slots, businesses: businesses.results, stats: s, tapUrl: (src, slot) => tapUrl(c.env, src, d.code, slot), q, qc }));
});

admin.get('/d/:code/qr.svg', async c => {
  const { d, slots } = await getDevice(c.env.DB, c.req.param('code'));
  const slot = c.req.query('slot') || 'main';
  if (!d || !slots.some(s => s.slot === slot)) return c.notFound();
  return c.body(qrSvg(tapUrl(c.env, 'q', d.code, slot)), 200, {
    'Content-Type': 'image/svg+xml',
    ...(c.req.query('dl') ? { 'Content-Disposition': `attachment; filename="${d.code}-${slot}.svg"` } : {})
  });
});

admin.post('/d/:code', async c => {
  const db = c.env.DB, { d } = await getDevice(db, c.req.param('code'));
  if (!d) return c.notFound();
  const f = await c.req.parseBody(), path = `/admin/d/${d.code}`;
  const businessId = f.business_id ? Number(f.business_id) : null;
  if (businessId && !(await getBusiness(db, businessId))) return back(c, path, 'err', 'Unknown business.');
  const next = { label: text(f.label, 40), branch: text(f.branch, 40), note: text(f.note, 500), business_id: businessId };
  const changed = Object.fromEntries(Object.entries(next).filter(([k, v]) => (d[k] ?? null) !== v));
  if (!Object.keys(changed).length) return back(c, path, 'msg', 'No changes.');
  await db.batch([
    db.prepare(`UPDATE devices SET ${Object.keys(changed).map(k => k + ' = ?').join(', ')} WHERE code = ?`).bind(...Object.values(changed), d.code),
    audit(c, 'device', d.code, changed)
  ]);
  return back(c, path, 'msg', 'Saved.');
});

admin.post('/d/:code/slots', async c => {
  const db = c.env.DB, { d, slots } = await getDevice(db, c.req.param('code'));
  if (!d) return c.notFound();
  const f = await c.req.parseBody(), path = `/admin/d/${d.code}`;
  const valid = k => LINK_KEYS.some(([x]) => x === k);
  const stmts = [], changes = {};
  for (const s of slots) {
    const key = f['slot_' + s.slot];
    if (!valid(key) || key === s.link_key) continue;
    changes[s.slot] = { from: s.link_key, to: key };
    stmts.push(db.prepare('UPDATE device_slots SET link_key = ? WHERE device_code = ? AND slot = ?').bind(key, d.code, s.slot));
  }
  const add = String(f.new_slot || '').trim().toLowerCase();
  if (add) {
    if (!SLOT_RE.test(add) || !valid(f.new_key)) return back(c, path, 'err', 'Slot names are 1–8 lowercase letters or digits.');
    if (slots.some(s => s.slot === add)) return back(c, path, 'err', `Slot “${add}” already exists.`);
    changes[add] = { added: f.new_key };
    stmts.push(db.prepare('INSERT INTO device_slots (device_code, slot, link_key) VALUES (?, ?, ?)').bind(d.code, add, f.new_key));
  }
  if (!stmts.length) return back(c, path, 'msg', 'No changes.');
  await db.batch([...stmts, audit(c, 'device', d.code, { slots: changes })]);
  return back(c, path, 'msg', 'Slots saved. Live on the next tap.');
});

admin.post('/d/:code/qc', async c => {
  const db = c.env.DB, { d, slots } = await getDevice(db, c.req.param('code'));
  if (!d) return c.notFound();
  const path = `/admin/d/${d.code}`;
  if (d.status !== 'new') return back(c, path, 'err', 'QC is only editable while the device is new.');
  const f = await c.req.parseBody({ all: true });
  const ticked = new Set([f.check ?? []].flat());
  const items = checklist(d.product_sku, slots);
  const qc = JSON.stringify(Object.fromEntries(items.map(([id]) => [id, ticked.has(id)])));
  const actor = c.get('actor');
  if (f.action === 'pass') {
    if (items.some(([id]) => !ticked.has(id))) return back(c, path, 'err', 'Tick every item to pass QC.');
    await db.batch([
      db.prepare(`UPDATE devices SET status = 'qc_passed', qc = ?, qc_by = ?, qc_at = CURRENT_TIMESTAMP WHERE code = ? AND status = 'new'`).bind(qc, actor, d.code),
      audit(c, 'device', d.code, 'qc passed')
    ]);
    return back(c, path, 'msg', 'QC passed. Ready to ship.');
  }
  if (f.action === 'fail') {
    const note = text(f.note, 200);
    if (!note) return back(c, path, 'err', 'Add a note saying why it failed.');
    await db.batch([
      db.prepare(`UPDATE devices SET status = 'disabled', qc = ?, note = trim(coalesce(note, '') || char(10) || ?) WHERE code = ?`).bind(qc, 'QC failed: ' + note, d.code),
      audit(c, 'device', d.code, 'qc failed: ' + note)
    ]);
    return back(c, path, 'msg', 'Marked as failed and disabled.');
  }
  await db.prepare('UPDATE devices SET qc = ? WHERE code = ?').bind(qc, d.code).run();
  return back(c, path, 'msg', 'Checklist saved.');
});

// target status ← statuses it may come from. new → qc_passed only via the QC checklist.
const TRANSITIONS = { active: ['qc_passed'], disabled: ['new', 'qc_passed', 'active'], new: ['qc_passed', 'disabled'] };
admin.post('/d/:code/status', async c => {
  const db = c.env.DB, { d } = await getDevice(db, c.req.param('code'));
  if (!d) return c.notFound();
  const { to } = await c.req.parseBody(), path = `/admin/d/${d.code}`;
  if (!TRANSITIONS[to]?.includes(d.status)) return back(c, path, 'err', `Can't go from ${d.status} to ${to}.`);
  const extra = to === 'active' ? ', activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP)' : to === 'new' ? ', qc_at = NULL, qc_by = NULL' : '';
  await db.batch([
    db.prepare(`UPDATE devices SET status = ?${extra} WHERE code = ? AND status = ?`).bind(to, d.code, d.status),
    audit(c, 'device', d.code, `status ${d.status} → ${to}`)
  ]);
  return back(c, path, 'msg', { active: 'Activated. Taps now go to the destination.', disabled: 'Disabled. Taps show a paused page.', new: 'Reopened for QC.' }[to]);
});

admin.get('/audit', async c => {
  const { results } = await c.env.DB.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all();
  return page(c, 'audit', 'Audit log', V.auditView({ rows: results }));
});

app.route('/admin', admin);
export default app;
