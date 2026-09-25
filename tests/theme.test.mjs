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
  await new Promise(r => setTimeout(r, 0));

  const id = handle => catalog[handle].variants[0].id;
  assert.equal(sent.url, '/cart/add.js');
  assert.deepEqual(sent.body.items.map(i => i.id), [id('acrylic-glass-stand'), id('printed-qr-menu')]);
  assert.equal(sent.body.items[0].properties['Business name'], 'Kape Norte');
  assert.equal(sent.body.items[0].properties['Google review URL'], 'https://g.page/r/kapenorte/review');
});

test('static site (tap4.ph) sends the order by email', async t => {
  const preview = await createPreview({ orderEmail: 'orders@example.com' });
  const { html } = await preview.renderPage('/');
  assert.doesNotMatch(html, /cart-link|Local theme preview/);
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
  await new Promise(r => setTimeout(r, 0));
  assert.match(opened, /^mailto:orders@example\.com\?subject=/);
  const body = decodeURIComponent(opened.split('&body=')[1]);
  assert.match(body, /Business name: Kape Norte/);
  assert.match(body, /Google review URL: https:\/\/g\.page\/r\/kapenorte\/review/);
  assert.match(body, /One-time: ₱1,398/);
});
