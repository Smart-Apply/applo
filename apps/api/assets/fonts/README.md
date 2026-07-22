# Bundled PDF fonts

OFL-licensed font families embedded into generated PDFs by `@react-pdf/renderer`.
Registered lazily in `apps/api/src/pdf-v2/react-pdf-loader.ts`; selected per
application via `templateSettings.fontFamily` (see `design-tokens.ts`).

| Folder | Family (react-pdf name) | Source | License |
|---|---|---|---|
| `lato/` | Lato | [google/fonts `ofl/lato`](https://github.com/google/fonts/tree/main/ofl/lato) | OFL 1.1 (`lato/OFL.txt`) |
| `source-sans/` | Source Sans 3 | [adobe-fonts/source-sans `release` TTF](https://github.com/adobe-fonts/source-sans) | OFL 1.1 (`source-sans/OFL.txt`) |
| `merriweather/` | Merriweather | [SorkinType/Merriweather `fonts/ttf`](https://github.com/SorkinType/Merriweather) | OFL 1.1 (`merriweather/OFL.txt`) |

Static Regular / Bold / Italic cuts only — react-pdf subsets the TTFs on
embed, so per-document overhead stays at roughly 20–30 KB. Variable fonts are
deliberately avoided (fontkit weight-instance selection is unreliable).

In Docker the folder is copied to `/app/assets/fonts` (see `infra/Dockerfile`);
locally it resolves relative to the apps/api working directory. A missing
folder only logs a warning — templates fall back to the built-in
Helvetica/Times faces.

Adding a family: see the checklist in
[`.github/skills/pdf-react-pdf-template.md`](../../../.github/skills/pdf-react-pdf-template.md).
