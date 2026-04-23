-- ⚠️  DANGER: This deletes ALL users and organizations
-- Run this in your Neon database console or via psql

-- Delete all subscriptions first
DELETE FROM subscriptions;

-- Delete all users (cascades to related data)
DELETE FROM users;

-- Delete all organizations (cascades to everything else)
DELETE FROM organizations;

-- Verify deletion
SELECT 'Users remaining:' as info, COUNT(*) as count FROM users
UNION ALL
SELECT 'Organizations remaining:' as info, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Subscriptions remaining:' as info, COUNT(*) as count FROM subscriptions;
