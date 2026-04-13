-- Add product field to invitations table to track which product sent the invitation
ALTER TABLE "invitations" ADD COLUMN "product" text DEFAULT 'comply';

-- Add comment
COMMENT ON COLUMN "invitations"."product" IS 'Which product sent the invitation: comply or finops';
