-- F-A3: Budgets and anomaly detection tables

CREATE TABLE IF NOT EXISTS "budgets" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"          uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name"            text NOT NULL,
  "scope"           text NOT NULL DEFAULT 'org',
  "scope_value"     text,
  "monthly_amount"  numeric(12,2) NOT NULL,
  "currency"        text NOT NULL DEFAULT 'USD',
  "notify_at"       jsonb NOT NULL DEFAULT '[50, 80, 100]',
  "channels"        jsonb NOT NULL DEFAULT '["email"]',
  "last_notified_threshold" integer,
  "created_by"      uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"      timestamp NOT NULL DEFAULT NOW(),
  "updated_at"      timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_budgets_org_id" ON "budgets"("org_id");

CREATE TABLE IF NOT EXISTS "anomalies" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"          uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "detected_at"     timestamp NOT NULL DEFAULT NOW(),
  "scope"           text NOT NULL DEFAULT 'service',
  "scope_value"     text NOT NULL,
  "baseline_cost"   numeric(12,2) NOT NULL,
  "observed_cost"   numeric(12,2) NOT NULL,
  "delta_pct"       numeric(8,2) NOT NULL,
  "severity"        text NOT NULL DEFAULT 'medium',
  "status"          text NOT NULL DEFAULT 'open',
  "acknowledged_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "acknowledged_at" timestamp,
  "created_at"      timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_anomalies_org_id" ON "anomalies"("org_id");
CREATE INDEX IF NOT EXISTS "idx_anomalies_org_status" ON "anomalies"("org_id", "status");
