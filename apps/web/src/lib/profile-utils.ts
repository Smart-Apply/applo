import type { Profile, User } from '@/types';
import { pick } from '@/lib/i18n-runtime';

export interface ProfileStrengthResult {
  score: number;
  suggestions: ProfileSuggestion[];
}

export interface ProfileSuggestion {
  text: string;
  completed: boolean;
}

/**
 * Calculate profile strength/completeness based on filled fields
 * Returns a score from 0-100 and suggestions for completion
 * 
 * Scoring breakdown:
 * - Basic Info (firstName, lastName, email): 10 points
 * - Contact (phone): 10 points
 * - Location: 10 points
 * - Summary: 15 points
 * - Skills: 15 points
 * - Experience: 15 points
 * - Education: 15 points
 * - LinkedIn URL: 10 points
 * 
 * Total: 100 points
 */
export function calculateProfileStrength(
  profile: Profile | null | undefined,
  user: User | null | undefined
): ProfileStrengthResult {
  const text = pick({
    de: {
      contactComplete: 'Kontaktdaten vollst\u00e4ndig',
      addPhone: 'Telefonnummer hinzuf\u00fcgen',
      addAddress: 'Adresse angeben',
      writeSummary: 'Pro' + 'fil-Zusammenfassung schreiben',
      addSkills: 'F\u00e4higkeiten hinzuf\u00fcgen',
      addExperience: 'Berufs' + 'erfahrung hinzuf\u00fcgen',
      addEducation: 'Aus' + 'bildung hinzuf\u00fcgen',
      linkLinkedin: 'LinkedIn verkn\u00fcpfen',
    },
    en: {
      contactComplete: 'Contact details complete',
      addPhone: 'Add phone number',
      addAddress: 'Add address',
      writeSummary: 'Write profile summary',
      addSkills: 'Add skills',
      addExperience: 'Add work experience',
      addEducation: 'Add education',
      linkLinkedin: 'Connect LinkedIn',
    },
    fr: {
      contactComplete: 'Coordonn\u00e9es compl\u00e8tes',
      addPhone: 'Ajouter un num\u00e9ro de t\u00e9l\u00e9phone',
      addAddress: 'Indiquer une adresse',
      writeSummary: 'R\u00e9diger un r\u00e9sum\u00e9 de profil',
      addSkills: 'Ajouter des comp\u00e9tences',
      addExperience: 'Ajouter une exp\u00e9rience professionnelle',
      addEducation: 'Ajouter une formation',
      linkLinkedin: 'Connecter LinkedIn',
    },
    es: {
      contactComplete: 'Datos de contacto completos',
      addPhone: 'A\u00f1adir n\u00famero de tel\u00e9fono',
      addAddress: 'Indicar direcci\u00f3n',
      writeSummary: 'Escribir resumen del perfil',
      addSkills: 'A\u00f1adir habilidades',
      addExperience: 'A\u00f1adir experiencia laboral',
      addEducation: 'A\u00f1adir formaci\u00f3n',
      linkLinkedin: 'Conectar LinkedIn',
    },
    pt: {
      contactComplete: 'Dados de contacto completos',
      addPhone: 'Adicionar n\u00famero de telefone',
      addAddress: 'Indicar morada',
      writeSummary: 'Escrever resumo do perfil',
      addSkills: 'Adicionar compet\u00eancias',
      addExperience: 'Adicionar experi\u00eancia profissional',
      addEducation: 'Adicionar forma\u00e7\u00e3o',
      linkLinkedin: 'Ligar o LinkedIn',
    },
    it: {
      contactComplete: 'Dati di contatto completi',
      addPhone: 'Aggiungi numero di telefono',
      addAddress: 'Indica un indirizzo',
      writeSummary: 'Scrivi il riepilogo del profilo',
      addSkills: 'Aggiungi competenze',
      addExperience: 'Aggiungi esperienza lavorativa',
      addEducation: 'Aggiungi istruzione',
      linkLinkedin: 'Collega LinkedIn',
    },
  });
  let score = 0;
  const suggestions: ProfileSuggestion[] = [];

  // Basic Info (10 points)
  const hasBasicInfo = user?.firstName && user?.lastName && user?.email;
  if (hasBasicInfo) {
    score += 10;
  }
  suggestions.push({
    text: text.contactComplete,
    completed: !!hasBasicInfo,
  });

  // Phone (10 points)
  const hasPhone = !!profile?.phone;
  if (hasPhone) {
    score += 10;
  }
  suggestions.push({
    text: text.addPhone,
    completed: hasPhone,
  });

  // Address (10 points) - at least city should be filled
  const hasAddress = !!(profile?.city || profile?.street);
  if (hasAddress) {
    score += 10;
  }
  suggestions.push({
    text: text.addAddress,
    completed: hasAddress,
  });

  // Summary (15 points)
  const hasSummary = !!profile?.summary;
  if (hasSummary) {
    score += 15;
  }
  suggestions.push({
    text: text.writeSummary,
    completed: hasSummary,
  });

  // Skills (15 points)
  const hasSkills = profile?.skills && profile.skills.length > 0;
  if (hasSkills) {
    score += 15;
  }
  suggestions.push({
    text: text.addSkills,
    completed: !!hasSkills,
  });

  // Experience (15 points)
  const hasExperience = profile?.experiences && profile.experiences.length > 0;
  if (hasExperience) {
    score += 15;
  }
  suggestions.push({
    text: text.addExperience,
    completed: !!hasExperience,
  });

  // Education (15 points)
  const hasEducation = profile?.education && profile.education.length > 0;
  if (hasEducation) {
    score += 15;
  }
  suggestions.push({
    text: text.addEducation,
    completed: !!hasEducation,
  });

  // LinkedIn (10 points)
  const hasLinkedIn = !!profile?.linkedinUrl;
  if (hasLinkedIn) {
    score += 10;
  }
  suggestions.push({
    text: text.linkLinkedin,
    completed: hasLinkedIn,
  });

  return {
    score: Math.min(score, 100),
    suggestions,
  };
}
