// Menu files customers attach at checkout on tap4.ph. Stored in Workers KV (no R2/billing needed),
// served back through unguessable links that go into the order email.
// ponytail: no per-IP rate limit; KV's daily write quota caps abuse. Add a limiter if uploads get spammed.
import { Hono } from 'hono';
import { newToken, sniffMenuFile } from './lib.js';

export const MAX_MENU_BYTES = 10 * 1024 * 1024;
const TTL = 180 * 24 * 3600; // files expire on their own after ~6 months
const KEY_RE = /^[A-Za-z0-9_-]{43}$/;

export const uploads = new Hono();

// Only the storefront may upload. Local dev (no ADMIN_HOST) also allows localhost.
function allowedOrigin(c) {
  const origin = c.req.header('origin') || '';
  const list = String(c.env.UPLOAD_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (list.includes(origin)) return origin;
  try { const h = new URL(origin).hostname; if (!c.env.ADMIN_HOST && (h === 'localhost' || h === '127.0.0.1')) return origin; } catch (_) {}
  return null;
}
const cors = origin => ({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' });

uploads.options('/upload/menu', c => {
  const origin = allowedOrigin(c);
  return origin ? c.body(null, 204, cors(origin)) : c.body(null, 403);
});

uploads.post('/upload/menu', async c => {
  const origin = allowedOrigin(c);
  if (!origin) return c.json({ error: 'Uploads are only accepted from tap4.ph.' }, 403);
  const h = { ...cors(origin), 'Cache-Control': 'no-store' };
  if (!c.env.MENUS) return c.json({ error: 'Uploads are not set up yet.' }, 503, h);
  if (Number(c.req.header('content-length') || 0) > MAX_MENU_BYTES + 64 * 1024) return c.json({ error: 'That file is over 10 MB.' }, 413, h);
  let file;
  try { file = (await c.req.formData()).get('file'); } catch (_) { return c.json({ error: 'Send the file as form data.' }, 400, h); }
  if (!file || typeof file === 'string') return c.json({ error: 'No file received.' }, 400, h);
  if (file.size > MAX_MENU_BYTES) return c.json({ error: 'That file is over 10 MB.' }, 413, h);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffMenuFile(bytes);
  if (!kind) return c.json({ error: 'Use a PDF, JPG, PNG, WebP or HEIC file.' }, 415, h);
  const key = newToken();
  const name = String(file.name || 'menu').replace(/[^\w .()-]+/g, '_').slice(0, 80) || 'menu';
  await c.env.MENUS.put(key, bytes, { expirationTtl: TTL, metadata: { type: kind[0], name, size: bytes.length, at: Date.now() } });
  return c.json({ url: `${c.env.TAP_BASE}/m/${key}`, name, size: bytes.length, type: kind[0] }, 201, h);
});

uploads.get('/m/:key', async c => {
  const key = c.req.param('key');
  if (!KEY_RE.test(key) || !c.env.MENUS) return c.text('Not found', 404);
  const { value, metadata } = await c.env.MENUS.getWithMetadata(key, { type: 'stream' });
  if (!value) return c.text('This file has expired or was removed.', 404);
  const headers = {
    'Content-Type': metadata.type,
    'Content-Disposition': `inline; filename="${metadata.name.replace(/"/g, '')}"`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, max-age=86400',
    'X-Robots-Tag': 'noindex'
  };
  // Images get a locked-down CSP; PDFs skip it because `sandbox` blocks Chrome's PDF viewer.
  if (metadata.type.startsWith('image/')) headers['Content-Security-Policy'] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox";
  return new Response(value, { headers });
});
