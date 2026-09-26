// Server-rendered pages. Everything reuses the live site's theme.css (served from ../assets);
// ADMIN_CSS only adds what the marketing site never needed: tables, steps, hints, help boxes.
// Writing rule: plain words a café owner understands. No "slots", "QC" or "destinations" on screen.
import { html, raw } from 'hono/html';
import sprite from '../../snippets/icon-sprite.liquid';
import { LINK_KEYS, URL_KEYS, PRODUCTS, linkName, productName, checklist, initials } from './lib.js';

export const SUPPORT_EMAIL = 'hello@tap4.ph';

const ADMIN_CSS = `
.adm-head{padding:16px 32px;flex-wrap:wrap}
.login{min-height:100svh;display:grid;place-items:center;padding:24px 16px}
.login__box{width:min(100%,420px);display:flex;flex-direction:column;gap:22px;align-items:center}
.login__box .panel{width:100%}
.login__h{font-size:26px;letter-spacing:-.04em}
.pw{font:700 22px var(--mono);letter-spacing:.06em;color:var(--lime)}
.adm-nav{overflow-x:auto;scrollbar-width:none}
.adm-nav::-webkit-scrollbar{display:none}
.adm-nav a{padding:10px 18px;border-radius:99px;font-size:14px;font-weight:700;color:var(--m2);white-space:nowrap}
.adm-nav a.on{background:var(--lime);color:var(--bg)}
.adm{max-width:1320px;margin:0 auto;padding:28px 32px 96px;display:flex;flex-direction:column;gap:22px}
.adm h1{font-size:clamp(34px,4.4vw,56px);font-weight:700;letter-spacing:-.055em;line-height:.95}
.adm h2{font-size:clamp(24px,2.6vw,32px);font-weight:700;letter-spacing:-.045em;line-height:1}
.adm .sec__head{align-items:flex-end}
.lead{font-size:16px;color:var(--m2);line-height:1.5;max-width:720px}
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
.field>b{font-size:15px;color:var(--fg)}
.hint{font-size:12.5px;color:var(--m3);line-height:1.45}
.hint b{color:var(--m1)}
.btn--sm{padding:9px 16px;font-size:13px}
.st{display:inline-flex;align-items:center;gap:7px;font:700 10px var(--mono);letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.st i{width:8px;height:8px;border-radius:50%}
.flash{padding:14px 16px;border-radius:14px;font-weight:600;font-size:14px}
.flash--ok{background:#16170f;color:var(--lime);box-shadow:inset 0 0 0 1px rgba(200,242,60,.3)}
.flash--err{background:#1f1216;color:#f27fa8;box-shadow:inset 0 0 0 1px rgba(242,127,168,.3)}
.url{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:14px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2)}
.url code{font:500 13px var(--mono);color:var(--fg);flex:1 1 200px;min-width:0;overflow-wrap:anywhere}
.standrow{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:6px 14px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2);color:inherit}
.standrow:hover{box-shadow:inset 0 0 0 1.5px var(--lime);color:inherit}
.standrow .thumb{width:48px;height:48px;grid-row:span 2}
.standrow b{font-size:15px}.standrow small{display:block;font-size:12.5px;color:var(--m3);line-height:1.4}
.standrow__end{display:flex;flex-direction:column;align-items:flex-end;gap:6px;grid-row:span 2}
@media (max-width:520px){.standrow{grid-template-columns:48px minmax(0,1fr)}.standrow__end{grid-row:auto;grid-column:2;flex-direction:row;align-items:center;justify-content:space-between}}
.url .tag{background:var(--l2);color:var(--m1)}
.slotcard{display:grid;grid-template-columns:132px 1fr;gap:16px;padding:16px;border-radius:18px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2)}
.slotcard .stack-10{min-width:0}
.qr{width:132px;height:132px;border-radius:12px;background:#fff;padding:6px}
.qr svg{width:100%;height:100%;display:block}
.qc-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2);font-size:14px;font-weight:600;cursor:pointer;line-height:1.35}
.qc-item input{accent-color:var(--lime);width:20px;height:20px;flex-shrink:0}
.qc-item:has(input:checked){background:#16170f;box-shadow:inset 0 0 0 1px rgba(200,242,60,.3)}
.deal a{color:var(--fg)}.deal a:hover{color:var(--lime)}
.pipe__col{min-height:220px}
.pipe__hint{font-size:11.5px;color:var(--m4);line-height:1.4;margin-top:-4px}
.more{font:500 11px var(--mono);color:var(--m3);text-align:center}
.empty{padding:28px;text-align:center;color:var(--m3);font-size:14px;line-height:1.5}
.thumb{width:40px;height:40px;border-radius:10px;object-fit:cover;background:var(--l2);display:block}
.bars i{position:relative}
.bars-x{display:flex;justify-content:space-between;font:500 10px var(--mono);color:var(--m5)}
/* step-by-step progress */
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;counter-reset:s;list-style:none;margin:0;padding:0}
.steps li{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:var(--card);box-shadow:inset 0 0 0 1px var(--l1);font-size:13px;font-weight:600;color:var(--m3);line-height:1.25}
.steps li::before{counter-increment:s;content:counter(s);width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 12px var(--mono);background:var(--l2);color:var(--m2);flex-shrink:0}
.steps li.done{color:var(--m1)}.steps li.done::before{content:'✓';background:var(--lime);color:var(--bg)}
.steps li.now{color:var(--fg);background:#16170f;box-shadow:inset 0 0 0 1.5px var(--lime)}.steps li.now::before{background:var(--fg);color:var(--bg)}
.next{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:20px 22px;border-radius:22px;background:var(--lime);color:var(--bg)}
.next small{font:700 11px var(--mono);letter-spacing:.06em;opacity:.7}
.next b{display:block;font-size:20px;letter-spacing:-.03em;margin-top:4px}
.next p{font-size:14px;font-weight:500;margin-top:6px;max-width:680px;line-height:1.45}
.next .btn{background:var(--bg);color:var(--fg)}.next .btn:hover{color:var(--lime)}
.next--calm{background:var(--card);color:var(--fg);box-shadow:inset 0 0 0 1px var(--l2)}.next--calm .btn{background:var(--lime);color:var(--bg)}
/* expandable help */
details.help{border-radius:14px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2)}
details.help>summary{cursor:pointer;padding:13px 16px;font-weight:600;font-size:14px;list-style:none;display:flex;justify-content:space-between;gap:12px}
details.help>summary::-webkit-details-marker{display:none}
details.help>summary::after{content:'+';color:var(--lime);font-weight:700;font-size:18px;line-height:1}
details.help[open]>summary::after{content:'−'}
details.help>div{padding:0 16px 16px;font-size:14px;color:var(--m2);line-height:1.6}
details.help ol,details.help ul{margin:0;padding-left:20px}
/* guide + help pages */
.flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.flow>div{padding:18px;border-radius:18px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2);display:flex;flex-direction:column;gap:6px}
.flow i{font:700 11px var(--mono);color:var(--lime);font-style:normal;letter-spacing:.05em}
.flow b{font-size:16px;letter-spacing:-.02em}.flow span{font-size:13px;color:var(--m3);line-height:1.45}
.say{padding:16px 18px;border-radius:16px;background:#16170f;box-shadow:inset 0 0 0 1px rgba(200,242,60,.3);font-size:15px;line-height:1.6;color:var(--m1)}
.say em{display:block;font:700 11px var(--mono);color:var(--lime);font-style:normal;margin-bottom:6px;letter-spacing:.05em}
.toc{display:flex;gap:8px;flex-wrap:wrap}.toc a{padding:8px 14px;border-radius:99px;font-size:13px;font-weight:600;color:var(--m1);box-shadow:inset 0 0 0 1px var(--l4)}.toc a:hover{color:var(--bg);background:var(--lime)}
.olist{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:10px;font-size:15px;line-height:1.5;color:var(--m1)}
.olist b{color:var(--fg)}
/* owner device cards + link rows */
.devcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:12px}
.devcard{display:flex;gap:14px;padding:14px;border-radius:18px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2);align-items:center}
.devcard img,.devcard .thumb{width:64px;height:64px;border-radius:14px;object-fit:cover;flex-shrink:0}
.devcard .stack-10{gap:4px;min-width:0}.devcard b{font-size:15px}.devcard span{font-size:12.5px;color:var(--m3)}
.linkrow{display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:16px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--l2)}
.linkrow .field{gap:8px}
.linkrow__foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.phone-pv{width:280px;height:560px;border-radius:40px;background:#000;padding:8px;box-shadow:0 0 0 1px var(--l4),0 40px 80px -40px rgba(200,242,60,.25);align-self:center}
.phone-pv iframe{width:100%;height:100%;border:0;border-radius:32px;background:var(--bg)}
.qrsheet{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.qrcell{background:#fff;color:#0a0a0b;border-radius:12px;padding:10px 10px 12px;display:flex;flex-direction:column;gap:3px;align-items:center;text-align:center}
.qrcell svg{width:100%;height:auto;display:block}
.qrcell b{font:700 12px var(--mono)}.qrcell span{font-size:10.5px;line-height:1.3}.qrcell code{font:500 8.5px var(--mono);word-break:break-all;color:#444}
.stepnum{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--lime);color:var(--bg);font:700 12px var(--mono);margin-right:8px}
@media print{body{background:#fff!important;color:#000}.site-header,.no-print{display:none!important}.adm{padding:0;max-width:none}.qrsheet{grid-template-columns:repeat(4,1fr);gap:6mm}.qrcell{border:1px dashed #bbb;break-inside:avoid}.print-title{color:#000!important}}
@media (max-width:600px){.adm{padding:20px 16px 72px}.adm-head{padding:14px 16px}.slotcard{grid-template-columns:1fr}.next b{font-size:18px}}
`;

const ADMIN_JS = `
document.addEventListener('click', async e => {
  const c = e.target.closest('[data-copy]');
  if (c) { await navigator.clipboard.writeText(c.dataset.copy); const t = c.textContent; c.textContent = 'Copied ✓'; setTimeout(() => { c.textContent = t; }, 1400); }
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
if (qc) { const sync = () => { const pass = qc.querySelector('[value=pass]'); if (pass) { const left = [...qc.querySelectorAll('input[type=checkbox]')].filter(i => !i.checked).length; pass.disabled = left > 0; pass.textContent = left ? 'Tick ' + left + ' more to finish' : 'All good: passed ✓'; } }; qc.addEventListener('change', sync); sync(); }
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
// [id, staff label, colour, one-line "what to do", owner-facing label]
export const STAGES = [
  ['new', 'New · write the chip', '#8a8883', 'Copy the tap link into the chip, lock it, then tap it.', 'Being prepared'],
  ['scanned', 'Tested · check it', '#7fd8f2', 'The tap worked. Finish the quality check.', 'Being prepared'],
  ['qc_passed', 'Ready to go live', '#f2b23c', 'Checked. Turn it on when it’s handed to the client.', 'Arriving soon'],
  ['active', 'Live', '#c8f23c', 'Customers’ taps open the right page.', 'Live'],
  ['disabled', 'Paused', '#f27fa8', 'Taps show a “paused” page.', 'Paused']
];
export const stageOf = d => d.status === 'new' && d.first_scan_at ? 'scanned' : d.status;
const stage = d => STAGES.find(x => x[0] === stageOf(d));
export const status = (d, owner = false) => { const s = stage(d); return html`<span class="st"><i style="background:${s[2]}"></i>${owner ? s[4] : s[1]}</span>`; };
const SPLIT_COLORS = { google: '#c8f23c', menu: '#f2f0eb', instagram: '#f27fa8', tiktok: '#7fd8f2', facebook: '#f2b23c', website: '#8a8883' };
const kpi = (label, value, note, lime) => html`<div class="kpi"><span>${label}</span><b>${n(value)}</b><em${lime ? raw(' class="lime"') : ''}>${note}</em></div>`;
const flash = q => html`${q.msg ? html`<div class="flash flash--ok" role="status">${q.msg}</div>` : ''}${q.err ? html`<div class="flash flash--err" role="alert">${q.err}</div>` : ''}`;
const head = (eyebrow, title, aside = '', lead = '') => html`<div class="sec__head"><div class="sec__titles"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lead ? html`<p class="lead">${lead}</p>` : ''}</div>${aside}</div>`;
const productSelect = (name = 'sku') => html`<label class="field">Product<select name="${name}">${Object.entries(PRODUCTS).map(([sku, p]) => html`<option value="${sku}">${p.name}</option>`)}</select></label>`;
const devLink = d => html`<a href="/admin/d/${d.code}">${d.label || d.code}</a>`;
const zoneName = slot => slot === 'main' ? 'Main tap' : slot === 'menu' ? 'Menu QR' : /^z\d$/.test(slot) ? `Tap zone ${slot.slice(1)}` : `Extra: ${slot}`;
const help = (summary, body, open = false) => html`<details class="help"${open ? raw(' open') : ''}><summary>${summary}</summary><div>${body}</div></details>`;
const steps = (labels, now) => html`<ol class="steps">${labels.map((l, i) => html`<li class="${i < now ? 'done' : i === now ? 'now' : ''}">${l}</li>`)}</ol>`;
const next = ({ tag = 'NEXT STEP', title, text, action = '', calm = false }) => html`<div class="next${calm ? ' next--calm' : ''}"><div><small>${tag}</small><b>${title}</b>${text ? html`<p>${text}</p>` : ''}</div>${action}</div>`;

// Where to find each link. Shown under the field for staff and owners alike.
const LINK_HELP = {
  google: html`Google Maps → your business → <b>Ask for reviews</b> (or “Share review form”) → Copy. It looks like <b>https://g.page/r/…/review</b> and opens the 5-star box directly.`,
  menu: html`Any link to your menu: a menu page on your website, a Canva site, or a Google Drive PDF shared as <b>Anyone with the link</b>.`,
  website: html`Your own website, e.g. <b>https://yourshop.ph</b>.`,
  facebook: html`Open your Facebook Page → <b>Share</b> → <b>Copy link</b>.`,
  instagram: html`Your profile link, e.g. <b>https://instagram.com/yourshop</b>.`,
  tiktok: html`Your profile link, e.g. <b>https://tiktok.com/@yourshop</b>.`
};

/* ---------- layouts ---------- */
const AREA = {
  admin: { prefix: '/admin', badge: 'ADMIN', label: 'tapfour admin', tabs: [['', 'Overview', 'overview'], ['/businesses', 'Clients', 'businesses'], ['/devices', 'Stands & cards', 'devices'], ['/guide', 'Staff guide', 'guide'], ['/audit', 'History', 'audit'], ['/account', 'Account', 'account']] },
  owner: { prefix: '/app', badge: 'MY DASHBOARD', label: 'tapfour', tabs: [['', 'Home', 'overview'], ['/destinations', 'My links', 'destinations'], ['/branding', 'My page', 'branding'], ['/help', 'Help', 'help'], ['/account', 'Account', 'account']] }
};
const docHead = title => html`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0a0a0b"><meta name="robots" content="noindex">
<title>${title}</title><link rel="preload" href="/instrument-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/theme.css"><style>${raw(ADMIN_CSS)}</style></head>`;

export function shell({ area, title, nav, user, adminView, body }) {
  const a = AREA[area];
  return html`${docHead(`${title} · ${a.label}`)}
<body>${raw(sprite)}
<header class="sticky-header site-header"><div class="site-header__in adm-head">
  <a class="brand" href="${a.prefix}"><span class="tf-mark" style="font-size:26px" aria-hidden="true"></span>tapfour<span class="tag tag--lime">${a.badge}</span></a>
  <nav class="seg adm-nav" aria-label="Dashboard">${a.tabs.map(([href, label, id]) => html`<a href="${a.prefix}${href}"${nav === id ? raw(' class="on" aria-current="page"') : ''}>${label}</a>`)}</nav>
  <form method="post" action="${a.prefix}/logout" class="row-wrap" style="gap:10px">${area === 'admin' ? html`<a class="btn btn--lime btn--sm" href="/admin/new">+ New client</a>` : ''}<span class="mono-12 m3">${user?.email}</span><button class="btn btn--ghost btn--sm">Log out</button></form>
</div></header>
<main class="adm" id="main">${adminView ? html`<form method="get" action="/app/view" class="flash flash--ok row-between wrap" style="gap:10px">
  <span>Admin view: you’re seeing this business exactly as its owner does. Edits are saved under your email.</span>
  <label class="row-wrap" style="gap:8px"><span class="mono-12">BUSINESS</span><select name="id" onchange="this.form.submit()" style="background:var(--bg);color:var(--fg);border:1px solid var(--l4);border-radius:10px;padding:8px 10px">${adminView.businesses.map(x => html`<option value="${x.id}"${x.id === adminView.current ? raw(' selected') : ''}>${x.name}</option>`)}</select></label>
</form>` : ''}${body}</main>
<script>${raw(ADMIN_JS)}</script></body></html>`;
}

export function setupPage({ email, err }) {
  return html`${docHead('First-time setup · tapfour admin')}
<body class="login"><main class="login__box">
  <a class="brand" href="/admin"><span class="tf-mark" style="font-size:30px" aria-hidden="true"></span>tapfour<span class="tag tag--lime">ADMIN</span></a>
  <form class="panel" method="post" action="/admin/setup">
    <div><h1 class="login__h">Create the first admin</h1>
    <p class="m3 s13" style="margin-top:6px;font-weight:500">One time only. This page switches off once an admin exists.</p></div>
    ${err ? html`<div class="flash flash--err" role="alert">${err}</div>` : ''}
    <label class="field">Setup code<input name="code" required autocomplete="off" spellcheck="false"></label>
    <label class="field">Your login email<input name="email" type="email" autocomplete="username" required value="${email || ''}"></label>
    <label class="field">Password (10+ characters)<input name="password" type="password" autocomplete="new-password" minlength="10" required></label>
    <label class="field">Repeat password<input name="confirm" type="password" autocomplete="new-password" minlength="10" required></label>
    <button class="btn btn--lime btn--lg btn--block">Create admin →</button>
  </form>
</main></body></html>`;
}

export function loginPage({ area, action, next: nextPath, email, err }) {
  const a = AREA[area];
  return html`${docHead(`Log in · ${a.label}`)}
<body class="login"><main class="login__box">
  <a class="brand" href="${a.prefix}"><span class="tf-mark" style="font-size:30px" aria-hidden="true"></span>tapfour<span class="tag tag--lime">${a.badge}</span></a>
  <form class="panel" method="post" action="${action}">
    <div><h1 class="login__h">${area === 'admin' ? 'Staff login' : 'Log in to your dashboard'}</h1>
    <p class="m3 s13" style="margin-top:6px;font-weight:500">${area === 'admin' ? 'For the Tap4 team.' : 'See how many people tap your stands, and change your links anytime. No reprint needed.'}</p></div>
    ${err ? html`<div class="flash flash--err" role="alert">${err}</div>` : ''}
    <input type="hidden" name="next" value="${nextPath}">
    <label class="field">Email<input name="email" type="email" autocomplete="username" required value="${email || ''}" autofocus></label>
    <label class="field">Password<input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn btn--lime btn--lg btn--block">Log in →</button>
    ${area === 'owner' ? html`<div class="note">Forgot your password? Message Tap4 (${SUPPORT_EMAIL}) and we’ll reset it.</div>` : ''}
  </form>
</main></body></html>`;
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

/* ---------- numbers (the site's demo dashboard, with real data and plain labels) ---------- */
export function statsBlock(s, { title, caption, extra = '' }) {
  const max = Math.max(1, ...s.days.map(d => d.n));
  const total = s.split.reduce((a, x) => a + x.n, 0) || 1;
  return html`<div class="dash">
  <div class="dash__top"><b>${title}</b><span class="mono-12 m3">${caption}</span></div>
  <div class="dash__body">
    <div class="kpis">
      ${kpi('TAPS & SCANS', s.taps, `${n(s.nfc)} taps · ${n(s.qr)} QR scans`, true)}
      ${kpi('OPENED GOOGLE REVIEW', s.review, 'Opened the review page (not everyone posts)')}
      ${kpi('OPENED MENU', s.menu, 'From a tap, scan or your links page')}
      ${kpi('DIFFERENT PEOPLE', s.visitors, 'Different phones, counted per day')}
    </div>
    ${extra}
    <div class="dash__charts">
      <div class="kpi">
        <div class="row-between mono-11 m3"><span>TAPS & SCANS PER DAY</span><span>LAST 14 DAYS</span></div>
        <div class="bars" role="img" aria-label="Taps per day, last 14 days: ${s.days.map(d => d.n).join(', ')}">${s.days.map((d, i) => html`<i title="${d.d}: ${d.n} taps & scans" style="height:${Math.max(2, Math.round(d.n / max * 100))}%"${i === s.days.length - 1 ? raw(' class="on"') : ''}></i>`)}</div>
        <div class="bars-x"><span>${s.days[0].d.slice(5)}</span><span>TODAY</span></div>
      </div>
      <div class="kpi" style="gap:12px">
        <span>WHAT PEOPLE OPENED · 30 DAYS</span>
        ${s.split.length ? s.split.map(x => { const pct = Math.round(x.n / total * 100); return html`<div class="split"><div class="row-between"><span>${linkName(x.k)}</span><span class="mono m2">${pct}% · ${n(x.n)}</span></div><div class="split__bar"><i style="width:${pct}%;background:${SPLIT_COLORS[x.k] || '#b5b3ad'}"></i></div></div>`; }) : html`<div class="empty">Nothing yet. Numbers appear after the first tap.</div>`}
      </div>
    </div>
  </div></div>`;
}

const SOURCE = { nfc: 'Tap', qr: 'QR scan', page: 'Links page' };
const recentTable = (rows, admin = true) => rows.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>WHEN</th>${admin ? html`<th>CLIENT</th>` : ''}<th>STAND / CARD</th><th>HOW</th><th>OPENED</th></tr></thead><tbody>
  ${rows.map(r => html`<tr><td class="mono m3">${ago(r.ts)}</td>${admin ? html`<td>${r.bid ? html`<a href="/admin/b/${r.bid}">${r.bname}</a>` : '—'}</td>` : ''}<td>${!r.device_code ? '—' : admin ? html`<a href="/admin/d/${r.device_code}">${r.label || r.device_code}</a>` : r.label || r.device_code}</td><td>${SOURCE[r.source] || r.source}</td><td><span class="row-wrap" style="gap:8px;flex-wrap:nowrap">${icon(r.link_key)}${linkName(r.link_key)}</span></td></tr>`)}
  </tbody></table></div>` : html`<div class="empty">No taps yet. They show up here the moment someone taps or scans.</div>`;

// Which stands use each link, from the devices' "slot:key" list, for the "Used by" line.
// Staff know stands by label (TF-KN-0001); owners by what and where ("Premium Acrylic · BGC").
const friendly = d => `${productName(d.product_sku)}${d.branch ? ` · ${d.branch}` : ''}`;
const usedBy = (devices, owner) => {
  const m = {};
  for (const d of devices) for (const s of (d.slots || '').split(' ').filter(Boolean)) {
    const key = s.split(':')[1];
    (m[key] ||= []).push(owner ? friendly(d) : d.label || d.code);
  }
  return m;
};

const linksForm = (action, links, devices, title = 'Their links', owner = false) => {
  const used = usedBy(devices, owner);
  return html`<form class="panel" method="post" action="${action}">
      <div class="panel__head"><span>${title.toUpperCase()}</span><span>CHANGE ANYTIME · NO REPRINT</span></div>
      <p class="hint" style="font-size:13.5px">Paste each link once. Every stand and card that opens it updates on the very next tap. Leave a box empty if it isn’t used.</p>
      ${URL_KEYS.map(([k, label]) => html`<div class="linkrow">
        <label class="field"><b class="row-wrap" style="gap:8px">${icon(k, 15)}${label}</b><input name="${k}" type="url" inputmode="url" placeholder="https://…" value="${links[k] || ''}"></label>
        <div class="hint">${LINK_HELP[k]}</div>
        <div class="linkrow__foot"><span class="mono-11 m3">${used[k] ? `USED BY: ${[...new Set(used[k])].join(', ').toUpperCase()}` : 'NOT USED BY ANY STAND YET'}</span>${links[k] ? html`<a class="mono-11" href="${links[k]}" target="_blank" rel="noopener noreferrer">TEST THIS LINK ↗</a>` : ''}</div>
      </div>`)}
      <div><button class="btn btn--lime btn--lg">Save links</button></div>
    </form>`;
};

const opensList = d => (d.slots || '').split(' ').filter(Boolean).map(s => { const [slot, key] = s.split(':'); return (slot === 'main' ? '' : zoneName(slot) + ': ') + linkName(key); }).join(' · ');

const deviceRows = devices => devices.map(d => html`<tr>
    <td>${PRODUCTS[d.product_sku]?.img ? html`<img class="thumb" src="/${PRODUCTS[d.product_sku].img}" alt="" loading="lazy">` : html`<span class="thumb"></span>`}</td>
    <td>${devLink(d)}<div class="mono-11 m3">${d.code}</div></td><td>${productName(d.product_sku)}</td><td class="m2">${d.branch || '—'}</td>
    <td class="wrap m2">${opensList(d)}</td>
    <td>${status(d)}</td><td class="mono lime">${n(d.taps)}</td><td class="mono m3">${ago(d.last_ts)}</td>
    <td>${d.status === 'active' ? '' : html`<a class="btn btn--ghost btn--sm" href="/admin/d/${d.code}">Continue setup →</a>`}</td></tr>`);
const devicesTable = devices => devices.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>NAME</th><th>PRODUCT</th><th>BRANCH</th><th>A TAP OPENS</th><th>STATUS</th><th>TAPS</th><th>LAST TAP</th><th></th></tr></thead><tbody>${deviceRows(devices)}</tbody></table></div>` : html`<div class="empty">No stands or cards yet. Add one below.</div>`;

const deviceCards = devices => devices.length ? html`<div class="devcards">${devices.map(d => html`<div class="devcard">
    ${PRODUCTS[d.product_sku]?.img ? html`<img src="/${PRODUCTS[d.product_sku].img}" alt="" loading="lazy">` : html`<span class="thumb"></span>`}
    <div class="stack-10"><b>${productName(d.product_sku)}${d.branch ? ` · ${d.branch}` : ''}</b>
      <span>Opens: ${opensList(d) || '—'}</span>
      <div class="row-wrap" style="gap:10px">${status(d, true)}<span class="mono">${n(d.taps)} taps</span></div></div>
  </div>`)}</div>` : html`<div class="empty">Your stands will appear here once Tap4 sets them up.</div>`;

/* ---------- admin pages ---------- */
export function overviewView({ stats, counts, bizCount, top, recent, q }) {
  const c = k => counts[k] || 0;
  const waiting = c('new') + c('scanned') + c('qc_passed');
  const card = (id, label, hint) => html`<a class="kpi kpi--lime" href="/admin/devices" style="color:inherit"><span>${label}</span><b>${n(c(id))}</b><em>${hint}</em></a>`;
  const extra = html`<div class="kpis">
    ${card('new', 'WRITE THE CHIP', 'New stands waiting to be written')}
    ${card('scanned', 'CHECK QUALITY', 'Tapped once, checklist not done')}
    ${card('qc_passed', 'READY TO GO LIVE', 'Turn on when handed to the client')}
    <a class="kpi kpi--lime" href="/admin/devices" style="color:inherit"><span>LIVE</span><b>${n(c('active'))}</b><em>${n(c('disabled'))} paused</em></a></div>`;
  const start = !bizCount ? next({ tag: 'START HERE', title: 'Set up your first client', text: 'Add the business, paste their links, add their stand, write the chip, check it, and turn it on. The staff guide walks you through each step.', action: html`<div class="row-wrap"><a class="btn" href="/admin/new">+ New client</a><a class="btn" href="/admin/guide">Staff guide</a></div>` })
    : waiting ? next({ tag: 'TO DO', title: `${waiting} stand${waiting > 1 ? 's' : ''} still being set up`, text: 'Open the list to see which step each one is on.', action: html`<a class="btn" href="/admin/devices">Open the list →</a>` })
    : next({ calm: true, tag: 'ALL CAUGHT UP', title: 'Every stand is live.', text: 'New client? It takes one short form.', action: html`<a class="btn" href="/admin/new">+ New client</a>` });
  return html`${flash(q)}${head('OVERVIEW', 'Every tap. Every stand.')}
  ${start}
  ${statsBlock(stats, { title: 'All clients', caption: 'LAST 30 DAYS · PH TIME', extra })}
  <div class="grid2">
    <div class="panel"><div class="panel__head"><span>BUSIEST CLIENTS · 30 DAYS</span><a href="/admin/businesses">ALL CLIENTS →</a></div>
      ${top.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>CLIENT</th><th>STANDS</th><th>TAPS</th></tr></thead><tbody>${top.map(b => html`<tr><td><a href="/admin/b/${b.id}">${b.name}</a></td><td class="mono">${n(b.devices)}</td><td class="mono lime">${n(b.taps)}</td></tr>`)}</tbody></table></div>` : html`<div class="empty">No clients yet.</div>`}
    </div>
    <div class="panel"><div class="panel__head"><span>LATEST TAPS</span><span>LIVE</span></div>${recentTable(recent)}</div>
  </div>`;
}

export function businessesView({ rows, q }) {
  return html`${flash(q)}${head('CLIENTS', 'Your clients.', html`<a class="btn btn--lime" href="/admin/new">+ New client</a>`, 'Each client is one business. Open a client to set up their links, stands and login.')}
  ${next({ calm: true, tag: 'NEW CLIENT', title: 'Add a client in one form', text: 'Name, their Google review link and the stand they bought. The rest you can do after.', action: html`<a class="btn" href="/admin/new">+ New client</a>` })}
  <div class="panel"><div class="panel__head"><span>${rows.length} CLIENT${rows.length === 1 ? '' : 'S'}</span><span>TAPS · 30 DAYS</span></div>
    ${rows.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>CLIENT</th><th>STANDS</th><th>LIVE</th><th>TAPS · 30D</th><th>CONTACT</th></tr></thead><tbody>
    ${rows.map(b => html`<tr><td><a href="/admin/b/${b.id}">${b.name}</a></td><td class="mono">${n(b.devices)}</td><td class="mono">${b.devices ? `${n(b.active)} / ${n(b.devices)}` : '—'}</td><td class="mono lime">${n(b.taps)}</td><td class="m3">${b.contact_name || b.email || b.phone || '—'}</td></tr>`)}
    </tbody></table></div>` : html`<div class="empty">No clients yet. Press “+ New client” to add your first one.</div>`}
  </div>`;
}

export function businessView({ b, tapBase, ownerViewUrl, links, devices, owners, stats, recent, q }) {
  const hasLinks = Object.values(links).some(Boolean), hasDevices = devices.length > 0;
  const notLive = devices.filter(d => d.status !== 'active' && d.status !== 'disabled');
  const done = [hasLinks, hasDevices, hasDevices && !notLive.length, owners.length > 0];
  const now = done.findIndex(x => !x);
  const todo = [
    { title: 'Paste their links', text: 'Start with their Google review link. The box below shows where to find each one.', action: html`<a class="btn" href="#links">Go to links ↓</a>` },
    { title: 'Add their stand or card', text: 'Pick the product they bought. Each one gets its own permanent tap link.', action: html`<a class="btn" href="#stands">Add a stand ↓</a>` },
    { title: `Finish setting up ${notLive.length} stand${notLive.length > 1 ? 's' : ''}`, text: 'Write the chip, tap it, do the quality check, then turn it on.', action: notLive[0] ? html`<a class="btn" href="/admin/d/${notLive[0].code}">Continue with ${notLive[0].label || notLive[0].code} →</a>` : '' },
    { title: 'Give the owner a login', text: 'They’ll see their numbers and can change their own links at dashboard.tap4.ph.', action: html`<a class="btn" href="#owner">Create login ↓</a>` }
  ][now];
  return html`${flash(q)}${head('CLIENT', b.name, html`<div class="row-wrap"><a class="btn btn--ghost" href="${ownerViewUrl}" target="_blank" rel="noopener">See their dashboard ↗</a><a class="btn btn--ghost" href="${tapBase}/p/${b.slug}" target="_blank" rel="noopener">Their links page ↗</a><a class="btn btn--ghost" href="/admin/supplier?b=${b.id}">Supplier files</a></div>`)}
  ${steps(['Links added', 'Stand added', 'Stands live', 'Owner login'], now < 0 ? 4 : now)}
  ${todo ? next(todo) : next({ calm: true, tag: 'ALL SET', title: `${b.name} is fully set up.`, text: 'Their stands are live and the owner can log in. Come back here anytime to change links or add stands.' })}
  <div class="grid2">
    <div id="links">${linksForm(`/admin/b/${b.id}/links`, links, devices)}</div>
    <div class="stack-14">
      <div class="panel" id="stands"><div class="panel__head"><span>THEIR STANDS & CARDS</span><span>${devices.length} TOTAL</span></div>
        ${devices.length ? html`<div class="stack-10">${devices.map(d => html`<a class="standrow" href="/admin/d/${d.code}">
          ${PRODUCTS[d.product_sku]?.img ? html`<img class="thumb" src="/${PRODUCTS[d.product_sku].img}" alt="">` : html`<span class="thumb"></span>`}
          <span><b>${d.label || d.code}</b><small>${productName(d.product_sku)}${d.branch ? ` · ${d.branch}` : ''}</small><small>Opens: ${opensList(d)}</small></span>
          <span class="standrow__end">${status(d)}<span class="mono-11 lime">${d.status === 'active' ? `${n(d.taps)} TAPS` : 'CONTINUE →'}</span></span></a>`)}</div>` : html`<div class="empty">None yet.</div>`}
        <form class="fields" method="post" action="/admin/b/${b.id}/devices" style="align-items:end">
          ${productSelect()}
          <label class="field">How many<input name="qty" type="number" min="1" max="100" value="1" required></label>
          <label class="field">Branch (optional)<input name="branch" maxlength="40" placeholder="e.g. BGC"></label>
          <div><button class="btn btn--lime btn--block">Add →</button></div>
        </form>
      </div>
      <div class="panel" id="owner"><div class="panel__head"><span>OWNER LOGIN</span><span>DASHBOARD.TAP4.PH</span></div>
        ${owners.length ? html`<div class="stack-10">${owners.map(u => html`<div class="url">
          <span style="flex:1;min-width:0"><b>${u.email}</b>${u.name ? html` <span class="m3">· ${u.name}</span>` : ''}<br><span class="mono-11 m3">LAST LOGIN: ${u.last_login_at ? ago(u.last_login_at).toUpperCase() : 'NEVER'}</span></span>
          <form method="post" action="/admin/b/${b.id}/owners/${u.id}/reset" data-confirm="Make a new password for ${u.email}? Their old one stops working."><button class="btn btn--ghost btn--sm">New password</button></form>
          <form method="post" action="/admin/b/${b.id}/owners/${u.id}/remove" data-confirm="Remove ${u.email}'s access?"><button class="btn btn--ghost btn--sm">Remove</button></form>
        </div>`)}</div>` : ''}
        <form class="fields" method="post" action="/admin/b/${b.id}/owners" style="align-items:end">
          <label class="field">Owner’s email<input name="email" type="email" required maxlength="120" placeholder="owner@business.com"></label>
          <label class="field">Name (optional)<input name="name" maxlength="60"></label>
          <div><button class="btn btn--lime btn--block">Create login →</button></div>
        </form>
        <p class="hint">You’ll get a one-time password and a ready-to-send message for Messenger or Viber. Owners can change the password later.</p>
      </div>
    </div>
  </div>
  ${statsBlock(stats, { title: `${b.name}: numbers`, caption: 'LAST 30 DAYS · PH TIME' })}
  <div class="panel"><div class="panel__head"><span>LATEST TAPS</span><span>${b.name.toUpperCase()}</span></div>${recentTable(recent)}</div>
  ${help('Business details & branding (name, contact, logo, colour)', html`<form method="post" action="/admin/b/${b.id}" class="stack-14">
    <div class="fields">
      <label class="field">Business name<input name="name" required maxlength="60" value="${b.name}"></label>
      <label class="field">Links page address: go.tap4.ph/p/<input name="slug" required maxlength="40" pattern="[a-z0-9-]+" value="${b.slug}"></label>
      <label class="field">Contact person<input name="contact_name" maxlength="60" value="${b.contact_name || ''}"></label>
      <label class="field">Email<input name="email" type="email" maxlength="120" value="${b.email || ''}"></label>
      <label class="field">Phone / Viber<input name="phone" type="tel" maxlength="30" value="${b.phone || ''}"></label>
      <label class="field">Brand colour<input name="brand_color" type="color" value="${b.brand_color || '#c8f23c'}"></label>
    </div>
    <label class="field">Logo link (square image, https://)<input name="logo_url" type="url" placeholder="https://…" value="${b.logo_url || ''}"></label>
    <p class="hint">Changing the links page address only affects links shared by hand. Stands keep working.</p>
    <div><button class="btn btn--ghost">Save details</button></div>
  </form>`)}`;
}

export function devicesView({ cols, q }) {
  return html`${flash(q)}${head('STANDS & CARDS', 'Get every stand live.', html`<div class="row-wrap"><a class="btn btn--lime" href="/admin/supplier">Send to supplier</a></div><form method="get" action="/admin/find" class="row-wrap"><label class="field" style="min-width:200px">Find by code (on the device page)<input name="code" required maxlength="12" placeholder="K7M2QX" autocapitalize="characters"></label><button class="btn btn--ghost">Open</button></form>`, 'Each stand moves left to right: write the chip → tap to test → quality check → go live. Tap a stand to see exactly what to do next.')}
  <div class="dash"><div class="dash__top"><b>Setup board</b><span class="mono-12 m3">WRITE → TAP → CHECK → GO LIVE</span></div>
  <div class="dash__body pipe">
    ${STAGES.map(([id, label, color, hint]) => { const list = cols[id] || []; return html`<div class="pipe__col">
      <div class="row-between"><div class="pipe__name"><i style="background:${color}"></i>${label}</div><span class="mono-12 m3">${list.total || 0}</span></div>
      <div class="pipe__hint">${hint}</div>
      ${list.map(d => html`<div class="deal"><b>${devLink(d)}</b><div class="row-between"><span>${d.bname || 'Not assigned'}</span><em>${d.code}</em></div><span>${productName(d.product_sku)}${d.branch ? ' · ' + d.branch : ''}</span></div>`)}
      ${list.total > list.length ? html`<div class="more">+${list.total - list.length} more</div>` : ''}
    </div>`; })}
  </div></div>
  ${help('Prepare blank stands in bulk (not assigned to a client yet)', html`<form method="post" action="/admin/devices" class="stack-14">
    <p>Useful when you order many chips at once. Each blank stand gets a permanent tap link; assign it to a client later on its page. Until then, a tap shows “Not set up yet”.</p>
    <div class="fields" style="align-items:end">
      ${productSelect()}
      <label class="field">How many<input name="qty" type="number" min="1" max="100" value="10" required></label>
      <div><button class="btn btn--lime btn--block">Create blank stands →</button></div>
    </div>
  </form>`)}`;
}

export function deviceView({ d, b, slots, businesses, stats, tapUrl, q, qc }) {
  const items = checklist(d.product_sku, slots);
  const p = PRODUCTS[d.product_sku];
  const main = slots.find(s => s.slot === 'main') || slots[0];
  const hasDest = slots.every(s => s.link_key === 'links' || s.url);
  const now = d.status === 'disabled' ? -1 : !b || !hasDest ? 0 : d.status === 'new' && !d.first_scan_at ? 1 : d.status === 'new' ? 3 : d.status === 'qc_passed' ? 4 : 5;
  const goLive = html`<form method="post" action="/admin/d/${d.code}/status"><button class="btn" name="to" value="active">Go live: turn it on →</button></form>`;
  const todo = [
    { title: !b ? 'Choose the client' : 'Save the link this stand opens', text: !b ? 'This stand isn’t assigned yet. Pick the client under “Details” at the bottom.' : `The client has no ${linkName((slots.find(s => s.link_key !== 'links' && !s.url) || main).link_key)} link yet. Add it on the client page, or pick something else below.`, action: b ? html`<a class="btn" href="/admin/b/${b.id}#links">Add the link →</a>` : html`<a class="btn" href="#details">Choose client ↓</a>` },
    { title: 'Write the chip, then tap it', text: 'Copy the tap link below into the NFC Tools app, write it to the chip and lock it. Already written by the supplier? Just tap the stand with your phone: it should open this page.', action: html`<button type="button" class="btn" data-copy="${tapUrl('t', main.slot)}">Copy tap link</button>` },
    null,
    { title: 'It works! Now the quality check', text: 'Tick each item on the checklist below after you’ve looked at it.', action: html`<a class="btn" href="#qc">Go to checklist ↓</a>` },
    { title: 'Ready: turn it on', text: 'Do this when the stand is handed to the client. From then on, customers’ taps open the right page.', action: goLive },
    null
  ][now];
  const summary = now === 5 ? next({ calm: true, tag: 'LIVE', title: 'Customers’ taps open the right page.', text: `A tap on the main spot opens: ${linkName(main.link_key)}. Try it like a customer:`, action: html`<a class="btn" href="${tapUrl('q', main.slot)}" target="_blank" rel="noopener">Test like a customer ↗</a>` })
    : now === -1 ? next({ calm: true, tag: 'PAUSED', title: 'This stand is paused.', text: 'Taps show a “paused” page. Reopen it to set it up again.', action: html`<form method="post" action="/admin/d/${d.code}/status"><button class="btn" name="to" value="new">Reopen setup</button></form>` })
    : next(todo);
  const scanned = q.scan && html`<div class="flash flash--ok" role="status">✓ Your ${q.scan === 'nfc' ? 'tap' : 'QR scan'} opened this page, so the ${q.scan === 'nfc' ? 'chip' : 'QR'} is written correctly${q.slot && q.slot !== 'main' ? ` (${zoneName(q.slot)})` : ''}.</div>`;
  return html`${flash(q)}${scanned || ''}
  ${head(`${productName(d.product_sku).toUpperCase()} · CODE ${d.code}`, d.label || d.code, html`<div class="row-wrap">${status(d)}${b ? html`<a class="btn btn--ghost btn--sm" href="/admin/b/${b.id}">${b.name} →</a>` : html`<span class="tag tag--glass">NOT ASSIGNED</span>`}</div>`)}
  ${now >= 0 ? steps(['What it opens', 'Write the chip', 'Tap to test', 'Quality check', 'Go live'], now) : ''}
  ${summary}
  <div class="grid2">
    <div class="panel">
      <div class="panel__head"><span>1 · WHAT A TAP OPENS</span><span>CHANGE ANYTIME</span></div>
      <form method="post" action="/admin/d/${d.code}/slots" class="stack-14">
        ${slots.map(s => html`<label class="field"><b>${zoneName(s.slot)}</b><select name="slot_${s.slot}">${LINK_KEYS.map(([k, label]) => html`<option value="${k}"${k === s.link_key ? raw(' selected') : ''}>${label}${k === 'links' ? ' (one page with all their links)' : ''}</option>`)}</select>
          <span class="hint">${s.link_key === 'links' ? 'Opens their links page with every link on it.' : s.url ? html`Opens <a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.url}</a>` : html`<b style="color:#f27fa8">No ${linkName(s.link_key)} link saved for this client yet</b>, so it falls back to their links page.`}</span></label>`)}
        <div><button class="btn btn--ghost">Save</button></div>
        ${help('Add a second QR (e.g. a menu QR on the same stand)', html`<div class="fields">
          <label class="field">Short name (letters/numbers)<input name="new_slot" pattern="[a-z0-9]{1,8}" maxlength="8" placeholder="menu"></label>
          <label class="field">Opens<select name="new_key">${LINK_KEYS.map(([k, label]) => html`<option value="${k}">${label}</option>`)}</select></label>
        </div><p class="hint" style="margin-top:10px">It gets its own QR below. Once printed, it can’t be removed, only changed.</p>`)}
      </form>
    </div>
    <div class="panel">
      <div class="panel__head"><span>2 · LINKS TO WRITE & PRINT</span><span>PERMANENT</span></div>
      ${slots.map(s => {
        const nfc = tapUrl('t', s.slot), qr = tapUrl('q', s.slot), svg = `/admin/d/${d.code}/qr.svg?slot=${s.slot}`, name = `${d.code}-${s.slot}`;
        return html`<div class="slotcard">
          <div class="qr">${raw(qc[s.slot])}</div>
          <div class="stack-10">
            <b class="row-wrap" style="gap:8px">${icon(s.link_key, 16)}${zoneName(s.slot)}</b>
            <div class="url"><span class="tag">WRITE TO CHIP</span><code>${nfc}</code><button type="button" class="btn btn--ghost btn--sm" data-copy="${nfc}">Copy</button></div>
            <div class="url"><span class="tag">QR CODE</span><code>${qr}</code><button type="button" class="btn btn--ghost btn--sm" data-copy="${qr}">Copy</button></div>
            <div class="row-wrap"><a class="btn btn--ghost btn--sm" href="${svg}&dl=1" download="${name}.svg">QR for printer (SVG) ↓</a><a class="btn btn--ghost btn--sm" href="${svg}" data-png="${svg}" data-name="${name}">QR image (PNG) ↓</a></div>
          </div></div>`;
      })}
      ${help('How to write the chip (NFC Tools app, free)', html`<ol>
        <li>Install <b>NFC Tools</b> on your phone (iPhone or Android).</li>
        <li>Tap <b>Write</b> → <b>Add a record</b> → <b>URL / URI</b> → paste the “write to chip” link above → OK.</li>
        <li>Tap <b>Write</b> and hold the top of your phone on the stand’s tap spot until it vibrates.</li>
        <li>Close the app and tap the stand: it should open <b>this page</b>. That’s the test.</li>
        <li>Back in NFC Tools: <b>Other</b> → <b>Lock tag</b> → hold again. Locking stops strangers rewriting it. It’s permanent, so lock only after the test works.</li>
      </ol>`)}
    </div>
  </div>
  <form class="panel" id="qc-form" method="post" action="/admin/d/${d.code}/qc">
    <div class="panel__head"><span id="qc">3 · QUALITY CHECK</span><span>${d.qc_at ? `PASSED BY ${d.qc_by} · ${ago(d.qc_at).toUpperCase()}` : d.first_scan_at ? `FIRST TAP ${ago(d.first_scan_at).toUpperCase()}` : 'NOT TAPPED YET'}</span></div>
    ${d.status === 'new' ? html`<p class="hint">Look at the real stand and tick each item. If something is wrong, write why and press “Something’s wrong”.</p>` : ''}
    ${items.map(([id, label]) => html`<label class="qc-item"><input type="checkbox" name="check" value="${id}"${d.qc?.[id] ? raw(' checked') : ''}${d.status !== 'new' ? raw(' disabled') : ''}>${label}</label>`)}
    ${d.status === 'new' ? html`<label class="field">What’s wrong? (only if it failed)<input name="note" maxlength="200" placeholder="e.g. QR print is smudged"></label>
      <div class="row-wrap"><button class="btn btn--lime btn--lg" name="action" value="pass">Passed ✓</button><button class="btn btn--ghost" name="action" value="save">Save for later</button><button class="btn btn--ghost" name="action" value="fail" data-confirm="Mark this stand as failed? It will be paused.">Something’s wrong</button></div>` : ''}
    ${d.status === 'qc_passed' ? html`<div class="row-wrap"><button class="btn btn--lime btn--lg" formaction="/admin/d/${d.code}/status" name="to" value="active">Go live: turn it on →</button><button class="btn btn--ghost" formaction="/admin/d/${d.code}/status" name="to" value="new">Redo the check</button></div>` : ''}
    ${d.status === 'active' ? html`<div class="row-wrap"><button class="btn btn--ghost" formaction="/admin/d/${d.code}/status" name="to" value="disabled" data-confirm="Pause this stand? Customers will see a “paused” page until you reopen it.">Pause this stand</button></div>` : ''}
  </form>
  ${statsBlock(stats, { title: `${d.label || d.code}: numbers`, caption: 'THIS STAND · LAST 30 DAYS' })}
  <div id="details">${help('Details: client, name, branch, notes', html`<form method="post" action="/admin/d/${d.code}" class="stack-14">
    <div class="fields">
      <label class="field">Name<input name="label" maxlength="40" value="${d.label || ''}"></label>
      <label class="field">Branch<input name="branch" maxlength="40" value="${d.branch || ''}"></label>
    </div>
    <label class="field">Client<select name="business_id"><option value="">— Not assigned —</option>${businesses.map(x => html`<option value="${x.id}"${x.id === d.business_id ? raw(' selected') : ''}>${x.name}</option>`)}</select></label>
    <label class="field">Private note (staff only)<textarea name="note" rows="2" maxlength="500">${d.note || ''}</textarea></label>
    <p class="hint">Product: ${p?.name || d.product_sku}. Code ${d.code} never changes.</p>
    <div><button class="btn btn--ghost">Save details</button></div>
  </form>`, !b)}</div>`;
}

export function auditView({ rows }) {
  return html`${head('HISTORY', 'Who changed what.', '', 'Every link change, new stand, check and login change is recorded here, with who did it.')}
  <div class="panel">${rows.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>WHEN</th><th>WHO</th><th>WHAT</th><th>CHANGE</th></tr></thead><tbody>
  ${rows.map(r => html`<tr><td class="mono m3" title="${r.ts} UTC">${ago(r.ts)}</td><td class="m2">${r.actor}</td><td>${r.entity === 'device' ? html`<a href="/admin/d/${r.entity_id}">stand ${r.entity_id}</a>` : r.entity === 'business' ? html`<a href="/admin/b/${r.entity_id}">client #${r.entity_id}</a>` : `${r.entity} ${r.entity_id}`}</td><td class="mono-12 m2 wrap" style="overflow-wrap:anywhere">${r.change}</td></tr>`)}
  </tbody></table></div>` : html`<div class="empty">Nothing yet.</div>`}</div>`;
}

export function credentialsView({ b, email, password, heading, loginUrl }) {
  const msg = `Hi! Here’s your tapfour dashboard, where you can see how many people tap your stand and change your links anytime.\n\n${loginUrl}\nEmail: ${email}\nPassword: ${password}\n\nPlease change the password after you log in (Account).`;
  return html`${head('OWNER LOGIN · ' + b.name.toUpperCase(), heading)}
  <div class="panel" style="max-width:600px">
    <div class="flash flash--ok">Send this to the owner now. The password is shown only this once.</div>
    <div class="stack-10"><span class="lbl">Login page</span><code class="mono">${loginUrl}</code></div>
    <div class="stack-10"><span class="lbl">Email</span><b>${email}</b></div>
    <div class="stack-10"><span class="lbl">One-time password</span><span class="pw">${password}</span></div>
    <div class="say"><em>MESSAGE PREVIEW</em>${msg.split('\n').map(l => html`${l}<br>`)}</div>
    <div class="row-wrap"><button type="button" class="btn btn--lime btn--lg" data-copy="${msg}">Copy message for Messenger / Viber</button><a class="btn btn--ghost" href="/admin/b/${b.id}">Back to ${b.name}</a></div>
  </div>`;
}

export function accountView({ user, prefix, q }) {
  return html`${flash(q)}${head('ACCOUNT', 'Your login', '', user.email)}
  <form class="panel" method="post" action="${prefix}/account/password" style="max-width:560px">
    <div class="panel__head"><span>CHANGE PASSWORD</span><span>SIGNS OUT YOUR OTHER DEVICES</span></div>
    <label class="field">Current password<input name="current" type="password" autocomplete="current-password" required></label>
    <label class="field">New password (at least 10 characters)<input name="password" type="password" autocomplete="new-password" minlength="10" required></label>
    <label class="field">Type the new password again<input name="confirm" type="password" autocomplete="new-password" minlength="10" required></label>
    <p class="hint">Tip: a short sentence is easy to remember and hard to guess, like “kape-norte-opens-at-7”.</p>
    <div><button class="btn btn--lime">Change password</button></div>
  </form>`;
}

/* ---------- staff guide ---------- */
export function guideView({ tapBase }) {
  const Q = (q, a) => help(q, a);
  return html`${head('STAFF GUIDE', 'How tap4 works, and how to explain it.', html`<a class="btn btn--lime" href="/admin/businesses">Set up a client →</a>`, 'Read this once. Everything a new team member needs: how it works, how to set up a client, what to tell them, and what to do when something goes wrong.')}
  <nav class="toc" aria-label="On this page"><a href="#how">How it works</a><a href="#setup">Set up a client</a><a href="#say">What to say</a><a href="#numbers">The numbers</a><a href="#faq">Client questions</a><a href="#fix">Fix a problem</a><a href="#supplier">Ordering from the supplier</a><a href="#words">Words we use</a></nav>

  <section class="panel" id="how"><h2>1. How it works</h2>
    <p class="lead">Every stand or card holds a <b>permanent tap4 link</b> in its chip and QR. When someone taps, tap4 looks up where that stand should go <b>right now</b> and sends them there in under a second.</p>
    <div class="flow">
      <div><i>1 · CUSTOMER</i><b>Taps the stand or scans the QR</b><span>No app needed. iPhone and Android both work.</span></div>
      <div><i>2 · TAP4</i><b>Checks where it should go</b><span>The chip always says ${tapBase}/t/CODE. That never changes.</span></div>
      <div><i>3 · OPENS</i><b>Google review, menu, or links page</b><span>Whatever you set in the dashboard, today.</span></div>
      <div><i>4 · COUNTED</i><b>Shows up in the numbers</b><span>The owner sees taps, scans and what people opened.</span></div>
    </div>
    <div class="say"><em>THE ONE THING TO REMEMBER</em>The chip never needs rewriting. If the client changes their Instagram or menu, we change it here and every stand updates on the next tap. No reprint.</div>
  </section>

  <section class="panel" id="setup"><h2>2. Set up a new client (about 10 minutes)</h2>
    <ol class="olist">
      <li><b>Press “+ New client”</b> (top right, on every page). Type the business name exactly as printed on the stand, paste their Google review link, and pick the product they bought.</li>
      <li><b>Add their other links</b> on the client page (menu, Facebook, Instagram…). Under each box it says where to find it. Press <b>Test this link</b> after saving.</li>
      <li><b>Open the stand and follow the steps at the top:</b> choose what it opens → write the chip with NFC Tools → tap it (it opens the stand’s page = it works) → tick the quality check → <b>Go live</b>.</li>
      <li><b>Create the owner login</b> on the client page and send the ready-made message by Messenger or Viber.</li>
      <li><b>Hand it over.</b> Show the owner one tap on their own phone and open their dashboard together (see “What to say”).</li>
    </ol>
    ${help('Printing the QR code', html`Use <b>QR for printer (SVG)</b> for the print shop: it stays sharp at any size. Use the <b>PNG</b> for Canva or social posts. Keep the white border around the QR and print it at least 2.5 cm wide.`)}
    ${help('Stands with more than one QR or tap zone', html`The 4-in-1 bar has four tap zones: each one can open a different app (Google, Facebook, Instagram, TikTok). The Triangle PVC stand has a main tap plus a separate menu QR. Each zone has its own link and QR on the stand’s page.`)}
  </section>

  <section class="panel" id="say"><h2>3. What to say to clients</h2>
    <div class="say"><em>30-SECOND EXPLANATION (ENGLISH)</em>Your customers just tap their phone here, or scan the QR, and your Google review page opens right away: no app, no searching. If you ever change your links, we update them online; the stand never needs reprinting. And you get a dashboard showing how many people tapped and what they opened.</div>
    <div class="say"><em>TAGLISH VERSION</em>I-tap lang ng customer yung phone nila dito, o i-scan yung QR, bukas agad yung Google review page ninyo. Walang app, walang search. Kung magpalit kayo ng link, kami na mag-a-update online, hindi na kailangan i-reprint yung stand. May dashboard din kayo para makita kung ilan ang nag-tap at ano ang binuksan nila.</div>
    <div class="say"><em>WHEN HANDING OVER THE STAND</em>“Try it with your own phone: tap here. See, it opens your review page. This is your dashboard link and password. You’ll see every tap here, and under ‘My links’ you can change where it goes anytime.”</div>
    ${help('Tips for placing the stand', html`<ul><li>Put it where people wait or pay: the counter, the table, near the exit.</li><li>Ask for the review in person first: “If you liked it, tap here to leave us a review.” Stands work best with a nudge.</li><li>iPhones read the chip with the <b>top edge</b> of the phone; Androids with the middle of the back.</li></ul>`)}
  </section>

  <section class="panel" id="numbers"><h2>4. Explaining the numbers</h2>
    <div class="flow">
      <div><i>TAPS & SCANS</i><b>How many times the stand was used</b><span>Taps on the chip plus QR scans.</span></div>
      <div><i>OPENED GOOGLE REVIEW</i><b>People who reached the review box</b><span>Not every one posts a review, so this isn’t a review count. Be honest about that.</span></div>
      <div><i>OPENED MENU</i><b>People who looked at the menu</b><span>From a tap, a QR scan or the links page.</span></div>
      <div><i>DIFFERENT PEOPLE</i><b>Different phones per day</b><span>The same person tapping twice in a day counts once. We don’t collect names or numbers.</span></div>
    </div>
  </section>

  <section class="panel stack-10" id="faq"><h2>5. Questions clients ask</h2>
    ${Q('Do my customers need an app?', 'No. Most phones from the last 6 years read the chip. If a phone can’t, the QR on the stand works with any camera.')}
    ${Q('What if I change my Facebook page, menu or review link?', 'Change it under “My links” in your dashboard (or message us). Every stand updates on the next tap. No reprint.')}
    ${Q('Does it count my reviews?', 'It counts how many people opened your review page. Google doesn’t tell anyone who actually posted, so we don’t claim reviews we can’t see.')}
    ${Q('What if someone steals or breaks the stand?', 'Message us. We pause that stand in seconds (taps show a “paused” page) and set up a replacement.')}
    ${Q('Do you collect my customers’ data?', 'No names, numbers or accounts. We only count taps, the rough country, and a daily scrambled ID to tell different phones apart.')}
    ${Q('Can I have several branches?', 'Yes. Each stand can be tagged with its branch, and you see everything in one dashboard.')}
  </section>

  <section class="panel stack-10" id="fix"><h2>6. When something goes wrong</h2>
    ${Q('Tapping does nothing', html`<ul><li>iPhone: the screen must be on and unlocked; hold the <b>top edge</b> on the tap spot for 2 seconds.</li><li>Android: NFC must be on (Settings → Connected devices → NFC).</li><li>Thick phone cases can block it. Try the QR.</li><li>Still nothing? The chip may be blank: open the stand’s page and write it again (it’s only locked after writing).</li></ul>`)}
    ${Q('It opens the stand’s admin page instead of Google', 'The stand isn’t live yet. Finish the quality check and press “Go live”.')}
    ${Q('Customers see “This tap is paused”', 'Someone paused the stand. Open it and press “Reopen setup”, then go live again.')}
    ${Q('Customers see “Not set up yet”', 'The stand isn’t assigned to a client. Open it → Details → choose the client.')}
    ${Q('It opens the links page instead of Google', 'The client has no Google review link saved. Add it on the client page.')}
    ${Q('The owner forgot their password', 'Client page → Owner login → “New password”. Send them the new message.')}
  </section>

  <section class="panel" id="supplier"><h2>7. Ordering from the supplier</h2>
    <p class="lead">For bigger orders, the supplier writes the chips and prints the QRs for you. You send them a list of links and a QR sheet; they send back stands that only need a test tap.</p>
    <ol class="olist">
      <li><b>Add the client and their stands first</b> (“+ New client”). Every stand gets its permanent links the moment it’s added.</li>
      <li>Open <b>Stands & cards → Send to supplier</b> and choose the client (or everyone). Leave “Only stands not written yet” on.</li>
      <li><b>Download the list (CSV)</b>: one row per chip or QR, with the stand name, the <b>chip link</b> and the <b>QR link</b>.</li>
      <li><b>Save the QR sheet as a PDF</b>: press “Print / save as PDF”. Each QR has the stand name under it.</li>
      <li><b>Copy the message for the supplier</b> and send it with the two files.</li>
      <li>When the stands arrive: <b>tap each one</b>. It opens its admin page. Tick the quality check, then <b>Go live</b> on handover.</li>
    </ol>
    <div class="say"><em>THE ONE RULE FOR SUPPLIERS</em>The chip gets the <b>chip link</b> (…/t/…). The printed QR gets the <b>QR link</b> (…/q/…). They look almost the same but must not be swapped; that’s how we count taps and scans separately.</div>
    ${help('What chips should the supplier use?', html`<b>NTAG213</b> (cheapest, plenty for our links) or <b>NTAG215</b>. Ask them to write one URL record and <b>lock</b> the chip after writing. Ask for a sample photo or one test stand before the full batch.`)}
    ${help('How do I check a supplier sample?', html`Tap the chip with your phone: it should open that stand’s admin page (a staff login page if you’re logged out). Scan the QR: same page. If a tap opens nothing, the chip wasn’t written; if it opens the wrong stand, the labels were mixed up.`)}
  </section>

  <section class="panel" id="words"><h2>8. Words we use</h2>
    <div class="flow">
      <div><i>TAP LINK</i><span>The permanent link inside a chip (${tapBase}/t/…). Never changes.</span></div>
      <div><i>QR LINK</i><span>Same idea, printed as a QR (${tapBase}/q/…). We count scans separately.</span></div>
      <div><i>LINKS PAGE</i><span>A page listing all of a client’s links, for cards and 4-in-1 setups.</span></div>
      <div><i>TAP ZONE</i><span>One chip on a stand. Most stands have one; the 4-in-1 bar has four.</span></div>
      <div><i>LIVE</i><span>Turned on: customers’ taps open the client’s pages.</span></div>
      <div><i>PAUSED</i><span>Turned off: taps show a “paused” page.</span></div>
    </div>
  </section>`;
}

/* ---------- owner pages (dashboard.tap4.ph) ---------- */
export function ownerOverview({ b, stats, devices, recent, links, tapBase, q }) {
  const hasGoogle = !!links.google, live = devices.filter(d => d.status === 'active').length;
  const tip = !Object.values(links).some(Boolean) ? next({ tag: 'START HERE', title: 'Add your links', text: 'Tell us where your stands should send people: your Google review page, menu, Facebook and more.', action: html`<a class="btn" href="/app/destinations">Add my links →</a>` })
    : !hasGoogle ? next({ tag: 'TIP', title: 'Add your Google review link', text: 'It’s the most useful link for a stand. We show you where to find it.', action: html`<a class="btn" href="/app/destinations">Add it →</a>` })
    : !live && devices.length ? next({ calm: true, tag: 'ALMOST THERE', title: 'Tap4 is preparing your stands', text: 'They’ll show as “Live” here once they’re set up and handed to you.' })
    : '';
  return html`${flash(q)}${head('MY DASHBOARD', `Hi, ${b.name}`, html`<div class="row-wrap"><a class="btn btn--lime" href="/app/destinations">Change my links</a><a class="btn btn--ghost" href="${tapBase}/p/${b.slug}" target="_blank" rel="noopener">View my page ↗</a></div>`, 'Here’s how people are using your stands. Numbers update live.')}
  ${tip}
  ${statsBlock(stats, { title: 'Last 30 days', caption: 'PH TIME' })}
  ${help('What do these numbers mean?', html`<ul>
    <li><b>Taps & scans</b>: how many times someone tapped a stand or scanned its QR.</li>
    <li><b>Opened Google review</b>: people who reached your review page. Not everyone posts, so it isn’t a review count.</li>
    <li><b>Opened menu</b>: people who looked at your menu.</li>
    <li><b>Different people</b>: different phones per day. We never collect names or numbers.</li></ul>`)}
  <div class="panel"><div class="panel__head"><span>MY STANDS & CARDS</span><span>${live} OF ${devices.length} LIVE</span></div>${deviceCards(devices)}</div>
  <div class="panel"><div class="panel__head"><span>LATEST TAPS</span><span>LIVE</span></div>${recentTable(recent, false)}</div>`;
}

export function ownerDestinations({ b, links, devices, q }) {
  return html`${flash(q)}${head('MY LINKS', 'Where your stands send people.', '', 'Change a link here and every stand that uses it opens the new page on the very next tap, even stands already on your counter.')}
  <div class="grid2">${linksForm('/app/destinations', links, devices, 'My links', true)}
    <div class="stack-14">
      <div class="panel"><div class="panel__head"><span>WHAT EACH STAND OPENS</span><span>SET BY TAP4</span></div>${deviceCards(devices)}
        <p class="hint">Want a stand to open something else, like your menu instead of Google? Message Tap4 at ${SUPPORT_EMAIL}.</p></div>
      ${help('Where do I find my Google review link?', html`<ol><li>Open <b>Google Maps</b> and tap your profile photo → <b>Your Business Profiles</b>, or search your business name on Google while logged in.</li><li>Tap <b>Ask for reviews</b> (or “Get more reviews” / “Share review form”).</li><li>Tap <b>Copy</b>, then paste it into the Google review box here and press <b>Save links</b>.</li></ol>`, true)}
    </div>
  </div>`;
}

export function ownerBranding({ b, tapBase, q }) {
  return html`${flash(q)}${head('MY PAGE', 'How your links page looks.', '', 'This page opens when someone taps a card or a stand set to show all your links.')}
  <div class="grid2">
    <form class="panel" method="post" action="/app/branding">
      <div class="panel__head"><span>LOGO & COLOUR</span><span>${b.name.toUpperCase()}</span></div>
      <label class="field"><b>Logo</b><input name="logo_url" type="url" placeholder="https://…" value="${b.logo_url || ''}"><span class="hint">Paste a link to a square picture of your logo (e.g. from your Facebook page: open your profile picture → copy image address). Leave empty to show your initials.</span></label>
      <label class="field"><b>Brand colour</b><input name="brand_color" type="color" value="${b.brand_color || '#c8f23c'}"><span class="hint">Used for the stars and the first button.</span></label>
      <div><button class="btn btn--lime btn--lg">Save</button></div>
      <p class="hint">Your business name and the printed stand design are handled by Tap4. Message us for a reprint.</p>
    </form>
    <div class="panel" style="align-items:center"><div class="panel__head" style="width:100%"><span>PREVIEW</span><a href="${tapBase}/p/${b.slug}" target="_blank" rel="noopener">OPEN ↗</a></div>
      <div class="phone-pv"><iframe src="${tapBase}/p/${b.slug}" title="Preview of your links page" loading="lazy"></iframe></div>
      <p class="hint">Save to see your changes here.</p></div>
  </div>`;
}

export function ownerHelp() {
  const Q = (q, a, open) => help(q, a, open);
  return html`${head('HELP', 'Questions & answers.', html`<a class="btn btn--lime" href="mailto:${SUPPORT_EMAIL}">Message Tap4</a>`, `Can’t find your answer? Email ${SUPPORT_EMAIL}. We usually reply the same day.`)}
  <div class="panel stack-10">
    ${Q('How does my stand work?', 'Each stand has a chip and a QR with a permanent tap4 link. When a customer taps or scans, tap4 sends them to the page you chose: your Google review page, menu or links page. No app needed.', true)}
    ${Q('How do I change where my stand goes?', 'Go to “My links”, paste the new link and press Save. Every stand updates on the next tap. No reprint.')}
    ${Q('Where do I find my Google review link?', html`Google Maps → your profile photo → Your Business Profiles → <b>Ask for reviews</b> → Copy. Paste it in “My links”.`)}
    ${Q('Why is “Opened Google review” higher than my new reviews?', 'It counts everyone who reached your review page. Some people read it and leave without posting. A friendly “tap here to review us” at the counter helps a lot.')}
    ${Q('A customer says tapping doesn’t work', html`<ul><li>iPhone: unlock the phone and hold the <b>top edge</b> on the tap spot.</li><li>Android: turn on NFC in Settings.</li><li>They can always scan the QR with the camera instead.</li></ul>`)}
    ${Q('My stand is lost or broken', `Message ${SUPPORT_EMAIL}. We can pause it right away and send a replacement.`)}
    ${Q('Do you collect my customers’ information?', 'No names, numbers or accounts. We only count taps and scans, and tell different phones apart with a daily scrambled ID.')}
    ${Q('I forgot my password', `Message ${SUPPORT_EMAIL} and we’ll send you a new one. Once logged in, you can change it under Account.`)}
  </div>`;
}

export const partName = slot => slot === 'main' ? 'main tap' : slot === 'menu' ? 'menu QR' : /^z\d$/.test(slot) ? `tap zone ${slot.slice(1)}` : slot;

export function quickView({ f, q }) {
  const sel = (a, b) => (a === b ? raw(' selected') : '');
  return html`${flash(q)}${head('NEW CLIENT', 'Add a client in one go.', '', 'Fill in what you know now. Everything can be changed later on the client’s page.')}
  <form class="panel" method="post" action="/admin/new" style="max-width:720px">
    <div class="panel__head"><span><span class="stepnum">1</span>THE BUSINESS</span><span>REQUIRED: NAME</span></div>
    <div class="fields">
      <label class="field"><b>Business name</b><input name="name" required maxlength="60" placeholder="Kape Norte" value="${f.name || ''}" autofocus><span class="hint">Exactly as printed on the stand.</span></label>
      <label class="field"><b>Contact person</b><input name="contact_name" maxlength="60" placeholder="Ana Reyes" value="${f.contact_name || ''}"></label>
      <label class="field"><b>Phone / Viber</b><input name="phone" type="tel" maxlength="30" value="${f.phone || ''}"></label>
      <label class="field"><b>Email</b><input name="email" type="email" maxlength="120" value="${f.email || ''}"></label>
    </div>
    <div class="panel__head" style="margin-top:8px"><span><span class="stepnum">2</span>GOOGLE REVIEW LINK</span><span>OPTIONAL</span></div>
    <label class="field">${icon('google', 15)}<input name="google" type="url" inputmode="url" placeholder="https://g.page/r/…/review" value="${f.google || ''}"><span class="hint">${LINK_HELP.google} Don’t have it yet? Leave it empty.</span></label>
    <div class="panel__head" style="margin-top:8px"><span><span class="stepnum">3</span>WHAT THEY BOUGHT</span><span>OPTIONAL</span></div>
    <div class="fields" style="align-items:end">
      <label class="field"><b>Product</b><select name="sku"><option value="">No stand yet</option>${Object.entries(PRODUCTS).map(([sku, p]) => html`<option value="${sku}"${sel(f.sku, sku)}>${p.name}</option>`)}</select></label>
      <label class="field"><b>How many</b><input name="qty" type="number" min="1" max="100" value="${f.qty || 1}"></label>
      <label class="field"><b>Branch</b><input name="branch" maxlength="40" placeholder="optional, e.g. BGC" value="${f.branch || ''}"></label>
    </div>
    <div class="row-wrap"><button class="btn btn--lime btn--lg">Add client →</button><a class="btn btn--ghost" href="/admin/businesses">Cancel</a></div>
    <p class="hint">Next you’ll land on their page, which shows the next step: more links, writing the chip, the owner’s login.</p>
  </form>`;
}

export function supplierView({ rows, qrs, businesses, bid, which }) {
  const n = rows.length, chips = rows.filter(r => r.chip).length, prints = rows.filter(r => r.qr).length;
  const stands = new Set(rows.map(r => r.code)).size;
  const who = bid ? (businesses.find(b => b.id === bid)?.name || 'client') : 'all clients';
  const qs = `b=${bid}&which=${which}`;
  const message = `Hi! Here is our tap4 order: ${stands} stand${stands === 1 ? '' : 's'}/card${stands === 1 ? '' : 's'} (${chips} NFC chip${chips === 1 ? '' : 's'}, ${prints} printed QR${prints === 1 ? '' : 's'}).

Attached:
1) tap4 list (CSV): one row per chip or QR, with the stand label.
2) tap4 QR sheet (PDF): every QR code with its label underneath.

Please:
- NFC chips: NTAG213 or NTAG215. Write the "chip_link" of each row as a URL record, exactly as written. Then LOCK the chip (read-only).
- Printed QR: use the QR from the sheet, or make one from the "qr_link". Black on white, at least 2.5 cm wide, keep the white border.
- Important: chip links contain /t/ and QR links contain /q/. Please don't swap them.
- Keep each stand's chip and QR together and label the package with its label (e.g. TF-KN-0001).
- Test before shipping: tap each chip and scan each QR with a phone. It should open a tap4 page (a login page is normal). If nothing opens, rewrite that chip.

Please send one sample photo (or one test stand) before the full batch. Thank you!`;
  return html`<div class="no-print stack-14">${head('SUPPLIER FILES', 'Send an order to the supplier.', '', 'Three things to send: the list of links, the QR sheet, and the message below. The supplier writes the chips and prints the QRs; you just test-tap when they arrive.')}
  <form method="get" action="/admin/supplier" class="panel">
    <div class="panel__head"><span>WHICH STANDS?</span><span>${stands} STAND${stands === 1 ? '' : 'S'} · ${chips} CHIPS · ${prints} QRS</span></div>
    <div class="fields" style="align-items:end">
      <label class="field"><b>Client</b><select name="b" onchange="this.form.submit()"><option value="0">All clients</option>${businesses.map(b => html`<option value="${b.id}"${b.id === bid ? raw(' selected') : ''}>${b.name}</option>`)}</select></label>
      <label class="field"><b>Stands</b><select name="which" onchange="this.form.submit()"><option value="new">Only stands not written yet</option><option value="all"${which === 'all' ? raw(' selected') : ''}>All stands (re-order / reprint)</option></select></label>
    </div>
  </form>
  ${!n ? next({ calm: true, tag: 'NOTHING TO SEND', title: 'No stands match.', text: 'Add stands to a client first (“+ New client” or on the client page), or choose “All stands”.', action: html`<a class="btn" href="/admin/new">+ New client</a>` }) : html`
  <div class="grid2">
    <div class="panel"><div class="panel__head"><span><span class="stepnum">1</span>THE LIST OF LINKS</span><span>CSV · OPENS IN EXCEL / SHEETS</span></div>
      <p class="hint" style="font-size:13.5px">One row per chip or QR: stand label, client, product, part, <b>chip link</b> (write to NFC) and <b>QR link</b> (print as QR).</p>
      <div><a class="btn btn--lime" href="/admin/supplier.csv?${qs}" download>Download list (CSV) ↓</a></div></div>
    <div class="panel"><div class="panel__head"><span><span class="stepnum">2</span>THE QR SHEET</span><span>PDF</span></div>
      <p class="hint" style="font-size:13.5px">Every printed QR with its label. Press the button and choose <b>Save as PDF</b> as the printer.</p>
      <div><button type="button" class="btn btn--lime" onclick="window.print()">Print / save as PDF</button></div></div>
  </div>
  <div class="panel"><div class="panel__head"><span><span class="stepnum">3</span>THE MESSAGE</span><span>COPY → MESSENGER / EMAIL / ALIBABA CHAT</span></div>
    <div class="say" style="white-space:pre-line">${message}</div>
    <div class="row-wrap"><button type="button" class="btn btn--lime" data-copy="${message}">Copy message</button><a class="btn btn--ghost" href="/admin/guide#supplier">Supplier guide</a></div></div>
  <div class="panel"><div class="panel__head"><span>WHAT’S IN THE LIST</span><span>${n} ROWS</span></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>LABEL</th><th>CLIENT</th><th>PRODUCT</th><th>PART</th><th>CHIP LINK (NFC)</th><th>QR LINK (PRINT)</th></tr></thead><tbody>
      ${rows.map(r => html`<tr><td><a href="/admin/d/${r.code}">${r.label || r.code}</a></td><td>${r.bname || 'Not assigned'}</td><td>${productName(r.product_sku)}</td><td>${partName(r.slot)}</td><td class="mono-12">${r.chip || '—'}</td><td class="mono-12">${r.qr || '—'}</td></tr>`)}
    </tbody></table></div></div>`}
  </div>
  ${prints ? html`<section class="panel" style="background:transparent;box-shadow:none;padding:0"><div class="panel__head no-print"><span>QR SHEET PREVIEW</span><span>${prints} QR${prints === 1 ? '' : 'S'}</span></div>
    <h2 class="print-title" style="display:none">tap4 QR sheet: ${who}</h2>
    <div class="qrsheet">${rows.filter(r => r.qr).map(r => html`<div class="qrcell">${raw(qrs[r.qr])}<b>${r.label || r.code}</b><span>${r.bname || ''}${r.bname ? ' · ' : ''}${partName(r.slot)}</span><code>${r.qr}</code></div>`)}</div></section>` : ''}
  <style>@media print{.print-title{display:block!important;margin-bottom:6mm}}</style>`;
}
