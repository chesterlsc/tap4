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

// Print designs of the TAP4.1 L-Stand (Shopify order property "Design"). slots: [slot, default link_key].
export const DESIGNS = {
  review: { name: 'Google Review', slots: [['main', 'google']] },
  menu: { name: 'Review + QR menu', slots: [['main', 'google'], ['menu', 'menu']] },
  links: { name: 'Socials 4-in-1', slots: [['main', 'links']] }
};

// Keyed by Shopify SKU. `designs` products take their tap setup from DESIGNS; `retired` ones are
// kept only so stands already made still show properly (they can't be added any more).
export const PRODUCTS = {
  'TF-L41-BLK': { name: 'TAP4.1 L-Stand · Glossy Black', color: 'black', qr: false, designs: true },
  'TF-L41-WHT': { name: 'TAP4.1 L-Stand · Glossy White', color: 'white', qr: false, designs: true },
  'TF-BAR': { name: '4-Tap Bar', img: 'bar-4tap.jpg', qr: false, slots: [['z1', 'google'], ['z2', 'facebook'], ['z3', 'instagram'], ['z4', 'tiktok']] },
  'TF-STAND-ACR': { name: 'Acrylic Glass Stand (retired)', img: 'stand-acrylic.jpg', qr: true, retired: true, slots: [['main', 'google']] },
  'TF-STAND-L': { name: 'L-Stand, old (retired)', img: 'stand-l.jpg', qr: true, retired: true, slots: [['main', 'google']] },
  'TF-STAND-PVC': { name: 'PVC Triangle (retired)', img: 'stand-pvc-menu.jpg', qr: true, retired: true, slots: [['main', 'google'], ['menu', 'menu']] },
  'TF-CARD': { name: '4-in-1 NFC Card (retired)', img: 'card-nfc.jpg', qr: false, retired: true, slots: [['main', 'links']] }
};

// What a design-based stand is, judged from its taps ("main:google menu:menu" or [{slot, link_key}]).
export function designOf(slots) {
  const list = typeof slots === 'string' ? slots.split(' ').filter(Boolean).map(x => x.split(':')) : (slots || []).map(x => [x.slot, x.link_key]);
  if (list.some(([slot]) => slot === 'menu')) return 'menu';
  return list.find(([slot]) => slot === 'main')?.[1] === 'links' ? 'links' : 'review';
}
export const designName = (sku, slots) => (PRODUCTS[sku]?.designs ? DESIGNS[designOf(slots)].name : '');
export function productImage(sku, slots) {
  const p = PRODUCTS[sku];
  return p?.color ? `tapfour-l-${p.color}-${designOf(slots)}.jpg` : p?.img || null;
}
export const slotsFor = (sku, design) => (PRODUCTS[sku]?.designs ? (DESIGNS[design] || DESIGNS.review).slots : PRODUCTS[sku]?.slots || []);

// Product pickers send "SKU" or "SKU:design"; only current (non-retired) products are accepted.
export const productOptions = () => Object.entries(PRODUCTS).filter(([, p]) => !p.retired).flatMap(([sku, p]) =>
  p.designs ? Object.entries(DESIGNS).map(([d, x]) => [`${sku}:${d}`, `${p.name} · ${x.name}`]) : [[sku, p.name]]);
export function parseProductChoice(v) {
  const [sku, design = null] = String(v || '').split(':');
  const p = PRODUCTS[sku];
  if (!p || p.retired || (p.designs && !DESIGNS[design]) || (!p.designs && design)) return null;
  return { sku, design };
}
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
  const printedQr = p.qr || slots.some(s => s.slot !== 'main' && !/^z\d$/.test(s.slot));
  const what = p.designs ? `${p.name.split(' · ')[1] || 'colour'} stand with the “${DESIGNS[designOf(slots)].name}” print` : p.name;
  return [
    ['nfc', 'Tapping the chip with a phone opened this page'],
    ...(printedQr ? [['qr', 'Scanning the printed QR opened this page']] : []),
    ...slots.map(s => ['dest_' + s.slot, `${zone(s)} → ${linkName(s.link_key)}: the link opens the right page (use Test)`]),
    ['locked', 'Chip is locked in the NFC app (so no one can rewrite it)'],
    ['product', `It’s the one the client ordered: ${what}`],
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

// Menu uploads: trust the file's bytes, never its name or declared type, so nothing
// scriptable (HTML, SVG) can be hosted under our domain. Returns [mime, ext] or null.
export function sniffMenuFile(b) {
  const at = (i, ...xs) => xs.every((x, k) => b[i + k] === x);
  const ascii = (i, s) => at(i, ...[...s].map(ch => ch.charCodeAt(0)));
  if (ascii(0, '%PDF-')) return ['application/pdf', 'pdf'];
  if (at(0, 0xff, 0xd8, 0xff)) return ['image/jpeg', 'jpg'];
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return ['image/png', 'png'];
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return ['image/webp', 'webp'];
  if (ascii(4, 'ftyp') && ['heic', 'heix', 'mif1', 'msf1', 'hevc'].some(t => ascii(8, t))) return ['image/heic', 'heic'];
  return null;
}

/* ---------- supplier files ---------- */
// Main taps and 4-in-1 zones are chips; extra parts like "menu" are printed QRs only.
// A main tap also gets a printed QR when the product has a QR backup.
export const hasChip = slot => slot === 'main' || /^z\d$/.test(slot);
export const hasQr = (sku, slot) => (slot === 'main' && !!PRODUCTS[sku]?.qr) || !hasChip(slot);

// CSV cell for spreadsheets: quote when needed, and neutralise formulas (=, +, -, @) so a
// business name can't run as a formula when the supplier opens the file in Excel.
export function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ---------- Google review link from a Place ID ---------- */
// Place IDs look like "ChIJN1t_tDeuEmsRUsoyG83frY4": letters, digits, _ and -. Anything else is rejected.
export const PLACE_ID_RE = /^[A-Za-z0-9_-]{16,300}$/;
export function reviewLinkFromPlaceId(raw) {
  const id = String(raw || '').trim().replace(/^place_id:/i, '');
  return PLACE_ID_RE.test(id) ? `https://search.google.com/local/writereview?placeid=${id}` : null;
}

/* ---------- Google Maps link → Place ID (no API) ---------- */
// Maps links carry a feature ID "0x<a>:0x<b>". A ChIJ Place ID is the same two numbers packed as a
// tiny protobuf (0a 12 | 09 <a, little-endian> | 11 <b, little-endian>), base64url. Verified against
// Google's published IDs; staff still press "Test" before relying on it.
const le64 = hex => { let v = BigInt(hex); const out = []; for (let i = 0; i < 8; i++) { out.push(Number(v & 0xffn)); v >>= 8n; } return out; };
export function placeIdFromFid(fid) {
  const m = /^(0x[0-9a-f]{1,16}):(0x[0-9a-f]{1,16})$/i.exec(String(fid || '').trim());
  // 0x0 halves come from links to a single review or a search, not a business
  if (!m || BigInt(m[1]) === 0n || BigInt(m[2]) === 0n) return null;
  return btoa(String.fromCharCode(0x0a, 0x12, 0x09, ...le64(m[1]), 0x11, ...le64(m[2]))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function parseMapsUrl(raw) {
  let s = String(raw || '');
  try { s = decodeURIComponent(s); } catch { /* keep as-is */ }
  const id = /(?:!19s|place_id:|query_place_id=|placeid=)(ChIJ[A-Za-z0-9_-]{10,})/.exec(s)?.[1];
  const fid = /(?:!1s|ftid=|[?&]fid=)(0x[0-9a-f]{1,16}:0x[0-9a-f]{1,16})/i.exec(s)?.[1];
  // name: /maps/place/<Name>/… or ?q=<Name, address> (minus a leading plus code like "77V3+6JV")
  const found = /\/maps\/place\/([^/@?]+)/.exec(s)?.[1] || /[?&]q=([^&]+)/.exec(s)?.[1];
  const name = found ? found.replace(/\+/g, ' ').replace(/^[A-Z0-9]{4}\s[A-Z0-9]{2,3}\s+/, '').split(',')[0].trim() || null : null;
  return { placeId: id || placeIdFromFid(fid), name, fid: fid || null };
}

export const isReviewLink = url => /^https:\/\/(search\.google\.com\/local\/writereview\?placeid=|g\.page\/r\/[^/]+\/review)/.test(String(url));
// Only these hosts are ever fetched when expanding a pasted link (no open proxy / SSRF).
export const isGoogleHost = host => /^(maps\.app\.goo\.gl|goo\.gl|g\.co|share\.google|g\.page|consent\.google\.com|maps\.google\.com(\.ph)?|(www\.)?google\.com(\.ph)?)$/.test(String(host));
export function isMapsLink(url) {
  try { return !isReviewLink(url) && isGoogleHost(new URL(url).hostname); } catch { return false; }
}
