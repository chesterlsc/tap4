import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createPreview, crawlFiles, PAGES } from '../scripts/preview.mjs';

// The static tap4.ph build: what Google and link previews see on each page.
const SITE = 'https://tap4.ph';
const preview = createPreview({ orderEmail: 'hello@tapfour.ph' });
const page = async route => new JSDOM((await (await preview).renderPage(SITE + route)).html).window.document;
const ld = doc => [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap(s => { const j = JSON.parse(s.textContent); return j['@graph'] || [j]; });
const meta = (doc, sel) => doc.querySelector(sel)?.getAttribute('content') || '';

test('every indexable page has its own title, description, canonical, share image and one H1', async () => {
  const seen = new Set();
  for (const route of ['/', ...Object.keys(PAGES).map(h => `/pages/${h}`)]) {
    const doc = await page(route);
    const title = doc.title, desc = meta(doc, 'meta[name="description"]');
    assert.ok(title.length >= 20 && title.length <= 65, `${route} title length ${title.length}: ${title}`);
    assert.ok(desc.length >= 70 && desc.length <= 160, `${route} description length ${desc.length}`);
    assert.ok(!seen.has(title) && !seen.has(desc), `${route} repeats another page's title or description`);
    seen.add(title); seen.add(desc);
    assert.equal(doc.querySelector('link[rel="canonical"]').href, SITE + route);
    assert.match(meta(doc, 'meta[property="og:image"]'), /^https:\/\/tap4\.ph\/assets\/og-tapfour\.jpg/);
    assert.equal(meta(doc, 'meta[name="twitter:card"]'), 'summary_large_image');
    assert.match(meta(doc, 'meta[name="robots"]'), /^index/);
    assert.equal(doc.querySelectorAll('h1').length, 1, `${route} has one H1`);
    assert.ok(ld(doc).some(x => x['@type'] === 'Organization'), `${route} has Organization data`);
  }
  assert.match((await page('/')).title, /NFC Google Review Stand/);
});

test('structured data: products with peso offers on the homepage, FAQPage matching the FAQ page', async () => {
  const products = ld(await page('/')).filter(x => x['@type'] === 'Product');
  assert.equal(products.length, 2);
  for (const p of products) { assert.equal(p.offers.priceCurrency, 'PHP'); assert.ok(p.offers.price > 0); assert.match(p.image, /^https:\/\//); }
  assert.equal(products[0].offers.price, 899);
  const faq = await page('/pages/faq');
  const data = ld(faq).find(x => x['@type'] === 'FAQPage');
  assert.equal(data.mainEntity.length, faq.querySelectorAll('.faq__q').length);
  for (const q of data.mainEntity) { assert.ok(q.name.endsWith('?')); assert.ok(q.acceptedAnswer.text.length > 40); assert.doesNotMatch(q.acceptedAnswer.text, /</); }
  assert.ok(!ld(await page('/')).some(x => x['@type'] === 'FAQPage'), 'homepage FAQ is not marked up a second time');
  assert.ok(ld(faq).some(x => x['@type'] === 'BreadcrumbList'));
});

test('404 is not indexed; robots.txt and sitemap list the real pages', async () => {
  assert.match(meta(await page('/404'), 'meta[name="robots"]'), /^noindex/);
  const files = crawlFiles(SITE, '2026-10-04');
  assert.match(files['robots.txt'], /Sitemap: https:\/\/tap4\.ph\/sitemap\.xml/);
  for (const u of ['/', '/pages/about', '/pages/faq']) assert.match(files['sitemap.xml'], new RegExp(`<loc>https://tap4\\.ph${u}</loc>`));
});

test('footer links to About us and FAQ from every page', async () => {
  for (const route of ['/', '/pages/about', '/pages/faq']) {
    const links = [...(await page(route)).querySelectorAll('.site-footer a')].map(a => a.getAttribute('href'));
    assert.ok(links.includes('/pages/about') && links.includes('/pages/faq'), route);
  }
});
