/**
 * Minimal Single-Column — airy one-column design (TEMPLATE_CUSTOMIZATION §3.7).
 *
 * Layout: centered light-weight name, thin hairline separators, small
 * uppercase letter-spaced section titles, generous whitespace throughout.
 * No boxes, no chrome — the most restrained (and extremely ATS-safe) design
 * in the catalog. Accent appears only in section titles and the name rule.
 *
 * Fonts
 * -----
 * Defaults to react-pdf's built-in Helvetica family; per application,
 * `meta.fontFamily` can swap in a bundled OFL family (react-pdf-loader.ts).
 *
 * Factory pattern: receives the lazily-loaded @react-pdf/renderer namespace.
 * See react-pdf-loader.ts for why we don't import the package statically.
 */

import { createElement, type ReactElement, type ReactNode } from 'react';
import { resolveDesignTokens, resolveFontStack, type FontStack } from '../design-tokens';
import { tLabel, tLevel } from '../i18n';
import { createRichTextRenderer } from '../rich-text';
import { resolveSectionOrder } from '../template-data';
import type { ReactPdfNamespace } from '../react-pdf-loader';
import type {
  ReactPdfCoverLetterProps,
  ReactPdfResumeProps,
  ReactPdfTemplateFactory,
} from '../types';

const ACCENT_FALLBACK = '#1f2937';

/** Built-in faces used when no bundled family is selected (the original look). */
const FALLBACK_FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
};

const DEFAULT_SECTION_ORDER = [
  'profile',
  'experience',
  'education',
  'projects',
  'skills',
  'certs',
  'languages',
] as const;

/** CSS px → PDF pt at Chromium's print default (96 DPI). */
const px = (n: number) => n * 0.75;

/** CSS inches → PDF pt. */
const inch = (n: number) => n * 72;

const FS_BASE = {
  xs: px(9),
  sm: px(10),
  base: px(11),
  md: px(12),
  lg: px(15),
  xxl: px(30),
};

const SP_BASE = {
  xs: px(3),
  sm: px(6),
  md: px(10),
  lg: px(16),
  xl: px(24),
};

const COLORS = {
  text: '#26272b',
  textSecondary: '#3f4046',
  textMuted: '#75767c',
  hairline: '#e4e4e7',
};

const buildStyles = (
  rp: ReactPdfNamespace,
  accent: string,
  FS: typeof FS_BASE,
  SP: typeof SP_BASE,
  lh: (base: number) => number,
  F: FontStack,
) =>
  rp.StyleSheet.create({
    resumePage: {
      paddingTop: inch(0.6),
      paddingRight: inch(0.75),
      paddingBottom: inch(0.55),
      paddingLeft: inch(0.75),
      ...F.regular,
      fontSize: FS.base,
      color: COLORS.text,
      lineHeight: lh(1.6),
    },
    coverLetterPage: {
      paddingTop: inch(0.7),
      paddingRight: inch(0.85),
      paddingBottom: inch(0.6),
      paddingLeft: inch(0.85),
      ...F.regular,
      fontSize: FS.md,
      color: COLORS.text,
      lineHeight: lh(1.75),
    },

    // ── Header (centered, light, generous) ──
    header: { textAlign: 'center', marginBottom: SP.xl, position: 'relative' },
    headerPhoto: {
      position: 'absolute',
      right: 0,
      top: 0,
      width: 60,
      height: 80,
      objectFit: 'cover',
    },
    candidateName: {
      fontSize: FS.xxl,
      ...F.regular,
      letterSpacing: px(1),
      textTransform: 'uppercase',
      color: COLORS.text,
      lineHeight: 1.2,
    },
    jobTitle: {
      fontSize: FS.sm,
      letterSpacing: px(0.8),
      textTransform: 'uppercase',
      color: accent,
      marginTop: SP.sm,
      lineHeight: 1.3,
    },
    contactInfo: {
      fontSize: FS.sm,
      color: COLORS.textMuted,
      marginTop: SP.md,
      lineHeight: lh(1.5),
    },
    contactLink: { color: COLORS.textMuted, textDecoration: 'none' },
    contactSeparator: { color: COLORS.hairline },

    // ── Sections ──
    section: {
      marginBottom: SP.lg,
      paddingTop: SP.md,
      borderTopWidth: 0.75,
      borderTopColor: COLORS.hairline,
      borderTopStyle: 'solid',
    },
    sectionTitle: {
      fontSize: FS.xs,
      ...F.bold,
      letterSpacing: px(0.8),
      textTransform: 'uppercase',
      color: accent,
      marginBottom: SP.md,
      lineHeight: 1.3,
    },
    summaryText: { fontSize: FS.base, lineHeight: lh(1.7), color: COLORS.textSecondary },

    item: { marginBottom: SP.md },
    itemHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: SP.md,
    },
    itemTitle: { fontSize: FS.md, ...F.bold, color: COLORS.text, flex: 1, lineHeight: 1.35 },
    itemDate: { fontSize: FS.sm, color: COLORS.textMuted, lineHeight: 1.35 },
    itemSubtitle: { fontSize: FS.base, color: COLORS.textMuted, marginTop: px(1), lineHeight: 1.35 },
    itemBody: { marginTop: SP.xs },
    bulletList: { marginTop: SP.sm },
    bulletRow: { flexDirection: 'row', marginBottom: px(3) },
    bulletGlyph: { width: px(14), fontSize: FS.xs, color: COLORS.textMuted, paddingTop: 1 },
    bulletText: { fontSize: FS.base, lineHeight: lh(1.55), color: COLORS.textSecondary },

    skillRow: { flexDirection: 'row', gap: px(6), marginBottom: px(3) },
    skillCategoryLabel: { fontSize: FS.base, ...F.bold, color: COLORS.text },
    skillList: { fontSize: FS.base, color: COLORS.textSecondary, flex: 1, lineHeight: lh(1.5) },
    languagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: px(4) },
    languageItem: { fontSize: FS.base, color: COLORS.textSecondary, lineHeight: lh(1.5) },

    // ── Cover letter ──
    coverLetterDate: {
      fontSize: FS.sm,
      color: COLORS.textMuted,
      textAlign: 'right',
      marginBottom: SP.lg,
    },
    coverLetterParagraph: { fontSize: FS.md, lineHeight: lh(1.75), marginBottom: SP.md },
    coverLetterList: { marginBottom: SP.md },
    coverLetterListItem: { fontSize: FS.md, lineHeight: lh(1.75) },
    coverLetterClosing: { marginTop: SP.xl, fontSize: FS.md },
    coverLetterClosingPhrase: { marginBottom: SP.md },
    coverLetterSignature: { marginTop: SP.xl, ...F.bold },
  });

interface ContactPart {
  label: string;
  href?: string;
}

function buildContactParts(data: {
  fullAddress?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  github?: string;
}): ContactPart[] {
  const parts: ContactPart[] = [];
  if (data.fullAddress) parts.push({ label: data.fullAddress });
  if (data.phone) parts.push({ label: data.phone });
  if (data.email) parts.push({ label: data.email, href: `mailto:${data.email}` });
  if (data.linkedin) parts.push({ label: 'LinkedIn', href: data.linkedin });
  if (data.github) parts.push({ label: 'GitHub', href: data.github });
  return parts;
}

function ContactLineFactory(rp: ReactPdfNamespace) {
  const { Text, Link } = rp;
  return function ContactLine({
    parts,
    style,
    linkStyle,
    separatorStyle,
  }: {
    parts: ContactPart[];
    style: unknown;
    linkStyle: unknown;
    separatorStyle: unknown;
  }): ReactElement | null {
    const filtered = parts.filter((p) => p.label);
    if (filtered.length === 0) return null;
    const children: ReactElement[] = [];
    filtered.forEach((p, idx) => {
      if (idx > 0) {
        // NBSP-padded separator — see classic-ats for the WinAnsi rationale.
        children.push(
          createElement(Text, { key: `sep-${idx}`, style: separatorStyle }, '\u00A0·\u00A0'),
        );
      }
      if (p.href) {
        children.push(
          createElement(Link, { key: `lnk-${idx}`, src: p.href, style: linkStyle }, p.label),
        );
      } else {
        children.push(createElement(Text, { key: `txt-${idx}` }, p.label));
      }
    });
    return createElement(Text, { style }, children);
  };
}

export const MinimalSingleColumnFactory: ReactPdfTemplateFactory = {
  resume: (rp) => {
    const { Document, Page, View, Text, Image } = rp;
    const ContactLine = ContactLineFactory(rp);

    return function MinimalSingleColumnResume({ data, meta }: ReactPdfResumeProps): ReactElement {
      const accent = meta.accentColor || ACCENT_FALLBACK;
      const { fs: FS, sp: SP, lineHeight } = resolveDesignTokens(meta, FS_BASE, SP_BASE);
      const F = resolveFontStack(meta.fontFamily, FALLBACK_FONTS);
      const renderRichText = createRichTextRenderer(rp, { strong: F.bold, em: F.italic });
      const styles = buildStyles(rp, accent, FS, SP, lineHeight, F);
      // Prefer the explicit export-request language (data.language) over the
      // DB template row's language (meta.language). See issue #536.
      const lang = data.language || meta.language || 'en';
      const contactParts = buildContactParts(data);

      const sections: Record<string, ReactNode> = {
        profile:
          data.summary &&
          createElement(
            View,
            { style: styles.section, wrap: false },
            createElement(Text, { style: styles.sectionTitle }, tLabel('resume.summary', lang)),
            renderRichText(data.summary, { paragraph: styles.summaryText }),
          ),
        experience:
          data.experiences &&
          data.experiences.length > 0 &&
          createElement(
            View,
            { style: styles.section },
            createElement(Text, { style: styles.sectionTitle }, tLabel('resume.experience', lang)),
            ...data.experiences.map((exp, idx) =>
              createElement(
                View,
                { key: `exp-${idx}`, style: styles.item, wrap: false },
                createElement(
                  View,
                  { style: styles.itemHeaderRow },
                  createElement(Text, { style: styles.itemTitle }, exp.title),
                  createElement(Text, { style: styles.itemDate }, exp.dateRange),
                ),
                createElement(
                  Text,
                  { style: styles.itemSubtitle },
                  [exp.company, exp.location].filter(Boolean).join(' · '),
                ),
                exp.description &&
                  createElement(
                    View,
                    { style: styles.itemBody },
                    renderRichText(exp.description, { paragraph: styles.bulletText }),
                  ),
                exp.achievements &&
                  exp.achievements.length > 0 &&
                  createElement(
                    View,
                    { style: styles.bulletList },
                    ...exp.achievements.map((ach, aidx) =>
                      createElement(
                        View,
                        { key: `ach-${aidx}`, style: styles.bulletRow },
                        createElement(Text, { style: styles.bulletGlyph }, '—'),
                        createElement(
                          View,
                          { style: { flex: 1 } },
                          renderRichText(ach, { paragraph: styles.bulletText }),
                        ),
                      ),
                    ),
                  ),
              ),
            ),
          ),
        education:
          data.education &&
          data.education.length > 0 &&
          createElement(
            View,
            { style: styles.section },
            createElement(Text, { style: styles.sectionTitle }, tLabel('resume.education', lang)),
            ...data.education.map((edu, idx) =>
              createElement(
                View,
                { key: `edu-${idx}`, style: styles.item, wrap: false },
                createElement(
                  View,
                  { style: styles.itemHeaderRow },
                  createElement(Text, { style: styles.itemTitle }, edu.institution),
                  createElement(Text, { style: styles.itemDate }, edu.year),
                ),
                createElement(
                  Text,
                  { style: styles.itemSubtitle },
                  `${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}`,
                ),
                edu.description &&
                  createElement(
                    View,
                    { style: styles.itemBody },
                    renderRichText(edu.description, { paragraph: styles.bulletText }),
                  ),
              ),
            ),
          ),
        projects:
          data.projects &&
          data.projects.length > 0 &&
          createElement(
            View,
            { style: styles.section },
            createElement(Text, { style: styles.sectionTitle }, tLabel('resume.projects', lang)),
            ...data.projects.map((proj, idx) =>
              createElement(
                View,
                { key: `proj-${idx}`, style: styles.item, wrap: false },
                createElement(
                  View,
                  { style: styles.itemHeaderRow },
                  createElement(Text, { style: styles.itemTitle }, proj.name),
                  proj.date && createElement(Text, { style: styles.itemDate }, proj.date),
                ),
                proj.description &&
                  createElement(
                    View,
                    { style: styles.itemBody },
                    renderRichText(proj.description, { paragraph: styles.bulletText }),
                  ),
                proj.highlights &&
                  proj.highlights.length > 0 &&
                  createElement(
                    View,
                    { style: styles.bulletList },
                    ...proj.highlights.map((h, hidx) =>
                      createElement(
                        View,
                        { key: `hl-${hidx}`, style: styles.bulletRow },
                        createElement(Text, { style: styles.bulletGlyph }, '—'),
                        createElement(
                          View,
                          { style: { flex: 1 } },
                          renderRichText(h, { paragraph: styles.bulletText }),
                        ),
                      ),
                    ),
                  ),
              ),
            ),
          ),
        skills:
          data.skillCategories &&
          data.skillCategories.length > 0 &&
          createElement(
            View,
            { style: styles.section, wrap: false },
            createElement(Text, { style: styles.sectionTitle }, tLabel('resume.skills', lang)),
            ...data.skillCategories.map((cat, idx) =>
              createElement(
                View,
                { key: `sk-${idx}`, style: styles.skillRow },
                cat.type &&
                  createElement(Text, { style: styles.skillCategoryLabel }, `${cat.type}:`),
                createElement(Text, { style: styles.skillList }, cat.skills.join(', ')),
              ),
            ),
          ),
        certs:
          data.certifications &&
          data.certifications.length > 0 &&
          createElement(
            View,
            { style: styles.section },
            createElement(
              Text,
              { style: styles.sectionTitle },
              tLabel('resume.certifications', lang),
            ),
            ...data.certifications.map((cert, idx) =>
              createElement(
                View,
                { key: `cert-${idx}`, style: styles.item, wrap: false },
                createElement(
                  View,
                  { style: styles.itemHeaderRow },
                  createElement(Text, { style: styles.itemTitle }, cert.name),
                  cert.date && createElement(Text, { style: styles.itemDate }, cert.date),
                ),
                cert.issuer && createElement(Text, { style: styles.itemSubtitle }, cert.issuer),
              ),
            ),
          ),
        languages:
          data.languages &&
          data.languages.length > 0 &&
          createElement(
            View,
            { style: styles.section, wrap: false },
            createElement(Text, { style: styles.sectionTitle }, tLabel('resume.languages', lang)),
            createElement(
              View,
              { style: styles.languagesRow },
              ...data.languages.map((l, idx) =>
                createElement(
                  Text,
                  { key: `lng-${idx}`, style: styles.languageItem },
                  `${l.name}${l.level ? ` (${tLevel(l.level, lang)})` : ''}${
                    idx < (data.languages?.length ?? 0) - 1 ? ' ·' : ''
                  }`,
                ),
              ),
            ),
          ),
      };

      const orderedSectionKeys = resolveSectionOrder(data.sectionOrder, DEFAULT_SECTION_ORDER);

      return createElement(
        Document,
        {
          title: `${data.candidateName} - Resume`,
          author: data.candidateName,
          creator: 'Applo',
        },
        createElement(
          Page,
          { size: 'LETTER', style: styles.resumePage },
          createElement(
            View,
            { style: styles.header },
            meta.photoUrl
              ? createElement(Image, { src: meta.photoUrl, style: styles.headerPhoto })
              : null,
            createElement(Text, { style: styles.candidateName }, data.candidateName),
            data.targetJobTitle &&
              createElement(Text, { style: styles.jobTitle }, data.targetJobTitle),
            createElement(ContactLine, {
              parts: contactParts,
              style: styles.contactInfo,
              linkStyle: styles.contactLink,
              separatorStyle: styles.contactSeparator,
            }),
          ),
          ...orderedSectionKeys.map((key) => createElement(View, { key }, sections[key])),
        ),
      );
    };
  },

  coverLetter: (rp) => {
    const { Document, Page, View, Text } = rp;
    const ContactLine = ContactLineFactory(rp);

    return function MinimalSingleColumnCoverLetter({
      data,
      meta,
    }: ReactPdfCoverLetterProps): ReactElement {
      const accent = meta.accentColor || ACCENT_FALLBACK;
      const { fs: FS, sp: SP, lineHeight } = resolveDesignTokens(meta, FS_BASE, SP_BASE);
      const F = resolveFontStack(meta.fontFamily, FALLBACK_FONTS);
      const renderRichText = createRichTextRenderer(rp, { strong: F.bold, em: F.italic });
      const styles = buildStyles(rp, accent, FS, SP, lineHeight, F);
      const contactParts = buildContactParts(data);

      return createElement(
        Document,
        {
          title: `${data.candidateName} - Cover Letter`,
          author: data.candidateName,
          creator: 'Applo',
        },
        createElement(
          Page,
          { size: 'LETTER', style: styles.coverLetterPage },
          createElement(
            View,
            { style: styles.header },
            createElement(Text, { style: styles.candidateName }, data.candidateName),
            data.targetJobTitle &&
              createElement(Text, { style: styles.jobTitle }, data.targetJobTitle),
            createElement(ContactLine, {
              parts: contactParts,
              style: styles.contactInfo,
              linkStyle: styles.contactLink,
              separatorStyle: styles.contactSeparator,
            }),
          ),
          data.date && createElement(Text, { style: styles.coverLetterDate }, data.date),
          createElement(
            View,
            null,
            renderRichText(data.content, {
              paragraph: styles.coverLetterParagraph,
              list: styles.coverLetterList,
              listItem: styles.coverLetterListItem,
            }),
          ),
          createElement(
            View,
            { style: styles.coverLetterClosing },
            data.closingPhrase &&
              createElement(Text, { style: styles.coverLetterClosingPhrase }, data.closingPhrase),
            createElement(Text, { style: styles.coverLetterSignature }, data.candidateName),
          ),
        ),
      );
    };
  },
};
