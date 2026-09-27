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
  $('[data-act="order"]').click();
  assert.match($('#tf-summary').textContent, /business name/, 'asks who the order is for');
  input($('#tf-name'), 'Kape Norte');
  input($('#tf-url-google'), 'https://example.com/kape');
  assert.match($('#tf-links').textContent, /Not a Google Maps link/);
  $('[data-act="order"]').click();
  assert.match($('#tf-summary').textContent, /Google Maps link/, 'blocks a link that is not from Google Maps');
  input($('#tf-url-google'), 'https://maps.app.goo.gl/KapeNorte123');
  assert.match($('#tf-links').textContent, /Looks right/);
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
  assert.equal(sent.body.items[0].properties['Business name'], 'Kape Norte');
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
  const name = $('#tf-name');
  name.value = 'Kape Norte';
  name.dispatchEvent(new w.Event('input', { bubbles: true }));
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
  assert.match($('.co-foot').textContent, /Enter your name/);
  const fill = (id, v) => { const el = $('#co-' + id); el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  fill('name', 'Juan Dela Cruz'); fill('phone', '0917 123 4567'); fill('address', '12 Session Rd, Baguio');
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

  input($('#tf-name'), 'Ana’s Café'); // Google link left blank: sent after checkout
  $('[data-act="order"]').click();
  $('.co-cta').click(); // review -> menu
  const files = $('#co-menuFiles');
  Object.defineProperty(files, 'files', { value: [new w.File(['%PDF-1.4'], 'menu.pdf', { type: 'application/pdf' })] });
  files.dispatchEvent(new w.Event('change', { bubbles: true }));
  await tick(); await tick();
  assert.equal(uploadedTo, 'https://go.example/upload/menu');
  assert.match($('.co-files').textContent, /Uploaded/);
  $('.co-cta').click(); // menu -> details
  input($('#co-name'), 'Ana Reyes'); input($('#co-phone'), '0917 000 0001'); input($('#co-address'), 'Maginhawa St, QC');
  $('.co-cta').click(); // details -> confirm
  $('[data-co-submit]').click();
  const body = decodeURIComponent(opened.split('&body=')[1]);
  assert.match(body, /Menu files:\nmenu\.pdf — https:\/\/go\.example\/m\/abc/);
  assert.match(body, /Google Maps link: To be provided after checkout/);
});

test('TAP4.1: finish switches the variant and photos, designs set the add-ons', async t => {
  const { pages, catalog } = await site;
  const dom = new JSDOM(pages.get('/'), { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  t.after(() => w.close());
  let sent;
  w.fetch = async (url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({}) }; };
  w.structuredClone ??= structuredClone;
  w.scrollTo = () => {};
  w.eval(await fs.readFile(path.join(ROOT, 'assets/theme.js'), 'utf8'));
  const $ = s => w.document.querySelector(s);
  const photo = () => $('.pv-photo img').getAttribute('src');

  // Hero opens on Review + Menu (best for cafés); picking a face in the hero drives the builder.
  assert.match(photo(), /tapfour-l-black-menu/);
  assert.equal($('[data-offer-name]').textContent, 'Review + Menu');
  $('[data-act="heroFace"][data-arg="review"]').click();
  assert.match(photo(), /tapfour-l-black-review/);
  assert.equal($('[data-offer-now]').textContent, '₱899');
  assert.equal($('[data-offer-cta]').textContent, 'Order Review →');
  $('[data-act="finish"][data-arg="white"]').click();
  assert.match($('.h4-face.on img').getAttribute('src'), /tapfour-l-white-review/);
  assert.match(photo(), /tapfour-l-white-review/);
  $('[data-act="design"][data-arg="links"]').click();
  assert.match(photo(), /tapfour-l-white-links/);
  assert.match($('#tf-summary').textContent, /₱1,249/); // 899 + 350 links page
  $('[data-act="design"][data-arg="menu"]').click();
  assert.match(photo(), /tapfour-l-white-menu/);
  assert.match($('#tf-summary').textContent, /₱1,398/); // 899 + 499 menu

  const name = $('#tf-name');
  name.value = 'Kape Norte';
  name.dispatchEvent(new w.Event('input', { bubbles: true }));
  $('[data-act="order"]').click();
  $('.co-cta').click();
  const menu = $('#co-menuLink');
  menu.value = 'https://drive.google.com/menu';
  menu.dispatchEvent(new w.Event('input', { bubbles: true }));
  $('[data-co-submit]').click();
  await new Promise(r => setTimeout(r, 0));
  const white = catalog['tap4-l-stand'].variants.find(v => v.title === 'Glossy White').id;
  assert.equal(sent.items[0].id, white);
  assert.equal(sent.items[0].properties.Finish, 'Glossy White');
});

test('4-Tap Bar and the tapfour app popup', async t => {
  const preview = await createPreview({ orderEmail: 'orders@example.com' });
  const { html } = await preview.renderPage('/');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://tap4.ph/', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  t.after(() => w.close());
  let opened;
  w.TF.open = url => { opened = url; };
  w.scrollTo = () => {};
  w.requestAnimationFrame = f => f();
  w.eval(await fs.readFile(path.join(ROOT, 'assets/theme.js'), 'utf8'));
  const $ = s => w.document.querySelector(s);
  const input = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };

  $('[data-act="stand"][data-arg="quad"]').click();
  assert.match($('.pv-photo img').getAttribute('src'), /bar-4tap/);
  assert.equal(w.document.querySelectorAll('.zone').length, 4);
  $('.zone[data-arg="3"]').click(); // TikTok -> Website
  assert.match($('.pv-url').textContent, /Google · Facebook · Instagram · Website/);
  assert.match($('#tf-summary').textContent, /₱1,490/);

  $('.appx__main').click(); // tapping the app in Optional extras opens its features
  assert.ok(!$('#tf-app').hidden, 'app popup opens');
  assert.doesNotMatch($('#tf-summary').textContent, /tapfour app/, 'not added until confirmed');
  assert.match($('#tf-app').textContent, /Order from the table/);
  assert.match($('#tf-app').textContent, /Tap-to-join Wi-Fi/);
  assert.match($('#tf-app').textContent, /Included in every plan/);
  $('#tf-app [data-act="tableOrder"]').click(); // the one add-on: quote-priced, nothing charged now
  assert.match($('#tf-app [data-act="appAdd"]').textContent, /₱299\/mo \+ quote/);
  $('#tf-app [data-act="appAdd"]').click();
  assert.match($('#tf-summary').textContent, /tapfour app · Solo/);
  assert.match($('#tf-summary').textContent, /Table ordering · we send your quote/);
  assert.match($('#tf-summary').textContent, /Then ₱299\/mo/);

  input($('#tf-name'), 'Kape Norte');
  $('[data-act="order"]').click();
  assert.ok(!$('#tf-checkout').hidden, 'checkout opens with blank zone links');
  $('.co-cta').click(); // review -> details (no printed menu on the bar)
  const fill = (id, v) => input($('#co-' + id), v);
  fill('name', 'Juan'); fill('phone', '0917 123 4567'); fill('address', 'Baguio');
  $('.co-cta').click();
  $('[data-co-submit]').click();
  const body = decodeURIComponent(opened.split('&body=')[1]);
  assert.match(body, /Setup: 4-Tap Bar \+ tapfour app/);
  assert.match(body, /Tap zones: Google, Facebook, Instagram, Website/);
  assert.match(body, /Table ordering: Yes — send a quote/);
  assert.match(body, /Monthly: ₱299/);
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
  for (const sel of ['.h4-face', '.bo', '.ax-row', '.ax-tablet', '.ax-gphone', '.dp-plan', '.dp-dash', '.dp-tile', '.dp-to', '.pkgc', '.svc', '.reseller', '.site-footer', '.cart', '.co__panel'])
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

  // Choosing the package puts it in the setup and the order.
  $('.dp-plan:not([hidden]) [data-act="planCta"]').click();
  assert.ok(!$('#tf-pkg').hidden && $('#tf-step-stand').hidden, 'builder shows the package instead of the stand steps');
  assert.match($('#tf-summary').textContent, /Business package · 20 × Review \+ Menu/);
  assert.match($('#tf-summary').textContent, /₱12,000/);
  assert.match($('#tf-summary').textContent, /Then ₱799\/mo/);
  input($('#tf-name'), 'Kape Norte');
  $('[data-act="order"]').click();
  $('.co-cta').click(); // review -> menu (Review + Menu stands)
  input($('#co-menuText'), 'Latte — ₱150');
  $('.co-cta').click();
  input($('#co-name'), 'Juan'); input($('#co-phone'), '0917 123 4567'); input($('#co-address'), 'Baguio');
  $('.co-cta').click();
  $('[data-co-submit]').click();
  const body = decodeURIComponent(opened.split('&body=')[1]);
  assert.match(body, /Setup: Business package/);
  assert.match(body, /Stands: 20 × TAP4\.1 L-Stand/);
  assert.match(body, /Table ordering: Yes — send a quote/);
  assert.match(body, /One-time: ₱12,000/);
  assert.match(body, /Monthly: ₱799/);
  $('[data-act="pkgClear"]').click();
  assert.ok($('#tf-pkg').hidden, 'back to a custom setup');
});
