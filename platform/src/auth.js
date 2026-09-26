// Email + password logins for both dashboards. Cookies are per host, so an admin.tap4.ph session
// never works on dashboard.tap4.ph and vice versa; the role check below enforces the same thing locally.
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { hashPassword, verifyPassword, passwordProblem, newToken, sha256hex, safeNext } from './lib.js';
import { back, flashQ } from './common.js';
import * as common from './common.js';
import * as V from './views.js';

const COOKIE = 'tf_session';
// Admins may also sign in to the owners' dashboard (to see what an owner sees); owners never reach /admin.
export const AREAS = {
  admin: { prefix: '/admin', ttlHours: 12, roles: ['admin'] },
  owner: { prefix: '/app', ttlHours: 24 * 30, roles: ['owner', 'admin'] }
};
const ADMIN_TTL = 12; // an admin session is short-lived on either host
const MAX_FAILS = 5; // then locked for 15 minutes
let dummyHash; // verify against something even for unknown emails, so timing doesn't reveal which emails exist

export async function currentUser(c) {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  return c.env.DB.prepare(`SELECT u.id, u.email, u.name, u.role, u.business_id FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')`).bind(await sha256hex(token)).first();
}

export function requireRole(area) {
  const { prefix, roles } = AREAS[area];
  return async (c, next) => {
    const user = await currentUser(c);
    if (!user || !roles.includes(user.role)) {
      if (c.req.method !== 'GET') return c.text('Signed out. Please log in again.', 401);
      return c.redirect(`${prefix}/login?next=${encodeURIComponent(c.req.path)}`, 302);
    }
    c.set('user', user);
    c.set('actor', user.email);
    return next();
  };
}

export function loginRoutes(app, area) {
  const { prefix, ttlHours, roles } = AREAS[area];
  const role = area; // the login page's look
  const view = (c, { err, email, status = 200 } = {}) =>
    c.html(V.loginPage({ area: role, action: `${prefix}/login`, next: safeNext(c.req.query('next'), prefix), email, err }), status, { 'Cache-Control': 'no-store' });

  app.get('/login', async c => (roles.includes((await currentUser(c))?.role) ? c.redirect(prefix, 302) : view(c)));

  app.post('/login', async c => {
    const db = c.env.DB, f = await c.req.parseBody();
    const email = String(f.email || '').trim().toLowerCase().slice(0, 120), password = String(f.password || '').slice(0, 200);
    const user = email && await db.prepare(`SELECT *, (locked_until > datetime('now')) locked FROM users WHERE email = ? AND role IN (${roles.map(() => '?').join(', ')})`).bind(email, ...roles).first();
    if (user?.locked) return view(c, { email, status: 429, err: 'Too many attempts. Try again in 15 minutes.' });
    dummyHash ||= await hashPassword('not-a-real-password');
    const ok = await verifyPassword(password, user ? user.password_hash : dummyHash) && !!user;
    if (!ok) {
      if (user) await db.prepare(`UPDATE users SET failed_logins = failed_logins + 1,
        locked_until = CASE WHEN failed_logins + 1 >= ? THEN datetime('now', '+15 minutes') ELSE locked_until END WHERE id = ?`).bind(MAX_FAILS, user.id).run();
      return view(c, { email, status: 401, err: 'Wrong email or password.' });
    }
    const token = newToken();
    await db.batch([
      db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`),
      db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', ?))`).bind(await sha256hex(token), user.id, `+${user.role === 'admin' ? ADMIN_TTL : ttlHours} hours`),
      db.prepare(`UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(user.id)
    ]);
    setCookie(c, COOKIE, token, { httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Lax', path: '/', maxAge: (user.role === 'admin' ? ADMIN_TTL : ttlHours) * 3600 });
    return c.redirect(safeNext(f.next, prefix), 303);
  });

  app.post('/logout', async c => {
    const token = getCookie(c, COOKIE);
    if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256hex(token)).run();
    deleteCookie(c, COOKIE, { path: '/' });
    return c.redirect(`${prefix}/login`, 303);
  });
}

export function accountRoutes(app, role) {
  const { prefix } = AREAS[role];
  app.get('/account', c => common.page(c, role, 'account', 'Account', V.accountView({ user: c.get('user'), prefix, q: flashQ(c) })));
  app.post('/account/password', async c => {
    const db = c.env.DB, f = await c.req.parseBody(), path = `${prefix}/account`, user = c.get('user');
    const row = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();
    if (!await verifyPassword(String(f.current || ''), row.password_hash)) return back(c, path, 'err', 'Your current password is wrong.');
    const problem = passwordProblem(f.password || '');
    if (problem) return back(c, path, 'err', problem);
    if (f.password !== f.confirm) return back(c, path, 'err', 'The new passwords don’t match.');
    const keep = await sha256hex(getCookie(c, COOKIE) || '');
    await db.batch([
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(f.password), user.id),
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, keep), // sign out other devices
      common.audit(c, 'user', user.id, 'changed own password')
    ]);
    return back(c, path, 'msg', 'Password changed. Other devices were signed out.');
  });
}

// First-admin setup in the browser, for when the terminal command isn't practical.
// Works only while (a) the SETUP_TOKEN secret is set and (b) no admin exists yet; then it's gone for good.
export function setupRoutes(app) {
  const open = async c => !!c.env.SETUP_TOKEN && !(await c.env.DB.prepare(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`).first());
  const view = (c, { err, email, status = 200 } = {}) => c.html(V.setupPage({ email, err }), status, { 'Cache-Control': 'no-store' });
  app.get('/setup', async c => ((await open(c)) ? view(c) : c.redirect('/admin/login', 302)));
  app.post('/setup', async c => {
    if (!(await open(c))) return c.redirect('/admin/login', 303);
    const f = await c.req.parseBody();
    const email = String(f.email || '').trim().toLowerCase().slice(0, 120), password = String(f.password || '');
    // Compare hashes so the check takes the same time however much of the code matches.
    if ((await sha256hex(String(f.code || '').trim())) !== (await sha256hex(c.env.SETUP_TOKEN))) return view(c, { email, status: 403, err: 'That setup code is wrong.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return view(c, { email, status: 400, err: 'Enter a valid email.' });
    const problem = passwordProblem(password);
    if (problem) return view(c, { email, status: 400, err: problem });
    if (password !== f.confirm) return view(c, { email, status: 400, err: 'The passwords don’t match.' });
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')`).bind(email, await hashPassword(password)),
      c.env.DB.prepare('INSERT INTO audit_log (actor, entity, entity_id, change) VALUES (?, ?, ?, ?)').bind(email, 'user', email, 'first admin created via setup page')
    ]);
    return c.redirect('/admin/login', 303);
  });
}
