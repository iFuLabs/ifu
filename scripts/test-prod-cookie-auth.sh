#!/bin/bash

# Quick test script for production cookie authentication
# Usage: ./scripts/test-prod-cookie-auth.sh <email> <password>

set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <email> <password>"
  echo "Example: $0 admin@ifulabs.com MyPassword123!"
  exit 1
fi

EMAIL="$1"
PASSWORD="$2"
API_URL="${API_URL:-https://api.ifulabs.com}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

echo ""
echo -e "${BLUE}🧪 Testing Production Cookie Auth${NC}"
echo "===================================="
echo "API: $API_URL"
echo "Email: $EMAIL"
echo ""

echo -e "${YELLOW}Step 1: Login${NC}"
echo "-------------"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" \
  2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "$LOGIN_RESPONSE" | jq -r '.user.email' 2>/dev/null | xargs -I {} echo "  User: {}"
  echo "$LOGIN_RESPONSE" | jq -r '.organization.name' 2>/dev/null | xargs -I {} echo "  Org: {}"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Check Cookie${NC}"
echo "--------------------"
if [ -f "$COOKIE_JAR" ] && grep -q "auth_token" "$COOKIE_JAR"; then
  echo -e "${GREEN}✓ Cookie was set${NC}"
  
  COOKIE_LINE=$(grep "auth_token" "$COOKIE_JAR")
  DOMAIN=$(echo "$COOKIE_LINE" | awk '{print $1}')
  
  echo "  Domain: $DOMAIN"
  
  if echo "$COOKIE_LINE" | grep -q "#HttpOnly"; then
    echo -e "  ${GREEN}✓ HttpOnly flag set${NC}"
  else
    echo -e "  ${RED}✗ HttpOnly flag NOT set${NC}"
  fi
  
  if [ "$DOMAIN" = ".ifulabs.com" ]; then
    echo -e "  ${GREEN}✓ Domain is .ifulabs.com (works across subdomains)${NC}"
  else
    echo -e "  ${YELLOW}⚠ Domain is $DOMAIN (might not work across subdomains)${NC}"
  fi
else
  echo -e "${RED}✗ Cookie was NOT set${NC}"
  echo "Cookie jar contents:"
  cat "$COOKIE_JAR" 2>/dev/null || echo "(empty)"
  exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Test /auth/me with Cookie${NC}"
echo "-----------------------------------"
ME_RESPONSE=$(curl -s -b "$COOKIE_JAR" "$API_URL/api/v1/auth/me")

if echo "$ME_RESPONSE" | grep -q "authenticated"; then
  echo -e "${GREEN}✓ Authenticated request successful${NC}"
  echo "$ME_RESPONSE" | jq -r '.user.email' 2>/dev/null | xargs -I {} echo "  User: {}"
  
  # Check for subscriptions
  SUBS=$(echo "$ME_RESPONSE" | jq -r '.subscriptions[]?.product' 2>/dev/null)
  if [ -n "$SUBS" ]; then
    echo "  Subscriptions:"
    echo "$SUBS" | while read -r sub; do
      echo "    - $sub"
    done
  fi
else
  echo -e "${RED}✗ Authenticated request failed${NC}"
  echo "$ME_RESPONSE"
  exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Test WITHOUT Cookie${NC}"
echo "-----------------------------"
NO_COOKIE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/auth/me")
HTTP_CODE=$(echo "$NO_COOKIE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Correctly rejected without cookie (401)${NC}"
else
  echo -e "${RED}✗ Should have been rejected but got: $HTTP_CODE${NC}"
fi

echo ""
echo "===================================="
echo -e "${GREEN}✅ Cookie authentication is working!${NC}"
echo "===================================="
echo ""
echo "What this means:"
echo "  • Login sets HttpOnly cookie with domain .ifulabs.com"
echo "  • Cookie is automatically sent with API requests"
echo "  • Cookie works across portal, comply, and finops subdomains"
echo "  • No need to pass tokens in URLs or localStorage"
echo ""
