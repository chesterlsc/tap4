// Tap4 staff dashboard: admin.tap4.ph (email + password, role 'admin').
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { secureHeaders } from 'hono/secure-headers';
import qrcode from 'qrcode-generator';
import { CODE_RE, SLOT_RE, LINK_KEYS, PRODUCTS, newCode, normalizeCode, cleanUrl, slugify, initials, checklist, hashPassword, tempPassword } from './lib.js';
import { tapUrl, hostUrl, back, audit, flashQ, text, getBusiness, linksOf, devicesOf, stats, RECENT, saveLinks } from './common.js';
import { loginRoutes, requireRole, accountRoutes, setupRoutes } from './auth.js';
import * as V from './views.js';
import * as common from './common.js';

export const admin = new Hono();
admin.use('*', secureHeaders());
admin.use('*', csrf());
loginRoutes(admin, 'admin');
setupRoutes(admin);
admin.use('*', requireRole('admin'));
accountRoutes(admin, 'admin');

const page = (c, nav, title, body) => common.page(c, 'admin', nav, title, body);
admin.get('/', async c => {
  const db = c.env.DB;
  const [s, counts, top, recent, biz] = await Promise.all([
    stats(db),
    db.prepare(`SELECT CASE WHEN status = 'new' AND first_scan_at IS NOT NULL THEN 'scanned' ELSE status END st, COUNT(*) n FROM devices GROUP BY st`).all(),
    db.prepare(`SELECT b.id, b.name, (SELECT COUNT(*) FROM devices d WHERE d.business_id = b.id) devices,
      (SELECT COUNT(*) FROM events e WHERE e.business_id = b.id AND e.bot = 0 AND e.source IN ('nfc','qr') AND e.ts >= datetime('now', '-30 days')) taps
      FROM businesses b ORDER BY taps DESC, b.name LIMIT 8`).all(),
    db.prepare(RECENT + ' ORDER BY e.ts DESC, e.id DESC LIMIT 12').all(),
    db.prepare('SELECT COUNT(*) n FROM businesses').first()
  ]);
  return page(c, 'overview', 'Overview', V.overviewView({ stats: s, counts: Object.fromEntries(counts.results.map(r => [r.st, r.n])), bizCount: biz.n, top: top.results, recent: recent.results, q: flashQ(c) }));
});

admin.get('/guide', c => page(c, 'guide', 'Staff guide', V.guideView({ tapBase: c.env.TAP_BASE })));

/* businesses */
admin.get('/businesses', async c => {
  const { results } = await c.env.DB.prepare(`SELECT b.*, (SELECT COUNT(*) FROM devices d WHERE d.business_id = b.id) devices,
    (SELECT COUNT(*) FROM devices d WHERE d.business_id = b.id AND d.status = 'active') active,
    (SELECT COUNT(*) FROM events e WHERE e.business_id = b.id AND e.bot = 0 AND e.source IN ('nfc','qr') AND e.ts >= datetime('now', '-30 days')) taps
    FROM businesses b ORDER BY b.name`).all();
  return page(c, 'businesses', 'Clients', V.businessesView({ rows: results, q: flashQ(c) }));
});

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
      return back(c, `/admin/b/${b.id}`, 'msg', 'Client added. Next: paste their links.');
    } catch (err) {
      if (!String(err).includes('UNIQUE')) throw err;
    }
  }
  return back(c, '/admin/businesses', 'err', 'Could not pick a unique slug.');
});

admin.get('/b/:id', async c => {
  const db = c.env.DB, b = await getBusiness(db, c.req.param('id'));
  if (!b) return c.notFound();
  const [links, devices, s, recent, owners] = await Promise.all([
    linksOf(db, b.id),
    devicesOf(db, b.id),
    stats(db, 'business_id', b.id),
    db.prepare(RECENT + ' AND e.business_id = ? ORDER BY e.ts DESC, e.id DESC LIMIT 10').bind(b.id).all(),
    db.prepare('SELECT id, email, name, last_login_at, locked_until FROM users WHERE business_id = ? ORDER BY email').bind(b.id).all()
  ]);
  return page(c, 'businesses', b.name, V.businessView({ b, tapBase: c.env.TAP_BASE, ownerViewUrl: hostUrl(c.env.APP_HOST, `/app/view?id=${b.id}`), links, devices: devices.results, owners: owners.results, stats: s, recent: recent.results, q: flashQ(c) }));
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
  const b = await getBusiness(c.env.DB, c.req.param('id'));
  if (!b) return c.notFound();
  return saveLinks(c, b, await c.req.parseBody(), `/admin/b/${b.id}`);
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
    ? back(c, `/admin/d/${codes[0]}`, 'msg', 'Stand added. Follow the steps below to get it live.')
    : back(c, `/admin/b/${b.id}#stands`, 'msg', `${codes.length} stands added for ${b.name}. Open each one to get it live.`);
});

admin.post('/devices', async c => {
  const f = await c.req.parseBody();
  if (!PRODUCTS[f.sku]) return back(c, '/admin/devices', 'err', 'Pick a product.');
  const codes = await createDevices(c, { sku: f.sku, qty: qtyOf(f.qty), business: null, branch: null });
  return back(c, '/admin/devices', 'msg', `${codes.length} blank ${PRODUCTS[f.sku].name} stands created.`);
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
  return CODE_RE.test(code) ? c.redirect(`/admin/d/${code}`, 303) : back(c, '/admin/devices', 'err', 'Codes are 6 letters/numbers, like K7M2QX. It’s printed on the stand’s page.');
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
    if (!SLOT_RE.test(add) || !valid(f.new_key)) return back(c, path, 'err', 'Use 1–8 lowercase letters or numbers for the name, e.g. menu.');
    if (slots.some(s => s.slot === add)) return back(c, path, 'err', `“${add}” already exists on this stand.`);
    changes[add] = { added: f.new_key };
    stmts.push(db.prepare('INSERT INTO device_slots (device_code, slot, link_key) VALUES (?, ?, ?)').bind(d.code, add, f.new_key));
  }
  if (!stmts.length) return back(c, path, 'msg', 'No changes.');
  await db.batch([...stmts, audit(c, 'device', d.code, { slots: changes })]);
  return back(c, path, 'msg', 'Saved. Taps open the new page from now on.');
});

admin.post('/d/:code/qc', async c => {
  const db = c.env.DB, { d, slots } = await getDevice(db, c.req.param('code'));
  if (!d) return c.notFound();
  const path = `/admin/d/${d.code}`;
  if (d.status !== 'new') return back(c, path, 'err', 'The check is already done. Press “Redo the check” to change it.');
  const f = await c.req.parseBody({ all: true });
  const ticked = new Set([f.check ?? []].flat());
  const items = checklist(d.product_sku, slots);
  const qc = JSON.stringify(Object.fromEntries(items.map(([id]) => [id, ticked.has(id)])));
  const actor = c.get('actor');
  if (f.action === 'pass') {
    if (items.some(([id]) => !ticked.has(id))) return back(c, path, 'err', 'Tick every item first.');
    await db.batch([
      db.prepare(`UPDATE devices SET status = 'qc_passed', qc = ?, qc_by = ?, qc_at = CURRENT_TIMESTAMP WHERE code = ? AND status = 'new'`).bind(qc, actor, d.code),
      audit(c, 'device', d.code, 'qc passed')
    ]);
    return back(c, path, 'msg', 'Quality check passed ✓ Next: go live when it’s handed to the client.');
  }
  if (f.action === 'fail') {
    const note = text(f.note, 200);
    if (!note) return back(c, path, 'err', 'Write what’s wrong in the box first.');
    await db.batch([
      db.prepare(`UPDATE devices SET status = 'disabled', qc = ?, note = trim(coalesce(note, '') || char(10) || ?) WHERE code = ?`).bind(qc, 'QC failed: ' + note, d.code),
      audit(c, 'device', d.code, 'qc failed: ' + note)
    ]);
    return back(c, path, 'msg', 'Marked as failed and paused. Fix it, then reopen setup.');
  }
  await db.prepare('UPDATE devices SET qc = ? WHERE code = ?').bind(qc, d.code).run();
  return back(c, path, 'msg', 'Saved. Finish the check later.');
});

// target status ← statuses it may come from. new → qc_passed only via the QC checklist.
const TRANSITIONS = { active: ['qc_passed'], disabled: ['new', 'qc_passed', 'active'], new: ['qc_passed', 'disabled'] };
admin.post('/d/:code/status', async c => {
  const db = c.env.DB, { d } = await getDevice(db, c.req.param('code'));
  if (!d) return c.notFound();
  const { to } = await c.req.parseBody(), path = `/admin/d/${d.code}`;
  if (!TRANSITIONS[to]?.includes(d.status)) return back(c, path, 'err', 'That step isn’t available right now. Follow the steps at the top.');
  const extra = to === 'active' ? ', activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP)' : to === 'new' ? ', qc_at = NULL, qc_by = NULL' : '';
  await db.batch([
    db.prepare(`UPDATE devices SET status = ?${extra} WHERE code = ? AND status = ?`).bind(to, d.code, d.status),
    audit(c, 'device', d.code, `status ${d.status} → ${to}`)
  ]);
  return back(c, path, 'msg', { active: 'Live! ✓ Customers’ taps now open the right page.', disabled: 'Paused. Taps show a “paused” page.', new: 'Reopened. Follow the steps again.' }[to]);
});

admin.get('/audit', async c => {
  const { results } = await c.env.DB.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all();
  return page(c, 'audit', 'Audit log', V.auditView({ rows: results }));
});


/* owner logins: created by staff, password shown once (no email service yet) */
const showCredentials = async (c, b, email, password, heading) =>
  page(c, 'businesses', 'Owner login', V.credentialsView({ b, email, password, heading, loginUrl: hostUrl(c.env.APP_HOST, '/app/login') }));

admin.post('/b/:id/owners', async c => {
  const db = c.env.DB, b = await getBusiness(db, c.req.param('id'));
  if (!b) return c.notFound();
  const f = await c.req.parseBody(), path = `/admin/b/${b.id}`;
  const email = String(f.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return back(c, path, 'err', 'Type the owner’s email address.');
  const password = tempPassword();
  try {
    const u = await db.prepare(`INSERT INTO users (email, name, password_hash, role, business_id) VALUES (?, ?, ?, 'owner', ?) RETURNING id`)
      .bind(email, text(f.name, 60), await hashPassword(password), b.id).first();
    await audit(c, 'business', b.id, { owner_login_created: email, user: u.id }).run();
  } catch (err) {
    if (String(err).includes('UNIQUE')) return back(c, path, 'err', `${email} already has a login.`);
    throw err;
  }
  return showCredentials(c, b, email, password, 'Owner login created');
});

const ownerOf = (db, b, uid) => db.prepare(`SELECT * FROM users WHERE id = ? AND business_id = ? AND role = 'owner'`).bind(Number(uid) || 0, b.id).first();

admin.post('/b/:id/owners/:uid/reset', async c => {
  const db = c.env.DB, b = await getBusiness(db, c.req.param('id'));
  const u = b && await ownerOf(db, b, c.req.param('uid'));
  if (!u) return c.notFound();
  const password = tempPassword();
  await db.batch([
    db.prepare('UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE id = ?').bind(await hashPassword(password), u.id),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id),
    audit(c, 'business', b.id, { owner_password_reset: u.email })
  ]);
  return showCredentials(c, b, u.email, password, 'New password ready');
});

admin.post('/b/:id/owners/:uid/remove', async c => {
  const db = c.env.DB, b = await getBusiness(db, c.req.param('id'));
  const u = b && await ownerOf(db, b, c.req.param('uid'));
  if (!u) return c.notFound();
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id),
    db.prepare('DELETE FROM users WHERE id = ?').bind(u.id),
    audit(c, 'business', b.id, { owner_login_removed: u.email })
  ]);
  return back(c, `/admin/b/${b.id}`, 'msg', `${u.email} can no longer log in.`);
});
