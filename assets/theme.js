(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TF = window.TF || { products: {}, img: {}, sale: {} };
  const peso = n => Number(n).toLocaleString('en-PH', { style: 'currency', currency: TF.currency || 'PHP', currencyDisplay: 'narrowSymbol', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (id, color, size) => `<svg width="${size}" height="${size}" style="fill:#${color}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const leaf = (size, color) => `<span class="tf-mark" style="font-size:${size}px${color ? ';--leaf:' + color : ''}" aria-hidden="true"></span>`;

  /* ---------- countdown ---------- */
  function countdown() {
    const now = Date.now(), end = TF.sale.end && Date.parse(TF.sale.end);
    if (!Number.isFinite(end)) return '';
    if (end <= now) return 'Offer ended';
    const left = Math.max(0, end - now), p = n => String(n).padStart(2, '0');
    return `${Math.floor(left / 864e5)}d ${p(Math.floor(left / 36e5) % 24)}:${p(Math.floor(left / 6e4) % 60)}:${p(Math.floor(left / 1e3) % 60)}`;
  }
  const tick = () => { const t = countdown(); $$('[data-countdown]').forEach(el => { el.textContent = t; el.hidden = !t; }); };
  tick(); setInterval(tick, 1000);

  /* ---------- catalog (Shopify prices win; constants are fallbacks until products exist) ---------- */
  const variant = (handle, title) => {
    const p = handle && TF.products[handle];
    return p ? (title ? p.variants.find(v => v.title === title) : p.variants[0]) || null : null;
  };
  const priceOf = it => { const v = variant(it.handle, it.variant); return v ? v.price / 100 : it.price; };
  const wasOf = it => { const v = variant(it.handle, it.variant); return v ? (v.compare > v.price ? v.compare / 100 : 0) : it.was || 0; };

  // Hardware: the TAP4.1 L-Stand (finish = Shopify variant, face = what's printed, no business branding).
  const FINISHES = [{ id: 'black', name: 'Glossy Black', sw: '#0a0a0b' }, { id: 'white', name: 'Glossy White', sw: '#f4f3ef' }];
  const standItem = fin => { const f = FINISHES.find(x => x.id === fin) || FINISHES[0]; return { id: 'stand', handle: 'tap4-l-stand', variant: f.name, name: 'TAP4.1 L-Stand · ' + f.name, price: 899, was: 1499 }; };
  const HW_MENU = { handle: 'printed-qr-menu', name: 'Printed QR menu', price: 499, was: 829 };
  const LINKS = { handle: 'multi-link-page', name: '4-in-1 links page', price: 350, was: 579 };
  const DESIGNS = [
    { id: 'review', name: 'Google Review', short: 'Review', head: 'Leave us a review', desc: 'One tap to your Google review box.' },
    { id: 'menu', name: 'Review + QR menu', short: 'Review + Menu', head: 'Review or menu', desc: 'Tap to review, scan for your menu.', add: HW_MENU, badge: 'RECOMMENDED' },
    { id: 'links', name: 'Socials 4-in-1', short: '4-in-1', head: 'Connect with us', desc: 'Google, FB, IG & TikTok in one tap.', add: LINKS }
  ];
  const designOf = () => S.dest === 'links' ? 'links' : S.hw.menu ? 'menu' : 'review';
  const PL = [['google', 'Google', '4285F4'], ['facebook', 'Facebook', '0866FF'], ['instagram', 'Instagram', 'FF0069'], ['tiktok', 'TikTok', '000000']];
  // Every plan includes the first four; table ordering is the one add-on, priced by quote (tables & volume).
  const FEATS = [
    { id: 'reviews', name: 'Tap for reviews', desc: 'Review, follow, like, watch.', points: ['Google, Facebook, Instagram, TikTok', 'Swap links anytime — no reprint'] },
    { id: 'menu', name: 'Live QR menu', desc: 'Edit prices. Hide sold-out.', points: ['Change prices & photos from your phone', 'See which dishes get viewed most'] },
    { id: 'crm', name: 'Dashboard', desc: 'Taps, guests, bills and stock in one view.', points: ['Guests in now, average stay, returning guests', 'Billing & inventory trackers'] },
    { id: 'wifi', name: 'Tap-to-join Wi-Fi', desc: '1 or 2 hours per guest.', points: ['No password to type', 'Time-limited access per guest'] },
    { id: 'order', name: 'Order from the table', desc: 'Guests order on their phone. It pops up on your counter tablet, then goes to the kitchen.', quote: true, points: ['Table number on every order', 'Call staff & bill please too'] }
  ];
  const PLANS = [{ id: 'solo', name: 'Solo', price: 299 }, { id: 'business', name: 'Business', price: 799 }, { id: 'empire', name: 'Empire', price: 1999 }];
  // Packages: Review + Menu stands paid once, plus that plan's app monthly (03 · Dashboard & plans).
  const PKG_FEATS = { solo: 'live QR menu editor, dashboard, billing & inventory trackers, Wi-Fi', business: 'everything in Solo for up to 5 branches, review alerts, monthly report', empire: 'everything in Business for up to 20 branches, staff tracker, dedicated manager' };
  const PLAN_TAGS = { solo: '1 LOCATION', business: 'UP TO 5 BRANCHES', empire: 'UP TO 20 BRANCHES' };
  const PKGS = { solo: { stands: 5, price: 3000 }, business: { stands: 20, price: 12000 }, empire: { stands: 80, price: 40000 } };
  const pkgItem = id => { const p = PLANS.find(x => x.id === id); return { id: 'pkg', handle: 'tapfour-package', variant: p.name, name: `${p.name} package · ${PKGS[id].stands} Review + Menu stands`, price: PKGS[id].price }; };
  const planItem = (p, yearly) => ({ handle: 'tapfour-app', variant: `${p.name} / ${yearly ? 'Yearly' : 'Monthly'}`, name: `${p.name} plan`, price: yearly ? p.price * 0.8 * 12 : p.price });
  const planPrice = p => Math.round(priceOf(planItem(p, S.yearly)) / (S.yearly ? 12 : 1)); // per month, for display
  const SVCS = $$('[data-svc]').map(el => ({ id: el.dataset.svc, name: el.dataset.name, price: +el.dataset.price, monthly: 'monthly' in el.dataset, vid: +el.dataset.variant, sp: +el.dataset.sp || null, available: !el.disabled }));

  const S = {
    finish: 'black', qty: 1, dest: 'google', hw: { menu: true }, pkg: null, tableOrder: false, plan: 'solo', locIdx: 0, yearly: false,
    wifiH: 1, svcs: {}, links: {}, menuHow: 0, pv: 0, heroAfter: true, error: '', ordering: false
  };
  const set = o => { Object.assign(S, { error: '' }, o); render(); };

  function derive() {
    const pkg = S.pkg, isApp = !!pkg; // the app comes with a package (03 · Dashboard & plans)
    const prod = pkg ? pkgItem(pkg) : standItem(S.finish), units = pkg ? 1 : S.qty;
    const design = pkg ? 'menu' : designOf();
    const plan = PLANS.find(p => p.id === (pkg || S.plan)) || PLANS[0];
    const activeSvcs = SVCS.filter(v => S.svcs[v.id]);
    const activePl = design === 'links' ? PL : PL.filter(p => p[0] === 'google');
    const linkFee = !pkg && design === 'links' ? priceOf(LINKS) : 0;
    const hwMenuFee = !pkg && design === 'menu' ? priceOf(HW_MENU) : 0;
    const menuOn = !!pkg || !!hwMenuFee;
    const oneTime = priceOf(prod) * units + linkFee + hwMenuFee + activeSvcs.filter(v => !v.monthly).reduce((a, v) => a + v.price, 0);
    const yearly = isApp && S.yearly ? priceOf(planItem(plan, true)) : 0;
    const monthly = (isApp && !S.yearly ? priceOf(planItem(plan, false)) : 0) + activeSvcs.filter(v => v.monthly).reduce((a, v) => a + v.price, 0);
    const dueNow = oneTime + yearly + monthly;
    const saved = (wasOf(prod) ? (wasOf(prod) - priceOf(prod)) * units : 0) + (hwMenuFee && wasOf(HW_MENU) ? wasOf(HW_MENU) - hwMenuFee : 0) + (linkFee && wasOf(LINKS) ? wasOf(LINKS) - linkFee : 0);
    const destUrl = design === 'links' ? '4-in-1 page · ' + activePl.map(p => p[1]).join(', ') : design === 'menu' ? 'Google review (tap) · Menu (scan)' : 'Your Google review box';
    const summary = [
      units + ' × ' + prod.name + (pkg ? ' · ' + FINISHES.find(x => x.id === S.finish).name : ''),
      DESIGNS.find(x => x.id === design).name + ' design' + (design === 'links' ? ' (' + activePl.map(p => p[1]).join(', ') + ')' : ''),
      isApp ? 'tapfour app · ' + plan.name + ' plan' + (S.yearly ? ' (yearly)' : '') : null, isApp && S.tableOrder ? 'Table ordering (quote)' : null, ...activeSvcs.map(v => v.name)
    ].filter(Boolean).join(' · ');
    const catalogItems = [prod, ...(hwMenuFee ? [HW_MENU] : []), ...(linkFee ? [LINKS] : []), ...(isApp ? [planItem(plan, S.yearly)] : [])];
    const demoPrices = catalogItems.some(it => !variant(it.handle, it.variant));
    return { pkg, units, isApp, design, prod, plan, activeSvcs, activePl, linkFee, hwMenuFee, menuOn, oneTime, monthly, yearly, dueNow, demoPrices, saved, destUrl, summary };
  }

  /* ---------- 01 · build your setup: stand picked in the hero, finish + qty, links, guest preview ---------- */
  const QR = (() => {
    let seed = 7, d = '';
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
      const finder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (!finder && rnd() > .5) d += `M${x} ${y}h1v1h-1z`;
    }
    const eye = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    return `<svg viewBox="0 0 21 21" shape-rendering="crispEdges" aria-hidden="true"><rect width="21" height="21" fill="#fff"/><g fill="#0a0a0b"><path d="${d}"/>${eye(0, 0)}${eye(14, 0)}${eye(0, 14)}</g></svg>`;
  })();
  const shotFor = (d, design = d.design, finish = S.finish) => ({ src: TF.img[`l-${finish}-${design}`] });
  // Customers paste their Google Maps link; tapfour staff turn it into the review link in the admin.
  const isGoogleLink = url => /(^|\.)(google\.[a-z.]+|goo\.gl|g\.page|g\.co|share\.google)$/.test(url.hostname);
  const googleOk = v => { try { const u = new URL(String(v || '').trim()); return /^https?:$/.test(u.protocol) && isGoogleLink(u); } catch (_) { return false; } };
  const MENU_HOW = ['Send a photo', 'Upload PDF', 'Paste a link', 'Send it later'];
  // Price of one stand with a face (stand + printed menu / links page), for the hero and the face pills.
  const faceCost = id => {
    const parts = [standItem(S.finish), ...(id === 'menu' ? [HW_MENU] : id === 'links' ? [LINKS] : [])];
    return { now: parts.reduce((a, x) => a + priceOf(x), 0), was: parts.reduce((a, x) => a + (wasOf(x) || priceOf(x)), 0) };
  };
  const FACE_PILLS = [['review', 'Review'], ['menu', 'Review + Menu'], ['links', '4-in-1']];
  function renderBuilder(d) {
    const fin = FINISHES.find(x => x.id === S.finish), finShort = fin.name.replace('Glossy ', ''), img = shotFor(d).src;
    const faceName = DESIGNS.find(x => x.id === d.design).short;
    $('#tf-stand').innerHTML = d.pkg
      ? `<span class="bl-thumb"><img src="${img}" alt=""></span><span class="bl-stand__t"><small>YOUR PACKAGE · PICKED IN PLANS</small><b>${d.plan.name} package · ${PKGS[d.pkg].stands} Review + Menu stands</b></span><button type="button" class="bl-link" data-act="pkgClear">Pick one stand instead</button>`
      : `<span class="bl-thumb bl-d"><img src="${img}" alt=""></span><span class="bl-stand__t bl-d"><small>YOUR STAND · PICKED ABOVE</small><b>${faceName} · ${fin.name}</b></span>
        <div class="bl-seg bl-seg--faces" role="group" aria-label="Stand face">${FACE_PILLS.map(([id, l]) => `<button type="button" class="${d.design === id ? 'on' : ''}" data-act="design" data-arg="${id}" aria-pressed="${d.design === id}">${l}</button>`).join('')}</div>`;
    $('#tf-finish').innerHTML = FINISHES.map(f => `<button type="button" class="${S.finish === f.id ? 'on' : ''}" data-act="finish" data-arg="${f.id}" aria-pressed="${S.finish === f.id}"><span class="bl-d">${f.name}</span><span class="bl-m">${f.name.replace('Glossy ', '')}</span></button>`).join('');
    $('#tf-qty-wrap').hidden = !!d.pkg;
    $('#tf-qty').textContent = S.qty;
    const link = (S.links.google || '').trim(), ok = googleOk(link), state = !link ? '' : ok ? 'ok' : 'bad';
    $('#tf-url-google').className = state;
    const msg = $('#tf-link-msg');
    msg.className = 'bl-msg ' + state;
    msg.textContent = !link ? 'Open your shop in Google Maps → Share → Copy link. Paste it here.' : ok ? '✓ Found it. Your review link will be ready before we ship.' : 'That doesn’t look like a Google Maps link yet.';
    $('#tf-menu-how').hidden = !d.menuOn;
    $('#tf-menu-how .bl-opts').innerHTML = MENU_HOW.map((l, i) => `<button type="button" class="${S.menuHow === i ? 'on' : ''}" data-act="menuHow" data-arg="${i}" aria-pressed="${S.menuHow === i}">${l}</button>`).join('');
    $('#tf-socials').hidden = d.design !== 'links';
    const what = d.pkg ? `${d.plan.name} package · ${PKGS[d.pkg].stands} stands` : `${S.qty} × ${faceName}`;
    $('#tf-summary').innerHTML = `<span class="bl-ready__t"><small>READY TO PROGRAM</small><b>${what} · ${finShort} · ${ok ? 'Google link found' : 'links pending'}</b>${d.monthly || d.yearly ? `<small class="bl-ready__mo">+ ${d.yearly ? peso(d.yearly) + '/yr' : peso(d.monthly) + '/mo'} app${S.tableOrder ? ' · table ordering quote' : ''}</small>` : ''}</span>
      <b class="bl-ready__p">${peso(d.oneTime)}</b>
      <button type="button" class="btn btn--dark" data-act="order"${S.ordering || d.demoPrices ? ' disabled' : ''}>${S.ordering ? 'Adding to cart…' : d.demoPrices ? 'Ordering unavailable' : 'Checkout →'}</button>
      ${d.demoPrices ? '<div class="summary__err">Sample prices shown. Ordering is unavailable until these products are configured.</div>' : ''}
      ${S.error ? `<div class="summary__err" role="alert">${esc(S.error)}</div>` : ''}`;
    // What a guest sees on their phone
    const tabs = d.design === 'menu' ? ['Tap: review', 'Scan: menu'] : d.design === 'review' ? ['Tap: review'] : ['Tap: your page'];
    const pv = Math.min(S.pv, tabs.length - 1), mode = d.design === 'links' ? 'links' : d.design === 'menu' && pv === 1 ? 'menu' : 'review';
    const shop = esc(CO.info.business.trim() || 'Your shop');
    const body = mode === 'review'
      ? `<small>GOOGLE · WRITE A REVIEW</small><b>${shop}</b><span class="bl-ph__stars">★★★★★</span><span class="bl-ph__box">Share details of your own experience at this place</span><span class="bl-ph__post">Post</span>`
      : mode === 'menu'
        ? `<small>SCANNED · YOUR MENU</small><b>${shop}</b>${[['Sagada Latte', '₱165'], ['Ensaymada', '₱95'], ['Ube Cold Brew', '₱190'], ['Pour-over', '₱180']].map(([n, p]) => `<span class="bl-ph__mi"><b>${n}</b><em>${p}</em></span>`).join('')}`
        : `<small>TAPPED · YOUR PAGE</small><b>${shop}</b>${[['Leave a Google review', '#1a73e8'], ['Like us on Facebook', '#0866ff'], ['Follow on Instagram', '#0a0a0b'], ['Watch on TikTok', '#0a0a0b']].map(([l, c]) => `<span class="bl-ph__btn" style="background:${c}">${l}</span>`).join('')}`;
    $('#tf-preview').innerHTML = `<small class="bl-pv__l">WHAT A GUEST SEES AFTER A ${mode === 'menu' ? 'SCAN' : 'TAP'}</small>
      <div class="bl-ph"><div class="bl-ph__s bl-ph__s--${mode}">${body}<span class="bl-ph__by">POWERED BY ${leaf(12)}<b>tapfour</b></span></div></div>
      ${tabs.length > 1 ? `<div class="bl-pv__tabs">${tabs.map((l, i) => `<button type="button" class="${pv === i ? 'on' : ''}" data-act="pv" data-arg="${i}" aria-pressed="${pv === i}">${l}</button>`).join('')}</div>` : ''}`;
    $('#tf-bar-lbl').textContent = `${what} · ${finShort}`.toUpperCase();
    $('#tf-bar-total').textContent = peso(d.oneTime) + (d.monthly ? ' + ' + peso(d.monthly) + '/mo' : '');
  }

  /* ---------- plans + services (other homepage sections share the same state) ---------- */
  // 03 · Dashboard & plans: the location slider picks the package and which sample dashboard shows.
  const STOPS = [1, 2, 3, 4, 5, 8, 12, 16, 20];
  const planAt = i => i === 0 ? 'solo' : i <= 4 ? 'business' : 'empire';
  const FIRST_STOP = { solo: 0, business: 1, empire: 5 };
  // Sample data for the demos (not wired to real accounts).
  const DMENU = [['Pork belly refill', 'Unli set', 0], ['Beef bulgogi', '200 g', 180], ['Kimchi fried rice', 'Good for 2', 120], ['Cheese corn', 'Side', 90], ['Iced tea pitcher', '1 L', 150]];
  const BRANCHES = [['Main branch', 3, 1284, 486], ['Katipunan', 2, 962, 351], ['BGC', 4, 1540, 602], ['Ortigas', 2, 740, 268], ['Cebu IT Park', 1, 610, 199]];
  const EMP = [
    ['Billing', ['BILL', 'BRANCH', 'DUE', 'STATUS'], [['Meat supplier', 'Main branch', '28 Sep', 'DUE'], ['Electricity', 'Katipunan', '30 Sep', 'DUE'], ['Rent', 'BGC', '01 Oct', 'PAID'], ['Water', 'Ortigas', '02 Oct', 'PAID'], ['LPG refill', 'Cebu IT Park', '03 Oct', 'PAID']]],
    ['Inventory', ['ITEM', 'BRANCH', 'LEFT', 'STATUS'], [['Pork belly', 'Main branch', '4 kg', 'LOW'], ['Charcoal', 'BGC', '3 bags', 'LOW'], ['Rice', 'Katipunan', '2 sacks', 'LOW'], ['Beef', 'Ortigas', '11 kg', 'OK'], ['Iced tea mix', 'Cebu IT Park', '6 packs', 'OK']]],
    ['Staff', ['NAME', 'BRANCH', 'SHIFT', 'STATUS'], [['Ana R.', 'Main branch', '10am–7pm', 'ON SHIFT'], ['Jomar D.', 'BGC', '11am–8pm', 'ON SHIFT'], ['Liza P.', 'Katipunan', '4pm–12am', 'LATER'], ['Paolo S.', 'Ortigas', '10am–7pm', 'ON SHIFT'], ['Mika T.', 'Cebu IT Park', 'Day off', 'OFF']]]
  ];
  const QGROUPS = [['TABLES', ['1–10', '11–25', '26–50', '50+']], ['WHAT YOU SERVE', ['Café', 'Restaurant', 'Samgyupsal / unli', 'Bar']], ['HOW BUSY', ['Quiet', 'Steady', 'Packed']]];
  const TST = { '-1': ['FREE', 'free'], 0: ['NEW ORDER', 'new'], 1: ['IN KITCHEN', 'kit'], 2: ['SERVED', 'srv'], 3: ['BILL PLEASE', 'bill'] };
  const DP = {
    eTab: 1, oView: false, oSel: 3, mTab: 0, more: false, sheet: false, toast: '', qty: [0, 0, 0, 0, 0], quote: [1, 2, 2],
    tables: [
      { g: 4, t: '52m', items: [[0, 3], [2, 1], [4, 1]], st: 2 }, { g: 2, t: '18m', items: [[0, 2]], st: 1 }, { st: -1, items: [] },
      { g: 3, t: '38m', items: [[1, 1], [3, 1]], st: 0 }, { g: 6, t: '1h 10m', items: [[0, 6], [1, 2], [4, 2]], st: 3 }, { st: -1, items: [] },
      { g: 2, t: '9m', items: [[4, 1], [3, 1]], st: 0 }, { g: 4, t: '25m', items: [[0, 4], [1, 2]], st: 1 }, { st: -1, items: [] },
      { g: 2, t: '44m', items: [[2, 2]], st: 2 }, { st: -1, items: [] }, { g: 5, t: '31m', items: [[0, 5], [4, 2]], st: 1 }
    ],
    tickets: [
      { id: 2, table: 'Table 7', items: 'Iced tea pitcher ×1, Cheese corn ×1', order: true, st: 0 },
      { id: 1, table: 'Table 2', items: 'Pork belly refill ×2', order: true, st: 1 },
      { id: 0, table: 'Table 9', items: 'Bill please', order: false, st: 1 }
    ]
  };
  const tkLabel = t => (t.order ? ['NEW', 'IN KITCHEN', 'SERVED'] : ['NEW', 'ON THE WAY', 'DONE'])[Math.min(t.st, 2)];
  const tkCls = t => t.st === 0 ? 'new' : t.st >= 2 ? 'done' : 'kit';

  function viewDash(id, n) {
    const tbl = (cls, head, rows) => `<div class="dp-tbl ${cls}"><div class="dp-tbl__h">${head.map(h => `<span>${h}</span>`).join('')}</div>${rows.join('')}</div>`;
    if (S.tableOrder && DP.oView) {
      const sel = DP.tables[DP.oSel], [slabel, scls] = TST[sel.st], count = t => t.items.reduce((a, r) => a + r[1], 0);
      const acts = { 0: 'Accept · send to kitchen', 1: 'Mark served', 3: 'Bill sent · clear table' };
      const stats = [['NEW ORDERS', DP.tables.filter(t => t.st === 0).length, 1], ['IN KITCHEN', DP.tables.filter(t => t.st === 1).length], ['TABLES SEATED', DP.tables.filter(t => t.st !== -1).length + '/12']];
      return `<div class="dp-stats dp-stats--row">${stats.map(([l, v, hi]) => `<div${hi ? ' class="hi"' : ''}><small>${l}</small><b>${v}</b></div>`).join('')}</div>
        <div class="dp-floor">
          <div class="dp-floor__map"><div class="dp-floor__h"><span>FLOOR · TAP A TABLE</span><span>MAIN FLOOR · 12 TABLES</span></div>
            <div class="dp-tiles">${DP.tables.map((t, i) => { const [l, c] = TST[t.st]; return `<button type="button" class="dp-tile dp-tile--${c}${DP.oSel === i ? ' sel' : ''}" data-dp-table="${i}" aria-pressed="${DP.oSel === i}"><span><b>T${i + 1}</b><em>${t.st === -1 ? '' : t.t}</em></span><span><small>${l}</small><i>${t.st === -1 ? 'Open' : t.g + ' guests · ' + count(t) + ' items'}</i></span></button>`; }).join('')}</div>
            <div class="dp-recent"><small>RECENT FROM TABLES</small>${DP.tickets.map(t => `<div><b>${esc(t.table.replace('Table ', 'T'))}</b><span>${esc(t.items)}</span><em class="dp-pill dp-pill--${tkCls(t)}">${tkLabel(t)}</em></div>`).join('')}</div>
            <div class="dp-legend"><span><i class="new"></i>New order</span><span><i class="kit"></i>In kitchen</span><span><i class="bill"></i>Bill please</span><span><i class="srv"></i>Served</span><span><i class="free"></i>Free</span></div>
          </div>
          <div class="dp-det"><div class="dp-det__h"><span><b>Table ${DP.oSel + 1}</b><small>${sel.st === -1 ? 'Free' : sel.g + ' guests · seated ' + sel.t}</small></span><em class="dp-pill dp-pill--${scls}">${slabel}</em></div>
            ${sel.st === -1 ? '<p class="dp-det__free">No one seated yet. When guests scan this table’s QR and send an order, it shows up here and on your server’s phone.</p>' : `
            <div class="dp-det__items">${sel.items.map(([i, q]) => `<div><span>${DMENU[i][0]}</span><em>×${q}</em><b>${DMENU[i][2] ? peso(DMENU[i][2] * q) : 'Unli'}</b></div>`).join('')}
              <div class="dp-det__tot"><b>Total so far</b><b>${peso(sel.items.reduce((a, [i, q]) => a + DMENU[i][2] * q, 0))}</b></div></div>
            <div class="dp-det__steps"><small>WHERE IT IS</small><div>${['Sent', 'In kitchen', 'Served', 'Bill'].map((l, i) => `<span class="${sel.st === 3 || (sel.st >= i && i < 3) ? 'on' : ''}"><i></i>${l}</span>`).join('')}</div></div>
            ${acts[sel.st] ? `<button type="button" class="dp-det__act" data-dp-tact>${acts[sel.st]}</button>` : ''}${sel.st === 2 ? '<button type="button" class="dp-det__clear" data-dp-tclear>Clear table</button>' : ''}`}
          </div>
        </div>`;
    }
    if (id === 'solo') {
      const stands = [['Counter', '2 min ago'], ['Table 1', '6 min ago'], ['Table 2', '9 min ago'], ['Table 3', '24 min ago'], ['Table 4', '1 h ago']];
      const links = [['Google review', 'g.page/r/your-shop/review'], ['Menu', 'tap4.ph/m/your-shop'], ['Facebook', 'facebook.com/yourshop'], ['Instagram', 'instagram.com/yourshop'], ['TikTok', 'tiktok.com/@yourshop']];
      return tbl('dp-tbl--stands', ['STAND', 'WHERE', 'LAST TAP', 'STATUS'], stands.map(([w, t]) => `<div class="dp-tbl__r"><b>Review + Menu</b><span>${w}</span><span class="mono">${t}</span><span class="dp-ok"><i></i>Online</span></div>`)) + `
        <div class="dp-2"><div class="dp-box"><small>MY LINKS</small>${links.map(([k, u]) => `<div class="dp-link"><b>${k}</b><span>${u}</span><em>Edit</em></div>`).join('')}</div>
          <div class="dp-box"><small>THIS MONTH</small>${[['Taps', '1,284', 1], ['QR scans', '612'], ['Menu opens', '903'], ['Wi-Fi guests', '318']].map(([l, v, hi]) => `<div class="dp-kv"><span>${l}</span><b${hi ? ' class="lime"' : ''}>${v}</b></div>`).join('')}<p>Guests counted from Wi-Fi joins. Taps and QR scans counted separately.</p></div></div>`;
    }
    if (id === 'business') {
      const br = BRANCHES.slice(0, Math.min(n, 5)), max = Math.max(...br.map(b => b[2])), sum = k => br.reduce((a, b) => a + b[k], 0);
      return `<div class="chips-row"><span class="dp-chip dp-chip--hi">Monthly report · September PDF ↓</span><span class="dp-chip">Review alerts · on</span></div>` +
        tbl('dp-tbl--br', ['BRANCH', 'STANDS', 'TAPS · 30D', 'OPENED REVIEW'], [...br.map(b => `<div class="dp-tbl__r" data-br><b>${b[0]}</b><span class="mono">${b[1]}</span><span class="dp-meter"><span><i style="width:${Math.round(b[2] / 1540 * 100)}%"${b[2] === max ? ' class="hi"' : ''}></i></span><em>${b[2].toLocaleString('en-US')}</em></span><span class="mono">${b[3]}</span></div>`),
          `<div class="dp-tbl__r dp-tbl__tot"><b>All branches</b><span class="mono">${sum(1)}</span><span class="mono dp-tbl__tt" data-tot-t>${sum(2).toLocaleString('en-US')}</span><span class="mono">${sum(3)}</span></div>`]);
    }
    const [, head, rows] = EMP[DP.eTab], hot = v => ['DUE', 'LOW', 'ON SHIFT'].includes(v);
    const stats = [['BILLS DUE THIS WEEK', '2', '₱48,200 total'], ['LOW STOCK', '3', 'Across ' + n + ' branches'], ['STAFF ON SHIFT', String(n * 4 + 2), 'Right now']];
    return `<div class="dp-stats">${stats.map(([l, v, sub], i) => `<div${i === DP.eTab ? ' class="hi"' : ''}><small>${l}</small><b>${v}</b><span>${sub}</span></div>`).join('')}</div>
      <div class="seg seg--sm dp-etabs">${EMP.map(([l], i) => `<button type="button" class="${DP.eTab === i ? 'on' : ''}" data-dp-etab="${i}" aria-pressed="${DP.eTab === i}">${l} tracker</button>`).join('')}</div>` +
      tbl('dp-tbl--emp', head, rows.map(([a, b, c, st]) => `<div class="dp-tbl__r"><b>${a}</b><span>${b}</span><span class="mono">${c}</span><em class="dp-pill dp-pill--${hot(st) ? 'new' : 'srv'}">${st}</em></div>`));
  }

  function renderTableOrdering(sec) {
    const cart = DMENU.map((m, i) => ({ n: m[0], p: m[2], i, q: DP.qty[i] })).filter(m => m.q), count = cart.reduce((a, m) => a + m.q, 0), sum = cart.reduce((a, m) => a + m.q * m.p, 0);
    $('[data-to-guest]', sec).innerHTML = `<div class="dp-g__h"><span><b>Table 4</b><small>YOUR SHOP · MENU</small></span><em>OPEN</em></div>
      <div class="dp-g__menu">${DMENU.map(([n, sub, p], i) => `<div class="dp-g__mi"><span><b>${n}</b><small>${sub}</small></span><em>${p ? peso(p) : 'Unli'}</em><span class="dp-g__q">${DP.qty[i] ? `<button type="button" data-to-qty="${i}" data-d="-1" aria-label="Remove one ${n}">−</button><b>${DP.qty[i]}</b>` : ''}<button type="button" class="add" data-to-qty="${i}" data-d="1" aria-label="Add one ${n}">+</button></span></div>`).join('')}</div>
      <div class="dp-g__foot"><div class="dp-g__quick"><button type="button" data-to-quick="refill">Refill</button><button type="button" data-to-quick="call">Call server</button><button type="button" data-to-quick="bill">Bill please</button></div>
        <button type="button" class="dp-g__send${count ? ' on' : ''}" data-to-send${count ? '' : ' disabled'}><span>Send to server</span><span>${count ? count + ' item' + (count > 1 ? 's' : '') + (sum ? ' · ' + peso(sum) : '') : 'Add items'}</span></button></div>
      ${DP.toast ? `<div class="dp-g__toast" role="status"><b>✓</b>${esc(DP.toast)}</div>` : ''}`;
    $('[data-to-server]', sec).innerHTML = `<div class="dp-s__h"><span><b>Orders</b><small>SERVER · FLOOR 1</small></span><em>${DP.tickets.filter(t => t.st === 0).length} NEW</em></div>
      <div class="dp-s__list">${DP.tickets.map(t => `<div class="dp-tk dp-tk--${tkCls(t)}"><div><b>${esc(t.table)}</b><em class="dp-pill dp-pill--${tkCls(t)}">${tkLabel(t)}</em></div><span>${esc(t.items)}</span>${t.st < 2 ? `<button type="button" data-to-tk="${t.id}">${(t.order ? ['Accept · send to kitchen', 'Mark served'] : ['On my way', 'Done'])[t.st]}</button>` : ''}</div>`).join('')}</div>`;
    $('[data-to-groups]', sec).innerHTML = QGROUPS.map(([label, opts], g) => `<div class="dp-qg"><small>${label}</small><div>${opts.map((o, i) => `<button type="button" class="${DP.quote[g] === i ? 'on' : ''}" data-to-q="${g}:${i}" aria-pressed="${DP.quote[g] === i}">${o}</button>`).join('')}</div></div>`).join('');
    $('[data-to-place]', sec).textContent = quoteLine() + ' We’ll message you a monthly price.';
  }
  const quoteLine = () => { const [t, k, b] = QGROUPS.map(([, opts], g) => opts[DP.quote[g]]); return `${t} tables · ${k} · ${b}.`; };

  // Phones (section 03 mobile): plan buttons + stepper, a chip-row dashboard, the floor grid with a bottom sheet.
  const MBR = [['Main branch', 1284], ['Katipunan', 962], ['BGC', 1540], ['Ortigas', 740], ['Cebu IT Park', 610], ['Alabang', 820], ['Makati', 1105], ['Pasig', 690]];
  const MBILL = [['Bean supplier', 'Main branch', 'Due 28 Sep', 'DUE'], ['Electricity', 'Katipunan', 'Due 30 Sep', 'DUE'], ['Rent', 'BGC', 'Paid 01 Oct', 'PAID'], ['Water', 'Ortigas', 'Paid 02 Oct', 'PAID'], ['Pastry supplier', 'Cebu IT Park', 'Paid 03 Oct', 'PAID']];
  const MINV = [['Oat milk', 'Main branch', '3 L left', 'LOW'], ['Coffee beans', 'BGC', '2 kg left', 'LOW'], ['Cups · 12 oz', 'Katipunan', '80 pcs left', 'LOW'], ['Ube syrup', 'Ortigas', '4 btl left', 'OK'], ['Ensaymada dough', 'Cebu IT Park', '6 trays left', 'OK']];
  const MSTAFF = [['Ana R.', 'Main branch', '10am–7pm', 'ON SHIFT'], ['Jomar D.', 'BGC', '11am–8pm', 'ON SHIFT'], ['Liza P.', 'Katipunan', '4pm–12am', 'LATER'], ['Paolo S.', 'Ortigas', '10am–7pm', 'ON SHIFT'], ['Mika T.', 'Cebu IT Park', 'Day off', 'OFF']];
  const MTABS = { solo: ['My stands', 'Billing', 'Inventory'], business: ['Branches', 'Billing', 'Inventory'], empire: ['Billing', 'Inventory', 'Staff'] };
  const MNOTE = { solo: 'Solo includes the billing and inventory trackers. Pick Empire above to see the staff tracker.', business: 'Business adds a branch view, review alerts and a monthly PDF report.', empire: 'Empire tracks bills, stock and staff across up to 20 branches.' };
  function renderPlansMobile(sec, id, n) {
    const plan = PLANS.find(p => p.id === id), stops = STOPS.map((v, i) => [v, i]).filter(([, i]) => planAt(i) === id);
    $$('[data-dp-plan]', sec).forEach(b => { const o = b.dataset.dpPlan === id; b.classList.toggle('on', o); b.setAttribute('aria-pressed', o); });
    $('[data-dp-mn]', sec).textContent = n + (n === 1 ? ' location' : ' branches');
    $('[data-dp-mstep]', sec).classList.toggle('off', stops.length < 2);
    $$('.dp-plan', sec).forEach(el => {
      el.classList.toggle('more', DP.more);
      const more = $('[data-dp-more]', el);
      if (more) more.textContent = DP.more ? 'Show less' : `See all ${more.dataset.count} included`;
    });
    // chip-row dashboard
    const tab = MTABS[id][Math.min(DP.mTab, 2)], row = (a, sub, st, bar) => `<div class="dp-mrow"><span><b>${a}</b><small>${sub}</small></span>${bar ? `<span class="dp-mbarv"><i style="width:${bar}%"></i></span>` : ''}<em class="dp-pill dp-pill--${['DUE', 'LOW', 'ON SHIFT', 'ONLINE', 'TOP'].includes(st) ? 'new' : 'srv'}">${st}</em></div>`;
    const br = MBR.slice(0, Math.min(n, 8)), few = id === 'solo';
    const rows = {
      'My stands': [['Counter', '2 min ago'], ['Table 1', '6 min ago'], ['Table 2', '9 min ago'], ['Table 3', '24 min ago'], ['Table 4', '1 h ago']].map(([w, t]) => row('Review + Menu · ' + w, 'Last tap ' + t, 'ONLINE')),
      Branches: br.map(([b, t], i) => row(b, t.toLocaleString('en-US') + ' taps · 30 days', i === 2 ? 'TOP' : 'OK', Math.round(t / 1540 * 100))),
      Billing: MBILL.slice(0, few ? 3 : 5).map(([a, b, c, st]) => row(a, few ? c : b + ' · ' + c, st)),
      Inventory: MINV.slice(0, few ? 3 : 5).map(([a, b, c, st]) => row(a, few ? c : b + ' · ' + c, st)),
      Staff: MSTAFF.map(([a, b, c, st]) => row(a, b + ' · ' + c, st))
    }[tab];
    const stats = { 'My stands': [['TAPS · 30D', '1,284'], ['QR SCANS', '612'], ['WI-FI GUESTS', '318']], Branches: [['BRANCHES', String(n)], ['TAPS · 30D', br.reduce((a, b) => a + b[1], 0).toLocaleString('en-US')], ['REPORT', 'PDF']], Billing: [['DUE THIS WEEK', '2'], ['TOTAL DUE', '₱48.2k'], ['PAID', '3']], Inventory: [['LOW STOCK', '3'], ['ITEMS', '42'], ['BRANCHES', String(n)]], Staff: [['ON SHIFT', String(n * 4 + 2)], ['LATER', '6'], ['OFF', '4']] }[tab];
    const mstat = list => list.map(([l, v], i) => `<span${i === 0 ? ' class="hi"' : ''}><small>${l}</small><b>${v}</b></span>`).join('');
    $('[data-dp-mtitle]', sec).textContent = `What ${plan.name} shows you`;
    $('[data-dp-mscope]', sec).textContent = id === 'solo' ? 'YOUR SHOP' : n + ' BRANCHES';
    $('[data-dp-mchips]', sec).innerHTML = MTABS[id].map((l, i) => `<button type="button" class="${l === tab ? 'on' : ''}" data-dp-mtab="${i}" aria-pressed="${l === tab}">${l}</button>`).join('');
    $('[data-dp-mstats]', sec).innerHTML = mstat(stats);
    $('[data-dp-mrows]', sec).innerHTML = rows.join('');
    $('[data-dp-mnote]', sec).textContent = MNOTE[id];
    // floor + bottom sheet
    $('[data-dp-fstats]', sec).innerHTML = mstat([['NEW ORDERS', DP.tables.filter(t => t.st === 0).length], ['IN KITCHEN', DP.tables.filter(t => t.st === 1).length], ['SEATED', DP.tables.filter(t => t.st !== -1).length + '/12']]);
    $('[data-dp-ftiles]', sec).innerHTML = DP.tables.map((t, i) => { const [l, c] = TST[t.st]; return `<button type="button" class="dp-tile dp-tile--${c}${DP.sheet && DP.oSel === i ? ' sel' : ''}" data-dp-ftile="${i}"><span><b>T${i + 1}</b><em>${t.st === -1 ? '' : t.t}</em></span><small>${l}</small></button>`; }).join('');
    $('[data-dp-flock]', sec).hidden = S.tableOrder;
    const sheet = $('[data-dp-sheet]', sec), open = S.tableOrder && DP.sheet;
    sheet.hidden = !open;
    if (open) {
      const sel = DP.tables[DP.oSel], [slabel, scls] = TST[sel.st], acts = { 0: 'Accept · send to kitchen', 1: 'Mark served', 3: 'Bill sent · clear table' };
      $('[data-dp-sheet-body]', sec).innerHTML = `<i class="dp-sheet__grab"></i><div class="dp-det__h"><span><b>Table ${DP.oSel + 1}</b><small>${sel.st === -1 ? 'Free' : sel.g + ' guests · seated ' + sel.t}</small></span><em class="dp-pill dp-pill--${scls}">${slabel}</em></div>
        ${sel.st === -1 ? '<p class="dp-det__free">No one seated yet. When guests scan this table’s QR and send an order, it pops up here.</p>' : `
        <div class="dp-det__items">${sel.items.map(([i, q]) => `<div><span>${DMENU[i][0]}</span><em>×${q}</em><b>${DMENU[i][2] ? peso(DMENU[i][2] * q) : 'Unli'}</b></div>`).join('')}<div class="dp-det__tot"><b>Total so far</b><b>${peso(sel.items.reduce((a, [i, q]) => a + DMENU[i][2] * q, 0))}</b></div></div>
        <div class="dp-det__steps"><div>${['Sent', 'Kitchen', 'Served', 'Bill'].map((l, i) => `<span class="${sel.st === 3 || (sel.st >= i && i < 3) ? 'on' : ''}"><i></i>${l}</span>`).join('')}</div></div>
        ${acts[sel.st] ? `<button type="button" class="dp-det__act" data-dp-tact>${acts[sel.st]}</button>` : ''}${sel.st === 2 ? '<button type="button" class="dp-det__clear" data-dp-tclear>Clear table</button>' : ''}`}`;
    }
    // pinned bar
    $('[data-dp-barl]', sec).textContent = plan.name.toUpperCase() + (S.tableOrder ? ' + TABLE ORDERING' : '') + (S.yearly ? ' · YEARLY' : '');
    $('[data-dp-bart]', sec).textContent = `${peso(priceOf(pkgItem(id)))} + ${peso(planPrice(plan))}/mo`;
    const cta = $('[data-dp-barcta]', sec);
    cta.dataset.arg = id;
    cta.textContent = S.pkg === id ? '✓ Chosen' : 'Choose →';
  }

  function renderPlans() {
    $$('[data-act="yearly"]').forEach(b => { const on = (b.dataset.arg === '1') === S.yearly; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const sec = $('[data-plans]');
    if (!sec) return;
    if (planAt(S.locIdx) !== S.plan) S.locIdx = FIRST_STOP[S.plan] || 0;
    const id = S.plan, n = STOPS[S.locIdx];
    const range = $('[data-dp-range]', sec);
    if (range !== document.activeElement) range.value = S.locIdx;
    $('[data-dp-n]', sec).textContent = n;
    $('[data-dp-word]', sec).textContent = n === 1 ? 'location' : 'branches';
    $$('[data-z]', sec).forEach(z => z.classList.toggle('on', +z.dataset.z === ['solo', 'business', 'empire'].indexOf(id)));
    $$('.dp-plan', sec).forEach(el => {
      el.hidden = el.dataset.plan !== id;
      if (el.hidden) return;
      const plan = PLANS.find(p => p.id === id);
      const monthly = plan ? planPrice(plan) : Math.round(+(S.yearly ? el.dataset.y : el.dataset.m));
      $('[data-plan-up]', el).textContent = peso(plan ? priceOf(pkgItem(id)) : +el.dataset.up);
      $('[data-plan-price]', el).textContent = '+ ' + peso(monthly);
      $('[data-plan-billing]', el).textContent = 'MONTHLY · ' + (S.yearly ? 'BILLED YEARLY' : 'BILLED MONTHLY');
      $('[data-plan-total]', el).textContent = peso(monthly) + (S.tableOrder ? ' + from ₱499/mo' : '/mo');
      const add = $('.dp-add', el), btn = $('[data-act="tableOrder"]', el);
      add.classList.toggle('on', S.tableOrder);
      btn.textContent = S.tableOrder ? '✓ Added' : '+ Add';
      btn.setAttribute('aria-pressed', S.tableOrder);
      $('.dp-plan__cta', el).textContent = S.pkg === id ? '✓ In your setup ↑' : 'Choose ' + $('h3', el).textContent + ' →';
    });
    const navs = { solo: ['Overview', 'My stands', 'Menu', 'Billing', 'Inventory', 'Wi-Fi', 'My links', 'Help'], business: ['Overview', 'Branches', 'My links', 'My stands', 'Reports', 'Help'], empire: ['Overview', 'Branches', 'Billing', 'Inventory', 'Staff', 'Help'] };
    const home = { solo: 'My stands', business: 'Branches', empire: EMP[DP.eTab][0] }[id];
    const nav = S.tableOrder ? [...navs[id].slice(0, 2), 'Orders', ...navs[id].slice(2)] : navs[id];
    const ov = S.tableOrder && DP.oView, active = ov ? 'Orders' : home, fresh = DP.tables.filter(t => t.st === 0).length;
    $('[data-dp-nav]', sec).innerHTML = nav.map(l => `<button type="button" class="${l === active ? 'on' : ''}${l === 'Orders' ? ' ord' : ''}" data-dp-nav-item="${l}">${l}${l === 'Orders' && fresh ? `<small>${fresh} NEW</small>` : ''}</button>`).join('');
    $('[data-dp-view]', sec).textContent = active;
    $('[data-dp-scope]', sec).textContent = ov ? 'SAMPLE DATA · LIVE FLOOR' : id === 'solo' ? 'SAMPLE DATA · YOUR SHOP' : `SAMPLE DATA · ${n} BRANCHES`;
    $('[data-dp-body]', sec).innerHTML = viewDash(id, n);
    renderTableOrdering(sec);
    renderPlansMobile(sec, id, n);
  }
  function renderServices() {
    $$('.svc[data-svc]').forEach(el => {
      const on = !!S.svcs[el.dataset.svc];
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', on);
      $('.svc__mark', el).textContent = on ? '✓' : '+';
    });
  }

  /* ---------- 02 · the tapfour app: feature row, price bar, counter tablet + guest phone ---------- */
  const GMENU = [['Sagada Latte', 165, '#c9a27a'], ['Ensaymada', 95, '#e2c48f'], ['Ube Cold Brew', 190, '#7a5aa8'], ['Pour-over', 180, '#8b5e3c']];
  const AX = {
    qty: [2, 1, 0, 0], pop: null, toast: '',
    tix: [
      { id: 4, table: 'Table 5', items: 'Spanish Latte ×1, Ensaymada ×2', order: true, st: 0 },
      { id: 3, table: 'Table 7', items: 'Pour-over ×1', order: true, st: 0, lines: [['Pour-over', '×1']], total: 180 },
      { id: 2, table: 'Table 9', items: 'Bill please', order: false, st: 0 },
      { id: 1, table: 'Table 2', items: 'Tapa bowl ×1, Ube Cold Brew ×1', order: true, st: 1 }
    ]
  };
  const axLabel = t => (t.order ? ['NEW', 'IN KITCHEN', 'SERVED'] : ['NEW', 'ON THE WAY', 'DONE'])[Math.min(t.st, 2)];
  const axShort = t => t.st === 0 ? 'Accept' : t.order ? 'Served' : 'Done';
  const axPill = t => `<em class="dp-pill dp-pill--${t.st === 0 ? 'new' : t.st >= 2 ? 'done' : 'kit'}">${axLabel(t)}</em>`;
  function renderAppSection() {
    const sec = $('[data-app-section]');
    if (!sec) return;
    const on = S.tableOrder, fresh = AX.tix.filter(t => t.st === 0).length;
    const popT = on && AX.tix.find(t => t.id === AX.pop && t.st === 0);
    $('.ax-f--order', sec).classList.toggle('on', on);
    $$('[data-act="tableOrder"]', sec).forEach(b => b.setAttribute('aria-pressed', on));
    $('[data-ax-order-lbl]', sec).textContent = on ? '✓ Added' : '+ Add';
    $('[data-ax-order-big]', sec).textContent = on ? '✓ Added to Solo' : '+ Add table ordering';
    $('.ax-addon', sec).classList.toggle('on', on);
    $$('[data-act="wifiH"]', sec).forEach(b => { const o = +b.dataset.arg === S.wifiH; b.classList.toggle('on', o); b.setAttribute('aria-pressed', o); });
    $('[data-wifi-note]', sec).textContent = `Free for ${S.wifiH} hour${S.wifiH > 1 ? 's' : ''}. No password to type.`;
    $('[data-ax-chips]', sec).innerHTML = ['5 stands', 'Reviews', 'Menu', 'Dashboard', 'Wi-Fi', ...(on ? ['Table ordering'] : [])].map(n => `<em${n === 'Table ordering' ? ' class="hi"' : ''}>${n}</em>`).join('');
    $('[data-ax-total]', sec).textContent = `${peso(priceOf(pkgItem('solo')))} + ${peso(planPrice(PLANS[0]))}/mo`;
    const note = $('[data-ax-note]', sec);
    note.textContent = on ? '+ TABLE ORDERING FROM ₱499/MO' : 'PACKAGE ONCE · APP MONTHLY';
    note.classList.toggle('lime', on);
    // Owner's counter tablet
    const pop = popT ? `<div class="ax-pop"><div class="ax-pop__c"><div class="ax-pop__h"><span><i></i>${popT.order ? 'NEW ORDER' : 'REQUEST'}</span><small>JUST NOW</small></div><b>${esc(popT.table)}</b>
        <div class="ax-pop__l">${(popT.lines || [[popT.items, '']]).map(([n, q]) => `<div><span>${esc(n)}</span><span>${q}</span></div>`).join('')}${popT.total ? `<div class="tot"><b>Total</b><b>${peso(popT.total)}</b></div>` : ''}</div>
        <div class="ax-pop__a"><button type="button" data-ax-accept>${popT.order ? 'Accept · send to kitchen' : 'On my way'}</button><button type="button" data-ax-later>Later</button></div></div></div>` : '';
    $('[data-ax-tablet]', sec).innerHTML = `<div class="ax-tn"><div class="ax-tn__logo">${leaf(16)}<b>tapfour</b></div>${['Today', 'Orders', 'Menu', 'Guests', 'Billing', 'Inventory', 'Wi-Fi', 'My stands'].map((l, i) => `<span${i === 0 ? ' class="on"' : ''}>${l}${l === 'Orders' && on && fresh ? `<b>${fresh}</b>` : ''}</span>`).join('')}</div>
      <div class="ax-tm">${pop}
        <div class="ax-tm__h"><b>Today · Your shop</b><small>SAMPLE DATA · 12:41</small></div>
        <div class="ax-tk4">${[['TAPS', '146', 'NFC today', 1], ['QR SCANS', '58', 'Counted separately'], ['GUESTS IN NOW', '38', 'Avg stay 46 min'], ['ORDERS', on ? '23' : '—', on ? '₱8,940 today' : 'Add-on']].map(([l, v, sub, hi]) => `<div${hi ? ' class="hi"' : ''}><small>${l}</small><b>${v}</b><span>${sub}</span></div>`).join('')}</div>
        <div class="ax-tm__g">
          <div class="ax-lo${on ? '' : ' off'}"><div class="ax-lo__h"><small>LIVE ORDERS</small><em>${on ? fresh + ' NEW' : 'ADD-ON'}</em></div>
            ${AX.tix.map(t => `<div class="ax-lo__r"><span><b>${esc(t.table)}</b><small>${esc(t.items)}</small></span><span>${axPill(t)}${on && t.st < 2 ? `<button type="button" data-ax-tk="${t.id}"${t.st === 0 ? ' class="hi"' : ''}>${axShort(t)}</button>` : ''}</span></div>`).join('')}</div>
          <div class="ax-tm__side"><div class="ax-needs"><small>NEEDS YOU</small><div class="hi"><span><small>INVENTORY · LOW</small><b>Oat milk</b></span><b>3 L</b></div><div><span><small>BILLING · DUE FRI</small><b>Coffee bean supplier</b></span><b>₱8,400</b></div></div>
            <div class="ax-bh"><small>BUSIEST HOURS</small><div>${[20, 35, 60, 45, 90, 100, 70, 40, 55, 80, 65, 30].map(h => `<i style="height:${h}%"${h >= 90 ? ' class="hi"' : ''}></i>`).join('')}</div><div class="ax-axis"><span>8AM</span><span>12</span><span>4PM</span><span>8</span></div></div></div>
        </div>
      </div>`;
    // Guest's phone at the table
    const cart = GMENU.map(([n, p], i) => ({ n, p, q: AX.qty[i] })).filter(m => m.q), count = cart.reduce((a, m) => a + m.q, 0), sum = cart.reduce((a, m) => a + m.q * m.p, 0);
    $('[data-ax-guest]', sec).innerHTML = `<div class="ax-gp__notch"><i></i></div>
      <div class="ax-gp__h"><span><b>Table 4</b><small>YOUR SHOP · MENU</small></span><em>OPEN</em></div>
      <div class="ax-gp__menu">${GMENU.map(([n, p, c], i) => `<div class="ax-gp__mi"><i style="background:${c}"></i><span><b>${n}</b><small>${peso(p)}</small></span><span class="dp-g__q">${AX.qty[i] ? `<button type="button" data-ax-qty="${i}" data-d="-1" aria-label="Remove one ${n}">−</button><b>${AX.qty[i]}</b>` : ''}<button type="button" class="add" data-ax-qty="${i}" data-d="1" aria-label="Add one ${n}">+</button></span></div>`).join('')}</div>
      <div class="ax-gp__foot"><div class="ax-gp__quick"><button type="button" data-ax-call>Call staff</button><button type="button" data-ax-bill>Bill please</button></div>
        <button type="button" class="dp-g__send${count ? ' on' : ''}" data-ax-send${count ? '' : ' disabled'}><span>Send order</span><span>${count ? count + ' item' + (count > 1 ? 's' : '') + ' · ' + peso(sum) : 'Add items'}</span></button>
        <small>GOES TO THE COUNTER → KITCHEN</small></div>
      ${AX.toast ? `<div class="dp-g__toast" role="status"><b>✓</b>${esc(AX.toast)}</div>` : ''}
      ${on ? '' : '<div class="ax-lock"><small>ADD-ON</small><b>Guests order from their phone. It pops up on your counter tablet.</b><button type="button" data-act="tableOrder">+ Add table ordering</button><small>FROM ₱499/MO</small></div>'}`;
    // Phones: the popup and live orders again, at thumb size
    $('[data-ax-big]', sec).innerHTML = (popT ? `<div class="ax-bigpop"><div class="ax-pop__h"><span><i></i>${popT.order ? 'NEW ORDER' : 'REQUEST'}</span><small>JUST NOW</small></div><b>${esc(popT.table)}</b><p>${esc(popT.items)}</p>
        <div class="ax-pop__a"><button type="button" data-ax-accept>${popT.order ? 'Accept · send to kitchen' : 'On my way'}</button><button type="button" data-ax-later>Later</button></div></div>` : '') +
      `<div class="ax-bigl"><div class="ax-bigl__h"><small>LIVE ORDERS</small><small>${fresh} NEW</small></div>${AX.tix.map(t => `<div class="ax-bigl__r${t.st === 0 ? ' new' : t.st >= 2 ? ' done' : ''}"><span><span><b>${esc(t.table)}</b>${axPill(t)}</span><small>${esc(t.items)}</small></span>${on && t.st < 2 ? `<button type="button" data-ax-tk="${t.id}"${t.st === 0 ? ' class="hi"' : ''}>${axShort(t)}</button>` : ''}</div>`).join('')}</div>`;
  }
  const axSec = $('[data-app-section]');
  if (axSec) {
    let axT;
    const axPush = (t, msg) => {
      const id = Date.now();
      AX.tix = [{ id, table: 'Table 4', st: 0, ...t }, ...AX.tix].slice(0, 5);
      AX.pop = id; AX.toast = msg;
      clearTimeout(axT); axT = setTimeout(() => { AX.toast = ''; renderAppSection(); }, 2200);
    };
    axSec.addEventListener('click', e => {
      const t = e.target.closest('[data-ax-qty],[data-ax-call],[data-ax-bill],[data-ax-send],[data-ax-tk],[data-ax-accept],[data-ax-later]');
      if (!t) return;
      const ds = t.dataset;
      if (ds.axQty) AX.qty[+ds.axQty] = Math.max(0, AX.qty[+ds.axQty] + +ds.d);
      else if ('axCall' in ds) axPush({ items: 'Call staff', lines: [['Guest needs help', '']], order: false }, 'Staff is on the way');
      else if ('axBill' in ds) axPush({ items: 'Bill please', lines: [['Guest asked for the bill', '']], order: false }, 'Bill requested');
      else if ('axSend' in ds) {
        const cart = GMENU.map(([n, p], i) => ({ n, p, q: AX.qty[i] })).filter(m => m.q);
        if (!cart.length) return;
        axPush({ items: cart.map(m => m.n + ' ×' + m.q).join(', '), lines: cart.map(m => [m.n, '×' + m.q]), total: cart.reduce((a, m) => a + m.q * m.p, 0), order: true }, 'Sent to the counter');
        AX.qty = AX.qty.map(() => 0);
      } else if (ds.axTk) { const tk = AX.tix.find(x => x.id === +ds.axTk); if (tk) { tk.st++; if (AX.pop === tk.id) AX.pop = null; } }
      else if ('axAccept' in ds) { const tk = AX.tix.find(x => x.id === AX.pop); if (tk) tk.st = 1; AX.pop = null; }
      else if ('axLater' in ds) AX.pop = null;
      renderAppSection();
    });
    // Mobile swipe row: dots follow the card in view.
    const row = $('[data-ax-row]', axSec);
    row.addEventListener('scroll', () => {
      const card = row.firstElementChild, i = Math.min(4, Math.round(row.scrollLeft / ((card?.offsetWidth || 1) + 12)));
      $$('[data-ax-dots] i', axSec).forEach((d, k) => d.classList.toggle('on', k === i));
      $('[data-ax-pager]', axSec).textContent = `${i + 1} / 5 · SWIPE →`;
    }, { passive: true });
  }

  /* ---------- hero (2a · the map climb): the result + the one stand, same state as the builder ---------- */
  const HERO = {
    menu: ['BEST SELLER', 'Review + QR menu stand', 'Tap to review · scan for your menu'],
    review: ['QUICK START', 'Google review stand', 'One tap opens your review box'],
    links: ['GROW FOLLOWERS', '4-in-1 socials stand', 'Google, Facebook, IG and TikTok']
  };
  const SHOPS = [['Café Uno', '4.5 · 96 reviews'], ['Bean Stop', '4.3 · 51 reviews']];
  function renderHero() {
    const hero = $('[data-hero]');
    if (!hero) return;
    const face = S.pkg ? 'menu' : designOf(), c = faceCost(face), [tag, name, sub] = HERO[face];
    const img = $('[data-hero-img]', hero), src = TF.img[`l-${S.finish}-${face}`];
    if (src && img.getAttribute('src') !== src) img.src = src;
    img.alt = `TAP4.1 L-Stand, ${name}`;
    $('[data-hero-tag]', hero).textContent = `${tag} · ${S.finish === 'white' ? 'GLOSSY WHITE' : 'GLOSSY BLACK'}`;
    $('[data-hero-name]', hero).textContent = name;
    $('[data-hero-sub]', hero).textContent = sub;
    $('[data-hero-now]', hero).textContent = peso(c.now);
    $('[data-hero-was]', hero).textContent = c.was > c.now ? peso(c.was) : '';
    $$('[data-hero-cta]', hero).forEach(b => { b.textContent = `Get this stand · ${peso(c.now)} →`; });
    $('[data-solo-up]', hero).textContent = peso(priceOf(pkgItem('solo')));
    $('[data-solo-mo]', hero).textContent = `+ ${peso(planPrice(PLANS[0]))}/mo`;
    $$('[data-act="heroFace"]', hero).forEach(b => { const on = b.dataset.arg === face; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $$('[data-act="finish"]', hero).forEach(b => { const on = b.dataset.arg === S.finish; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $$('[data-act="heroBa"]', hero).forEach(b => { const on = (b.dataset.arg === '1') === S.heroAfter; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const you = ['Your shop', S.heroAfter ? '4.8 · 212 reviews' : '4.6 · 18 reviews', true];
    const list = S.heroAfter ? [you, ...SHOPS] : [...SHOPS, you];
    $('[data-hero-ranks]', hero).innerHTML = list.map(([n, meta, me], i) => `<div class="hm-rank${me ? ' me' : ''}"><b>#${i + 1}</b><span><b>${n}</b><small><i>★★★★★</i> ${meta}</small></span>${me ? '<em>YOU</em>' : ''}</div>`).join('');
  }

  const builder = $('[data-builder]');
  function render() {
    const focused = document.activeElement;
    const focusKey = focused && { id: focused.id, act: focused.dataset.act, arg: focused.dataset.arg, start: focused.selectionStart, end: focused.selectionEnd };
    renderPlans();
    renderServices();
    renderHero();
    renderAppSection();
    if (!builder) return;
    const d = derive();
    builder.setAttribute('aria-busy', S.ordering);
    renderBuilder(d);
    renderCheckout();
    if (focusKey && !focused.isConnected) {
      const replacement = focusKey.id ? document.getElementById(focusKey.id) : $$('[data-act]').find(el => el.dataset.act === focusKey.act && el.dataset.arg === focusKey.arg);
      if (replacement && !replacement.disabled) {
        replacement.focus({ preventScroll: true });
        if (Number.isInteger(focusKey.start) && replacement.setSelectionRange) {
          try { replacement.setSelectionRange(focusKey.start, focusKey.end); } catch (_) { /* URL inputs do not expose a caret range in every browser. */ }
        }
      }
    }
  }

  /* ---------- add the whole setup to the Shopify cart ---------- */
  // Validates the setup and builds the order. Returns { error, input } or { d, items, props }.
  function prepare() {
    const d = derive(), items = [], missing = [], missingPlans = [];
    const reject = (error, input) => ({ error, input });
    const destinations = d.activePl.map(([id, label]) => ({ label: id === 'google' ? 'Google Maps' : label, plat: id, value: S.links[id], input: 'tf-url-' + id }));
    for (const dest of destinations) {
      dest.value = (dest.value || '').trim();
      if (!dest.value) continue; // optional: sent after checkout
      try {
        const url = new URL(dest.value);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Invalid URL');
        if (dest.plat === 'google' && !isGoogleLink(url)) return reject('Paste your Google Maps link (in Google Maps: Share → Copy link).', dest.input);
      } catch (_) {
        return reject(dest.plat === 'google' ? 'Paste your Google Maps link (in Google Maps: Share → Copy link).' : 'Enter a valid http:// or https:// URL for ' + dest.label + '.', dest.input);
      }
    }
    const add = (it, qty, props, recurring = false) => {
      const v = variant(it.handle, it.variant);
      if (!v || !v.available) return missing.push(it.name);
      if (recurring && !v.sp && !TF.orderEmail) return missingPlans.push(it.name);
      const line = { id: v.id, quantity: qty };
      if (props) line.properties = props;
      if (recurring) line.selling_plan = v.sp;
      items.push(line);
    };
    const props = { ...(CO.info.business.trim() && { 'Business name': CO.info.business.trim() }), Setup: d.pkg ? d.plan.name + ' package' : 'TAP4.1 L-Stand', Finish: FINISHES.find(x => x.id === S.finish).name };
    if (d.pkg) props.Stands = PKGS[d.pkg].stands + ' × TAP4.1 L-Stand';
    if (d.menuOn && S.menuHow === 3) props.Menu = 'Customer will send it after checkout';
    Object.assign(props, { Design: DESIGNS.find(x => x.id === d.design).name, 'Tap opens': d.destUrl });
    if (d.design === 'links') props['4-in-1 apps'] = d.activePl.map(p => p[1]).join(', ');
    if (d.isApp) props['App page'] = 'Assigned during setup after checkout';
    if (d.isApp) Object.assign(props, { 'Wi-Fi per guest': S.wifiH + (S.wifiH > 1 ? ' hours' : ' hour'), 'Table ordering': S.tableOrder ? 'Yes — send a quote (from ₱499/mo)' : 'No' });
    destinations.forEach(dest => { props[dest.label + (dest.plat === 'google' ? ' link' : ' URL')] = dest.value || 'To be provided after checkout'; });
    if (destinations.some(dest => dest.plat === 'google' && dest.value)) props['Google review link'] = 'tapfour sets it up from the Maps link';

    add(d.prod, d.units, props);
    if (d.hwMenuFee) add(HW_MENU, 1);
    if (d.linkFee) add(LINKS, 1);
    if (d.isApp) {
      add(planItem(d.plan, S.yearly), 1, null, true);
    }
    d.activeSvcs.forEach(v => {
      if (!v.vid || !v.available) missing.push(v.name);
      else if (v.monthly && !v.sp && !TF.orderEmail) missingPlans.push(v.name);
      else items.push({ id: v.vid, quantity: 1, ...(v.monthly ? { selling_plan: v.sp } : {}) });
    });

    if (missing.length) return reject('Not available right now: ' + missing.join(', ') + '. Message us and we’ll sort it out.');
    if (missingPlans.length) return reject('Subscription billing is not configured for: ' + missingPlans.join(', ') + '. Please contact us before ordering.');
    return { d, items, props };
  }

  // "Checkout" from the summary, the sticky bar or the header bag: validate, then open the order panel.
  function order() {
    if (S.ordering) return;
    const r = prepare();
    if (r.error) {
      set({ error: r.error });
      const el = r.input && document.getElementById(r.input);
      (el || $('#tf-summary'))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
      return;
    }
    openCheckout();
  }

  /* ---------- checkout panel ---------- */
  const CO = { open: false, step: 1, done: false, opener: null, error: '', info: { business: '', name: '', phone: '', email: '', address: '', city: '', pay: 'GCash', note: '', menuLink: '', menuText: '', menuAttach: false, menuFiles: [] } };
  const PAY = ['GCash', 'Maya', 'Bank transfer', 'Cash on delivery'];
  const coRoot = $('#tf-checkout');
  // A menu step appears whenever we have to build a menu: printed QR menu, the app's live menu, or Menu setup.
  const needsMenu = () => (derive().menuOn && S.menuHow !== 3) || !!S.svcs['menu-setup'];
  const steps = () => ['Review', ...(needsMenu() ? ['Menu'] : []), ...(TF.orderEmail ? ['Details', 'Confirm'] : [])];
  const TITLES = { Review: 'Your order', Menu: 'Your menu', Details: 'Delivery details', Confirm: 'Confirm & send' };
  function checkMenu() {
    const i = CO.info, link = i.menuLink.trim();
    if (link) { try { if (!/^https?:$/.test(new URL(link).protocol)) throw 0; } catch (_) { return ['Menu link must start with http:// or https://', 'co-menuLink']; } }
    if (i.menuFiles.some(f => f.status === 'uploading')) return ['Wait a moment — your menu is still uploading.', 'co-menuFiles'];
    if (!link && !i.menuText.trim() && !i.menuAttach && !i.menuFiles.some(f => f.url)) return [TF.menuUploadUrl ? 'Add your menu: upload a file, paste a link, or type the items.' : 'Add your menu: a link, the items, or tick “attach photos”.', TF.menuUploadUrl ? 'co-menuFiles' : 'co-menuLink'];
    return null;
  }
  const menuLines = () => {
    const i = CO.info;
    const files = i.menuFiles.filter(f => f.url);
    return [files.length ? 'Menu files:\n' + files.map(f => f.name + ' — ' + f.url).join('\n') : null, i.menuLink.trim() ? 'Menu link: ' + i.menuLink.trim() : null, i.menuText.trim() ? 'Menu items:\n' + i.menuText.trim() : null, i.menuAttach ? 'Menu photos: attached to this email' : null].filter(Boolean);
  };
  function openCheckout() {
    if (!coRoot) return;
    Object.assign(CO, { open: true, step: 1, done: false, error: '', opener: document.activeElement });
    coRoot.hidden = false;
    document.documentElement.classList.add('co-lock');
    renderCheckout();
    requestAnimationFrame(() => { coRoot.classList.add('on'); $('.co__x', coRoot)?.focus(); });
  }
  function closeCheckout() {
    CO.open = false;
    coRoot.classList.remove('on');
    document.documentElement.classList.remove('co-lock');
    setTimeout(() => { if (!CO.open) coRoot.hidden = true; }, 300);
    CO.opener?.focus?.({ preventScroll: true });
  }
  function checkInfo() {
    const i = CO.info;
    if (!i.business.trim()) return ['Enter your business name.', 'co-business'];
    if (!i.name.trim()) return ['Enter your name.', 'co-name'];
    if (i.phone.replace(/\D/g, '').length < 10) return ['Enter a mobile number we can reach you on.', 'co-phone'];
    if (i.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim())) return ['Check your email address.', 'co-email'];
    if (!i.address.trim()) return ['Enter the delivery address.', 'co-address'];
    return null;
  }
  function renderCheckout() {
    if (!coRoot || !CO.open) return;
    const r = prepare();
    if (r.error) { closeCheckout(); return set({ error: r.error }); }
    const { d } = r, st = steps(), i = CO.info;
    const ph = shotFor(d);
    const line = (name, price, sub = '') => `<div class="co-line"><span><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><em>${price}</em></div>`;
    const extras = [
      d.hwMenuFee ? line(HW_MENU.name, peso(d.hwMenuFee)) : '',
      d.linkFee ? line(LINKS.name, peso(d.linkFee), d.activePl.map(p => p[1]).join(' · ')) : '',
      d.isApp ? line(d.plan.name + ' plan', peso(planPrice(d.plan)) + '/mo', S.yearly ? 'Billed yearly' : 'Billed monthly') : '',
      d.isApp && S.tableOrder ? line('Table ordering', 'quote', 'From ₱499/mo · priced by your tables') : '',
      ...d.activeSvcs.map(v => line(v.name, peso(v.price) + (v.monthly ? '/mo' : ''), 'Done-for-you service'))
    ].join('');
    const totals = `<div class="co-totals"><div><span>One-time</span><b>${peso(d.oneTime)}</b></div>${d.monthly ? `<div><span>Monthly</span><b>${peso(d.monthly)}</b></div>` : ''}${d.saved > 0 ? `<div class="lime"><span>You save</span><b>${peso(d.saved)}</b></div>` : ''}</div>`;
    const field = (id, label, type = 'text', extra = '') => `<label class="field co-field">${label}<input id="co-${id}" data-co="${id}" type="${type}" value="${esc(i[id])}" ${extra}></label>`;
    let body;
    const cur = st[CO.step - 1], at = name => st.indexOf(name) + 1;
    if (CO.done) {
      body = `<div class="co-done"><span class="co-done__check">✓</span><h4>Almost done — press Send</h4><p>Your email app opened with the full order for ${esc(i.business.trim())}. ${i.menuAttach && needsMenu() ? '<b class="lime">Attach your menu photos</b>, then press <b>Send</b>' : 'Press <b>Send</b> there'} and we’ll reply to confirm shipping and payment.</p>
        <p class="m3">Nothing opened? Email <a class="fg" href="mailto:${esc(TF.orderEmail)}">${esc(TF.orderEmail)}</a>.</p>
        <button type="button" class="btn btn--light btn--block" data-co-close>Back to the site</button></div>`;
    } else if (cur === 'Review') {
      body = `<div class="co-item"><img src="${ph.src}" alt="">
          <div class="co-item__txt"><b>${esc(d.prod.name)}</b><small>${esc(DESIGNS.find(x => x.id === d.design).name + ' design')}</small><small class="lime">${esc(d.destUrl)}</small>
            ${d.pkg ? '' : `<div class="qty qty--sm"><button type="button" data-act="qty" data-arg="-1" aria-label="Decrease quantity">−</button><output>${S.qty}</output><button type="button" class="on" data-act="qty" data-arg="1" aria-label="Increase quantity">+</button></div>`}</div>
          <em>${peso(priceOf(d.prod) * d.units)}</em></div>
        ${extras ? `<div class="co-lines">${extras}</div>` : ''}${totals}
        <button type="button" class="co-edit" data-co-edit>✎ Edit setup</button>`;
    } else if (cur === 'Menu') {
      body = `<div class="co-form">
        <div class="co-menu-intro"><span class="co-menu-intro__qr">${QR}</span><div><b>Send us your menu</b><span>We type it up, build your mobile menu${d.hwMenuFee || d.pkg ? ' and print its QR on your stand' : ' and pair it with your stand'}.${S.svcs['menu-setup'] ? ' Menu setup is included, so we also price and photograph it.' : ''}</span></div></div>
        ${TF.menuUploadUrl ? `<label class="co-drop"><input type="file" id="co-menuFiles" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*" multiple>
          <span class="co-drop__ic">↑</span><b>Upload your menu</b><small>PDF, JPG, PNG or HEIC · up to 10 MB each · drop files here</small></label>
          ${i.menuFiles.length ? `<div class="co-files">${i.menuFiles.map(f => `<div class="co-file is-${f.status}"><span class="co-file__ic">${esc((f.name.split('.').pop() || 'file').slice(0, 4).toUpperCase())}</span>
            <span class="co-file__n"><b>${esc(f.name)}</b><small>${f.status === 'uploading' ? 'Uploading…' : f.status === 'done' ? '✓ Uploaded · ' + (f.size < 1048576 ? Math.max(1, Math.round(f.size / 1024)) + ' KB' : (f.size / 1048576).toFixed(1) + ' MB') : esc(f.error)}</small></span>
            <button type="button" data-co-rm="${f.id}" aria-label="Remove ${esc(f.name)}">×</button></div>`).join('')}</div>` : ''}` : ''}
        ${field('menuLink', (TF.menuUploadUrl ? 'Or a menu link' : 'Menu link') + ' · Google Drive, website, Facebook photos…', 'url', 'inputmode="url" placeholder="https://"')}
        <label class="field co-field">Or paste / type your menu<textarea id="co-menuText" data-co="menuText" rows="6" placeholder="COFFEE&#10;Sagada Latte — ₱165&#10;Ube Cold Brew — ₱190&#10;&#10;PASTRY&#10;Ensaymada — ₱95">${esc(i.menuText)}</textarea></label>
        ${TF.menuUploadUrl ? '' : `<label class="co-check"><input type="checkbox" id="co-menuAttach" data-co="menuAttach"${i.menuAttach ? ' checked' : ''}><span></span>I’ll attach photos of my menu to the order email</label>`}
        <p class="co-hint">Any one of these works. You can send changes any time before we print.</p></div>`;
    } else if (cur === 'Details') {
      body = `<div class="co-form">${field('business', 'Business name', 'text', 'autocomplete="organization" maxlength="40"')}${field('name', 'Your name', 'text', 'autocomplete="name"')}${field('phone', 'Mobile number', 'tel', 'autocomplete="tel" inputmode="tel" placeholder="09XX XXX XXXX"')}
        ${field('email', 'Email (optional)', 'email', 'autocomplete="email"')}${field('address', 'Delivery address', 'text', 'autocomplete="street-address"')}${field('city', 'City / Province', 'text', 'autocomplete="address-level2"')}
        <div class="field co-field">Preferred payment · we confirm by email<div class="co-pay">${PAY.map(p => `<label class="co-pay__opt"><input type="radio" name="co-pay" data-co="pay" value="${p}"${i.pay === p ? ' checked' : ''}><span>${p}</span></label>`).join('')}</div></div>
        <label class="field co-field">Notes (optional)<textarea id="co-note" data-co="note" rows="2" placeholder="Delivery instructions, rush order…">${esc(i.note)}</textarea></label></div>`;
    } else {
      body = `<div class="co-review">
          <div class="co-block"><div class="co-block__h"><span>DELIVER TO</span><button type="button" data-co-step="${at('Details')}">Edit</button></div><b>${esc(i.name)}</b><span>${esc(i.phone)}${i.email ? ' · ' + esc(i.email) : ''}</span><span>${esc(i.address)}${i.city ? ', ' + esc(i.city) : ''}</span><span class="m3">Pay with ${esc(i.pay)}</span></div>
          <div class="co-block"><div class="co-block__h"><span>YOUR SETUP</span><button type="button" data-co-step="1">Edit</button></div><span>${esc(d.summary)}</span></div>
          ${at('Menu') ? `<div class="co-block"><div class="co-block__h"><span>YOUR MENU</span><button type="button" data-co-step="${at('Menu')}">Edit</button></div>${menuLines().map(l => `<span class="co-pre">${esc(l.length > 160 ? l.slice(0, 160) + '…' : l)}</span>`).join('')}</div>` : ''}
          ${totals}<p class="co-hint">Sending opens your email app with everything filled in. Press Send there to place the order.</p></div>`;
    }
    const last = CO.step === st.length;
    const cta = CO.done ? '' : `<div class="co-foot">${CO.error ? `<div class="summary__err" role="alert">${esc(CO.error)}</div>` : ''}
      ${CO.step > 1 ? `<button type="button" class="btn btn--ghost" data-co-step="${CO.step - 1}">Back</button>` : ''}
      <button type="button" class="btn btn--lime btn--lg co-cta" ${last ? 'data-co-submit' : `data-co-step="${CO.step + 1}"`}${S.ordering ? ' disabled' : ''}>${S.ordering ? 'Adding to cart…' : last ? (TF.orderEmail ? 'Send order · ' + peso(d.dueNow) : 'Secure checkout · ' + peso(d.dueNow)) + ' →' : 'Continue →'}</button></div>`;
    $('.co__panel', coRoot).innerHTML = `<div class="co__head"><div><span class="mono-11 m3">${CO.done ? 'ORDER READY' : 'STEP ' + CO.step + ' OF ' + st.length}</span><h3 id="co-title">${CO.done ? 'Check your email app' : TITLES[st[CO.step - 1]]}</h3></div><button type="button" class="co__x" data-co-close aria-label="Close checkout">×</button></div>
      ${st.length > 1 && !CO.done ? `<div class="co-steps" style="grid-template-columns:repeat(${st.length},1fr)">${st.map((n, k) => `<span class="${k + 1 <= CO.step ? 'on' : ''}"><i></i>${n}</span>`).join('')}</div>` : ''}
      <div class="co__body">${body}</div>${cta}`;
  }
  function goStep(n) {
    const cur = steps()[CO.step - 1];
    const bad = n > CO.step && (cur === 'Details' ? checkInfo() : cur === 'Menu' ? checkMenu() : null);
    if (bad) { CO.error = bad[0]; renderCheckout(); return document.getElementById(bad[1])?.focus(); }
    Object.assign(CO, { step: n, error: '' });
    renderCheckout();
    $('.co__body', coRoot).scrollTop = 0;
  }
  async function submit() {
    const bad = steps()[CO.step - 1] === 'Menu' ? checkMenu() : null;
    if (bad) { CO.error = bad[0]; renderCheckout(); return document.getElementById(bad[1])?.focus(); }
    const r = prepare();
    if (r.error) { closeCheckout(); return set({ error: r.error }); }
    const { d, items, props } = r;
    if (TF.orderEmail) {
      const i = CO.info;
      const body = [
        'Hi tapfour, I’d like to order this setup:', '', d.summary, '',
        ...Object.entries(props).map(([k, v]) => k + ': ' + v), '',
        'One-time: ' + peso(d.oneTime), d.monthly ? 'Monthly: ' + peso(d.monthly) : null, '',
        'Business: ' + i.business.trim(), 'Name: ' + i.name.trim(), 'Mobile: ' + i.phone.trim(), i.email.trim() ? 'Email: ' + i.email.trim() : null,
        'Deliver to: ' + i.address.trim() + (i.city.trim() ? ', ' + i.city.trim() : ''), 'Preferred payment: ' + i.pay,
        i.note.trim() ? 'Notes: ' + i.note.trim() : null,
        ...(needsMenu() ? ['', '— MENU —', ...menuLines(), ...(i.menuAttach ? ['📎 Remember to attach your menu photos before sending.'] : [])] : [])
      ].filter(v => v !== null).join('\n');
      (TF.open || (url => { location.href = url; }))('mailto:' + TF.orderEmail + '?subject=' + encodeURIComponent('Order: ' + d.units + ' × ' + d.prod.name + ' — ' + i.business.trim()) + '&body=' + encodeURIComponent(body));
      CO.done = true;
      return renderCheckout();
    }
    const m = CO.info;
    if (needsMenu() && items[0]?.properties) Object.assign(items[0].properties,
      m.menuFiles.some(f => f.url) ? { 'Menu files': m.menuFiles.filter(f => f.url).map(f => f.url).join(' ') } : {}, m.menuLink.trim() ? { 'Menu link': m.menuLink.trim() } : {}, m.menuText.trim() ? { 'Menu items': m.menuText.trim() } : {}, m.menuAttach ? { 'Menu photos': 'Customer will email photos' } : {});
    set({ ordering: true });
    renderCheckout();
    try {
      const res = await fetch(TF.cartAddUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).description || 'Could not add to cart.');
      location.href = TF.cartUrl;
    } catch (e) {
      S.ordering = false;
      CO.error = e.message || 'Could not add to cart. Please try again.';
      renderCheckout();
    }
  }
  if (coRoot) {
    coRoot.addEventListener('click', e => {
      if (e.target.closest('[data-co-close]')) return closeCheckout();
      const rm = e.target.closest('[data-co-rm]');
      if (rm) { CO.info.menuFiles = CO.info.menuFiles.filter(f => f.id !== +rm.dataset.coRm); return renderCheckout(); }
      if (e.target.closest('[data-co-edit]')) { closeCheckout(); return scrollTo('build'); }
      const stepBtn = e.target.closest('[data-co-step]');
      if (stepBtn) return goStep(+stepBtn.dataset.coStep);
      if (e.target.closest('[data-co-submit]')) return submit();
    });
    const keep = e => { const k = e.target.dataset.co; if (k) CO.info[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; };
    let fileSeq = 0;
    async function uploadMenu(file) {
      const entry = { id: ++fileSeq, name: file.name || 'menu', size: file.size, status: 'uploading', url: '', error: '' };
      CO.info.menuFiles.push(entry);
      if (file.size > 10 * 1048576) Object.assign(entry, { status: 'error', error: 'Over 10 MB — try a smaller file or a link.' });
      else {
        try {
          const body = new FormData();
          body.append('file', file);
          const res = await fetch(TF.menuUploadUrl, { method: 'POST', body });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed — try again or paste a link.');
          Object.assign(entry, { status: 'done', url: data.url, size: data.size || file.size });
        } catch (err) { Object.assign(entry, { status: 'error', error: err.message || 'Upload failed — try again or paste a link.' }); }
      }
      if (CO.error && entry.status === 'done') CO.error = '';
      renderCheckout();
    }
    coRoot.addEventListener('change', e => {
      if (e.target.id !== 'co-menuFiles') return;
      const room = 6 - CO.info.menuFiles.length;
      const picked = [...e.target.files].slice(0, Math.max(0, room));
      if (e.target.files.length > picked.length) CO.error = 'Up to 6 menu files per order.';
      picked.forEach(uploadMenu);
      renderCheckout();
    });
    coRoot.addEventListener('input', keep);
    coRoot.addEventListener('change', keep);
    document.addEventListener('keydown', e => { if (CO.open && e.key === 'Escape') closeCheckout(); });
  }

  /* ---------- events ---------- */
  const scrollTo = id => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 70, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  const ACTS = {
    finish: id => set({ finish: id }),
    heroFace: id => ACTS.design(id),
    heroBa: v => set({ heroAfter: v === '1' }),
    heroOrder: () => { set({ pkg: null }); scrollTo('build'); },
    design: id => set({ dest: id === 'links' ? 'links' : 'google', hw: { menu: id === 'menu' }, pkg: null, pv: 0 }),
    menuHow: i => set({ menuHow: +i }),
    pv: i => set({ pv: +i }),
    qty: n => set({ qty: Math.max(1, S.qty + +n) }),
    plan: id => set({ plan: id }),
    planCta: id => { set({ plan: id, pkg: id }); if (builder) scrollTo('build'); },
    tableOrder: () => { DP.oView = !S.tableOrder; AX.pop = S.tableOrder ? null : 3; set({ tableOrder: !S.tableOrder }); }, // adding it opens the live floor + a sample order popup
    pkgClear: () => set({ pkg: null }),
    wifiH: h => set({ wifiH: +h }),
    yearly: v => set({ yearly: v === '1' }),
    svc: id => set({ svcs: { ...S.svcs, [id]: !S.svcs[id] } }),
    order: () => order()
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || S.ordering || !ACTS[el.dataset.act]) return;
    ACTS[el.dataset.act](el.dataset.arg, el);
    if (el.dataset.scroll) scrollTo(el.dataset.scroll);
  });
  document.addEventListener('input', e => {
    const el = e.target.closest('[data-url]');
    if (!el || S.ordering) return;
    S.links[el.dataset.url] = el.value;
    S.error = '';
    render();
  });
  render();

  /* ---------- mobile: sticky order bar while configuring, hidden once the summary is on screen ---------- */
  const bar = $('#tf-bar');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { build: false, summary: false };
    const sync = () => { const on = seen.build && !seen.summary; bar.classList.toggle('on', on); bar.setAttribute('aria-hidden', String(!on)); bar.querySelector('button').tabIndex = on ? 0 : -1; };
    const io = new IntersectionObserver(es => { es.forEach(e => { seen[e.target === builder ? 'build' : 'summary'] = e.isIntersecting; }); sync(); });
    io.observe(builder);
    io.observe($('#tf-summary'));
    bar.querySelector('[data-to-summary]').addEventListener('click', order);
  }

  /* ---------- gentle reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.sec__head, .sec > .sec__titles, .ax-f, .ax-demo, .dp__grid, .svc, .reseller').forEach(el => { el.classList.add('rv'); rv.observe(el); });
  }

  document.addEventListener('click', e => { const a = e.target.closest('[data-open-checkout]'); if (a && builder) { e.preventDefault(); order(); } });

  /* ---------- header: denser glass once the page scrolls ---------- */
  const hdr = $('.site-header');
  if (hdr) { const onScroll = () => hdr.classList.toggle('is-scrolled', scrollY > 24); addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  /* ---------- mobile menu: close after picking a link or tapping outside ---------- */
  const mnav = $('.mobile-nav');
  if (mnav) document.addEventListener('click', e => { if (mnav.open && (!mnav.contains(e.target) || e.target.closest('a'))) mnav.open = false; });

  /* ---------- 03 · slider, sample dashboards and the table-ordering demo ---------- */
  const plansSec = $('[data-plans]');
  if (plansSec) {
    let toastT;
    const toast = msg => { DP.toast = msg; clearTimeout(toastT); toastT = setTimeout(() => { DP.toast = ''; renderPlans(); }, 2400); };
    // Guest actions land on Table 4 in the floor view and as a new ticket on the server's phone.
    const push = (items, order, msg, opt = {}) => {
      const tb = DP.tables[3];
      if (opt.add) {
        if (tb.st === -1) Object.assign(tb, { g: 2, t: 'now' });
        opt.add.forEach(([i, q]) => { const r = tb.items.find(x => x[0] === i); if (r) r[1] += q; else tb.items.push([i, q]); });
        tb.st = 0;
      }
      if (opt.bill && tb.st !== -1) tb.st = 3;
      DP.tickets = [{ id: Date.now(), table: 'Table 4', items, order, st: 0 }, ...DP.tickets].slice(0, 4);
      toast(msg);
    };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && DP.sheet) { DP.sheet = false; renderPlans(); } });
    $('[data-dp-range]', plansSec).addEventListener('input', e => set({ locIdx: +e.target.value, plan: planAt(+e.target.value) }));
    plansSec.addEventListener('click', e => {
      const m = e.target.closest('[data-dp-plan],[data-dp-step],[data-dp-more],[data-dp-mtab],[data-dp-ftile],[data-dp-sheet-close]');
      if (m) {
        const md = m.dataset;
        if (md.dpPlan) { DP.mTab = 0; return set({ plan: md.dpPlan, locIdx: FIRST_STOP[md.dpPlan] }); }
        if (md.dpStep) { const next = S.locIdx + +md.dpStep; return planAt(next) === S.plan && next >= 0 && next < STOPS.length ? set({ locIdx: next }) : undefined; }
        if ('dpMore' in md) DP.more = !DP.more;
        else if (md.dpMtab) DP.mTab = +md.dpMtab;
        else if (md.dpFtile) { DP.oSel = +md.dpFtile; DP.sheet = true; }
        else DP.sheet = false;
        return renderPlans();
      }
      const t = e.target.closest('[data-dp-nav-item],[data-dp-table],[data-dp-tact],[data-dp-tclear],[data-dp-etab],[data-to-qty],[data-to-quick],[data-to-send],[data-to-tk],[data-to-q],[data-to-quote]');
      if (!t) return;
      const ds = t.dataset, sel = DP.tables[DP.oSel];
      if (ds.dpNavItem) { DP.oView = ds.dpNavItem === 'Orders'; DP.mTab = 0; }
      else if (ds.dpTable) DP.oSel = +ds.dpTable;
      else if ('dpTact' in ds) Object.assign(sel, sel.st === 3 ? { st: -1, items: [] } : { st: sel.st + 1 });
      else if ('dpTclear' in ds) Object.assign(sel, { st: -1, items: [] });
      else if (ds.dpEtab) DP.eTab = +ds.dpEtab;
      else if (ds.toQty) DP.qty[+ds.toQty] = Math.max(0, DP.qty[+ds.toQty] + +ds.d);
      else if (ds.toQuick === 'refill') push('Pork belly refill ×1', true, 'Refill sent to your server', { add: [[0, 1]] });
      else if (ds.toQuick === 'call') push('Call server', false, 'Your server is on the way');
      else if (ds.toQuick === 'bill') push('Bill please', false, 'Bill requested', { bill: true });
      else if ('toSend' in ds) {
        const cart = DMENU.map((m, i) => [i, DP.qty[i]]).filter(([, q]) => q);
        if (!cart.length) return;
        push(cart.map(([i, q]) => DMENU[i][0] + ' ×' + q).join(', '), true, 'Order sent to your server', { add: cart });
        DP.qty = DP.qty.map(() => 0);
      } else if (ds.toTk) { const tk = DP.tickets.find(x => x.id === +ds.toTk); if (tk) tk.st++; }
      else if (ds.toQ) { const [g, i] = ds.toQ.split(':').map(Number); DP.quote[g] = i; }
      else if ('toQuote' in ds) {
        const to = TF.orderEmail || 'hello@tapfour.ph';
        const body = ['Hi tapfour, I’d like a price for table ordering.', '', quoteLine(), '', 'Business: ' + (CO.info.business.trim() || '—')].join('\n');
        return (TF.open || (url => { location.href = url; }))('mailto:' + to + '?subject=' + encodeURIComponent('Table ordering quote') + '&body=' + encodeURIComponent(body));
      }
      renderPlans();
    });
  }

  /* ---------- product page: compatible billing, prices and availability ---------- */
  $$('[data-pdp]').forEach(pdp => {
    const form = $('[data-pdp-form]', pdp), data = $('[data-pdp-data]', pdp);
    if (!form || !data) return;
    const variants = JSON.parse(data.textContent);
    const variantInput = $('[name="id"]', form), planInput = $('[data-pdp-plan]', form);
    const submit = $('[data-pdp-submit]', form), price = $('[data-price]', pdp);
    const payment = $('[data-pdp-payment]', form), status = $('[data-pdp-status]', form);
    const sync = (updateUrl = false) => {
      const current = variants.find(v => String(v.id) === variantInput.value);
      if (!current) {
        submit.disabled = true;
        submit.textContent = 'Unavailable';
        payment.hidden = true;
        return;
      }
      let selectedPlan = planInput ? planInput.value : '';
      if (!current.plans.some(p => String(p.id) === selectedPlan)) {
        selectedPlan = current.requiresPlan && current.plans.length ? String(current.plans[0].id) : '';
      }
      if (planInput) {
        planInput.replaceChildren();
        if (!current.requiresPlan) planInput.add(new Option('One-time purchase', ''));
        current.plans.forEach(p => planInput.add(new Option(p.name, String(p.id))));
        planInput.value = selectedPlan;
        planInput.required = current.requiresPlan;
        planInput.disabled = !current.plans.length;
        $('[data-pdp-billing]', form).hidden = !current.plans.length;
      }
      const allocation = current.plans.find(p => String(p.id) === selectedPlan);
      const display = allocation || current;
      $('.price__now', price).textContent = display.price;
      const was = $('.price__was', price), note = $('.price__note', price);
      was.textContent = display.compare;
      was.hidden = !display.compare;
      note.textContent = allocation ? allocation.name : '';
      note.hidden = !allocation;
      const available = current.available && (!current.requiresPlan || !!allocation);
      submit.disabled = !available;
      submit.textContent = available ? 'Add to cart' : current.available ? 'Unavailable' : 'Sold out';
      payment.hidden = !available;
      status.hidden = available || !current.available;
      if (updateUrl) {
        const url = new URL(location.href);
        url.searchParams.set('variant', current.id);
        if (allocation) url.searchParams.set('selling_plan', allocation.id);
        else url.searchParams.delete('selling_plan');
        history.replaceState(null, '', url);
      }
    };
    variantInput.addEventListener('change', () => sync(true));
    if (planInput) planInput.addEventListener('change', () => sync(true));
    form.addEventListener('submit', event => {
      if (submit.disabled) event.preventDefault();
    });
    sync();
  });
})();
