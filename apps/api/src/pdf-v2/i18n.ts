/**
 * Minimal i18n labels used by react-pdf templates.
 * Mirrors the `t` Handlebars helper in template-renderer.service.ts so the new
 * renderer produces identical section headers. Keep in sync when adding labels.
 */

type Lang = string;

const LABELS: Record<string, Record<string, string>> = {
  contact: {
    en: 'Contact',
    de: 'Kontakt',
    fr: 'Contact',
    es: 'Contacto',
    it: 'Contatto',
  },
  'resume.summary': {
    en: 'Professional Summary',
    de: 'Profil',
    fr: 'Résumé Professionnel',
    es: 'Resumen Profesional',
    it: 'Profilo Professionale',
  },
  'resume.skills': {
    en: 'Skills',
    de: 'Fähigkeiten',
    fr: 'Compétences',
    es: 'Habilidades',
    it: 'Competenze',
  },
  'resume.experience': {
    en: 'Professional Experience',
    de: 'Berufserfahrung',
    fr: 'Expérience Professionnelle',
    es: 'Experiencia Profesional',
    it: 'Esperienza Professionale',
  },
  'resume.education': {
    en: 'Education',
    de: 'Ausbildung',
    fr: 'Formation',
    es: 'Educación',
    it: 'Formazione',
  },
  'resume.certifications': {
    en: 'Certifications',
    de: 'Zertifikate',
    fr: 'Certifications',
    es: 'Certificaciones',
    it: 'Certificazioni',
  },
  'resume.languages': {
    en: 'Languages',
    de: 'Sprachen',
    fr: 'Langues',
    es: 'Idiomas',
    it: 'Lingue',
  },
  'resume.projects': {
    en: 'Key Projects',
    de: 'Wichtige Projekte',
    fr: 'Projets Clés',
    es: 'Proyectos Clave',
    it: 'Progetti Chiave',
  },
  'level.native': {
    en: 'Native',
    de: 'Muttersprache',
    fr: 'Langue maternelle',
    es: 'Nativo',
    it: 'Madrelingua',
  },
  'level.fluent': {
    en: 'Fluent',
    de: 'Fließend',
    fr: 'Courant',
    es: 'Fluido',
    it: 'Fluente',
  },
  'level.advanced': {
    en: 'Advanced',
    de: 'Fortgeschritten',
    fr: 'Avancé',
    es: 'Avanzado',
    it: 'Avanzato',
  },
  'level.good': {
    en: 'Good',
    de: 'Gut',
    fr: 'Bon',
    es: 'Bueno',
    it: 'Buono',
  },
  'level.intermediate': {
    en: 'Intermediate',
    de: 'Mittelstufe',
    fr: 'Intermédiaire',
    es: 'Intermedio',
    it: 'Intermedio',
  },
  'level.conversational': {
    en: 'Conversational',
    de: 'Konversationssicher',
    fr: 'Conversationnel',
    es: 'Conversacional',
    it: 'Conversazionale',
  },
  'level.basic': {
    en: 'Basic',
    de: 'Grundkenntnisse',
    fr: 'Notions de base',
    es: 'Básico',
    it: 'Base',
  },
  'level.beginner': {
    en: 'Beginner',
    de: 'Anfänger',
    fr: 'Débutant',
    es: 'Principiante',
    it: 'Principiante',
  },
};

export function tLabel(key: string, lang: Lang | undefined): string {
  const normalizedLang = (lang || 'en').toLowerCase().slice(0, 2);
  const entry = LABELS[key];
  if (!entry) return key;
  return entry[normalizedLang] ?? entry.en ?? key;
}

/**
 * Localizes a normalized language-proficiency key (`level.*` from
 * `normalizeProficiencyLevel`); un-normalized free-text levels pass through.
 */
export function tLevel(level: string | undefined, lang: Lang | undefined): string {
  if (!level) return '';
  return level.startsWith('level.') ? tLabel(level, lang) : level;
}
