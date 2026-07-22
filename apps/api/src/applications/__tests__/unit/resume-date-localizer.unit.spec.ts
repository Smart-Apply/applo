import { formatDate, formatDateRange } from '../../resume-template.util';
import {
  localizeStoredResumeDates,
  mapDateTokens,
} from '../../resume-date-localizer.util';

describe('formatDateRange (Unit, language-switch export fix)', () => {
  const start = new Date('2023-10-01T00:00:00.000Z');
  const end = new Date('2024-12-15T00:00:00.000Z');

  it('formats German by default', () => {
    expect(formatDateRange(start, end)).toBe('Okt. 2023 – Dez. 2024');
  });

  it('formats English month labels for en', () => {
    expect(formatDateRange(start, end, false, 'en')).toBe('Oct 2023 – Dec 2024');
  });

  it('uses the localized present label for current roles', () => {
    expect(formatDateRange(start, null, true, 'de')).toBe('Okt. 2023 – Heute');
    expect(formatDateRange(start, null, true, 'en')).toBe('Oct 2023 – Present');
  });

  it('uses the localized present label when the end date is missing', () => {
    expect(formatDateRange(start, null, false, 'de')).toBe('Okt. 2023 – Heute');
    expect(formatDateRange(start, null, false, 'en')).toBe('Oct 2023 – Present');
  });

  it('formats single dates per language', () => {
    expect(formatDate(start, 'de')).toBe('Okt. 2023');
    expect(formatDate(start, 'en')).toBe('Oct 2023');
    expect(formatDate(null, 'en')).toBe('');
  });
});

describe('mapDateTokens (Unit)', () => {
  it('maps German month abbreviations and Heute to English', () => {
    expect(mapDateTokens('Okt. 2023 – Heute', 'en')).toBe('Oct 2023 – Present');
    expect(mapDateTokens('März 2020 – Dez. 2021', 'en')).toBe('Mar 2020 – Dec 2021');
    expect(mapDateTokens('Jan. 2019 – Aktuell', 'en')).toBe('Jan 2019 – Present');
  });

  it('maps English month abbreviations and Present to German', () => {
    expect(mapDateTokens('Oct 2023 – Present', 'de')).toBe('Okt. 2023 – Heute');
    expect(mapDateTokens('May 2020 – Mar 2021', 'de')).toBe('Mai 2020 – März 2021');
  });

  it('maps full month names', () => {
    expect(mapDateTokens('Oktober 2023 – Heute', 'en')).toBe('October 2023 – Present');
    expect(mapDateTokens('March 2021', 'de')).toBe('März 2021');
  });

  it('leaves plain years and unknown text untouched', () => {
    expect(mapDateTokens('2019 – 2023', 'en')).toBe('2019 – 2023');
    expect(mapDateTokens('Seit Projektbeginn', 'en')).toBe('Seit Projektbeginn');
  });

  it('is idempotent when content already matches the target language', () => {
    expect(mapDateTokens('Oct 2023 – Present', 'en')).toBe('Oct 2023 – Present');
    expect(mapDateTokens('Okt. 2023 – Heute', 'de')).toBe('Okt. 2023 – Heute');
  });
});

describe('localizeStoredResumeDates (Unit)', () => {
  it('re-derives experience dateRange from raw ISO dates in the target language', () => {
    const resume = {
      experiences: [
        {
          title: 'Pflegefachkraft',
          dateRange: 'Okt. 2023 – Heute',
          startDate: '2023-10-01T00:00:00.000Z',
          isCurrent: true,
        },
      ],
    };
    expect(localizeStoredResumeDates(resume, 'en').experiences![0].dateRange).toBe(
      'Oct 2023 – Present',
    );
    expect(localizeStoredResumeDates(resume, 'de').experiences![0].dateRange).toBe(
      'Okt. 2023 – Heute',
    );
  });

  it('falls back to token mapping on legacy rows without raw dates', () => {
    const resume = {
      experiences: [{ dateRange: 'Jan. 2020 – Aktuell' }],
    };
    expect(localizeStoredResumeDates(resume, 'en').experiences![0].dateRange).toBe(
      'Jan 2020 – Present',
    );
  });

  it('formats raw-ISO project/certification dates that legacy rows rendered verbatim', () => {
    const resume = {
      projects: [{ date: '2023-05-01T00:00:00.000Z' }],
      certifications: [{ date: '2024-03-01T00:00:00.000Z' }],
    };
    const en = localizeStoredResumeDates(resume, 'en');
    expect(en.projects![0].date).toBe('May 2023');
    expect(en.certifications![0].date).toBe('Mar 2024');
    const de = localizeStoredResumeDates(resume, 'de');
    expect(de.projects![0].date).toBe('Mai 2023');
  });

  it('keeps free-text project dates and plain-year education untouched', () => {
    const resume = {
      projects: [{ date: '2024' }],
      education: [{ year: '2019 – 2023' }],
    };
    const localized = localizeStoredResumeDates(resume, 'en');
    expect(localized.projects![0].date).toBe('2024');
    expect(localized.education![0].year).toBe('2019 – 2023');
  });

  it('re-derives education year from raw dates', () => {
    const resume = {
      education: [
        {
          year: 'Okt. 2019 – Sept. 2023',
          startDate: '2019-10-01T00:00:00.000Z',
          endDate: '2023-09-30T00:00:00.000Z',
        },
      ],
    };
    expect(localizeStoredResumeDates(resume, 'en').education![0].year).toBe(
      'Oct 2019 – Sep 2023',
    );
  });

  it('never mutates the input', () => {
    const resume = { experiences: [{ dateRange: 'Okt. 2023 – Heute' }] };
    localizeStoredResumeDates(resume, 'en');
    expect(resume.experiences[0].dateRange).toBe('Okt. 2023 – Heute');
  });
});
