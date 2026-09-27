// Screens for the tapfour app modules (menu, billing, inventory, branches, staff, reports).
// Same design system and writing rules as views.js: plain words, phone first.
import { html, raw } from 'hono/html';
import { PLANS, linkName } from './lib.js';
import { flash, head, next, help, n, peso, ago } from './views.js';

const MODULE_NAMES = { menu: 'Live QR menu', billing: 'Billing tracker', inventory: 'Inventory tracker', branches: 'Branches', reports: 'Monthly report', staff: 'Staff tracker' };
const needPlan = m => Object.entries(PLANS).find(([, p]) => p.modules.includes(m))?.[1].name;
const branchSelect = (branches, name = 'branch', value = '') => branches.length > 1
  ? html`<label class="field"><b>Branch</b><select name="${name}"><option value="">All / not set</option>${branches.map(x => html`<option${x.name === value ? raw(' selected') : ''}>${x.name}</option>`)}</select></label>`
  : branches.length === 1 ? html`<input type="hidden" name="${name}" value="${branches[0].name}">` : '';
const dateLabel = (d, today) => {
  const days = Math.round((Date.parse(d) - Date.parse(today)) / 864e5);
  return days < 0 ? `${-days} day${days === -1 ? '' : 's'} late` : days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
};

export function upsell(b, module) {
  const cancelled = b.plan && b.plan_status === 'cancelled';
  return html`${head('TAPFOUR APP', MODULE_NAMES[module] || 'Not in your plan', '', cancelled ? 'Your tapfour app plan is cancelled. Your stands keep working; the app tools come back when you restart it.' : `This is part of the tapfour app ${needPlan(module) ? `(${needPlan(module)} plan and up)` : ''}. Your stands keep working either way.`)}
  ${next({ calm: true, tag: 'UPGRADE', title: 'Want this?', text: 'Message Tap4 and we’ll switch it on for you.', action: html`<a class="btn" href="https://tap4.ph/#plans" target="_blank" rel="noopener">See plans ↗</a>` })}`;
}

/* ---------- live QR menu ---------- */
export function menuView({ b, items, tapBase, q }) {
  const cats = [...new Set(items.map(i => i.category))];
  const url = `${tapBase}/menu/${b.slug}`;
  return html`${flash(q)}${head('LIVE QR MENU', 'Your menu.', items.length ? html`<a class="btn btn--ghost" href="${url}" target="_blank" rel="noopener">See it like a guest ↗</a>` : '', 'Change a price or mark something sold out here, and it shows on your menu right away. No reprint, no app for guests.')}
  ${!items.length ? next({ tag: 'START HERE', title: 'Add your menu', text: 'Type items one by one below, or paste your whole menu at once (“Paste many at once”). Tap4 staff can do it for you from a photo.' }) : ''}
  <div class="grid2">
    <form class="panel" method="post" action="/app/menu/add">
      <div class="panel__head"><span>ADD AN ITEM</span><span>${items.length} ON YOUR MENU</span></div>
      <div class="fields">
        <label class="field"><b>Name</b><input name="name" required maxlength="60" placeholder="Sagada Latte"></label>
        <label class="field"><b>Price (₱)</b><input name="price" inputmode="decimal" maxlength="12" placeholder="165"></label>
        <label class="field"><b>Section</b><input name="category" maxlength="40" list="cats" placeholder="Coffee" value="${cats[cats.length - 1] || ''}"></label>
        <label class="field"><b>Short note (optional)</b><input name="note" maxlength="80" placeholder="Double shot, oat"></label>
      </div>
      <datalist id="cats">${cats.map(c => html`<option value="${c}">`)}</datalist>
      <div><button class="btn btn--lime btn--lg">Add to menu</button></div>
    </form>
    ${help('Paste many at once (fastest for a whole menu)', html`<form method="post" action="/app/menu/import" class="stack-14">
      <p>One item per line: <b>name | note | price</b>. A line without “|” starts a new section.</p>
      <textarea name="text" rows="8" style="background:var(--bg);border:1px solid var(--l4);border-radius:12px;padding:12px;color:var(--fg);font:14px var(--mono);width:100%" placeholder="Coffee&#10;Sagada Latte | Double shot, oat | 165&#10;Pour-over | 180&#10;&#10;Pastry&#10;Ensaymada | Butter &amp; queso | 95"></textarea>
      <label class="qc-item"><input type="checkbox" name="replace" value="1">Replace my whole menu with this</label>
      <div><button class="btn btn--lime" data-confirm="Add these items to your menu?">Add these items</button></div>
    </form>`, !items.length)}
  </div>
  ${cats.map(c => html`<div class="panel"><div class="panel__head"><span>${c.toUpperCase()}</span><span>${items.filter(i => i.category === c).length} ITEMS</span></div>
    <div class="stack-10">${items.filter(i => i.category === c).map(i => html`<div class="linkrow" id="i${i.id}"${i.sold_out ? raw(' style="opacity:.6"') : ''}>
      <div class="row-between wrap"><b style="font-size:16px">${i.name}${i.note ? html` <span class="m3" style="font-weight:500;font-size:13px">· ${i.note}</span>` : ''}</b><span class="row-wrap" style="gap:8px"><span class="mono lime">${peso(i.price_cents) || '—'}</span>
        <form method="post" action="/app/menu/${i.id}/soldout"><button class="btn btn--sm ${i.sold_out ? 'btn--lime' : 'btn--ghost'}">${i.sold_out ? 'Sold out · tap to bring back' : 'Mark sold out'}</button></form></span></div>
      ${help('Edit', html`<form method="post" action="/app/menu/${i.id}" class="stack-10"><div class="fields">
        <label class="field">Name<input name="name" required maxlength="60" value="${i.name}"></label>
        <label class="field">Price (₱)<input name="price" inputmode="decimal" value="${i.price_cents == null ? '' : i.price_cents / 100}"></label>
        <label class="field">Section<input name="category" maxlength="40" list="cats" value="${i.category}"></label>
        <label class="field">Note<input name="note" maxlength="80" value="${i.note || ''}"></label></div>
        <div class="row-wrap"><button class="btn btn--ghost btn--sm">Save</button><button class="btn btn--ghost btn--sm" formaction="/app/menu/${i.id}/delete" data-confirm="Remove “${i.name}” from the menu?">Remove</button></div></form>`)}
    </div>`)}</div></div>`)}
  ${items.length ? html`<p class="hint">Guests see this menu when they scan a Menu QR or tap “Menu” on your links page. Link: <a href="${url}" target="_blank" rel="noopener">${url}</a></p>` : ''}`;
}

/* ---------- billing tracker ---------- */
export function billingView({ b, open, paid, branches, today, q }) {
  const late = open.filter(x => x.due_date < today), soon = open.filter(x => x.due_date >= today && Date.parse(x.due_date) - Date.parse(today) <= 7 * 864e5);
  const total = list => peso(list.reduce((a, x) => a + (x.amount_cents || 0), 0)) || '₱0';
  return html`${flash(q)}${head('BILLING', 'Bills to pay.', '', 'Suppliers, rent, electricity. Add them once; repeating bills come back every month by themselves.')}
  <div class="kpis">
    <div class="kpi${late.length ? ' kpi--lime' : ''}"><span>LATE</span><b>${late.length}</b><em>${total(late)}</em></div>
    <div class="kpi"><span>DUE THIS WEEK</span><b>${soon.length}</b><em>${total(soon)}</em></div>
    <div class="kpi"><span>ALL UNPAID</span><b>${open.length}</b><em>${total(open)}</em></div>
  </div>
  <div class="grid2">
    <div class="panel"><div class="panel__head"><span>TO PAY</span><span>OLDEST FIRST</span></div>
      ${open.length ? html`<div class="stack-10">${open.map(x => html`<div class="url">
        <span style="flex:1;min-width:0"><b>${x.name}</b>${x.branch ? html` <span class="m3">· ${x.branch}</span>` : ''}<br><span class="mono-11 ${x.due_date < today ? '' : 'm3'}" style="${x.due_date < today ? 'color:#f27fa8' : ''}">DUE ${x.due_date} · ${dateLabel(x.due_date, today).toUpperCase()}${x.repeat_monthly ? ' · MONTHLY' : ''}</span></span>
        <b class="mono">${peso(x.amount_cents)}</b>
        <form method="post" action="/app/billing/${x.id}/paid"><button class="btn btn--lime btn--sm">Paid ✓</button></form>
        <form method="post" action="/app/billing/${x.id}/delete" data-confirm="Remove this bill?"><button class="btn btn--ghost btn--sm" aria-label="Remove">✕</button></form>
      </div>`)}</div>` : html`<div class="empty">Nothing to pay. 🎉 Add bills on the right.</div>`}
    </div>
    <form class="panel" method="post" action="/app/billing/add">
      <div class="panel__head"><span>ADD A BILL</span><span>REMINDS YOU ON HOME</span></div>
      <label class="field"><b>What for</b><input name="name" required maxlength="60" placeholder="Bean supplier, Electricity, Rent…"></label>
      <div class="fields">
        <label class="field"><b>Amount (₱)</b><input name="amount" inputmode="decimal" placeholder="8400"></label>
        <label class="field"><b>Due date</b><input name="due" type="date" required value="${today}"></label>
      </div>
      ${branchSelect(branches)}
      <label class="qc-item"><input type="checkbox" name="repeat" value="1" checked>Every month (adds next month’s bill when you mark it paid)</label>
      <div><button class="btn btn--lime btn--lg">Add bill</button></div>
    </form>
  </div>
  ${paid.length ? help(`Paid recently (${paid.length})`, html`${paid.map(x => html`<div class="row-between" style="padding:6px 0;border-bottom:1px solid var(--l1)"><span>${x.name}${x.branch ? ` · ${x.branch}` : ''}</span><span class="mono m3">${peso(x.amount_cents)} · paid ${ago(x.paid_at)}</span></div>`)}`) : ''}`;
}

/* ---------- inventory tracker ---------- */
export function inventoryView({ b, items, branches, q }) {
  const low = items.filter(x => x.low_at != null && x.qty <= x.low_at);
  const fmt = v => Number.isInteger(v) ? v : Math.round(v * 100) / 100;
  return html`${flash(q)}${head('INVENTORY', 'What’s left.', '', 'Tap − and + as you use and restock. Items running low show up on your Home page.')}
  <div class="kpis"><div class="kpi${low.length ? ' kpi--lime' : ''}"><span>RUNNING LOW</span><b>${low.length}</b><em>${low.map(x => x.name).slice(0, 3).join(', ') || 'All good'}</em></div><div class="kpi"><span>ITEMS TRACKED</span><b>${items.length}</b><em>${branches.length > 1 ? `${branches.length} branches` : 'Your shop'}</em></div></div>
  <div class="grid2">
    <div class="panel"><div class="panel__head"><span>STOCK</span><span>LOW FIRST</span></div>
      ${items.length ? html`<div class="stack-10">${items.map(x => { const isLow = x.low_at != null && x.qty <= x.low_at; return html`<div class="url" id="s${x.id}">
        <span style="flex:1;min-width:0"><b>${x.name}</b>${x.branch ? html` <span class="m3">· ${x.branch}</span>` : ''}<br><span class="mono-11" style="${isLow ? 'color:#f27fa8' : 'color:var(--m3)'}">${isLow ? 'LOW · ' : ''}${fmt(x.qty)} ${x.unit || ''} LEFT${x.low_at != null ? ` · LOW BELOW ${fmt(x.low_at)}` : ''}</span></span>
        <form method="post" action="/app/inventory/${x.id}/adjust"><input type="hidden" name="delta" value="-1"><button class="btn btn--ghost btn--sm" aria-label="One less">−</button></form>
        <form method="post" action="/app/inventory/${x.id}/adjust"><input type="hidden" name="delta" value="1"><button class="btn btn--ghost btn--sm" aria-label="One more">+</button></form>
        ${help('Set', html`<form method="post" action="/app/inventory/${x.id}/adjust" class="row-wrap"><input name="set" inputmode="decimal" placeholder="${fmt(x.qty)}" style="width:90px;background:var(--bg);border:1px solid var(--l4);border-radius:10px;padding:8px;color:var(--fg)"><button class="btn btn--lime btn--sm">Save</button><button class="btn btn--ghost btn--sm" formaction="/app/inventory/${x.id}/delete" data-confirm="Stop tracking ${x.name}?">Remove</button></form>`)}
      </div>`; })}</div>` : html`<div class="empty">Nothing tracked yet. Add the things you run out of: milk, beans, cups, charcoal…</div>`}
    </div>
    <form class="panel" method="post" action="/app/inventory/add">
      <div class="panel__head"><span>TRACK AN ITEM</span><span>ONLY WHAT YOU RUN OUT OF</span></div>
      <label class="field"><b>Item</b><input name="name" required maxlength="60" placeholder="Oat milk"></label>
      <div class="fields">
        <label class="field"><b>How much is left</b><input name="qty" inputmode="decimal" required placeholder="12"></label>
        <label class="field"><b>Unit</b><input name="unit" maxlength="20" placeholder="L, kg, pcs, packs"></label>
        <label class="field"><b>Warn me below</b><input name="low_at" inputmode="decimal" placeholder="3"></label>
      </div>
      ${branchSelect(branches)}
      <div><button class="btn btn--lime btn--lg">Track it</button></div>
    </form>
  </div>`;
}

/* ---------- branches ---------- */
export function branchesView({ b, rows, limit, q }) {
  const max = Math.max(1, ...rows.map(r => r.taps));
  return html`${flash(q)}${head('BRANCHES', 'All your branches.', '', `Your ${PLANS[b.plan].name} plan covers up to ${limit} branches. Stands, bills, stock and staff can each belong to a branch.`)}
  <div class="panel"><div class="panel__head"><span>TAPS & SCANS · 30 DAYS</span><span>${rows.length} OF ${limit}</span></div>
    ${rows.length ? html`<div class="stack-10">${rows.map((r, i) => html`<div class="linkrow">
      <div class="row-between wrap"><b style="font-size:16px">${r.name}${i === 0 && r.taps ? html` <span class="tag tag--lime">TOP</span>` : ''}</b><span class="mono lime">${n(r.taps)} taps · ${r.stands} stand${r.stands === 1 ? '' : 's'}</span></div>
      <div class="split__bar"><i style="width:${Math.round(r.taps / max * 100)}%;background:var(--lime)"></i></div>
      ${help('Rename / address', html`<form method="post" action="/app/branches/${r.id}" class="fields" style="align-items:end"><label class="field">Name<input name="name" required maxlength="40" value="${r.name}"></label><label class="field">Address<input name="address" maxlength="120" value="${r.address || ''}"></label><div><button class="btn btn--ghost btn--sm">Save</button></div></form>`)}
    </div>`)}</div>` : html`<div class="empty">No branches yet.</div>`}
  </div>
  ${rows.length < limit ? html`<form class="panel" method="post" action="/app/branches/add">
    <div class="panel__head"><span>ADD A BRANCH</span><span>${limit - rows.length} LEFT IN YOUR PLAN</span></div>
    <div class="fields" style="align-items:end"><label class="field"><b>Branch name</b><input name="name" required maxlength="40" placeholder="BGC"></label><label class="field"><b>Address (optional)</b><input name="address" maxlength="120"></label><div><button class="btn btn--lime btn--block">Add branch</button></div></div>
    <p class="hint">To put a stand in a branch, message Tap4. We set it when we prepare the stand.</p>
  </form>` : html`<p class="hint">You’re using all ${limit} branches in your plan. Message Tap4 to upgrade.</p>`}`;
}

/* ---------- staff tracker ---------- */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const NOW_LABEL = { on: ['ON SHIFT', 'var(--lime)'], later: ['LATER TODAY', '#7fd8f2'], done: ['DONE TODAY', 'var(--m3)'], off: ['DAY OFF', 'var(--m4)'] };
export function staffView({ b, staff, branches, q }) {
  const on = staff.filter(s => s.now === 'on').length;
  return html`${flash(q)}${head('STAFF', 'Who’s working.', '', 'Your team, their branch and shift. Status updates by itself from the shift times (Philippine time).')}
  <div class="kpis"><div class="kpi kpi--lime"><span>ON SHIFT NOW</span><b>${on}</b><em>of ${staff.length} staff</em></div></div>
  <div class="grid2">
    <div class="panel"><div class="panel__head"><span>TEAM</span><span>BY BRANCH</span></div>
      ${staff.length ? html`<div class="stack-10">${staff.map(s => html`<div class="url">
        <span style="flex:1;min-width:0"><b>${s.name}</b>${s.role ? html` <span class="m3">· ${s.role}</span>` : ''}<br><span class="mono-11 m3">${s.branch ? `${s.branch.toUpperCase()} · ` : ''}${s.shift_start && s.shift_end ? `${s.shift_start}–${s.shift_end}` : 'NO SET HOURS'} · ${DAYS.filter((_, i) => s.days[i] === '1').join(' ') || 'NO DAYS'}</span></span>
        <span class="st"><i style="background:${NOW_LABEL[s.now][1]}"></i>${NOW_LABEL[s.now][0]}</span>
        <form method="post" action="/app/staff/${s.id}/delete" data-confirm="Remove ${s.name}?"><button class="btn btn--ghost btn--sm" aria-label="Remove">✕</button></form>
      </div>`)}</div>` : html`<div class="empty">No staff yet. Add your team on the right.</div>`}
    </div>
    <form class="panel" method="post" action="/app/staff/add">
      <div class="panel__head"><span>ADD SOMEONE</span><span>SHIFT IN PH TIME</span></div>
      <div class="fields"><label class="field"><b>Name</b><input name="name" required maxlength="60" placeholder="Ana R."></label><label class="field"><b>Role (optional)</b><input name="role" maxlength="40" placeholder="Barista"></label></div>
      ${branchSelect(branches)}
      <div class="fields"><label class="field"><b>Starts</b><input name="start" type="time" value="10:00"></label><label class="field"><b>Ends</b><input name="end" type="time" value="19:00"></label></div>
      <div class="lbl">Works on</div>
      <div class="chips-row">${DAYS.map((d, i) => html`<label class="pchip" style="cursor:pointer"><input type="checkbox" name="day" value="${i}"${i < 6 ? raw(' checked') : ''} style="accent-color:var(--lime)">${d}</label>`)}</div>
      <div><button class="btn btn--lime btn--lg">Add to team</button></div>
    </form>
  </div>`;
}

/* ---------- monthly report ---------- */
export function reportView({ b, month, thisMonth, t, split, byBranch, hours, days }) {
  const [y, m] = month.split('-').map(Number), label = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7), nextM = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const total = split.reduce((a, x) => a + x.n, 0) || 1, maxH = Math.max(1, ...hours), top = hours.map((v, h) => [v, h]).sort((a, c) => c[0] - a[0]).filter(([v]) => v).slice(0, 3);
  const hl = h => `${h % 12 || 12}${h < 12 ? 'AM' : 'PM'}`;
  const best = days.slice().sort((a, c) => c.n - a.n)[0];
  return html`<div class="no-print row-between wrap"><div class="row-wrap"><a class="btn btn--ghost btn--sm" href="/app/reports?m=${prev}">← ${prev}</a>${month < thisMonth ? html`<a class="btn btn--ghost btn--sm" href="/app/reports?m=${nextM}">${nextM} →</a>` : ''}</div><button type="button" class="btn btn--lime" onclick="window.print()">Print / save as PDF</button></div>
  <div class="report stack-14">
    ${head(`MONTHLY REPORT · ${b.name.toUpperCase()}`, label, '', month === thisMonth ? 'This month so far.' : 'Taps, scans and what people opened, for the whole month.')}
    <div class="kpis">
      <div class="kpi"><span>TAPS & SCANS</span><b>${n(t.taps)}</b><em>${n(t.nfc)} taps · ${n(t.qr)} scans</em></div>
      <div class="kpi"><span>OPENED GOOGLE REVIEW</span><b>${n(t.review)}</b><em>Reached the review page</em></div>
      <div class="kpi"><span>OPENED MENU</span><b>${n(t.menu)}</b><em>Tap, scan or links page</em></div>
      <div class="kpi"><span>DIFFERENT PEOPLE</span><b>${n(t.visitors)}</b><em>Counted per day</em></div>
    </div>
    <div class="grid2">
      <div class="panel"><div class="panel__head"><span>WHAT PEOPLE OPENED</span></div>${split.length ? split.map(x => html`<div class="split"><div class="row-between"><span>${linkName(x.k)}</span><span class="mono">${Math.round(x.n / total * 100)}% · ${n(x.n)}</span></div><div class="split__bar"><i style="width:${Math.round(x.n / total * 100)}%;background:var(--lime)"></i></div></div>`) : html`<div class="empty">No taps this month.</div>`}</div>
      <div class="panel"><div class="panel__head"><span>BUSIEST HOURS</span><span>${top.length ? `PEAK ${hl(top[0][1])}` : ''}</span></div>
        <div class="bars" style="height:110px;gap:3px">${hours.map((v, h) => html`<i style="height:${Math.max(2, Math.round(v / maxH * 100))}%"${top.some(([, x]) => x === h) ? raw(' class="on"') : ''}></i>`)}</div>
        <p class="hint">${top.length ? `Busiest: ${top.map(([, h]) => hl(h)).join(', ')}.` : ''} ${best ? `Best day: ${best.d} (${n(best.n)}).` : ''}</p></div>
    </div>
    ${byBranch.length > 1 || (byBranch[0] && byBranch[0].branch !== 'No branch') ? html`<div class="panel"><div class="panel__head"><span>BY BRANCH</span></div>${byBranch.map(r => html`<div class="row-between" style="padding:8px 0;border-bottom:1px solid var(--l1)"><span>${r.branch}</span><span class="mono">${n(r.n)} taps & scans</span></div>`)}</div>` : ''}
    <p class="hint">“Opened Google review” counts people who reached the review page; Google doesn’t say who posted. Made with tapfour · ${b.name}.</p>
  </div>`;
}
