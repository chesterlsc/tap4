// Business owners' dashboard: dashboard.tap4.ph (email + password, role 'owner').
// Every query is scoped to the signed-in owner's business_id from the session, never from the request.
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { csrf } from 'hono/csrf';
import { secureHeaders } from 'hono/secure-headers';
import { cleanUrl } from './lib.js';
import { back, audit, flashQ, getBusiness, linksOf, devicesOf, stats, RECENT, saveLinks } from './common.js';
import { loginRoutes, requireRole, accountRoutes } from './auth.js';
import * as common from './common.js';
import * as V from './views.js';

export const owner = new Hono();
owner.use('*', secureHeaders());
owner.use('*', csrf());
loginRoutes(owner, 'owner');
owner.use('*', requireRole('owner'));

// Admins viewing the owners' dashboard pick which business to see; owners are always pinned to their own.
const VIEW = 'tf_view';
owner.get('/view', c => {
  if (c.get('user').role !== 'admin') return c.redirect('/app', 302);
  const id = Number.parseInt(c.req.query('id'), 10);
  if (id > 0) setCookie(c, VIEW, String(id), { httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Lax', path: '/app' });
  return c.redirect('/app', 302);
});
owner.use('*', async (c, next) => {
  const db = c.env.DB, user = c.get('user');
  let b;
  if (user.role === 'admin') {
    const businesses = (await db.prepare('SELECT id, name FROM businesses ORDER BY name').all()).results;
    b = await getBusiness(db, Number(getCookie(c, VIEW)) || businesses[0]?.id);
    if (!b && businesses.length) b = await getBusiness(db, businesses[0].id);
    if (!b) return c.text('No businesses yet. Create one in admin first.', 404);
    c.set('adminView', { businesses, current: b.id });
  } else {
    b = await getBusiness(db, user.business_id);
    if (!b) return c.text('Your business is no longer active. Contact Tap4.', 403);
  }
  c.set('business', b);
  return next();
});
accountRoutes(owner, 'owner');

const page = (c, nav, title, body) => common.page(c, 'owner', nav, title, body);

owner.get('/', async c => {
  const db = c.env.DB, b = c.get('business');
  const [s, devices, recent, links] = await Promise.all([
    stats(db, 'business_id', b.id),
    devicesOf(db, b.id),
    db.prepare(RECENT + ' AND e.business_id = ? ORDER BY e.ts DESC, e.id DESC LIMIT 10').bind(b.id).all(),
    linksOf(db, b.id)
  ]);
  return page(c, 'overview', b.name, V.ownerOverview({ b, stats: s, devices: devices.results, recent: recent.results, links, tapBase: c.env.TAP_BASE, q: flashQ(c) }));
});

owner.get('/destinations', async c => {
  const b = c.get('business');
  const [links, devices] = await Promise.all([linksOf(c.env.DB, b.id), devicesOf(c.env.DB, b.id)]);
  return page(c, 'destinations', 'My links', V.ownerDestinations({ b, links, devices: devices.results, q: flashQ(c) }));
});
owner.post('/destinations', async c => saveLinks(c, c.get('business'), await c.req.parseBody(), '/app/destinations'));

owner.get('/help', c => page(c, 'help', 'Help', V.ownerHelp()));
owner.get('/branding', c => page(c, 'branding', 'My page', V.ownerBranding({ b: c.get('business'), tapBase: c.env.TAP_BASE, q: flashQ(c) })));
owner.post('/branding', async c => {
  const b = c.get('business'), f = await c.req.parseBody(), path = '/app/branding';
  const logo_url = cleanUrl(f.logo_url);
  if (logo_url === null) return back(c, path, 'err', 'Logo URL must be an https:// link.');
  const next = { logo_url: logo_url || null, brand_color: /^#[0-9a-f]{6}$/i.test(f.brand_color) ? f.brand_color.toLowerCase() : null };
  const changed = Object.fromEntries(Object.entries(next).filter(([k, v]) => (b[k] ?? null) !== v));
  if (!Object.keys(changed).length) return back(c, path, 'msg', 'No changes.');
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE businesses SET ${Object.keys(changed).map(k => k + ' = ?').join(', ')} WHERE id = ?`).bind(...Object.values(changed), b.id),
    audit(c, 'business', b.id, changed)
  ]);
  return back(c, path, 'msg', 'Saved ✓ Your page is updated.');
});
