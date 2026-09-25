# Tap4 Dashboard & Redirect Platform — Architecture

Status: proposal, nothing built yet. Written 2026-09-26 against commit `559a1b9`.

Goal: the smallest reliable software layer that makes Tap4's physical NFC + QR products
**manageable, editable, measurable, and scalable**, without redesigning the existing site.

---

## 1. What exists today (audit)

This repo is a **Shopify Online Store 2.0 theme**. There is no application backend.

| Area | What's there | Notes |
|---|---|---|
| Frontend | Liquid sections + one vanilla JS file (`assets/theme.js`, ~500 lines) + one CSS file (`assets/theme.css`, ~560 lines) | No framework, no build step. |
| Backend | **None.** Shopify is the runtime. | |
| Database | **None.** Catalog lives in Shopify (seeded from `products.csv`). | |
| Auth | **None** beyond Shopify customer accounts (not used by the theme). | |
| Routing | Shopify templates (`templates/*.json`). Homepage = `index.json`. | Shopify owns the root domain, so it can't serve `/t/:id`. |
| API routes | Only Shopify's `/cart/add.js` (called from the builder). | |
| Env vars | None. `.env*` ignored in `.gitignore`. | |
| Deploy | `shopify theme push`; GitHub Action runs theme check, tests, preview build, package. | `npm run package` points at `scripts/package.mjs`, which doesn't exist, so CI fails at that step. |
| Local preview | `scripts/preview.mjs`: liquidjs render + CSV-backed fake catalog. | Good; keep. |

### The "dashboard" today
`sections/tf-dashboard.liquid` is a **marketing demo**. Its KPIs, bars, split, and reseller
pipeline are hard-coded strings (`assign kpis = 'TAPS · 30D|1,284|…'`). There's no data source behind it.
The "live taps" marquee (`tf-live-taps`, `templates/index.json`) is also sample data.

### The "configurator" today
`sections/tf-builder.liquid` + `theme.js` (`S` state → `derive()` → `view*()`):
- Presets, hardware picker, mode (`direct` / `quad` / `app`), destination chips, 4-zone slot picker,
  URL fields with validation, add-ons, plans, services, and a live preview.
- On order it posts **line-item properties** to the Shopify cart:
  `Business name`, `Headline`, `Setup`, `Tap opens`, `Tap zones`, `4-in-1 apps`, `"<label> URL"`.
- **This is where every device record starts.** The platform should import these properties
  rather than ask the customer again.

### Product mapping (your list vs the catalog)

| Your product | Catalog handle / SKU | Chips | QR |
|---|---|---|---|
| Premium acrylic + NFC tap base | `acrylic-glass-stand` / `TF-STAND-ACR` | 1 | backup QR |
| L-shaped acrylic | `l-stand` / `TF-STAND-L` | 1 | backup QR |
| Horizontal 4-in-1 | `4-tap-bar` / `TF-BAR` | **4** | — |
| Personal NFC card | `nfc-card-4-in-1` / `TF-CARD` | 1 → links page | — |
| Triangle PVC stand | **not in catalog** | ? | ? |
| (add-on) Printed QR menu | `printed-qr-menu` | — | menu QR |

**Naming collision:** "4-in-1" means two different things: the **4-chip bar** and the
**1-chip card that opens a 4-link page**. The data model below handles both, but the site copy should
pick distinct names.

### Reusable design system (keep it, don't redesign)
Everything the dashboard needs is already styled in `assets/theme.css`:

- **Tokens:** `--bg #0a0a0b`, `--fg #f2f0eb`, `--lime #c8f23c`, greys `--m1…--m5`, surfaces `--card`, `--l1…--l4`, `--mono`.
- **Fonts:** Instrument Sans + JetBrains Mono (self-hosted woff2 in `assets/`).
- **Dashboard shell:** `.dash`, `.dash__top`, `.dash__body`, `.seg` tabs.
- **KPIs & charts:** `.kpis`, `.kpi`, `.kpi--lime`, `.bars` (daily taps), `.split` / `.split__bar` (where taps go).
- **Kanban:** `.pipe`, `.pipe__col`, `.deal`. Reuse for the **provisioning queue** (new → QC → shipped).
- **Forms:** `.panel`, `.panel__head`, `.field`, `.opt`, `.chips-row`, `.dchip`, `.pchip`, `.btn--*`, `.tag--*`.
- **4-zone bar render:** `.quad`, `.zone`, `.slots`/`.slot`. Reuse for editing a bar's 4 tap zones.
- **Hosted pages already designed:** `.kn` / `.kn-links` (tf-app card 2) *is* the 4-in-1 links page;
  `.pv-phone` / `.mi` (builder preview) *is* the mobile menu page.
- **Icons:** `snippets/icon-sprite.liquid` (google, facebook, instagram, tiktok…), `.tf-mark` leaf logo.

Plan: the platform copies `theme.css`, the fonts, and the icon sprite at deploy time (one `cp` in a
script). The theme stays the only source of truth for the look.

---

## 2. What's missing

1. A server that answers `/t/:code` and `/q/:code` and redirects. **This is the product.**
2. A database for businesses, links, devices, and events.
3. Admin auth.
4. Hosted pages that are **already being sold** but have nowhere to live:
   - 4-in-1 links page (`multi-link-page`: "links stay live for life")
   - Printed QR menu (`printed-qr-menu`: "We build your mobile menu")
5. QR export, provisioning/QC workflow, analytics queries.
6. A bridge from Shopify orders (line-item properties) to device records.

---

## 3. Recommended architecture

```
                      ┌─────────────── Shopify (unchanged) ────────────────┐
 customer ──browse──▶ │ theme: hero, builder, plans, cart, checkout, billing│
                      └───────────────┬────────────────────────────────────┘
                                      │ Admin API (read_orders): "Import order #"
                                      ▼
 phone ──tap/scan──▶ go.tapfour.ph ── Cloudflare Worker (one app, Hono) ── D1 (SQLite)
                       /t/:code[/:slot]   302 → destination  + log event (waitUntil)
                       /q/:code[/:slot]
                       /p/:slug           hosted links page / menu (theme.css look)
                       /admin/*           internal dashboard  ← Cloudflare Access (SSO)
                       /app/*             customer dashboard  (Phase 2)
```

Why this shape:
- **Shopify keeps commerce.** Orders, payments, subscriptions, fulfilment, and customer email already work there. Don't rebuild them.
- **The redirect must outlive everything else.** The copy says "stand works alone", "pay once, works forever", and
  "cancel anytime, your stand keeps working". Redirects run at the edge and never check subscription status.
- **One deployable.** Redirects, hosted pages, and admin live in one Worker with one database: nothing to sync and one bill (likely $0–5/mo at your scale).
- **No auth code for MVP.** Cloudflare Access sits in front of `/admin` (Google/email OTP, free for up to 50 users).
- **Subdomain, not the root.** Shopify serves `tapfour.ph` and can't be proxied for `/t/*`, so tap URLs live on
  `go.tapfour.ph` (or a short domain like `tap4.ph`). The platform owns it outright.

Code location: `platform/` in this repo (add `platform/**` to `.shopifyignore`), so it can reuse `assets/theme.css` directly.

Rejected:
- **Shopify URL Redirects.** They're 301s, which phones cache, so edits wouldn't take effect. They also give no analytics.
- **Shopify App Proxy (`/apps/t/...`).** It adds latency and keeps you tied to Shopify's proxy.
- **Next.js + Supabase.** It works, but it means more moving parts and cold starts on the tap path. Revisit only if the customer dashboard grows into a real SPA.

---

## 4. Tools & packages (only these)

| Need | Use | Custom or off-the-shelf |
|---|---|---|
| Runtime / hosting | Cloudflare Workers | service |
| Database | Cloudflare D1 (SQLite, built-in point-in-time restore) | service |
| Router + HTML (auto-escaping JSX) | `hono` | library |
| Admin login + roles | Cloudflare Access; the Worker also verifies the `Cf-Access-Jwt-Assertion` JWT (`jose`) | service |
| Deploy / migrations | `wrangler` | CLI |
| QR SVG/PNG | `qrcode` (SVG in browser → canvas → PNG) | library |
| Order import | Shopify Admin GraphQL, custom-app token, `read_orders` scope | service |
| Uptime | Any HTTP monitor hitting a canary device `/t/CANARY` | service |
| NFC writing (MVP) | NXP TagWriter / NFC Tools on a phone, **or pre-encoded chips from the supplier** (CSV of URLs, locked) | external |
| Redirect, resolver, events, QC, admin screens | — | **custom** (small) |

Not needed: React/Next, Redux, GraphQL server, Redis, queues, Segment/Mixpanel/ClickHouse,
Stripe (Shopify bills), an auth SaaS for MVP, Docker/K8s, or microservices.

Env / secrets: `SHOPIFY_STORE`, `SHOPIFY_ADMIN_TOKEN`, `CF_ACCESS_AUD`, `CF_ACCESS_TEAM`, `HASH_SECRET`.

---

## 5. Database (minimum schema)

Core idea: **destinations belong to the business, not the device.** A device slot points to a
business link *key*. If Kape Norte changes its Instagram once, all 5 stands across 3 branches update.

```sql
CREATE TABLE businesses (
  id            INTEGER PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,          -- /p/kape-norte
  name          TEXT NOT NULL,
  logo_url      TEXT,
  brand_color   TEXT,                           -- '#c8f23c'
  contact_name  TEXT, email TEXT, phone TEXT,
  shopify_customer_id TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reusable instead of google_url/facebook_url/... columns.
-- key: google | menu | website | facebook | instagram | tiktok | links | custom-*
CREATE TABLE business_links (
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  key         TEXT NOT NULL,
  label       TEXT,
  url         TEXT,                             -- NULL for Tap4-hosted keys ('links', hosted 'menu')
  PRIMARY KEY (business_id, key)
);

CREATE TABLE devices (
  code          TEXT PRIMARY KEY,               -- random, in the URL: 'K7M2QX'
  label         TEXT,                           -- human: 'TF-KN-0001', 'Counter 1'
  business_id   INTEGER REFERENCES businesses(id),   -- NULL = blank stock
  product_sku   TEXT NOT NULL,                  -- TF-STAND-ACR | TF-STAND-L | TF-BAR | TF-CARD | (triangle)
  branch        TEXT,                           -- text until multi-branch is real
  status        TEXT NOT NULL DEFAULT 'new'     -- new | qc_passed | active | disabled
                CHECK (status IN ('new','qc_passed','active','disabled')),
  qc            TEXT,                           -- JSON checklist {"nfc":true,"qr":true,...}
  qc_by         TEXT,
  shopify_order TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_scan_at TEXT,                           -- = "programmed" (proved by the scan itself)
  qc_at         TEXT,
  activated_at  TEXT
);

-- One row per tap zone / QR target on a device. 4-chip bar = 4 rows. Stand = 1–2 rows.
-- slot is part of the burned URL, so it NEVER changes meaning; only link_key/label change.
CREATE TABLE device_slots (
  device_code TEXT NOT NULL REFERENCES devices(code),
  slot        TEXT NOT NULL,                    -- 'main' | 'z1'..'z4' | 'menu'
  link_key    TEXT NOT NULL,                    -- → business_links.key
  label       TEXT,
  PRIMARY KEY (device_code, slot)
);

CREATE TABLE events (
  id           INTEGER PRIMARY KEY,
  ts           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  device_code  TEXT NOT NULL,
  business_id  INTEGER,                         -- snapshot: survives device reassignment
  slot         TEXT NOT NULL,
  source       TEXT NOT NULL CHECK (source IN ('nfc','qr','page')),
  link_key     TEXT,                            -- google | menu | instagram | ...
  visitor      TEXT,                            -- HMAC(ip+ua, HASH_SECRET+date); no raw IP
  country      TEXT,
  bot          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX events_biz_ts ON events(business_id, ts);
CREATE INDEX events_dev_ts ON events(device_code, ts);

CREATE TABLE audit_log (                        -- who changed which destination, when
  id INTEGER PRIMARY KEY, ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, change TEXT NOT NULL
);
```

Deliberately **not** tables yet: branches (text column), orders/production/suppliers
(Shopify order + `devices.status` + `note`), users/roles (Cloudflare Access), QC checklist items (JSON).
Total taps and last interaction are computed from `events`. Add counter columns only if the list page gets slow.

How the 4-in-1 cases fall out:
- **4-Tap Bar:** 1 device, 4 slots `z1..z4` → `google`, `facebook`, `instagram`, `tiktok`. Each chip has its own URL, destination, and analytics.
  The builder already lets a zone switch platforms (`slot` action), which is why slots are positional (`z2`), not `facebook`.
- **4-in-1 Card:** 1 device, slot `main` → `links` → Tap4-hosted page listing the business's links.
  Clicks on that page are logged as `source='page'` events.
- **Acrylic + QR backup + menu:** slot `main` → `google` (reached by `/t/` or `/q/`), slot `menu` → `menu`.

---

## 6. URL / redirect architecture

```
https://go.tapfour.ph/t/K7M2QX        NFC, default slot 'main'
https://go.tapfour.ph/t/K7M2QX/z2     NFC, bar zone 2
https://go.tapfour.ph/q/K7M2QX        QR, default slot
https://go.tapfour.ph/q/K7M2QX/menu   QR, menu
https://go.tapfour.ph/p/kape-norte    hosted links page (also the fallback)
```

The prefix decides the source (`/t` = NFC, `/q` = QR). The same slot can be reached both ways, so it isn't stored on the slot.

**Resolver** (one function, unit-tested):
1. Normalise the code (uppercase) and look up the device + slot + business link in a single query.
2. Unknown code → Tap4 "not found" page (404).
3. `status = new` → 302 to `/admin/qc/:code`. Staff land on the QC page (Access login); anyone else gets the Access wall.
4. `status = disabled` → neutral Tap4 notice page.
5. `qc_passed` / `active` → `url` if set; `links`/hosted `menu` → `/p/:slug`; missing link → `/p/:slug`.
6. Respond **302** with `Cache-Control: no-store` so every tap is counted and edits apply instantly.
7. Log the event in `ctx.waitUntil()`. Logging never delays or breaks the redirect.

Performance and reliability: one indexed D1 read at the edge, so latency should be tens of ms. If D1 is unreachable, serve a
Tap4 page that retries automatically, never a 500. A canary device is checked every minute by an uptime monitor.

Device code format: **6 characters of Crockford base32, random** (~1 billion combinations, no 0/O/1/I confusion).
Keep `TF-KN-0001` as the printed/admin `label`, not the URL. Here's why:
- Sequential codes are enumerable (competitors scrape your client list, and bots pollute analytics).
- `KN` ties a chip to one business forever, which blocks **pre-encoded blank stock**.

Chip/QR budget: `https://go.tapfour.ph/t/K7M2QX/z2` is ~25 bytes after NDEF's `https://` prefix byte, far below the
144 bytes on an NTAG213. For QR, uppercasing the whole URL enables alphanumeric mode, which gives a smaller, denser-safe code.

---

## 7. Events / analytics

**One event per request, not one event type per platform.** `nfc_tap → google` *is*
"review page open". Your list maps like this:

| You asked for | Stored as |
|---|---|
| nfc_tap | `source='nfc'` |
| qr_scan | `source='qr'` |
| review_page_open | `link_key='google'` |
| menu_open | `link_key='menu'` |
| instagram/facebook/tiktok/website_open | `link_key=…` (from a slot **or** a click on the hosted links page, `source='page'`) |

Dimensions: business, device, product (join `product_sku`), branch (join), source, link_key, time. All of them come from one table and plain `GROUP BY`s.

Hygiene: flag bots by user agent (`facebookexternalhit`, crawlers, link previewers). Count
**unique visitors per day** via the daily-rotating `visitor` hash, and dedupe the same visitor + slot within 10 s (Android double-reads).

Honesty rules:
- **"Review page opened" is not a review.** Label it "Review page opens".
- Review counts and ratings need the Google Business Profile API (owner OAuth). That's Phase 2 at the earliest.
- Follower counts need the Meta/TikTok APIs. That's later, if ever.
- ⚠ The current demo and copy already claim "NEW REVIEWS 38", "+12 Instagram followers", "rating 4.4 → 4.8★", and "Dashboard for taps, **reviews, followers**". The MVP can't measure reviews or followers. Either relabel them as examples or change the copy before the dashboard ships.

Dashboard rendering reuses `.kpis` (taps, review opens, menu opens, unique visitors), `.bars` (taps/day), and `.split` (where taps go).
Scale path: when `events` passes ~10M rows, add a daily rollup table or move raw events to Workers Analytics Engine. Not before.

---

## 8. Device lifecycle (provisioning + QC)

```
 new ──(first scan hits QC page: "programmed" auto-recorded)──▶ QC checklist ──▶ qc_passed ──(ship)──▶ active
  │                                                                                         │
  └──────────────────────────── disabled (lost / failed / replaced) ◀────────────────────────┘
```

1. **Create:** "Import Shopify order #1043" creates the business and business_links from line-item properties, plus devices
   and slots per product/qty. Or batch-create blank stock ("50 × TF-STAND-ACR").
2. **Encode:** admin shows each device's URLs with **copy** buttons and QR downloads. Write with NFC Tools/TagWriter, then
   **lock the tag** (read-only). At volume, send the supplier a CSV of URLs to pre-encode and lock.
3. **Verify:** tap the chip / scan the QR. Because status is `new`, it opens `/admin/qc/K7M2QX`. The fact that the right page opened
   proves the chip holds the right URL. `first_scan_at` is stamped with no "mark programmed" click.
4. **QC page** (`.panel` + `.feat` toggles), with items generated from the device's slots:
   NFC ✓ · QR ✓ · each destination (button opens it) ✓ · correct logo ✓ · correct business ✓ · correct product ✓ · print approved ✓.
   → **Pass** (`qc_passed`, `qc_by`, `qc_at`) or **Fail** (`disabled` + note).
5. **Ship:** mark active when fulfilled in Shopify (MVP: a button; Phase 2: fulfilment webhook).
6. **Queue view** reuses the `.pipe` kanban: New / QC / Ready / Shipped.

Future writers plug into step 2 only:
- **Android Web NFC** (`NDEFReader.write` + `makeReadOnly()`, Chrome on Android) is about 20 lines on the admin page. That's Phase 2.
- **USB writers** (ACR122U) need a native helper. Probably never, if the supplier pre-encodes.

---

## 9. Security

| Risk | Mitigation |
|---|---|
| **Open redirect** | Destinations come only from the DB, never from query params. Save-time validation: `https:` only (reuse the builder's `new URL()` check). Block `javascript:`/`data:`. Optional Safe Browsing check later. |
| **Destination hijack** (the worst case: every stand becomes a phishing link) | MVP: only Tap4 staff edit. Phase 2 customer edits: email the owner on every change, write the audit_log, add admin "freeze", and rate-limit edits. |
| **Device ID guessing** | Random codes. Never use a device code as a claim secret. If self-activation ever exists, it uses a separate one-time claim code inside the box. |
| **Chip tampering** | Lock tags after writing. Otherwise anyone with a free NFC app can rewrite a café's stand. |
| **QR sticker overlay** | Print `go.tapfour.ph` under the QR so guests can see the host. The QC photo is a reference for support. |
| **Admin access** | Cloudflare Access (SSO / OTP, per-email allow-list). The Worker re-verifies the Access JWT. Start with one admin role; split production-staff vs admin only when needed. |
| **Customer data / tenant isolation** | Phase 2: every `/app` query goes through one `requireBusiness(user)` helper. Never trust a business id from the client. |
| **Analytics privacy (PH Data Privacy Act)** | No raw IPs. Visitor = HMAC with a daily salt. Store country only. The public "live taps" ticker stays sample data or anonymised. |
| **Secrets** | `wrangler secret` only. Shopify token has read-only `read_orders` scope. |
| **Availability** (a legal promise: "works forever") | Edge runtime, 302 + no-store, D1 point-in-time restore, canary monitor, long domain renewal on auto-pay. |

---

## 10. Scope

### MVP (what makes the physical products manageable)
1. Worker + D1 schema + resolver `/t` `/q`, event logging, not-found/disabled pages. Resolver unit tests.
2. Admin (Access-protected): businesses + links, devices + slots, batch create, edit destination (audit-logged).
3. Device page: URLs with copy buttons, QR SVG/PNG download + preview.
4. QC flow (scan → QC page → pass/fail) and queue view.
5. Hosted `/p/:slug` links page (`.kn-links` look), because it's **already sold**.
6. Per-business analytics (`.kpis` / `.bars` / `.split`).
7. "Import Shopify order #" button.
8. Fix CI: `npm run package` references the missing `scripts/package.mjs`.

### Phase 2
- Customer login + `/app`: Overview, My Devices, Destinations (with email-on-change), Analytics, Branding, Account.
- Hosted menu editor (plain "Category / Item | note | price" textarea rendered with the `.pv-phone`/`.mi` look).
- Shopify webhooks (`orders/create`, fulfilment) replacing the import button.
- Configurator: logo upload (Shopify supports file line-item properties via multipart `/cart/add`, no storage of our own) and brand colour on the CSS-rendered previews (`.quad`, phone).
- Android Web NFC writing. Branches table. Google Business Profile review counts.

### Later scale
- Analytics rollups / Analytics Engine, reseller/agency multi-tenant + white-label, USB writers,
  table ordering, CRM in/out, Wi-Fi.

---

## 11. Overbuild warnings

- **Orders / Production / Supplier modules:** Shopify orders + `devices.status` + `note` + a spreadsheet cover this until volume proves otherwise.
- **A separate event type per platform:** one row with `link_key` does it.
- **Branches entity:** use a text column until a Business-plan customer actually has 2+ branches.
- **Customer dashboard before the admin + QC loop is solid:** Tap4 staff *are* the dashboard for the first customers (you already sell "Managed dashboard").
- **Live logo compositing onto product photos:** the photos are JPGs. Composite only on the CSS-rendered faces.
- **Add-ons listed as active SKUs that don't exist:** *Table ordering*, *Customer in/out data*, *Tap-to-join Wi-Fi*,
  and the Agency plan's pipeline/white-label/billing. Each is a product in itself.
  - Wi-Fi **can't** go through a redirect: it needs a Wi-Fi NDEF record on the chip, and iPhones don't join Wi-Fi from tags.
  - Consider hiding these until built.
