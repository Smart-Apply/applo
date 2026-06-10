/**
 * Lazy ESM loader for @react-pdf/renderer.
 *
 * The api package is CommonJS (tsconfig `module: node16`) but
 * @react-pdf/renderer is ESM-only. Static `import` produces `require()` at
 * runtime which throws ERR_REQUIRE_ESM. We resolve the module exactly once
 * via dynamic import and cache the namespace.
 *
 * All template components and the renderer service go through this helper —
 * they receive the namespace as an argument rather than importing the package
 * directly.
 */

import type { ComponentType, ReactElement } from 'react';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import * as nodePath from 'node:path';

export type ReactPdfStyle = Record<string, unknown>;

export interface ReactPdfStyleSheet {
  create<T extends Record<string, ReactPdfStyle>>(styles: T): T;
}

// Component types are intentionally `ComponentType<any>`: the upstream
// @react-pdf/renderer prop types live in ESM declarations we can't import
// from this CJS package, and modelling them by hand (style, size, src, wrap,
// etc. — different per component) would be both incomplete and brittle.
// Templates use `createElement(...)` so we accept any prop shape; runtime
// validation is the responsibility of @react-pdf/renderer.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ReactPdfNamespace {
  Document: ComponentType<any>;
  Page: ComponentType<any>;
  View: ComponentType<any>;
  Text: ComponentType<any>;
  Link: ComponentType<any>;
  Image: ComponentType<any>;
  StyleSheet: ReactPdfStyleSheet;
  Font: { register: (config: unknown) => void };
  renderToBuffer: (element: ReactElement) => Promise<Buffer>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

let cached: Promise<ReactPdfNamespace> | undefined;

/**
 * Resolve the absolute entry file of @react-pdf/renderer.
 *
 * We can't `import('@react-pdf/renderer')` by bare specifier from the runtime
 * loader: the api package is CommonJS and compiles to dist/apps/api/, but a raw
 * `import()` resolves node_modules relative to that COMPILED file. dist/ is a
 * sibling of apps/, so Node walks dist/ → repo-root/node_modules and never sees
 * apps/api/node_modules (where pnpm's isolated layout keeps react-pdf). In the
 * Docker image this happens to work because /app/node_modules is symlinked to
 * apps/api/node_modules — but local dev has no such symlink, hence
 * `Cannot find package '@react-pdf/renderer'`.
 *
 * Resolving to an absolute path against a base that DOES have the package in
 * scope, then importing that path as a file:// URL, sidesteps the node_modules
 * walk entirely and works identically in dev (ts-node or compiled) and prod.
 */
function resolveReactPdfEntry(): string {
  const require = createRequire(__filename);
  // First base that contains the package wins. Covers:
  //   • process.cwd() — `nest start` / `node dist/apps/api/main` run from
  //     apps/api (or /app in Docker, where node_modules symlinks to it).
  //   • the apps/api package root relative to this file, whether it's compiled
  //     (dist/apps/api/pdf-v2) or run via ts-node (apps/api/src/pdf-v2) — both
  //     sit four levels below their respective apps/api root.
  //   • repo root, in case the package is ever hoisted there.
  const searchBases = [
    process.cwd(),
    nodePath.resolve(__dirname, '../../../../apps/api'),
    nodePath.resolve(__dirname, '../../../..'),
    __dirname,
  ];
  return require.resolve('@react-pdf/renderer', { paths: searchBases });
}

export function loadReactPdf(): Promise<ReactPdfNamespace> {
  if (!cached) {
    // Use `new Function` to bypass TS's CJS resolver — it would otherwise
    // emit `require()` for a static `import()` of a known package, which
    // throws ERR_REQUIRE_ESM at runtime against the ESM-only react-pdf
    // package. The Function indirection forces a real dynamic import.
    const dynamicImport = new Function('m', 'return import(m)') as (
      m: string,
    ) => Promise<ReactPdfNamespace>;
    const entryUrl = pathToFileURL(resolveReactPdfEntry()).href;
    cached = dynamicImport(entryUrl);
  }
  return cached;
}
