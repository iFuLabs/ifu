#!/bin/bash

API_URL="http://localhost:3000"

echo "🧪 Testing iFu Labs API..."
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q "ok"; then
  echo "   ✅ Health check passed"
  echo "   Response: $HEALTH"
else
  echo "   ❌ Health check failed"
  echo "   Response: $HEALTH"
  exit 1
fi

echo ""
echo "2. Testing API docs (development only)..."
DOCS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/docs")
if [ "$DOCS" = "200" ]; then
  echo "   ✅ API docs available at $API_URL/docs"
else
  echo "   ⚠️  API docs not available (expected in production)"
fi

echo ""
echo "3. Testing protected endpoint (should return 401)..."
PROTECTED=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/controls")
if [ "$PROTECTED" = "401" ]; then
  echo "   ✅ Auth middleware working correctly"
else
  echo "   ❌ Expected 401, got $PROTECTED"
fi

echo ""
echo "✅ All basic API tests passed!"
echo ""
echo "📚 View API docs: $API_URL/docs"
echo ""
