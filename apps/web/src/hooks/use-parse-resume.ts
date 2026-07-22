import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toastError } from '@/lib/toast';
import { pick } from '@/lib/i18n-runtime';
import type { ExtractedProfile } from '@/types';
import { useTranslations } from 'next-intl';

/**
 * Hook to parse a resume file and extract profile data
 * Rate limited to 10 uploads per hour
 */
export function useParseResume() {
  const t = useTranslations('profile');

  return useMutation({
    mutationFn: (file: File) => api.profile.parseResume(file),

    onError: (error: unknown) => {
      toastError(error, t('hooks.parseError'));
    },
  });
}

/**
 * Type for the sections that can be imported from a parsed resume
 */
export type ImportableSection =
  | 'personal'
  | 'summary'
  | 'skills'
  | 'experiences'
  | 'education'
  | 'certificates'
  | 'projects'
  | 'languages';

/**
 * Get localized section label
 */
export function getSectionLabel(section: ImportableSection): string {
  const labels = pick<Record<ImportableSection, string>>({
    de: {
      personal: 'Pers\u00f6nliche Da' + 'ten',
      summary: 'Zusammenfassung',
      skills: 'F\u00e4higkeiten',
      experiences: 'Berufs' + 'erfahrung',
      education: 'Bil' + 'dung',
      certificates: 'Zertifikate',
      projects: 'Projekte',
      languages: 'Spra' + 'chen',
    },
    en: {
      personal: 'Personal details',
      summary: 'Summary',
      skills: 'Skills',
      experiences: 'Work experience',
      education: 'Education',
      certificates: 'Certificates',
      projects: 'Projects',
      languages: 'Languages',
    },
  });
  return labels[section];
}

/**
 * Check if a section has data in the extracted profile
 */
export function sectionHasData(
  section: ImportableSection,
  profile: ExtractedProfile | undefined
): boolean {
  if (!profile) return false;

  switch (section) {
    case 'personal':
      return !!(
        profile.firstName ||
        profile.lastName ||
        profile.phone ||
        profile.street ||
        profile.postalCode ||
        profile.city ||
        profile.country ||
        profile.linkedinUrl ||
        profile.githubUrl ||
        profile.portfolioUrl
      );
    case 'summary':
      return !!profile.summary;
    case 'skills':
      return !!(profile.skills && profile.skills.length > 0);
    case 'experiences':
      return !!(profile.experiences && profile.experiences.length > 0);
    case 'education':
      return !!(profile.education && profile.education.length > 0);
    case 'certificates':
      return !!(profile.certificates && profile.certificates.length > 0);
    case 'projects':
      return !!(profile.projects && profile.projects.length > 0);
    case 'languages':
      return !!(profile.languages && profile.languages.length > 0);
    default:
      return false;
  }
}

/**
 * Get count of items in a section (for arrays)
 */
export function getSectionCount(
  section: ImportableSection,
  profile: ExtractedProfile | undefined
): number | null {
  if (!profile) return null;

  switch (section) {
    case 'skills':
      return profile.skills?.length ?? 0;
    case 'experiences':
      return profile.experiences?.length ?? 0;
    case 'education':
      return profile.education?.length ?? 0;
    case 'certificates':
      return profile.certificates?.length ?? 0;
    case 'projects':
      return profile.projects?.length ?? 0;
    case 'languages':
      return profile.languages?.length ?? 0;
    default:
      return null;
  }
}
