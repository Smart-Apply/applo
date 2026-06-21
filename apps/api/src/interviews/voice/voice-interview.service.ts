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
} from '@smart-apply/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import { InterviewsService } from '../interviews.service';
import { InterviewSessionStatus } from '../../generated/prisma/client';
import { REALTIME_VOICES, VOICE_PROVIDER, VoiceProvider } from './voice-provider.interface';

const AZURE_REALTIME_MAX_SESSION_SECONDS = 60 * 60; // Azure caps a realtime session at 60 min.

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
    const maxSessionSeconds =
      capSeconds < 0
        ? Math.min(hardSeconds, AZURE_REALTIME_MAX_SESSION_SECONDS)
        : Math.min(hardSeconds, remainingSeconds, AZURE_REALTIME_MAX_SESSION_SECONDS);

    const instructions = await this.buildInstructions(userId, session);
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
    session: { jobTitle: string | null; company: string | null; industry: string | null; difficulty: string; type: string; language: string; maxQuestions: number },
  ): Promise<string> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { summary: true },
    });

    const isGerman = session.language !== 'en';
    const jobTitle = session.jobTitle ?? (isGerman ? 'die ausgeschriebene Position' : 'the role');
    const difficulty = this.difficultyLabel(session.difficulty, isGerman);
    const type = this.typeLabel(session.type, isGerman);
    const maxQuestions = session.maxQuestions;
    const summary = profile?.summary?.trim();

    if (isGerman) {
      return [
        `Du bist ein erfahrener, professioneller Interviewer${session.company ? ` bei ${session.company}` : ''} und führst ein ${difficulty} ${type}-Vorstellungsgespräch für „${jobTitle}“${session.industry ? ` in der Branche ${session.industry}` : ''}.`,
        `Führe ein realistisches Gespräch auf Deutsch. Stelle jeweils EINE Frage, höre aufmerksam zu und stelle bei Bedarf eine kurze Nachfrage. Stelle insgesamt etwa ${maxQuestions} Hauptfragen.`,
        'Halte deine Beiträge gesprächig und kurz (1–3 Sätze). Beginne mit einer freundlichen Begrüßung und deiner ersten Frage.',
        'Bleibe durchgehend in der Rolle des Interviewers und gib während des Gesprächs KEIN bewertendes Feedback – die Auswertung erfolgt am Ende.',
        summary ? `Hintergrund der Kandidatin/des Kandidaten: ${summary}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    return [
      `You are an experienced, professional interviewer${session.company ? ` at ${session.company}` : ''} conducting a ${difficulty} ${type} interview for "${jobTitle}"${session.industry ? ` in the ${session.industry} industry` : ''}.`,
      `Hold a realistic conversation in English. Ask ONE question at a time, listen carefully, and add a short follow-up when useful. Ask roughly ${maxQuestions} main questions in total.`,
      'Keep your turns conversational and short (1–3 sentences). Open with a friendly greeting and your first question.',
      'Stay in the interviewer role throughout and do NOT give evaluative feedback during the conversation — the assessment happens at the end.',
      summary ? `Candidate background: ${summary}` : '',
    ]
      .filter(Boolean)
      .join('\n');
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
