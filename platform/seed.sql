-- LOCAL DEMO DATA ONLY (npm run db:init). Same sample businesses as the marketing site.
DELETE FROM events; DELETE FROM audit_log; DELETE FROM device_slots; DELETE FROM devices; DELETE FROM business_links; DELETE FROM businesses;

INSERT INTO businesses (id, slug, name, brand_color, contact_name, email, phone) VALUES
  (1, 'kape-norte', 'Kape Norte', '#c8f23c', 'Ana Reyes', 'hello@kapenorte.example', '+63 917 000 0001'),
  (2, 'hapag-grill', 'Hapag Grill', NULL, 'Jun Cruz', 'jun@hapaggrill.example', '+63 917 000 0002'),
  (3, 'salon-ligaya', 'Salon Ligaya', '#f27fa8', 'Liza Santos', NULL, '+63 917 000 0003');

INSERT INTO business_links (business_id, key, url) VALUES
  (1, 'google', 'https://g.page/r/kape-norte-example/review'), (1, 'menu', 'https://kapenorte.example/menu'),
  (1, 'facebook', 'https://facebook.com/kapenorte.example'), (1, 'instagram', 'https://instagram.com/kapenorte.example'),
  (1, 'tiktok', 'https://tiktok.com/@kapenorte.example'),
  (2, 'google', 'https://g.page/r/hapag-grill-example/review'), (2, 'facebook', 'https://facebook.com/hapaggrill.example'),
  (2, 'menu', 'https://hapaggrill.example/menu'),
  (3, 'google', 'https://g.page/r/salon-ligaya-example/review'), (3, 'instagram', 'https://instagram.com/salonligaya.example'),
  (3, 'tiktok', 'https://tiktok.com/@salonligaya.example'), (3, 'facebook', 'https://facebook.com/salonligaya.example');

INSERT INTO devices (code, label, business_id, product_sku, branch, status, created_at, first_scan_at, qc_at, qc_by, activated_at, note) VALUES
  ('K7M2QX', 'TF-KN-0001', 1, 'TF-STAND-ACR', 'Maginhawa', 'active', datetime('now','-40 days'), datetime('now','-39 days'), datetime('now','-39 days'), 'dev@local', datetime('now','-37 days'), NULL),
  ('K7M2R4', 'TF-KN-0002', 1, 'TF-STAND-ACR', 'BGC', 'active', datetime('now','-25 days'), datetime('now','-24 days'), datetime('now','-24 days'), 'dev@local', datetime('now','-22 days'), NULL),
  ('KB4R00', 'TF-KN-0003', 1, 'TF-BAR', 'Maginhawa', 'active', datetime('now','-20 days'), datetime('now','-19 days'), datetime('now','-19 days'), 'dev@local', datetime('now','-18 days'), NULL),
  ('X9DEAD', 'TF-KN-0004', 1, 'TF-STAND-L', 'BGC', 'disabled', datetime('now','-26 days'), datetime('now','-26 days'), NULL, NULL, NULL, 'QC failed: acrylic cracked in transit'),
  ('HG7P2A', 'TF-HG-0001', 2, 'TF-STAND-L', NULL, 'active', datetime('now','-35 days'), datetime('now','-34 days'), datetime('now','-34 days'), 'dev@local', datetime('now','-33 days'), NULL),
  ('HG7P2B', 'TF-HG-0002', 2, 'TF-STAND-PVC', NULL, 'qc_passed', datetime('now','-2 days'), datetime('now','-1 days'), datetime('now','-1 days'), 'dev@local', NULL, NULL),
  ('SG3C9D', 'TF-SL-0001', 3, 'TF-CARD', NULL, 'active', datetime('now','-30 days'), datetime('now','-30 days'), datetime('now','-30 days'), 'dev@local', datetime('now','-29 days'), NULL),
  ('SG3C9E', 'TF-SL-0002', 3, 'TF-STAND-ACR', NULL, 'new', datetime('now','-1 days'), datetime('now','-3 hours'), NULL, NULL, NULL, NULL),
  ('S7K001', 'TF-STOCK-0001', NULL, 'TF-STAND-ACR', NULL, 'new', datetime('now','-3 days'), NULL, NULL, NULL, NULL, NULL),
  ('S7K002', 'TF-STOCK-0002', NULL, 'TF-STAND-ACR', NULL, 'new', datetime('now','-3 days'), NULL, NULL, NULL, NULL, NULL),
  ('S7K003', 'TF-STOCK-0003', NULL, 'TF-CARD', NULL, 'new', datetime('now','-3 days'), NULL, NULL, NULL, NULL, NULL);

INSERT INTO device_slots (device_code, slot, link_key) VALUES
  ('K7M2QX', 'main', 'google'), ('K7M2QX', 'menu', 'menu'),
  ('K7M2R4', 'main', 'google'),
  ('KB4R00', 'z1', 'google'), ('KB4R00', 'z2', 'facebook'), ('KB4R00', 'z3', 'instagram'), ('KB4R00', 'z4', 'tiktok'),
  ('X9DEAD', 'main', 'google'),
  ('HG7P2A', 'main', 'google'), ('HG7P2B', 'main', 'google'), ('HG7P2B', 'menu', 'menu'),
  ('SG3C9D', 'main', 'links'), ('SG3C9E', 'main', 'google'),
  ('S7K001', 'main', 'google'), ('S7K002', 'main', 'google'), ('S7K003', 'main', 'links');

-- ~1,800 deterministic pseudo-random taps over 30 days, busier recently.
WITH RECURSIVE
  n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1800),
  t(k, code, biz, slot, link, src) AS (VALUES
    (0,'K7M2QX',1,'main','google','nfc'), (1,'K7M2QX',1,'main','google','nfc'), (2,'K7M2QX',1,'main','google','qr'),
    (3,'K7M2QX',1,'menu','menu','qr'), (4,'K7M2QX',1,'menu','menu','qr'), (5,'K7M2R4',1,'main','google','nfc'),
    (6,'KB4R00',1,'z1','google','nfc'), (7,'KB4R00',1,'z2','facebook','nfc'), (8,'KB4R00',1,'z3','instagram','nfc'),
    (9,'KB4R00',1,'z4','tiktok','nfc'), (10,'HG7P2A',2,'main','google','nfc'), (11,'HG7P2A',2,'main','google','qr'),
    (12,'SG3C9D',3,'main','links','nfc'), (13,'SG3C9D',3,NULL,'instagram','page'), (14,'SG3C9D',3,NULL,'tiktok','page'),
    (15,'K7M2QX',1,'main','google','nfc'))
INSERT INTO events (ts, device_code, business_id, slot, source, link_key, visitor, country, bot)
SELECT datetime('now', '-' || (((i * 7919) % 43200) * ((i % 4) + 1) / 4) || ' minutes'),
       t.code, t.biz, t.slot, t.src, t.link, 'v' || ((i * 31) % 420), 'PH', (i % 41 = 0)
FROM n JOIN t ON t.k = (i * 5 + i / 7) % 16;
