#!/bin/bash

# Test Cleanup Script
# Stops test database and cleans up test data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧹 Cleaning up test environment...${NC}"

cd "$ROOT_DIR/infra"

# Stop and remove test database
docker-compose -f docker-compose.test.yml down -v

echo -e "${GREEN}✅ Test environment cleaned up${NC}"
