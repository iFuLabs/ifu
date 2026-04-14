#!/bin/bash

# Test script for plan feature gating
# Run this after starting the API server

API_URL="${API_URL:-http://localhost:3000}"
echo "Testing plan features at $API_URL"
echo ""

# You'll need to replace TOKEN with an actual auth token
TOKEN="${AUTH_TOKEN:-your-token-here}"

if [ "$TOKEN" = "your-token-here" ]; then
  echo "⚠️  Set AUTH_TOKEN environment variable with a valid token"
  echo "   Example: AUTH_TOKEN=xxx ./scripts/test-plan-features.sh"
  exit 1
fi

echo "1. Testing plan features endpoint..."
curl -s -X GET "$API_URL/api/v1/plan/features" \
  -H "Cookie: auth_token=$TOKEN" | jq '.'

echo ""
echo "2. Testing AI feature check..."
curl -s -X GET "$API_URL/api/v1/plan/check/aiFeatures" \
  -H "Cookie: auth_token=$TOKEN" | jq '.'

echo ""
echo "3. Testing controls with framework filter (should fail for Starter on iso27001)..."
curl -s -X GET "$API_URL/api/v1/controls?framework=iso27001" \
  -H "Cookie: auth_token=$TOKEN" | jq '.'

echo ""
echo "4. Testing AI explain endpoint (should fail for Starter)..."
curl -s -X POST "$API_URL/api/v1/ai/explain/CC6.1" \
  -H "Cookie: auth_token=$TOKEN" | jq '.'

echo ""
echo "5. Testing PDF export for SOC 2 (should work for all plans)..."
curl -s -I "$API_URL/api/v1/evidence/export/pdf?framework=soc2" \
  -H "Cookie: auth_token=$TOKEN" | grep -E "HTTP|Content-Type|Content-Disposition"

echo ""
echo "6. Testing PDF export for ISO 27001 (should fail for Starter)..."
curl -s "$API_URL/api/v1/evidence/export/pdf?framework=iso27001" \
  -H "Cookie: auth_token=$TOKEN" | jq '.'

echo ""
echo "✅ Test complete"
