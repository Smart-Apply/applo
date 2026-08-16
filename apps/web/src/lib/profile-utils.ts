import type { Profile, User } from '@/types';
import { pick } from '@/lib/i18n-runtime';

export type ProfileCriterionKey =
  | 'contact'
  | 'phone'
  | 'address'
  | 'about'
  | 'skills'
  | 'experience'
  | 'education'
  | 'linkedin';

export interface ProfileCriterion {
  key: ProfileCriterionKey;
  /** Action-phrased label ("Telefonnummer hinzufügen"), localized. */
  text: string;
  weight: number;
  completed: boolean;
}

export interface ProfileStrengthResult {
  score: number;
  criteria: ProfileCriterion[];
}

/**
 * Calculate profile strength/completeness based on filled fields.
 *
 * Returns a 0-100 score plus the weighted criteria it was derived from — every
 * surface that shows a completeness checklist must render these criteria rather
 * than re-deriving its own, so the list can never disagree with the number.
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
  const criteria: ProfileCriterion[] = [
    {
      key: 'contact',
      text: text.contactComplete,
      weight: 10,
      completed: !!(user?.firstName && user?.lastName && user?.email),
    },
    { key: 'phone', text: text.addPhone, weight: 10, completed: !!profile?.phone },
    {
      key: 'address',
      text: text.addAddress,
      weight: 10,
      completed: !!(profile?.city || profile?.street),
    },
    { key: 'about', text: text.writeSummary, weight: 15, completed: !!profile?.summary },
    {
      key: 'skills',
      text: text.addSkills,
      weight: 15,
      completed: (profile?.skills?.length ?? 0) > 0,
    },
    {
      key: 'experience',
      text: text.addExperience,
      weight: 15,
      completed: (profile?.experiences?.length ?? 0) > 0,
    },
    {
      key: 'education',
      text: text.addEducation,
      weight: 15,
      completed: (profile?.education?.length ?? 0) > 0,
    },
    { key: 'linkedin', text: text.linkLinkedin, weight: 10, completed: !!profile?.linkedinUrl },
  ];

  const score = criteria.reduce((sum, c) => sum + (c.completed ? c.weight : 0), 0);

  return {
    score: Math.min(score, 100),
    criteria,
  };
}

/**
 * Order criteria so the next best step is first: open items before completed
 * ones, heaviest first within each group. Shared so every surface that shows a
 * subset of the checklist highlights the same "biggest win".
 */
export function sortCriteriaByImpact<T extends ProfileCriterion>(criteria: T[]): T[] {
  return [...criteria].sort((a, b) =>
    a.completed === b.completed ? b.weight - a.weight : a.completed ? 1 : -1,
  );
}
