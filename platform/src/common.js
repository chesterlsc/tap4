// Helpers shared by the admin (admin.tap4.ph) and owner (dashboard.tap4.ph) dashboards.
import { URL_KEYS, cleanUrl } from './lib.js';
import * as V from './views.js';

export const TZ = '+8 hours'; // group days in Philippine time
export const tapUrl = (env, src, code, slot) => `${env.TAP_BASE}/${src}/${code}${slot === 'main' ? '' : '/' + slot}`;
export const hostUrl = (host, path) => (host ? `https://${host}` : '') + path;

// Signed-in pages are private (one shows a one-time password): never cache them.
export const page = (c, area, nav, title, body) => c.html(V.shell({ area, title, nav, user: c.get('user'), adminView: c.get('adminView'), body }), 200, { 'Cache-Control': 'no-store' });
export const back = (c, path, key, text) => c.redirect(`${path}${path.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(text)}`, 303);
export const audit = (c, entity, id, change) => c.env.DB.prepare('INSERT INTO audit_log (actor, entity, entity_id, change) VALUES (?, ?, ?, ?)').bind(c.get('actor'), entity, String(id), typeof change === 'string' ? change : JSON.stringify(change));
export const flashQ = c => ({ msg: c.req.query('msg'), err: c.req.query('err') });
export const text = (v, max) => String(v ?? '').trim().slice(0, max) || null;
export const getBusiness = (db, id) => db.prepare('SELECT * FROM businesses WHERE id = ?').bind(Number(id) || 0).first();
export const linksOf = async (db, id) => Object.fromEntries((await db.prepare('SELECT key, url FROM business_links WHERE business_id = ?').bind(id).all()).results.map(r => [r.key, r.url]));
export const devicesOf = (db, id) => db.prepare(`SELECT d.*, (SELECT group_concat(slot || ':' || link_key, ' ') FROM device_slots s WHERE s.device_code = d.code) slots,
  (SELECT COUNT(*) FROM events e WHERE e.device_code = d.code AND e.bot = 0 AND e.source IN ('nfc','qr')) taps,
  (SELECT MAX(ts) FROM events e WHERE e.device_code = d.code AND e.bot = 0) last_ts
  FROM devices d WHERE d.business_id = ? ORDER BY d.label, d.created_at`).bind(id).all();

export async function stats(db, col, val) {
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

export const RECENT = `SELECT e.ts, e.source, e.link_key, e.device_code, d.label, b.name bname, b.id bid FROM events e
  LEFT JOIN devices d ON d.code = e.device_code LEFT JOIN businesses b ON b.id = e.business_id WHERE e.bot = 0`;

export async function saveLinks(c, b, f, path) {
  const db = c.env.DB;
  const { results } = await db.prepare('SELECT key, url FROM business_links WHERE business_id = ?').bind(b.id).all();
  const old = Object.fromEntries(results.map(r => [r.key, r.url]));
  const stmts = [], changes = {};
  for (const [key, label] of URL_KEYS) {
    const url = cleanUrl(f[key]);
    if (url === null) return back(c, path, 'err', `${label}: that doesn’t look like a full link. Copy it again; it should start with https://`);
    if ((old[key] || '') === url) continue;
    changes[key] = { from: old[key] || null, to: url || null };
    stmts.push(url
      ? db.prepare('INSERT INTO business_links (business_id, key, url) VALUES (?, ?, ?) ON CONFLICT (business_id, key) DO UPDATE SET url = excluded.url').bind(b.id, key, url)
      : db.prepare('DELETE FROM business_links WHERE business_id = ? AND key = ?').bind(b.id, key));
  }
  if (!stmts.length) return back(c, path, 'msg', 'Nothing changed.');
  await db.batch([...stmts, audit(c, 'business', b.id, { links: changes })]);
  return back(c, path, 'msg', `Saved ✓ ${stmts.length} link${stmts.length > 1 ? 's' : ''} updated. Every stand uses the new link from the next tap.`);
}
