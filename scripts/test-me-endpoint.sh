#!/bin/bash

# Test the /me endpoint to verify subscription fix

API_URL="https://api.ifulabs.com"
EMAIL="your-actual-email@domain.com"  # Update with correct email
PASSWORD="your-actual-password"

echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c cookies.txt)

echo "$LOGIN_RESPONSE" | jq '.'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo ""
echo "✅ Login successful"
echo ""
echo "📊 Fetching user data..."

ME_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/auth/me" \
  -b cookies.txt)

echo "$ME_RESPONSE" | jq '.'

# Check if subscriptions array exists and has items
SUBSCRIPTIONS=$(echo "$ME_RESPONSE" | jq '.subscriptions')

if [ "$SUBSCRIPTIONS" = "null" ] || [ "$SUBSCRIPTIONS" = "[]" ]; then
  echo ""
  echo "❌ No subscriptions found - fix not working"
else
  echo ""
  echo "✅ Subscriptions found - fix is working!"
  echo "$SUBSCRIPTIONS" | jq '.'
fi

rm -f cookies.txt
