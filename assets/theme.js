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

  const HW = [
    { id: 'acrylic', handle: 'acrylic-glass-stand', name: 'Acrylic Glass Stand', desc: 'Glowing edge, weighted NFC base', price: 899, was: 1499 },
    { id: 'l', handle: 'l-stand', name: 'L-Stand', desc: 'Slim acrylic L, NFC on the face', price: 549, was: 919 },
    { id: 'pvc', handle: 'pvc-triangle-stand', name: 'PVC Triangle Stand', desc: 'Tent-style table stand, review tap + menu QR', price: 449, was: 749 },
    { id: 'card', handle: 'nfc-card-4-in-1', name: '4-in-1 NFC Card', desc: 'Matte black PVC, CR80 size', price: 249, was: 419 }
  ];
  const BAR = { id: 'bar', handle: '4-tap-bar', name: '4-Tap Bar', desc: 'Long acrylic bar · 4 NFC zones', price: 1490, was: 2479 };
  const HW_MENU = { handle: 'printed-qr-menu', name: 'Printed QR menu', price: 499, was: 829, badge: 'RECOMMENDED', desc: 'We build your mobile menu and print its QR right on the stand.', points: ['Send your menu at checkout — we type it up', 'QR printed on the stand face', '1 free price update per year'] };
  const LINKS = { handle: 'multi-link-page', name: '4-in-1 links page', price: 350, was: 579 };
  const PL = [['google', 'Google', '4285F4'], ['facebook', 'Facebook', '0866FF'], ['instagram', 'Instagram', 'FF0069'], ['tiktok', 'TikTok', '000000']];
  const SLOT_OPTS = [...PL, ['website', 'Website', null]];
  const ADD = 'tapfour-app-add-ons';
  const FEATS = [
    { id: 'reviews', name: 'Tap for reviews', desc: 'Your 4-in-1 page with live stats on every tap.', price: 0, points: ['Google, Facebook, Instagram, TikTok', 'Swap links anytime — no reprint', 'Taps & new reviews in your dashboard'] },
    { id: 'menu', handle: ADD, variant: 'Live QR menu', name: 'Live QR menu', desc: 'A mobile menu you edit yourself, in seconds.', price: 199, badge: 'RECOMMENDED', points: ['Change prices & photos from your phone', 'Mark items sold out instantly', 'See which dishes get viewed most'] },
    { id: 'order', handle: ADD, variant: 'Table ordering', name: 'Order from the table', desc: 'Guests order on their own phone — no waiting in line.', price: 499, points: ['Orders ping your staff phone or kitchen tablet', 'Table number attached to every order', 'Pay at counter or via GCash / Maya'] },
    { id: 'crm', handle: ADD, variant: 'Customer in/out data', name: 'Customer in / out data', desc: 'Know who comes in, how long they stay, who returns.', price: 299, points: ['Tap-in on arrival, tap-out on payment', 'Busiest hours & average stay', 'Returning guests & visit history'] },
    { id: 'wifi', handle: ADD, variant: 'Tap-to-join Wi-Fi', name: 'Tap-to-join Wi-Fi', desc: 'Guests connect without typing passwords.', price: 99, points: ['Rotate the password anytime'] }
  ];
  const PLANS = [{ id: 'solo', name: 'Solo', price: 299 }, { id: 'business', name: 'Business', price: 799 }, { id: 'agency', name: 'Agency', price: 1999 }];
  const planItem = (p, yearly) => ({ handle: 'tapfour-app', variant: `${p.name} / ${yearly ? 'Yearly' : 'Monthly'}`, name: `${p.name} plan`, price: yearly ? p.price * 0.8 * 12 : p.price });
  const planPrice = p => priceOf(planItem(p, S.yearly)) / (S.yearly ? 12 : 1);
  const SVCS = $$('[data-svc]').map(el => ({ id: el.dataset.svc, name: el.dataset.name, price: +el.dataset.price, monthly: 'monthly' in el.dataset, vid: +el.dataset.variant, sp: +el.dataset.sp || null, available: !el.disabled }));
  const MENU = [
    [['Sagada Latte', 'Double shot, oat', 165], ['Benguet Pour-over', 'Single origin', 180], ['Ube Cold Brew', 'Seasonal', 190], ['Spanish Latte', 'Condensed milk', 170]],
    [['Ensaymada', 'Butter & queso', 95], ['Ube Cheese Pandesal', '3 pcs', 120], ['Calamansi Tart', 'House-made', 140]],
    [['Longganisa Plate', 'Garlic rice, egg', 245], ['Tapa Bowl', 'Cured beef', 265], ['Pesto Pasta', 'Benguet greens', 230]]
  ];
  const ALL_PLATS = { google: true, facebook: true, instagram: true, tiktok: true };
  const PRESETS = [
    { id: 'google', tag: 'QUICK START', name: 'Google review stand', desc: 'Acrylic stand · tap goes straight to your review box', set: { mode: 'direct', dest: 'google', product: 'acrylic', qty: 1, headline: 'Leave us a review', hw: { menu: false } } },
    { id: 'menu', tag: 'BEST FOR CAFÉS', badge: 'RECOMMENDED', name: 'Review stand + QR menu', desc: 'Tap to review, scan for your menu — pay once', set: { mode: 'direct', dest: 'google', product: 'acrylic', qty: 1, headline: 'Menu & reviews', hw: { menu: true } } },
    { id: 'links', tag: 'FOR OWNERS & STAFF', name: '4-in-1 card', desc: 'NFC card · Google, FB, IG, TikTok — no app needed', set: { mode: 'direct', dest: 'links', product: 'card', qty: 1, headline: 'Find us everywhere', plats: ALL_PLATS, slots: ['google', 'facebook', 'instagram', 'tiktok'], hw: { menu: false } } },
    { id: 'app', tag: 'WITH APP · COMBO', name: 'Live orders', desc: 'Guests order from the table · QR menu, reviews & dashboard', set: { mode: 'app', product: 'acrylic', qty: 1, plan: 'solo', feats: { reviews: true, menu: true, order: true, crm: false, wifi: false }, hw: { menu: false }, headline: 'Order from your table' } }
  ];
  const MODES = [
    { id: 'direct', name: 'Hardware only', tag: 'HARDWARE ONLY', desc: 'Tap opens one link or a 4-in-1 of your apps. No account, no subscription.', points: ['Direct to Google review, FB, IG, TikTok or website', '4-in-1 links page — one flat fee for 2–4 apps', 'Optional printed QR menu', 'Pay once — works forever'] },
    { id: 'quad', name: '4-Tap Bar', tag: '4 DIRECT TAPS', desc: 'One long stand with 4 NFC zones — each tap goes straight to its own app.', points: ['4 chips: Google, FB, IG, TikTok or website', 'No page in between — fastest for guests', 'Pick the app for each zone', 'Pay once — works forever'] },
    { id: 'app', name: 'tapfour app', tag: 'APP + DASHBOARD', desc: 'Run the counter from your phone — menu, orders, reviews and customer data in one dashboard.', points: ['Dashboard: taps, reviews, followers, menu views', 'Customer in / out: visits, stay time, returning guests', 'Table ordering straight to your staff phone — no lines', 'Live menu edits & sold-out toggles', 'Change links anytime, no reprint'] }
  ];

  const S = {
    name: 'Kape Norte', headline: 'Leave us a review', product: 'acrylic', qty: 1, mode: 'direct', dest: 'google', website: '',
    menuCat: 0, preset: 'google', plats: { ...ALL_PLATS }, slots: ['google', 'facebook', 'instagram', 'tiktok'],
    feats: { reviews: true, menu: true, order: false, crm: false, wifi: false }, hw: { menu: false }, plan: 'solo', yearly: false, svcs: {}, links: {}, slotLinks: ['', '', '', ''], error: '', ordering: false
  };
  const set = o => { Object.assign(S, { error: '' }, o); render(); };

  function derive() {
    const isQuad = S.mode === 'quad', isApp = S.mode === 'app', isDirect = S.mode === 'direct';
    const prod = isQuad ? BAR : HW.find(p => p.id === S.product);
    const plan = PLANS.find(p => p.id === S.plan) || PLANS[0];
    const activeFeats = isApp ? FEATS.filter(f => S.feats[f.id]) : [];
    const activeSvcs = SVCS.filter(v => S.svcs[v.id]);
    const DESTS = [
      { id: 'google', name: 'Google review', icon: 'google', rec: true, url: S.links.google },
      { id: 'facebook', name: 'Facebook', icon: 'facebook', url: S.links.facebook },
      { id: 'instagram', name: 'Instagram', icon: 'instagram', url: S.links.instagram },
      { id: 'tiktok', name: 'TikTok', icon: 'tiktok', url: S.links.tiktok },
      { id: 'links', name: 'Multi-link page', tap4: true, rec: true, url: 'Your links page · set up after checkout' },
      { id: 'website', name: 'Website', mark: '↗', url: S.website }
    ];
    const dest = DESTS.find(d => d.id === S.dest);
    const slotName = id => SLOT_OPTS.find(o => o[0] === id)[1];
    const activePl = isQuad ? PL.filter(p => S.slots.includes(p[0])) : (isApp || S.dest === 'links') ? PL.filter(p => S.plats[p[0]]) : PL.filter(p => p[0] === S.dest);
    const linkFee = isDirect && S.dest === 'links' && activePl.length >= 2 ? priceOf(LINKS) : 0;
    const hwMenuFee = !isApp && S.hw.menu ? priceOf(HW_MENU) : 0;
    const menuOn = isApp ? !!S.feats.menu : !!S.hw.menu;
    const oneTime = priceOf(prod) * S.qty + linkFee + hwMenuFee + activeSvcs.filter(v => !v.monthly).reduce((a, v) => a + v.price, 0);
    const yearly = isApp && S.yearly ? priceOf(planItem(plan, true)) : 0;
    const monthly = (isApp ? (S.yearly ? 0 : priceOf(planItem(plan, false))) + activeFeats.reduce((a, f) => a + priceOf(f), 0) : 0) + activeSvcs.filter(v => v.monthly).reduce((a, v) => a + v.price, 0);
    const dueNow = oneTime + yearly + monthly;
    const saved = (wasOf(prod) ? (wasOf(prod) - priceOf(prod)) * S.qty : 0) + (hwMenuFee && wasOf(HW_MENU) ? wasOf(HW_MENU) - hwMenuFee : 0) + (linkFee && wasOf(LINKS) ? wasOf(LINKS) - linkFee : 0);
    const destUrl = isQuad ? '4 direct taps · ' + S.slots.map(slotName).join(' / ') : isApp ? 'Your app page · set up after checkout' : dest.url || 'Enter your destination URL below';
    const summary = [
      S.qty + ' × ' + prod.name,
      hwMenuFee ? HW_MENU.name : null,
      isApp ? null : isQuad ? '4 taps → ' + S.slots.map(slotName).join(', ') : 'Tap → ' + (S.dest === 'links' ? '4-in-1 (' + activePl.map(p => p[1]).join(', ') + ')' : dest.name),
      ...activeFeats.map(f => f.name), isApp ? plan.name + ' plan' + (S.yearly ? ' (yearly)' : '') : null, ...activeSvcs.map(v => v.name)
    ].filter(Boolean).join(' · ');
    const initials = (S.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || 'TF').toUpperCase();
    const catalogItems = [prod, ...(!isApp && S.hw.menu ? [HW_MENU] : []), ...(isDirect && S.dest === 'links' ? [LINKS] : []), ...(isApp ? [planItem(plan, S.yearly), ...activeFeats.filter(f => f.handle)] : [])];
    const demoPrices = catalogItems.some(it => !variant(it.handle, it.variant));
    return { isQuad, isApp, isDirect, prod, plan, activeFeats, activeSvcs, DESTS, dest, slotName, activePl, linkFee, hwMenuFee, menuOn, oneTime, monthly, yearly, dueNow, demoPrices, saved, destUrl, summary, initials };
  }

  /* ---------- builder views ---------- */
  // Quick picks show what each setup *does* (drawn scenes); the product photo lives only in the live preview.
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
  function scene(id) {
    const name = esc(S.name.trim() || 'Your shop');
    if (id === 'google') return `<span class="sc sc--google"><i class="sc-ring"></i><i class="sc-ring sc-ring--2"></i>
      <span class="sc-card"><span class="sc-card__h">${ic('google', '4285F4', 13)}<b>Rate ${name}</b></span><span class="sc-stars">★★★★★</span><span class="sc-card__txt">Best latte in town!</span><span class="sc-card__btn">Post</span></span>
      <span class="sc-tag">TAP → REVIEW</span></span>`;
    if (id === 'menu') return `<span class="sc sc--menu"><span class="sc-tile sc-tile--qr">${QR}<small>SCAN · MENU</small></span><span class="sc-plus">+</span>
      <span class="sc-tile sc-tile--tap"><span class="sc-nfc">)))</span>${ic('google', '4285F4', 16)}<small>TAP · REVIEW</small></span></span>`;
    if (id === 'links') return `<span class="sc sc--links"><span class="sc-nfccard"><span class="sc-nfccard__top"><span class="ring ring--xs">${esc(derive().initials)}</span><b>${name}</b><span>)))</span></span></span>
      <span class="sc-fan">${PL.map(([pid, , col]) => `<span class="sc-dot">${ic(pid, col, 16)}</span>`).join('')}</span></span>`;
    return `<span class="sc sc--app"><span class="sc-ticket"><small>TABLE 4 · 2 ITEMS</small><span><b>Sagada Latte</b><em>₱165</em></span><span><b>Ube Cold Brew</b><em>₱190</em></span><span class="sc-ticket__btn">Send to staff · ₱355</span></span>
      <span class="sc-bars">${[40, 62, 48, 80, 100].map(h => `<i style="height:${h}%"></i>`).join('')}</span></span>`;
  }
  function viewPresets() {
    return PRESETS.map(p => {
      const on = S.preset === p.id, hw = HW.find(x => x.id === p.set.product), isAppP = p.set.mode === 'app';
      const parts = [hw, !isAppP && p.set.hw.menu ? HW_MENU : null, p.set.dest === 'links' ? LINKS : null].filter(Boolean);
      const one = parts.reduce((a, x) => a + priceOf(x), 0), was = parts.reduce((a, x) => a + (wasOf(x) || priceOf(x)), 0);
      const mo = isAppP ? '+ ' + peso(priceOf(planItem(PLANS[0], false)) + priceOf(FEATS[1]) + priceOf(FEATS[2])) + '/mo · cancel anytime' : 'No subscription';
      return `<button type="button" class="preset${on ? ' on' : ''}${p.badge ? ' rec' : ''}" data-act="preset" data-arg="${p.id}" aria-pressed="${on}">
        <span class="preset__img">${scene(p.id)}<span class="preset__shade"></span>
          <span class="preset__tags"><span class="tag tag--glass">${p.tag}</span>${p.badge ? `<span class="tag tag--lime">★ ${p.badge}</span>` : ''}</span></span>
        <span class="preset__body"><span class="preset__name">${p.name}</span><span class="preset__desc">${p.desc}</span></span>
        <span class="preset__foot"><span class="preset__prices"><span class="preset__row"><b>${peso(one)}</b>${was > one ? `<s>${peso(was)}</s>` : ''}<small>one-time</small></span><span class="preset__mo">${mo}</span></span><span class="preset__btn">${on ? '✓' : '→'}</span></span>
      </button>`;
    }).join('');
  }

  function viewPreview(d) {
    const shift = d.menuOn ? (d.isQuad ? '-60px' : '-100px') : '0px';
    const combo = d.isApp && d.prod.id === 'acrylic';
    const ph = shotFor(d.prod.id, d);
    let stage = '<div class="pv-glow"></div>';
    if (!d.isQuad) {
      stage += `<div class="pv-photo" style="transform:translateX(${shift})"><img src="${ph.src}" alt="${esc(d.prod.name)} sample" style="object-position:${ph.pos}"><span class="pv-cap">${combo ? 'COMBO STAND · APP' : d.prod.name.toUpperCase()} · SAMPLE PRINT</span></div>${ph.note ? `<span class="pv-note">ⓘ ${esc(ph.note)}</span>` : ''}`;
    } else {
      stage += `<div class="quad" style="transform:translateX(${shift})"><div class="quad__face"><div class="shine"></div>
        <div class="row-between rel"><div class="quad__id"><span class="ring ring--sm">${esc(d.initials)}</span><span class="quad__name">${esc(S.name.toUpperCase())}</span></div><span class="quad__tap">TAP ONE ))) </span></div>
        <div class="quad__zones rel">${S.slots.map((id, i) => { const o = SLOT_OPTS.find(x => x[0] === id); return `<div class="zone"><span class="zone__dot">${o[2] ? ic(id, o[2], 22) : '<b>↗</b>'}</span><b>${o[1]}</b><span class="mono">TAP ${i + 1}</span></div>`; }).join('')}</div>
        <div class="powered rel">POWERED BY <b>tapfour</b></div></div><div class="quad__base"></div></div>`;
    }
    if (d.menuOn) {
      const ordering = d.isApp && S.feats.order;
      stage += `<div class="pv-phone"><div class="pv-phone__screen">
        <div class="pv-phone__head"><div class="pv-phone__island"></div><div class="quad__id"><span class="ring ring--xs">${esc(d.initials)}</span><span><b>${esc(S.name)}</b><small>MENU · OPEN NOW</small></span></div></div>
        <div class="pv-phone__tabs">${['Coffee', 'Pastry', 'Meals'].map((n, i) => `<button type="button" class="${S.menuCat === i ? 'on' : ''}" data-act="menuCat" data-arg="${i}">${n}</button>`).join('')}</div>
        <div class="pv-phone__list">${MENU[S.menuCat].map(([n, note, p]) => `<div class="mi mi--pv"><div class="mi__img"></div><div class="mi__txt"><b>${n}</b><span>${note}</span></div><div class="mi__end"><div class="mi__p">₱${p}</div>${ordering ? '<span class="mi__add">+</span>' : ''}</div></div>`).join('')}</div>
        ${ordering ? '<div class="pv-phone__cta pv-phone__cta--lime"><span><small>TABLE 4 · 2 ITEMS</small><b>Send to staff · ₱355</b></span><b>→</b></div>' : '<div class="pv-phone__cta"><span>Loved it? Tap to review</span><span class="lime">★★★★★</span></div>'}
      </div></div>`;
    }
    return `<div class="pv-top"><span>LIVE PREVIEW</span><span>${d.prod.name.toUpperCase()}</span></div>
      <div class="pv-stage">${stage}</div>
      <div class="pv-url"><span><span class="lime">TAP OPENS →</span> ${esc(d.destUrl)}</span></div>`;
  }

  // Best-matching photo for the current setup. `pos` keeps the product in frame when a 4:3 or square
  // photo is cropped to 4:5; `note` says honestly when the sample print differs from the customer's.
  const FOCUS = { standAcrylic: '34% 55%', standL: '52% 55%', standLLinks: '50% 55%', cardNfc: '50% 58%', cardPersonal: '48% 58%' };
  const shot = (key, note = '') => ({ src: TF.img[key], pos: FOCUS[key] || '50% 50%', note });
  function shotFor(id, d) {
    const single = d.isDirect && S.dest !== 'links';
    const only = single ? 'Sample print · yours shows ' + d.dest.name + ' only' : '';
    if (id === 'acrylic') return d.isApp ? shot('standCombo') : d.menuOn ? shot('standAcrylicKn', single && S.dest !== 'google' ? only + ' + menu QR' : '') : shot('standAcrylic', only);
    if (id === 'l') return d.menuOn || d.isApp ? shot('standLKn', single && S.dest !== 'google' ? only + ' + menu QR' : '') : S.dest === 'links' ? shot('standLLinks') : shot('standL', only);
    if (id === 'pvc') return shot('standPvcMenu', d.menuOn || d.isApp ? (single && S.dest !== 'google' ? only + ' + menu QR' : '') : 'Sample print · yours prints without the menu QR');
    if (id === 'card') return d.isApp || S.dest === 'links' ? shot('cardNfc') : shot('cardPersonal', 'Sample print · yours carries your business name');
    return null;
  }

  function viewHardware(d) {
    return (d.isQuad ? [BAR] : HW).map(p => {
      const on = d.prod.id === p.id, was = wasOf(p);
      const img = shotFor(p.id, d);
      return `<button type="button" class="opt${on ? ' on' : ''}${img ? ' opt--img' : ''}" ${p.id === 'bar' ? 'disabled' : `data-act="product" data-arg="${p.id}"`} aria-pressed="${on}">
        ${img ? `<img class="opt__img" src="${img.src}" alt="" loading="lazy" style="object-position:${img.pos}">` : ''}<b>${p.name}</b><span>${p.desc}</span><span class="opt__price"><em>${peso(priceOf(p))} ea</em>${was ? `<s>${peso(was)}</s>` : ''}</span></button>`;
    }).join('');
  }

  function viewMode(d) {
    const glyph = id => id === 'direct' ? '<span class="g-stand"><i></i><i></i></span>' : id === 'quad' ? '<span class="g-quad"><i><b></b><b></b><b></b><b></b></i><i></i></span>' : leaf(22);
    const mode = MODES.find(m => m.id === S.mode);
    const modes = MODES.map(m => {
      const on = S.mode === m.id, price = m.id === 'app' ? 'FROM ' + peso(planPrice(PLANS[0])) + '/MO' : 'ONE-TIME';
      return `<button type="button" class="mode${on ? ' on' : ''}" data-act="mode" data-arg="${m.id}" aria-pressed="${on}"><span class="mode__g">${glyph(m.id)}</span><span><b>${m.name}</b><em>${price}</em></span>${on ? '<span class="check">✓</span>' : ''}</button>`;
    }).join('');
    let html = `<div class="modes">${modes}</div>
      <div class="mode-info"><p>${mode.desc}</p><div class="points">${mode.points.map(p => `<div><span class="lime">✓</span>${p}</div>`).join('')}</div></div>`;
    if (d.isDirect) {
      html += `<div class="stack-10"><div class="lbl">Send every tap to</div><div class="chips-row">${d.DESTS.map(x => {
        const on = S.dest === x.id;
        const icon = x.icon ? ic(x.icon, on ? '0a0a0b' : 'b5b3ad', 15) : x.tap4 ? leaf(15, on ? '#0a0a0b' : '') : `<span>${x.mark}</span>`;
        return `<button type="button" class="dchip${on ? ' on' : ''}" data-act="dest" data-arg="${x.id}" aria-pressed="${on}">${icon}${x.name}${x.rec ? '<span class="dchip__rec">★ RECOMMENDED</span>' : ''}</button>`;
      }).join('')}</div></div>`;
    }
    return html;
  }

  function viewModeAfter(d) {
    let html = '';
    if (d.isApp || (d.isDirect && S.dest === 'links')) {
      const count = PL.filter(p => S.plats[p[0]]).length;
      html += `<div class="stack-10"><div class="lbl">${d.isApp ? 'On your 4-in-1 page' : 'Pick the apps on your 4-in-1 — plain links, no app or dashboard'} · ${count} OF 4</div>
        ${d.isDirect ? `<div class="flat"><div><b>One flat price — 2, 3 or 4 apps</b><span>Hosted 4-in-1 page, one-time. Links stay live for life.</span></div><div class="flat__p"><b>+${peso(priceOf(LINKS))}</b><span>ONE-TIME</span></div></div>` : ''}
        <div class="chips-row">${PL.map(([id, name]) => { const on = S.plats[id]; return `<button type="button" class="pchip${on ? ' on' : ''}" data-act="plat" data-arg="${id}" aria-pressed="${!!on}">${ic(id, on ? '0a0a0b' : '8a8883', 16)}${name}</button>`; }).join('')}</div></div>`;
    }
    if (d.isQuad) {
      html += `<div class="stack-10"><div class="lbl">Each tap zone opens its own app directly — click a zone to change it</div>
        <div class="slots">${S.slots.map((id, i) => { const o = SLOT_OPTS.find(x => x[0] === id); return `<button type="button" class="slot" data-act="slot" data-arg="${i}"><span class="mono m3">TAP ${i + 1}</span><span class="slot__dot">${o[2] ? ic(id, o[2], 16) : '<b>↗</b>'}</span><b>${o[1]}</b><span class="mono lime">CHANGE ↻</span></button>`; }).join('')}</div>
        <div class="note">4 separate NFC chips, each programmed straight to one link. No page in between, no app, no subscription.</div></div>`;
    }
    const urlField = (key, label, value, required) => `<label class="field">${esc(label)} URL${required ? ' (required)' : ' (optional)'}<input id="tf-url-${key}" type="url" inputmode="url" autocomplete="url" data-url="${key}" value="${esc(value || '')}" placeholder="https://…"${required ? ' required' : ''}></label>`;
    if (d.isQuad) {
      html += `<div class="stack-10">${S.slots.map((id, i) => urlField('zone-' + i, 'Tap ' + (i + 1) + ' · ' + d.slotName(id), S.slotLinks[i], true)).join('')}</div>`;
    } else if (d.isApp || S.dest === 'links') {
      html += `<div class="stack-10">${d.activePl.map(([id, name]) => urlField(id, name, S.links[id], !d.isApp)).join('')}</div>`;
      if (d.isApp) html += '<div class="note">You can provide your links after checkout. Your app page address is assigned during setup.</div>';
    } else if (S.dest !== 'website') {
      html += urlField(S.dest, d.dest.name, S.links[S.dest], true);
    }
    if (!d.isApp) html += '<div class="note">Paste the exact destination links for programming. Your business name does not create these links.</div>';
    if (d.isDirect) html += '<div class="note">Pay once, yours forever — no account, no monthly fee. If you ever want a menu or tap stats, the same stand can be switched to the app.</div>';
    return html;
  }

  const toggleRow = (f, on, act, priceLabel) => `<button type="button" class="feat${on ? ' on' : ''}" data-act="${act}" data-arg="${f.id || ''}" aria-pressed="${on}">
      <span class="tgl tgl--lg${on ? ' on' : ''}"></span>
      <span class="feat__body"><span class="feat__name"><b>${f.name}</b>${f.badge ? `<span class="tag tag--lime">${f.badge}</span>` : ''}</span><span class="feat__desc">${f.desc}</span>
        <span class="feat__pts">${f.points.map(p => `<span><i>•</i>${p}</span>`).join('')}</span></span>
      <span class="feat__p">${priceLabel}</span></button>`;

  function viewExtra(d) {
    if (!d.isApp) {
      return `<div class="panel__head"><span>D · ADD-ONS</span><span>ONE-TIME</span></div>${toggleRow(HW_MENU, S.hw.menu, 'hwMenu', '+' + peso(priceOf(HW_MENU)))}`;
    }
    return `<div class="panel__head"><span>D · TAPFOUR APP</span><span>FEATURES</span></div>
      ${FEATS.map(f => toggleRow(f, !!S.feats[f.id], 'feat', f.price || f.handle ? '+' + peso(priceOf(f)) + '/mo' : 'INCLUDED')).join('')}
      <div class="row-between wrap"><div class="lbl" style="font-size:14px">Dashboard plan</div>
        <div class="seg seg--sm">${PLANS.map(p => `<button type="button" class="${S.plan === p.id ? 'on' : ''}" data-act="plan" data-arg="${p.id}">${p.name}</button>`).join('')}</div></div>`;
  }

  function viewSummary(d) {
    const label = TF.sale.label ? TF.sale.label + ' · ' : '';
    const deadline = countdown();
    return `<div class="row-between mono-12 b7"><span>YOUR SETUP</span><span>${d.isApp ? d.plan.name.toUpperCase() + ' PLAN' : 'PAY ONCE'}</span></div>
      <div class="summary__totals"><div><div class="s13">One-time</div><div class="summary__big">${peso(d.oneTime)}</div></div>
        <div class="ta-r"><div class="s13">${d.yearly ? 'Monthly add-ons' : 'Monthly'}</div><div class="summary__mid">${peso(d.monthly)}</div><div class="s11">${d.monthly ? 'Billed monthly' : d.yearly ? 'Plan billed yearly' : 'No subscription'}</div></div></div>
      ${d.yearly ? `<div class="s13"><b>Yearly plan: ${peso(d.yearly)} due today</b><br>Renews yearly at ${peso(d.yearly)}. Monthly add-ons are billed separately.</div>` : ''}
      <div class="s13"><b>${d.demoPrices ? 'Estimated total' : 'Due today'}: ${peso(d.dueNow)}</b>${d.monthly ? ' · includes the first monthly charge' : ''}<br>${TF.orderEmail ? 'We reply by email to confirm shipping and payment.' : 'Taxes and shipping calculated at checkout.'}</div>
      ${d.demoPrices ? '<div class="summary__err">Sample prices shown. Ordering is unavailable until these products are configured.</div>' : ''}
      ${d.saved > 0 ? `<div class="summary__save"><span>${esc(label)}YOU SAVE ${peso(d.saved)}</span>${deadline ? `<span class="fg">${deadline === 'Offer ended' ? '' : 'ENDS '}<span data-countdown>${deadline}</span></span>` : ''}</div>` : ''}
      <div class="summary__line">${esc(d.summary)}</div>
      ${TF.sale.stock > 0 ? `<div class="s13 b6">Only ${TF.sale.stock} stands left at sale price · Ships nationwide in 3–5 days</div>` : ''}
      <button type="button" class="btn btn--dark btn--lg btn--block" data-act="order"${S.ordering || d.demoPrices ? ' disabled' : ''}>${S.ordering ? 'Adding to cart…' : d.demoPrices ? 'Ordering unavailable' : 'Checkout · ' + peso(d.dueNow) + ' →'}</button>
      ${S.error ? `<div class="summary__err" role="alert">${esc(S.error)}</div>` : ''}`;
  }

  /* ---------- plans + services (other homepage sections share the same state) ---------- */
  function renderPlans() {
    $$('[data-act="yearly"]').forEach(b => { const on = (b.dataset.arg === '1') === S.yearly; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $$('.plan[data-plan]').forEach(el => {
      const on = el.dataset.plan === S.plan;
      el.classList.toggle('on', on);
      const plan = PLANS.find(p => p.id === el.dataset.plan);
      const monthly = plan ? planPrice(plan) : +(S.yearly ? el.dataset.y : el.dataset.m);
      $('[data-plan-price]', el).textContent = peso(monthly);
      const billing = $('[data-plan-billing]', el);
      if (billing) billing.textContent = S.yearly ? peso(plan ? priceOf(planItem(plan, true)) : monthly * 12) + ' billed yearly' : 'Billed monthly';
      $('.plan__cta', el).textContent = on ? 'Add to my setup ↑' : 'Choose ' + $('h3', el).textContent;
      $('.plan__cta', el).setAttribute('aria-pressed', on);
    });
  }
  function renderServices() {
    $$('.svc[data-svc]').forEach(el => {
      const on = !!S.svcs[el.dataset.svc];
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', on);
      $('.svc__mark', el).textContent = on ? '✓' : '+';
    });
  }

  const builder = $('[data-builder]');
  function render() {
    const focused = document.activeElement;
    const focusKey = focused && { id: focused.id, act: focused.dataset.act, arg: focused.dataset.arg, start: focused.selectionStart, end: focused.selectionEnd };
    renderPlans();
    renderServices();
    if (!builder) return;
    const d = derive();
    builder.setAttribute('aria-busy', S.ordering);
    $('#tf-presets').innerHTML = viewPresets();
    $('#tf-preview').innerHTML = viewPreview(d);
    $('#tf-hw').innerHTML = viewHardware(d);
    $('#tf-qty').textContent = S.qty;
    $('#tf-mode-tag').textContent = MODES.find(m => m.id === S.mode).tag;
    $('#tf-mode').innerHTML = viewMode(d);
    $('#tf-website').hidden = !(d.isDirect && S.dest === 'website');
    $('#tf-mode-after').innerHTML = viewModeAfter(d);
    $('#tf-extra').innerHTML = viewExtra(d);
    $('#tf-summary').innerHTML = viewSummary(d);
    renderCheckout();
    $('#tf-bar-total').textContent = peso(d.oneTime) + (d.monthly ? ' + ' + peso(d.monthly) + '/mo' : '');
    for (const [id, key] of [['tf-name', 'name'], ['tf-headline', 'headline'], ['tf-website', 'website']]) {
      const el = document.getElementById(id);
      if (el !== document.activeElement) el.value = S[key];
    }
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
    if (!S.name.trim()) return reject('Enter the business name to print on your setup.', 'tf-name');
    if (d.isDirect && S.dest === 'links' && d.activePl.length < 2) return reject('Choose at least two apps for your multi-link page.');
    if (d.isApp && S.feats.order && !S.feats.menu) return reject('Table ordering requires the live QR menu.');
    const destinations = d.isQuad
      ? S.slots.map((id, i) => ({ label: 'Tap ' + (i + 1) + ' · ' + d.slotName(id), value: S.slotLinks[i], input: 'tf-url-zone-' + i }))
      : d.isApp || S.dest === 'links'
        ? d.activePl.map(([id, label]) => ({ label, value: S.links[id], input: 'tf-url-' + id, optional: d.isApp }))
        : [{ label: d.dest.name, value: S.dest === 'website' ? S.website : S.links[S.dest], input: S.dest === 'website' ? 'tf-website' : 'tf-url-' + S.dest }];
    for (const dest of destinations) {
      dest.value = (dest.value || '').trim();
      if (!dest.value && dest.optional) continue;
      try {
        const url = new URL(dest.value);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Invalid URL');
      } catch (_) {
        return reject('Enter a valid http:// or https:// URL for ' + dest.label + '.', dest.input);
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
    const props = { 'Business name': S.name.trim(), Headline: S.headline.trim(), Setup: MODES.find(m => m.id === S.mode).name };
    if (d.isQuad) props['Tap zones'] = S.slots.map(d.slotName).join(', ');
    else if (d.isApp) { props['App page'] = 'Assigned during setup after checkout'; props['4-in-1 apps'] = d.activePl.map(p => p[1]).join(', '); }
    else {
      props['Tap opens'] = d.dest.name;
      if (S.dest === 'links') props['4-in-1 apps'] = d.activePl.map(p => p[1]).join(', ');
    }
    destinations.forEach(dest => { props[dest.label + ' URL'] = dest.value || 'To be provided after checkout'; });

    add(d.prod, S.qty, props);
    if (!d.isApp && S.hw.menu) add(HW_MENU, 1);
    if (d.isDirect && S.dest === 'links') add(LINKS, 1);
    if (d.isApp) {
      add(planItem(d.plan, S.yearly), 1, null, true);
      d.activeFeats.filter(f => f.handle).forEach(f => add(f, 1, null, true));
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
  const CO = { open: false, step: 1, done: false, opener: null, error: '', info: { name: '', phone: '', email: '', address: '', city: '', pay: 'GCash', note: '', menuLink: '', menuText: '', menuAttach: false, menuFiles: [] } };
  const PAY = ['GCash', 'Maya', 'Bank transfer', 'Cash on delivery'];
  const coRoot = $('#tf-checkout');
  // A menu step appears whenever we have to build a menu: printed QR menu, the app's live menu, or Menu setup.
  const needsMenu = () => derive().menuOn || !!S.svcs['menu-setup'];
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
    const ph = shotFor(d.prod.id, d) || (d.isQuad ? null : shot('standAcrylic'));
    const line = (name, price, sub = '') => `<div class="co-line"><span><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><em>${price}</em></div>`;
    const extras = [
      d.hwMenuFee ? line(HW_MENU.name, peso(d.hwMenuFee)) : '',
      d.linkFee ? line(LINKS.name, peso(d.linkFee), d.activePl.map(p => p[1]).join(' · ')) : '',
      d.isApp ? line(d.plan.name + ' plan', peso(planPrice(d.plan)) + '/mo', S.yearly ? 'Billed yearly' : 'Billed monthly') : '',
      ...d.activeFeats.filter(f => f.handle).map(f => line(f.name, peso(priceOf(f)) + '/mo')),
      ...d.activeSvcs.map(v => line(v.name, peso(v.price) + (v.monthly ? '/mo' : ''), 'Done-for-you service'))
    ].join('');
    const totals = `<div class="co-totals"><div><span>One-time</span><b>${peso(d.oneTime)}</b></div>${d.monthly ? `<div><span>Monthly</span><b>${peso(d.monthly)}</b></div>` : ''}${d.saved > 0 ? `<div class="lime"><span>You save</span><b>${peso(d.saved)}</b></div>` : ''}</div>`;
    const field = (id, label, type = 'text', extra = '') => `<label class="field co-field">${label}<input id="co-${id}" data-co="${id}" type="${type}" value="${esc(i[id])}" ${extra}></label>`;
    let body;
    const cur = st[CO.step - 1], at = name => st.indexOf(name) + 1;
    if (CO.done) {
      body = `<div class="co-done"><span class="co-done__check">✓</span><h4>Almost done — press Send</h4><p>Your email app opened with the full order for ${esc(S.name.trim())}. ${i.menuAttach && needsMenu() ? '<b class="lime">Attach your menu photos</b>, then press <b>Send</b>' : 'Press <b>Send</b> there'} and we’ll reply to confirm shipping and payment.</p>
        <p class="m3">Nothing opened? Email <a class="fg" href="mailto:${esc(TF.orderEmail)}">${esc(TF.orderEmail)}</a>.</p>
        <button type="button" class="btn btn--light btn--block" data-co-close>Back to the site</button></div>`;
    } else if (cur === 'Review') {
      body = `<div class="co-item">${ph ? `<img src="${ph.src}" alt="" style="object-position:${ph.pos}">` : '<span class="co-item__ph">4×</span>'}
          <div class="co-item__txt"><b>${esc(d.prod.name)}</b><small>${esc(S.name.trim())} · “${esc(S.headline.trim())}”</small><small class="lime">${esc(d.destUrl)}</small>
            <div class="qty qty--sm"><button type="button" data-act="qty" data-arg="-1" aria-label="Decrease quantity">−</button><output>${S.qty}</output><button type="button" class="on" data-act="qty" data-arg="1" aria-label="Increase quantity">+</button></div></div>
          <em>${peso(priceOf(d.prod) * S.qty)}</em></div>
        ${extras ? `<div class="co-lines">${extras}</div>` : ''}${totals}
        <button type="button" class="co-edit" data-co-edit>✎ Edit setup</button>`;
    } else if (cur === 'Menu') {
      body = `<div class="co-form">
        <div class="co-menu-intro"><span class="co-menu-intro__qr">${QR}</span><div><b>Send us your menu</b><span>We type it up, build your mobile menu${d.menuOn && !d.isApp ? ' and print its QR on your stand' : ' and pair it with your stand'}.${S.svcs['menu-setup'] ? ' Menu setup is included, so we also price and photograph it.' : ''}</span></div></div>
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
      body = `<div class="co-form">${field('name', 'Full name', 'text', 'autocomplete="name"')}${field('phone', 'Mobile number', 'tel', 'autocomplete="tel" inputmode="tel" placeholder="09XX XXX XXXX"')}
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
        'Name: ' + i.name.trim(), 'Mobile: ' + i.phone.trim(), i.email.trim() ? 'Email: ' + i.email.trim() : null,
        'Deliver to: ' + i.address.trim() + (i.city.trim() ? ', ' + i.city.trim() : ''), 'Preferred payment: ' + i.pay,
        i.note.trim() ? 'Notes: ' + i.note.trim() : null,
        ...(needsMenu() ? ['', '— MENU —', ...menuLines(), ...(i.menuAttach ? ['📎 Remember to attach your menu photos before sending.'] : [])] : [])
      ].filter(v => v !== null).join('\n');
      (TF.open || (url => { location.href = url; }))('mailto:' + TF.orderEmail + '?subject=' + encodeURIComponent('Order: ' + S.qty + ' × ' + d.prod.name + ' — ' + S.name.trim()) + '&body=' + encodeURIComponent(body));
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
    preset: id => { const p = PRESETS.find(x => x.id === id); set({ ...structuredClone(p.set), preset: id }); },
    product: id => set({ product: id, preset: null }),
    qty: n => set({ qty: Math.max(1, S.qty + +n) }),
    mode: id => set({ mode: id, preset: null }),
    dest: id => set({ dest: id, preset: null }),
    plat: id => {
      if (S.mode === 'direct' && S.dest === 'links' && S.plats[id] && PL.filter(p => S.plats[p[0]]).length <= 2) return set({ error: 'Choose at least two apps for your multi-link page.' });
      set({ plats: { ...S.plats, [id]: !S.plats[id] } });
    },
    slot: i => { const idx = SLOT_OPTS.findIndex(x => x[0] === S.slots[i]); set({ slots: S.slots.map((v, j) => j === +i ? SLOT_OPTS[(idx + 1) % SLOT_OPTS.length][0] : v), slotLinks: S.slotLinks.map((v, j) => j === +i ? '' : v), preset: null }); },
    hwMenu: () => set({ hw: { ...S.hw, menu: !S.hw.menu }, preset: null }),
    feat: id => {
      const feats = { ...S.feats, [id]: !S.feats[id] };
      if (id === 'order' && feats.order) feats.menu = true;
      if (id === 'menu' && !feats.menu) feats.order = false;
      set({ feats });
    },
    menuCat: i => set({ menuCat: +i }),
    plan: id => set({ plan: id }),
    planCta: id => { set({ plan: id, mode: 'app', preset: null }); if (builder) scrollTo('build'); },
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
  [['tf-name', 'name'], ['tf-headline', 'headline'], ['tf-website', 'website']].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { if (S.ordering) { el.value = S[key]; return; } S[key] = el.value; S.error = ''; render(); });
  });
  document.addEventListener('input', e => {
    const el = e.target.closest('[data-url]');
    if (!el || S.ordering) return;
    if (el.dataset.url.startsWith('zone-')) S.slotLinks[Number(el.dataset.url.slice(5))] = el.value;
    else S.links[el.dataset.url] = el.value;
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
    $$('.sec__head, .sec > .sec__titles, .app-card, .app-photo, .dash, .plan, .svc, .reseller').forEach(el => { el.classList.add('rv'); rv.observe(el); });
  }

  document.addEventListener('click', e => { const a = e.target.closest('[data-open-checkout]'); if (a && builder) { e.preventDefault(); order(); } });

  /* ---------- header: denser glass once the page scrolls ---------- */
  const hdr = $('.site-header');
  if (hdr) { const onScroll = () => hdr.classList.toggle('is-scrolled', scrollY > 24); addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  /* ---------- mobile menu: close after picking a link or tapping outside ---------- */
  const mnav = $('.mobile-nav');
  if (mnav) document.addEventListener('click', e => { if (mnav.open && (!mnav.contains(e.target) || e.target.closest('a'))) mnav.open = false; });

  /* ---------- dashboard demo ---------- */
  const dash = $('[data-dash]');
  if (dash) {
    const counts = () => $$('.pipe__col', dash).forEach(c => { $('[data-count]', c).textContent = $$('.deal', c).length; });
    counts();
    dash.addEventListener('click', e => {
      const tab = e.target.closest('[data-dash-tab]');
      if (tab) {
        const id = tab.dataset.dashTab, cap = $('[data-dash-caption]', dash);
        $$('[data-dash-tab]', dash).forEach(b => b.classList.toggle('on', b === tab));
        $$('[data-dash-panel]', dash).forEach(p => { p.hidden = p.dataset.dashPanel !== id; });
        cap.textContent = id === 'analytics' ? cap.dataset.a : cap.dataset.p;
      }
      const mv = e.target.closest('[data-pipe-move]');
      if (mv) {
        const next = mv.closest('.pipe__col').nextElementSibling;
        if (next) next.append(mv.closest('.deal'));
        if (!next || !next.nextElementSibling) mv.remove();
        counts();
      }
    });
    $$('.pipe__col:last-child [data-pipe-move]', dash).forEach(b => b.remove());
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
