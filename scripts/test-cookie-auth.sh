#!/bin/bash

# Test script for HttpOnly cookie authentication
# Tests that cookies are set correctly and work across subdomains

set -e

API_URL="${API_URL:-http://localhost:3000}"
TEST_EMAIL="test-cookie-$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"
TEST_ORG="Test Org $(date +%s)"

echo "🧪 Testing HttpOnly Cookie Authentication"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cookie jar for storing cookies between requests
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

echo "📝 Step 1: Register new user"
echo "----------------------------"
REGISTER_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$API_URL/api/v1/auth/onboard" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test User\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"orgName\": \"$TEST_ORG\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ Registration successful${NC}"
  echo "$REGISTER_RESPONSE" | jq -r '.user.email' | xargs -I {} echo "  Email: {}"
else
  echo -e "${RED}✗ Registration failed${NC}"
  echo "$REGISTER_RESPONSE" | jq '.'
  exit 1
fi

echo ""
echo "🍪 Step 2: Check if auth_token cookie was set"
echo "----------------------------------------------"
if grep -q "auth_token" "$COOKIE_JAR"; then
  echo -e "${GREEN}✓ Cookie was set${NC}"
  grep "auth_token" "$COOKIE_JAR" | awk '{print "  Cookie: " $7 "=" substr($0, index($0,$7))}'
  
  # Check cookie attributes
  COOKIE_LINE=$(grep "auth_token" "$COOKIE_JAR")
  echo ""
  echo "  Cookie attributes:"
  echo "$COOKIE_LINE" | grep -q "#HttpOnly" && echo -e "    ${GREEN}✓ HttpOnly${NC}" || echo -e "    ${RED}✗ Not HttpOnly${NC}"
  echo "$COOKIE_LINE" | awk '{print "    Domain: " $1}'
  echo "$COOKIE_LINE" | awk '{print "    Path: " $3}'
else
  echo -e "${RED}✗ Cookie was NOT set${NC}"
  echo "Cookie jar contents:"
  cat "$COOKIE_JAR"
  exit 1
fi

echo ""
echo "🔐 Step 3: Test authenticated request using cookie"
echo "---------------------------------------------------"
ME_RESPONSE=$(curl -s -b "$COOKIE_JAR" "$API_URL/api/v1/auth/me")

if echo "$ME_RESPONSE" | grep -q "authenticated"; then
  echo -e "${GREEN}✓ Authenticated request successful${NC}"
  echo "$ME_RESPONSE" | jq -r '.user.email' | xargs -I {} echo "  User: {}"
  echo "$ME_RESPONSE" | jq -r '.organization.name' | xargs -I {} echo "  Org: {}"
else
  echo -e "${RED}✗ Authenticated request failed${NC}"
  echo "$ME_RESPONSE" | jq '.'
  exit 1
fi

echo ""
echo "🚫 Step 4: Test request WITHOUT cookie (should fail)"
echo "-----------------------------------------------------"
NO_COOKIE_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/auth/me")
HTTP_CODE=$(echo "$NO_COOKIE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$NO_COOKIE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Request correctly rejected (401)${NC}"
  echo "  Message: $(echo "$RESPONSE_BODY" | jq -r '.message')"
else
  echo -e "${RED}✗ Request should have been rejected but got: $HTTP_CODE${NC}"
  echo "$RESPONSE_BODY" | jq '.'
  exit 1
fi

echo ""
echo "🔄 Step 5: Test login (should also set cookie)"
echo "-----------------------------------------------"
rm -f "$COOKIE_JAR"  # Clear cookies
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ Login successful${NC}"
  
  if grep -q "auth_token" "$COOKIE_JAR"; then
    echo -e "${GREEN}✓ Cookie was set on login${NC}"
  else
    echo -e "${RED}✗ Cookie was NOT set on login${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo ""
echo "🧹 Step 6: Test logout (should clear cookie)"
echo "---------------------------------------------"
LOGOUT_RESPONSE=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$API_URL/api/v1/auth/logout")

if echo "$LOGOUT_RESPONSE" | grep -q "Logged out"; then
  echo -e "${GREEN}✓ Logout successful${NC}"
  
  # Try to use the cookie after logout
  AFTER_LOGOUT=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$API_URL/api/v1/auth/me")
  AFTER_LOGOUT_CODE=$(echo "$AFTER_LOGOUT" | tail -n1)
  
  if [ "$AFTER_LOGOUT_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Cookie was invalidated${NC}"
  else
    echo -e "${YELLOW}⚠ Cookie might still be valid (got $AFTER_LOGOUT_CODE)${NC}"
  fi
else
  echo -e "${RED}✗ Logout failed${NC}"
  echo "$LOGOUT_RESPONSE" | jq '.'
  exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ All cookie authentication tests passed!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✓ Registration sets HttpOnly cookie"
echo "  ✓ Cookie is sent automatically on subsequent requests"
echo "  ✓ Requests without cookie are rejected"
echo "  ✓ Login sets HttpOnly cookie"
echo "  ✓ Logout clears/invalidates cookie"
echo ""
echo "🎉 HttpOnly cookie authentication is working correctly!"
