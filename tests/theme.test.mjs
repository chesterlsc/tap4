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
  $('#tf-app [data-act="feat"][data-arg="order"]').click(); // needs the live menu, so it switches that on too
  assert.match($('#tf-app [data-act="appAdd"]').textContent, /₱997\/mo/); // 299 + 199 + 499
  $('#tf-app [data-act="appAdd"]').click();
  assert.match($('#tf-summary').textContent, /tapfour app · Solo/);
  assert.match($('#tf-summary').textContent, /Then ₱997\/mo/);

  input($('#tf-name'), 'Kape Norte');
  $('[data-act="order"]').click();
  assert.ok(!$('#tf-checkout').hidden, 'checkout opens with blank zone links');
  $('.co-cta').click(); // review -> menu (live menu needs one)
  input($('#co-menuText'), 'Latte — ₱150');
  $('.co-cta').click();
  const fill = (id, v) => input($('#co-' + id), v);
  fill('name', 'Juan'); fill('phone', '0917 123 4567'); fill('address', 'Baguio');
  $('.co-cta').click();
  $('[data-co-submit]').click();
  const body = decodeURIComponent(opened.split('&body=')[1]);
  assert.match(body, /Setup: 4-Tap Bar \+ tapfour app/);
  assert.match(body, /Tap zones: Google, Facebook, Instagram, Website/);
  assert.match(body, /Order from the table/);
  assert.match(body, /Monthly: ₱997/);
});

test('app section adds features to the setup builder', async t => {
  const preview = await createPreview({ orderEmail: 'orders@example.com' });
  const { html } = await preview.renderPage('/');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://tap4.ph/', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  t.after(() => w.close());
  let opened;
  w.TF.open = url => { opened = url; };
  w.scrollTo = () => {};
  w.eval(await fs.readFile(path.join(ROOT, 'assets/theme.js'), 'utf8'));
  const $ = s => w.document.querySelector(s);
  const input = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };

  $('[data-ax="wifi"] .ax-btn').click();
  $('[data-act="wifiH"][data-arg="2"]').click();
  assert.ok($('[data-ax="wifi"]').classList.contains('on'));
  assert.match($('[data-ax-chips]').textContent, /Wi-Fi · 2h/);
  assert.equal($('[data-ax-total]').textContent, '₱398/mo'); // Solo 299 + Wi-Fi 99
  $('[data-act="appFromSection"]').click();
  assert.match($('#tf-summary').textContent, /tapfour app · Solo/);
  assert.match($('#tf-summary').textContent, /Tap-to-join Wi-Fi/);

  input($('#tf-name'), 'Kape Norte');
  $('[data-act="order"]').click();
  $('.co-cta').click(); // review -> menu (printed QR menu)
  input($('#co-menuText'), 'Latte — ₱150');
  $('.co-cta').click();
  input($('#co-name'), 'Juan'); input($('#co-phone'), '0917 123 4567'); input($('#co-address'), 'Baguio');
  $('.co-cta').click();
  $('[data-co-submit]').click();
  assert.match(decodeURIComponent(opened.split('&body=')[1]), /Wi-Fi per guest: 2 hours/);
});

test('every homepage section keeps its styles', async () => {
  const css = await fs.readFile(path.join(ROOT, 'assets/theme.css'), 'utf8');
  for (const sel of ['.h4-face', '.bo', '.ax-row', '.ax-dash', '.dash', '.plan', '.svc', '.reseller', '.site-footer', '.cart', '.co__panel'])
    assert.match(css, new RegExp('^\\s*' + sel.replace('.', '\\.') + '[\\s{,.:]', 'm'), sel + ' has no styles');
});
