/**
 * Frontend error code mappings and user-friendly messages (de/en)
 * 
 * These messages are used as fallbacks when the backend doesn't provide
 * a user-friendly message, or for client-side errors (network, etc.)
 */

import { getActiveLocale } from './i18n-runtime';
import type { Locale } from '@/i18n/config';

export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  USER_EXISTS = 'USER_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  REFRESH_TOKEN_NOT_FOUND = 'REFRESH_TOKEN_NOT_FOUND',
  INVALID_TOKEN_TYPE = 'INVALID_TOKEN_TYPE',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Profile errors
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  PROFILE_INCOMPLETE = 'PROFILE_INCOMPLETE',
  PROFILE_UPDATE_FAILED = 'PROFILE_UPDATE_FAILED',
  
  // Job posting errors
  JOB_POSTING_NOT_FOUND = 'JOB_POSTING_NOT_FOUND',
  JOB_POSTING_PARSE_FAILED = 'JOB_POSTING_PARSE_FAILED',
  
  // Application errors
  APPLICATION_NOT_FOUND = 'APPLICATION_NOT_FOUND',
  APPLICATION_DUPLICATE = 'APPLICATION_DUPLICATE',
  APPLICATION_GENERATING = 'APPLICATION_GENERATING',
  APPLICATION_GENERATION_FAILED = 'APPLICATION_GENERATION_FAILED',
  APPLICATION_NOT_FAILED = 'APPLICATION_NOT_FAILED',
  APPLICATION_NO_RESUME = 'APPLICATION_NO_RESUME',
  APPLICATION_NO_JOB = 'APPLICATION_NO_JOB',
  APPLICATION_RESUME_CORRUPTED = 'APPLICATION_RESUME_CORRUPTED',
  
  // LLM errors
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_PARSE_ERROR = 'LLM_PARSE_ERROR',
  LLM_INVALID_RESPONSE = 'LLM_INVALID_RESPONSE',

  // AI prompt guardrails (issue #520)
  AI_PROMPT_TOO_LONG = 'AI_PROMPT_TOO_LONG',
  
  // File upload errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  
  // Password errors
  PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',
  PASSWORD_SAME_AS_CURRENT = 'PASSWORD_SAME_AS_CURRENT',
  PASSWORD_CHANGE_OAUTH = 'PASSWORD_CHANGE_OAUTH',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Client-side errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Generic errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
}

/**
 * User-friendly error messages for frontend display, keyed by error code
 * and locale. These provide context and actionable next steps for users.
 * Kept as an in-code bilingual dictionary (not in messages/*.json) so the
 * client bundle only carries these strings — see lib/i18n-runtime.ts.
 */
export const ERROR_MESSAGES: Record<Locale, Record<string, string>> = {
  de: {
    // Authentication errors
    [ErrorCode.INVALID_CREDENTIALS]: 'E-Mail oder Passwort ist falsch. Bitte versuche es erneut.',
    [ErrorCode.UNAUTHORIZED]: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
    [ErrorCode.USER_EXISTS]: 'Ein Konto mit dieser E-Mail existiert bereits. Bitte melde dich an.',
    [ErrorCode.USER_NOT_FOUND]: 'Benutzer nicht gefunden. Bitte melde dich erneut an.',
    [ErrorCode.REFRESH_TOKEN_INVALID]: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
    [ErrorCode.REFRESH_TOKEN_NOT_FOUND]: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
    [ErrorCode.INVALID_TOKEN_TYPE]: 'Deine Anmeldung ist ungültig. Bitte melde dich erneut an.',
    [ErrorCode.SESSION_EXPIRED]: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',

    // Profile errors
    [ErrorCode.PROFILE_NOT_FOUND]: 'Bitte erstelle zuerst dein Profil im Profil-Bereich.',
    [ErrorCode.PROFILE_INCOMPLETE]: 'Bitte vervollständige dein Profil, bevor du fortfährst.',
    [ErrorCode.PROFILE_UPDATE_FAILED]: 'Profil konnte nicht aktualisiert werden. Bitte versuche es erneut.',

    // Job posting errors
    [ErrorCode.JOB_POSTING_NOT_FOUND]: 'Stellenanzeige nicht gefunden. Möglicherweise wurde sie gelöscht.',
    [ErrorCode.JOB_POSTING_PARSE_FAILED]: 'Die Stellenanzeige konnte nicht verarbeitet werden. Bitte überprüfe das Format.',

    // Application errors
    [ErrorCode.APPLICATION_NOT_FOUND]: 'Bewerbung nicht gefunden. Möglicherweise wurde sie gelöscht.',
    [ErrorCode.APPLICATION_DUPLICATE]: 'Du hast bereits eine Bewerbung für diese Stelle erstellt. Bitte bearbeite die bestehende Bewerbung oder lösche sie zuerst.',
    [ErrorCode.APPLICATION_GENERATING]: 'Dokumente werden aktuell erstellt. Bitte warte einen Moment.',
    [ErrorCode.APPLICATION_GENERATION_FAILED]: 'Die Bewerbung konnte nicht erstellt werden. Bitte versuche es erneut.',
    [ErrorCode.APPLICATION_NOT_FAILED]: 'Nur fehlgeschlagene Bewerbungen können erneut generiert werden.',
    [ErrorCode.APPLICATION_NO_RESUME]: 'Bitte speichere zuerst deinen Lebenslauf.',
    [ErrorCode.APPLICATION_NO_JOB]: 'Keine Stellenanzeige verknüpft. Bitte wähle eine Stelle aus.',
    [ErrorCode.APPLICATION_RESUME_CORRUPTED]: 'Gespeicherter Lebenslauf ist beschädigt. Bitte aktualisiere ihn.',

    // LLM errors
    [ErrorCode.LLM_TIMEOUT]: 'Die KI-Generierung dauert länger als erwartet. Deine Bewerbung wird im Hintergrund erstellt.',
    [ErrorCode.LLM_PARSE_ERROR]: 'Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut.',
    [ErrorCode.LLM_INVALID_RESPONSE]: 'Die KI hat eine ungültige Antwort geliefert. Bitte versuche es erneut.',

    // AI prompt guardrails (issue #520)
    [ErrorCode.AI_PROMPT_TOO_LONG]: 'Deine Eingabe für die KI ist zu lang. Bitte kürze den Text und versuche es erneut.',

    // File upload errors
    [ErrorCode.FILE_TOO_LARGE]: 'Die Datei ist zu groß. Maximal 10 MB sind erlaubt.',
    [ErrorCode.FILE_INVALID_TYPE]: 'Ungültiger Dateityp. Nur PDF-, Word- und Textdateien sind erlaubt.',

    // Password errors
    [ErrorCode.PASSWORD_INCORRECT]: 'Das aktuelle Passwort ist falsch. Bitte versuche es erneut.',
    [ErrorCode.PASSWORD_SAME_AS_CURRENT]: 'Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.',
    [ErrorCode.PASSWORD_CHANGE_OAUTH]: 'Passwort kann für Konten mit externem Login (z.B. Google) nicht geändert werden.',

    // Rate limiting
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Zu viele Aktionen. Bitte warte einen Moment und versuche es erneut.',

    // Client-side errors
    [ErrorCode.NETWORK_ERROR]: 'Keine Internetverbindung. Bitte überprüfe deine Verbindung.',

    // Generic errors
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
    [ErrorCode.VALIDATION_ERROR]: 'Ungültige Eingabe. Bitte überprüfe deine Daten.',
    [ErrorCode.NOT_FOUND]: 'Der angeforderte Inhalt wurde nicht gefunden.',
    [ErrorCode.FORBIDDEN]: 'Zugriff verweigert. Du hast keine Berechtigung für diese Aktion.',

    // CSRF errors (from backend)
    EBADCSRFTOKEN: 'Die Sicherheitsüberprüfung ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.',
  },
  en: {
    // Authentication errors
    [ErrorCode.INVALID_CREDENTIALS]: 'Incorrect email or password. Please try again.',
    [ErrorCode.UNAUTHORIZED]: 'Your session has expired. Please sign in again.',
    [ErrorCode.USER_EXISTS]: 'An account with this email already exists. Please sign in.',
    [ErrorCode.USER_NOT_FOUND]: 'User not found. Please sign in again.',
    [ErrorCode.REFRESH_TOKEN_INVALID]: 'Your session has expired. Please sign in again.',
    [ErrorCode.REFRESH_TOKEN_NOT_FOUND]: 'Your session has expired. Please sign in again.',
    [ErrorCode.INVALID_TOKEN_TYPE]: 'Your login is invalid. Please sign in again.',
    [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',

    // Profile errors
    [ErrorCode.PROFILE_NOT_FOUND]: 'Please create your profile in the profile section first.',
    [ErrorCode.PROFILE_INCOMPLETE]: 'Please complete your profile before continuing.',
    [ErrorCode.PROFILE_UPDATE_FAILED]: 'Your profile could not be updated. Please try again.',

    // Job posting errors
    [ErrorCode.JOB_POSTING_NOT_FOUND]: 'Job posting not found. It may have been deleted.',
    [ErrorCode.JOB_POSTING_PARSE_FAILED]: 'The job posting could not be processed. Please check the format.',

    // Application errors
    [ErrorCode.APPLICATION_NOT_FOUND]: 'Application not found. It may have been deleted.',
    [ErrorCode.APPLICATION_DUPLICATE]: 'You have already created an application for this job. Please edit the existing application or delete it first.',
    [ErrorCode.APPLICATION_GENERATING]: 'Your documents are currently being generated. Please wait a moment.',
    [ErrorCode.APPLICATION_GENERATION_FAILED]: 'The application could not be generated. Please try again.',
    [ErrorCode.APPLICATION_NOT_FAILED]: 'Only failed applications can be regenerated.',
    [ErrorCode.APPLICATION_NO_RESUME]: 'Please save your résumé first.',
    [ErrorCode.APPLICATION_NO_JOB]: 'No job posting linked. Please select a job.',
    [ErrorCode.APPLICATION_RESUME_CORRUPTED]: 'The stored résumé is corrupted. Please update it.',

    // LLM errors
    [ErrorCode.LLM_TIMEOUT]: 'The AI generation is taking longer than expected. Your application is being generated in the background.',
    [ErrorCode.LLM_PARSE_ERROR]: 'The AI response could not be processed. Please try again.',
    [ErrorCode.LLM_INVALID_RESPONSE]: 'The AI returned an invalid response. Please try again.',

    // AI prompt guardrails (issue #520)
    [ErrorCode.AI_PROMPT_TOO_LONG]: 'Your input for the AI is too long. Please shorten the text and try again.',

    // File upload errors
    [ErrorCode.FILE_TOO_LARGE]: 'The file is too large. The maximum size is 10 MB.',
    [ErrorCode.FILE_INVALID_TYPE]: 'Invalid file type. Only PDF, Word, and text files are allowed.',

    // Password errors
    [ErrorCode.PASSWORD_INCORRECT]: 'The current password is incorrect. Please try again.',
    [ErrorCode.PASSWORD_SAME_AS_CURRENT]: 'The new password must be different from the current password.',
    [ErrorCode.PASSWORD_CHANGE_OAUTH]: 'The password cannot be changed for accounts using an external login (e.g. Google).',

    // Rate limiting
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many actions. Please wait a moment and try again.',

    // Client-side errors
    [ErrorCode.NETWORK_ERROR]: 'No internet connection. Please check your connection.',

    // Generic errors
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Something went wrong. Please try again later.',
    [ErrorCode.VALIDATION_ERROR]: 'Invalid input. Please check your data.',
    [ErrorCode.NOT_FOUND]: 'The requested content was not found.',
    [ErrorCode.FORBIDDEN]: 'Access denied. You do not have permission to perform this action.',

    // CSRF errors (from backend)
    EBADCSRFTOKEN: 'The security check failed. Please reload the page and try again.',
  },
};

/**
 * Get user-friendly error message for a given error code
 * Falls back to a generic message if code is not found
 *
 * @param code - Error code from backend or ErrorCode enum
 * @param fallbackMessage - Optional custom fallback message
 * @returns User-friendly error message in the active UI language
 */
export function getErrorMessage(
  code?: string | null,
  fallbackMessage?: string
): string {
  const messages = ERROR_MESSAGES[getActiveLocale()];

  if (!code) {
    return fallbackMessage || messages[ErrorCode.INTERNAL_SERVER_ERROR];
  }

  return messages[code] || fallbackMessage || messages[ErrorCode.INTERNAL_SERVER_ERROR];
}

/**
 * Format validation errors into a user-friendly message
 * 
 * @param errors - Validation error array from backend
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: string[] | string): string {
  if (typeof errors === 'string') {
    return errors;
  }
  
  if (Array.isArray(errors) && errors.length > 0) {
    // Join multiple validation errors with line breaks
    return errors.join('\n');
  }
  
  return ERROR_MESSAGES[getActiveLocale()][ErrorCode.VALIDATION_ERROR];
}
