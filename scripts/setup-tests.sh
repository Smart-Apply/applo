#!/bin/bash

# Test Setup Script for Smart Apply
# Sets up test database and dependencies for integration/e2e tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
API_DIR="$ROOT_DIR/apps/api"

echo "🧪 Setting up test environment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if Docker is running
echo -e "\n${YELLOW}1. Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Step 2: Start test database
echo -e "\n${YELLOW}2. Starting test database...${NC}"
cd "$ROOT_DIR/infra"
docker-compose -f docker-compose.test.yml up -d

echo "⏳ Waiting for database to be ready..."
sleep 5

# Wait for database health check
MAX_RETRIES=30
RETRY_COUNT=0
while ! docker exec smartapply-test-db pg_isready -U postgres > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}❌ Database failed to start after ${MAX_RETRIES} retries${NC}"
        exit 1
    fi
    echo "⏳ Waiting for database... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 1
done

echo -e "${GREEN}✅ Test database is ready${NC}"

# Step 3: Run database migrations
echo -e "\n${YELLOW}3. Running database migrations...${NC}"
cd "$API_DIR"

# Load test environment
export $(cat .env.test | grep -v '^#' | xargs)

# Run Prisma migrations
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo -e "${GREEN}✅ Migrations complete${NC}"

# Step 4: Seed test data (optional)
echo -e "\n${YELLOW}4. Seeding test data...${NC}"
npm run prisma:seed 2>/dev/null || echo "⚠️  Seed script not required for tests"
npm run prisma:seed:templates 2>/dev/null || echo "⚠️  Template seed optional"

echo -e "${GREEN}✅ Test data seeded${NC}"

# Step 5: Install Puppeteer Chrome (if not already installed)
echo -e "\n${YELLOW}5. Checking Puppeteer installation...${NC}"
if [ ! -d "$API_DIR/node_modules/puppeteer/.local-chromium" ] && [ ! -d "$HOME/.cache/puppeteer" ]; then
    echo "📦 Installing Chromium for Puppeteer..."
    cd "$API_DIR"
    npx puppeteer install || echo "⚠️  Puppeteer install skipped (may already be installed)"
else
    echo -e "${GREEN}✅ Puppeteer already installed${NC}"
fi

echo -e "\n${GREEN}🎉 Test environment ready!${NC}"
echo -e "\n${YELLOW}Run tests with:${NC}"
echo "  npm run test:integration  # Integration tests"
echo "  npm run test:e2e           # E2E tests"
echo "  npm run test:all           # All tests"
echo -e "\n${YELLOW}Stop test database:${NC}"
echo "  cd infra && docker-compose -f docker-compose.test.yml down"
