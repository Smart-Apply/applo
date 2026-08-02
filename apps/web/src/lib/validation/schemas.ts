import { z } from 'zod';
import { pick } from '@/lib/i18n-runtime';
import type { Locale } from '@/i18n/config';

/**
 * Centralized Zod validation schemas matching backend DTOs
 * 
 * All schemas mirror backend class-validator rules to ensure
 * client-side validation catches errors before API calls.
 * 
 * Error messages cover every UI locale: the `m()` helper returns a lazy
 * Zod error function that resolves the active UI language at VALIDATION
 * time (not at module load), so schemas react to locale switches.
 */

/** Lazy localized error message for Zod's `error` param. */
const m = (dict: Record<Locale, string>) => () => pick(dict);

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * Password validation regex matching backend requirements
 * Must contain: lowercase, uppercase, number, special char (@$!%*?&#)
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[\w@$!%*?&#]{8,}$/;

const emailInvalid = m({
  de: 'Ungültige E-Mail-Adresse',
  en: 'Invalid email address',
  fr: 'Adresse e-mail invalide',
  es: 'Dirección de correo electrónico no válida',
  pt: 'Endereço de e-mail inválido',
  it: 'Indirizzo e-mail non valido',
});
const passwordMinLength = m({
  de: 'Passwort muss mindestens 8 Zeichen lang sein',
  en: 'Password must be at least 8 characters long',
  fr: 'Le mot de passe doit comporter au moins 8 caractères',
  es: 'La contraseña debe tener al menos 8 caracteres',
  pt: 'A palavra-passe deve ter pelo menos 8 caracteres',
  it: 'La password deve contenere almeno 8 caratteri',
});
const passwordComplexity = m({
  de: 'Passwort muss einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen (@$!%*?&#) enthalten',
  en: 'Password must contain an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&#)',
  fr: 'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&#)',
  es: 'La contraseña debe contener una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&#)',
  pt: 'A palavra-passe deve conter uma maiúscula, uma minúscula, um número e um carácter especial (@$!%*?&#)',
  it: 'La password deve contenere una lettera maiuscola, una minuscola, un numero e un carattere speciale (@$!%*?&#)',
});
const passwordsMismatch = m({
  de: 'Passwörter stimmen nicht überein',
  en: 'Passwords do not match',
  fr: 'Les mots de passe ne correspondent pas',
  es: 'Las contraseñas no coinciden',
  pt: 'As palavras-passe não coincidem',
  it: 'Le password non corrispondono',
});
const urlInvalid = m({
  de: 'Ungültige URL',
  en: 'Invalid URL',
  fr: 'URL invalide',
  es: 'URL no válida',
  pt: 'URL inválido',
  it: 'URL non valido',
});

const firstNameRequired = m({
  de: 'Vorname ist erforderlich',
  en: 'First name is required',
  fr: 'Le prénom est requis',
  es: 'El nombre es obligatorio',
  pt: 'O nome próprio é obrigatório',
  it: 'Il nome è obbligatorio',
});
const lastNameRequired = m({
  de: 'Nachname ist erforderlich',
  en: 'Last name is required',
  fr: 'Le nom de famille est requis',
  es: 'El apellido es obligatorio',
  pt: 'O apelido é obrigatório',
  it: 'Il cognome è obbligatorio',
});

export const loginSchema = z.object({
  email: z.string().email({ error: emailInvalid }),
  password: z.string().min(8, { error: passwordMinLength }),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, { error: firstNameRequired }).optional(),
  lastName: z.string().min(1, { error: lastNameRequired }).optional(),
  email: z.string().email({ error: emailInvalid }),
  password: z
    .string()
    .min(8, { error: passwordMinLength })
    .regex(PASSWORD_REGEX, { error: passwordComplexity }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  error: passwordsMismatch,
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: m({
    de: 'Aktuelles Passwort ist erforderlich',
    en: 'Current password is required',
    fr: 'Le mot de passe actuel est requis',
    es: 'La contraseña actual es obligatoria',
    pt: 'A palavra-passe atual é obrigatória',
    it: 'La password attuale è obbligatoria',
  }) }),
  newPassword: z
    .string()
    .min(8, { error: m({
      de: 'Neues Passwort muss mindestens 8 Zeichen lang sein',
      en: 'New password must be at least 8 characters long',
      fr: 'Le nouveau mot de passe doit comporter au moins 8 caractères',
      es: 'La nueva contraseña debe tener al menos 8 caracteres',
      pt: 'A nova palavra-passe deve ter pelo menos 8 caracteres',
      it: 'La nuova password deve contenere almeno 8 caratteri',
    }) })
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
  firstName: z.string().min(1, { error: firstNameRequired }).optional(),
  lastName: z.string().min(1, { error: lastNameRequired }).optional(),
  email: z.string().email({ error: emailInvalid }).optional(),
  phone: z
    .string()
    .regex(phoneRegex, { error: m({
      de: 'Telefonnummer muss im internationalen Format sein (z.B. +49123456789)',
      en: 'Phone number must be in international format (e.g. +49123456789)',
      fr: 'Le numéro de téléphone doit être au format international (p. ex. +33123456789)',
      es: 'El número de teléfono debe estar en formato internacional (p. ej., +34123456789)',
      pt: 'O número de telefone deve estar em formato internacional (p. ex., +351123456789)',
      it: 'Il numero di telefono deve essere in formato internazionale (ad es. +39123456789)',
    }) })
    .optional()
    .or(z.literal('')),
  street: z.string().max(200, { error: m({
    de: 'Straße darf maximal 200 Zeichen haben',
    en: 'Street may be at most 200 characters',
    fr: 'La rue peut comporter au maximum 200 caractères',
    es: 'La calle puede tener como máximo 200 caracteres',
    pt: 'A rua pode ter no máximo 200 caracteres',
    it: 'La via può contenere al massimo 200 caratteri',
  }) }).optional().or(z.literal('')),
  postalCode: z
    .string()
    .regex(GERMAN_PLZ_REGEX, { error: m({
      de: 'PLZ muss genau 5 Ziffern haben',
      en: 'Postal code must be exactly 5 digits',
      fr: 'Le code postal doit comporter exactement 5 chiffres',
      es: 'El código postal debe tener exactamente 5 dígitos',
      pt: 'O código postal deve ter exatamente 5 dígitos',
      it: 'Il codice postale deve contenere esattamente 5 cifre',
    }) })
    .optional()
    .or(z.literal('')),
  city: z.string().max(100, { error: m({
    de: 'Stadt darf maximal 100 Zeichen haben',
    en: 'City may be at most 100 characters',
    fr: 'La ville peut comporter au maximum 100 caractères',
    es: 'La ciudad puede tener como máximo 100 caracteres',
    pt: 'A cidade pode ter no máximo 100 caracteres',
    it: 'La città può contenere al massimo 100 caratteri',
  }) }).optional().or(z.literal('')),
  country: z.string().max(100, { error: m({
    de: 'Land darf maximal 100 Zeichen haben',
    en: 'Country may be at most 100 characters',
    fr: 'Le pays peut comporter au maximum 100 caractères',
    es: 'El país puede tener como máximo 100 caracteres',
    pt: 'O país pode ter no máximo 100 caracteres',
    it: 'Il paese può contenere al massimo 100 caratteri',
  }) }).optional().or(z.literal('')),
  linkedinUrl: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
  githubUrl: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
  portfolioUrl: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
  summary: z.string().optional(),
});

export const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { error: m({
    de: 'Skill-Name ist erforderlich',
    en: 'Skill name is required',
    fr: 'Le nom de la compétence est requis',
    es: 'El nombre de la habilidad es obligatorio',
    pt: 'O nome da competência é obrigatório',
    it: 'Il nome della competenza è obbligatorio',
  }) }),
  level: z.string().optional(),
});

export const certificateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { error: m({
    de: 'Name ist erforderlich',
    en: 'Name is required',
    fr: 'Le nom est requis',
    es: 'El nombre es obligatorio',
    pt: 'O nome é obrigatório',
    it: 'Il nome è obbligatorio',
  }) }),
  issuer: z.string().min(1, { error: m({
    de: 'Aussteller ist erforderlich',
    en: 'Issuer is required',
    fr: 'L’émetteur est requis',
    es: 'El emisor es obligatorio',
    pt: 'A entidade emissora é obrigatória',
    it: 'L’ente emittente è obbligatorio',
  }) }),
  dateObtained: z.string().optional(),
  url: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
});

export const experienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { error: m({
    de: 'Jobtitel ist erforderlich',
    en: 'Job title is required',
    fr: 'L’intitulé du poste est requis',
    es: 'El título del puesto es obligatorio',
    pt: 'O título do cargo é obrigatório',
    it: 'Il titolo della posizione è obbligatorio',
  }) }),
  company: z.string().min(1, { error: m({
    de: 'Firma ist erforderlich',
    en: 'Company is required',
    fr: 'L’entreprise est requise',
    es: 'La empresa es obligatoria',
    pt: 'A empresa é obrigatória',
    it: 'L’azienda è obbligatoria',
  }) }),
  location: z.string().optional(),
  startDate: z.string().min(1, { error: m({
    de: 'Startdatum ist erforderlich',
    en: 'Start date is required',
    fr: 'La date de début est requise',
    es: 'La fecha de inicio es obligatoria',
    pt: 'A data de início é obrigatória',
    it: 'La data di inizio è obbligatoria',
  }) }),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
});

export const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { error: m({
    de: 'Projektname ist erforderlich',
    en: 'Project name is required',
    fr: 'Le nom du projet est requis',
    es: 'El nombre del proyecto es obligatorio',
    pt: 'O nome do projeto é obrigatório',
    it: 'Il nome del progetto è obbligatorio',
  }) }),
  description: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  url: z.string().transform(sanitizeUrl).pipe(z.string().url({ error: urlInvalid }).or(z.literal(''))).optional().or(z.literal('')),
});

export const educationSchema = z.object({
  id: z.string().optional(),
  degree: z.string().min(1, { error: m({
    de: 'Abschluss ist erforderlich',
    en: 'Degree is required',
    fr: 'Le diplôme est requis',
    es: 'La titulación es obligatoria',
    pt: 'O grau académico é obrigatório',
    it: 'Il titolo di studio è obbligatorio',
  }) }),
  institution: z.string().min(1, { error: m({
    de: 'Institution ist erforderlich',
    en: 'Institution is required',
    fr: 'L’établissement est requis',
    es: 'La institución es obligatoria',
    pt: 'A instituição é obrigatória',
    it: 'L’istituto è obbligatorio',
  }) }),
  fieldOfStudy: z.string().optional(),
  startYear: z.string().optional(), // DateString format
  endYear: z.string().optional(), // DateString format
  gpa: z.string().optional(),
  description: z.string().optional(),
});

export const languageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { error: m({
    de: 'Sprachname ist erforderlich',
    en: 'Language name is required',
    fr: 'Le nom de la langue est requis',
    es: 'El nombre del idioma es obligatorio',
    pt: 'O nome da língua é obrigatório',
    it: 'Il nome della lingua è obbligatorio',
  }) }),
  level: z.string().min(1, { error: m({
    de: 'Sprachniveau ist erforderlich',
    en: 'Language level is required',
    fr: 'Le niveau de langue est requis',
    es: 'El nivel del idioma es obligatorio',
    pt: 'O nível da língua é obrigatório',
    it: 'Il livello della lingua è obbligatorio',
  }) }),
});

// ============================================================================
// JOB POSTING SCHEMAS
// ============================================================================

const titleRequired = m({
  de: 'Titel ist erforderlich',
  en: 'Title is required',
  fr: 'Le titre est requis',
  es: 'El título es obligatorio',
  pt: 'O título é obrigatório',
  it: 'Il titolo è obbligatorio',
});
const titleMax200 = m({
  de: 'Titel darf maximal 200 Zeichen haben',
  en: 'Title may be at most 200 characters',
  fr: 'Le titre peut comporter au maximum 200 caractères',
  es: 'El título puede tener como máximo 200 caracteres',
  pt: 'O título pode ter no máximo 200 caracteres',
  it: 'Il titolo può contenere al massimo 200 caratteri',
});
const companyRequired = m({
  de: 'Unternehmen ist erforderlich',
  en: 'Company is required',
  fr: 'L’entreprise est requise',
  es: 'La empresa es obligatoria',
  pt: 'A empresa é obrigatória',
  it: 'L’azienda è obbligatoria',
});
const companyMax200 = m({
  de: 'Unternehmen darf maximal 200 Zeichen haben',
  en: 'Company may be at most 200 characters',
  fr: 'L’entreprise peut comporter au maximum 200 caractères',
  es: 'La empresa puede tener como máximo 200 caracteres',
  pt: 'A empresa pode ter no máximo 200 caracteres',
  it: 'L’azienda può contenere al massimo 200 caratteri',
});
const locationMax200 = m({
  de: 'Standort darf maximal 200 Zeichen haben',
  en: 'Location may be at most 200 characters',
  fr: 'Le lieu peut comporter au maximum 200 caractères',
  es: 'La ubicación puede tener como máximo 200 caracteres',
  pt: 'A localização pode ter no máximo 200 caracteres',
  it: 'La sede può contenere al massimo 200 caratteri',
});

export const jobPostingSchema = z.object({
  title: z.string().min(1, { error: titleRequired }).max(200, { error: titleMax200 }),
  company: z.string().min(1, { error: companyRequired }).max(200, { error: companyMax200 }),
  location: z.string().max(200, { error: locationMax200 }).optional(),
  language: z.string().max(10, { error: m({
    de: 'Sprache darf maximal 10 Zeichen haben',
    en: 'Language may be at most 10 characters',
    fr: 'La langue peut comporter au maximum 10 caractères',
    es: 'El idioma puede tener como máximo 10 caracteres',
    pt: 'A língua pode ter no máximo 10 caracteres',
    it: 'La lingua può contenere al massimo 10 caratteri',
  }) }).optional(),
  url: z.string().url({ error: urlInvalid }).optional().or(z.literal('')),
  fullText: z.string().min(1, { error: m({
    de: 'Volltext ist erforderlich',
    en: 'Full text is required',
    fr: 'Le texte complet est requis',
    es: 'El texto completo es obligatorio',
    pt: 'O texto completo é obrigatório',
    it: 'Il testo completo è obbligatorio',
  }) }),
  salary: z.string().max(100, { error: m({
    de: 'Gehalt darf maximal 100 Zeichen haben',
    en: 'Salary may be at most 100 characters',
    fr: 'Le salaire peut comporter au maximum 100 caractères',
    es: 'El salario puede tener como máximo 100 caracteres',
    pt: 'O salário pode ter no máximo 100 caracteres',
    it: 'Lo stipendio può contenere al massimo 100 caratteri',
  }) }).optional(),
  employmentType: z.string().max(50, { error: m({
    de: 'Beschäftigungsart darf maximal 50 Zeichen haben',
    en: 'Employment type may be at most 50 characters',
    fr: 'Le type d’emploi peut comporter au maximum 50 caractères',
    es: 'El tipo de empleo puede tener como máximo 50 caracteres',
    pt: 'O tipo de emprego pode ter no máximo 50 caracteres',
    it: 'Il tipo di impiego può contenere al massimo 50 caratteri',
  }) }).optional(),
});

export const jobPostingEditSchema = z.object({
  title: z.string().min(1, { error: titleRequired }).max(200, { error: titleMax200 }),
  company: z.string().min(1, { error: companyRequired }).max(200, { error: companyMax200 }),
  location: z.string().max(200, { error: locationMax200 }).optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
});

export const jobPostingUrlSchema = z.object({
  url: z.string().url({ error: m({
    de: 'Bitte gebe eine gültige URL ein',
    en: 'Please enter a valid URL',
    fr: 'Veuillez saisir une URL valide',
    es: 'Introduce una URL válida',
    pt: 'Introduz um URL válido',
    it: 'Inserisci un URL valido',
  }) }),
});

export const jobPostingTextSchema = z.object({
  text: z.string().min(10, { error: m({
    de: 'Text muss mindestens 10 Zeichen lang sein',
    en: 'Text must be at least 10 characters long',
    fr: 'Le texte doit comporter au moins 10 caractères',
    es: 'El texto debe tener al menos 10 caracteres',
    pt: 'O texto deve ter pelo menos 10 caracteres',
    it: 'Il testo deve contenere almeno 10 caratteri',
  }) }),
});

// ============================================================================
// APPLICATION SCHEMAS
// ============================================================================

export const createApplicationSchema = z.object({
  jobPostingId: z.string().min(1, { error: m({
    de: 'Job Posting ID ist erforderlich',
    en: 'Job posting ID is required',
    fr: 'L’identifiant de l’offre d’emploi est requis',
    es: 'El ID de la oferta de empleo es obligatorio',
    pt: 'O ID da oferta de emprego é obrigatório',
    it: 'L’ID dell’annuncio di lavoro è obbligatorio',
  }) }),
  coverLetterTemplateId: z.string().optional(),
  resumeTemplateId: z.string().optional(),
  generateCoverLetter: z.boolean().optional(),
  notes: z.string().optional(),
});

export const updateApplicationTitleSchema = z.object({
  title: z
    .string()
    .min(3, { error: m({
      de: 'Titel muss mindestens 3 Zeichen lang sein',
      en: 'Title must be at least 3 characters long',
      fr: 'Le titre doit comporter au moins 3 caractères',
      es: 'El título debe tener al menos 3 caracteres',
      pt: 'O título deve ter pelo menos 3 caracteres',
      it: 'Il titolo deve contenere almeno 3 caratteri',
    }) })
    .max(200, { error: titleMax200 }),
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
