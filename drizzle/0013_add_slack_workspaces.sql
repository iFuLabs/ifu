-- Slack workspaces — orgs install the iFu Labs Slack app via OAuth
CREATE TABLE IF NOT EXISTS "slack_workspaces" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"           uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "team_id"          text NOT NULL,
  "team_name"        text,
  "access_token"     text NOT NULL,
  "bot_user_id"      text,
  "scope"            text,
  "channel_id"       text,
  "channel_name"     text,
  "installed_by"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "active"           boolean NOT NULL DEFAULT true,
  "created_at"       timestamp NOT NULL DEFAULT NOW(),
  "updated_at"       timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_slack_workspaces_org_team" ON "slack_workspaces"("org_id", "team_id");
CREATE INDEX IF NOT EXISTS "idx_slack_workspaces_org_id" ON "slack_workspaces"("org_id");
