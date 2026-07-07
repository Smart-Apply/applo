import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  RealtimeVoice,
  StartVoiceSessionPayload,
  VoiceInterviewConfig,
  VoiceSessionDescriptor,
} from '@applo/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import { InterviewsService } from '../interviews.service';
import { InterviewSessionStatus, Prisma } from '../../generated/prisma/client';
import { REALTIME_VOICES, VOICE_PROVIDER, VoiceProvider } from './voice-provider.interface';

const AZURE_REALTIME_MAX_SESSION_SECONDS = 60 * 60; // Azure caps a realtime session at 60 min.

type CandidateProfile = Prisma.ProfileGetPayload<{
  include: {
    skills: true;
    experiences: true;
    education: true;
    projects: true;
    certificates: true;
    languages: true;
  };
}>;

/**
 * Voice-interview orchestration: availability/quota reporting and minting
 * ephemeral realtime sessions. Transcript persistence + scoring lives in
 * `InterviewsService.finalizeVoiceSession` (it mutates questions/feedback like
 * the text flow). The standing Azure key never leaves the server — only the
 * short-lived token returned here reaches the browser.
 */
@Injectable()
export class VoiceInterviewService {
  private readonly logger = new Logger(VoiceInterviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly interviews: InterviewsService,
    @Inject(VOICE_PROVIDER) private readonly provider: VoiceProvider,
  ) {}

  /** Availability + per-tier voice budget for the current user. */
  async getConfig(userId: string): Promise<VoiceInterviewConfig> {
    const { remainingSeconds, capSeconds } = await this.getBudget(userId);
    return {
      available: this.provider.isAvailable(),
      defaultVoice: this.resolveVoice(),
      voices: REALTIME_VOICES,
      maxSessionMinutes: this.config.voiceInterviewMaxSessionMinutes,
      minutesPerMonth: this.config.voiceInterviewMinutesPerMonth,
      remainingMinutes: capSeconds < 0 ? -1 : Math.floor(remainingSeconds / 60),
    };
  }

  /** Mint an ephemeral realtime session for an in-progress interview. */
  async createSession(
    userId: string,
    sessionId: string,
    payload: StartVoiceSessionPayload,
  ): Promise<VoiceSessionDescriptor> {
    // Ownership + existence (throws 404/403 as appropriate).
    const session = await this.interviews.getSession(userId, sessionId);

    if (session.status !== InterviewSessionStatus.IN_PROGRESS) {
      throw new ServiceUnavailableException('Interview-Session ist nicht mehr aktiv.');
    }
    if (!this.provider.isAvailable()) {
      throw new ServiceUnavailableException('Sprach-Interview ist derzeit nicht verfügbar.');
    }

    const { remainingSeconds, capSeconds } = await this.getBudget(userId);
    if (capSeconds >= 0 && remainingSeconds <= 0) {
      throw new ForbiddenException({
        message: 'Dein monatliches Sprach-Kontingent ist aufgebraucht.',
        error: 'VOICE_LIMIT_EXCEEDED',
        remaining: 0,
        limit: this.config.voiceInterviewMinutesPerMonth,
        upgradeUrl: '/pricing',
      });
    }

    const voice = this.resolveVoice(payload?.voice);
    const model = this.config.azureOpenAIRealtimeDeployment;
    const hardSeconds = this.config.voiceInterviewMaxSessionMinutes * 60;
    const requestedSeconds = payload?.durationMinutes
      ? payload.durationMinutes * 60
      : hardSeconds;
    const maxSessionSeconds =
      capSeconds < 0
        ? Math.min(requestedSeconds, hardSeconds, AZURE_REALTIME_MAX_SESSION_SECONDS)
        : Math.min(requestedSeconds, hardSeconds, remainingSeconds, AZURE_REALTIME_MAX_SESSION_SECONDS);

    // The instructions must never promise more time than was actually minted
    // (budget/hard-cap clamp), so derive the stated minutes from the ceiling.
    const grantedMinutes = Math.max(1, Math.floor(maxSessionSeconds / 60));
    const instructions = await this.buildInstructions(userId, session, grantedMinutes);
    const minted = await this.provider.createSession({
      sessionId,
      instructions,
      model,
      voice,
      maxSessionSeconds,
    });

    // Persist the mode + voice choice so the session detail reflects it even
    // before the transcript is finalized.
    await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: { mode: 'VOICE', voice, realtimeModel: model },
    });

    return {
      token: minted.token,
      expiresAt: minted.expiresAt.toISOString(),
      webrtcUrl: minted.webrtcUrl,
      model: minted.model,
      voice: minted.voice,
      maxSessionSeconds,
      remainingMinutes: capSeconds < 0 ? -1 : Math.floor(remainingSeconds / 60),
    };
  }

  /**
   * Voice seconds consumed this billing period vs. the tier cap. Computed on
   * the fly from `InterviewSession.voiceDurationSeconds` — no separate counter.
   */
  private async getBudget(
    userId: string,
  ): Promise<{ usedSeconds: number; capSeconds: number; remainingSeconds: number }> {
    const cap = this.config.voiceInterviewMinutesPerMonth;
    if (cap < 0) {
      return { usedSeconds: 0, capSeconds: -1, remainingSeconds: Number.MAX_SAFE_INTEGER };
    }

    const periodStart = await this.getPeriodStart(userId);
    const aggregate = await this.prisma.interviewSession.aggregate({
      _sum: { voiceDurationSeconds: true },
      where: { userId, createdAt: { gte: periodStart } },
    });

    const usedSeconds = aggregate._sum.voiceDurationSeconds ?? 0;
    const capSeconds = cap * 60;
    return { usedSeconds, capSeconds, remainingSeconds: Math.max(0, capSeconds - usedSeconds) };
  }

  private async getPeriodStart(userId: string): Promise<Date> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { currentPeriodStart: true },
    });
    if (subscription?.currentPeriodStart) {
      return subscription.currentPeriodStart;
    }
    const fallback = new Date();
    fallback.setDate(fallback.getDate() - 30);
    return fallback;
  }

  private resolveVoice(requested?: RealtimeVoice): RealtimeVoice {
    if (requested && REALTIME_VOICES.includes(requested)) {
      return requested;
    }
    const configured = this.config.azureOpenAIRealtimeVoice as RealtimeVoice;
    return REALTIME_VOICES.includes(configured) ? configured : 'alloy';
  }

  /** Build the interviewer system prompt (kept private from the browser). */
  private async buildInstructions(
    userId: string,
    session: {
      jobTitle: string | null;
      company: string | null;
      industry: string | null;
      jobDescription: string | null;
      difficulty: string;
      type: string;
      language: string;
    },
    durationMinutes: number,
  ): Promise<string> {
    const [profile, user] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { userId },
        include: {
          skills: { take: 12 },
          experiences: { orderBy: { startDate: 'desc' }, take: 4 },
          education: { orderBy: { startYear: 'desc' }, take: 4 },
          projects: { take: 3 },
          certificates: { orderBy: { issueDate: 'desc' }, take: 5 },
          languages: true,
        },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }),
    ]);

    const isGerman = session.language !== 'en';
    const jobTitle = session.jobTitle ?? (isGerman ? 'die ausgeschriebene Position' : 'the role');
    const difficulty = this.difficultyLabel(session.difficulty, isGerman);
    const type = this.typeLabel(session.type, isGerman);
    const firstName = user?.firstName?.trim() || null;
    const interviewerName = isGerman ? 'Alexandra Berger' : 'Alex Bennett';
    const company = session.company ?? 'Meridian Group';
    const jobDescription = this.truncate(this.stripHtml(session.jobDescription), 800);
    const dossier = profile ? this.buildCandidateDossier(profile, isGerman) : '';

    if (isGerman) {
      return [
        `Du bist ${interviewerName}, erfahrene Interviewerin bei ${company}, und führst ein etwa ${durationMinutes}-minütiges ${difficulty} ${type}-Übungs-Vorstellungsgespräch für „${jobTitle}“${session.industry ? ` in der Branche ${session.industry}` : ''}. Das Gespräch findet auf Deutsch statt.`,
        `Eröffne das Gespräch wie in einem echten Interview: Begrüße ${firstName ? `${firstName} persönlich mit Vornamen` : 'die Kandidatin/den Kandidaten'}, stelle dich mit Namen und Rolle bei ${company} vor, umreiße kurz den Ablauf (ein Übungsgespräch von etwa ${durationMinutes} Minuten zu Werdegang und Zielposition) und frage, ob es losgehen kann.`,
        'Stelle nach der Begrüßung genau EINE kurze, lockere Aufwärmfrage, bevor du zur ersten inhaltlichen Frage übergehst.',
        `Stelle jeweils EINE Frage, höre aktiv zu, nimm in Überleitungen kurz Bezug auf das zuvor Gesagte und stelle höchstens EINE kurze Nachfrage pro Antwort, wenn sie Mehrwert bringt. Teile dir die etwa ${durationMinutes} Minuten gut ein: Hetze nicht, und stelle so lange substanzielle Fragen, wie die Zeit reicht.`,
        'Du hast keine eigene Uhr. Du erhältst während des Gesprächs Hinweise, wenn noch etwa eine Minute verbleibt und wenn die Zeit um ist. Beim Hinweis auf die letzte Minute: Schließe das aktuelle Thema ab und stelle höchstens EINE letzte Frage. Beim Hinweis, dass die Zeit um ist: Bedanke dich kurz und warm, verabschiede dich und stelle keine weiteren Fragen.',
        dossier
          ? 'Mische Fragen zur Zielposition mit konkreten Fragen zum Lebenslauf: Beziehe dich auf echte Stationen, Projekte, Erfolge und Kenntnisse aus dem Dossier unten (z. B. „Erzählen Sie mir von Ihrer Zeit als … bei …“, „Sie nennen … als Erfolg – wie sind Sie dabei vorgegangen?“, „Sie schätzen sich in … als … ein – geben Sie mir ein konkretes Beispiel.“).'
          : 'Stelle fundierte Fragen zu Werdegang, Motivation und den für die Position relevanten Kompetenzen.',
        'Halte deine Beiträge gesprächig und kurz (1–3 Sätze). Bleibe durchgehend in der Rolle der Interviewerin und gib während des Gesprächs KEIN bewertendes Feedback – die Auswertung erfolgt am Ende.',
        'Beende das Gespräch professionell: Frage zum Abschluss, ob es noch Fragen an dich oder das Unternehmen gibt (sofern die Zeit es erlaubt), bedanke dich für das Gespräch und verabschiede dich freundlich.',
        jobDescription ? `Stellenbeschreibung (Auszug): ${jobDescription}` : '',
        dossier ? `Dossier – Lebenslauf der Kandidatin/des Kandidaten:\n${dossier}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    return [
      `You are ${interviewerName}, an experienced interviewer at ${company}, conducting a roughly ${durationMinutes}-minute ${difficulty} ${type} practice interview for "${jobTitle}"${session.industry ? ` in the ${session.industry} industry` : ''}. The conversation is held in English.`,
      `Open like a real interview: greet ${firstName ? `${firstName} by first name` : 'the candidate'}, introduce yourself with your name and role at ${company}, briefly outline the agenda (a practice interview of about ${durationMinutes} minutes covering their background and the target role), and ask if they are ready to begin.`,
      'After the greeting, ask exactly ONE short, casual warm-up question before moving on to the first substantive question.',
      `Ask ONE question at a time, listen actively, briefly reference what was just said when transitioning to the next topic, and ask at most ONE short follow-up per answer when it adds value. Pace yourself across the roughly ${durationMinutes} minutes: don't rush, and keep asking substantive questions for as long as time allows.`,
      'You have no clock of your own. During the conversation you will be told when about one minute remains and when time is up. When told about the final minute: finish the current topic and ask at most ONE final question. When told time is up: give brief, warm thanks, say goodbye, and ask no further questions.',
      dossier
        ? 'Blend questions about the target role with concrete questions about the CV: reference real positions, projects, achievements, and skills from the dossier below (e.g. "Walk me through your time as … at …", "You list … as an achievement — how did you approach it?", "You rate yourself … in … — give me a concrete example.").'
        : 'Ask well-founded questions about the candidate’s background, motivation, and the competencies relevant to the role.',
      'Keep your turns conversational and short (1–3 sentences). Stay in the interviewer role throughout and do NOT give evaluative feedback during the conversation — the assessment happens at the end.',
      'Close professionally: ask whether the candidate has any questions for you or the company (time permitting), thank them for the conversation, and say a friendly goodbye.',
      jobDescription ? `Job description (excerpt): ${jobDescription}` : '',
      dossier ? `Dossier — candidate CV:\n${dossier}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Compact plain-text CV summary injected into the realtime instructions.
   * Bounded deliberately: the instructions are re-sent for every session, so
   * every extra token costs latency and money.
   */
  private buildCandidateDossier(profile: CandidateProfile, isGerman: boolean): string {
    const sections: string[] = [];

    const summary = this.stripHtml(profile.summary);
    if (summary) {
      sections.push(`${isGerman ? 'Kurzprofil' : 'Summary'}: ${this.truncate(summary, 400)}`);
    }

    const experiences = profile.experiences.map((exp) => {
      const span = this.yearSpan(exp.startDate, exp.endDate, exp.isCurrent, isGerman);
      const head = [`${exp.title}, ${exp.company}`, span ? `(${span})` : ''].filter(Boolean).join(' ');
      const description = this.truncate(this.stripHtml(exp.description), 200);
      const achievements = exp.achievements
        .map((item) => this.truncate(this.stripHtml(item), 140))
        .filter(Boolean)
        .slice(0, 3)
        .join('; ');
      return [
        `- ${head}`,
        description ? `  ${description}` : '',
        achievements ? `  ${isGerman ? 'Erfolge' : 'Achievements'}: ${achievements}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    });
    if (experiences.length) {
      sections.push(`${isGerman ? 'Berufserfahrung' : 'Work experience'}:\n${experiences.join('\n')}`);
    }

    const education = profile.education.map((edu) => {
      const span = this.yearSpan(edu.startYear, edu.endYear, false, isGerman);
      const field = edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : '';
      return `- ${edu.degree}${field} – ${edu.institution}${span ? ` (${span})` : ''}`;
    });
    if (education.length) {
      sections.push(`${isGerman ? 'Ausbildung' : 'Education'}:\n${education.join('\n')}`);
    }

    const projects = profile.projects.map((project) => {
      const tech = project.technologies.filter((item) => item.trim()).slice(0, 6).join(', ');
      const description = this.truncate(this.stripHtml(project.description), 200);
      const highlights = project.highlights
        .map((item) => this.truncate(this.stripHtml(item), 140))
        .filter(Boolean)
        .slice(0, 2)
        .join('; ');
      return [
        `- ${project.name}${tech ? ` (${tech})` : ''}`,
        description ? `  ${description}` : '',
        highlights ? `  Highlights: ${highlights}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    });
    if (projects.length) {
      sections.push(`${isGerman ? 'Projekte' : 'Projects'}:\n${projects.join('\n')}`);
    }

    const skills = profile.skills
      .map((skill) => {
        const level = this.skillLevelLabel(skill.level, isGerman);
        return level ? `${skill.name} (${level})` : skill.name;
      })
      .join(', ');
    if (skills) {
      sections.push(`${isGerman ? 'Kenntnisse' : 'Skills'}: ${skills}`);
    }

    const certificates = profile.certificates
      .map((cert) => {
        const year = cert.issueDate?.getFullYear();
        return `${cert.name} (${cert.issuer}${year ? `, ${year}` : ''})`;
      })
      .join('; ');
    if (certificates) {
      sections.push(`${isGerman ? 'Zertifikate' : 'Certificates'}: ${certificates}`);
    }

    const languages = profile.languages
      .map((lang) => {
        const level = this.languageLevelLabel(lang.level, isGerman);
        return level ? `${lang.name} (${level})` : lang.name;
      })
      .join(', ');
    if (languages) {
      sections.push(`${isGerman ? 'Sprachen' : 'Languages'}: ${languages}`);
    }

    return sections.join('\n');
  }

  // Same HTML→text approach as GroundingValidatorService.
  private stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}…`;
  }

  private yearSpan(
    start: Date | null,
    end: Date | null,
    isCurrent: boolean,
    isGerman: boolean,
  ): string {
    const from = start?.getFullYear();
    const to = end?.getFullYear();
    if (from && (isCurrent || !to)) return isGerman ? `seit ${from}` : `since ${from}`;
    if (from && to) return from === to ? `${from}` : `${from}–${to}`;
    if (to) return isGerman ? `bis ${to}` : `until ${to}`;
    return '';
  }

  private skillLevelLabel(level: string | null, isGerman: boolean): string | null {
    if (!level) return null;
    const map: Record<string, [string, string]> = {
      BEGINNER: ['Grundkenntnisse', 'beginner'],
      INTERMEDIATE: ['fortgeschritten', 'intermediate'],
      ADVANCED: ['sehr gut', 'advanced'],
      EXPERT: ['Expertenniveau', 'expert'],
    };
    const entry = map[level];
    return entry ? (isGerman ? entry[0] : entry[1]) : null;
  }

  private languageLevelLabel(level: string | null, isGerman: boolean): string | null {
    if (!level) return null;
    const map: Record<string, [string, string]> = {
      NATIVE: ['Muttersprache', 'native'],
      FLUENT: ['fließend', 'fluent'],
      ADVANCED: ['fortgeschritten', 'advanced'],
      INTERMEDIATE: ['gut', 'intermediate'],
      BASIC: ['Grundkenntnisse', 'basic'],
    };
    const entry = map[level];
    return entry ? (isGerman ? entry[0] : entry[1]) : null;
  }

  private difficultyLabel(difficulty: string, isGerman: boolean): string {
    const map: Record<string, [string, string]> = {
      EASY: ['einsteigerfreundliches', 'entry-level'],
      MEDIUM: ['anspruchsvolles', 'mid-level'],
      HARD: ['herausforderndes', 'senior-level'],
    };
    const [de, en] = map[difficulty] ?? map.MEDIUM;
    return isGerman ? de : en;
  }

  private typeLabel(type: string, isGerman: boolean): string {
    const map: Record<string, [string, string]> = {
      BEHAVIORAL: ['verhaltensbasiertes', 'behavioral'],
      TECHNICAL: ['fachliches', 'technical'],
      CASE_STUDY: ['fallstudienbasiertes', 'case-study'],
      MIXED: ['gemischtes', 'mixed'],
    };
    const [de, en] = map[type] ?? map.MIXED;
    return isGerman ? de : en;
  }
}
