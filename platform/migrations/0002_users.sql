-- Logins for Tap4 admins (admin.tap4.ph) and business owners (app.tap4.ph).
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL COLLATE NOCASE,
  name          TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','owner')),
  business_id   INTEGER REFERENCES businesses(id), -- ponytail: one business per owner; add a memberships table for agencies
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until  TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  CHECK (role = 'admin' OR business_id IS NOT NULL)
);
CREATE INDEX users_business ON users(business_id);

-- Only a SHA-256 of the cookie token is stored, so a leaked table can't be replayed.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX sessions_user ON sessions(user_id);
