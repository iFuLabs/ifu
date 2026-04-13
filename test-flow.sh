#!/bin/bash

echo "🧪 Testing iFu Labs Complete Flow"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

test_endpoint() {
  local name=$1
  local url=$2
  local expected=$3
  
  echo -n "Testing $name... "
  response=$(curl -s "$url")
  
  if echo "$response" | grep -q "$expected"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Expected: $expected"
    echo "  Got: $response"
    ((FAIL++))
  fi
}

test_api() {
  local name=$1
  local method=$2
  local url=$3
  local data=$4
  local expected=$5
  
  echo -n "Testing $name... "
  response=$(curl -s -X "$method" "$url" -H 'Content-Type: application/json' -d "$data")
  
  if echo "$response" | grep -q "$expected"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Expected: $expected"
    echo "  Got: $response"
    ((FAIL++))
  fi
}

echo "1. Frontend Services"
echo "-------------------"
test_endpoint "Website" "http://localhost:3004" "iFu Labs"
test_endpoint "Portal" "http://localhost:3003" "Product Portal"
test_endpoint "Comply" "http://localhost:3001" "Comply"
test_endpoint "FinOps" "http://localhost:3002" "FinOps"
echo ""

echo "2. API Health"
echo "-------------"
test_api "API Health" "GET" "http://localhost:3000/health" "" "ok"
echo ""

echo "3. Onboarding Flow"
echo "------------------"
test_endpoint "Onboarding Page" "http://localhost:3003/onboarding?product=comply&plan=starter" "Welcome to iFu Labs"
test_api "Check Auth Status" "GET" "http://localhost:3000/api/v1/auth/me" "" "authenticated"
echo ""

echo "4. Dashboard Access"
echo "-------------------"
test_endpoint "Comply Dashboard" "http://localhost:3001/dashboard" "Overview"
test_endpoint "FinOps Dashboard" "http://localhost:3002/dashboard" "FinOps"
echo ""

echo ""
echo "=================================="
echo -e "Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
echo "=================================="

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
