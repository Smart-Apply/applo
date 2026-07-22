import { z } from 'zod';
import { getActiveLocale } from '@/lib/i18n-runtime';

/**
 * Centralized Zod validation schemas matching backend DTOs
 * 
 * All schemas mirror backend class-validator rules to ensure
 * client-side validation catches errors before API calls.
 * 
 * Error messages are bilingual (de/en): the `m()` helper returns a lazy
 * Zod error function that resolves the active UI language at VALIDATION
 * time (not at module load), so schemas react to locale switches.
 */

/** Lazy bilingual error message for Zod's `error` param. */
const m = (de: string, en: string) => () => (getActiveLocale() === 'de' ? de : en);

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * Password validation regex matching backend requirements
 * Must contain: lowercase, uppercase, number, special char (@$!%*?&#)
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[\w@$!%*?&#]{8,}$/;

const emailInvalid = m('Ungültige E-Mail-Adresse', 'Invalid email address');
const passwordMinLength = m(
  'Passwort muss mindestens 8 Zeichen lang sein',
  'Password must be at least 8 characters long'
);
const passwordComplexity = m(
  'Passwort muss einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen (@$!%*?&#) enthalten',
  'Password must contain an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&#)'
);
const passwordsMismatch = m('Passwörter stimmen nicht überein', 'Passwords do not match');
const urlInvalid = m('Ungültige URL', 'Invalid URL');

export const loginSchema = z.object({
  email: z.string().email({ error: emailInvalid }),
  password: z.string().min(8, { error: passwordMinLength }),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, { error: m('Vorname ist erforderlich', 'First name is required') }).optional(),
  lastName: z.string().min(1, { error: m('Nachname ist erforderlich', 'Last name is required') }).optional(),
  email: z.string().email({ error: emailInvalid }),
  password: z
    .string()
    .min(8, { error: passwordMinLength })
    .regex(PASSWORD_REGEX, { error: passwordComplexity }),
  confirmPassword: z.string(),
  // Closed-beta invite code. Optional in the schema because we don't know
  // at build time whether the gate is enabled — the AuthContainer fetches
  // GET /auth/config and decides at render time whether to require it.
  // Bounded to 64 chars to match the backend DTO.
  inviteCode: z.string().max(64, { error: m('Einladungscode ist zu lang', 'Invite code is too long') }).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  error: passwordsMismatch,
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: m('Aktuelles Passwort ist erforderlich', 'Current password is required') }),
  newPassword: z
    .string()
    .min(8, { error: m('Neues Passwort muss mindestens 8 Zeichen lang sein', 'New password must be at least 8 characters long') })
    .regex(PASSWORD_REGEX, { error: passwordComplexity }),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  error: passwordsMismatch,
  path: ['confirmNewPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ error: emailInvalid }),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { error: passwordMinLength })
    .regex(PASSWORD_REGEX, { error: passwordComplexity }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  error: passwordsMismatch,
  path: ['confirmPassword'],
});

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

/**
 * Phone number validation regex for E.164 international format
 * - Starts with optional + sign
 * - Followed by 1-15 digits
 * Examples: +49123456789, +1234567890, +441234567890
 */
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

/**
 * Sanitize URL by removing duplicate protocol prefixes
 * Handles cases like:
 * - "https://https://linkedin.com" → "https://linkedin.com"
 * - "https://https//linkedin.com" → "https://linkedin.com" (missing colon)
 */
const sanitizeUrl = (val: string): string => {
  if (!val || val.trim() === '') return '';
  
  let url = val.trim();
  
  // Remove duplicate protocol prefixes (with or without colon)
  // Matches: https://https://, https://https//, http://https//, etc.
  while (/^(https?:\/\/)(https?:?\/\/)/.test(url)) {
    url = url.replace(/^(https?:\/\/)(https?:?\/\/)/, '$2');
  }
  
  // Fix malformed protocol (https// → https://)
  url = url.replace(/^(https?)\/\//, '$1://');
  
  // If URL doesn't start with protocol, add https://
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  
  return url;
};

/**
 * German postal code (PLZ) validation regex
 * Must be exactly 5 digits
 */
const GERMAN_PLZ_REGEX = /^\d{5}$/;

export const profileSchema = z.object({
  firstName: z.string().min(1, { error: m('Vorname ist erforderlich', 'First name is required') }).optional(),
  lastName: z.string().min(1, { error: m('Nachname ist erforderlich', 'Last name is required') }).optional(),
  email: z.string().email({ error: emailInvalid }).optional(),
  phone: z
    .string()
    .regex(phoneRegex, { error: m('Telefonnummer muss im internationalen Format sein (z.B. +49123456789)', 'Phone number must be in international format (e.g. +49123456789)') })
    .optional()
    .or(z.literal('')),
  street: z.string().max(200, { error: m('Straße darf maximal 200 Zeichen haben', 'Street may be at most 200 characters') }).optional().or(z.literal('')),
  postalCode: z
    .string()
    .regex(GERMAN_PLZ_REGEX, { error: m('PLZ muss genau 5 Ziffern haben', 'Postal code must be exactly 5 digits') })
    .optional()
    .or(z.literal('')),
  city: z.string().max(100, { error: m('Stadt darf maximal 100 Zeichen haben', 'City may be at most 100 characters') }).optional().or(z.literal('')),
  country: z.string().max(100, { error: m('Land darf maximal 100 Zeichen haben', 'Country may be at most 100 characters') }).optional().or(z.literal('')),
  linkedinUrl: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
  githubUrl: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
  portfolioUrl: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
  summary: z.string().optional(),
});

export const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { error: m('Skill-Name ist erforderlich', 'Skill name is required') }),
  level: z.string().optional(),
});

export const certificateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { error: m('Name ist erforderlich', 'Name is required') }),
  issuer: z.string().min(1, { error: m('Aussteller ist erforderlich', 'Issuer is required') }),
  dateObtained: z.string().optional(),
  url: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
});

export const experienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { error: m('Jobtitel ist erforderlich', 'Job title is required') }),
  company: z.string().min(1, { error: m('Firma ist erforderlich', 'Company is required') }),
  location: z.string().optional(),
  startDate: z.string().min(1, { error: m('Startdatum ist erforderlich', 'Start date is required') }),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
});

export const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { error: m('Projektname ist erforderlich', 'Project name is required') }),
  description: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  url: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
});

export const educationSchema = z.object({
  id: z.string().optional(),
  degree: z.string().min(1, { error: m('Abschluss ist erforderlich', 'Degree is required') }),
  institution: z.string().min(1, { error: m('Institution ist erforderlich', 'Institution is required') }),
  fieldOfStudy: z.string().optional(),
  startYear: z.string().optional(), // DateString format
  endYear: z.string().optional(), // DateString format
  gpa: z.string().optional(),
  description: z.string().optional(),
});

export const languageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { error: m('Sprachname ist erforderlich', 'Language name is required') }),
  level: z.string().min(1, { error: m('Sprachniveau ist erforderlich', 'Language level is required') }),
});

// ============================================================================
// JOB POSTING SCHEMAS
// ============================================================================

export const jobPostingSchema = z.object({
  title: z.string().min(1, { error: m('Titel ist erforderlich', 'Title is required') }).max(200, { error: m('Titel darf maximal 200 Zeichen haben', 'Title may be at most 200 characters') }),
  company: z.string().min(1, { error: m('Unternehmen ist erforderlich', 'Company is required') }).max(200, { error: m('Unternehmen darf maximal 200 Zeichen haben', 'Company may be at most 200 characters') }),
  location: z.string().max(200, { error: m('Standort darf maximal 200 Zeichen haben', 'Location may be at most 200 characters') }).optional(),
  language: z.string().max(10, { error: m('Sprache darf maximal 10 Zeichen haben', 'Language may be at most 10 characters') }).optional(),
  url: z.string().url({ error: urlInvalid }).optional().or(z.literal('')),
  fullText: z.string().min(1, { error: m('Volltext ist erforderlich', 'Full text is required') }),
  salary: z.string().max(100, { error: m('Gehalt darf maximal 100 Zeichen haben', 'Salary may be at most 100 characters') }).optional(),
  employmentType: z.string().max(50, { error: m('Beschäftigungsart darf maximal 50 Zeichen haben', 'Employment type may be at most 50 characters') }).optional(),
});

export const jobPostingEditSchema = z.object({
  title: z.string().min(1, { error: m('Titel ist erforderlich', 'Title is required') }).max(200, { error: m('Titel darf maximal 200 Zeichen haben', 'Title may be at most 200 characters') }),
  company: z.string().min(1, { error: m('Unternehmen ist erforderlich', 'Company is required') }).max(200, { error: m('Unternehmen darf maximal 200 Zeichen haben', 'Company may be at most 200 characters') }),
  location: z.string().max(200, { error: m('Standort darf maximal 200 Zeichen haben', 'Location may be at most 200 characters') }).optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
});

export const jobPostingUrlSchema = z.object({
  url: z.string().url({ error: m('Bitte gebe eine gültige URL ein', 'Please enter a valid URL') }),
});

export const jobPostingTextSchema = z.object({
  text: z.string().min(10, { error: m('Text muss mindestens 10 Zeichen lang sein', 'Text must be at least 10 characters long') }),
});

// ============================================================================
// APPLICATION SCHEMAS
// ============================================================================

export const createApplicationSchema = z.object({
  jobPostingId: z.string().min(1, { error: m('Job Posting ID ist erforderlich', 'Job posting ID is required') }),
  coverLetterTemplateId: z.string().optional(),
  resumeTemplateId: z.string().optional(),
  generateCoverLetter: z.boolean().optional(),
  notes: z.string().optional(),
});

export const updateApplicationTitleSchema = z.object({
  title: z
    .string()
    .min(3, { error: m('Titel muss mindestens 3 Zeichen lang sein', 'Title must be at least 3 characters long') })
    .max(200, { error: m('Titel darf maximal 200 Zeichen haben', 'Title may be at most 200 characters') }),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type SkillFormValues = z.infer<typeof skillSchema>;
export type CertificateFormValues = z.infer<typeof certificateSchema>;
export type ExperienceFormValues = z.infer<typeof experienceSchema>;
export type ProjectFormValues = z.infer<typeof projectSchema>;
export type EducationFormValues = z.infer<typeof educationSchema>;
export type LanguageFormValues = z.infer<typeof languageSchema>;

export type JobPostingFormValues = z.infer<typeof jobPostingSchema>;
export type JobPostingEditFormValues = z.infer<typeof jobPostingEditSchema>;
export type JobPostingUrlFormValues = z.infer<typeof jobPostingUrlSchema>;
export type JobPostingTextFormValues = z.infer<typeof jobPostingTextSchema>;

export type CreateApplicationFormValues = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationTitleFormValues = z.infer<typeof updateApplicationTitleSchema>;
