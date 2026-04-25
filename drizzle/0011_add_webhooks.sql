-- Webhooks (outbound) — orgs subscribe a URL to receive event payloads
CREATE TABLE IF NOT EXISTS "webhooks" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"      uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "url"         text NOT NULL,
  "secret"      text NOT NULL,
  "events"      jsonb NOT NULL DEFAULT '[]'::jsonb,
  "description" text,
  "active"      boolean NOT NULL DEFAULT true,
  "last_delivery_at"     timestamp,
  "last_delivery_status" text,
  "created_at"  timestamp NOT NULL DEFAULT NOW(),
  "updated_at"  timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_webhooks_org_id" ON "webhooks"("org_id");
CREATE INDEX IF NOT EXISTS "idx_webhooks_active" ON "webhooks"("active");

-- Per-attempt delivery log so retries / debugging are inspectable
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "webhook_id"  uuid NOT NULL REFERENCES "webhooks"("id") ON DELETE CASCADE,
  "event"       text NOT NULL,
  "status_code" integer,
  "response_body" text,
  "error"       text,
  "attempt"     integer NOT NULL DEFAULT 1,
  "delivered_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_webhook_id" ON "webhook_deliveries"("webhook_id");
