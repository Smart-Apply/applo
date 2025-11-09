# 🚀 Smart Apply – MVP Feature List (Architecture-Aligned)

| Category | Feature | Description | Implemented | Needed for MVP | Phase |
|-----------|----------|--------------|--------------|----------------|--------|
| **Auth** | User Registration & Login | Email/password signup with JWT auth guard | ✅ Done | 🔄 Frontend forms for register/login | MVP |
| **Auth** | Authenticated API Access | Protect routes using JWT & guards | ✅ Done | — | MVP |
| **Profile** | Profile CRUD | Manage user info (name, contact, summary) | ✅ Done | 🔄 UI integration (view/edit form) | MVP |
| **Profile** | Experience / Education / Projects / Certificates | Structured profile sections with 1-N relations | ✅ Done | 🔄 Basic UI for editing/adding | MVP |
| **Profile** | Profile Persistence | Store profile data in PostgreSQL | ✅ Done | — | MVP |
| **Job Postings** | Job Parsing via URL | Parse job data from LinkedIn / Indeed | ✅ Done | 🔄 Minimal UI to input and show parsed data | MVP |
| **Job Postings** | Manual Job Input | Paste job description manually if parsing fails | 🧩 Partial | 🔄 Extend controller + simple UI | MVP |
| **Job Postings** | Job Storage | Save parsed or pasted job postings in DB | ✅ Done | — | MVP |
| **Applications** | Create Application | Start generation pipeline with `jobPostingId` | ✅ Done | 🔄 Frontend action (Generate button) | MVP |
| **Applications** | Application Queue (Service Bus) | Background job processing for generation | ✅ Done | — | MVP |
| **Applications** | Application Status Updates | Track `PENDING → GENERATING → READY → FAILED` | ✅ Done | 🔄 Display on UI | MVP |
| **Applications** | Application List | List all user applications | 🧩 Controller ready | 🔄 UI (table or list view) | MVP |
| **Applications** | Application Detail View | Show job + generated CL + CV + status | ✅ Done | 🔄 UI layout | MVP |
| **AI / LLM** | Cover Letter Generation | Generate personalized text using template | ✅ Done | 🔄 Polish prompt template | MVP |
| **AI / LLM** | Resume Generation | Generate resume markdown from profile | ✅ Done | 🔄 Polish prompt template | MVP |
| **AI / LLM** | Template Rendering Engine | Handlebars/Markdown template rendering | ✅ Done | — | MVP |
| **PDF** | PDF Generation | Puppeteer converts markdown → PDF | ✅ Done | — | MVP |
| **PDF** | PDF Styling Templates | Default HTML/CSS for layout | ✅ Done | 🔄 Review visual consistency | MVP |
| **Storage** | Azure Blob Upload | Upload PDFs & generate SAS URLs | ✅ Done | — | MVP |
| **Storage** | File Retrieval | Return time-limited URLs for user download | ✅ Done | 🔄 Frontend download buttons | MVP |
| **Frontend / UX** | Dashboard | Overview of all applications | 🧩 Partial | 🔄 Implement basic list view | MVP |
| **Frontend / UX** | Form Wizard | Step 1: Profile → Step 2: Job → Step 3: Generate | 🧩 Partial | 🔄 Implement flow | MVP |
| **Frontend / UX** | Loading & Error States | Indicate generation progress & errors | 🧩 Partial | 🔄 Implement | MVP |
| **Frontend / UX** | Download PDFs | Buttons for CL/CV | 🧩 Partial | 🔄 Add to detail view | MVP |
| **System / DevOps** | Environment Config & Key Vault | Managed secrets for DB, LLM, Blob, Service Bus | ✅ Done | — | MVP |
| **System / DevOps** | Rate Limiting | Prevent abuse of free tier | ✅ Done | — | MVP |
| **System / DevOps** | Logging & Error Tracking | Centralized error filter + logs | ✅ Done | — | MVP |
| **System / DevOps** | Swagger Docs | Document all public endpoints | 🧩 Optional | 🔄 Enable for dev/testing | MVP |
| **Post-MVP** | ATS Keyword Matching | Evaluate profile/job overlap semantically | ❌ Not yet | — | Phase 2 |
| **Post-MVP** | Gmail/Outlook Integration | Track application responses | ❌ Not yet | — | Phase 2 |
| **Post-MVP** | Analytics Dashboard | Show metrics (applications, success rates) | ❌ Not yet | — | Phase 2 |
| **Post-MVP** | White-Label / API Tier | Partner integrations (job boards, agencies) | ❌ Not yet | — | Phase 3 |
| **Post-MVP** | Mobile App | React Native / PWA | ❌ Not yet | — | Phase 3 |

✅ **Implementation Summary**
- Back-end foundation: 90 % complete.
- MVP gaps: front-end UX, simple templates, and minor integration glue.
- Infrastructure (Azure, LLM, Queue, Storage) already production-grade.
