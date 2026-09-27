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

  // Hardware: the TAP4.1 L-Stand (finish = Shopify variant, face = what's printed, no business branding) or the 4-Tap Bar.
  const FINISHES = [{ id: 'black', name: 'Glossy Black', sw: '#0a0a0b' }, { id: 'white', name: 'Glossy White', sw: '#f4f3ef' }];
  const standItem = fin => { const f = FINISHES.find(x => x.id === fin) || FINISHES[0]; return { id: 'stand', handle: 'tap4-l-stand', variant: f.name, name: 'TAP4.1 L-Stand · ' + f.name, price: 899, was: 1499 }; };
  const BAR = { id: 'bar', handle: '4-tap-bar', name: '4-Tap Bar', price: 1490, was: 2479 };
  const HW_MENU = { handle: 'printed-qr-menu', name: 'Printed QR menu', price: 499, was: 829 };
  const LINKS = { handle: 'multi-link-page', name: '4-in-1 links page', price: 350, was: 579 };
  const DESIGNS = [
    { id: 'review', name: 'Google Review', short: 'Review', head: 'Leave us a review', desc: 'One tap to your Google review box.' },
    { id: 'menu', name: 'Review + QR menu', short: 'Review + Menu', head: 'Review or menu', desc: 'Tap to review, scan for your menu.', add: HW_MENU, badge: 'RECOMMENDED' },
    { id: 'links', name: 'Socials 4-in-1', short: '4-in-1', head: 'Connect with us', desc: 'Google, FB, IG & TikTok in one tap.', add: LINKS }
  ];
  const designOf = () => S.dest === 'links' ? 'links' : S.hw.menu ? 'menu' : 'review';
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
  const ALL_PLATS = { google: true, facebook: true, instagram: true, tiktok: true };

  const S = {
    name: '', finish: 'black', qty: 1, mode: 'direct', dest: 'google', plats: { ...ALL_PLATS }, slots: ['google', 'facebook', 'instagram', 'tiktok'],
    app: false, feats: { reviews: true, menu: false, order: false, crm: false, wifi: false }, hw: { menu: true }, plan: 'solo', yearly: false, svcs: {}, links: {}, slotLinks: ['', '', '', ''], error: '', ordering: false
  };
  const set = o => { Object.assign(S, { error: '' }, o); render(); };
  // Monthly price of the app as configured in the popup (plan + paid features).
  const appMonthly = plan => planPrice(plan) + FEATS.filter(f => f.handle && S.feats[f.id]).reduce((a, f) => a + priceOf(f), 0);

  function derive() {
    const isQuad = S.mode === 'quad', isApp = S.app;
    const prod = isQuad ? BAR : standItem(S.finish);
    const design = isQuad ? null : designOf();
    const plan = PLANS.find(p => p.id === S.plan) || PLANS[0];
    const activeFeats = isApp ? FEATS.filter(f => S.feats[f.id]) : [];
    const activeSvcs = SVCS.filter(v => S.svcs[v.id]);
    const slotName = id => SLOT_OPTS.find(o => o[0] === id)[1];
    const activePl = isQuad ? PL.filter(p => S.slots.includes(p[0])) : design === 'links' ? PL.filter(p => S.plats[p[0]]) : PL.filter(p => p[0] === 'google');
    const linkFee = design === 'links' ? priceOf(LINKS) : 0;
    const hwMenuFee = design === 'menu' ? priceOf(HW_MENU) : 0;
    const menuOn = !!hwMenuFee || (isApp && !!S.feats.menu);
    const oneTime = priceOf(prod) * S.qty + linkFee + hwMenuFee + activeSvcs.filter(v => !v.monthly).reduce((a, v) => a + v.price, 0);
    const yearly = isApp && S.yearly ? priceOf(planItem(plan, true)) : 0;
    const monthly = (isApp ? (S.yearly ? 0 : priceOf(planItem(plan, false))) + activeFeats.reduce((a, f) => a + priceOf(f), 0) : 0) + activeSvcs.filter(v => v.monthly).reduce((a, v) => a + v.price, 0);
    const dueNow = oneTime + yearly + monthly;
    const saved = (wasOf(prod) ? (wasOf(prod) - priceOf(prod)) * S.qty : 0) + (hwMenuFee && wasOf(HW_MENU) ? wasOf(HW_MENU) - hwMenuFee : 0) + (linkFee && wasOf(LINKS) ? wasOf(LINKS) - linkFee : 0);
    const destUrl = isQuad ? S.slots.map(slotName).join(' · ') : design === 'links' ? '4-in-1 page · ' + activePl.map(p => p[1]).join(', ') : design === 'menu' ? 'Google review (tap) · Menu (scan)' : 'Your Google review box';
    const summary = [
      S.qty + ' × ' + prod.name + (isQuad ? ' · ' + FINISHES.find(x => x.id === S.finish).name : ''),
      isQuad ? '4 taps → ' + S.slots.map(slotName).join(', ') : DESIGNS.find(x => x.id === design).name + ' design' + (design === 'links' ? ' (' + activePl.map(p => p[1]).join(', ') + ')' : ''),
      ...activeFeats.map(f => f.name), isApp ? 'tapfour app · ' + plan.name + ' plan' + (S.yearly ? ' (yearly)' : '') : null, ...activeSvcs.map(v => v.name)
    ].filter(Boolean).join(' · ');
    const catalogItems = [prod, ...(hwMenuFee ? [HW_MENU] : []), ...(linkFee ? [LINKS] : []), ...(isApp ? [planItem(plan, S.yearly), ...activeFeats.filter(f => f.handle)] : [])];
    const demoPrices = catalogItems.some(it => !variant(it.handle, it.variant));
    return { isQuad, isApp, design, prod, plan, activeFeats, activeSvcs, slotName, activePl, linkFee, hwMenuFee, menuOn, oneTime, monthly, yearly, dueNow, demoPrices, saved, destUrl, summary };
  }

  /* ---------- builder views (01 · Build your setup v2) ---------- */
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
  const rec = t => `<span class="rec">★ ${t}</span>`;
  // Brand icon for dark UI (TikTok's black mark turns light); the website slot gets an arrow.
  const brand = (id, size) => { const c = SLOT_OPTS.find(o => o[0] === id)[2]; return c ? ic(id, c === '000000' ? 'f2f0eb' : c, size) : `<span class="ic-web" style="font-size:${size * .8}px">↗</span>`; };

  // Photo for a finish + face. The bar has one photo, so `note` says honestly when yours differs.
  const shot = (key, note = '') => ({ src: TF.img[key], note, wide: key === 'bar4tap' });
  function shotFor(id, d, design = designOf(), finish = S.finish) {
    if (id === 'bar') {
      const notes = [finish === 'white' ? 'Shown in black · yours ships Glossy White' : '', S.slots.join() === 'google,facebook,instagram,tiktok' ? '' : 'Your zones: ' + S.slots.map(d.slotName).join(' / ')];
      return shot('bar4tap', notes.filter(Boolean).join(' · '));
    }
    const few = design === 'links' && d.activePl.length < 4;
    return shot(`l-${finish}-${design}`, few ? 'Printed face shows all 4 icons · your page shows ' + d.activePl.map(p => p[1]).join(', ') : '');
  }

  function viewPreview(d) {
    const ph = shotFor(d.prod.id, d), fin = FINISHES.find(x => x.id === S.finish).name;
    return `<div class="pv-photo${ph.wide ? ' pv-photo--wide' : ''}${S.finish === 'white' ? ' pv-photo--white' : ''}"><img src="${ph.src}" alt="${esc(d.prod.name)}${d.isQuad ? '' : ', ' + DESIGNS.find(x => x.id === d.design).short + ' face'}">
        <span class="pv-cap">${d.isQuad ? '4-TAP BAR' : 'TAP4.1 L-STAND'} · ${fin.toUpperCase()}</span></div>
      ${ph.note ? `<span class="pv-note">ⓘ ${esc(ph.note)}</span>` : ''}
      <div class="pv-url"><span class="lime">TAP OPENS →</span><span>${esc(d.destUrl)}</span></div>`;
  }

  function viewStands() {
    return [
      { id: 'direct', name: 'TAP4.1 L-Stand', desc: '1 chip · 3 face designs', item: standItem(S.finish), g: 'l', badge: 'RECOMMENDED' },
      { id: 'quad', name: '4-Tap Bar', desc: '4 chips · one per app', item: BAR, g: 'bar' }
    ].map(s => {
      const on = S.mode === s.id, was = wasOf(s.item);
      return `<button type="button" class="bo${on ? ' on' : ''}" data-act="stand" data-arg="${s.id}" aria-pressed="${on}">
        <span class="bo__top"><i class="bo__g bo__g--${s.g}"></i>${s.badge ? rec(s.badge) : ''}</span>
        <b>${s.name}</b><span>${s.desc}</span>
        <span class="bo__price"><b>${peso(priceOf(s.item))}</b>${was ? `<s>${peso(was)}</s>` : ''}</span></button>`;
    }).join('');
  }

  function viewFaces(d) {
    if (d.isQuad) return `<div class="zones">${S.slots.map((id, i) => `<button type="button" class="zone" data-act="slot" data-arg="${i}"><span class="mono-11 m3">ZONE ${i + 1}</span><span class="zone__ic">${brand(id, 22)}</span><b>${d.slotName(id)}</b><span class="mono-11 lime">CHANGE ↻</span></button>`).join('')}</div>
      <p class="bld-note">Four chips. Each zone opens its app directly, with no page in between.</p>`;
    return `<div class="faces">${DESIGNS.map(x => {
      const on = d.design === x.id;
      const art = x.id === 'links' ? '<span class="mf__grid"><i></i><i></i><i></i><i></i></span>' : `<i class="mf__ring"></i>${x.id === 'menu' ? `<span class="mf__qr">${QR}</span>` : ''}`;
      return `<button type="button" class="bo bo--face${on ? ' on' : ''}" data-act="design" data-arg="${x.id}" aria-pressed="${on}">
        ${x.badge ? rec(x.badge) : ''}<span class="mf mf--${S.finish} mf--${x.id}"><small>${x.head}</small><span class="mf__art">${art}</span><i class="mf__foot"></i></span>
        <b>${x.short}</b><span>${x.desc}</span><em>${x.add ? '+' + peso(priceOf(x.add)) : 'INCLUDED'}</em></button>`;
    }).join('')}</div>`;
  }

  const viewFinish = () => FINISHES.map(f => `<button type="button" class="fin${S.finish === f.id ? ' on' : ''}" data-act="finish" data-arg="${f.id}" aria-pressed="${S.finish === f.id}"><i style="background:${f.sw}"></i>${f.name}</button>`).join('');

  // Links are optional at this point: blank = "send after checkout", anything typed must look right.
  const urlOk = v => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.includes('.'); } catch (_) { return false; } };
  const urlState = (v, google) => {
    v = (v || '').trim();
    if (!v) return ['', 'Optional now'];
    const ok = google ? googleOk(v) : urlOk(v);
    return [ok ? 'ok' : 'bad', ok ? '✓ Looks right' : google ? 'Not a Google Maps link' : 'Needs https://'];
  };
  function viewLinks(d) {
    let html = '';
    if (d.design === 'links') html += `<div class="stack-10"><span class="bld-sub">Apps on your 4-in-1 page · ${d.activePl.length} of 4</span>
      <div class="chips-row">${PL.map(([id, name, col]) => { const on = !!S.plats[id]; return `<button type="button" class="pchip${on ? ' on' : ''}" data-act="plat" data-arg="${id}" aria-pressed="${on}">${ic(id, on ? col : '8a8883', 16)}${name}</button>`; }).join('')}</div></div>`;
    const keys = d.isQuad
      ? S.slots.map((id, i) => ['zone-' + i, id, `Zone ${i + 1} · ${id === 'google' ? 'Google Maps' : d.slotName(id)} link`, S.slotLinks[i]])
      : d.activePl.map(([id, name]) => [id, id, id === 'google' ? 'Google Maps link' : name + ' link', S.links[id]]);
    html += keys.map(([k, id, label, v]) => {
      const [st, msg] = urlState(v, id === 'google');
      return `<label class="lf"><span class="lf__h"><span>${brand(id, 16)}${esc(label)}</span><em class="${st}">${msg}</em></span><input id="tf-url-${k}" class="${st}" type="url" inputmode="url" autocomplete="url" data-url="${k}" value="${esc(v || '')}" placeholder="${id === 'google' ? 'https://maps.app.goo.gl/…' : 'https://…'}"></label>`;
    }).join('');
    if (keys.some(k => k[1] === 'google')) html += googleGuide();
    if (d.menuOn) html += `<div class="bld-ok"><span>✓</span>Menu: send it at checkout (a file, a link or typed out). We type it up${d.hwMenuFee ? ' and print its QR on your stand' : ' and set up your live menu'}.</div>`;
    html += '<p class="bld-note">Not ready? Leave it blank and send your links after checkout.</p>';
    return html;
  }

  // Customers paste their Google Maps link; tapfour staff turn it into the review link in the admin.
  const isGoogleLink = url => /(^|\.)(google\.[a-z.]+|goo\.gl|g\.page|g\.co|share\.google)$/.test(url.hostname);
  const googleOk = v => { try { const u = new URL(String(v || '').trim()); return /^https?:$/.test(u.protocol) && isGoogleLink(u); } catch (_) { return false; } };
  const googleGuide = () => `<details class="guide"${S.guideOpen ? ' open' : ''}><summary><span class="guide__ic">?</span>How do I find my Google Maps link?<em>30 sec</em></summary>
      <ol class="guide__steps">
        <li>Open <a href="https://www.google.com/maps" target="_blank" rel="noopener">Google Maps ↗</a> and search your <b>business name</b>.</li>
        <li>Tap your business, then tap <b>Share</b>.</li>
        <li>Tap <b>Copy link</b> and paste it above. It looks like <code>https://maps.app.goo.gl/…</code></li>
      </ol>
      <p class="guide__note">That’s all we need — our team sets up the review link your stand opens.</p>
      <div class="guide__links"><a href="https://business.google.com/en-all/business-profile/" target="_blank" rel="noopener">Not on Google Maps yet? Add your business free ↗</a><a href="mailto:${esc(TF.orderEmail || 'hello@tapfour.ph')}?subject=${encodeURIComponent('Help finding my Google Maps link')}">Stuck? Email us ↗</a></div>
    </details>`;

  const toggleRow = (f, on, act, priceLabel) => `<button type="button" class="feat${on ? ' on' : ''}" data-act="${act}" data-arg="${f.id || ''}" aria-pressed="${on}"${f.handle ? '' : ' disabled'}>
      <span class="tgl tgl--lg${on ? ' on' : ''}"></span>
      <span class="feat__body"><span class="feat__name"><b>${f.name}</b>${f.badge ? rec(f.badge) : ''}</span><span class="feat__desc">${f.desc}</span>
        <span class="feat__pts">${f.points.map(p => `<span><i>•</i>${p}</span>`).join('')}</span></span>
      <span class="feat__p">${priceLabel}</span></button>`;

  function viewExtra(d) {
    const picked = FEATS.filter(f => f.handle && S.feats[f.id]);
    const svcs = SVCS.filter(v => !v.monthly);
    return `<div class="step__h"><span class="step__n step__n--plus">+</span><b>Optional extras</b><em>SKIP IF YOU LIKE</em></div>
      <div class="appx${S.app ? ' on' : ''}">
        <button type="button" class="appx__main" data-act="app" aria-pressed="${S.app}">
          <span class="tgl tgl--lg${S.app ? ' on' : ''}"></span>
          <span class="appx__body"><span class="appx__name">${leaf(17)}<b>tapfour app</b><em>${peso(appMonthly(d.plan))}/mo</em></span>
            <span class="appx__desc">Edit your links anytime, with no reprint. See taps, review page opens and menu opens for every stand.</span>
            <span class="mono-11 m3">CANCEL ANYTIME · YOUR STAND KEEPS WORKING</span></span></button>
        <button type="button" class="appx__more" data-act="appPop"><span>${picked.length ? '✓ ' + picked.map(f => f.name).join(' · ') : 'Order from the table · Live menu · Wi-Fi · Guest data'}</span><b>${picked.length ? 'Edit' : 'See features'} →</b></button>
      </div>
      ${svcs.length ? `<div class="stack-10"><span class="bld-sub">Done-for-you, pay once</span>
        <div class="chips-row">${svcs.map(v => { const on = !!S.svcs[v.id]; return `<button type="button" class="pchip pchip--svc${on ? ' on' : ''}" data-act="svc" data-arg="${v.id}" aria-pressed="${on}"${v.available ? '' : ' disabled'}>${esc(v.name)}<em>+${peso(v.price)}</em></button>`; }).join('')}</div></div>` : ''}`;
  }

  function viewSummary(d) {
    const fin = S.finish === 'white' ? 'White' : 'Black';
    const lines = [
      [`${S.qty} × ${d.isQuad ? '4-Tap Bar' : 'TAP4.1 L-Stand'} · ${fin}${d.isQuad ? '' : ' · ' + DESIGNS.find(x => x.id === d.design).short}`, peso(priceOf(d.prod) * S.qty)],
      d.hwMenuFee ? [HW_MENU.name, peso(d.hwMenuFee)] : null,
      d.linkFee ? [`${LINKS.name} (${d.activePl.length} apps)`, peso(d.linkFee)] : null,
      ...d.activeSvcs.map(v => [v.name, peso(v.price) + (v.monthly ? '/mo' : '')]),
      d.isApp ? [`tapfour app · ${d.plan.name} · first ${S.yearly ? 'year' : 'month'}`, peso(S.yearly ? d.yearly : priceOf(planItem(d.plan, false)))] : null,
      ...d.activeFeats.filter(f => f.handle).map(f => [f.name + ' · first month', peso(priceOf(f))])
    ].filter(Boolean);
    const label = TF.sale.label ? TF.sale.label + ' · ' : '', deadline = countdown();
    const then = d.monthly ? `Then ${peso(d.monthly)}/mo. Cancel anytime.` : d.yearly ? `Renews yearly at ${peso(d.yearly)}.` : '';
    return `<div class="sum__h"><b>Your setup</b><span>PROGRAMMED BEFORE IT SHIPS</span></div>
      <div class="sum__lines">${lines.map(([n, p]) => `<div><span>${esc(n)}</span><b>${p}</b></div>`).join('')}</div>
      <div class="sum__foot"><div class="sum__due"><span>${d.demoPrices ? 'ESTIMATED TOTAL' : 'DUE TODAY'}</span><b>${peso(d.dueNow)}</b>
          ${d.saved > 0 ? `<em>${esc(label)}You save ${peso(d.saved)} · free shipping${deadline && deadline !== 'Offer ended' ? ' · ends <span data-countdown>' + deadline + '</span>' : ''}</em>` : ''}
          ${then ? `<small>${then}</small>` : ''}</div>
        <button type="button" class="btn btn--dark btn--lg" data-act="order"${S.ordering || d.demoPrices ? ' disabled' : ''}>${S.ordering ? 'Adding to cart…' : d.demoPrices ? 'Ordering unavailable' : 'Checkout →'}</button></div>
      ${d.demoPrices ? '<div class="summary__err">Sample prices shown. Ordering is unavailable until these products are configured.</div>' : ''}
      ${TF.sale.stock > 0 ? `<div class="sum__stock">Only ${TF.sale.stock} stands left at sale price · Ships nationwide in 3–5 days</div>` : ''}
      ${S.error ? `<div class="summary__err" role="alert">${esc(S.error)}</div>` : ''}`;
  }

  /* ---------- tapfour app popup (from Optional extras) ---------- */
  const appRoot = $('#tf-app');
  let appOpener = null;
  function renderApp() {
    if (!appRoot || appRoot.hidden) return;
    const plan = PLANS.find(p => p.id === S.plan) || PLANS[0];
    $('.co__panel', appRoot).innerHTML = `<div class="co__head"><div class="app-pop__id">${leaf(34)}<div><span class="mono-11 m3">OPTIONAL · MONTHLY</span><h3 id="app-title">tapfour app</h3></div></div><button type="button" class="co__x" data-app-close aria-label="Close">×</button></div>
      <div class="co__body">
        <p class="app-pop__lead">Run the counter from your phone: live menu, table orders, guest data and tap stats in one dashboard. Cancel anytime and your stand keeps working.</p>
        <div class="stack-10"><span class="bld-sub">Dashboard plan</span><div class="seg seg--sm app-pop__plans">${PLANS.map(p => `<button type="button" class="${S.plan === p.id ? 'on' : ''}" data-act="plan" data-arg="${p.id}" aria-pressed="${S.plan === p.id}">${p.name}<small>${peso(planPrice(p))}/mo</small></button>`).join('')}</div></div>
        <div class="stack-10"><span class="bld-sub">Features · add what you need</span>${FEATS.map(f => toggleRow(f, !!S.feats[f.id], 'feat', f.handle ? '+' + peso(priceOf(f)) + '/mo' : 'INCLUDED')).join('')}</div>
      </div>
      <div class="co-foot">${S.app ? '<button type="button" class="btn btn--ghost" data-act="appRemove">Remove app</button>' : ''}<button type="button" class="btn btn--lime btn--lg app-pop__cta" data-act="appAdd">${S.app ? 'Done' : 'Add to my setup'} · ${peso(appMonthly(plan))}/mo</button></div>`;
  }
  function openApp() {
    if (!appRoot) return;
    appOpener = document.activeElement;
    appRoot.hidden = false;
    document.documentElement.classList.add('co-lock');
    renderApp();
    requestAnimationFrame(() => { appRoot.classList.add('on'); $('.co__x', appRoot)?.focus(); });
  }
  function closeApp() {
    appRoot.classList.remove('on');
    document.documentElement.classList.remove('co-lock');
    setTimeout(() => { if (!appRoot.classList.contains('on')) appRoot.hidden = true; }, 300);
    appOpener?.focus?.({ preventScroll: true });
  }
  if (appRoot) {
    appRoot.addEventListener('click', e => { if (e.target.closest('[data-app-close]')) closeApp(); });
    document.addEventListener('keydown', e => { if (!appRoot.hidden && e.key === 'Escape') closeApp(); });
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

  /* ---------- hero (1b): three faces + finish + selected offer, same state as the builder ---------- */
  const HERO = { review: ['Review', 'One tap opens your Google review box.'], menu: ['Review + Menu', 'Tap to review, scan the QR for your menu.'], links: ['4-in-1', 'One tap opens Google, Facebook, Instagram and TikTok.'] };
  let heroFace = null;
  function renderHero() {
    const hero = $('[data-hero]');
    if (!hero) return;
    const face = designOf(), stand = standItem(S.finish);
    const cost = id => {
      const parts = [stand, ...(id === 'menu' ? [HW_MENU] : id === 'links' ? [LINKS] : [])];
      return { now: parts.reduce((a, x) => a + priceOf(x), 0), was: parts.reduce((a, x) => a + (wasOf(x) || priceOf(x)), 0) };
    };
    $$('.h4-face', hero).forEach(b => {
      const id = b.dataset.arg, on = id === face, img = $('[data-face-img]', b), src = TF.img[`l-${S.finish}-${id}`];
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      if (src && img.getAttribute('src') !== src) img.src = src;
      $('[data-face-price]', b).textContent = peso(cost(id).now);
      $('.h4-face__dot', b).textContent = on ? '✓' : '→';
    });
    $$('.h4__dots i', hero).forEach((dot, i) => dot.classList.toggle('on', ['review', 'menu', 'links'][i] === face));
    $$('.h4__finish button', hero).forEach(b => b.classList.toggle('on', b.dataset.arg === S.finish));
    const c = cost(face), [name, desc] = HERO[face];
    $('[data-offer-name]', hero).textContent = name;
    $('[data-offer-now]', hero).textContent = peso(c.now);
    $('[data-offer-was]', hero).textContent = c.was > c.now ? peso(c.was) : '';
    $('[data-offer-desc]', hero).textContent = desc;
    $('[data-offer-cta]', hero).textContent = `Order ${name} →`;
    // Mobile swipe row: keep the selected face centred.
    if (heroFace !== face) {
      const row = $('[data-hero-faces]', hero), card = $(`.h4-face[data-arg="${face}"]`, hero);
      const smooth = !!heroFace; // first centring is instant; later changes glide
      if (row.scrollWidth > row.clientWidth) setTimeout(() => row.scrollTo({ left: card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' }), smooth ? 360 : 0);
      heroFace = face;
    }
  }

  const builder = $('[data-builder]');
  function render() {
    const focused = document.activeElement;
    const focusKey = focused && { id: focused.id, act: focused.dataset.act, arg: focused.dataset.arg, start: focused.selectionStart, end: focused.selectionEnd };
    renderPlans();
    renderServices();
    renderHero();
    if (!builder) return;
    const d = derive();
    builder.setAttribute('aria-busy', S.ordering);
    $('#tf-preview').innerHTML = viewPreview(d);
    $('#tf-stands').innerHTML = viewStands();
    $('#tf-face-title').textContent = d.isQuad ? 'Set the four zones' : 'Pick the face';
    $('#tf-face-tag').textContent = d.isQuad ? 'TAP A ZONE TO CHANGE IT' : 'PRINTED · NO BUSINESS BRANDING';
    $('#tf-faces').innerHTML = viewFaces(d);
    $('#tf-finish').innerHTML = viewFinish();
    $('#tf-qty').textContent = S.qty;
    $('#tf-links').innerHTML = viewLinks(d);
    $('#tf-extra').innerHTML = viewExtra(d);
    $('#tf-summary').innerHTML = viewSummary(d);
    renderApp();
    renderCheckout();
    $('#tf-bar-total').textContent = peso(d.oneTime) + (d.monthly ? ' + ' + peso(d.monthly) + '/mo' : '');
    for (const [id, key] of [['tf-name', 'name']]) {
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
    if (!S.name.trim()) return reject('Enter your business name so we know who the order is for.', 'tf-name');
    if (d.design === 'links' && d.activePl.length < 2) return reject('Choose at least two apps for your multi-link page.');
    if (d.isApp && S.feats.order && !S.feats.menu) return reject('Table ordering requires the live QR menu.');
    const destinations = d.isQuad
      ? S.slots.map((id, i) => ({ label: 'Tap ' + (i + 1) + ' · ' + d.slotName(id), plat: id, value: S.slotLinks[i], input: 'tf-url-zone-' + i }))
      : d.activePl.map(([id, label]) => ({ label, plat: id, value: S.links[id], input: 'tf-url-' + id }));
    destinations.forEach(dest => { if (dest.plat === 'google') dest.label = d.isQuad ? dest.label + ' Maps' : 'Google Maps'; });
    for (const dest of destinations) {
      dest.value = (dest.value || '').trim();
      if (!dest.value) continue; // optional: sent after checkout
      try {
        const url = new URL(dest.value);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Invalid URL');
        if (dest.plat === 'google' && !isGoogleLink(url)) return reject((d.isQuad ? dest.label + ': paste' : 'Paste') + ' your Google Maps link (in Google Maps: Share → Copy link).', dest.input);
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
    const props = { 'Business name': S.name.trim(), Setup: (d.isQuad ? '4-Tap Bar' : 'TAP4.1 L-Stand') + (d.isApp ? ' + tapfour app' : ''), Finish: FINISHES.find(x => x.id === S.finish).name };
    if (d.isQuad) props['Tap zones'] = S.slots.map(d.slotName).join(', ');
    else {
      Object.assign(props, { Design: DESIGNS.find(x => x.id === d.design).name, 'Tap opens': d.destUrl });
      if (d.design === 'links') props['4-in-1 apps'] = d.activePl.map(p => p[1]).join(', ');
    }
    if (d.isApp) props['App page'] = 'Assigned during setup after checkout';
    destinations.forEach(dest => { props[dest.label + (dest.plat === 'google' ? ' link' : ' URL')] = dest.value || 'To be provided after checkout'; });
    if (destinations.some(dest => dest.plat === 'google' && dest.value)) props['Google review link'] = 'tapfour sets it up from the Maps link';

    add(d.prod, S.qty, props);
    if (d.hwMenuFee) add(HW_MENU, 1);
    if (d.linkFee) add(LINKS, 1);
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
    const ph = shotFor(d.prod.id, d);
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
      body = `<div class="co-item"><img src="${ph.src}" alt="">
          <div class="co-item__txt"><b>${esc(d.prod.name)}</b><small>${esc(d.isQuad ? S.name.trim() : DESIGNS.find(x => x.id === d.design).name + ' design · for ' + S.name.trim())}</small><small class="lime">${esc(d.destUrl)}</small>
            <div class="qty qty--sm"><button type="button" data-act="qty" data-arg="-1" aria-label="Decrease quantity">−</button><output>${S.qty}</output><button type="button" class="on" data-act="qty" data-arg="1" aria-label="Increase quantity">+</button></div></div>
          <em>${peso(priceOf(d.prod) * S.qty)}</em></div>
        ${extras ? `<div class="co-lines">${extras}</div>` : ''}${totals}
        <button type="button" class="co-edit" data-co-edit>✎ Edit setup</button>`;
    } else if (cur === 'Menu') {
      body = `<div class="co-form">
        <div class="co-menu-intro"><span class="co-menu-intro__qr">${QR}</span><div><b>Send us your menu</b><span>We type it up, build your mobile menu${d.hwMenuFee ? ' and print its QR on your stand' : ' and pair it with your stand'}.${S.svcs['menu-setup'] ? ' Menu setup is included, so we also price and photograph it.' : ''}</span></div></div>
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
    finish: id => set({ finish: id }),
    stand: id => set({ mode: id }),
    heroFace: id => ACTS.design(id, 'direct'),
    heroOrder: () => { set({ mode: 'direct' }); scrollTo('build'); },
    design: (id, mode) => set({ dest: id === 'links' ? 'links' : 'google', hw: { ...S.hw, menu: id === 'menu' }, plats: id === 'links' ? { ...ALL_PLATS } : S.plats, ...(typeof mode === 'string' && { mode }) }),
    qty: n => set({ qty: Math.max(1, S.qty + +n) }),
    plat: id => {
      if (S.dest === 'links' && S.plats[id] && PL.filter(p => S.plats[p[0]]).length <= 2) return set({ error: 'Choose at least two apps for your multi-link page.' });
      set({ plats: { ...S.plats, [id]: !S.plats[id] } });
    },
    slot: i => { const idx = SLOT_OPTS.findIndex(x => x[0] === S.slots[i]); set({ slots: S.slots.map((v, j) => j === +i ? SLOT_OPTS[(idx + 1) % SLOT_OPTS.length][0] : v), slotLinks: S.slotLinks.map((v, j) => j === +i ? '' : v) }); },
    feat: id => {
      const feats = { ...S.feats, [id]: !S.feats[id] };
      if (id === 'order' && feats.order) feats.menu = true;
      if (id === 'menu' && !feats.menu) feats.order = false;
      set({ feats });
    },
    plan: id => set({ plan: id }),
    planCta: id => { set({ plan: id, app: true }); if (builder) scrollTo('build'); },
    app: () => set({ app: !S.app }),
    appPop: () => openApp(),
    appAdd: () => { set({ app: true }); closeApp(); },
    appRemove: () => { set({ app: false }); closeApp(); },
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
  [['tf-name', 'name']].forEach(([id, key]) => {
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
  document.addEventListener('toggle', e => { if (e.target.matches?.('.guide')) S.guideOpen = e.target.open; }, true);
  render();
  // Photos and fonts change the swipe row's widths, so centre the selected face again once they've loaded.
  addEventListener('load', () => { heroFace = null; renderHero(); });
  // Mobile hero fills one screen: tell CSS how tall the sale bar + header are.
  const heroTop = () => document.documentElement.style.setProperty('--hero-top', (($('.sale-bar')?.offsetHeight || 0) + ($('.site-header')?.offsetHeight || 0)) + 'px');
  heroTop();
  addEventListener('resize', heroTop, { passive: true });

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
