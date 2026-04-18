#!/bin/bash

# This script marks all existing migrations as complete in the tracking table
# Run this if migrations fail because tables already exist

echo "Fixing migration tracking..."

# Insert all migration records
docker exec ifu-labs-postgres psql -U postgres -d ifu_labs_dev <<EOF
-- Mark all migrations as complete
INSERT INTO __drizzle_migrations (hash, created_at) VALUES
('0000_broad_sister_grimm', 1776026649158),
('0001_add_password_auth', 1776026649159),
('0002_add_invitations', 1776026649160),
('0003_add_invitation_product', 1776026649161),
('0004_add_unique_control_results', 1776026649162),
('0005_paystack_billing_columns', 1776026649163),
('0006_paystack_constraints_and_finops_plan', 1776026649164),
('0007_add_invitation_unique_constraint', 1776026649165),
('0008_add_password_reset_tokens', 1776026649166)
ON CONFLICT DO NOTHING;

SELECT * FROM __drizzle_migrations ORDER BY created_at;
EOF

echo "✅ Migration tracking fixed. You can now run 'npm run migrate' safely."
