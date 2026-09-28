import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { renderSite, createPreview, ROOT } from '../scripts/preview.mjs';

const site = renderSite();

test('every preview route renders the full layout', async () => {
  const { pages } = await site;
  for (const [route, html] of pages) assert.match(html, /<\/html>\s*$/, route);
});

test('builder sends the configured setup to /cart/add.js', async t => {
  const { pages, catalog } = await site;
  const dom = new JSDOM(pages.get('/'), { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  t.after(() => w.close());
  let sent;
  w.fetch = async (url, options) => { sent = { url, body: JSON.parse(options.body) }; return { ok: true, json: async () => ({}) }; };
  w.structuredClone ??= structuredClone;
  w.scrollTo = () => {};
  w.eval(await fs.readFile(path.join(ROOT, 'assets/theme.js'), 'utf8'));
  const $ = s => w.document.querySelector(s);

  const input = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  assert.match($('#tf-summary').textContent, /₱1,398/); // Review + Menu is the default face
  input($('#tf-url-google'), 'https://example.com/kape');
  assert.match($('#tf-link-msg').textContent, /doesn’t look like a Google Maps link/);
  $('[data-act="order"]').click();
  assert.match($('#tf-summary').textContent, /Google Maps link/, 'blocks a link that is not from Google Maps');
  input($('#tf-url-google'), 'https://maps.app.goo.gl/KapeNorte123');
  assert.match($('#tf-link-msg').textContent, /Found it/);
  $('[data-act="order"]').click();
  assert.ok(!$('#tf-checkout').hidden, 'checkout panel opens');
  $('.co-cta').click(); // review -> menu (printed QR menu needs one)
  $('[data-co-submit]').click();
  assert.match($('.co-foot').textContent, /Add your menu/);
  const menu = $('#co-menuLink');
  menu.value = 'https://drive.google.com/menu';
  menu.dispatchEvent(new w.Event('input', { bubbles: true }));
  $('[data-co-submit]').click();
  await new Promise(r => setTimeout(r, 0));

  const id = handle => catalog[handle].variants[0].id;
  assert.equal(sent.url, '/cart/add.js');
  assert.deepEqual(sent.body.items.map(i => i.id), [id('tap4-l-stand'), id('printed-qr-menu')]); // Glossy Black is the first variant
  assert.equal(sent.body.items[0].properties.Finish, 'Glossy Black');
  assert.equal(sent.body.items[0].properties.Design, 'Review + QR menu');
  assert.equal(sent.body.items[0].properties['Google Maps link'], 'https://maps.app.goo.gl/KapeNorte123');
  assert.equal(sent.body.items[0].properties['Google review link'], 'tapfour sets it up from the Maps link');
  assert.equal(sent.body.items[0].properties['Menu link'], 'https://drive.google.com/menu');
});

test('static site (tap4.ph) sends the order by email', async t => {
  const preview = await createPreview({ orderEmail: 'orders@example.com' });
  const { html } = await preview.renderPage('/');
  assert.doesNotMatch(html, /href="\/cart"|Local theme preview/);
  assert.match(html, /data-open-checkout/);
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://tap4.ph/', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  t.after(() => w.close());
  let opened;
  w.TF.open = url => { opened = url; };
  w.structuredClone ??= structuredClone;
  w.scrollTo = () => {};
  w.eval(await fs.readFile(path.join(ROOT, 'assets/theme.js'), 'utf8'));
  const $ = s => w.document.querySelector(s);
  const url = $('#tf-url-google');
  url.value = 'https://maps.app.goo.gl/KapeNorte123';
  url.dispatchEvent(new w.Event('input', { bubbles: true }));
  $('[data-act="order"]').click();
  $('.co-cta').click(); // review -> menu
  $('.co-cta').click(); // a menu is required
  assert.match($('.co-foot').textContent, /Add your menu/);
  const items = $('#co-menuText');
  items.value = 'Sagada Latte — ₱165';
  items.dispatchEvent(new w.Event('input', { bubbles: true }));
  $('.co-cta').click(); // menu -> details
  $('.co-cta').click(); // details are required
  assert.match($('.co-foot').textContent, /Enter your business name/);
  const fill = (id, v) => { const el = $('#co-' + id); el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  fill('business', 'Kape Norte'); fill('name', 'Juan Dela Cruz'); fill('phone', '0917 123 4567'); fill('address', '12 Session Rd, Baguio');
  $('.co-cta').click(); // details -> confirm
  $('[data-co-submit]').click();
  await new Promise(r => setTimeout(r, 0));
  assert.match(opened, /^mailto:orders@example\.com\?subject=/);
  const body = decodeURIComponent(opened.split('&body=')[1]);
  assert.match(body, /Business name: Kape Norte/);
  assert.match(body, /Google Maps link: https:\/\/maps\.app\.goo\.gl\/KapeNorte123/);
  assert.match(body, /Google review link: tapfour sets it up from the Maps link/);
  assert.match(body, /One-time: ₱1,398/);
  assert.match(body, /Finish: Glossy Black/);
  assert.match(body, /Design: Review \+ QR menu/);
  assert.match(body, /Mobile: 0917 123 4567/);
  assert.match(body, /Deliver to: 12 Session Rd, Baguio/);
  assert.match(body, /Menu items:\nSagada Latte — ₱165/);
});

test('checkout uploads a menu file and puts its link in the order email', async t => {
  const preview = await createPreview({ orderEmail: 'orders@example.com', menuUploadUrl: 'https://go.example/upload/menu' });
  const { html } = await preview.renderPage('/');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://tap4.ph/', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  t.after(() => w.close());
  let opened, uploadedTo;
  w.TF.open = url => { opened = url; };
  w.fetch = async (url, options) => { uploadedTo = url; assert.ok(options.body instanceof w.FormData); return { ok: true, json: async () => ({ url: 'https://go.example/m/abc', size: 2048 }) }; };
  w.structuredClone ??= structuredClone;
  w.scrollTo = () => {};
  w.eval(await fs.readFile(path.join(ROOT, 'assets/theme.js'), 'utf8'));
  const $ = s => w.document.querySelector(s);
  const input = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const tick = () => new Promise(r => setTimeout(r, 0));

  // Google link left blank: sent after checkout
  $('[data-act="order"]').click();
  $('.co-cta').click(); // review -> menu
  const files = $('#co-menuFiles');
  Object.defineProperty(files, 'files', { value: [new w.File(['%PDF-1.4'], 'menu.pdf', { type: 'application/pdf' })] });
  files.dispatchEvent(new w.Event('change', { bubbles: true }));
  await tick(); await tick();
  assert.equal(uploadedTo, 'https://go.example/upload/menu');
  assert.match($('.co-files').textContent, /Uploaded/);
  $('.co-cta').click(); // menu -> details
  input($('#co-business'), 'Ana’s Café'); input($('#co-name'), 'Ana Reyes'); input($('#co-phone'), '0917 000 0001'); input($('#co-address'), 'Maginhawa St, QC');
  $('.co-cta').click(); // details -> confirm
  $('[data-co-submit]').click();
  const body = decodeURIComponent(opened.split('&body=')[1]);
  assert.match(body, /Menu files:\nmenu\.pdf — https:\/\/go\.example\/m\/abc/);
  assert.match(body, /Google Maps link: To be provided after checkout/);
});

test('hero map climb + builder: face, finish, links and the guest preview', async t => {
  const { pages, catalog } = await site;
  const dom = new JSDOM(pages.get('/'), { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  t.after(() => w.close());
  let sent;
  w.fetch = async (url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({}) }; };
  w.scrollTo = () => {};
  w.eval(await fs.readFile(path.join(ROOT, 'assets/theme.js'), 'utf8'));
  const $ = s => w.document.querySelector(s);
  const heroImg = () => $('[data-hero-img]').getAttribute('src'), thumb = () => $('#tf-stand img').getAttribute('src');

  // Hero opens on the Review + QR menu stand; the map shows your shop at #1 "with tapfour".
  assert.match(heroImg(), /tapfour-l-black-menu/);
  assert.equal($('[data-hero-name]').textContent, 'Review + QR menu stand');
  assert.match($('[data-hero-cta]').textContent, /Get this stand · ₱1,398/);
  assert.match($('.hm-rank').textContent, /#1Your shop/);
  $('[data-act="heroBa"][data-arg="0"]').click();
  assert.match($('.hm-rank').textContent, /Café Uno/);
  assert.match(w.document.querySelectorAll('.hm-rank')[2].textContent, /#3Your shop.*18 reviews/s);

  // Picking a face or finish in the hero drives the builder.
  $('[data-act="heroFace"][data-arg="review"]').click();
  assert.equal($('[data-hero-now]').textContent, '₱899');
  assert.match(thumb(), /tapfour-l-black-review/);
  assert.match($('#tf-preview').textContent, /WRITE A REVIEW/);
  $('.hm-seg [data-act="finish"][data-arg="white"]').click();
  assert.match(heroImg(), /tapfour-l-white-review/);
  assert.match(thumb(), /tapfour-l-white-review/);
  $('[data-act="design"][data-arg="links"]').click();
  assert.ok(!$('#tf-socials').hidden, '4-in-1 asks for the socials');
  assert.match($('#tf-summary').textContent, /₱1,249/); // 899 + 350 links page
  assert.match($('#tf-preview').textContent, /Like us on Facebook/);
  $('[data-act="design"][data-arg="menu"]').click();
  assert.ok($('#tf-socials').hidden && !$('#tf-menu-how').hidden);
  assert.match($('#tf-summary').textContent, /₱1,398/); // 899 + 499 menu
  $('[data-act="pv"][data-arg="1"]').click();
  assert.match($('#tf-preview').textContent, /SCANNED · YOUR MENU/);

  // The Solo strip under the hero puts the Solo package in the builder; "Pick one stand instead" undoes it.
  assert.match($('.hm-solo').textContent, /₱3,000.*\+ ₱299\/mo/s);
  $('.hm-solo__cta').click();
  assert.match($('#tf-stand').textContent, /Solo package · 5 Review \+ Menu stands/);
  $('[data-act="pkgClear"]').click();

  // "Send it later" skips the menu step; the order says so.
  $('[data-act="menuHow"][data-arg="3"]').click();
  $('[data-act="order"]').click();
  $('[data-co-submit]').click();
  await new Promise(r => setTimeout(r, 0));
  const white = catalog['tap4-l-stand'].variants.find(v => v.title === 'Glossy White').id;
  assert.equal(sent.items[0].id, white);
  assert.equal(sent.items[0].properties.Finish, 'Glossy White');
  assert.equal(sent.items[0].properties.Menu, 'Customer will send it after checkout');

});

test('02 app section: table ordering add-on and the counter demo', async t => {
  const preview = await createPreview({ orderEmail: 'orders@example.com' });
  const { html } = await preview.renderPage('/');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://tap4.ph/', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  t.after(() => w.close());
  w.scrollTo = () => {};
  w.eval(await fs.readFile(path.join(ROOT, 'assets/theme.js'), 'utf8'));
  const $ = s => w.document.querySelector(s);

  assert.equal($('[data-ax-total]').textContent, '₱3,000 + ₱299/mo');
  assert.ok($('[data-ax-guest] .ax-lock'), 'guest phone is locked until table ordering is added');
  $('[data-act="wifiH"][data-arg="2"]').click();
  assert.match($('[data-wifi-note]').textContent, /2 hours/);

  $('.ax-f--order [data-act="tableOrder"]').click();
  assert.ok($('.ax-f--order').classList.contains('on'));
  assert.match($('[data-ax-chips]').textContent, /Table ordering/);
  assert.match($('[data-ax-note]').textContent, /TABLE ORDERING FROM ₱499/);
  assert.ok(!$('[data-ax-guest] .ax-lock'));
  assert.match($('[data-ax-tablet] .ax-pop').textContent, /Table 7/); // sample order pops up on the counter tablet
  $('[data-ax-tablet] [data-ax-later]').click();

  $('[data-ax-qty="2"][data-d="1"]').click(); // + Ube Cold Brew (cart: 2 latte, 1 ensaymada, 1 ube)
  assert.match($('[data-ax-send]').textContent, /4 items · ₱615/);
  $('[data-ax-send]').click();
  assert.match($('[data-ax-guest]').textContent, /Sent to the counter/);
  assert.match($('[data-ax-tablet] .ax-pop').textContent, /Table 4.*Ube Cold Brew.*₱615/s);
  $('[data-ax-tablet] [data-ax-accept]').click();
  assert.match($('[data-ax-tablet] .ax-lo').textContent, /Table 4.*IN KITCHEN/s);
  assert.equal(w.document.querySelector('[data-plans] [data-dp-view]').textContent, 'Orders', 'section 03 shows the live floor too');
});

test('every homepage section keeps its styles', async () => {
  const css = await fs.readFile(path.join(ROOT, 'assets/theme.css'), 'utf8');
  for (const sel of ['.hm-map', '.hm-card', '.hm-solo', '.bl-card', '.bl-ph', '.ax-row', '.ax-tablet', '.ax-gphone', '.dp-plan', '.dp-dash', '.dp-tile', '.dp-to', '.svc', '.reseller', '.site-footer', '.cart', '.co__panel'])
    assert.match(css, new RegExp('^\\s*' + sel.replace('.', '\\.') + '[\\s{,.:]', 'm'), sel + ' has no styles');
});

test('03 packages: slider, table-ordering demo and ordering a package', async t => {
  const preview = await createPreview({ orderEmail: 'orders@example.com' });
  const { html } = await preview.renderPage('/');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://tap4.ph/', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  t.after(() => w.close());
  let opened;
  w.TF.open = url => { opened = url; };
  w.scrollTo = () => {};
  w.eval(await fs.readFile(path.join(ROOT, 'assets/theme.js'), 'utf8'));
  const $ = (s, root = w.document) => root.querySelector(s);
  const card = () => $('.dp-plan:not([hidden])');
  const slide = i => { const r = $('[data-dp-range]'); r.value = i; r.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const input = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };

  assert.equal(card().dataset.plan, 'solo');
  assert.equal($('[data-plan-up]', card()).textContent, '₱3,000');
  assert.equal($('[data-dp-view]').textContent, 'My stands');
  slide(2); // 3 locations
  assert.equal(card().dataset.plan, 'business');
  assert.equal(w.document.querySelectorAll('[data-br]').length, 3);
  assert.equal($('[data-tot-t]').textContent, '3,786');
  slide(8); // 20 branches
  assert.equal(card().dataset.plan, 'empire');
  assert.equal($('[data-dp-n]').textContent, '20');
  assert.equal($('[data-dp-view]').textContent, 'Inventory');
  $('[data-dp-etab="2"]').click();
  assert.equal($('[data-dp-view]').textContent, 'Staff');

  // Table ordering: the add-on opens the live floor; a guest order lands on table 4 and the server's phone.
  slide(2);
  $('.dp-plan:not([hidden]) [data-act="tableOrder"]').click();
  assert.equal($('[data-dp-view]').textContent, 'Orders');
  assert.match($('[data-plan-total]', card()).textContent, /₱799 \+ from ₱499\/mo/);
  $('[data-to-qty="1"][data-d="1"]').click();
  $('[data-to-qty="1"][data-d="1"]').click();
  assert.match($('[data-to-send]').textContent, /2 items · ₱360/);
  $('[data-to-send]').click();
  assert.match($('[data-to-server]').textContent, /Beef bulgogi ×2/);
  assert.match($('[data-to-guest]').textContent, /Order sent to your server/);
  $('[data-dp-table="3"]').click();
  assert.match($('.dp-det').textContent, /Beef bulgogi/);
  $('[data-to-q="0:3"]').click();
  assert.match($('[data-to-place]').textContent, /^50\+ tables/);
  $('[data-to-quote]').click();
  assert.match(decodeURIComponent(opened), /subject=Table ordering quote/);

  // Phones: plan buttons + stepper, chip-row dashboard, floor tile opens the bottom sheet.
  $('[data-dp-plan="empire"]').click();
  assert.equal($('[data-dp-mn]').textContent, '8 branches');
  $('[data-dp-step="1"]').click();
  assert.equal($('[data-dp-mn]').textContent, '12 branches');
  assert.match($('[data-dp-mchips]').textContent, /Billing.*Inventory.*Staff/s);
  $('[data-dp-mtab="2"]').click();
  assert.match($('[data-dp-mrows]').textContent, /Ana R\./);
  assert.equal($('[data-dp-bart]').textContent, '₱40,000 + ₱1,999/mo');
  $('[data-dp-plan="business"]').click();
  $('[data-dp-ftile="4"]').click();
  assert.ok(!$('[data-dp-sheet]').hidden);
  assert.match($('[data-dp-sheet-body]').textContent, /Table 5.*BILL PLEASE/s);
  $('[data-dp-sheet-close]').click();
  assert.ok($('[data-dp-sheet]').hidden);

  // Choosing the package puts it in the setup and the order.
  $('.dp-plan:not([hidden]) [data-act="planCta"]').click();
  assert.match($('#tf-stand').textContent, /Business package · 20 Review \+ Menu stands/);
  assert.ok($('#tf-qty-wrap').hidden, 'a package has a fixed number of stands');
  assert.match($('#tf-summary').textContent, /₱12,000/);
  assert.match($('#tf-summary').textContent, /\+ ₱799\/mo app · table ordering quote/);
  $('[data-act="order"]').click();
  $('.co-cta').click(); // review -> menu (Review + Menu stands)
  input($('#co-menuText'), 'Latte — ₱150');
  $('.co-cta').click();
  input($('#co-business'), 'Kape Norte'); input($('#co-name'), 'Juan'); input($('#co-phone'), '0917 123 4567'); input($('#co-address'), 'Baguio');
  $('.co-cta').click();
  $('[data-co-submit]').click();
  const body = decodeURIComponent(opened.split('&body=')[1]);
  assert.match(body, /Business name: Kape Norte/);
  assert.match(body, /Setup: Business package/);
  assert.match(body, /Stands: 20 × TAP4\.1 L-Stand/);
  assert.match(body, /Table ordering: Yes — send a quote/);
  assert.match(body, /One-time: ₱12,000/);
  assert.match(body, /Monthly: ₱799/);
  $('[data-act="pkgClear"]').click();
  assert.match($('#tf-stand').textContent, /YOUR STAND · PICKED ABOVE/, 'back to one stand');
});
