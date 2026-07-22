/**
 * Executive Serif — formal serif design (TEMPLATE_CUSTOMIZATION §3.7).
 *
 * Layout: centered name over a double rule (thick + thin), centered
 * small-caps-style section headers with hairline rules, italic dates,
 * traditional single column. The stately counterpart to harvard-classic:
 * more decoration (double rules, centered headers), aimed at leadership /
 * senior roles across all professions.
 *
 * Fonts
 * -----
 * Defaults to react-pdf's built-in Times family (Times-Roman/Bold/Italic);
 * per application, `meta.fontFamily` can swap in a bundled OFL family —
 * Merriweather being the natural serif choice (react-pdf-loader.ts).
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

const ACCENT_FALLBACK = '#1a1a1a';

/** Built-in serif faces used when no bundled family is selected. */
const FALLBACK_FONTS = {
  regular: 'Times-Roman',
  bold: 'Times-Bold',
  italic: 'Times-Italic',
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

/** Source values are pt-based like harvard-classic — no px conversion. */
const inch = (n: number) => n * 72;

const FS_BASE = {
  xs: 9,
  contact: 10,
  base: 11,
  section: 12,
  name: 22,
};

const SP_BASE = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 9,
  lg: 14,
  xl: 22,
};

const COLORS = {
  text: '#1a1a1a',
  textMuted: '#555555',
  hairline: '#9a9a9a',
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
    page: {
      paddingTop: inch(0.55),
      paddingRight: inch(0.65),
      paddingBottom: inch(0.5),
      paddingLeft: inch(0.65),
      ...F.regular,
      fontSize: FS.base,
      color: COLORS.text,
      lineHeight: lh(1.45),
    },
    coverLetterPage: {
      paddingTop: inch(0.65),
      paddingRight: inch(0.8),
      paddingBottom: inch(0.6),
      paddingLeft: inch(0.8),
      ...F.regular,
      fontSize: FS.base,
      color: COLORS.text,
      lineHeight: lh(1.65),
    },

    // ── Header (centered name over a double rule) ──
    header: { textAlign: 'center', position: 'relative' },
    headerPhoto: {
      position: 'absolute',
      right: 0,
      top: 0,
      width: 58,
      height: 77,
      objectFit: 'cover',
    },
    candidateName: {
      fontSize: FS.name,
      ...F.bold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: accent,
      lineHeight: 1.15,
      marginBottom: SP.xxs,
    },
    jobTitle: {
      fontSize: FS.contact,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: COLORS.textMuted,
      marginBottom: SP.sm,
      lineHeight: 1.3,
    },
    doubleRuleThick: {
      borderTopWidth: 1.6,
      borderTopColor: accent,
      borderTopStyle: 'solid',
    },
    doubleRuleThin: {
      marginTop: 1.5,
      borderTopWidth: 0.6,
      borderTopColor: accent,
      borderTopStyle: 'solid',
      marginBottom: SP.sm,
    },
    contactInfo: {
      fontSize: FS.contact,
      color: COLORS.textMuted,
      textAlign: 'center',
      marginBottom: SP.md,
      lineHeight: lh(1.4),
    },
    contactLink: { color: COLORS.textMuted, textDecoration: 'none' },
    contactSeparator: { color: COLORS.hairline },

    // ── Sections (centered small-caps-style headers with side margins) ──
    section: { marginTop: SP.lg },
    sectionTitle: {
      fontSize: FS.section,
      ...F.bold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      textAlign: 'center',
      color: accent,
      marginBottom: SP.xs,
      lineHeight: 1.3,
    },
    sectionRule: {
      borderTopWidth: 0.6,
      borderTopColor: COLORS.hairline,
      borderTopStyle: 'solid',
      marginBottom: SP.md,
      marginLeft: inch(0.6),
      marginRight: inch(0.6),
    },
    summaryText: { fontSize: FS.base, lineHeight: lh(1.55), textAlign: 'justify' },

    item: { marginBottom: SP.md },
    itemHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: SP.md,
    },
    itemTitle: { fontSize: FS.base, ...F.bold, flex: 1, lineHeight: 1.35 },
    itemDate: { fontSize: FS.contact, ...F.italic, color: COLORS.textMuted, lineHeight: 1.35 },
    itemSubtitle: { fontSize: FS.base, ...F.italic, color: COLORS.textMuted, lineHeight: 1.35 },
    itemBody: { marginTop: SP.xs },
    bulletList: { marginTop: SP.xs },
    bulletRow: { flexDirection: 'row', marginBottom: 2 },
    bulletGlyph: { width: 10, fontSize: FS.xs, color: accent, paddingTop: 1 },
    bulletText: { fontSize: FS.base, lineHeight: lh(1.45) },

    skillRow: { flexDirection: 'row', gap: 5, marginBottom: 2.5 },
    skillCategoryLabel: { fontSize: FS.base, ...F.bold },
    skillList: { fontSize: FS.base, flex: 1, lineHeight: lh(1.45) },
    languagesText: { fontSize: FS.base, textAlign: 'center', lineHeight: lh(1.45) },

    // ── Cover letter ──
    coverLetterDate: {
      fontSize: FS.contact,
      ...F.italic,
      color: COLORS.textMuted,
      textAlign: 'right',
      marginTop: SP.md,
      marginBottom: SP.lg,
    },
    coverLetterParagraph: {
      fontSize: FS.base,
      lineHeight: lh(1.65),
      marginBottom: SP.md,
      textAlign: 'justify',
    },
    coverLetterList: { marginBottom: SP.md },
    coverLetterListItem: { fontSize: FS.base, lineHeight: lh(1.65) },
    coverLetterClosing: { marginTop: SP.xl, fontSize: FS.base },
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
          createElement(Text, { key: `sep-${idx}`, style: separatorStyle }, '\u00A0•\u00A0'),
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

export const ExecutiveSerifFactory: ReactPdfTemplateFactory = {
  resume: (rp) => {
    const { Document, Page, View, Text, Image } = rp;
    const ContactLine = ContactLineFactory(rp);

    return function ExecutiveSerifResume({ data, meta }: ReactPdfResumeProps): ReactElement {
      const accent = meta.accentColor || ACCENT_FALLBACK;
      const { fs: FS, sp: SP, lineHeight } = resolveDesignTokens(meta, FS_BASE, SP_BASE);
      const F = resolveFontStack(meta.fontFamily, FALLBACK_FONTS);
      const renderRichText = createRichTextRenderer(rp, { strong: F.bold, em: F.italic });
      const styles = buildStyles(rp, accent, FS, SP, lineHeight, F);
      // Prefer the explicit export-request language (data.language) over the
      // DB template row's language (meta.language). See issue #536.
      const lang = data.language || meta.language || 'en';
      const contactParts = buildContactParts(data);

      const sectionHeader = (labelKey: string) => [
        createElement(Text, { style: styles.sectionTitle }, tLabel(labelKey, lang)),
        createElement(View, { style: styles.sectionRule }),
      ];

      const sections: Record<string, ReactNode> = {
        profile:
          data.summary &&
          createElement(
            View,
            { style: styles.section, wrap: false },
            ...sectionHeader('resume.summary'),
            renderRichText(data.summary, { paragraph: styles.summaryText }),
          ),
        experience:
          data.experiences &&
          data.experiences.length > 0 &&
          createElement(
            View,
            { style: styles.section },
            ...sectionHeader('resume.experience'),
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
                  [exp.company, exp.location].filter(Boolean).join(', '),
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
                        createElement(Text, { style: styles.bulletGlyph }, '·'),
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
            ...sectionHeader('resume.education'),
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
            ...sectionHeader('resume.projects'),
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
                        createElement(Text, { style: styles.bulletGlyph }, '·'),
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
            ...sectionHeader('resume.skills'),
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
            ...sectionHeader('resume.certifications'),
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
            ...sectionHeader('resume.languages'),
            createElement(
              Text,
              { style: styles.languagesText },
              (data.languages ?? [])
                .map((l) => `${l.name}${l.level ? ` (${tLevel(l.level, lang)})` : ''}`)
                .join('  •  '),
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
          { size: 'LETTER', style: styles.page },
          createElement(
            View,
            { style: styles.header },
            meta.photoUrl
              ? createElement(Image, { src: meta.photoUrl, style: styles.headerPhoto })
              : null,
            createElement(Text, { style: styles.candidateName }, data.candidateName),
            data.targetJobTitle &&
              createElement(Text, { style: styles.jobTitle }, data.targetJobTitle),
            createElement(View, { style: styles.doubleRuleThick }),
            createElement(View, { style: styles.doubleRuleThin }),
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

    return function ExecutiveSerifCoverLetter({
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
            createElement(View, { style: styles.doubleRuleThick }),
            createElement(View, { style: styles.doubleRuleThin }),
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
