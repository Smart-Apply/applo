# Retry Mechanism for Failed PDF Generations

## Overview
Allows users to retry PDF generation for applications that have failed, without losing their work (job posting parsing, notes, resume/cover letter content).

## Problem Statement
Previously, when PDF generation failed (status `FAILED`):
- User had to delete the entire application
- All work was lost (job posting parsing, custom notes, edited content)
- User had to start from scratch
- Poor UX for recoverable errors (network issues, temporary LLM failures)

## Solution
New `POST /api/v1/applications/:id/regenerate` endpoint that:
1. Validates the application is in `FAILED` status
2. Resets status to `GENERATING`
3. Clears error message and old file keys
4. Re-enqueues the PDF generation job
5. Preserves all application data (resume, cover letter, notes)

## Architecture

### Backend Flow
```
User clicks "Erneut versuchen"
  ↓
POST /api/v1/applications/:id/regenerate
  ↓
ApplicationsService.regenerate()
  ├── Verify ownership (ensureApplicationOwnership)
  ├── Check status is FAILED (throw 400 if not)
  ├── Verify resume data exists (throw 400 if missing)
  ├── Clean up old files
  ├── Update DB: status = GENERATING, clear error/files
  └── Re-enqueue job: APPLICATION_GENERATE
  ↓
Worker picks up job (existing pipeline)
  ├── Generate PDFs with Puppeteer
  ├── Upload to Azure Blob
  └── Update status: READY or FAILED
```

### Frontend Flow
```
Application detail page loads
  ↓
SSE connection established (if PENDING/GENERATING)
  ↓
If status === 'FAILED':
  - Show error banner with message
  - Show "Erneut versuchen" button
  ↓
User clicks button
  ↓
useRetryApplication() mutation
  ├── POST /api/v1/applications/:id/regenerate
  ├── Update cache: status = GENERATING
  └── Show toast: "Generierung wurde erneut gestartet"
  ↓
SSE receives updates (GENERATING → READY/FAILED)
  ↓
UI updates automatically
```

## API Specification

### Endpoint
```
POST /api/v1/applications/:id/regenerate
```

### Request
- **Headers:** `Authorization: Bearer <token>` (HttpOnly cookie)
- **Body:** None

### Response (200 OK)
```json
{
  "id": "app-123",
  "userId": "user-456",
  "jobPostingId": "job-789",
  "status": "GENERATING",
  "errorMessage": null,
  "coverLetterFileKey": null,
  "resumeFileKey": null,
  "resumeText": "...",
  "coverLetterText": "...",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

### Error Responses

#### 400 Bad Request - Not FAILED
```json
{
  "statusCode": 400,
  "message": "Nur fehlgeschlagene Bewerbungen können erneut generiert werden.",
  "error": "Bad Request",
  "code": "APPLICATION_NOT_FAILED"
}
```

#### 400 Bad Request - Missing Resume
```json
{
  "statusCode": 400,
  "message": "Bitte speichere zuerst deinen Lebenslauf.",
  "error": "Bad Request",
  "code": "APPLICATION_NO_RESUME"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Bewerbung nicht gefunden. Möglicherweise wurde sie gelöscht.",
  "error": "Not Found",
  "code": "APPLICATION_NOT_FOUND"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

## Frontend Components

### useRetryApplication Hook
```typescript
export function useRetryApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.applications.regenerate(id),
    onSuccess: (updatedApplication) => {
      // Update cache with new status (should be GENERATING)
      queryClient.setQueryData(['applications', updatedApplication.id], updatedApplication);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toastSuccess('Generierung wurde erneut gestartet');
    },
    onError: (error: unknown) => {
      toastError(error, 'Fehler beim erneuten Generieren');
    },
  });
}
```

### UI Implementation
Located in `apps/web/src/app/(dashboard)/applications/[id]/page.tsx`:

```tsx
{application.status === 'FAILED' && (
  <div className="space-y-2">
    <p className="text-sm text-gray-600">
      Bei der Erstellung ist ein Fehler aufgetreten.
      {application.errorMessage && (
        <span className="block mt-1 font-mono text-xs text-red-700 bg-red-50 p-2 rounded">
          {application.errorMessage}
        </span>
      )}
    </p>
    <Button
      variant="default"
      size="sm"
      onClick={() => retryMutation.mutate(application.id)}
      disabled={retryMutation.isPending}
      className="mt-2"
    >
      {retryMutation.isPending ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Generiere erneut...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Erneut versuchen
        </>
      )}
    </Button>
  </div>
)}
```

## Error Codes

### Backend (`apps/api/src/common/constants/error-codes.ts`)
```typescript
export enum ErrorCode {
  // ...
  APPLICATION_NOT_FAILED = 'APPLICATION_NOT_FAILED',
  // ...
}
```

### Frontend (`apps/web/src/lib/error-messages.ts`)
```typescript
export enum ErrorCode {
  // ...
  APPLICATION_NOT_FAILED = 'APPLICATION_NOT_FAILED',
  // ...
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // ...
  [ErrorCode.APPLICATION_NOT_FAILED]: 
    'Nur fehlgeschlagene Bewerbungen können erneut generiert werden.',
  // ...
};
```

## SSE Integration
The retry mechanism leverages existing Server-Sent Events (SSE) infrastructure:

1. **After retry:** Status changes from `FAILED` → `GENERATING`
2. **SSE reconnects:** Existing useEffect in page.tsx detects `GENERATING` status
3. **Real-time updates:** User sees live progress without page refresh
4. **Final status:** SSE closes when status reaches `READY` or `FAILED`

Key code in `apps/web/src/app/(dashboard)/applications/[id]/page.tsx`:
```tsx
useEffect(() => {
  // Only connect SSE if status is PENDING or GENERATING
  if (application.status !== 'PENDING' && application.status !== 'GENERATING') {
    return;
  }

  const eventSource = new EventSource(
    `${process.env.NEXT_PUBLIC_API_URL}/applications/${applicationId}/stream`,
    { withCredentials: true }
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    queryClient.setQueryData(['applications', applicationId], (old: any) => ({
      ...old,
      status: data.status
    }));

    if (data.status === 'READY' || data.status === 'FAILED') {
      refetch(); // Full refetch to get PDFs or error message
      eventSource.close();
    }
  };

  return () => eventSource.close();
}, [application?.status, applicationId]);
```

## Testing

### E2E Tests (`apps/api/test/e2e/features/applications.e2e-spec.ts`)

#### Test 1: Successful Retry
```typescript
it('should retry failed application generation', async () => {
  const response = await request(app.getHttpServer())
    .post(`/api/v1/applications/${failedApplicationId}/regenerate`)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);

  expect(response.body).toMatchObject({
    id: failedApplicationId,
    userId,
    status: 'GENERATING',
  });

  expect(response.body.errorMessage).toBeNull();
  expect(response.body.coverLetterFileKey).toBeNull();
  expect(response.body.resumeFileKey).toBeNull();
});
```

#### Test 2: Reject READY Application
```typescript
it('should return 400 for non-failed application (READY)', async () => {
  const response = await request(app.getHttpServer())
    .post(`/api/v1/applications/${readyApplicationId}/regenerate`)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(400);

  expect(response.body.code).toBe('APPLICATION_NOT_FAILED');
});
```

#### Test 3: Reject PENDING Application
```typescript
it('should return 400 for non-failed application (PENDING)', async () => {
  const response = await request(app.getHttpServer())
    .post(`/api/v1/applications/${pendingApplicationId}/regenerate`)
    .set('Authorization', `Bearer ${authToken}`)
    .expect(400);

  expect(response.body.code).toBe('APPLICATION_NOT_FAILED');
});
```

#### Test 4: 404 for Non-Existent Application
```typescript
it('should return 404 for non-existent application', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/applications/550e8400-e29b-41d4-a716-446655440000/regenerate')
    .set('Authorization', `Bearer ${authToken}`)
    .expect(404);
});
```

#### Test 5: 401 Unauthenticated
```typescript
it('should return 401 without auth token', async () => {
  await request(app.getHttpServer())
    .post(`/api/v1/applications/${failedApplicationId}/regenerate`)
    .expect(401);
});
```

### Manual Testing Checklist

#### Setup
1. Start backend: `cd apps/api && npm run start:dev`
2. Start frontend: `cd apps/web && npm run dev`
3. Login with demo account: demo@smartapply.com / Demo123!

#### Test Scenario 1: Successful Retry
1. Create a new application (will go to PENDING status)
2. Manually update DB to set status to FAILED:
   ```sql
   UPDATE "Application" 
   SET status = 'FAILED', "errorMessage" = 'Test error'
   WHERE id = 'YOUR_APP_ID';
   ```
3. Reload application detail page
4. **Expected:** Red error banner with "Erneut versuchen" button
5. Click "Erneut versuchen"
6. **Expected:** 
   - Button shows spinner and "Generiere erneut..."
   - Toast: "Generierung wurde erneut gestartet"
   - Status banner changes to blue "Wird erstellt"
7. **Expected (SSE):** Status updates in real-time to READY or FAILED

#### Test Scenario 2: Reject Non-FAILED Status
1. Navigate to application with status READY
2. Open browser console
3. Execute:
   ```javascript
   fetch('/api/v1/applications/YOUR_APP_ID/regenerate', {
     method: 'POST',
     credentials: 'include'
   }).then(r => r.json()).then(console.log)
   ```
4. **Expected:** 400 error with code "APPLICATION_NOT_FAILED"

#### Test Scenario 3: Loading State
1. Create FAILED application (as in Scenario 1)
2. Open Network tab (throttle to Slow 3G)
3. Click "Erneut versuchen"
4. **Expected:**
   - Button immediately disabled
   - Spinner icon appears
   - Text changes to "Generiere erneut..."
   - Button re-enables after response

#### Test Scenario 4: Error Handling
1. Stop backend server
2. Click "Erneut versuchen" on FAILED application
3. **Expected:**
   - Error toast: "Fehler beim erneuten Generieren"
   - Button re-enables
   - Application status unchanged

## Performance Considerations

### Database Impact
- Single UPDATE query to reset application state
- No new tables or indexes required
- Existing job queue handles re-processing

### Network Impact
- Single POST request (no payload)
- Response size: ~1-2 KB (application JSON)
- SSE connection reuses existing infrastructure

### User Experience
- **Time to retry:** < 500ms (network + DB update)
- **Time to READY:** Same as initial generation (30-90s)
- **No data loss:** All edits preserved during retry

## Security Considerations

### Authorization
- ✅ JWT authentication required (JwtAuthGuard)
- ✅ User can only retry their own applications (ensureApplicationOwnership)
- ✅ Rate limiting: Standard 100 requests/15min (no special rate limit needed)

### Input Validation
- ✅ Application ID validated (UUID format via Nest.js routing)
- ✅ Status validation (only FAILED allowed)
- ✅ Resume data validation (must exist)

### Error Messages
- ✅ German user-facing messages (actionable)
- ✅ Error codes for frontend mapping
- ✅ No sensitive data in error responses

## Future Enhancements

### P2: Retry with Custom Parameters
Allow user to change LLM parameters on retry:
```typescript
POST /api/v1/applications/:id/regenerate
{
  "language": "en",
  "coverLetterTemplateId": "professional",
  "resumeTemplateId": "modern"
}
```

### P3: Retry Limit
Prevent infinite retries:
```typescript
// Add to Application model
retryCount: number (default: 0)
maxRetries: 3

if (application.retryCount >= 3) {
  throw new BadRequestException('Maximum retries exceeded');
}
```

### P3: Retry History
Track retry attempts for debugging:
```typescript
// New table: ApplicationRetry
{
  id: string
  applicationId: string
  retriedAt: Date
  reason: string
  userId: string
}
```

## Related Documentation
- [Error Codes](./ERROR_CODES.md) - Error code system
- [SSE Streaming](./SSE_STREAMING.md) - Real-time status updates
- [Job Queue](../guides/JOB_QUEUE.md) - Background job processing
- [Application Pipeline](../implementation/APPLICATION_PIPELINE.md) - PDF generation flow

## Changelog
- **2024-01-15:** Initial implementation (Issue #203)
  - Added regenerate endpoint
  - Added E2E tests
  - Updated frontend UI
  - Added error codes
