#!/usr/bin/env node
/**
 * Guard: the pdf.js **worker** the app loads must come from the exact same
 * `pdfjs-dist` copy as the pdf.js **API** that `react-pdf` re-exports.
 *
 * Why this script exists
 * ----------------------
 * `apps/web/src/components/pdf/pdf-preview-modal.tsx` does:
 *
 *   import { pdfjs } from 'react-pdf';                 // API  → react-pdf's pdfjs-dist
 *   pdfjs.GlobalWorkerOptions.workerSrc = new URL(
 *     'pdfjs-dist/build/pdf.worker.min.mjs',           // worker → apps/web's pdfjs-dist
 *     import.meta.url,
 *   ).toString();
 *
 * `react-pdf` pins `pdfjs-dist` to an EXACT version, so under pnpm's isolated
 * node_modules it always gets its own nested copy. If `apps/web` declares a
 * different `pdfjs-dist` version, the two specifiers above resolve to two
 * different packages — and pdf.js hard-refuses to run when the API and worker
 * versions disagree ("The API version X does not match the Worker version Y").
 * Every PDF preview then fails with a generic "PDF konnte nicht geladen werden".
 *
 * This has now broken production twice:
 *   • fixed in PR #534 by pinning to react-pdf's version
 *   • silently re-introduced by two Dependabot bumps (5.4.296 → 6.0.227 → 6.1.200),
 *     which neither lint nor typecheck can see because it is a pure
 *     dependency-resolution problem with no source-code footprint.
 *
 * So the check runs in CI and in `cf:build` (the deploy path). If it fails,
 * set `pdfjs-dist` in apps/web/package.json to the version react-pdf pins and
 * run `pnpm install`.
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);

/** Resolve a package.json through a given resolver, tolerating exports maps. */
function readPackageJson(resolver, specifier) {
  // `pdfjs-dist` exports `./package.json`, but don't rely on it: fall back to
  // walking up from a subpath that is definitely exported.
  try {
    return require(resolver.resolve(`${specifier}/package.json`));
  } catch {
    const entry = resolver.resolve(specifier);
    let dir = path.dirname(entry);
    while (dir !== path.dirname(dir)) {
      const candidate = path.join(dir, 'package.json');
      try {
        const pkg = require(candidate);
        if (pkg.name === specifier) return pkg;
      } catch {
        // keep walking
      }
      dir = path.dirname(dir);
    }
    throw new Error(`Could not locate package.json for "${specifier}"`);
  }
}

function fail(lines) {
  console.error(`\n❌ pdf.js version mismatch — PDF preview would fail at runtime.\n`);
  for (const line of lines) console.error(`   ${line}`);
  console.error('');
  process.exit(1);
}

let appPdfjs;
let reactPdf;
let bundledPdfjs;

try {
  // What `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`
  // resolves to from inside apps/web.
  appPdfjs = readPackageJson(require, 'pdfjs-dist');
  reactPdf = readPackageJson(require, 'react-pdf');
  // What `import { pdfjs } from 'react-pdf'` actually runs.
  bundledPdfjs = readPackageJson(createRequire(require.resolve('react-pdf')), 'pdfjs-dist');
} catch (error) {
  fail([
    'Could not resolve pdfjs-dist / react-pdf. Run `pnpm install` first.',
    String(error instanceof Error ? error.message : error),
  ]);
}

if (appPdfjs.version !== bundledPdfjs.version) {
  fail([
    `react-pdf@${reactPdf.version} bundles pdfjs-dist@${bundledPdfjs.version} (the pdf.js API),`,
    `but apps/web resolves pdfjs-dist@${appPdfjs.version} (the pdf.js worker).`,
    '',
    'pdf.js refuses to run when the API and worker versions differ, so every',
    'PDF preview fails with "PDF konnte nicht geladen werden".',
    '',
    'Fix: in apps/web/package.json set',
    `      "pdfjs-dist": "${bundledPdfjs.version}"`,
    '  then run `pnpm install` and commit the lockfile.',
  ]);
}

console.log(
  `✅ pdf.js in lockstep — react-pdf@${reactPdf.version} + pdfjs-dist@${appPdfjs.version} ` +
    `(worker: ${path.relative(
      path.resolve(fileURLToPath(import.meta.url), '../..'),
      require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'),
    )})`,
);
