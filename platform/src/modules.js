// tapfour app modules sold on the landing page, in the owner dashboard (/app). Admins reach them via
// "View as owner". Every query is scoped to c.get('business') (the owner's own business, from the session).
import { PLANS, planHas, pesosToCents, parseMenuText, phNow, ymd, addMonth, staffStatus } from './lib.js';
import { back, audit, flashQ, text, TZ } from './common.js';
import * as common from './common.js';
import * as VA from './views-app.js';

const page = (c, nav, title, body) => common.page(c, 'owner', nav, title, body);
const int = v => Number.parseInt(v, 10) || 0;
const num = v => { const x = Number(String(v ?? '').replace(',', '.').trim()); return String(v ?? '').trim() !== '' && Number.isFinite(x) ? x : null; };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const branchesOf = async (db, id) => (await db.prepare('SELECT id, name, address FROM branches WHERE business_id = ? ORDER BY name').bind(id).all()).results;
const pickBranch = (branches, v) => branches.find(x => x.name === v)?.name || null; // only the client's own branches

// Not in the plan → a friendly "part of the tapfour app" page instead of the module.
const need = module => async (c, next) => planHas(c.get('business'), module) ? next() : page(c, module, 'Not in your plan', VA.upsell(c.get('business'), module));

// Home "Needs you" panel: bills due within a week, low stock, who's on shift.
export async function needsYou(db, b) {
  if (!b.plan || b.plan_status === 'cancelled') return null;
  const week = ymd(new Date(phNow().getTime() + 7 * 864e5)), out = { today: ymd(phNow()) };
  if (planHas(b, 'billing')) out.bills = (await db.prepare('SELECT id, name, amount_cents, due_date, branch FROM bills WHERE business_id = ? AND paid_at IS NULL AND due_date <= ? ORDER BY due_date LIMIT 5').bind(b.id, week).all()).results;
  if (planHas(b, 'inventory')) out.low = (await db.prepare('SELECT id, name, qty, unit, branch FROM stock_items WHERE business_id = ? AND low_at IS NOT NULL AND qty <= low_at ORDER BY qty LIMIT 5').bind(b.id).all()).results;
  if (planHas(b, 'staff')) {
    const staff = (await db.prepare('SELECT * FROM staff WHERE business_id = ?').bind(b.id).all()).results;
    out.onShift = staff.filter(s => staffStatus(s) === 'on').length;
    out.staffTotal = staff.length;
  }
  return out;
}

export function registerModules(app) {
  /* ---------- live QR menu ---------- */
  const menuItems = (db, id) => db.prepare('SELECT * FROM menu_items WHERE business_id = ? ORDER BY sort, id').bind(id).all();
  app.get('/menu', need('menu'), async c => {
    const b = c.get('business');
    return page(c, 'menu', 'Menu', VA.menuView({ b, items: (await menuItems(c.env.DB, b.id)).results, tapBase: c.env.TAP_BASE, q: flashQ(c) }));
  });
  app.post('/menu/add', need('menu'), async c => {
    const b = c.get('business'), f = await c.req.parseBody(), name = text(f.name, 60), price = pesosToCents(f.price);
    if (!name) return back(c, '/app/menu', 'err', 'Type the item name.');
    if (price === undefined) return back(c, '/app/menu', 'err', 'Price should be a number, like 165 or 89.50.');
    await c.env.DB.prepare(`INSERT INTO menu_items (business_id, category, name, note, price_cents, sort)
      VALUES (?1, ?2, ?3, ?4, ?5, (SELECT COALESCE(MAX(sort), 0) + 1 FROM menu_items WHERE business_id = ?1))`)
      .bind(b.id, text(f.category, 40) || 'Menu', name, text(f.note, 80), price).run();
    return back(c, '/app/menu', 'msg', `Added “${name}” ✓ It’s on your menu now.`);
  });
  app.post('/menu/import', need('menu'), async c => {
    const b = c.get('business'), f = await c.req.parseBody(), items = parseMenuText(f.text).slice(0, 300), db = c.env.DB;
    if (!items.length) return back(c, '/app/menu', 'err', 'Nothing to add. Put each item on its own line, like “Sagada Latte | Double shot | 165”.');
    const { m } = await db.prepare('SELECT COALESCE(MAX(sort), 0) m FROM menu_items WHERE business_id = ?').bind(b.id).first();
    await db.batch([
      ...(f.replace === '1' ? [db.prepare('DELETE FROM menu_items WHERE business_id = ?').bind(b.id)] : []),
      ...items.map((i, k) => db.prepare('INSERT INTO menu_items (business_id, category, name, note, price_cents, sort) VALUES (?, ?, ?, ?, ?, ?)').bind(b.id, i.category, i.name, i.note, i.price_cents, (f.replace === '1' ? 0 : m) + k + 1)),
      audit(c, 'business', b.id, { menu: `${f.replace === '1' ? 'replaced with' : 'added'} ${items.length} items` })
    ]);
    return back(c, '/app/menu', 'msg', `${items.length} items ${f.replace === '1' ? 'saved as your new menu' : 'added'} ✓`);
  });
  app.post('/menu/:id', need('menu'), async c => {
    const b = c.get('business'), f = await c.req.parseBody(), name = text(f.name, 60), price = pesosToCents(f.price);
    if (!name || price === undefined) return back(c, '/app/menu', 'err', !name ? 'Items need a name.' : 'Price should be a number, like 165 or 89.50.');
    await c.env.DB.prepare('UPDATE menu_items SET name = ?, note = ?, price_cents = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ?')
      .bind(name, text(f.note, 80), price, text(f.category, 40) || 'Menu', int(c.req.param('id')), b.id).run();
    return back(c, '/app/menu', 'msg', `Saved “${name}” ✓`);
  });
  app.post('/menu/:id/soldout', need('menu'), async c => {
    await c.env.DB.prepare('UPDATE menu_items SET sold_out = 1 - sold_out, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ?').bind(int(c.req.param('id')), c.get('business').id).run();
    return c.redirect('/app/menu#i' + int(c.req.param('id')), 303);
  });
  app.post('/menu/:id/delete', need('menu'), async c => {
    await c.env.DB.prepare('DELETE FROM menu_items WHERE id = ? AND business_id = ?').bind(int(c.req.param('id')), c.get('business').id).run();
    return back(c, '/app/menu', 'msg', 'Removed from the menu.');
  });

  /* ---------- billing tracker ---------- */
  app.get('/billing', need('billing'), async c => {
    const b = c.get('business'), db = c.env.DB;
    const [open, paid, branches] = await Promise.all([
      db.prepare('SELECT * FROM bills WHERE business_id = ? AND paid_at IS NULL ORDER BY due_date, id').bind(b.id).all(),
      db.prepare(`SELECT * FROM bills WHERE business_id = ? AND paid_at >= datetime('now', '-60 days') ORDER BY paid_at DESC LIMIT 30`).bind(b.id).all(),
      branchesOf(db, b.id)
    ]);
    return page(c, 'billing', 'Billing', VA.billingView({ b, open: open.results, paid: paid.results, branches, today: ymd(phNow()), q: flashQ(c) }));
  });
  app.post('/billing/add', need('billing'), async c => {
    const b = c.get('business'), f = await c.req.parseBody(), name = text(f.name, 60), amount = pesosToCents(f.amount);
    if (!name) return back(c, '/app/billing', 'err', 'What is the bill for? (e.g. Electricity)');
    if (amount === undefined) return back(c, '/app/billing', 'err', 'Amount should be a number, like 8400.');
    if (!DATE_RE.test(f.due || '')) return back(c, '/app/billing', 'err', 'Pick the due date.');
    const branch = pickBranch(await branchesOf(c.env.DB, b.id), f.branch);
    await c.env.DB.prepare('INSERT INTO bills (business_id, branch, name, amount_cents, due_date, repeat_monthly) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(b.id, branch, name, amount, f.due, f.repeat ? 1 : 0).run();
    return back(c, '/app/billing', 'msg', `Added “${name}” ✓`);
  });
  app.post('/billing/:id/paid', need('billing'), async c => {
    const b = c.get('business'), db = c.env.DB;
    const bill = await db.prepare('SELECT * FROM bills WHERE id = ? AND business_id = ? AND paid_at IS NULL').bind(int(c.req.param('id')), b.id).first();
    if (!bill) return back(c, '/app/billing', 'err', 'That bill is already paid or was removed.');
    await db.batch([
      db.prepare('UPDATE bills SET paid_at = CURRENT_TIMESTAMP WHERE id = ?').bind(bill.id),
      ...(bill.repeat_monthly ? [db.prepare('INSERT INTO bills (business_id, branch, name, amount_cents, due_date, repeat_monthly) VALUES (?, ?, ?, ?, ?, 1)').bind(b.id, bill.branch, bill.name, bill.amount_cents, addMonth(bill.due_date))] : [])
    ]);
    return back(c, '/app/billing', 'msg', `Marked “${bill.name}” as paid ✓${bill.repeat_monthly ? ` Next one added for ${addMonth(bill.due_date)}.` : ''}`);
  });
  app.post('/billing/:id/delete', need('billing'), async c => {
    await c.env.DB.prepare('DELETE FROM bills WHERE id = ? AND business_id = ?').bind(int(c.req.param('id')), c.get('business').id).run();
    return back(c, '/app/billing', 'msg', 'Bill removed.');
  });

  /* ---------- inventory tracker ---------- */
  app.get('/inventory', need('inventory'), async c => {
    const b = c.get('business'), db = c.env.DB;
    const [items, branches] = await Promise.all([
      db.prepare('SELECT * FROM stock_items WHERE business_id = ? ORDER BY (low_at IS NOT NULL AND qty <= low_at) DESC, name').bind(b.id).all(),
      branchesOf(db, b.id)
    ]);
    return page(c, 'inventory', 'Inventory', VA.inventoryView({ b, items: items.results, branches, q: flashQ(c) }));
  });
  app.post('/inventory/add', need('inventory'), async c => {
    const b = c.get('business'), f = await c.req.parseBody(), name = text(f.name, 60), qty = num(f.qty), low = num(f.low_at);
    if (!name) return back(c, '/app/inventory', 'err', 'Type the item name (e.g. Oat milk).');
    if (qty === null || qty < 0) return back(c, '/app/inventory', 'err', 'How much is left? Type a number.');
    const branch = pickBranch(await branchesOf(c.env.DB, b.id), f.branch);
    await c.env.DB.prepare('INSERT INTO stock_items (business_id, branch, name, unit, qty, low_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(b.id, branch, name, text(f.unit, 20), qty, low !== null && low >= 0 ? low : null).run();
    return back(c, '/app/inventory', 'msg', `Added “${name}” ✓`);
  });
  app.post('/inventory/:id/adjust', need('inventory'), async c => {
    const f = await c.req.parseBody(), set = num(f.set), delta = num(f.delta);
    if (set === null && delta === null) return back(c, '/app/inventory', 'err', 'Type how much is left.');
    await c.env.DB.prepare(`UPDATE stock_items SET qty = MAX(0, ${set !== null ? '?' : 'qty + ?'}), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ?`)
      .bind(set !== null ? set : delta, int(c.req.param('id')), c.get('business').id).run();
    return c.redirect('/app/inventory#s' + int(c.req.param('id')), 303);
  });
  app.post('/inventory/:id/delete', need('inventory'), async c => {
    await c.env.DB.prepare('DELETE FROM stock_items WHERE id = ? AND business_id = ?').bind(int(c.req.param('id')), c.get('business').id).run();
    return back(c, '/app/inventory', 'msg', 'Item removed.');
  });

  /* ---------- branches (Business / Empire) ---------- */
  app.get('/branches', need('branches'), async c => {
    const b = c.get('business');
    const { results } = await c.env.DB.prepare(`SELECT br.id, br.name, br.address,
      (SELECT COUNT(*) FROM devices d WHERE d.business_id = br.business_id AND d.branch = br.name) stands,
      (SELECT COUNT(*) FROM events e JOIN devices d ON d.code = e.device_code WHERE d.business_id = br.business_id AND d.branch = br.name
        AND e.bot = 0 AND e.source IN ('nfc','qr') AND e.ts >= datetime('now', '-30 days')) taps
      FROM branches br WHERE br.business_id = ? ORDER BY taps DESC, br.name`).bind(b.id).all();
    return page(c, 'branches', 'Branches', VA.branchesView({ b, rows: results, limit: PLANS[b.plan].branches, q: flashQ(c) }));
  });
  app.post('/branches/add', need('branches'), async c => {
    const b = c.get('business'), f = await c.req.parseBody(), name = text(f.name, 40), db = c.env.DB;
    if (!name) return back(c, '/app/branches', 'err', 'Type the branch name (e.g. BGC).');
    const { n } = await db.prepare('SELECT COUNT(*) n FROM branches WHERE business_id = ?').bind(b.id).first();
    if (n >= PLANS[b.plan].branches) return back(c, '/app/branches', 'err', `Your ${PLANS[b.plan].name} plan covers ${PLANS[b.plan].branches} branches. Message Tap4 to upgrade.`);
    try {
      await db.batch([db.prepare('INSERT INTO branches (business_id, name, address) VALUES (?, ?, ?)').bind(b.id, name, text(f.address, 120)), audit(c, 'business', b.id, { branch_added: name })]);
    } catch (err) {
      if (String(err).includes('UNIQUE')) return back(c, '/app/branches', 'err', `You already have a branch called “${name}”.`);
      throw err;
    }
    return back(c, '/app/branches', 'msg', `Branch “${name}” added ✓`);
  });
  app.post('/branches/:id', need('branches'), async c => {
    const b = c.get('business'), f = await c.req.parseBody(), name = text(f.name, 40), db = c.env.DB;
    const br = await db.prepare('SELECT * FROM branches WHERE id = ? AND business_id = ?').bind(int(c.req.param('id')), b.id).first();
    if (!br || !name) return back(c, '/app/branches', 'err', 'Type the branch name.');
    // a rename carries over to every stand, bill, stock item and staff member at that branch
    try {
      await db.batch([
        db.prepare('UPDATE branches SET name = ?, address = ? WHERE id = ?').bind(name, text(f.address, 120), br.id),
        ...['devices', 'bills', 'stock_items', 'staff'].map(t => db.prepare(`UPDATE ${t} SET branch = ? WHERE business_id = ? AND branch = ?`).bind(name, b.id, br.name)),
        audit(c, 'business', b.id, { branch_renamed: { from: br.name, to: name } })
      ]);
    } catch (err) {
      if (String(err).includes('UNIQUE')) return back(c, '/app/branches', 'err', `You already have a branch called “${name}”.`);
      throw err;
    }
    return back(c, '/app/branches', 'msg', 'Branch saved ✓');
  });

  /* ---------- staff tracker (Empire) ---------- */
  app.get('/staff', need('staff'), async c => {
    const b = c.get('business'), db = c.env.DB;
    const [staff, branches] = await Promise.all([db.prepare('SELECT * FROM staff WHERE business_id = ? ORDER BY branch, name').bind(b.id).all(), branchesOf(db, b.id)]);
    return page(c, 'staff', 'Staff', VA.staffView({ b, staff: staff.results.map(s => ({ ...s, now: staffStatus(s) })), branches, q: flashQ(c) }));
  });
  app.post('/staff/add', need('staff'), async c => {
    const b = c.get('business'), f = await c.req.parseBody({ all: true }), name = text(f.name, 60);
    if (!name) return back(c, '/app/staff', 'err', 'Type the staff member’s name.');
    const picked = new Set([f.day ?? []].flat().map(String));
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => (picked.has(String(i)) ? '1' : '0')).join('');
    const start = TIME_RE.test(f.start || '') ? f.start : null, end = TIME_RE.test(f.end || '') ? f.end : null;
    await c.env.DB.prepare('INSERT INTO staff (business_id, branch, name, role, days, shift_start, shift_end) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(b.id, pickBranch(await branchesOf(c.env.DB, b.id), f.branch), name, text(f.role, 40), days, start, end).run();
    return back(c, '/app/staff', 'msg', `Added ${name} ✓`);
  });
  app.post('/staff/:id/delete', need('staff'), async c => {
    await c.env.DB.prepare('DELETE FROM staff WHERE id = ? AND business_id = ?').bind(int(c.req.param('id')), c.get('business').id).run();
    return back(c, '/app/staff', 'msg', 'Removed from staff.');
  });

  /* ---------- monthly report (Business / Empire): print or save as PDF ---------- */
  app.get('/reports', need('reports'), async c => {
    const b = c.get('business'), db = c.env.DB, thisMonth = ymd(phNow()).slice(0, 7);
    const m = /^\d{4}-\d{2}$/.test(c.req.query('m') || '') && c.req.query('m') <= thisMonth ? c.req.query('m') : thisMonth;
    const [y, mo] = m.split('-').map(Number), next = ymd(new Date(Date.UTC(y, mo, 1))).slice(0, 7);
    // PH month → UTC range
    const inMonth = col => `${col} >= datetime('${m}-01', '-8 hours') AND ${col} < datetime('${next}-01', '-8 hours')`, range = inMonth('ts');
    const q = sql => db.prepare(sql).bind(b.id);
    const [tot, split, byBranch, hours, days] = await db.batch([
      q(`SELECT SUM(source IN ('nfc','qr')) taps, SUM(source = 'nfc') nfc, SUM(source = 'qr') qr, SUM(link_key = 'google') review, SUM(link_key = 'menu') menu, COUNT(DISTINCT visitor) visitors FROM events WHERE business_id = ? AND bot = 0 AND ${range}`),
      q(`SELECT link_key k, COUNT(*) n FROM events WHERE business_id = ? AND bot = 0 AND link_key IS NOT NULL AND link_key != 'links' AND ${range} GROUP BY k ORDER BY n DESC`),
      q(`SELECT COALESCE(d.branch, 'No branch') branch, COUNT(*) n FROM events e LEFT JOIN devices d ON d.code = e.device_code WHERE e.business_id = ? AND e.bot = 0 AND e.source IN ('nfc','qr') AND ${inMonth('e.ts')} GROUP BY branch ORDER BY n DESC`),
      q(`SELECT CAST(strftime('%H', ts, '${TZ}') AS INTEGER) h, COUNT(*) n FROM events WHERE business_id = ? AND bot = 0 AND source IN ('nfc','qr') AND ${range} GROUP BY h`),
      q(`SELECT date(ts, '${TZ}') d, COUNT(*) n FROM events WHERE business_id = ? AND bot = 0 AND source IN ('nfc','qr') AND ${range} GROUP BY d`)
    ]);
    const t = tot.results[0] || {};
    return page(c, 'reports', 'Report', VA.reportView({ b, month: m, thisMonth, t, split: split.results, byBranch: byBranch.results, hours: Array.from({ length: 24 }, (_, h) => hours.results.find(r => r.h === h)?.n || 0), days: days.results }));
  });
}
