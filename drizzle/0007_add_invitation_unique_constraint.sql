-- Add unique constraint on (orgId, email) for invitations to prevent duplicate invites
CREATE UNIQUE INDEX IF NOT EXISTS "idx_invitations_org_email" ON "invitations" ("org_id", "email");
