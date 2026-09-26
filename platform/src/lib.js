// Pure logic shared by the Worker and the tests. No I/O here.

// Crockford base32: no I, L, O, U, so codes survive being read aloud or hand-typed.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{6}$/;

export function newCode(bytes = crypto.getRandomValues(new Uint8Array(6))) {
  return Array.from(bytes, b => ALPHABET[b & 31]).join('');
}

export function normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
}

export const SLOT_RE = /^[a-z0-9]{1,8}$/;

// Destinations a slot can point at. 'links' is the Tap4-hosted page; the rest are business URLs.
export const LINK_KEYS = [
  ['google', 'Google review'],
  ['menu', 'Menu'],
  ['website', 'Website'],
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
  ['links', '4-in-1 links page']
];
export const URL_KEYS = LINK_KEYS.filter(([k]) => k !== 'links');
export const linkName = key => (LINK_KEYS.find(([k]) => k === key) || [key, key])[1];

// Keyed by Shopify SKU (products.csv). slots: [slot, default link_key].
export const PRODUCTS = {
  'TF-STAND-ACR': { name: 'Premium Acrylic + Tap Base', img: 'stand-acrylic.jpg', qr: true, slots: [['main', 'google']] },
  'TF-STAND-L': { name: 'L Acrylic', img: 'stand-l.jpg', qr: true, slots: [['main', 'google']] },
  'TF-STAND-PVC': { name: 'Triangle PVC', img: 'stand-pvc-menu.jpg', qr: true, slots: [['main', 'google'], ['menu', 'menu']] },
  'TF-BAR': { name: '4-in-1 Bar', img: null, qr: false, slots: [['z1', 'google'], ['z2', 'facebook'], ['z3', 'instagram'], ['z4', 'tiktok']] },
  'TF-CARD': { name: 'Personal Card', img: 'card-nfc.jpg', qr: false, slots: [['main', 'links']] }
};
export const productName = sku => PRODUCTS[sku]?.name || sku;

// Destinations are stored, never taken from the request, so this is the only gate against javascript:/data: links.
export function cleanUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  let u;
  try { u = new URL(s); } catch { return null; }
  return u.protocol === 'https:' && u.hostname.includes('.') ? u.href : null;
}

export function slugify(name) {
  return String(name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'business';
}

export function initials(name) {
  return (String(name).trim().split(/\s+/).map(w => w[0]).join('').replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || 'TF').toUpperCase();
}

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless|monitor/i;
export const isBot = ua => !ua || BOT_RE.test(ua);

/**
 * Decide what a tap/scan does. row = device joined with its slot, link and business (or null).
 * Returns { location, log } for a redirect, or { page } for a Tap4 page.
 */
export function resolve(row, { code, slot, source }) {
  if (!row) return { page: 'notfound' };
  if (row.status === 'disabled') return { page: 'disabled' };
  // Unshipped devices open the QC screen for staff; landing there proves the chip holds the right URL.
  if (row.status === 'new') return { location: `/admin/d/${code}?scan=${source}&slot=${slot}`, qcScan: true };
  if (!row.business_id) return { page: 'unassigned' };
  if (row.link_key && row.link_key !== 'links' && row.url) return { location: row.url, log: true };
  return { location: `/p/${row.slug}?d=${code}`, log: true };
}

export function checklist(sku, slots) {
  const p = PRODUCTS[sku] || { qr: false };
  const zone = s => (s.slot === 'main' ? 'Tapping' : s.slot === 'menu' ? 'The menu QR' : `Tap zone ${s.slot.replace(/^z/, '')}`);
  return [
    ['nfc', 'Tapping the chip with a phone opened this page'],
    ...(p.qr ? [['qr', 'Scanning the printed QR opened this page']] : []),
    ...slots.map(s => ['dest_' + s.slot, `${zone(s)} → ${linkName(s.link_key)}: the link opens the right page (use Test)`]),
    ['locked', 'Chip is locked in the NFC app (so no one can rewrite it)'],
    ['logo', 'Logo is correct'],
    ['business', 'Business name is spelled right'],
    ['product', 'It’s the product the client ordered'],
    ['print', 'Print is clean: no smudges or scratches']
  ];
}

/* ---------- auth ---------- */
// PBKDF2-SHA256 at 100k iterations: the maximum Workers' WebCrypto allows. Stored as pbkdf2$iter$salt$hash.
const ITERATIONS = 100000;
const b64 = u8 => btoa(String.fromCharCode(...u8));
const unb64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password, stored) {
  const [alg, iterations, salt, hash] = String(stored || '').split('$');
  if (alg !== 'pbkdf2' || !salt || !hash) return false;
  const got = await pbkdf2(String(password), unb64(salt), Number(iterations)), want = unb64(hash);
  let diff = got.length ^ want.length; // constant-time compare
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ (want[i] ?? 0);
  return diff === 0;
}

export const passwordProblem = pw => String(pw).length < 10 ? 'Use at least 10 characters.' : String(pw).length > 200 ? 'That password is too long.' : null;

// One-time password an admin hands to an owner: 3 groups of 4 unambiguous chars (60 bits).
export function tempPassword(bytes = crypto.getRandomValues(new Uint8Array(12))) {
  return Array.from(bytes, b => ALPHABET[b & 31]).join('').toLowerCase().replace(/(.{4})(?=.)/g, '$1-');
}

export function newToken() {
  return b64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Post-login redirect target: only paths inside this area, never another host.
export function safeNext(next, prefix) {
  const s = String(next || '');
  return (s === prefix || s.startsWith(prefix + '/')) && !s.includes('//') && !s.includes('\\') ? s : prefix;
}
