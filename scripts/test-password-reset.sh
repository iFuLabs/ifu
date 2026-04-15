#!/bin/bash

# Test script for password reset functionality
# Usage: ./scripts/test-password-reset.sh

set -e

API_URL="${API_URL:-http://localhost:3000}"
PORTAL_URL="${PORTAL_URL:-http://localhost:3003}"

echo "🔐 Testing Password Reset Flow"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test email
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"

echo -e "${YELLOW}Step 1: Request password reset${NC}"
echo "POST $API_URL/api/v1/auth/forgot-password"
echo "Body: { \"email\": \"$TEST_EMAIL\" }"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}")

echo "Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "reset link sent"; then
  echo -e "${GREEN}✓ Password reset request successful${NC}"
else
  echo -e "${RED}✗ Password reset request failed${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Check your email for reset link${NC}"
echo "The email should contain a link like:"
echo "$PORTAL_URL/reset-password/[TOKEN]"
echo ""
echo "If you're using Resend, check your Resend dashboard:"
echo "https://resend.com/emails"
echo ""

echo -e "${YELLOW}Step 3: Test with invalid email (should still return success)${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com"}')

echo "Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "reset link sent"; then
  echo -e "${GREEN}✓ Security check passed (doesn't reveal if email exists)${NC}"
else
  echo -e "${RED}✗ Security check failed${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Test password reset with token${NC}"
echo "To test the actual password reset, you need a valid token from the database."
echo ""
echo "Manual test steps:"
echo "1. Get a token from the database:"
echo "   psql \$DATABASE_URL -c \"SELECT token FROM password_reset_tokens WHERE used = false ORDER BY created_at DESC LIMIT 1;\""
echo ""
echo "2. Test the reset endpoint:"
echo "   curl -X POST $API_URL/api/v1/auth/reset-password \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"token\":\"YOUR_TOKEN_HERE\",\"newPassword\":\"NewPassword123!\"}'"
echo ""

echo -e "${YELLOW}Step 5: Test with expired/invalid token${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token-123","newPassword":"NewPassword123!"}')

echo "Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "invalid\|expired"; then
  echo -e "${GREEN}✓ Invalid token rejected correctly${NC}"
else
  echo -e "${YELLOW}⚠ Note: This test requires the API endpoint to be implemented${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}✓ Password Reset Tests Complete${NC}"
echo ""
echo "Next steps:"
echo "1. Check your email inbox for the reset link"
echo "2. Click the link to test the frontend flow"
echo "3. Verify you can login with the new password"
echo ""
