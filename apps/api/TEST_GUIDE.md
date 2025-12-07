# Testing the Single-LLM Pipeline

## Quick Test Guide

### Prerequisites
1. Backend running: `npm run start:dev` in `apps/api`
2. Database seeded with demo user: `demo@smartapply.com` / `Demo123!`
3. At least one job posting and application created

---

## Option 1: Automated Test Script (Recommended)

```bash
cd apps/api
./test-single-pipeline.sh
```

**What it does:**
- Logs in as demo user
- Finds or creates an application
- Calls the new `POST /applications/:id/regenerate-single-pipeline` endpoint
- Shows results: tailored profile, ATS keywords (≤20), resume, cover letter
- Reports success/failure with timing

---

## Option 2: Manual cURL Test

### 1. Login and get cookie
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@smartapply.com","password":"Demo123!"}' \
  -c cookies.txt
```

### 2. List applications to get an ID
```bash
curl -X GET http://localhost:3000/api/v1/applications \
  -b cookies.txt | jq '.'
```

### 3. Test the new pipeline (replace `<APP_ID>`)
```bash
curl -X POST http://localhost:3000/api/v1/applications/<APP_ID>/regenerate-single-pipeline \
  -b cookies.txt | jq '.'
```

---

## Option 3: Swagger UI (Visual)

1. Open: http://localhost:3000/docs
2. Click "Authorize" → Enter JWT token from login
3. Find `POST /applications/{id}/regenerate-single-pipeline`
4. Click "Try it out"
5. Enter an application ID
6. Click "Execute"

---

## What to Check

### ✅ Success Indicators

1. **Status Code**: 200 OK
2. **Application Status**: `"status": "READY"`
3. **Tailored Profile**:
   - `selected_hard_skills`: ≤ 12 items
   - `selected_soft_skills`: ≤ 6 items
   - `selected_experiences`: ≤ 5 items
   - `selected_projects`: ≤ 5 items
4. **ATS Keywords**:
   - `hard_skills + tools_and_tech + domains + methodologies` ≤ 20 total
   - Each keyword has: `keyword`, `source`, `priority`
5. **Generated Content**:
   - `resumeText`: Markdown resume
   - `coverLetterText`: Markdown cover letter (if enabled)

### ❌ Failure Indicators

- Status: `"status": "FAILED"`
- Error message in `errorMessage` field
- 404 if application not found
- 401 if not authenticated

---

## Viewing Logs

### Real-time logs:
```bash
tail -f apps/api/logs/app.log
```

### Filter for pipeline logs:
```bash
tail -f apps/api/logs/app.log | grep -E "(single-LLM|Skill selection|Generating resume|ATS keywords)"
```

### Check for errors:
```bash
grep -i "error" apps/api/logs/app.log | tail -20
```

---

## Expected Pipeline Flow (in logs)

```
Starting single-LLM pipeline for application abc123
Detected language: de
Step 1: Selecting relevant profile data...
Profile tailored: 8 hard skills, 3 experiences
Step 2: Generating resume...
Step 3: Generating cover letter...
Step 4: Extracting ATS keywords...
Extracted 18 ATS keywords
Single-LLM pipeline completed in 12345ms for application abc123
```

---

## Troubleshooting

### "No applications found"
Create one first:
```bash
# Get job posting ID
curl -X GET http://localhost:3000/api/v1/job-postings -b cookies.txt | jq '.[0].id'

# Create application
curl -X POST http://localhost:3000/api/v1/applications/create-with-generation \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"jobPostingId":"<JOB_ID>","generateCoverLetter":true}'
```

### "LLM_PROVIDER not configured"
Check `.env`:
```bash
LLM_PROVIDER=azure-ai-foundry  # or azure-openai or mock
```

### "Template not found"
The prompts are in `apps/api/prompts/v1/`:
- `skill-selector.md`
- `resume.md`
- `cover-letter.md`
- `ats-keywords.md`

### "JSON parsing failed"
Enable debug logging:
```bash
LOG_LLM_CALLS=true
```
Then check logs for raw LLM responses.

---

## Comparing Old vs New Pipeline

### Old (Agent-Based):
```bash
# Uses existing endpoint (will be deprecated)
curl -X POST http://localhost:3000/api/v1/applications/create-with-generation \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"jobPostingId":"<JOB_ID>","generateCoverLetter":true}'
```

### New (Single-LLM):
```bash
# Test endpoint (new implementation)
curl -X POST http://localhost:3000/api/v1/applications/<APP_ID>/regenerate-single-pipeline \
  -b cookies.txt
```

**Key Differences:**
- Old: Often returns 40+ keywords
- New: Max 20 keywords (enforced)
- Old: Includes ALL profile skills
- New: Only relevant skills selected per job
- Old: Multiple agent orchestration calls
- New: Single deterministic pipeline

---

## Next Steps

1. **Run tests** with the automated script
2. **Compare output** between old and new pipelines
3. **Check keyword counts** (should be ≤20)
4. **Verify profile tailoring** (not all skills should appear in resume)
5. **Add feature flag** to switch pipelines in production

---

## Sample Expected Output

```json
{
  "id": "abc123",
  "status": "READY",
  "tailoredProfile": {
    "target_role": "Full-Stack Developer",
    "target_company": "Acme Corp",
    "reasoning_short": "Candidate has strong React and Node.js experience...",
    "selected_hard_skills": ["React", "Node.js", "TypeScript", "PostgreSQL"],
    "selected_soft_skills": ["Communication", "Problem-solving"],
    "selected_experiences": [
      {
        "profileExperienceId": "exp123",
        "title": "Senior Developer",
        "company": "Tech Inc",
        "summary": "Built scalable web apps...",
        "why_relevant": "Direct experience with React and Node.js"
      }
    ]
  },
  "atsKeywords": {
    "hard_skills": [
      {"keyword": "React", "source": "both", "priority": 1},
      {"keyword": "TypeScript", "source": "job", "priority": 1}
    ],
    "tools_and_tech": [
      {"keyword": "Docker", "source": "both", "priority": 2}
    ],
    "domains": [
      {"keyword": "Web Development", "source": "both", "priority": 1}
    ],
    "methodologies": [
      {"keyword": "Agile", "source": "job", "priority": 2}
    ]
  },
  "resumeText": "# John Doe\n\n## Professional Summary\n...",
  "coverLetterText": "Sehr geehrte Damen und Herren,\n..."
}
```
