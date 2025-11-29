# Automatic Language Detection & Translation

## Overview
The Smart Apply system automatically detects the language of job postings and adapts all generated content (cover letters, resumes, and profile summaries) to match that language.

## Features

### 1. Language Detection
- **Supported Languages:** German (de), English (en)
- **Detection Method:** Keyword frequency analysis
- **Fallback:** English if language cannot be determined
- **Scoring Algorithm:**
  - Counts occurrences of language-specific keywords
  - German markers: "Sie", "Ihr", "unsere", "wir", "werden", etc. (20+ keywords)
  - English markers: "you", "your", "our", "we", "will", etc. (20+ keywords)
  - Language detected when score difference ≥ 3

### 2. Template Translation
All PDF section headers automatically adapt to the detected language:

| Section | German (de) | English (en) |
|---------|-------------|--------------|
| Summary | Profil | Professional Summary |
| Skills | Fähigkeiten | Skills |
| Experience | Berufserfahrung | Professional Experience |
| Education | Ausbildung | Education |
| Certifications | Zertifikate | Certifications |
| Languages | Sprachen | Languages |
| Projects | Projekte | Projects |

**Implementation:**
- Handlebars helper: `{{t "resume.summary" @root.language}}`
- Location: `apps/api/src/pdf/template-renderer.service.ts`

### 3. LLM Content Generation
Cover letters and resume content are generated in the detected language:

**Cover Letter:**
- Formal address adapts to language (Sie/du vs. you)
- Greeting/closing examples provided for each language
- Prompt instructs LLM: "YOU MUST write the cover letter in {{languageName}}!"

**Resume:**
- Skill category names translate (e.g., "Programmiersprachen" vs "Programming Languages")
- Experience descriptions fully translated
- Technical terms remain in English (React, Docker, AWS, etc.)
- Prompt instructs LLM: "YOU MUST USE {{languageName}} for all experience descriptions!"

### 4. Profile Summary Translation
If a user's profile summary is in German but the job posting is in English (or vice versa), the summary is automatically translated:

**Translation Trigger:**
- Profile language (assumed 'de') ≠ Job posting language
- Happens during application creation

**Translation Rules:**
- Bidirectional: German ↔ English
- Preserves technical terms (React, Node.js, TypeScript, etc.)
- Maintains professional tone
- Avoids literal word-for-word translation

**Example:**
```
Original (de): "Erfahrener Full-Stack Developer mit 5+ Jahren Erfahrung in React und Node.js."
Translated (en): "Experienced Full-Stack Developer with 5+ years of experience in React and Node.js."
```

## Implementation Details

### Code Locations

1. **Language Detection**
   - File: `apps/api/src/applications/applications.service.ts`
   - Method: `detectLanguage(text: string): 'de' | 'en' | null`

2. **Translation Helper**
   - File: `apps/api/src/pdf/template-renderer.service.ts`
   - Method: `registerHelpers()`
   - Helper: `Handlebars.registerHelper('t', ...)`

3. **LLM Context Builders**
   - File: `apps/api/src/llm/llm.service.ts`
   - Methods: `buildATSCoverLetterContext()`, `buildATSResumeContext()`
   - Adds: `language` and `languageName` to template context

4. **LLM Prompts**
   - Files: `apps/api/prompts/cover-letter-ats.md`, `apps/api/prompts/resume-ats.md`
   - Variables: `{{language}}`, `{{languageName}}`

5. **Summary Translation**
   - File: `apps/api/src/llm/llm.service.ts`
   - Method: `translateSummary(summary: string, fromLang: string, toLang: string): Promise<string>`
   - Integration: `apps/api/src/applications/applications.service.ts` (create, createWithGeneration)

### Data Flow

```
Job Posting Text
  ↓
detectLanguage() → 'de' | 'en' | null
  ↓
buildATSCoverLetterContext() + buildATSResumeContext()
  ↓ (adds language + languageName)
LLM Generation (Azure OpenAI)
  ↓ (generates content in detected language)
PDF Template Rendering
  ↓ ({{t}} helper translates section headers)
Final PDF (fully localized)
```

**Summary Translation Flow:**
```
Profile Summary (original language)
  ↓
Application Creation (detect job language)
  ↓
If languages differ:
  translateSummary() → LLM translation
  ↓
Resume Template Data (translated summary)
  ↓
Final PDF (summary in correct language)
```

## Testing

### Unit Tests
- **Location:** `apps/api/src/llm/llm-translation.spec.ts`
- **Coverage:**
  - ✅ German → English translation
  - ✅ English → German translation
  - ✅ Technical term preservation
  - ✅ Same-language no-op
  - ✅ Empty/null summary handling

### Template Tests
- **Location:** `apps/api/src/pdf/multilingual-templates.spec.ts`
- **Coverage:**
  - ✅ German section headers (Profil, Fähigkeiten, etc.)
  - ✅ English section headers (Professional Summary, Skills, etc.)
  - ✅ Fallback to English when language is null
  - ✅ Cover letter language passthrough

### Integration Tests
- **Location:** `apps/api/src/applications/summary-translation.integration.spec.ts`
- **Coverage:**
  - ✅ Summary translation for English job postings
  - ✅ No translation for German job postings
  - ✅ Graceful error handling

## Configuration

No configuration needed - feature is enabled by default.

## Limitations & Future Enhancements

### Current Limitations
1. Only German and English supported (not French, Spanish, etc.)
2. Profile language assumed to be German ('de')
3. Mixed-language job postings may yield unpredictable results

### Future Enhancements
1. **Add More Languages:**
   - French (fr), Spanish (es), Italian (it)
   - Extend `languageNames` mapping in `template-renderer.service.ts`
   - Add translation keys for new languages

2. **User Language Preference:**
   - Add `language` field to `Profile` model
   - Respect user's preferred language instead of assuming German
   - Update Prisma schema: `language String @default("de")`

3. **Language Override:**
   - Allow users to manually select document language
   - API: `POST /api/v1/applications { jobPostingId, language: 'en' }`

4. **Confidence Score:**
   - Return detection confidence: `{ language: 'en', confidence: 0.85 }`
   - Show warning if confidence is low (<0.6)

## Best Practices

### For Users
1. Write your profile summary in your native language
2. The system will automatically translate it for foreign job applications
3. Technical terms (React, Docker, AWS) stay in English regardless of language

### For Developers
1. Always use `@root.language` in nested Handlebars contexts
2. Add new translation keys to `template-renderer.service.ts` languageNames mapping
3. Test both languages when adding new PDF sections
4. Preserve technical terms in LLM translation prompts

## Examples

### Scenario 1: German Profile + English Job
```
Profile Summary (de): "Erfahrener Backend-Entwickler mit Expertise in Node.js und PostgreSQL."
Job Posting (en): "We are seeking a talented Backend Developer..."
→ Detected Language: en
→ PDF Headers: Professional Summary, Skills, Experience...
→ Translated Summary: "Experienced Backend Developer with expertise in Node.js and PostgreSQL."
→ LLM Content: All in English
```

### Scenario 2: German Profile + German Job
```
Profile Summary (de): "Leidenschaftlicher Frontend-Entwickler mit React und TypeScript."
Job Posting (de): "Wir suchen einen Frontend-Entwickler..."
→ Detected Language: de
→ PDF Headers: Profil, Fähigkeiten, Berufserfahrung...
→ Summary: Original (no translation)
→ LLM Content: All in German
```

## Troubleshooting

### Issue: Section headers in wrong language
- **Cause:** Language not propagated to template data
- **Check:** `resumeData.language` in `application.processor.ts`
- **Fix:** Ensure `language` field is included in template data

### Issue: Summary not translating
- **Cause:** Job language same as profile language ('de')
- **Check:** `detectLanguage()` output
- **Fix:** Verify job posting contains enough English keywords

### Issue: Technical terms translated incorrectly
- **Cause:** LLM prompt missing technical term preservation instruction
- **Check:** `prompts/resume-ats.md` translation rules
- **Fix:** Add: "Keep technical terms like React, Docker, AWS in English"

## Related Documentation
- [PDF Generation](./PDF_GENERATION.md)
- [ATS Optimization](../ATS_OPTIMIZATION.md)
- [Testing Guide](../guides/TESTING_GUIDE.md)

1. **Konsistenz:** Alle generierten Inhalte sollten in derselben Sprache sein
2. **Fachbegriffe:** Technische Begriffe (React, Docker, etc.) bleiben in Englisch
3. **Formatierung:** Datum- und Zahlenformate passen sich an die Sprache an
4. **Anrede:** Formelle Anrede wird sprachspezifisch gewählt (Sie/du vs. you)

## Bekannte Limitierungen

- Unterstützte Sprachen: Derzeit nur Deutsch und Englisch
- Gemischte Texte: Bei stark gemischten Texten könnte die Erkennung fehlschlagen
- Minimum-Schwellenwert: Mindestens 2-3 sprachspezifische Wörter erforderlich

## Zukünftige Erweiterungen

- [ ] Unterstützung für weitere Sprachen (Französisch, Spanisch, Italienisch)
- [ ] Machine Learning basierte Spracherkennung für höhere Genauigkeit
- [ ] Manuelle Sprachüberschreibung durch den Benutzer
- [ ] Sprachspezifische PDF-Templates (Datumsformate, etc.)
