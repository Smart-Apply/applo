import { Injectable, Logger } from '@nestjs/common';
import { EmailClassification, LlmFeature } from '../generated/prisma/client';
import { LLMService } from '../llm/llm.service';

export interface ClassifierInput {
  subject: string;
  fromAddress: string;
  bodyText: string;
}

export interface ClassifierResult {
  classification: EmailClassification;
  /** 0..1 — only changes drive status updates when ≥ MIN_CONFIDENCE_FOR_STATUS_CHANGE. */
  confidence: number;
  /** Mapping from classification → user-facing tracking status. Null for OTHER. */
  suggestedStatus:
    | 'APPLIED'
    | 'INTERVIEW'
    | 'ACCEPTED'
    | 'REJECTED'
    | null;
  /** One short phrase identifying why we picked this label. Persisted in audit log. */
  reason: string;
  /** Model identifier (so we can re-classify when we change models). */
  model: string;
}

/**
 * Threshold below which we record the classification but DO NOT change the
 * application status. Tuned conservatively — false-positive status changes
 * are much worse than missed updates (the user can always edit manually).
 */
export const MIN_CONFIDENCE_FOR_STATUS_CHANGE = 0.75;

/**
 * Hard cap on how much of an email body is transmitted to the LLM provider
 * (Art. 5(1)(c) DSGVO, data minimisation).
 *
 * The classifier only has to recognise the standard ATS auto-replies, which
 * declare themselves in the opening lines; the rest of a message is body
 * content the user never agreed to have processed by a third party. Enforced
 * here rather than only at the caller so no future call site can widen it by
 * accident — the provider fetch passes the same value as its own cap.
 */
export const CLASSIFIER_BODY_MAX_CHARS = 1200;

/**
 * Classifies an inbound email using the LLM. Inherits the opossum circuit
 * breaker that wraps `LLMService.generateText`, so spikes in classifier
 * latency don't poison the rest of the app.
 */
@Injectable()
export class EmailClassifierService {
  private readonly logger = new Logger(EmailClassifierService.name);

  constructor(private readonly llm: LLMService) {}

  async classify(input: ClassifierInput): Promise<ClassifierResult> {
    // Keep the prompt compact — the classifier is called once per inbound
    // email, we want it cheap, and every character of body text sent here is
    // personal data handed to the LLM provider. Subject, sender and a short
    // excerpt are enough to recognise the standard ATS auto-replies.
    const prompt = `You are an email-classification assistant for a job-application tracker.
Classify the following email into EXACTLY ONE of these categories and return STRICT JSON.

Categories (with the application-status they imply):
- APPLIED_CONFIRMATION  -> APPLIED      ("We received your application", auto-reply from a portal/ATS)
- INTERVIEW_INVITE      -> INTERVIEW    (invitation to phone screen, video, or onsite interview; assessment invite)
- OFFER                 -> ACCEPTED     (job offer or contract being sent)
- REJECTION             -> REJECTED     ("we decided to move forward with another candidate")
- REQUEST_FOR_INFO      -> null         (recruiter asks for more documents / answers; status stays as-is)
- OTHER                 -> null         (newsletter, calendar invite, marketing, anything else)

Output JSON shape (no markdown fences, no commentary):
{
  "classification": "<one of the 6 labels above>",
  "confidence": <number 0..1>,
  "reason": "<one short phrase, max 80 chars, in the same language as the email>"
}

Be conservative: when in doubt return OTHER with low confidence. Never invent
information. The user lives in DACH so most emails are German; treat German
phrases ("Wir freuen uns, Sie zu einem Gespräch einzuladen", "Wir haben uns
für einen anderen Kandidaten entschieden") as authoritative.

EMAIL
From: ${input.fromAddress}
Subject: ${input.subject}
Body (excerpt):
${input.bodyText.slice(0, CLASSIFIER_BODY_MAX_CHARS)}
`;

    const model = 'classifier-v1';

    let raw: string;
    try {
      raw = await this.llm.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 150,
        systemMessage:
          'You return ONLY a single valid JSON object matching the requested shape. No prose.',
        feature: LlmFeature.MAILBOX_CLASSIFICATION,
      });
    } catch (err) {
      // Circuit-breaker open / timeout / provider error. Fall back to OTHER
      // so the pipeline can still persist an audit row, but never mutate
      // status when we can't trust the input.
      this.logger.warn(`Classifier LLM call failed: ${(err as Error).message}`);
      return this.fallback('classifier-error', model);
    }

    const parsed = this.tryParse(raw);
    if (!parsed) {
      this.logger.warn(`Classifier returned non-JSON: ${raw.slice(0, 200)}`);
      return this.fallback('classifier-malformed', model);
    }

    const classification = parsed.classification as EmailClassification;
    const allowed: EmailClassification[] = [
      'APPLIED_CONFIRMATION',
      'INTERVIEW_INVITE',
      'OFFER',
      'REJECTION',
      'REQUEST_FOR_INFO',
      'OTHER',
    ];
    if (!allowed.includes(classification)) {
      return this.fallback(`classifier-unknown-label:${parsed.classification}`, model);
    }

    const confidence = clamp01(parsed.confidence);
    return {
      classification,
      confidence,
      suggestedStatus: STATUS_MAP[classification],
      reason: (parsed.reason ?? '').toString().slice(0, 200),
      model,
    };
  }

  private tryParse(
    raw: string,
  ): { classification: string; confidence: number; reason?: string } | null {
    // LLMs occasionally wrap JSON in ```json fences despite instructions.
    const stripped = raw
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    try {
      const obj = JSON.parse(stripped);
      if (typeof obj?.classification !== 'string') return null;
      if (typeof obj?.confidence !== 'number') return null;
      return obj;
    } catch {
      return null;
    }
  }

  private fallback(reason: string, model: string): ClassifierResult {
    return {
      classification: 'OTHER',
      confidence: 0,
      suggestedStatus: null,
      reason,
      model,
    };
  }
}

const STATUS_MAP: Record<EmailClassification, ClassifierResult['suggestedStatus']> = {
  APPLIED_CONFIRMATION: 'APPLIED',
  INTERVIEW_INVITE: 'INTERVIEW',
  OFFER: 'ACCEPTED',
  REJECTION: 'REJECTED',
  REQUEST_FOR_INFO: null,
  OTHER: null,
};

function clamp01(n: unknown): number {
  const x = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
