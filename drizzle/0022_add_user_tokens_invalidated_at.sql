-- Session invalidation: timestamp of the most recent forced sign-out.
-- verifyToken rejects any JWT whose iat predates this value, so logout
-- can fully terminate every outstanding session for the user.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "tokens_invalidated_at" timestamp;
