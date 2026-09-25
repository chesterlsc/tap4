// Server-rendered pages. Everything reuses the live site's theme.css (served from ../assets);
// ADMIN_CSS only adds what the marketing site never needed: tables, selects, status dots.
import { html, raw } from 'hono/html';
import sprite from '../../snippets/icon-sprite.liquid';
import { LINK_KEYS, URL_KEYS, PRODUCTS, linkName, productName, checklist, initials } from './lib.js';

const ADMIN_CSS = `
.adm-head{padding:16px 32px;flex-wrap:wrap}
.adm-nav{overflow-x:auto}
.adm-nav a{padding:10px 18px;border-radius:99px;font-size:14px;font-weight:700;color:var(--m2);white-space:nowrap}
.adm-nav a.on{background:var(--lime);color:var(--bg)}
.adm{max-width:1320px;margin:0 auto;padding:28px 32px 96px;display:flex;flex-direction:column;gap:22px}
.adm h1{font-size:clamp(34px,4.4vw,56px);font-weight:700;letter-spacing:-.055em;line-height:.95}
.adm .sec__head{align-items:flex-end}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:16px;align-items:start}
.tbl-wrap{overflow-x:auto;margin:0 -8px}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{font:500 11px var(--mono);color:var(--m3);text-align:left;padding:8px;white-space:nowrap}
.tbl td{padding:12px 8px;border-top:1px solid var(--l1);vertical-align:middle;white-space:nowrap}
.tbl td.wrap{white-space:normal;min-width:260px}
.tbl tr:hover td{background:#141417}
.tbl a{color:var(--fg);font-weight:600;white-space:nowrap}.tbl a:hover{color:var(--lime)}
.field select,.field textarea{background:var(--bg);border:1px solid var(--l4);border-radius:12px;padding:12px 14px;color:var(--fg);font-size:15px;width:100%;outline:none}
.field select:focus,.field textarea:focus{border-color:var(--lime)}
.field input[type=color]{padding:4px;height:48px}
.btn--sm{padding:9px 16px;font-size:13px}
.st{display:inline-flex;align-items:center;gap:7px;font:700 10px var(--mono);letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.st i{width:8px;height:8px;border-radius:50%}
.flash{padding:14px 16px;border-radius:14px;font-weight:600;font-size:14px}
.flash--ok{background:#16170f;color:var(--lime);box-shadow:inset 0 0 0 1px rgba(200,242,60,.3)}
.flash--err{background:#1f1216;color:#f27fa8;box-shadow:inset 0 0 0 1px rgba(242,127,168,.3)}
.url{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:14px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2)}
.url code{font:500 13px var(--mono);color:var(--fg);flex:1;min-width:0;overflow-wrap:anywhere}
.url .tag{background:var(--l2);color:var(--m1)}
.slotcard{display:grid;grid-template-columns:132px 1fr;gap:16px;padding:16px;border-radius:18px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2)}
.slotcard .stack-10{min-width:0}
.qr{width:132px;height:132px;border-radius:12px;background:#fff;padding:6px}
.qr svg{width:100%;height:100%;display:block}
.qc-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2);font-size:14px;font-weight:600;cursor:pointer}
.qc-item input{accent-color:var(--lime);width:18px;height:18px}
.qc-item:has(input:checked){background:#16170f;box-shadow:inset 0 0 0 1px rgba(200,242,60,.3)}
.deal a{color:var(--fg)}.deal a:hover{color:var(--lime)}
.pipe__col{min-height:220px}
.more{font:500 11px var(--mono);color:var(--m3);text-align:center}
.empty{padding:28px;text-align:center;color:var(--m3);font-size:14px}
.thumb{width:40px;height:40px;border-radius:10px;object-fit:cover;background:var(--l2);display:block}
.bars i{position:relative}
.bars-x{display:flex;justify-content:space-between;font:500 10px var(--mono);color:var(--m5)}
@media (max-width:600px){.adm{padding:20px 16px 72px}.adm-head{padding:14px 16px}.slotcard{grid-template-columns:1fr}}
`;

const ADMIN_JS = `
document.addEventListener('click', async e => {
  const c = e.target.closest('[data-copy]');
  if (c) { await navigator.clipboard.writeText(c.dataset.copy); const t = c.textContent; c.textContent = 'Copied ✓'; setTimeout(() => { c.textContent = t; }, 1200); }
  const p = e.target.closest('[data-png]');
  if (p) {
    e.preventDefault();
    const svg = await (await fetch(p.dataset.png)).text(), img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const cv = document.createElement('canvas'); cv.width = cv.height = 2048;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, 2048, 2048);
    cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = p.dataset.name + '.png'; a.click(); });
  }
});
document.addEventListener('submit', e => { const m = e.submitter?.dataset.confirm || e.target.dataset.confirm; if (m && !confirm(m)) e.preventDefault(); });
const qc = document.getElementById('qc-form');
if (qc) { const sync = () => { const pass = qc.querySelector('[value=pass]'); if (pass) pass.disabled = [...qc.querySelectorAll('input[type=checkbox]')].some(i => !i.checked); }; qc.addEventListener('change', sync); sync(); }
`;

/* ---------- small pieces ---------- */
export const n = v => Number(v || 0).toLocaleString('en-PH');
const ICONS = new Set(['google', 'facebook', 'instagram', 'tiktok', 'menu']);
export const icon = (key, size = 15) => ICONS.has(key)
  ? html`<svg width="${size}" height="${size}" style="fill:currentColor" aria-hidden="true"><use href="#i-${key}"/></svg>`
  : key === 'links' ? html`<span class="tf-mark" style="font-size:${size}px" aria-hidden="true"></span>` : html`<b aria-hidden="true">↗</b>`;
export function ago(ts) {
  if (!ts) return '—';
  const s = Math.max(0, (Date.now() - Date.parse(ts.replace(' ', 'T') + 'Z')) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago';
}
export const STAGES = [
  ['new', 'To encode', '#8a8883'],
  ['scanned', 'In QC', '#7fd8f2'],
  ['qc_passed', 'Ready to ship', '#f2b23c'],
  ['active', 'Active', '#c8f23c'],
  ['disabled', 'Disabled', '#f27fa8']
];
export const stageOf = d => d.status === 'new' && d.first_scan_at ? 'scanned' : d.status;
export const status = d => { const s = STAGES.find(x => x[0] === stageOf(d)); return html`<span class="st"><i style="background:${s[2]}"></i>${s[1]}</span>`; };
const SPLIT_COLORS = { google: '#c8f23c', menu: '#f2f0eb', instagram: '#f27fa8', tiktok: '#7fd8f2', facebook: '#f2b23c', website: '#8a8883' };
const kpi = (label, value, note, lime) => html`<div class="kpi"><span>${label}</span><b>${n(value)}</b><em${lime ? raw(' class="lime"') : ''}>${note}</em></div>`;
const flash = q => html`${q.msg ? html`<div class="flash flash--ok" role="status">${q.msg}</div>` : ''}${q.err ? html`<div class="flash flash--err" role="alert">${q.err}</div>` : ''}`;
const head = (eyebrow, title, aside = '') => html`<div class="sec__head"><div class="sec__titles"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1></div>${aside}</div>`;
const productSelect = (name = 'sku') => html`<label class="field">Product<select name="${name}">${Object.entries(PRODUCTS).map(([sku, p]) => html`<option value="${sku}">${p.name} · ${sku}</option>`)}</select></label>`;
const devLink = d => html`<a href="/admin/d/${d.code}">${d.label || d.code}</a>`;

/* ---------- layouts ---------- */
export function adminPage({ title, nav, actor, body }) {
  const tabs = [['/admin', 'Overview', 'overview'], ['/admin/businesses', 'Businesses', 'businesses'], ['/admin/devices', 'Devices', 'devices'], ['/admin/audit', 'Audit log', 'audit']];
  return html`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0a0a0b"><meta name="robots" content="noindex">
<title>${title} · tapfour admin</title><link rel="preload" href="/instrument-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/theme.css"><style>${raw(ADMIN_CSS)}</style></head>
<body>${raw(sprite)}
<header class="sticky-header site-header"><div class="site-header__in adm-head">
  <a class="brand" href="/admin"><span class="tf-mark" style="font-size:26px" aria-hidden="true"></span>tapfour<span class="tag tag--lime">ADMIN</span></a>
  <nav class="seg adm-nav" aria-label="Admin">${tabs.map(([href, label, id]) => html`<a href="${href}"${nav === id ? raw(' class="on" aria-current="page"') : ''}>${label}</a>`)}</nav>
  <span class="mono-12 m3">${actor}</span>
</div></header>
<main class="adm" id="main">${body}</main>
<script>${raw(ADMIN_JS)}</script></body></html>`;
}

function publicPage(title, body, color) {
  const lime = /^#[0-9a-f]{6}$/i.test(color || '') ? raw(`<style>:root{--lime:${color}}</style>`) : '';
  return html`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0a0a0b"><meta name="robots" content="noindex"><title>${title}</title>
<link rel="stylesheet" href="/theme.css">${lime}<style>
.pub{min-height:100svh;max-width:440px;margin:0 auto;padding:40px 20px 28px;display:flex;flex-direction:column;gap:14px}
.pub .kn{width:84px;height:84px;font-size:26px;overflow:hidden;margin-top:12px}.pub .kn img{width:100%;height:100%;object-fit:cover}
.pub h1{text-align:center;font-size:30px;letter-spacing:-.045em}
.pub .kn-q{font-size:17px;color:var(--m2);font-weight:600}
.pub .kn-link{padding:16px 18px;font-size:16px;border-radius:16px;color:var(--fg)}.pub .kn-link.on{color:var(--bg)}
.pub .kn-link:hover{filter:brightness(1.15)}.pub .kn-link span{margin-left:auto;opacity:.6}
.pub .powered{margin-top:auto;padding-top:24px;font-size:10px}.pub .powered b{color:var(--fg);letter-spacing:0;font-family:'Instrument Sans',sans-serif;font-size:13px}
.pub--msg{justify-content:center;text-align:center;align-items:center}.pub--msg p{color:var(--m3);line-height:1.5}
</style></head><body>${raw(sprite)}<main class="pub${body.msg ? ' pub--msg' : ''}">${body.html}</main></body></html>`;
}

/* ---------- public ---------- */
export function linksPage(b, links, d) {
  const q = d ? `?d=${d}` : '';
  const order = LINK_KEYS.map(([k]) => k).filter(k => links[k]);
  return publicPage(b.name, {
    html: html`
    <div class="kn">${b.logo_url ? html`<img src="${b.logo_url}" alt="">` : initials(b.name)}</div>
    <h1>${b.name}</h1>
    <div class="kn-q">How was your visit?</div>
    <div class="kn-stars" aria-hidden="true">★★★★★</div>
    <nav class="kn-links">${order.length ? order.map((k, i) => html`<a class="kn-link${i === 0 ? ' on' : ''}" href="/p/${b.slug}/go/${k}${q}" rel="noopener">${icon(k, 18)}${linkName(k)}<span>→</span></a>`) : html`<p class="note">Links coming soon.</p>`}</nav>
    <div class="powered">POWERED BY <b>tapfour</b></div>`
  }, b.brand_color);
}

const MESSAGES = {
  notfound: ['Tap not found', 'This tap code isn’t registered. Check the link, or message the business that gave it to you.'],
  disabled: ['This tap is paused', 'The business has paused this stand. Ask a staff member for help.'],
  unassigned: ['Not set up yet', 'This tapfour device hasn’t been linked to a business yet.'],
  down: ['One moment…', 'We couldn’t reach the tap service. Retrying…']
};
export function messagePage(kind) {
  const [t, p] = MESSAGES[kind];
  return publicPage(t, { msg: true, html: html`<span class="tf-mark" style="font-size:44px" aria-hidden="true"></span><h1>${t}</h1><p>${p}</p>${kind === 'down' ? raw('<script>setTimeout(()=>location.reload(),3000)</script>') : ''}<div class="powered">POWERED BY <b>tapfour</b></div>` });
}

/* ---------- analytics block (the site's demo dashboard, with real numbers) ---------- */
export function statsBlock(s, { title, caption, extra = '' }) {
  const max = Math.max(1, ...s.days.map(d => d.n));
  const total = s.split.reduce((a, x) => a + x.n, 0) || 1;
  return html`<div class="dash">
  <div class="dash__top"><b>${title}</b><span class="mono-12 m3">${caption}</span></div>
  <div class="dash__body">
    <div class="kpis">
      ${kpi('TAPS · 30D', s.taps, `NFC ${n(s.nfc)} · QR ${n(s.qr)}`, true)}
      ${kpi('REVIEW PAGE OPENS', s.review, 'Opens, not verified reviews')}
      ${kpi('MENU OPENS', s.menu, 'NFC, QR and links page')}
      ${kpi('UNIQUE VISITORS', s.visitors, 'Counted per day · no IPs stored')}
    </div>
    ${extra}
    <div class="dash__charts">
      <div class="kpi">
        <div class="row-between mono-11 m3"><span>TAPS PER DAY</span><span>LAST 14 DAYS</span></div>
        <div class="bars" role="img" aria-label="Taps per day, last 14 days: ${s.days.map(d => d.n).join(', ')}">${s.days.map((d, i) => html`<i title="${d.d}: ${d.n} taps" style="height:${Math.max(2, Math.round(d.n / max * 100))}%"${i === s.days.length - 1 ? raw(' class="on"') : ''}></i>`)}</div>
        <div class="bars-x"><span>${s.days[0].d.slice(5)}</span><span>TODAY</span></div>
      </div>
      <div class="kpi" style="gap:12px">
        <span>WHERE TAPS GO · 30D</span>
        ${s.split.length ? s.split.map(x => { const pct = Math.round(x.n / total * 100); return html`<div class="split"><div class="row-between"><span>${linkName(x.k)}</span><span class="mono m2">${pct}% · ${n(x.n)}</span></div><div class="split__bar"><i style="width:${pct}%;background:${SPLIT_COLORS[x.k] || '#b5b3ad'}"></i></div></div>`; }) : html`<div class="empty">No taps yet.</div>`}
      </div>
    </div>
  </div></div>`;
}

const recentTable = rows => rows.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>WHEN</th><th>BUSINESS</th><th>DEVICE</th><th>SOURCE</th><th>OPENED</th></tr></thead><tbody>
  ${rows.map(r => html`<tr><td class="mono m3">${ago(r.ts)}</td><td>${r.bid ? html`<a href="/admin/b/${r.bid}">${r.bname}</a>` : '—'}</td><td>${r.device_code ? html`<a href="/admin/d/${r.device_code}">${r.label || r.device_code}</a>` : '—'}</td><td class="mono">${r.source.toUpperCase()}</td><td><span class="row-wrap" style="gap:8px;flex-wrap:nowrap">${icon(r.link_key)}${linkName(r.link_key)}</span></td></tr>`)}
  </tbody></table></div>` : html`<div class="empty">No taps yet. Encode a device and tap it.</div>`;

/* ---------- admin pages ---------- */
export function overviewView({ stats, counts, top, recent, q }) {
  const c = k => counts[k] || 0;
  const extra = html`<div class="kpis">
    <div class="kpi kpi--lime"><span>TO ENCODE</span><b>${n(c('new'))}</b><em>Copy URL → write → lock</em></div>
    <div class="kpi kpi--lime"><span>IN QC</span><b>${n(c('scanned'))}</b><em>Scanned, checklist pending</em></div>
    <div class="kpi kpi--lime"><span>READY TO SHIP</span><b>${n(c('qc_passed'))}</b><em>QC passed</em></div>
    <div class="kpi kpi--lime"><span>ACTIVE</span><b>${n(c('active'))}</b><em>${n(c('disabled'))} disabled</em></div></div>`;
  return html`${flash(q)}${head('OVERVIEW', 'Every tap. Every device.', html`<a class="btn btn--lime" href="/admin/devices">Provisioning queue →</a>`)}
  ${statsBlock(stats, { title: 'tapfour · all businesses', caption: 'LAST 30 DAYS · PH TIME', extra })}
  <div class="grid2">
    <div class="panel"><div class="panel__head"><span>TOP BUSINESSES · 30D</span><a href="/admin/businesses">ALL →</a></div>
      ${top.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>BUSINESS</th><th>DEVICES</th><th>TAPS</th></tr></thead><tbody>${top.map(b => html`<tr><td><a href="/admin/b/${b.id}">${b.name}</a></td><td class="mono">${n(b.devices)}</td><td class="mono lime">${n(b.taps)}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">No businesses yet.</div>`}
    </div>
    <div class="panel"><div class="panel__head"><span>RECENT TAPS</span><span>LIVE</span></div>${recentTable(recent)}</div>
  </div>`;
}

export function businessesView({ rows, q }) {
  return html`${flash(q)}${head('BUSINESSES', 'Customers & their links.')}
  <form class="panel" method="post" action="/admin/businesses">
    <div class="panel__head"><span>NEW BUSINESS</span><span>LINKS & DEVICES NEXT</span></div>
    <div class="fields">
      <label class="field">Business name<input name="name" required maxlength="60" placeholder="Kape Norte"></label>
      <label class="field">Contact person<input name="contact_name" maxlength="60"></label>
      <label class="field">Email<input name="email" type="email" maxlength="120"></label>
      <label class="field">Phone<input name="phone" type="tel" maxlength="30"></label>
    </div>
    <div><button class="btn btn--lime">Create business →</button></div>
  </form>
  <div class="panel"><div class="panel__head"><span>${rows.length} BUSINESSES</span><span>TAPS · 30D</span></div>
    ${rows.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>BUSINESS</th><th>LINKS PAGE</th><th>DEVICES</th><th>ACTIVE</th><th>TAPS · 30D</th><th>CONTACT</th></tr></thead><tbody>
    ${rows.map(b => html`<tr><td><a href="/admin/b/${b.id}">${b.name}</a></td><td class="mono m3">/p/${b.slug}</td><td class="mono">${n(b.devices)}</td><td class="mono">${n(b.active)}</td><td class="mono lime">${n(b.taps)}</td><td class="m3">${b.contact_name || b.email || b.phone || '—'}</td></tr>`)}
    </tbody></table></div>` : html`<div class="empty">Create your first business above.</div>`}
  </div>`;
}

export function businessView({ b, tapBase, links, devices, stats, recent, q }) {
  const deviceRows = devices.map(d => html`<tr>
    <td>${PRODUCTS[d.product_sku]?.img ? html`<img class="thumb" src="/${PRODUCTS[d.product_sku].img}" alt="" loading="lazy">` : html`<span class="thumb"></span>`}</td>
    <td>${devLink(d)}<div class="mono-11 m3">${d.code}</div></td><td>${productName(d.product_sku)}</td><td class="m2">${d.branch || '—'}</td>
    <td class="wrap"><span class="row-wrap" style="gap:6px">${(d.slots || '').split(' ').filter(Boolean).map(s => { const [slot, key] = s.split(':'); return html`<span class="tag tag--glass" title="${slot} → ${linkName(key)}">${slot === 'main' ? '' : slot.toUpperCase() + ' '}${linkName(key)}</span>`; })}</span></td>
    <td>${status(d)}</td><td class="mono lime">${n(d.taps)}</td><td class="mono m3">${ago(d.last_ts)}</td></tr>`);
  return html`${flash(q)}${head('BUSINESS · /p/' + b.slug, b.name, html`<a class="btn btn--ghost" href="${tapBase}/p/${b.slug}" target="_blank" rel="noopener">Open links page ↗</a>`)}
  ${statsBlock(stats, { title: b.name, caption: 'LAST 30 DAYS · PH TIME' })}
  <div class="grid2">
    <form class="panel" method="post" action="/admin/b/${b.id}/links">
      <div class="panel__head"><span>A · DESTINATIONS</span><span>EDIT ANYTIME · NO REPRINT</span></div>
      ${URL_KEYS.map(([k, label]) => html`<label class="field"><span class="row-wrap" style="gap:8px">${icon(k, 13)}${label}</span><input name="${k}" type="url" inputmode="url" placeholder="https://…" value="${links[k] || ''}"></label>`)}
      <div class="note">Every device slot pointing at a destination updates instantly. Changes are audit-logged. https:// links only.</div>
      <div><button class="btn btn--lime">Save destinations</button></div>
    </form>
    <form class="panel" method="post" action="/admin/b/${b.id}">
      <div class="panel__head"><span>B · DETAILS & BRANDING</span><span>SHOWN ON THE LINKS PAGE</span></div>
      <div class="fields">
        <label class="field">Business name<input name="name" required maxlength="60" value="${b.name}"></label>
        <label class="field">Links page slug<input name="slug" required maxlength="40" pattern="[a-z0-9-]+" value="${b.slug}"></label>
        <label class="field">Contact person<input name="contact_name" maxlength="60" value="${b.contact_name || ''}"></label>
        <label class="field">Email<input name="email" type="email" maxlength="120" value="${b.email || ''}"></label>
        <label class="field">Phone<input name="phone" type="tel" maxlength="30" value="${b.phone || ''}"></label>
        <label class="field">Brand color<input name="brand_color" type="color" value="${b.brand_color || '#c8f23c'}"></label>
      </div>
      <label class="field">Logo URL<input name="logo_url" type="url" placeholder="https://…" value="${b.logo_url || ''}"></label>
      <div class="note">Changing the slug breaks old /p/ links that were shared directly. Device taps are unaffected.</div>
      <div><button class="btn btn--ghost">Save details</button></div>
    </form>
  </div>
  <div class="panel"><div class="panel__head"><span>C · DEVICES</span><span>${devices.length} TOTAL</span></div>
    ${devices.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>DEVICE</th><th>PRODUCT</th><th>BRANCH</th><th>TAP OPENS</th><th>STATUS</th><th>TAPS</th><th>LAST TAP</th></tr></thead><tbody>${deviceRows}</tbody></table></div>` : html`<div class="empty">No devices yet.</div>`}
    <form class="fields" method="post" action="/admin/b/${b.id}/devices" style="align-items:end">
      ${productSelect()}
      <label class="field">Quantity<input name="qty" type="number" min="1" max="100" value="1" required></label>
      <label class="field">Branch (optional)<input name="branch" maxlength="40"></label>
      <div><button class="btn btn--lime btn--block">Add devices →</button></div>
    </form>
  </div>
  <div class="panel"><div class="panel__head"><span>RECENT TAPS</span><span>${b.name.toUpperCase()}</span></div>${recentTable(recent)}</div>`;
}

export function devicesView({ cols, q }) {
  return html`${flash(q)}${head('DEVICES · PROVISIONING QUEUE', 'Encode. Scan. Ship.', html`<form method="get" action="/admin/find" class="row-wrap"><label class="field" style="min-width:200px">Find by code<input name="code" required maxlength="12" placeholder="K7M2QX" autocapitalize="characters"></label><button class="btn btn--ghost">Open</button></form>`)}
  <div class="dash"><div class="dash__top"><b>Provisioning</b><span class="mono-12 m3">COPY URL → WRITE & LOCK CHIP → TAP IT → QC → SHIP</span></div>
  <div class="dash__body pipe">
    ${STAGES.map(([id, label, color]) => { const list = cols[id] || []; return html`<div class="pipe__col">
      <div class="row-between"><div class="pipe__name"><i style="background:${color}"></i>${label}</div><span class="mono-12 m3">${list.total || 0}</span></div>
      ${list.map(d => html`<div class="deal"><b>${devLink(d)}</b><div class="row-between"><span>${d.bname || 'Blank stock'}</span><em>${d.code}</em></div><span>${productName(d.product_sku)}${d.branch ? ' · ' + d.branch : ''}</span></div>`)}
      ${list.total > list.length ? html`<div class="more">+${list.total - list.length} more</div>` : ''}
    </div>`; })}
  </div></div>
  <form class="panel" method="post" action="/admin/devices">
    <div class="panel__head"><span>BLANK STOCK</span><span>ENCODE NOW · ASSIGN A BUSINESS LATER</span></div>
    <div class="fields" style="align-items:end">
      ${productSelect()}
      <label class="field">Quantity<input name="qty" type="number" min="1" max="100" value="10" required></label>
      <div><button class="btn btn--lime btn--block">Create stock →</button></div>
    </div>
    <div class="note">Codes are random, so pre-encoded stock can go to any business. Until assigned, a tap shows “Not set up yet”.</div>
  </form>`;
}

export function deviceView({ d, b, slots, businesses, stats, tapUrl, q, qc }) {
  const items = checklist(d.product_sku, slots);
  const p = PRODUCTS[d.product_sku];
  const scanned = q.scan && html`<div class="flash flash--ok" role="status">✓ ${q.scan === 'nfc' ? 'NFC tap' : 'QR scan'} landed here${q.slot && q.slot !== 'main' ? ` (slot ${q.slot})` : ''}, so this ${q.scan === 'nfc' ? 'chip' : 'code'} holds the right URL. Finish the checklist below.</div>`;
  const actions = {
    new: html`<button class="btn btn--lime" name="action" value="pass">Pass QC → ready to ship</button><button class="btn btn--ghost" name="action" value="save">Save progress</button><button class="btn btn--ghost" name="action" value="fail" data-confirm="Mark this device as failed and disable it?">Fail</button>`,
    qc_passed: html`<button class="btn btn--lime" formaction="/admin/d/${d.code}/status" name="to" value="active">Mark shipped · activate</button><button class="btn btn--ghost" formaction="/admin/d/${d.code}/status" name="to" value="new">Reopen QC</button>`,
    active: html`<button class="btn btn--ghost" formaction="/admin/d/${d.code}/status" name="to" value="disabled" data-confirm="Disable this device? Taps will show a “paused” page.">Disable device</button>`,
    disabled: html`<button class="btn btn--ghost" formaction="/admin/d/${d.code}/status" name="to" value="new">Reopen as new</button>`
  }[d.status];
  return html`${flash(q)}${scanned || ''}
  ${head(`DEVICE · ${d.code} · ${productName(d.product_sku).toUpperCase()}`, d.label || d.code, html`<div class="row-wrap">${status(d)}${b ? html`<a class="btn btn--ghost btn--sm" href="/admin/b/${b.id}">${b.name} →</a>` : html`<span class="tag tag--glass">BLANK STOCK</span>`}</div>`)}
  <div class="grid2">
    <div class="panel">
      <div class="panel__head"><span>A · URLS TO WRITE</span><span>PERMANENT · NEVER CHANGE</span></div>
      ${slots.map(s => {
        const nfc = tapUrl('t', s.slot), qr = tapUrl('q', s.slot), svg = `/admin/d/${d.code}/qr.svg?slot=${s.slot}`, name = `${d.code}-${s.slot}`;
        return html`<div class="slotcard">
          <div class="qr">${raw(qc[s.slot])}</div>
          <div class="stack-10">
            <div class="row-between"><b class="row-wrap" style="gap:8px">${icon(s.link_key, 16)}${s.slot === 'main' ? 'Main tap' : 'Slot ' + s.slot.toUpperCase()} → ${linkName(s.link_key)}</b>${s.url ? html`<a class="mono-11" style="white-space:nowrap" href="${s.url}" target="_blank" rel="noopener noreferrer">TEST ↗</a>` : html`<span class="mono-11 m3">${s.link_key === 'links' ? 'HOSTED PAGE' : b ? 'NO URL · FALLS BACK TO LINKS PAGE' : 'UNASSIGNED'}</span>`}</div>
            <div class="url"><span class="tag">NFC</span><code>${nfc}</code><button type="button" class="btn btn--ghost btn--sm" data-copy="${nfc}">Copy</button></div>
            <div class="url"><span class="tag">QR</span><code>${qr}</code><button type="button" class="btn btn--ghost btn--sm" data-copy="${qr}">Copy</button></div>
            <div class="row-wrap"><a class="btn btn--ghost btn--sm" href="${svg}&dl=1" download="${name}.svg">SVG ↓</a><a class="btn btn--ghost btn--sm" href="${svg}" data-png="${svg}" data-name="${name}">PNG ↓</a></div>
          </div></div>`;
      })}
      <div class="note">Write the NFC URL with NFC Tools or NXP TagWriter, then <b>lock the tag</b>. Tap it: while the device is “to encode”, a tap opens this page instead of the destination.</div>
    </div>
    <form class="panel" id="qc-form" method="post" action="/admin/d/${d.code}/qc">
      <div class="panel__head"><span id="qc">B · QC CHECKLIST</span><span>${d.qc_at ? `PASSED BY ${d.qc_by} · ${ago(d.qc_at).toUpperCase()}` : d.first_scan_at ? `FIRST SCAN ${ago(d.first_scan_at).toUpperCase()}` : 'NOT SCANNED YET'}</span></div>
      ${items.map(([id, label]) => html`<label class="qc-item"><input type="checkbox" name="check" value="${id}"${d.qc?.[id] ? raw(' checked') : ''}${d.status !== 'new' ? raw(' disabled') : ''}>${label}</label>`)}
      ${d.status === 'new' ? html`<label class="field">Note (required to fail)<input name="note" maxlength="200" placeholder="e.g. QR print smudged"></label>` : ''}
      <div class="row-wrap">${actions}</div>
    </form>
  </div>
  ${statsBlock(stats, { title: d.label || d.code, caption: 'THIS DEVICE · LAST 30 DAYS' })}
  <div class="grid2">
    <form class="panel" method="post" action="/admin/d/${d.code}">
      <div class="panel__head"><span>C · ASSIGNMENT</span><span>${p?.name || d.product_sku}</span></div>
      <div class="fields">
        <label class="field">Label<input name="label" maxlength="40" value="${d.label || ''}"></label>
        <label class="field">Branch<input name="branch" maxlength="40" value="${d.branch || ''}"></label>
      </div>
      <label class="field">Business<select name="business_id"><option value="">— Blank stock —</option>${businesses.map(x => html`<option value="${x.id}"${x.id === d.business_id ? raw(' selected') : ''}>${x.name}</option>`)}</select></label>
      <label class="field">Internal note<textarea name="note" rows="2" maxlength="500">${d.note || ''}</textarea></label>
      <div><button class="btn btn--ghost">Save</button></div>
    </form>
    <form class="panel" method="post" action="/admin/d/${d.code}/slots">
      <div class="panel__head"><span>D · WHAT EACH TAP OPENS</span><span>SLOT IS BURNED IN · DESTINATION IS NOT</span></div>
      ${slots.map(s => html`<label class="field">${s.slot === 'main' ? 'Main tap' : 'Slot ' + s.slot.toUpperCase()}<select name="slot_${s.slot}">${LINK_KEYS.map(([k, label]) => html`<option value="${k}"${k === s.link_key ? raw(' selected') : ''}>${label}</option>`)}</select></label>`)}
      <div class="fields">
        <label class="field">Add slot (e.g. menu)<input name="new_slot" pattern="[a-z0-9]{1,8}" maxlength="8" placeholder="menu"></label>
        <label class="field">Opens<select name="new_key">${LINK_KEYS.map(([k, label]) => html`<option value="${k}">${label}</option>`)}</select></label>
      </div>
      <div class="note">Add a slot for a second printed QR, like a menu. Slots can't be deleted because their URLs may already be printed.</div>
      <div><button class="btn btn--ghost">Save slots</button></div>
    </form>
  </div>`;
}

export function auditView({ rows }) {
  return html`${head('AUDIT LOG', 'Who changed what.')}
  <div class="panel">${rows.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>WHEN</th><th>WHO</th><th>WHAT</th><th>CHANGE</th></tr></thead><tbody>
  ${rows.map(r => html`<tr><td class="mono m3" title="${r.ts} UTC">${ago(r.ts)}</td><td class="m2">${r.actor}</td><td>${r.entity === 'device' ? html`<a href="/admin/d/${r.entity_id}">device ${r.entity_id}</a>` : r.entity === 'business' ? html`<a href="/admin/b/${r.entity_id}">business #${r.entity_id}</a>` : `${r.entity} ${r.entity_id}`}</td><td class="mono-12 m2 wrap" style="overflow-wrap:anywhere">${r.change}</td></tr>`)}
  </tbody></table></div>` : html`<div class="empty">Nothing yet.</div>`}</div>`;
}
