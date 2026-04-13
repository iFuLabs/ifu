-- Add team invitations support
CREATE TYPE "invitation_status" AS ENUM('pending', 'accepted', 'expired');

CREATE TABLE "invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text NOT NULL DEFAULT 'member',
  "invited_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "token" text NOT NULL UNIQUE,
  "status" invitation_status NOT NULL DEFAULT 'pending',
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "invitations_org_id_idx" ON "invitations"("org_id");
CREATE INDEX "invitations_email_idx" ON "invitations"("email");
CREATE INDEX "invitations_token_idx" ON "invitations"("token");
