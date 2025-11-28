# Job Posting Extraction Prompt

You are an expert at extracting job posting information from web page content.

URL: {{url}}

**🏢 COMPANY HINT: {{companyHint}}**

## TASK

Extract these 5 fields from the job posting:

1. **company** - Use COMPANY HINT if provided. NEVER use job board names (Workwise, LinkedIn, Indeed, StepStone)
2. **title** - The position name (e.g., "Senior Software Engineer", "Marketing Manager")
3. **location** - City and country (e.g., "Berlin, Germany", "Remote")
4. **language** - ISO 639-1 code ("de", "en", "fr", "es", "it", "pt", "nl", "pl", "tr", "ar", "zh", "ja")
5. **fullText** - ALL job content as clean, readable text (see instructions below)

## EXTRACTION RULES

### What to IGNORE

- Job board UI elements (navigation, headers, footers, buttons)
- Job board names in text ("via Workwise", "posted on LinkedIn")
- Login prompts, cookie banners, ads
- "Similar jobs", "Apply now" buttons, social sharing
- Unrelated website content

### What to EXTRACT for fullText

Extract ALL relevant job posting content including:
- Job description/overview
- Requirements/qualifications
- Responsibilities/tasks
- Benefits/perks
- Salary (if mentioned)
- Company information
- Team/culture information
- Application deadline (if mentioned)

**Format Rules:**
- Keep the original language (don't translate)
- Preserve section structure with headers (if they exist)
- Keep bullet points and formatting
- Remove duplicate information
- Clean up formatting (no excessive line breaks)

**Example fullText structure:**
```
Über das Unternehmen
Wir sind ein führendes Tech-Unternehmen...

Deine Aufgaben
- Design und Implementierung von Cloud-Lösungen
- Zusammenarbeit mit Kunden
- Optimierung bestehender Systeme

Dein Profil
- 5+ Jahre Erfahrung mit AWS
- Sehr gute Deutsch- und Englischkenntnisse
- Bachelor in Informatik oder vergleichbar

Benefits
- Flexible Arbeitszeiten und Remote-Option
- 30 Tage Urlaub
- Weiterbildungsbudget
```

## Company Name Detection

- Look for "Über [Company]", "About [Company]" sections
- Look for company descriptions
- If COMPANY HINT is provided → use it
- If job board + company both present → use company (NOT job board)

**Examples:**
- "Platform Architect at SAPERED via Workwise" → company = "SAPERED GmbH"
- Job on LinkedIn for "adesso SE" → company = "adesso SE"

## Job Posting Content

**IMPORTANT:** The content below may include specially marked sections (=== SECTION NAME ===).
If you see these sections, prioritize them:
- **=== COMPANY SECTION ===** → Use for company name
- **=== FULL TEXT ===** → Use for fullText field

{{content}}

## EXAMPLE

Input content:
```
Über SAPERED GmbH
Wir sind eine Agentur für Learning & Development...

Was erwartet dich?
Du verantwortest den Betrieb unserer Learning & Development Plattformen.
Du analysierst und optimierst unsere bestehende Systemlandschaft.

Was solltest du mitbringen?
Du hast ein sehr gutes Verständnis für Plattformarchitekturen und APIs.
Du hast idealerweise Erfahrung mit digitalen Lernplattformen.

Bonuspunkte
Erfahrung im Learning & Development Umfeld
```

Expected output:
```json
{
  "company": "SAPERED GmbH",
  "title": "Platform Architect - AWS / APIs / Cloud",
  "location": "Berlin, Germany",
  "language": "de",
  "fullText": "Über SAPERED GmbH\nWir sind eine Agentur für Learning & Development...\n\nWas erwartet dich?\n- Du verantwortest den Betrieb unserer Learning & Development Plattformen.\n- Du analysierst und optimierst unsere bestehende Systemlandschaft.\n\nWas solltest du mitbringen?\n- Du hast ein sehr gutes Verständnis für Plattformarchitekturen und APIs.\n- Du hast idealerweise Erfahrung mit digitalen Lernplattformen.\n\nBonuspunkte\n- Erfahrung im Learning & Development Umfeld"
}
```

## Response Format

Respond with a valid JSON object matching this schema:
{{schema}}
