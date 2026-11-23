-- ORVANU inquiry management schema (Cloudflare D1 / SQLite).
-- Apply with: wrangler d1 execute orvanu-inquiries --remote --file=schema.sql
-- Local: applied by tools/dev-db.mjs

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS inquiries (
  id                TEXT PRIMARY KEY,           -- ORV-YYYYMMDD-xxxxxxxx
  created_at        TEXT NOT NULL,              -- ISO 8601, UTC
  updated_at        TEXT NOT NULL,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT,
  company           TEXT,
  service           TEXT,
  budget            TEXT,
  timeline          TEXT,
  description       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'New'
                    CHECK (status IN ('New', 'Contacted', 'In Discussion', 'Won', 'Lost')),
  status_changed_at TEXT,
  emailed_at        TEXT,                       -- set only after a confirmed provider response
  email_error       TEXT,
  ip_hash           TEXT,                       -- sha256(ip + secret); never the raw address
  user_agent        TEXT
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created  ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status   ON inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_email    ON inquiries (email);

CREATE TABLE IF NOT EXISTS attachments (
  id           TEXT PRIMARY KEY,
  inquiry_id   TEXT NOT NULL REFERENCES inquiries (id) ON DELETE CASCADE,
  r2_key       TEXT NOT NULL,
  filename     TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  created_at   TEXT NOT NULL,
  deleted_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_attachments_inquiry ON attachments (inquiry_id);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id_hash    TEXT PRIMARY KEY,                  -- sha256(session id + secret)
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  ip_hash    TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS login_codes (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,                    -- sha256(code + email + secret)
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_codes_email ON login_codes (email, created_at DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,                -- e.g. "login-ip:<hash>"
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  at         TEXT NOT NULL,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,                     -- login, logout, status_change, delete, purge, download
  inquiry_id TEXT,
  detail     TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log (at DESC);
