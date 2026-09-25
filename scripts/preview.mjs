/** Local visual preview of the current Liquid theme. Shopify remains the commerce runtime. */
import { Liquid } from 'liquidjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = file => fs.readFile(path.join(ROOT, file), 'utf8');
const readJSON = async file => JSON.parse(await read(file));

// CSV supports quoted commas, escaped quotes, CRLF, and multiline descriptions.
export function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(field); field = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (quoted) throw new Error('Unclosed quoted field in products.csv');
  row.push(field); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift() || [];
  return rows.map((fields, index) => {
    if (fields.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${fields.length} columns; expected ${headers.length}`);
    return Object.fromEntries(headers.map((header, i) => [header, fields[i]]));
  });
}

export async function createCatalog() {
  const products = {}; let id = 1000;
  for (const row of parseCSV(await read('products.csv'))) {
    const handle = row.Handle;
    if (!handle) throw new Error('Every product CSV row needs a handle');
    const product = products[handle] ||= {
      id: id++, handle, title: row.Title, url: `/products/${handle}`, description: row['Body (HTML)'],
      vendor: row.Vendor, tags: row.Tags.split(',').map(tag => tag.trim()).filter(Boolean),
      available: true, variants: [], selling_plan_groups: [], media: [], object_type: 'product'
    };
    const price = Math.round(Number(row['Variant Price']) * 100);
    if (!Number.isFinite(price)) throw new Error(`Invalid price for ${handle}`);
    const title = [row['Option1 Value'], row['Option2 Value'], row['Option3 Value']].filter(value => value && value !== 'Default Title').join(' / ') || 'Default Title';
    const variantId = id++;
    product.variants.push({
      id: variantId, title, price, compare_at_price: row['Variant Compare At Price'] ? Math.round(Number(row['Variant Compare At Price']) * 100) : null,
      sku: row['Variant SKU'], available: true, selling_plan_allocations: [], url: `${product.url}?variant=${variantId}`
    });
  }
  for (const product of Object.values(products)) {
    product.selected_or_first_available_variant = product.variants[0];
    product.price = Math.min(...product.variants.map(v => v.price));
    product.compare_at_price = product.variants[0].compare_at_price;
    product.has_only_default_variant = product.variants.length === 1 && product.variants[0].title === 'Default Title';
    product.requires_selling_plan = product.tags.includes('subscription') || product.tags.includes('monthly');
  }
  return products;
}

function blockTag(endTag, opening, closing) {
  return {
    parse(token, remaining) {
      this.args = token.args; this.templates = [];
      const stream = this.liquid.parser.parseStream(remaining);
      stream.on(`tag:${endTag}`, () => stream.stop()).on('template', template => this.templates.push(template))
        .on('end', () => { throw new Error(`Missing ${endTag}`); });
      stream.start();
    },
    * render(context, emitter) {
      if (opening) emitter.write(opening(this.args));
      yield this.liquid.renderer.renderTemplates(this.templates, context, emitter);
      if (closing) emitter.write(closing);
    }
  };
}

function previewNotice(emptyProducts) {
  return `<aside style="padding:9px 18px;background:#e4ff79;color:#101010;text-align:center;font:600 12px/1.5 system-ui" role="note">Local theme preview · ${emptyProducts ? 'No catalog products' : 'Sample catalog from products.csv; simulated variant IDs'} · Cart and checkout are disabled. <a style="color:inherit;text-decoration:underline" href="/collections/all">Products</a> · <a style="color:inherit;text-decoration:underline" href="/cart?sample=1">Sample cart</a> · <a style="color:inherit;text-decoration:underline" href="/search?q=stand">Search</a></aside>`;
}

export async function createPreview({ emptyProducts = false } = {}) {
  const catalog = await createCatalog();
  const allProducts = emptyProducts ? {} : catalog;
  const productList = Object.values(allProducts);
  const schema = await readJSON('config/settings_schema.json');
  const stored = await readJSON('config/settings_data.json');
  const defaults = Object.fromEntries(schema.flatMap(group => group.settings || []).filter(s => s.id).map(s => [s.id, s.default]));
  const saved = typeof stored.current === 'string' ? stored.presets?.[stored.current] : stored.current;
  const settings = { ...defaults, ...saved };
  const money = cents => '₱' + (Number(cents || 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const engine = new Liquid({ root: [path.join(ROOT, 'snippets')], extname: '.liquid', strictFilters: true });
  engine.registerFilter('asset_url', file => '/assets/' + file);
  engine.registerFilter('image_url', image => typeof image === 'string' ? image : image?.src || '');
  engine.registerFilter('image_tag', (src, ...args) => {
    const attrs = Object.fromEntries(args.filter(Array.isArray));
    return `<img src="${escape(src)}" alt="${escape(attrs.alt || '')}" loading="${escape(attrs.loading || 'lazy')}">`;
  });
  engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${escape(url)}">`);
  engine.registerFilter('json', value => JSON.stringify(value ?? null).replace(/</g, '\\u003c'));
  engine.registerFilter('money', money);
  engine.registerFilter('money_without_trailing_zeros', cents => money(cents).replace(/\.00$/, ''));
  engine.registerFilter('handleize', value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const translations = await readJSON('locales/en.default.json');
  engine.registerFilter('t', key => key.split('.').reduce((value, part) => value?.[part], translations) || key);
  engine.registerFilter('placeholder_svg_tag', (_, className = '') => `<svg class="${escape(className)}" viewBox="0 0 400 400" role="img" aria-label="Product image placeholder"><rect width="400" height="400" fill="#242426"/><path d="M100 125h200v160H100zM140 125v-25h120v25" fill="none" stroke="#777" stroke-width="3"/></svg>`);
  engine.registerFilter('payment_button', () => '');
  engine.registerFilter('default_pagination', () => '');
  engine.registerTag('schema', { ...blockTag('endschema'), render() { return ''; } });
  engine.registerTag('paginate', blockTag('endpaginate'));
  engine.registerTag('form', blockTag('endform', args => {
    // Preserve the actual product form's attributes for the theme JavaScript.
    const attrs = [...args.matchAll(/(?:,\s*)([\w-]+):\s*(['"])(.*?)\2/g)].map(([, key, , value]) => `${key}="${escape(value)}"`).join(' ');
    return `<form method="post" action="/cart/add" ${attrs}>`;
  }, '</form>'));

  const resolveSettings = (values = {}, definitions = []) => {
    const result = Object.fromEntries(definitions.filter(d => d.id).map(d => [d.id, d.default]));
    Object.assign(result, values);
    for (const definition of definitions) {
      if (definition.type === 'product') result[definition.id] = allProducts[result[definition.id]] || null;
      if (definition.type === 'link_list') result[definition.id] = { links: [] };
    }
    return result;
  };
  async function renderSection(type, data, globals, id) {
    const source = await read(`sections/${type}.liquid`);
    const match = source.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
    const schema = match ? JSON.parse(match[1]) : {};
    const blocks = (data.block_order || Object.keys(data.blocks || {})).map(key => {
      const block = data.blocks[key];
      return { id: key, type: block.type, shopify_attributes: '', settings: resolveSettings(block.settings, schema.blocks?.find(b => b.type === block.type)?.settings) };
    });
    const section = { id, settings: resolveSettings(data.settings, schema.settings), blocks };
    return `<div id="shopify-section-${escape(id)}" class="shopify-section ${escape(schema.class || '')}">${await engine.parseAndRender(source, { ...globals, section })}</div>`;
  }
  async function renderGroup(file, globals) {
    const group = await readJSON(file);
    return (await Promise.all(group.order.filter(id => !group.sections[id].disabled).map(id => renderSection(group.sections[id].type, group.sections[id], globals, id)))).join('');
  }
  async function renderPage(input = '/') {
    const url = new URL(input, 'http://localhost:3000');
    let name = '404', context = {}, status = 200, title = 'Page not found';
    const collection = { title: 'All products', description: 'Sample catalog for local preview.', products: productList, products_count: productList.length, url: '/collections/all' };
    const cart = { item_count: 0, items: [], currency: { iso_code: 'PHP' }, total_price: 0, note: '', cart_level_discount_applications: [] };
    if (url.pathname === '/') { name = 'index'; title = 'tapfour'; }
    else if (url.pathname.startsWith('/products/') && allProducts[url.pathname.split('/')[2]]) {
      const product = structuredClone(allProducts[url.pathname.split('/')[2]]);
      product.selected_or_first_available_variant = product.variants.find(v => String(v.id) === url.searchParams.get('variant')) || product.variants[0];
      name = 'product'; title = product.title; context = { product };
    } else if (url.pathname === '/cart') {
      name = 'cart'; title = 'Your cart';
      if (url.searchParams.has('sample')) {
        cart.items = productList.slice(0, 2).map(product => ({
          product, variant: product.variants[0], title: product.title, url: product.url, quantity: 1,
          url_to_remove: '/cart', final_line_price: product.price, original_line_price: product.price,
          properties: { 'Business name': 'Preview sample' }, line_level_discount_allocations: []
        }));
        cart.item_count = cart.items.length; cart.total_price = cart.items.reduce((sum, item) => sum + item.final_line_price, 0);
      }
    } else if (url.pathname === '/search') {
      name = 'search'; title = 'Search'; const terms = url.searchParams.get('q') || '';
      const results = productList.filter(product => `${product.title} ${product.description}`.toLowerCase().includes(terms.toLowerCase()));
      context = { search: { performed: url.searchParams.has('q'), terms, results, results_count: results.length } };
    } else if (url.pathname === '/collections/all') { name = 'collection'; title = 'All products'; context = { collection }; }
    else if (url.pathname === '/collections') { name = 'list-collections'; title = 'Collections'; context = { collections: [collection] }; }
    else if (url.pathname === '/pages/preview') { name = 'page'; title = 'Preview page'; context = { page: { title, content: '<p>This sample page demonstrates the page template. Add your own pages in Shopify.</p>' } }; }
    else status = 404;
    const globals = {
      settings, shop: { name: 'tapfour' }, cart, routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', search_url: '/search', all_products_collection_url: '/collections/all' },
      request: { locale: { iso_code: 'en' }, origin: url.origin, design_mode: false, page_type: name },
      template: { name }, page_title: title, canonical_url: url.href, current_page: 1,
      all_products: allProducts, paginate: { pages: 1 }, ...context
    };
    const body = await renderGroup(`templates/${name}.json`, globals);
    let layout = await read('layout/theme.liquid');
    for (const match of [...layout.matchAll(/{%-?\s*sections\s+['"]([^'"]+)['"]\s*-?%}/g)]) {
      layout = layout.replace(match[0], await renderGroup(`sections/${match[1]}.json`, globals));
    }
    let html = await engine.parseAndRender(layout, { ...globals, content_for_layout: body, content_for_header: '' });
    html = html.replace(/(<body\b[^>]*>)/, `$1${previewNotice(emptyProducts)}`);
    return { html, status };
  }
  return { renderPage, catalog };
}

export async function renderSite(options = {}) {
  const preview = await createPreview(options);
  const routes = ['/', '/cart', '/cart?sample=1', '/search', '/search?q=stand', '/collections/all', '/collections', '/pages/preview', '/404', ...Object.keys(preview.catalog).map(handle => `/products/${handle}`)];
  const pages = new Map();
  for (const route of routes) pages.set(route, (await preview.renderPage(route)).html);
  return { pages, catalog: preview.catalog };
}

async function main() {
  const emptyProducts = process.env.EMPTY === '1';
  if (process.argv.includes('--build')) {
    const { pages } = await renderSite({ emptyProducts });
    const output = path.join(ROOT, '.preview');
    await fs.mkdir(output, { recursive: true });
    await fs.cp(path.join(ROOT, 'assets'), path.join(output, 'assets'), { recursive: true });
    for (const [route, html] of pages) {
      const destination = path.join(output, route === '/' ? 'index.html' : `${route.replace(/^\//, '').replaceAll('?', '-').replaceAll('=', '-')}/index.html`);
      await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.writeFile(destination, html);
    }
    console.log(`Rendered ${pages.size} routes from current Liquid into .preview/`);
    return;
  }
  const port = Number(process.env.PORT || 3000);
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://localhost:${port}`);
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const description = 'Local preview only: cart and checkout require a connected Shopify store.';
        if (url.pathname.endsWith('.js')) { response.writeHead(422, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ status: 422, description })); }
        else { response.writeHead(422, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(`<p>${description}</p><a href="/">Back to preview</a>`); }
        return;
      }
      if (url.pathname.startsWith('/assets/')) {
        const relative = decodeURIComponent(url.pathname).slice(1), file = path.resolve(ROOT, relative);
        if (!file.startsWith(path.join(ROOT, 'assets') + path.sep)) { response.writeHead(403); response.end(); return; }
        const types = { '.css': 'text/css', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        response.end(await fs.readFile(file)); return;
      }
      const preview = await createPreview({ emptyProducts });
      const page = await preview.renderPage(url.href);
      response.writeHead(page.status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(page.html);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error.message); console.error(error);
    }
  });
  server.listen(port, '127.0.0.1', () => console.log(`Tapfour preview: http://localhost:${port}\nCurrent Liquid + assets; sample CSV catalog; Shopify cart/checkout disabled. Refresh to see edits.`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error); process.exitCode = 1; });
