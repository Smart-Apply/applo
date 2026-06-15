import { resolveResponseFormat, __testSchemas } from '../../schemas/v1-schemas';

describe('resolveResponseFormat (Unit, #8)', () => {
  it('returns a strict json_schema for the ats-keywords template', () => {
    const rf = resolveResponseFormat('v1/ats-keywords.md', 'irrelevant prompt');
    expect(rf?.type).toBe('json_schema');
    if (rf?.type === 'json_schema') {
      expect(rf.json_schema.name).toBe('ats_keywords');
      expect(rf.json_schema.strict).toBe(true);
      expect(rf.json_schema.schema).toBe(__testSchemas.atsKeywordsSchema);
    }
  });

  it('returns a strict json_schema for the resume-rewrite template', () => {
    const rf = resolveResponseFormat('v1/resume-rewrite.md', 'irrelevant');
    expect(rf?.type).toBe('json_schema');
    if (rf?.type === 'json_schema') {
      expect(rf.json_schema.name).toBe('resume_rewrite');
      expect(rf.json_schema.strict).toBe(true);
    }
  });

  it('falls back to json_object for skill-selector when the prompt mentions json', () => {
    const rf = resolveResponseFormat('v1/skill-selector.md', 'Return ONLY valid JSON.');
    expect(rf).toEqual({ type: 'json_object' });
  });

  it('falls back to json_object for any unregistered template that mentions json', () => {
    const rf = resolveResponseFormat('v1/profile-keywords.md', 'output json please');
    expect(rf).toEqual({ type: 'json_object' });
  });

  it('returns undefined when the prompt does not mention json and has no schema', () => {
    expect(resolveResponseFormat('v1/something.md', 'no structured hint here')).toBeUndefined();
  });

  it('matches json as a whole word only (not "jsonp" substrings)', () => {
    expect(resolveResponseFormat('v1/x.md', 'this mentions jsonpath only')).toBeUndefined();
    expect(resolveResponseFormat('v1/x.md', 'emit JSON now')).toEqual({ type: 'json_object' });
  });
});

describe('strict JSON schemas (Unit, #8)', () => {
  const collectObjects = (node: unknown, acc: Record<string, unknown>[] = []): Record<string, unknown>[] => {
    if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (obj.type === 'object') acc.push(obj);
      for (const value of Object.values(obj)) collectObjects(value, acc);
    }
    return acc;
  };

  for (const [name, schema] of Object.entries(__testSchemas)) {
    describe(name, () => {
      it('sets additionalProperties:false on every object node', () => {
        for (const obj of collectObjects(schema)) {
          expect(obj.additionalProperties).toBe(false);
        }
      });

      it('lists every property in required (strict-mode rule)', () => {
        for (const obj of collectObjects(schema)) {
          const props = Object.keys((obj.properties as Record<string, unknown>) ?? {});
          const required = (obj.required as string[]) ?? [];
          expect(required.sort()).toEqual(props.sort());
        }
      });
    });
  }
});
