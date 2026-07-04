// ============================================
// AI Prompt Guardrails (issue #520)
// ============================================

export * from './ai-guardrails';

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// OAuth Types
// ============================================

export type OAuthProviderType = 'GOOGLE' | 'MICROSOFT' | 'LINKEDIN' | 'APPLE' | 'FACEBOOK';

export interface OAuthProvider {
  provider: OAuthProviderType;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastUsedAt: string;
  createdAt: string;
}

// ============================================
// Subscription Types
// ============================================

export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'INCOMPLETE';

export interface TierFeatures {
  customTemplates: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  interviewCoach: boolean;
  /** LinkedIn job search & import (Premium feature) */
  linkedinImport?: boolean;
  /** Email-based application tracking (future Premium feature) */
  emailParsing?: boolean;
  /** ATS keyword analysis & match score (Pro & Premium feature) */
  atsOptimization?: boolean;
}

export interface TierLimits {
  applicationsPerMonth: number;
  interviewSessionsPerMonth: number;
  priority: 'low' | 'normal' | 'high';
  features: TierFeatures;
}

export interface UsageStat {
  used: number;
  limit: number;
  remaining: number;
}

export interface DailyUsageStat extends UsageStat {
  /** Start of the rolling 24h window (ISO timestamp) */
  windowStart: string;
}

export interface SubscriptionUsageStats {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  applications: UsageStat;
  interviewSessions: UsageStat;
  /** Monthly cap on AI application validations (Free: 5, Pro+: unlimited) */
  validations?: UsageStat;
  /** Rolling 24h cap on full application generations (cost protection) */
  applicationsToday?: DailyUsageStat;
  periodStart: string;
  periodEnd: string;
  features: TierFeatures;
}

export interface TierInfo {
  id: SubscriptionTier;
  name: string;
  price: number;
  features: string[];
  limits: TierLimits;
}

export interface TiersResponse {
  tiers: TierInfo[];
}

export interface CanPerformActionResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
  limit: number;
}

// ============================================
// Analytics Types (Premium feature)
// ============================================

/**
 * Aggregate dashboard payload returned by `GET /analytics/overview`.
 * Mirror of the backend `AnalyticsOverviewDto` — keep in sync.
 */
export interface AnalyticsOverview {
  generatedAt: string;
  totals: {
    applications: number;
    applied: number;
    interviews: number;
    accepted: number;
    rejected: number;
    activelyTracked: number;
  };
  funnel: Array<{
    stage: 'CREATED' | 'APPLIED' | 'INTERVIEW' | 'ACCEPTED';
    count: number;
    conversionFromPrevious: number | null;
  }>;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  averageAtsScore: number | null;
  timeseries30d: Array<{
    date: string;
    created: number;
    applied: number;
    interview: number;
    accepted: number;
    rejected: number;
  }>;
  scoreBuckets: Array<{
    bucket: string;
    applications: number;
    interviews: number;
    interviewRate: number;
  }>;
  topTemplates: Array<{
    templateId: string;
    templateName: string;
    usageCount: number;
    interviewRate: number;
  }>;
}

// ============================================
// Profile Types
// ============================================

export interface Skill {
  id?: string;
  name: string;
  level?: string;
  category?: string | null;
}

/**
 * Normalizes a user-defined skill category for grouping. Returns null for
 * uncategorized skills: empty/whitespace values and the legacy 'General'
 * default that older profile writes stamped on every skill.
 */
export function normalizeSkillCategory(category?: string | null): string | null {
  const trimmed = category?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'general') return null;
  return trimmed;
}

export interface Experience {
  id?: string;
  title: string;
  company: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  current?: boolean;
}

export interface Education {
  id?: string;
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number | null;
  gpa?: string;
  description?: string;
}

export interface Certificate {
  id?: string;
  name: string;
  issuer: string;
  dateObtained?: string;
  url?: string;
  expiryDate?: string | null;
  credentialId?: string;
}

export interface Project {
  id?: string;
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
  startDate?: string;
  endDate?: string | null;
}

export interface Language {
  id?: string;
  name: string;
  level?: string;
}

export interface Profile {
  id: number;
  userId: number;
  summary?: string;
  phone?: string;
  street?: string; // Street and house number (e.g., "Musterstraße 123")
  postalCode?: string; // Postal code / PLZ (e.g., "47057")
  city?: string; // City name (e.g., "Duisburg")
  country?: string; // Country name (e.g., "Deutschland")
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills?: Skill[];
  experiences?: Experience[];
  education?: Education[];
  certificates?: Certificate[];
  projects?: Project[];
  languages?: Language[];
  profileKeywords?: ProfileKeywordsDto; // Cached ATS keywords
  lastKeywordsExtractedAt?: string; // Cache timestamp
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Profile Keywords Types (ATS Optimization)
// ============================================

export interface ProfileKeywordDto {
  keyword: string;
  source: 'job' | 'profile' | 'both';
  priority: 1 | 2 | 3;
}

export interface ProfileKeywordsDto {
  hard_skills: ProfileKeywordDto[];
  tools_and_tech: ProfileKeywordDto[];
  domains: ProfileKeywordDto[];
  methodologies: ProfileKeywordDto[];
}

// ============================================
// DTOs for API Communication
// ============================================

export interface EducationDto {
  id?: string;
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  startYear?: string;
  endYear?: string;
  gpa?: string;
  description?: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  street?: string; // Street and house number
  postalCode?: string; // Postal code / PLZ
  city?: string; // City name
  country?: string; // Country name
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
  skills?: Skill[];
  experiences?: Experience[];
  education?: EducationDto[];
  certificates?: Certificate[];
  projects?: Project[];
  languages?: Language[];
}

// ============================================
// Job Posting Types
// ============================================

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  niceToHave?: string[];
  rawText?: string;
  sourceUrl?: string;
  fileId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Template Types
// ============================================

export type TemplateType = 'COVER_LETTER' | 'RESUME' | 'BOTH';

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  category: string;
  language: string;
  baseTemplateId?: string;
  accentColor?: string; // Primary accent color hex (e.g., "#9c7a5b")
  colorVariantName?: string; // Display name for color variant (e.g., "Ocean Blue")
  thumbnailUrl?: string;
  previewImageKey?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateWithContent extends Template {
  htmlTemplate: string;
  cssStyles: string;
}

// ============================================
// Application Types
// ============================================

export type ApplicationGenerationStatus = 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
export type ApplicationTrackingStatus =
  | 'CREATED'
  | 'APPLIED'
  | 'INTERVIEW'
  | 'ACCEPTED'
  | 'REJECTED';
export type ApplicationStatus = ApplicationGenerationStatus;
// Who/what last set Application.applicationStatus. Surfaced in the UI as a
// small "📧" pill when the change came from inbox tracking.
export type ApplicationStatusSource = 'SYSTEM' | 'USER' | 'EMAIL_TRACKING';

export interface Application {
  id: string;
  userId: string;
  jobPostingId: string;
  title?: string;
  targetJobTitle?: string;
  applicationStatus: ApplicationTrackingStatus;
  statusUpdatedAt?: string;
  /** Who/what last changed `applicationStatus`. Drives the UI source pill. */
  statusSource?: ApplicationStatusSource;
  status: ApplicationGenerationStatus;
  notes?: string;
  coverLetterText?: string;
  resumeText?: string;
  coverLetterBlobKey?: string;
  resumeBlobKey?: string;
  coverLetterUrl?: string;
  resumeUrl?: string;
  errorMessage?: string;
  coverLetterTemplateId?: string;
  resumeTemplateId?: string;
  language?: string;
  createdAt: string;
  updatedAt: string;
  jobPosting?: JobPosting;
}

// ============================================
// Application Validation (AI quality + ATS review)
// ============================================

/** Headline verdict for a validated application. */
export type ApplicationValidationVerdict = 'strong' | 'good' | 'needs_work';

/** Per-category traffic-light status. */
export type ApplicationValidationStatus = 'pass' | 'warn' | 'fail';

/** Fixed set of categories every validation scores. */
export type ApplicationValidationCategoryId =
  | 'job_match'
  | 'ats_readability'
  | 'impact'
  | 'clarity'
  | 'completeness';

export interface ApplicationValidationCategory {
  id: ApplicationValidationCategoryId;
  /** Localized human-readable label. */
  label: string;
  /** 0-100 score for this category. */
  score: number;
  status: ApplicationValidationStatus;
}

export interface ApplicationValidationIssue {
  title: string;
  detail: string;
}

/**
 * Structured result of an AI quality + ATS review of an application
 * (résumé + optional cover letter). Produced by `POST /validation`.
 */
export interface ApplicationValidationResult {
  /** Holistic quality of the application (0-100). */
  overallScore: number;
  /** Heuristic ATS keyword/structure friendliness estimate (0-100), not a real ATS parse. */
  atsScore: number;
  verdict: ApplicationValidationVerdict;
  /** 1-2 sentence headline takeaway. */
  summary: string;
  categories: ApplicationValidationCategory[];
  /** Critical issues to fix before sending. */
  blockers: ApplicationValidationIssue[];
  /** Non-blocking, concrete improvements. */
  recommendations: ApplicationValidationIssue[];
  /** What already works well. */
  strengths: string[];
  /** ISO timestamp the validation was produced. */
  validatedAt?: string;
}

/**
 * Input for a standalone application check: the user's own externally-created
 * documents. `resumeText` is required; everything else is optional context.
 * Sent to `POST /validation`.
 */
export interface CreateValidationInput {
  /** The user's résumé / CV as plain text (pasted or extracted from a file). */
  resumeText: string;
  /** Optional cover letter text. */
  coverLetterText?: string;
  /** Optional target role and/or pasted job posting to evaluate fit against. */
  jobContext?: string;
  /** Optional language override (ISO 639-1). Auto-detected when omitted. */
  language?: string;
  /** Optional user-facing label for this check. */
  title?: string;
}

/**
 * A persisted standalone application check (history record). Stores the inputs
 * plus the AI result so it can be revisited without re-spending quota.
 */
export interface Validation {
  id: string;
  /** Optional user-facing label (e.g. "Bewerbungs-Check · 20.06.2026"). */
  title?: string;
  resumeText: string;
  coverLetterText?: string;
  jobContext?: string;
  language?: string;
  result: ApplicationValidationResult;
  /** Overall score (0-100), denormalized for the history list. */
  score: number;
  createdAt: string;
}

/** Lightweight history-list item (omits the heavy input/result blobs). */
export interface ValidationSummary {
  id: string;
  title?: string;
  score: number;
  verdict: ApplicationValidationVerdict;
  createdAt: string;
}

export interface ApplicationStatusResponse {
  id: string;
  status: ApplicationGenerationStatus;
  errorMessage: string | null;
  updatedAt: string;
}

export interface ApplicationFile {
  key: string;
  filename: string;
  mimeType: string;
  url: string;
  expiresAt: string;
}

export interface ApplicationFilesResponse {
  applicationId: string;
  coverLetter?: ApplicationFile;
  resume?: ApplicationFile;
}

// ============================================
// Resume Draft Types
// ============================================

export interface ResumeSkillCategory {
  id?: string;
  type: string;
  skills: string[];
  _key?: string;
}

export interface ResumeExperience {
  id?: string;
  title: string;
  company: string;
  location?: string;
  dateRange: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  achievements?: string[];
}

export interface ResumeProject {
  id?: string;
  name: string;
  description?: string;
  date?: string;
  highlights?: string[];
}

export interface ResumeEducation {
  id?: string;
  degree: string;
  institution: string;
  year: string;
  fieldOfStudy?: string;
  gpa?: string;
  description?: string;
}

export interface ResumeCertification {
  id?: string;
  name: string;
  issuer: string;
  date?: string;
}

export interface ResumeData {
  candidateName: string;
  targetJobTitle?: string;
  email: string;
  phone?: string;
  // Address fields (replaces old 'location' field)
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  fullAddress?: string; // Computed: "Straße, PLZ Stadt, Land"
  linkedin?: string;
  github?: string;
  summary?: string;
  skillCategories: ResumeSkillCategory[];
  experiences: ResumeExperience[];
  projects?: ResumeProject[];
  education?: ResumeEducation[];
  certifications?: ResumeCertification[];
  languages?: { name: string; level?: string }[];
}

// ============================================
// Session Types
// ============================================

export interface Session {
  id: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface SessionsResponse {
  sessions: Session[];
  currentSessionId: string;
}

// ============================================
// Authentication Types
// ============================================

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ErrorResponse {
  message: string;
  error?: string;
  statusCode: number;
}

// ============================================
// ATS Keywords Types
// ============================================

export interface ATSKeywords {
  coreCompetencies: string[]; // Core skills relevant to profession
  softSkills: string[];
  responsibilityKeywords: string[];
  requirementKeywords: string[];
  methodologies: string[]; // Methods, tools, frameworks
  industryKeywords: string[];
  senioritySignals: string[];
  miscKeywords: string[];
}

export type KeywordCategory =
  | 'core' // Core competencies (profession-specific skills)
  | 'soft' // Soft skills
  | 'responsibility' // Job responsibilities
  | 'requirement' // Job requirements
  | 'methodology' // Methods, tools, techniques
  | 'industry' // Industry/domain knowledge
  | 'seniority' // Experience level
  | 'misc'; // Miscellaneous

export interface KeywordMatch {
  keyword: string;
  category: KeywordCategory;
  found: boolean;
  usedIn?: string[];
  confidence: number;
}

export interface CategoryScores {
  core: number; // Core competencies (hard skills only)
  soft: number; // Deprecated - no longer extracted (always 0)
  experience: number; // Professional experience
  industry: number; // Domain/sector knowledge
}

export interface MatchAnalysis {
  overallScore: number;
  categoryScores: CategoryScores;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface ApplicationKeywordsResponse {
  applicationId: string;
  keywords: ATSKeywords;
  matchAnalysis: MatchAnalysis;
  matchedKeywords: KeywordMatch[];
  missingKeywords: KeywordMatch[];
  analyzedAt: string;
}

export type PipelineStage =
  | 'pending'
  | 'extracting-keywords'
  | 'generating-cv'
  | 'generating-cl'
  | 'finalizing'
  | 'complete'
  | 'failed';

export interface PipelineStatus {
  stage: PipelineStage;
  progress: number;
  message: string;
  timestamp: string;
  error?: string;
}

// ============================================
// User Preferences Types
// ============================================

export interface UserPreferences {
  id: string;
  userId: string;
  applicationUpdates: boolean;
  newJobPostings: boolean;
  marketingEmails: boolean;
  /** Notify the user when inbox tracking changed an application status. */
  emailTrackingNotify: boolean;
  language: string;
  theme: string;
  profilePublic: boolean;
  analyticsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPreferencesDto {
  applicationUpdates?: boolean;
  newJobPostings?: boolean;
  marketingEmails?: boolean;
  emailTrackingNotify?: boolean;
  language?: string;
  theme?: string;
  profilePublic?: boolean;
  analyticsEnabled?: boolean;
}

// ============================================
// API Response Types
// ============================================

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated list response format
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  code?: string;
  errors?: any[];
  meta: {
    timestamp: string;
    path: string;
    method: string;
  };
}

// ============================================
// Resume Parser Types
// ============================================

/**
 * Extracted profile data from resume parsing
 */
export interface ExtractedProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
  skills?: Array<{ name: string; level?: string }>;
  experiences?: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    description?: string;
    current?: boolean;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    startYear?: string;
    endYear?: string;
    gpa?: string;
    description?: string;
  }>;
  certificates?: Array<{
    name: string;
    issuer: string;
    dateObtained?: string;
    url?: string;
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    technologies?: string[];
    url?: string;
  }>;
  languages?: Array<{
    name: string;
    level: string;
  }>;
}

// ============================================
// Interview Coach Types (Premium Feature)
// ============================================

export type InterviewType = 'BEHAVIORAL' | 'TECHNICAL' | 'CASE_STUDY' | 'MIXED';
export type InterviewDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type InterviewSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type InterviewQuestionType = 'OPEN' | 'SITUATIONAL' | 'TECHNICAL' | 'BEHAVIORAL' | 'FOLLOW_UP';
/** How an interview session is conducted: typed text chat or spoken (voice) interview. */
export type InterviewMode = 'TEXT' | 'VOICE';

export interface InterviewQuestion {
  id: string;
  questionText: string;
  questionType: InterviewQuestionType;
  order: number;
  userAnswer?: string;
  answerDuration?: number;
  score?: number;
  feedback?: string;
  improvementTips?: string[];
  askedAt: string;
  answeredAt?: string;
}

export interface InterviewFeedback {
  id: string;
  overallScore: number;
  technicalScore?: number;
  communicationScore: number;
  presentationScore: number;
  problemSolvingScore?: number;
  cultureFitScore?: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  idealAnswers?: Record<string, string>;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  type: InterviewType;
  /** Conducted as text chat (default) or spoken voice interview. */
  mode?: InterviewMode;
  industry?: string;
  difficulty: InterviewDifficulty;
  language: string;
  jobTitle?: string;
  company?: string;
  applicationId?: string;
  maxQuestions: number;
  timeLimitMinutes?: number;
  status: InterviewSessionStatus;
  startedAt: string;
  completedAt?: string;
  overallScore?: number;
  questionsCount: number;
  answeredCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewSessionDetail extends InterviewSession {
  questions: InterviewQuestion[];
  feedback?: InterviewFeedback;
}

export interface StartInterviewDto {
  applicationId?: string;
  type?: InterviewType;
  industry?: string;
  difficulty?: InterviewDifficulty;
  language?: string;
  jobTitle?: string;
  company?: string;
  jobDescription?: string;
  maxQuestions?: number;
  timeLimitMinutes?: number;
}

export interface SubmitAnswerDto {
  answer: string;
  answerDuration?: number;
}

export interface NextQuestionResponse {
  question: InterviewQuestion;
  currentQuestion: number;
  totalQuestions: number;
  isLastQuestion: boolean;
}

export interface AnswerResponse {
  success: boolean;
  question: InterviewQuestion;
  hasMoreQuestions: boolean;
  message?: string;
}

export interface InterviewStats {
  totalSessions: number;
  completedSessions: number;
  /** Sessions that have a score > 0 — used to gate the improvement display. */
  scoredSessions: number;
  averageScore: number;
  bestScore: number;
  totalQuestionsAnswered: number;
  scoreImprovement: number;
  mostPracticedType: InterviewType;
  sessionsByType: Record<InterviewType, number>;
  averageCategoryScores: {
    technical?: number;
    communication: number;
    presentation: number;
    problemSolving?: number;
    cultureFit?: number;
  };
}

export interface InterviewSessionsResponse {
  sessions: InterviewSession[];
  total: number;
}

// ============================================
// Voice Interview Types (Realtime / WebRTC)
// ============================================

/** TTS voices supported by the Azure OpenAI Realtime API. */
export type RealtimeVoice =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'sage'
  | 'shimmer'
  | 'verse';

/**
 * Runtime availability + limits for the voice interview mode. Fetched before
 * rendering the "Sprach-Interview" option so FREE-tier or mock-provider
 * environments hide it cleanly instead of failing on connect.
 */
export interface VoiceInterviewConfig {
  /** True when a real voice provider is configured (not the mock/offline one). */
  available: boolean;
  defaultVoice: RealtimeVoice;
  voices: RealtimeVoice[];
  /** Hard per-session ceiling (minutes) enforced client- and server-side. */
  maxSessionMinutes: number;
  /** Monthly voice budget for the tier (-1 = unlimited). */
  minutesPerMonth: number;
  /** Minutes left in the current billing period. */
  remainingMinutes: number;
}

/**
 * Ephemeral session descriptor returned to the browser. The `token` is a
 * short-lived realtime client secret (never the standing Azure API key) used
 * to authenticate the browser's WebRTC SDP exchange with `webrtcUrl`.
 */
export interface VoiceSessionDescriptor {
  token: string;
  /** ISO timestamp after which the ephemeral token is rejected. */
  expiresAt: string;
  /** GA realtime calls endpoint (already includes `?webrtcfilter=on`). */
  webrtcUrl: string;
  model: string;
  voice: RealtimeVoice;
  /** Maximum allowed call length for this session (seconds). */
  maxSessionSeconds: number;
  /** Minutes left in the current billing period after this session is granted. */
  remainingMinutes: number;
}

export type VoiceTranscriptRole = 'interviewer' | 'candidate';

export interface VoiceTranscriptTurn {
  role: VoiceTranscriptRole;
  text: string;
  /** Offset from call start when the turn began (seconds), if known. */
  atSeconds?: number;
}

export interface StartVoiceSessionPayload {
  /** Optional voice override; falls back to the server default when omitted. */
  voice?: RealtimeVoice;
  /**
   * Desired call length in minutes. Server-side the value is clamped by the
   * per-session hard cap and the remaining monthly voice budget; the minted
   * `maxSessionSeconds` is authoritative.
   */
  durationMinutes?: 5 | 10 | 15;
}

export interface SubmitVoiceTranscriptPayload {
  durationSeconds: number;
  turns: VoiceTranscriptTurn[];
}

// ============================================
// Two-Factor Authentication Types
// ============================================

export interface TwoFactorStatus {
  isEnabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
  trustedDevicesCount: number;
}

export interface Setup2FAResponse {
  tempSecret: string;
  qrCodeDataUrl: string;
  otpAuthUrl: string;
}

export interface Verify2FASetupDto {
  code: string;
  tempSecret: string;
}

export interface Verify2FASetupResponse {
  backupCodes: string[];
}

export interface Verify2FALoginDto {
  challengeToken: string;
  code: string;
  trustDevice?: boolean;
}

export interface Disable2FADto {
  password: string;
}

export interface RegenerateBackupCodesDto {
  password: string;
}

export interface TwoFactorChallengeResponse {
  requiresTwoFactor: boolean;
  challengeToken: string;
  methods: string[];
}

export interface TrustedDevice {
  id: string;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface TrustedDevicesResponse {
  devices: TrustedDevice[];
}


// ============================================
// Email Tracking (Premium feature) — Mailbox Sync
// ============================================
// Connects an external mailbox (Microsoft 365 / Outlook.com first; Gmail
// later) so smart-apply can detect application-related emails the company
// sends and update the matching Application's tracking status automatically.

export type MailboxProvider = 'MICROSOFT' | 'GOOGLE';
export type MailboxConnectionStatus = 'ACTIVE' | 'DISABLED' | 'ERROR';

export interface MailboxConnection {
  id: string;
  provider: MailboxProvider;
  status: MailboxConnectionStatus;
  emailAddress: string;
  lastSyncedAt?: string;
  lastErrorMessage?: string | null;
  subscriptionExpiresAt?: string;
  createdAt: string;
}

/** Initiates the OAuth flow — returns the URL to redirect the browser to. */
export interface ConnectMailboxResponse {
  authorizationUrl: string;
}

export type EmailClassification =
  | 'APPLIED_CONFIRMATION'
  | 'INTERVIEW_INVITE'
  | 'OFFER'
  | 'REJECTION'
  | 'REQUEST_FOR_INFO'
  | 'OTHER';

export interface ApplicationEmailEvent {
  id: string;
  applicationId: string | null;
  fromAddress: string;
  fromName?: string | null;
  subject: string;
  receivedAt: string;
  classification?: EmailClassification | null;
  confidence?: number | null;
  resultedInStatusChange: boolean;
  previousStatus?: ApplicationTrackingStatus | null;
  newStatus?: ApplicationTrackingStatus | null;
  reason?: string | null;
  createdAt: string;
}
