-- C-A5: Control-level comments / threads
CREATE TABLE IF NOT EXISTS "control_comments" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"            uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "control_def_id"    uuid NOT NULL REFERENCES "control_definitions"("id"),
  "author_id"         uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "body"              text NOT NULL,
  "parent_comment_id" uuid REFERENCES "control_comments"("id") ON DELETE SET NULL,
  "created_at"        timestamp NOT NULL DEFAULT NOW(),
  "edited_at"         timestamp,
  "deleted_at"        timestamp
);

CREATE INDEX IF NOT EXISTS "idx_comments_org_control" ON "control_comments"("org_id", "control_def_id");
CREATE INDEX IF NOT EXISTS "idx_comments_author" ON "control_comments"("author_id");
