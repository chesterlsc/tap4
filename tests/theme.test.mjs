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

  $('[data-act="preset"][data-arg="menu"]').click();
  assert.match($('#tf-summary').textContent, /₱1,398/);
  $('[data-act="order"]').click();
  assert.match($('#tf-summary').textContent, /valid http/, 'blocks ordering without a real review link');
  const url = $('#tf-url-google');
  url.value = 'https://g.page/r/kapenorte/review';
  url.dispatchEvent(new w.Event('input', { bubbles: true }));
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
  assert.deepEqual(sent.body.items.map(i => i.id), [id('acrylic-glass-stand'), id('printed-qr-menu')]);
  assert.equal(sent.body.items[0].properties['Business name'], 'Kape Norte');
  assert.equal(sent.body.items[0].properties['Google review URL'], 'https://g.page/r/kapenorte/review');
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
  $('[data-act="preset"][data-arg="menu"]').click();
  const url = $('#tf-url-google');
  url.value = 'https://g.page/r/kapenorte/review';
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
  assert.match(body, /Google review URL: https:\/\/g\.page\/r\/kapenorte\/review/);
  assert.match(body, /One-time: ₱1,398/);
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

  $('[data-act="preset"][data-arg="menu"]').click();
  input($('#tf-url-google'), 'https://g.page/r/kapenorte/review');
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
  assert.match(decodeURIComponent(opened.split('&body=')[1]), /Menu files:\nmenu\.pdf — https:\/\/go\.example\/m\/abc/);
});
