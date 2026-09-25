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
  return [
    ['nfc', 'NFC tap opens this device'],
    ...(p.qr ? [['qr', 'QR scan opens this device']] : []),
    ...slots.map(s => ['dest_' + s.slot, `${s.slot === 'main' ? 'Tap' : s.slot.toUpperCase()} → ${linkName(s.link_key)} opens correctly`]),
    ['locked', 'Tag locked (read-only)'],
    ['logo', 'Correct logo'],
    ['business', 'Correct business name'],
    ['product', 'Correct product'],
    ['print', 'Print approved']
  ];
}
