-- Per-org AI/LLM usage log. Every Bedrock or Claude API call writes a row so
-- we can (a) bill per token where appropriate, (b) detect runaway usage on
-- a single org, and (c) see which models are costing us money in aggregate.
--
-- Cost is computed at write time using the model's per-token rate, frozen at
-- the time of the call. Rate changes don't retroactively rewrite history.
CREATE TABLE IF NOT EXISTS "ai_usage_log" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"            uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id"           uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "service"           text NOT NULL,         -- 'comply' | 'finops'
  "operation"         text NOT NULL,         -- e.g. 'control.explain', 'finops.summary'
  "model"             text NOT NULL,         -- model id used
  "input_tokens"      integer NOT NULL DEFAULT 0,
  "output_tokens"     integer NOT NULL DEFAULT 0,
  "estimated_cost_usd" numeric(10, 6) NOT NULL DEFAULT 0,
  "created_at"        timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ai_usage_log_org_id_created_at"
  ON "ai_usage_log" ("org_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_ai_usage_log_created_at"
  ON "ai_usage_log" ("created_at" DESC);
