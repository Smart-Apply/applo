/**
 * Application domain constants
 */

export const APPLICATION_TITLE_MAX_LENGTH = 60;
export const APPLICATION_TITLE_MIN_LENGTH = 3;
export const APPLICATION_ID_DISPLAY_LENGTH = 8;
export const ELLIPSIS_LENGTH = 3; // Length of "..." for truncation

/**
 * Shared system-message anchor for the LLM generation calls (cover letter +
 * resume rewrite). Per the GPT-4.1 prompting guide, the static non-negotiables
 * belong in the system turn while the data + detailed task stay in the user
 * turn. This intentionally RESTATES the most important constraints already in
 * the v1 prompts (the "double down" / repetition technique) — it must never
 * contradict them.
 */
export const GENERATION_SYSTEM_ANCHOR = [
  'You are an expert career writer creating ATS-optimized resumes and cover letters',
  'that must work across ALL professions (healthcare, skilled trades, sales, education,',
  'tech, and more — never assume IT). The detailed task is in the user message; the',
  'constraints below are the most important rules, repeated for emphasis:',
  '',
  '- Use ONLY facts present in the provided profile data. Never invent metrics, numbers,',
  '  employers, dates, certifications, or a salary/start date.',
  '- Write every word in the requested target language; it must read as if a native',
  '  speaker wrote it, not a machine translation. Keep established technical terms and',
  '  product names in their original form.',
  '- Sound human and specific. No AI clichés (e.g. "passionate about", "Ich bin',
  '  begeistert"), no hedging/Konjunktiv (e.g. "würde mich freuen", "könnte"), no empty',
  '  superlatives.',
  '- Prefer concrete, profession-appropriate outcomes over generic filler. If a fact is',
  '  missing, omit it gracefully rather than fabricating.',
].join('\n');
