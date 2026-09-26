import { Hono } from 'hono';
import { CODE_RE, SLOT_RE, normalizeCode, isBot, resolve } from './lib.js';
import { hostUrl } from './common.js';
import { admin } from './admin.js';
import { owner } from './owner.js';
import * as V from './views.js';

const app = new Hono();

// Three hostnames, one Worker. TAP_BASE (go.tap4.ph): taps + links pages. ADMIN_HOST (admin.tap4.ph): only /admin.
// APP_HOST (dashboard.tap4.ph): only /app, the owners' dashboard. With both hosts unset (local dev), localhost serves everything.
const under = (path, prefix) => path === prefix || path.startsWith(prefix + '/');
app.use('*', async (c, next) => {
  const { ADMIN_HOST, APP_HOST } = c.env;
  const host = new URL(c.req.url).hostname, path = c.req.path;
  if ((!ADMIN_HOST && !APP_HOST) || host === c.env.PREVIEW_HOST) return next();
  const own = host === ADMIN_HOST ? '/admin' : host === APP_HOST ? '/app' : null;
  if (own) return under(path, own) ? next() : c.redirect(own, 302);
  return under(path, '/admin') || under(path, '/app') ? c.notFound() : next();
});
const NO_STORE = { 'Cache-Control': 'no-store' };
// Every tap must reach the Worker (analytics + instant edits), so redirects are 302 + no-store.
const go = (c, location) => { c.header('Cache-Control', 'no-store'); return c.redirect(location, 302); };

/* ---------- taps: the product. Must never 500. ---------- */
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
  return go(c, r.qcScan ? hostUrl(c.env.ADMIN_HOST, r.location) : r.location);
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

app.route('/admin', admin);
app.route('/app', owner);
export default app;
