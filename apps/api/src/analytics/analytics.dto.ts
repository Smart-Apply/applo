/**
 * Shape of the aggregate analytics payload returned by `GET /analytics/overview`.
 *
 * Designed for a single-fetch dashboard: one round-trip gives the page
 * everything it needs to render the funnel, scorecards, and trend charts.
 * All counts are scoped to the calling user. Dates are ISO 8601 strings.
 */
export interface AnalyticsOverviewDto {
  /** Unix-epoch ms when the snapshot was taken (server time). */
  generatedAt: string;

  /** Top-line counters across the user's full history. */
  totals: {
    applications: number;
    applied: number;
    interviews: number;
    accepted: number;
    rejected: number;
    /** applied + interview + accepted + rejected (i.e. NOT just CREATED) */
    activelyTracked: number;
  };

  /** Conversion funnel — each stage is a count + a percentage of the previous stage. */
  funnel: {
    stage: 'CREATED' | 'APPLIED' | 'INTERVIEW' | 'ACCEPTED';
    count: number;
    /** Conversion rate from previous stage (0–100). Null for first stage. */
    conversionFromPrevious: number | null;
  }[];

  /** Aggregate response rate: (interview + accepted + rejected) / applied. 0–100. */
  responseRate: number;

  /** Aggregate interview rate: (interview + accepted) / applied. 0–100. */
  interviewRate: number;

  /** Aggregate offer rate: accepted / applied. 0–100. */
  offerRate: number;

  /** Average ATS match score across all applications that have one. 0–100, or null. */
  averageAtsScore: number | null;

  /** Daily counts for the last 30 days. Days with zero applications are still present. */
  timeseries30d: {
    date: string; // YYYY-MM-DD
    created: number;
    applied: number;
    interview: number;
    accepted: number;
    rejected: number;
  }[];

  /**
   * ATS-score buckets cross-referenced with response rate.
   * Helps the user see whether higher-scoring applications correlate
   * with more interviews. Buckets with zero applications are omitted.
   */
  scoreBuckets: {
    /** "0–25", "26–50", "51–75", "76–100" */
    bucket: string;
    applications: number;
    /** Of those, how many reached INTERVIEW or ACCEPTED. */
    interviews: number;
    interviewRate: number; // 0–100
  }[];

  /**
   * Per-template breakdown — top 5 by usage. Lets the user spot which
   * templates are correlated with better outcomes.
   */
  topTemplates: {
    templateId: string;
    templateName: string;
    usageCount: number;
    interviewRate: number; // 0–100
  }[];
}
