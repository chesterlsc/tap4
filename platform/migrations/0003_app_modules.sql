-- tapfour app modules sold on the landing page: plan per client, branches, live QR menu,
-- billing tracker, inventory tracker, staff tracker. See docs/TAP4_SOFTWARE_ROADMAP.md.

-- What the client bought (set by staff; later from Shopify). NULL plan = hardware only.
ALTER TABLE businesses ADD COLUMN plan TEXT CHECK (plan IN ('solo','business','empire'));
ALTER TABLE businesses ADD COLUMN billing TEXT CHECK (billing IN ('monthly','yearly'));
ALTER TABLE businesses ADD COLUMN package TEXT CHECK (package IN ('solo','business','empire'));
ALTER TABLE businesses ADD COLUMN table_ordering TEXT CHECK (table_ordering IN ('quote','active'));
ALTER TABLE businesses ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'active' CHECK (plan_status IN ('active','cancelled'));

-- A client's branches. Other tables refer to a branch by name (as devices.branch already does).
CREATE TABLE branches (
  id          INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  name        TEXT NOT NULL,
  address     TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_id, name)
);
INSERT INTO branches (business_id, name)
  SELECT DISTINCT business_id, branch FROM devices WHERE business_id IS NOT NULL AND branch IS NOT NULL AND branch != '';

CREATE TABLE menu_items (
  id          INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  category    TEXT NOT NULL DEFAULT 'Menu',
  name        TEXT NOT NULL,
  note        TEXT,
  price_cents INTEGER,
  sold_out    INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX menu_items_business ON menu_items(business_id, category, sort);

CREATE TABLE bills (
  id             INTEGER PRIMARY KEY,
  business_id    INTEGER NOT NULL REFERENCES businesses(id),
  branch         TEXT,
  name           TEXT NOT NULL,
  amount_cents   INTEGER,
  due_date       TEXT NOT NULL,              -- YYYY-MM-DD (PH date)
  repeat_monthly INTEGER NOT NULL DEFAULT 0,
  paid_at        TEXT,
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX bills_business ON bills(business_id, paid_at, due_date);

CREATE TABLE stock_items (
  id          INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  branch      TEXT,
  name        TEXT NOT NULL,
  unit        TEXT,
  qty         REAL NOT NULL DEFAULT 0,
  low_at      REAL,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX stock_items_business ON stock_items(business_id);

CREATE TABLE staff (
  id          INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  branch      TEXT,
  name        TEXT NOT NULL,
  role        TEXT,
  days        TEXT NOT NULL DEFAULT '1111110',  -- Mon..Sun, 1 = works that day
  shift_start TEXT,                              -- 'HH:MM' PH time
  shift_end   TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX staff_business ON staff(business_id);
