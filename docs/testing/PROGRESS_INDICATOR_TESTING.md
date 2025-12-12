# Testing Guide: Visual Progress Indicator for PDF Generation

## Overview
This document describes how to test the visual progress indicator feature that shows real-time progress during PDF generation via Server-Sent Events (SSE).

## Prerequisites
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:3001`
- Database seeded with demo user and profile data
- LLM provider configured (Azure OpenAI or mock)

## Test Scenarios

### 1. Basic Progress Bar Display

**Steps:**
1. Log in to the application (demo@smartapply.com / Demo123!)
2. Navigate to Job Postings
3. Create a new job posting or select an existing one
4. Click "Neue Bewerbung erstellen"
5. In the application creation form, ensure "Mit Anschreiben" is checked
6. Click "Bewerbung erstellen"
7. Immediately navigate to the application detail page (if not redirected automatically)

**Expected Results:**
- ✅ Status banner shows "Wird erstellt" (GENERATING status)
- ✅ Blue progress bar is visible below the status message
- ✅ Progress percentage starts at 0% and increases smoothly
- ✅ Stage messages appear in German:
  - "Starte Generierung..."
  - "Lade Profil und Stellenanzeige..."
  - "Wähle relevante Profildaten aus..."
  - "Generiere Lebenslauf mit KI..."
  - "Generiere Anschreiben mit KI..."
  - "Extrahiere ATS-Keywords..."
  - "Speichere Ergebnisse..."
  - "Fertig!"
- ✅ Progress bar animates smoothly (CSS transition-all)
- ✅ Percentage text shows "X% abgeschlossen"

### 2. SSE Connection and Events

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter for "stream" or EventSource connections
4. Create a new application as in Test 1
5. Observe the SSE connection

**Expected Results:**
- ✅ SSE connection established to `/api/v1/applications/{id}/stream`
- ✅ Connection shows as "pending" (long-lived)
- ✅ Events received every 2 seconds with data format:
  ```json
  {
    "id": "...",
    "status": "GENERATING",
    "progress": 40,
    "message": "Generiere Lebenslauf mit KI...",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
  ```
- ✅ Progress values increase: 0 → 10 → 20 → 40 → 60 → 80 → 95 → 100
- ✅ Connection closes automatically when status reaches "READY"

### 3. Progress Bar Smoothness

**Steps:**
1. Create a new application
2. Watch the progress bar animation closely
3. Note the transition between progress updates

**Expected Results:**
- ✅ Progress bar slides smoothly (no jumps)
- ✅ Transition takes ~300ms (Tailwind's transition-all default)
- ✅ No visual glitches or flickering
- ✅ Bar color remains consistent (primary blue)

### 4. Without Cover Letter

**Steps:**
1. Create a new application with "Mit Anschreiben" **unchecked**
2. Observe progress messages

**Expected Results:**
- ✅ Progress skips cover letter stage (jumps from 40% to 80%)
- ✅ Message shows "Überspringe Anschreiben-Generierung..." at 60%
- ✅ Total time is shorter (no cover letter generation)

### 5. Error Handling

**Steps:**
1. Temporarily stop the LLM service or configure invalid API key
2. Create a new application
3. Observe progress bar when generation fails

**Expected Results:**
- ✅ Progress bar shows partial progress (e.g., stuck at 20% or 40%)
- ✅ SSE connection remains open
- ✅ After failure, status changes to "FAILED"
- ✅ Progress bar disappears, replaced by error message
- ✅ "Erneut versuchen" button appears

### 6. SSE Reconnection (Network Interruption)

**Steps:**
1. Start creating an application
2. When progress is at ~40%, disconnect network (offline mode)
3. Wait 5 seconds
4. Reconnect network

**Expected Results:**
- ✅ SSE connection drops (shown in DevTools)
- ✅ Frontend shows last known progress state
- ✅ When network returns, page can be refreshed to see final status
- ✅ No automatic reconnection (prevents rate limit issues)

### 7. Multiple Concurrent Applications

**Steps:**
1. Create 3 applications simultaneously (open in different tabs)
2. Observe progress in each tab

**Expected Results:**
- ✅ Each tab shows independent progress tracking
- ✅ No cross-contamination of progress data
- ✅ Each SSE connection handles its own application ID
- ✅ All applications complete successfully

### 8. Page Refresh During Generation

**Steps:**
1. Create an application
2. When progress is at ~50%, refresh the page (F5)
3. Observe behavior

**Expected Results:**
- ✅ SSE connection re-establishes automatically
- ✅ Progress resumes from current backend state
- ✅ If generation completed during refresh, shows READY status
- ✅ No errors or broken state

## Browser Console Logs

Enable verbose logging to see SSE events:

```javascript
// Check for SSE log messages
[SSE] Connecting to stream for application {id}
[SSE] Connection opened for application {id}
[SSE] Received update for application {id}: { progress: 40, message: "...", status: "GENERATING" }
[SSE] Final status reached (READY), closing connection and refetching
[SSE] Cleanup - closing connection for application {id}
```

## Performance Metrics

**Expected Timings (with mock LLM):**
- Total generation time: ~2-5 seconds
- Progress update interval: 2 seconds (SSE polling)
- Each stage duration: <1 second

**Expected Timings (with Azure OpenAI):**
- Total generation time: 30-60 seconds
- Progress update interval: 2 seconds
- LLM stages (resume, cover letter): 10-20 seconds each
- Keyword extraction: 5-10 seconds

## Troubleshooting

### Progress bar not showing
- Check browser console for errors
- Verify SSE connection in Network tab
- Ensure application status is "GENERATING"

### Progress stuck at 0%
- Backend may not be calling progress callbacks
- Check backend logs for pipeline execution
- Verify LLM service is responding

### SSE connection errors
- Check CORS configuration
- Verify cookie credentials are included
- Ensure user is authenticated

### Messages in English instead of German
- Check prompt template language parameter
- Verify language detection is working
- Review backend logs for detected language

## Acceptance Criteria Checklist

- [x] Backend emits 8 progress stages (0%, 10%, 20%, 40%, 60%, 80%, 95%, 100%)
- [x] SSE events include `{ progress: number, message: string, status: string }`
- [x] Frontend shows smooth progress bar (uses `<Progress />` from shadcn)
- [x] Stage messages in German: "Generiere Anschreiben...", etc.
- [x] Progress bar animates smoothly (CSS transition-all built-in)
- [ ] Handle SSE reconnection if connection drops (manual page refresh required)
- [ ] Show estimated time remaining (not implemented - future enhancement)

## Future Enhancements

1. **Estimated Time Remaining**
   - Track average time per stage
   - Calculate ETA based on progress: "ca. 30 Sekunden verbleibend"

2. **Automatic SSE Reconnection**
   - Implement exponential backoff
   - Prevent rate limit issues
   - Show connection status in UI

3. **Progress Persistence**
   - Store progress in database
   - Survive page refreshes without SSE
   - Historical progress tracking

4. **More Granular Progress**
   - Sub-stages within LLM calls
   - Token streaming progress
   - PDF generation steps

## Related Documentation

- Issue: #[TBD] - Add visual progress indicator for PDF generation
- SSE Implementation: `apps/api/src/applications/applications.service.ts`
- Frontend Component: `apps/web/src/app/(dashboard)/applications/[id]/page.tsx`
- Progress Component: `apps/web/src/components/ui/progress.tsx`
