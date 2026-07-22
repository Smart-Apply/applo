/**
 * Application domain constants
 * Must match backend constants
 */

export const APPLICATION_TITLE_MAX_LENGTH = 60;
export const APPLICATION_TITLE_MIN_LENGTH = 3;
export const APPLICATION_ID_DISPLAY_LENGTH = 8;

/**
 * Loading messages for dynamic imports
 * Centralized to maintain consistency across the application.
 * Locale-aware at call time (see lib/i18n-runtime.ts).
 */
import { pick } from './i18n-runtime';

const LOADING_MESSAGE_DICT = {
  PDF_PREVIEW: { de: 'Lädt PDF-Vorschau...', en: 'Loading PDF preview...' },
  EDITOR: { de: 'Lädt Editor...', en: 'Loading editor...' },
  FORM: { de: 'Lädt Formular...', en: 'Loading form...' },
} as const;

export const LOADING_MESSAGES = {
  get PDF_PREVIEW() {
    return pick(LOADING_MESSAGE_DICT.PDF_PREVIEW);
  },
  get EDITOR() {
    return pick(LOADING_MESSAGE_DICT.EDITOR);
  },
  get FORM() {
    return pick(LOADING_MESSAGE_DICT.FORM);
  },
} as const;

