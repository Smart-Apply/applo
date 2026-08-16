#!/usr/bin/env node
/**
 * Guard: every external service the API can talk to must be listed in
 * `docs/security/SUBPROCESSORS.md`, which the privacy policy page mirrors.
 *
 * Why this script exists
 * ----------------------
 * The privacy policy under `apps/web/src/app/(legal)/datenschutz/page.tsx` is a
 * hand-maintained document with no coupling to the code. It drifted far enough
 * to describe an architecture that never existed (Azure App Server + Azure
 * Database for PostgreSQL, when the stack is Fly.io + Neon + Cloudflare
 * Workers) while omitting three recipients that personal data is actually sent
 * to — Mistral, Azure AI Foundry and Microsoft Graph (issue #806).
 *
 * Nothing held the two copies together, so they drifted silently. This check
 * makes the drift loud: adding a credential env var for a new service fails CI
 * until the service is documented as a sub-processor.
 *
 * It can only detect a *missing* entry, not a *wrong description*. Changing what
 * a service receives still requires editing the text by hand.
 *
 * If this fails: add a row to `docs/security/SUBPROCESSORS.md` (including the
 * new env key in the "Env-Schlüssel" column) and update §5 of the privacy
 * policy page in the same PR. If the variable is not a third-party credential,
 * add it to IGNORED below with a one-line reason.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const SCHEMA = path.join(repoRoot, 'apps/api/src/config/env.schema.ts');
const DOC = path.join(repoRoot, 'docs/security/SUBPROCESSORS.md');

/**
 * Names that match the credential pattern but do not identify a third party.
 * Every entry needs a reason — an unexplained exclusion is how the list rots.
 */
const IGNORED = new Map([
  ['JWT_SECRET', 'our own signing key, no recipient'],
  ['JWT_REFRESH_SECRET', 'our own signing key, no recipient'],
  ['TWO_FACTOR_ENCRYPTION_KEY', 'local AES key for data at rest'],
  ['MAILBOX_TOKEN_ENCRYPTION_KEY', 'local AES key for data at rest'],
  ['LLM_USAGE_HASH_SALT', 'local HMAC key, never leaves the process'],
  ['DATABASE_URL', 'covered by the Neon row; carries credentials inline'],
  ['DIRECT_URL', 'covered by the Neon row; carries credentials inline'],
]);

/** Suffixes that mark a value as "credential for an external service". */
const CREDENTIAL_PATTERN =
  /_(API_KEY|SECRET|SECRET_KEY|CLIENT_SECRET|ACCESS_KEY_ID|SECRET_ACCESS_KEY|TOKEN|SIGNING_KEY|REST_URL|ENDPOINT|DSN)$/;

function envVarNames(source) {
  // Top-level Zod object keys: two-space indented SCREAMING_SNAKE followed by ':'
  return [...source.matchAll(/^ {2}([A-Z][A-Z0-9_]*):/gm)].map((m) => m[1]);
}

const schemaSource = readFileSync(SCHEMA, 'utf8');
const doc = readFileSync(DOC, 'utf8');

const missing = envVarNames(schemaSource)
  .filter((name) => CREDENTIAL_PATTERN.test(name))
  .filter((name) => !IGNORED.has(name))
  .filter((name) => !doc.includes(name));

if (missing.length > 0) {
  console.error('\n✖ Sub-processor documentation is out of date.\n');
  console.error(
    'These credential env vars in apps/api/src/config/env.schema.ts are not\n' +
      'mentioned in docs/security/SUBPROCESSORS.md:\n',
  );
  for (const name of missing) console.error(`    ${name}`);
  console.error(
    '\nAdd the service to docs/security/SUBPROCESSORS.md (with the env key in\n' +
      'the "Env-Schlüssel" column) and mirror it in §5 of\n' +
      'apps/web/src/app/(legal)/datenschutz/page.tsx — Art. 13(1)(e) DSGVO\n' +
      'requires the recipients to be named. If the variable is not a\n' +
      'third-party credential, add it to IGNORED in this script with a reason.\n',
  );
  process.exit(1);
}

console.log('✓ Every credential env var is covered by docs/security/SUBPROCESSORS.md');
