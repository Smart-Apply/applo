# Progress Indicator Architecture Diagram

## System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER ACTION                                │
│                  Click "Bewerbung erstellen"                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                           │
│                                                                      │
│  1. POST /api/v1/applications                                       │
│     → Application created with status: PENDING                       │
│                                                                      │
│  2. Navigate to /applications/{id}                                  │
│     → Load application details                                      │
│                                                                      │
│  3. Establish SSE connection                                        │
│     GET /api/v1/applications/{id}/stream (withCredentials)          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SSE STREAM (Backend)                            │
│                                                                      │
│  Observable.interval(2000ms):                                       │
│    ┌──────────────────────────────────────────────┐                │
│    │ 1. Fetch application from DB                 │                │
│    │    SELECT id, status, updatedAt              │                │
│    │                                               │                │
│    │ 2. Get progress from callbacks map           │                │
│    │    lastProgress = progressCallbacks.get(id)  │                │
│    │                                               │                │
│    │ 3. Emit SSE event                            │                │
│    │    {                                          │                │
│    │      status: "GENERATING",                   │                │
│    │      progress: 40,                            │                │
│    │      message: "Generiere Lebenslauf..."      │                │
│    │    }                                          │                │
│    │                                               │                │
│    │ 4. Check if done                             │                │
│    │    if (status === READY || FAILED)           │                │
│    │      → Close stream                           │                │
│    └──────────────────────────────────────────────┘                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   GENERATION PIPELINE (Background)                   │
│                                                                      │
│  generateWithSinglePipeline(applicationId, userId):                 │
│                                                                      │
│    emitProgress(0%, "Starte Generierung...")                        │
│    ├─ Store callback in progressCallbacks.set(id, callback)         │
│    │                                                                 │
│    emitProgress(10%, "Lade Profil und Stellenanzeige...")           │
│    ├─ await getProfileWithRelations(userId)                         │
│    │                                                                 │
│    emitProgress(20%, "Wähle relevante Profildaten aus...")          │
│    ├─ await llmService.callJson('skill-selector.md')                │
│    │  Duration: 5-10 seconds                                        │
│    │                                                                 │
│    emitProgress(40%, "Generiere Lebenslauf mit KI...")              │
│    ├─ await llmService.callText('resume.md')                        │
│    │  Duration: 10-20 seconds                                       │
│    │                                                                 │
│    emitProgress(60%, "Generiere Anschreiben mit KI...")             │
│    ├─ await llmService.callText('cover-letter.md')                  │
│    │  Duration: 10-20 seconds                                       │
│    │  (or skip if disabled)                                         │
│    │                                                                 │
│    emitProgress(80%, "Extrahiere ATS-Keywords...")                  │
│    ├─ await llmService.callJson('ats-keywords.md')                  │
│    │  Duration: 5-10 seconds                                        │
│    │                                                                 │
│    emitProgress(95%, "Speichere Ergebnisse...")                     │
│    ├─ await prisma.application.update({status: READY})              │
│    │                                                                 │
│    emitProgress(100%, "Fertig!")                                    │
│    └─ Clean up: progressCallbacks.delete(id)                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND UI UPDATE                               │
│                                                                      │
│  EventSource.onmessage(event):                                      │
│    ┌──────────────────────────────────────────────┐                │
│    │ const data = JSON.parse(event.data)          │                │
│    │                                               │                │
│    │ setProgress(data.progress)                   │                │
│    │ setProgressMessage(data.message)             │                │
│    │                                               │                │
│    │ if (data.status === 'READY'):                │                │
│    │   → Close EventSource                        │                │
│    │   → Refetch full application details         │                │
│    │   → Show success toast                        │                │
│    └──────────────────────────────────────────────┘                │
│                                                                      │
│  Render:                                                             │
│    ┌──────────────────────────────────────────────┐                │
│    │ Status: Wird erstellt                        │                │
│    │                                               │                │
│    │ ▓▓▓▓▓▓▓▓░░░░░░░░  40%                       │                │
│    │                                               │                │
│    │ Generiere Lebenslauf mit KI...               │                │
│    │ 40% abgeschlossen                            │                │
│    └──────────────────────────────────────────────┘                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Frontend State               SSE Events                Backend State
─────────────────           ──────────────            ─────────────────

progress: 0         ◄──────  { progress: 0 }  ◄──────  emitProgress(0%)
message: ""                 { message: "..." }
                                                        
progress: 10        ◄──────  { progress: 10 } ◄──────  emitProgress(10%)
message: "Lade..."          { message: "..." }
                                                        
progress: 20        ◄──────  { progress: 20 } ◄──────  emitProgress(20%)
message: "Wähle..."         { message: "..." }         [LLM Processing]
                                                        
progress: 40        ◄──────  { progress: 40 } ◄──────  emitProgress(40%)
message: "Gen..."           { message: "..." }         [LLM Processing]
                                                        
progress: 60        ◄──────  { progress: 60 } ◄──────  emitProgress(60%)
message: "Gen..."           { message: "..." }         [LLM Processing]
                                                        
progress: 80        ◄──────  { progress: 80 } ◄──────  emitProgress(80%)
message: "Extr..."          { message: "..." }         [LLM Processing]
                                                        
progress: 95        ◄──────  { progress: 95 } ◄──────  emitProgress(95%)
message: "Speich..."        { message: "..." }         [DB Update]
                                                        
progress: 100       ◄──────  { progress: 100 } ◄─────  emitProgress(100%)
message: "Fertig!"          { message: "..." }         [Cleanup]
                            { status: "READY" }
                            [Connection closes]
```

## Component Interaction

```
┌────────────────────────────────────────────────────────────┐
│                   ApplicationDetailPage                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ useEffect(() => {                                    │  │
│  │   const eventSource = new EventSource(...)           │  │
│  │                                                       │  │
│  │   eventSource.onmessage = (event) => {               │  │
│  │     setProgress(data.progress)    ────────┐          │  │
│  │     setProgressMessage(data.message)      │          │  │
│  │   }                                       │          │  │
│  │ }, [applicationId, status])               │          │  │
│  └───────────────────────────────────────────┼──────────┘  │
│                                              │              │
│  ┌───────────────────────────────────────────▼──────────┐  │
│  │ Status Banner Component                             │  │
│  │                                                      │  │
│  │  {status === 'GENERATING' && (                      │  │
│  │    <div>                                             │  │
│  │      <Progress value={progress} />  ◄───────────────┼──┼─ State
│  │      <p>{progressMessage}</p>       ◄───────────────┘  │
│  │      <p>{progress}% abgeschlossen</p>                  │
│  │    </div>                                               │
│  │  )}                                                     │
│  └─────────────────────────────────────────────────────────┘
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Progress Callback Storage

```
Backend: ApplicationsService
─────────────────────────────

progressCallbacks: Map<string, ProgressCallback>
│
├─ "app-123" → (progress, message) => { lastProgress = progress; ... }
│                                      ▲
│                                      │
├─ "app-456" → (progress, message) => { ... }
│                                      │
└─ "app-789" → (progress, message) => { ... }
                                       │
                                       │
                    Called by generateWithSinglePipeline()
                                       │
                                       ▼
                    Stored values emitted via streamStatus()
```

## Timeline Example (Real LLM)

```
Time  Progress  Message                              Action
────  ────────  ───────────────────────────────────  ──────────────────
0s    0%        Starte Generierung...                Init
1s    10%       Lade Profil und Stellenanzeige...   DB queries
3s    20%       Wähle relevante Profildaten aus...  LLM call starts
11s   40%       Generiere Lebenslauf mit KI...      LLM call starts
28s   60%       Generiere Anschreiben mit KI...     LLM call starts
42s   80%       Extrahiere ATS-Keywords...          LLM call starts
50s   95%       Speichere Ergebnisse...             DB update
51s   100%      Fertig!                             Complete
```

## Error Flow

```
Normal Flow              Error Flow
───────────             ───────────

0% → Start              0% → Start
10% → Load Data         10% → Load Data
20% → Select Profile    20% → Select Profile
40% → Gen Resume        40% → Gen Resume
                        ❌ LLM Error
                        
                        Status: FAILED
                        errorMessage: "LLM timeout"
                        
                        SSE emits:
                        { status: "FAILED",
                          progress: 40,  ← Stuck at last value
                          message: "..." }
                        
                        Frontend shows:
                        - Error banner
                        - "Erneut versuchen" button
                        - Last known progress (40%)
```

## Notes

- **In-Memory:** Progress callbacks stored in Map, not persisted
- **Single Instance:** Works for single backend instance (MVP)
- **Cleanup:** Callbacks deleted on completion or error
- **Polling:** SSE polls DB every 2s, not real-time push
- **Scalability:** For multi-instance, need Redis pub/sub

## References

- Full documentation: `docs/features/PROGRESS_INDICATOR.md`
- Testing guide: `docs/testing/PROGRESS_INDICATOR_TESTING.md`
