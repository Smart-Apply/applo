import {
  buildSalutation,
  isValidJobFacts,
  normalizeJobFacts,
  type JobFactsDto,
} from '../../job-facts.util';

describe('buildSalutation (Unit, #5)', () => {
  it('builds a gendered German salutation from a named contact', () => {
    expect(buildSalutation({ contact_name: 'Schmidt', contact_salutation: 'Frau' }, 'de')).toBe(
      'Sehr geehrte Frau Schmidt,',
    );
    expect(buildSalutation({ contact_name: 'Müller', contact_salutation: 'Herr' }, 'de')).toBe(
      'Sehr geehrter Herr Müller,',
    );
  });

  it('builds a gendered English salutation', () => {
    expect(buildSalutation({ contact_name: 'Lee', contact_salutation: 'Frau' }, 'en')).toBe(
      'Dear Ms. Lee,',
    );
    expect(buildSalutation({ contact_name: 'Brown', contact_salutation: 'Herr' }, 'en')).toBe(
      'Dear Mr. Brown,',
    );
  });

  it('keeps an academic title in the name', () => {
    expect(
      buildSalutation({ contact_name: 'Dr. Petra Hoffmann', contact_salutation: 'Frau' }, 'de'),
    ).toBe('Sehr geehrte Frau Dr. Petra Hoffmann,');
  });

  it('addresses an English name even without a gender marker', () => {
    expect(buildSalutation({ contact_name: 'Sarah Lee', contact_salutation: '' }, 'en')).toBe(
      'Dear Sarah Lee,',
    );
  });

  it('falls back to the generic German greeting when gender is unknown', () => {
    expect(buildSalutation({ contact_name: 'Schmidt', contact_salutation: '' }, 'de')).toBe(
      'Sehr geehrte Damen und Herren,',
    );
  });

  it('falls back to the generic greeting when no contact is present', () => {
    expect(buildSalutation({ contact_name: '', contact_salutation: '' }, 'de')).toBe(
      'Sehr geehrte Damen und Herren,',
    );
    expect(buildSalutation(null, 'en')).toBe('Dear Hiring Manager,');
    expect(buildSalutation(undefined, 'de')).toBe('Sehr geehrte Damen und Herren,');
  });

  it('treats unknown languages as English', () => {
    expect(buildSalutation(null, 'fr')).toBe('Dear Hiring Manager,');
  });

  it('does not double the honorific when the name already includes it (German)', () => {
    expect(
      buildSalutation({ contact_name: 'Frau Dr. Petra Hoffmann', contact_salutation: 'Frau' }, 'de'),
    ).toBe('Sehr geehrte Frau Dr. Petra Hoffmann,');
    expect(
      buildSalutation({ contact_name: 'Herr Müller', contact_salutation: 'Herr' }, 'de'),
    ).toBe('Sehr geehrter Herr Müller,');
  });

  it('does not double the honorific when the name already includes it (English)', () => {
    expect(
      buildSalutation({ contact_name: 'Ms. Karen Patel', contact_salutation: 'Frau' }, 'en'),
    ).toBe('Dear Ms. Karen Patel,');
    expect(
      buildSalutation({ contact_name: 'Mr. Brown', contact_salutation: 'Herr' }, 'en'),
    ).toBe('Dear Mr. Brown,');
  });

  it('keeps the honorific in the name when no separate gender marker is given (English)', () => {
    // No contact_salutation → no prefix to prepend, so the name keeps its "Ms.".
    expect(
      buildSalutation({ contact_name: 'Ms. Karen Patel', contact_salutation: '' }, 'en'),
    ).toBe('Dear Ms. Karen Patel,');
  });

  it('preserves academic titles while stripping only the gender honorific', () => {
    expect(
      buildSalutation({ contact_name: 'Frau Prof. Dr. Lange', contact_salutation: 'Frau' }, 'de'),
    ).toBe('Sehr geehrte Frau Prof. Dr. Lange,');
  });

  it('falls back to generic when the name is only an honorific', () => {
    expect(buildSalutation({ contact_name: 'Frau', contact_salutation: 'Frau' }, 'de')).toBe(
      'Sehr geehrte Damen und Herren,',
    );
  });

  it('does not strip a real name that merely starts with an honorific substring', () => {
    // "Frauke" must not be mangled into "ke" — the honorific must be a whole token.
    expect(
      buildSalutation({ contact_name: 'Frauke Schmidt', contact_salutation: 'Frau' }, 'de'),
    ).toBe('Sehr geehrte Frau Frauke Schmidt,');
  });
});

describe('isValidJobFacts (Unit, #5)', () => {
  const valid: JobFactsDto = {
    contact_name: 'Schmidt',
    contact_salutation: 'Frau',
    company_specifics: ['Marktführer für Medizintechnik'],
    asks_salary: true,
    asks_start_date: false,
  };

  it('accepts a well-formed payload', () => {
    expect(isValidJobFacts(valid)).toBe(true);
  });

  it('rejects missing or wrong-typed fields', () => {
    expect(isValidJobFacts(null)).toBe(false);
    expect(isValidJobFacts({ ...valid, company_specifics: 'nope' })).toBe(false);
    expect(isValidJobFacts({ ...valid, asks_salary: 'yes' })).toBe(false);
    expect(isValidJobFacts({ contact_name: 'x' })).toBe(false);
  });
});

describe('normalizeJobFacts (Unit, #5)', () => {
  it('trims, caps specifics at 3, and drops empties', () => {
    const out = normalizeJobFacts({
      contact_name: '  Schmidt ',
      contact_salutation: ' Frau ',
      company_specifics: [' a ', '', 'b', 'c', 'd'],
      asks_salary: true,
      asks_start_date: undefined,
    });
    expect(out.contact_name).toBe('Schmidt');
    expect(out.contact_salutation).toBe('Frau');
    expect(out.company_specifics).toEqual(['a', 'b', 'c']);
    expect(out.asks_salary).toBe(true);
    expect(out.asks_start_date).toBe(false);
  });

  it('returns a safe empty object for null/garbage input', () => {
    expect(normalizeJobFacts(null)).toEqual({
      contact_name: '',
      contact_salutation: '',
      company_specifics: [],
      asks_salary: false,
      asks_start_date: false,
    });
  });
});
