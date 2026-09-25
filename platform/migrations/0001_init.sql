-- Tap4 platform schema. See docs/TAP4_DASHBOARD_ARCHITECTURE.md §5.

CREATE TABLE businesses (
  id            INTEGER PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  logo_url      TEXT,
  brand_color   TEXT,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  shopify_customer_id TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Destinations live on the business; device slots point at a key.
CREATE TABLE business_links (
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  key         TEXT NOT NULL,
  url         TEXT,
  PRIMARY KEY (business_id, key)
);

CREATE TABLE devices (
  code          TEXT PRIMARY KEY,
  label         TEXT,
  business_id   INTEGER REFERENCES businesses(id),
  product_sku   TEXT NOT NULL,
  branch        TEXT,
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','qc_passed','active','disabled')),
  qc            TEXT,
  qc_by         TEXT,
  shopify_order TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_scan_at TEXT,
  qc_at         TEXT,
  activated_at  TEXT
);
CREATE INDEX devices_business ON devices(business_id);

-- slot is burned into the chip URL: it never changes meaning, only link_key does.
CREATE TABLE device_slots (
  device_code TEXT NOT NULL REFERENCES devices(code),
  slot        TEXT NOT NULL,
  link_key    TEXT NOT NULL,
  PRIMARY KEY (device_code, slot)
);

CREATE TABLE events (
  id           INTEGER PRIMARY KEY,
  ts           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  device_code  TEXT,
  business_id  INTEGER,
  slot         TEXT,
  source       TEXT NOT NULL CHECK (source IN ('nfc','qr','page')),
  link_key     TEXT,
  visitor      TEXT,
  country      TEXT,
  bot          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX events_biz_ts ON events(business_id, ts);
CREATE INDEX events_dev_ts ON events(device_code, ts);
CREATE INDEX events_ts ON events(ts);

CREATE TABLE audit_log (
  id        INTEGER PRIMARY KEY,
  ts        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor     TEXT NOT NULL,
  entity    TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  change    TEXT NOT NULL
);
