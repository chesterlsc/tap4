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
    { id: 'card', handle: 'nfc-card-4-in-1', name: '4-in-1 NFC Card', desc: 'Matte black PVC, CR80 size', price: 249, was: 419 }
  ];
  const BAR = { id: 'bar', handle: '4-tap-bar', name: '4-Tap Bar', desc: 'Long acrylic bar · 4 NFC zones', price: 1490, was: 2479 };
  const HW_MENU = { handle: 'printed-qr-menu', name: 'Printed QR menu', price: 499, was: 829, badge: 'RECOMMENDED', desc: 'We build your mobile menu and print its QR right on the stand.', points: ['Send a photo of your menu — we type it up', 'QR printed on the stand face', '1 free price update per year'] };
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
  const set = o => { Object.assign(S, { error: '', sent: false }, o); render(); };

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
  const presetPhoto = p => p.set.product === 'card' ? TF.img.cardNfc : p.id === 'app' ? TF.img.standCombo : p.id === 'menu' ? TF.img.standAcrylicKn : TF.img.standAcrylic;
  function viewPresets() {
    return PRESETS.map(p => {
      const on = S.preset === p.id, hw = HW.find(x => x.id === p.set.product), isAppP = p.set.mode === 'app';
      const parts = [hw, !isAppP && p.set.hw.menu ? HW_MENU : null, p.set.dest === 'links' ? LINKS : null].filter(Boolean);
      const one = parts.reduce((a, x) => a + priceOf(x), 0), was = parts.reduce((a, x) => a + (wasOf(x) || priceOf(x)), 0);
      const mo = isAppP ? '+ ' + peso(priceOf(planItem(PLANS[0], false)) + priceOf(FEATS[1]) + priceOf(FEATS[2])) + '/mo · cancel anytime' : 'No subscription';
      const pos = p.set.product === 'card' ? 'center 60%' : p.id === 'google' ? 'center 55%' : 'center 40%';
      return `<button type="button" class="preset${on ? ' on' : ''}${p.badge ? ' rec' : ''}" data-act="preset" data-arg="${p.id}" aria-pressed="${on}">
        <span class="preset__img"><img src="${presetPhoto(p)}" alt="" loading="lazy" style="object-position:${pos}"><span class="preset__shade"></span>
          <span class="preset__tags"><span class="tag tag--glass">${p.tag}</span>${p.badge ? `<span class="tag tag--lime">★ ${p.badge}</span>` : ''}</span></span>
        <span class="preset__body"><span class="preset__name">${p.name}</span><span class="preset__desc">${p.desc}</span></span>
        <span class="preset__foot"><span class="preset__prices"><span class="preset__row"><b>${peso(one)}</b>${was > one ? `<s>${peso(was)}</s>` : ''}<small>one-time</small></span><span class="preset__mo">${mo}</span></span><span class="preset__btn">${on ? '✓' : '→'}</span></span>
      </button>`;
    }).join('');
  }

  function viewPreview(d) {
    const shift = d.menuOn ? (d.isQuad ? '-60px' : '-100px') : '0px';
    const photo = d.isApp ? TF.img.standCombo : d.prod.id === 'card' ? TF.img.cardNfc : d.prod.id === 'l' ? TF.img.standLKn : d.menuOn ? TF.img.standAcrylicKn : TF.img.standAcrylic;
    let stage = '<div class="pv-glow"></div>';
    if (!d.isQuad) {
      stage += `<div class="pv-photo" style="transform:translateX(${shift})"><img src="${photo}" alt="${esc(d.prod.name)} sample"><span class="pv-cap">${d.isApp ? 'COMBO STAND · APP' : d.prod.name.toUpperCase()} · SAMPLE PRINT</span></div>`;
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

  function viewHardware(d) {
    return (d.isQuad ? [BAR] : HW).map(p => {
      const on = d.prod.id === p.id, was = wasOf(p);
      return `<button type="button" class="opt${on ? ' on' : ''}" ${p.id === 'bar' ? 'disabled' : `data-act="product" data-arg="${p.id}"`} aria-pressed="${on}">
        <b>${p.name}</b><span>${p.desc}</span><span class="opt__price"><em>${peso(priceOf(p))} ea</em>${was ? `<s>${peso(was)}</s>` : ''}</span></button>`;
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
      <button type="button" class="btn btn--dark btn--lg btn--block" data-act="order"${S.ordering || d.demoPrices ? ' disabled' : ''}>${S.ordering ? 'Adding to cart…' : d.demoPrices ? 'Ordering unavailable' : (TF.orderEmail ? 'Email my order · ' : 'Order for ') + peso(d.dueNow) + ' →'}</button>
      ${S.sent ? `<div class="s13" role="status">Your email app should open with the order filled in. Nothing opened? Email <a class="fg" href="mailto:${esc(TF.orderEmail)}">${esc(TF.orderEmail)}</a>.</div>` : ''}
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
  async function order() {
    if (S.ordering) return;
    const d = derive(), items = [], missing = [], missingPlans = [];
    const reject = (message, inputId) => {
      set({ error: message });
      if (inputId) document.getElementById(inputId)?.focus({ preventScroll: true });
    };
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
    if (TF.orderEmail) {
      // No checkout on the static site: hand the full setup to the customer's mail app.
      const body = [
        'Hi tapfour, I’d like to order this setup:', '', d.summary, '',
        ...Object.entries(props).map(([k, v]) => k + ': ' + v), '',
        'One-time: ' + peso(d.oneTime), d.monthly ? 'Monthly: ' + peso(d.monthly) : null, '',
        'Delivery address:', 'Contact number:'
      ].filter(v => v !== null).join('\n');
      (TF.open || (url => { location.href = url; }))('mailto:' + TF.orderEmail + '?subject=' + encodeURIComponent('Order: ' + S.qty + ' × ' + d.prod.name + ' — ' + S.name.trim()) + '&body=' + encodeURIComponent(body));
      return set({ error: '', sent: true });
    }
    set({ ordering: true });
    try {
      const r = await fetch(TF.cartAddUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).description || 'Could not add to cart.');
      location.href = TF.cartUrl;
    } catch (e) {
      set({ ordering: false, error: e.message || 'Could not add to cart. Please try again.' });
    }
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
    order: (_, btn) => order(btn)
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
