#!/bin/bash
# Test Authentication Flow for DecentraStore

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing DecentraStore Authentication Flow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test data
TEST_NODE_ID="node-test-$(date +%s)"
TEST_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy8Dbv8prpJ/0kKhlGeJY\nozo2t60EG8L0561g13R29LqTn8/6KUXj3jJZvvJlhQvJcGWQs42UJVKxm4EZU54q\nZHb6Mm3qb3K7hJgQBFaSSoAvlJBJlOr5C+zEMlQHfxwZNPNKCYJCzSCmUIEuGHy9\nMzeFd6BpVU6fPljCK9z8mQ5SWzuN8VCCXPZjF7L0NEEZZWLFpSxDxTmB3YmJB25B\n3AqV0D04J7xkFvQPfVHOBKaBbJhcCXPH3WLKLQNiNsrZs2M6nMZALQD6RvUxXCXL\nx4PhBJ8HjRR9Uam4ywEnmJdP1AJJOjq2DJkFEkCvLdPTI7R4I1CxMCVMQB2g0wID\nAQAB\n-----END PUBLIC KEY-----"
TEST_FINGERPRINT="SHA256:aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcdef"

echo -e "${BLUE}[1/4] Testing Health Endpoint${NC}"
HEALTH=$(curl -s http://localhost:8000/api/health)
if [[ $HEALTH == *"healthy"* ]]; then
  echo -e "${GREEN}✅ Backend is healthy${NC}"
else
  echo -e "${RED}❌ Backend health check failed${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}[2/4] Testing Node Registration${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"node_id\": \"$TEST_NODE_ID\",
    \"public_key\": \"$TEST_PUBLIC_KEY\",
    \"public_key_fingerprint\": \"$TEST_FINGERPRINT\",
    \"keystore_encrypted\": \"encrypted-blob-placeholder\"
  }")

if [[ $REGISTER_RESPONSE == *"node_id"* ]]; then
  echo -e "${GREEN}✅ Registration successful${NC}"
  echo "   Node ID: $TEST_NODE_ID"
else
  echo -e "${RED}❌ Registration failed${NC}"
  echo "   Response: $REGISTER_RESPONSE"
  exit 1
fi
echo ""

echo -e "${BLUE}[3/4] Testing Admin Login${NC}"
ADMIN_LOGIN=$(curl -s -X POST http://localhost:8000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "DecentraAdmin@2026"}')

if [[ $ADMIN_LOGIN == *"access_token"* ]]; then
  echo -e "${GREEN}✅ Admin login successful${NC}"
  ADMIN_TOKEN=$(echo $ADMIN_LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "   Token: ${ADMIN_TOKEN:0:30}..."
else
  echo -e "${RED}❌ Admin login failed${NC}"
  echo "   Response: $ADMIN_LOGIN"
  exit 1
fi
echo ""

echo -e "${BLUE}[4/4] Testing Node Login (Signature Verification)${NC}"
echo -e "${YELLOW}ℹ️  Note: This requires a real RSA signature from the browser${NC}"
echo -e "${YELLOW}ℹ️  Open browser at: http://localhost:5173/app/register${NC}"
echo -e "${YELLOW}ℹ️  And then: http://localhost:5173/app/login${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Backend API tests passed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:5173/app/register in your browser"
echo "  2. Generate a new keypair and download the keystore"
echo "  3. Open http://localhost:5173/app/login"
echo "  4. Upload the keystore and authenticate"
echo ""
