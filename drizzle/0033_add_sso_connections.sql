-- SSO/SAML connections for Scale-tier organizations
-- Each org can have one active SAML connection to their corporate IdP.

CREATE TABLE IF NOT EXISTS "sso_connections" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"              uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "provider"            text NOT NULL DEFAULT 'saml',          -- 'saml' | 'oidc' (future)
  "display_name"        text NOT NULL,                         -- e.g. "Okta", "Azure AD", "Google Workspace"
  "domain"              text NOT NULL,                         -- verified email domain (e.g. "acme.com")
  "idp_entity_id"       text,                                  -- IdP Entity ID / Issuer
  "idp_sso_url"         text,                                  -- IdP Single Sign-On URL
  "idp_certificate"     text,                                  -- IdP X.509 certificate (PEM)
  "idp_metadata_url"    text,                                  -- Optional: IdP metadata URL for auto-config
  "sp_entity_id"        text NOT NULL,                         -- Our SP Entity ID
  "sp_acs_url"          text NOT NULL,                         -- Our Assertion Consumer Service URL
  "status"              text NOT NULL DEFAULT 'pending',       -- 'pending' | 'active' | 'inactive'
  "domain_verified"     boolean NOT NULL DEFAULT false,        -- Whether domain ownership is verified
  "domain_verification_token" text,                            -- DNS TXT record value for verification
  "enforce_sso"         boolean NOT NULL DEFAULT false,        -- If true, password login disabled for this domain
  "jit_provisioning"    boolean NOT NULL DEFAULT true,         -- Auto-create users on first SSO login
  "default_role"        text NOT NULL DEFAULT 'member',        -- Role assigned to JIT-provisioned users
  "last_used_at"        timestamp,
  "created_at"          timestamp NOT NULL DEFAULT now(),
  "updated_at"          timestamp NOT NULL DEFAULT now()
);

-- One active SSO connection per org
CREATE UNIQUE INDEX "idx_sso_connections_org_id" ON "sso_connections"("org_id");
-- Lookup by domain for login routing
CREATE UNIQUE INDEX "idx_sso_connections_domain" ON "sso_connections"("domain") WHERE "status" = 'active';
-- General index
CREATE INDEX "idx_sso_connections_status" ON "sso_connections"("status");
