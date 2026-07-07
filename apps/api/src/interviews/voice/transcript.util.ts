import type { VoiceTranscriptTurn } from '@applo/shared';

/** A paired interviewer question and the candidate's spoken answer. */
export interface VoiceQAPair {
  question: string;
  answer: string;
}

/**
 * Collapse a flat voice transcript into question/answer pairs so the existing
 * (text-oriented) feedback generator can score a spoken interview.
 *
 * Consecutive interviewer turns are merged into a single question; the next
 * candidate turn closes the pair. Candidate turns with no preceding question
 * (e.g. small talk before the first question) are ignored.
 */
export function pairTranscript(turns: VoiceTranscriptTurn[]): VoiceQAPair[] {
  const pairs: VoiceQAPair[] = [];
  let questionBuffer: string[] = [];

  for (const turn of turns) {
    const text = (turn.text ?? '').trim();
    if (!text) continue;

    if (turn.role === 'interviewer') {
      questionBuffer.push(text);
      continue;
    }

    // candidate turn
    if (questionBuffer.length === 0) continue;
    pairs.push({ question: questionBuffer.join(' '), answer: text });
    questionBuffer = [];
  }

  return pairs;
}
