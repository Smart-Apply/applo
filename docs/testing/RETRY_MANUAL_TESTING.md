# Retry Mechanism - Manual Testing Guide

## Quick Start

### 1. Create a FAILED Application
```bash
# Start Prisma Studio
cd apps/api
npm run prisma:studio
```

1. Open Prisma Studio: http://localhost:5555
2. Navigate to `Application` table
3. Find any application or create a new one
4. Set these fields:
   - `status`: `FAILED`
   - `errorMessage`: `Test error for retry`
   - Ensure `resumeText` is not empty (required for retry)
5. Click "Save 1 change"

### 2. Test Retry Button

1. Open application detail page: `http://localhost:3001/applications/{id}`
2. You should see:
   - ❌ Red error banner with title "Status: Fehlgeschlagen"
   - 📝 Error message: "Bei der Erstellung ist ein Fehler aufgetreten."
   - 🔴 Small red box with: "Test error for retry"
   - 🔄 Blue button: "Erneut versuchen" with RefreshCw icon

3. Click the "Erneut versuchen" button
4. **Expected behavior:**
   - Button changes to: "Generiere erneut..." with spinning icon
   - Button is disabled
   - Toast notification: "Generierung wurde erneut gestartet"
   - Error banner changes from red to blue
   - Status changes to "Wird erstellt"

5. Wait 30-90 seconds for PDF generation
6. **Expected final state:**
   - Status changes to "Fertig" (green) or "Fehlgeschlagen" (red)
   - If READY: Download buttons appear
   - If FAILED: Retry button appears again

## Visual Checklist

### Before Retry (FAILED State)
```
┌─────────────────────────────────────────────────────┐
│ 🔴 Status: Fehlgeschlagen                            │
│                                                       │
│ Bei der Erstellung ist ein Fehler aufgetreten.       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Test error for retry                            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ [ 🔄 Erneut versuchen ]                              │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### During Retry (Loading State)
```
┌─────────────────────────────────────────────────────┐
│ 🔴 Status: Fehlgeschlagen                            │
│                                                       │
│ Bei der Erstellung ist ein Fehler aufgetreten.       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Test error for retry                            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ [ ⏳ Generiere erneut... ] (disabled, spinning)      │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### After Retry (GENERATING State - SSE Updates)
```
┌─────────────────────────────────────────────────────┐
│ 🔵 Status: Wird erstellt                             │
│                                                       │
│ Die KI erstellt gerade dein Anschreiben und deinen   │
│ Lebenslauf. Dies kann einige Minuten dauern.         │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Final Success (READY State)
```
┌─────────────────────────────────────────────────────┐
│ 🟢 Status: Fertig                       ✅ Fertig    │
│                                                       │
│ Deine Bewerbungsunterlagen sind fertig zum Download! │
│                                                       │
└─────────────────────────────────────────────────────┘

[ ⬇️ Anschreiben herunterladen ] [ ⬇️ Lebenslauf herunterladen ]
```

## Test Scenarios

### ✅ Scenario 1: Successful Retry
**Given:** Application with status FAILED
**When:** User clicks "Erneut versuchen"
**Then:** 
- Status changes to GENERATING
- Error message cleared
- PDF generation starts
- SSE shows real-time progress
- Final status: READY (with download buttons)

### ❌ Scenario 2: Retry READY Application (Should Fail)
**Given:** Application with status READY
**When:** User tries to call regenerate endpoint directly
**Then:** 
- 400 Bad Request
- Error code: APPLICATION_NOT_FAILED
- Message: "Nur fehlgeschlagene Bewerbungen können erneut generiert werden."

### ❌ Scenario 3: Retry PENDING Application (Should Fail)
**Given:** Application with status PENDING
**When:** User tries to call regenerate endpoint directly
**Then:** 
- 400 Bad Request
- Error code: APPLICATION_NOT_FAILED

### ⚠️ Scenario 4: Network Error During Retry
**Given:** Application with status FAILED, backend is DOWN
**When:** User clicks "Erneut versuchen"
**Then:** 
- Error toast: "Fehler beim erneuten Generieren"
- Button re-enables
- Application status unchanged
- User can try again

### ⚠️ Scenario 5: Generation Fails Again
**Given:** Application with status FAILED, LLM service is down
**When:** User clicks "Erneut versuchen" and waits
**Then:** 
- Status: FAILED
- New error message appears
- Retry button reappears
- User can try again

## Browser DevTools Validation

### Network Tab
1. Open DevTools → Network
2. Click "Erneut versuchen"
3. **Expected Request:**
   ```
   POST /api/v1/applications/{id}/regenerate
   Status: 200 OK
   Response: {
     "id": "...",
     "status": "GENERATING",
     "errorMessage": null,
     "coverLetterFileKey": null,
     "resumeFileKey": null,
     ...
   }
   ```

### Console Tab
1. Open DevTools → Console
2. Click "Erneut versuchen"
3. **Expected Logs:**
   ```
   [SSE] Connecting to stream for application {id}
   [SSE] Connection opened for application {id}
   [SSE] Received update for application {id}: {status: "GENERATING"}
   [SSE] Final status reached (READY), closing connection and refetching
   ```

### Application Tab (React Query DevTools)
1. Install React Query DevTools (if not already)
2. Open DevTools → React Query
3. Click "Erneut versuchen"
4. **Expected Cache Updates:**
   - `applications.{id}` → status: GENERATING
   - `applications` list → invalidated
   - After SSE: `applications.{id}` → status: READY

## Database Validation

### Before Retry
```sql
SELECT id, status, "errorMessage", "coverLetterFileKey", "resumeFileKey"
FROM "Application"
WHERE id = 'YOUR_APP_ID';
```

**Expected:**
| id | status | errorMessage | coverLetterFileKey | resumeFileKey |
|----|--------|--------------|-------------------|---------------|
| ... | FAILED | Test error... | null | null |

### After Retry
```sql
SELECT id, status, "errorMessage", "coverLetterFileKey", "resumeFileKey"
FROM "Application"
WHERE id = 'YOUR_APP_ID';
```

**Expected:**
| id | status | errorMessage | coverLetterFileKey | resumeFileKey |
|----|--------|--------------|-------------------|---------------|
| ... | GENERATING | null | null | null |

### After Generation Complete
```sql
SELECT id, status, "errorMessage", "coverLetterFileKey", "resumeFileKey"
FROM "Application"
WHERE id = 'YOUR_APP_ID';
```

**Expected:**
| id | status | errorMessage | coverLetterFileKey | resumeFileKey |
|----|--------|--------------|-------------------|---------------|
| ... | READY | null | applications/... | applications/... |

## Common Issues & Solutions

### Issue 1: Button Doesn't Show
**Symptom:** No retry button on FAILED application
**Solution:** 
- Check application status in DB
- Refresh page to trigger SSE reconnection
- Verify FAILED status in React DevTools

### Issue 2: 400 Error "APPLICATION_NO_RESUME"
**Symptom:** Error toast when clicking retry
**Solution:** 
- Check `resumeText` field is not null/empty
- Update application with valid resume JSON

### Issue 3: SSE Not Updating
**Symptom:** Status stuck on GENERATING
**Solution:**
- Check backend logs for job worker errors
- Verify job queue is running (in-memory or Azure Service Bus)
- Check Network tab for SSE connection errors

### Issue 4: Retry Succeeds But PDFs Missing
**Symptom:** Status READY but no download buttons
**Solution:**
- Check backend logs for PDF generation errors
- Verify Puppeteer is installed and running
- Check file storage (disk or Azure Blob)

## Automated Testing

### Run E2E Tests
```bash
cd apps/api
npm run test:e2e -- applications.e2e-spec.ts

# Specific test suite
npm run test:e2e -- applications.e2e-spec.ts -t "regenerate"
```

**Expected Output:**
```
✓ should retry failed application generation (123ms)
✓ should return 400 for non-failed application (READY) (45ms)
✓ should return 400 for non-failed application (PENDING) (42ms)
✓ should return 404 for non-existent application (38ms)
✓ should return 401 without auth token (35ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

## Performance Benchmarks

### Target Metrics
- **Retry API Response:** < 500ms
- **Status Update (SSE):** < 100ms latency
- **Full Regeneration:** 30-90 seconds (same as initial)
- **UI Loading State:** Immediate (<50ms)

### Measure with DevTools
1. Open Performance tab
2. Click "Record"
3. Click "Erneut versuchen"
4. Stop recording after toast appears
5. **Check:**
   - Time to Interactive (TTI): < 100ms
   - Network request duration: < 500ms
   - UI blocking: 0ms

## Success Criteria

All of these must pass:
- [ ] ✅ Retry button appears only for FAILED applications
- [ ] ✅ Button shows loading state when clicked
- [ ] ✅ Toast notification appears on success
- [ ] ✅ Status changes to GENERATING immediately
- [ ] ✅ SSE connection established after retry
- [ ] ✅ Final status (READY/FAILED) updates via SSE
- [ ] ✅ Error message cleared on retry
- [ ] ✅ File keys cleared on retry
- [ ] ✅ 400 error for non-FAILED applications
- [ ] ✅ E2E tests pass
- [ ] ✅ No console errors
- [ ] ✅ Swagger docs updated

## Next Steps

After manual testing:
1. Update this guide with any issues found
2. Take screenshots of UI states
3. Record demo video (optional)
4. Update README with retry feature
5. Close issue #203
