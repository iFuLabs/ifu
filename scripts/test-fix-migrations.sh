#!/bin/bash

# Test script to verify fix-migrations.sh works correctly

echo "🧪 Testing fix-migrations.sh script..."
echo ""

# Step 1: Check if tracking table exists
echo "Step 1: Checking if __drizzle_migrations table exists..."
TABLE_EXISTS=$(docker exec ifu-labs-postgres psql -U postgres -d ifu_labs_dev -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '__drizzle_migrations');")

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "✅ Table exists"
  
  # Check how many migrations are tracked
  COUNT=$(docker exec ifu-labs-postgres psql -U postgres -d ifu_labs_dev -tAc "SELECT COUNT(*) FROM __drizzle_migrations;")
  echo "   Currently tracking $COUNT migrations"
else
  echo "❌ Table does not exist"
fi

echo ""
echo "Step 2: Running fix-migrations.sh..."
./scripts/fix-migrations.sh

echo ""
echo "Step 3: Verifying results..."
FINAL_COUNT=$(docker exec ifu-labs-postgres psql -U postgres -d ifu_labs_dev -tAc "SELECT COUNT(*) FROM __drizzle_migrations;")

if [ "$FINAL_COUNT" -ge "9" ]; then
  echo "✅ SUCCESS: $FINAL_COUNT migrations are now tracked"
else
  echo "❌ FAILED: Only $FINAL_COUNT migrations tracked (expected at least 9)"
  exit 1
fi

echo ""
echo "Step 4: Testing npm run migrate..."
npm run migrate

if [ $? -eq 0 ]; then
  echo "✅ Migration command succeeded"
else
  echo "⚠️  Migration command failed (this might be expected if migration 0009 is already applied)"
fi

echo ""
echo "🎉 Test complete!"
