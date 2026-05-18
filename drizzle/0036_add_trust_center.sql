-- Trust Center: per-org public compliance page
-- Visitors can request access (NDA-gated) and view published compliance artifacts.

CREATE TABLE IF NOT EXISTS trust_center_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Public page config
  enabled             BOOLEAN NOT NULL DEFAULT false,
  slug                TEXT NOT NULL UNIQUE,          -- e.g. "acme" → trust.ghara.ifulabs.com/acme
  headline            TEXT,                          -- e.g. "Acme Security & Compliance"
  description         TEXT,
  logo_url            TEXT,
  -- NDA gate
  nda_required        BOOLEAN NOT NULL DEFAULT false,
  nda_document_url    TEXT,                          -- S3 URL of NDA PDF
  -- Published frameworks (array of framework keys)
  published_frameworks JSONB NOT NULL DEFAULT '[]',
  -- Published artifacts (array of { title, url, type, publishedAt })
  published_artifacts  JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trust_center_org_id ON trust_center_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_trust_center_slug ON trust_center_settings(slug);

-- Access requests: visitors who request access to the Trust Center
CREATE TABLE IF NOT EXISTS trust_center_access_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  company         TEXT,
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | denied
  nda_signed_at   TIMESTAMP,
  approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMP,
  token           TEXT NOT NULL UNIQUE,              -- access token for approved visitors
  token_expires_at TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_center_requests_org_id ON trust_center_access_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_trust_center_requests_token ON trust_center_access_requests(token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trust_center_requests_org_email ON trust_center_access_requests(org_id, email);
