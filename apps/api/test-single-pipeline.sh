#!/bin/bash

# Test Script for Single-LLM Pipeline
# This script tests the new generateWithSinglePipeline method

set -e  # Exit on error

echo "🧪 Testing Single-LLM Pipeline"
echo "================================"
echo ""

# Configuration
API_URL="http://localhost:3000/api/v1"
EMAIL="demo@smartapply.com"
PASSWORD="Demo123!"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Login
echo -e "${BLUE}Step 1: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c cookies.txt)

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "Login response: $LOGIN_RESPONSE"

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ Login successful${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi

USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.id')
echo "User ID: $USER_ID"
echo ""

# Step 2: Get existing applications
echo -e "${BLUE}Step 2: Fetching existing applications...${NC}"
APPS_RESPONSE=$(curl -s -X GET "$API_URL/applications" \
  -b cookies.txt)

echo "$APPS_RESPONSE" | jq '.' 2>/dev/null || echo "Apps response: $APPS_RESPONSE"

# Get first application ID
APP_ID=$(echo "$APPS_RESPONSE" | jq -r '.[0].id' 2>/dev/null)

if [ "$APP_ID" == "null" ] || [ -z "$APP_ID" ]; then
  echo -e "${YELLOW}⚠ No existing applications found. Creating one...${NC}"
  
  # Get first job posting
  JOBS_RESPONSE=$(curl -s -X GET "$API_URL/job-postings" -b cookies.txt)
  JOB_ID=$(echo "$JOBS_RESPONSE" | jq -r '.[0].id' 2>/dev/null)
  
  if [ "$JOB_ID" == "null" ] || [ -z "$JOB_ID" ]; then
    echo -e "${RED}✗ No job postings found. Please create a job posting first.${NC}"
    exit 1
  fi
  
  # Create new application
  CREATE_RESPONSE=$(curl -s -X POST "$API_URL/applications/create-with-generation" \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d "{\"jobPostingId\":\"$JOB_ID\",\"generateCoverLetter\":true}")
  
  APP_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
  echo -e "${GREEN}✓ Created application: $APP_ID${NC}"
else
  echo -e "${GREEN}✓ Found application: $APP_ID${NC}"
fi
echo ""

# Step 3: Call new single-LLM pipeline
echo -e "${BLUE}Step 3: Testing single-LLM pipeline regeneration...${NC}"
echo "Application ID: $APP_ID"
echo "Endpoint: POST $API_URL/applications/$APP_ID/regenerate-single-pipeline"
echo ""

START_TIME=$(date +%s)

REGENERATE_RESPONSE=$(curl -s -X POST "$API_URL/applications/$APP_ID/regenerate-single-pipeline" \
  -b cookies.txt)

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "$REGENERATE_RESPONSE" | jq '.' 2>/dev/null || echo "Response: $REGENERATE_RESPONSE"

# Check if regeneration was successful
if echo "$REGENERATE_RESPONSE" | grep -q '"status":"READY"'; then
  echo ""
  echo -e "${GREEN}✓ Pipeline completed successfully in ${DURATION}s${NC}"
  echo ""
  
  # Extract and display results
  echo -e "${BLUE}Results:${NC}"
  echo "----------------------------------------"
  
  # Check if tailoredProfile exists
  if echo "$REGENERATE_RESPONSE" | jq -e '.tailoredProfile' > /dev/null 2>&1; then
    HARD_SKILLS=$(echo "$REGENERATE_RESPONSE" | jq -r '.tailoredProfile.selected_hard_skills | length')
    EXPERIENCES=$(echo "$REGENERATE_RESPONSE" | jq -r '.tailoredProfile.selected_experiences | length')
    echo "📋 Tailored Profile:"
    echo "  - Hard Skills: $HARD_SKILLS"
    echo "  - Experiences: $EXPERIENCES"
  fi
  
  # Check if atsKeywords exists
  if echo "$REGENERATE_RESPONSE" | jq -e '.atsKeywords' > /dev/null 2>&1; then
    HARD_KW=$(echo "$REGENERATE_RESPONSE" | jq -r '.atsKeywords.hard_skills | length')
    TOOLS_KW=$(echo "$REGENERATE_RESPONSE" | jq -r '.atsKeywords.tools_and_tech | length')
    TOTAL_KW=$((HARD_KW + TOOLS_KW))
    echo "🎯 ATS Keywords:"
    echo "  - Hard Skills: $HARD_KW"
    echo "  - Tools & Tech: $TOOLS_KW"
    echo "  - Total: $TOTAL_KW (max 20)"
    
    if [ $TOTAL_KW -le 20 ]; then
      echo -e "  ${GREEN}✓ Keyword limit enforced${NC}"
    else
      echo -e "  ${RED}✗ WARNING: Exceeded 20 keyword limit!${NC}"
    fi
  fi
  
  # Check resume
  if echo "$REGENERATE_RESPONSE" | jq -e '.resumeText' > /dev/null 2>&1; then
    RESUME_LENGTH=$(echo "$REGENERATE_RESPONSE" | jq -r '.resumeText | length')
    echo "📄 Resume:"
    echo "  - Generated: Yes"
    echo "  - Length: $RESUME_LENGTH characters"
  fi
  
  # Check cover letter
  if echo "$REGENERATE_RESPONSE" | jq -e '.coverLetterText' > /dev/null 2>&1; then
    CL_LENGTH=$(echo "$REGENERATE_RESPONSE" | jq -r '.coverLetterText | length')
    echo "📝 Cover Letter:"
    echo "  - Generated: Yes"
    echo "  - Length: $CL_LENGTH characters"
  fi
  
  echo "----------------------------------------"
  echo ""
  echo -e "${GREEN}🎉 Single-LLM Pipeline Test PASSED${NC}"
  
elif echo "$REGENERATE_RESPONSE" | grep -q '"status":"FAILED"'; then
  echo ""
  echo -e "${RED}✗ Pipeline failed${NC}"
  ERROR_MSG=$(echo "$REGENERATE_RESPONSE" | jq -r '.errorMessage // "Unknown error"')
  echo "Error: $ERROR_MSG"
  exit 1
else
  echo ""
  echo -e "${YELLOW}⚠ Unexpected response${NC}"
  exit 1
fi

# Cleanup
rm -f cookies.txt

echo ""
echo -e "${BLUE}Test completed!${NC}"
echo ""
echo "📊 To view logs, run:"
echo "  tail -f apps/api/logs/app.log"
echo ""
echo "📖 To view in Swagger:"
echo "  http://localhost:3000/docs"
