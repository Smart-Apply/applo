/**
 * Modern Two-Column — light two-column design (TEMPLATE_CUSTOMIZATION §3.7).
 *
 * Layout: full-width header (name + accent rule), then a light LEFT sidebar
 * (contact, skills, languages, certifications) separated by a hairline from
 * the MAIN column (profile, experience, projects, education). Unlike
 * elegant-sidebar there is no colored chrome — white page, accent used
 * sparingly (name, section titles, rules) so the design stays ATS-friendly.
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

const ACCENT_FALLBACK = '#334155';

/** Built-in faces used when no bundled family is selected (the original look). */
const FALLBACK_FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
};

/** Flat default order; the sidebar/main split filters it (elegant-sidebar pattern). */
const DEFAULT_SECTION_ORDER = [
  'profile',
  'experience',
  'projects',
  'education',
  'skills',
  'certs',
  'languages',
] as const;

const SIDEBAR_SECTIONS = ['skills', 'certs', 'languages'] as const;

/** CSS px → PDF pt at Chromium's print default (96 DPI). */
const px = (n: number) => n * 0.75;

/** CSS inches → PDF pt. */
const inch = (n: number) => n * 72;

const FS_BASE = {
  xs: px(9),
  sm: px(10),
  base: px(11),
  md: px(12),
  lg: px(14),
  xl: px(17),
  xxl: px(26),
};

const SP_BASE = {
  xs: px(2),
  sm: px(4),
  md: px(8),
  lg: px(12),
  xl: px(18),
};

const COLORS = {
  text: '#1f2937',
  textSecondary: '#374151',
  textMuted: '#6b7280',
  hairline: '#d1d5db',
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
      paddingTop: inch(0.45),
      paddingRight: inch(0.5),
      paddingBottom: inch(0.45),
      paddingLeft: inch(0.5),
      ...F.regular,
      fontSize: FS.base,
      color: COLORS.text,
      lineHeight: lh(1.5),
    },
    coverLetterPage: {
      paddingTop: inch(0.6),
      paddingRight: inch(0.7),
      paddingBottom: inch(0.55),
      paddingLeft: inch(0.7),
      ...F.regular,
      fontSize: FS.md,
      color: COLORS.text,
      lineHeight: lh(1.7),
    },

    // ── Header (full width, left-aligned, accent rule below) ──
    header: { marginBottom: SP.lg, position: 'relative' },
    headerPhoto: {
      position: 'absolute',
      right: 0,
      top: 0,
      width: 63,
      height: 84,
      objectFit: 'cover',
    },
    candidateName: {
      fontSize: FS.xxl,
      ...F.bold,
      letterSpacing: px(0.4),
      color: COLORS.text,
      lineHeight: 1.15,
    },
    jobTitle: {
      fontSize: FS.md,
      color: accent,
      ...F.bold,
      marginTop: SP.xs,
      lineHeight: 1.3,
    },
    headerRule: {
      marginTop: SP.md,
      borderBottomWidth: 2,
      borderBottomColor: accent,
      borderBottomStyle: 'solid',
      width: px(56),
    },

    // ── Two-column row ──
    contentRow: { flexDirection: 'row', marginTop: SP.md },
    sidebar: {
      width: '30%',
      paddingRight: SP.lg,
      borderRightWidth: 0.75,
      borderRightColor: COLORS.hairline,
      borderRightStyle: 'solid',
    },
    main: { width: '70%', paddingLeft: SP.lg },

    // ── Sections ──
    section: { marginBottom: SP.lg },
    sectionTitle: {
      fontSize: FS.sm,
      ...F.bold,
      letterSpacing: px(0.8),
      textTransform: 'uppercase',
      color: accent,
      marginBottom: SP.md,
      lineHeight: 1.3,
    },
    summaryText: { fontSize: FS.base, lineHeight: lh(1.6), color: COLORS.textSecondary },

    // ── Main items ──
    item: { marginBottom: SP.md },
    itemHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: SP.md,
    },
    itemTitle: { fontSize: FS.md, ...F.bold, color: COLORS.text, flex: 1, lineHeight: 1.3 },
    itemDate: { fontSize: FS.sm, color: COLORS.textMuted, lineHeight: 1.3 },
    itemSubtitle: {
      fontSize: FS.base,
      color: accent,
      marginTop: px(1),
      lineHeight: 1.3,
    },
    itemLocation: { fontSize: FS.sm, color: COLORS.textMuted, lineHeight: 1.3 },
    itemBody: { marginTop: SP.sm },
    bulletList: { marginTop: SP.sm },
    bulletRow: { flexDirection: 'row', marginBottom: px(2.5) },
    bulletGlyph: { width: px(12), fontSize: FS.xs, color: accent, ...F.bold, paddingTop: 1 },
    bulletText: { fontSize: FS.base, lineHeight: lh(1.45), color: COLORS.textSecondary },

    // ── Sidebar content ──
    sideItem: { fontSize: FS.sm, color: COLORS.textSecondary, marginBottom: px(3), lineHeight: lh(1.4) },
    sideGroupLabel: {
      fontSize: FS.xs,
      ...F.bold,
      letterSpacing: px(0.6),
      textTransform: 'uppercase',
      color: COLORS.textMuted,
      marginTop: SP.sm,
      marginBottom: px(2),
    },
    sideLink: { fontSize: FS.sm, color: COLORS.textSecondary, textDecoration: 'none', marginBottom: px(3) },

    // ── Cover letter ──
    coverLetterHeader: { marginBottom: SP.xl, position: 'relative' },
    coverLetterContact: {
      fontSize: FS.sm,
      color: COLORS.textMuted,
      marginTop: SP.sm,
      lineHeight: lh(1.5),
    },
    contactLink: { color: COLORS.textMuted, textDecoration: 'none' },
    contactSeparator: { color: COLORS.hairline },
    coverLetterDate: {
      fontSize: FS.sm,
      color: COLORS.textMuted,
      textAlign: 'right',
      marginBottom: SP.lg,
    },
    coverLetterParagraph: { fontSize: FS.md, lineHeight: lh(1.7), marginBottom: SP.md },
    coverLetterList: { marginBottom: SP.md },
    coverLetterListItem: { fontSize: FS.md, lineHeight: lh(1.7) },
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

export const ModernTwoColumnFactory: ReactPdfTemplateFactory = {
  resume: (rp) => {
    const { Document, Page, View, Text, Link, Image } = rp;

    return function ModernTwoColumnResume({ data, meta }: ReactPdfResumeProps): ReactElement {
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
                  View,
                  { style: styles.itemHeaderRow },
                  createElement(Text, { style: styles.itemSubtitle }, exp.company),
                  exp.location && createElement(Text, { style: styles.itemLocation }, exp.location),
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
                        createElement(Text, { style: styles.bulletGlyph }, '›'),
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
                        createElement(Text, { style: styles.bulletGlyph }, '›'),
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
                { key: `sk-${idx}` },
                cat.type && createElement(Text, { style: styles.sideGroupLabel }, cat.type),
                createElement(Text, { style: styles.sideItem }, cat.skills.join(', ')),
              ),
            ),
          ),
        certs:
          data.certifications &&
          data.certifications.length > 0 &&
          createElement(
            View,
            { style: styles.section, wrap: false },
            createElement(
              Text,
              { style: styles.sectionTitle },
              tLabel('resume.certifications', lang),
            ),
            ...data.certifications.map((cert, idx) =>
              createElement(
                View,
                { key: `cert-${idx}`, style: { marginBottom: SP.sm } },
                createElement(Text, { style: { ...styles.sideItem, ...F.bold } }, cert.name),
                (cert.issuer || cert.date) &&
                  createElement(
                    Text,
                    { style: styles.sideItem },
                    [cert.issuer, cert.date].filter(Boolean).join(' · '),
                  ),
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
            ...data.languages.map((l, idx) =>
              createElement(
                Text,
                { key: `lng-${idx}`, style: styles.sideItem },
                `${l.name}${l.level ? ` — ${tLevel(l.level, lang)}` : ''}`,
              ),
            ),
          ),
      };

      const ordered = resolveSectionOrder(data.sectionOrder, DEFAULT_SECTION_ORDER);
      const sidebarKeys = ordered.filter((k) => (SIDEBAR_SECTIONS as readonly string[]).includes(k));
      const mainKeys = ordered.filter((k) => !(SIDEBAR_SECTIONS as readonly string[]).includes(k));

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
            createElement(View, { style: styles.headerRule }),
          ),
          createElement(
            View,
            { style: styles.contentRow },
            createElement(
              View,
              { style: styles.sidebar },
              // Contact block always leads the sidebar.
              createElement(
                View,
                { style: styles.section, wrap: false },
                createElement(Text, { style: styles.sectionTitle }, tLabel('contact', lang)),
                ...contactParts.map((part, idx) =>
                  part.href
                    ? createElement(
                        Link,
                        { key: `c-${idx}`, src: part.href, style: styles.sideLink },
                        part.label,
                      )
                    : createElement(Text, { key: `c-${idx}`, style: styles.sideItem }, part.label),
                ),
              ),
              ...sidebarKeys.map((key) => createElement(View, { key }, sections[key])),
            ),
            createElement(
              View,
              { style: styles.main },
              ...mainKeys.map((key) => createElement(View, { key }, sections[key])),
            ),
          ),
        ),
      );
    };
  },

  coverLetter: (rp) => {
    const { Document, Page, View, Text, Link } = rp;

    return function ModernTwoColumnCoverLetter({
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
            { style: styles.coverLetterHeader },
            createElement(Text, { style: styles.candidateName }, data.candidateName),
            data.targetJobTitle &&
              createElement(Text, { style: styles.jobTitle }, data.targetJobTitle),
            createElement(
              Text,
              { style: styles.coverLetterContact },
              ...contactParts.flatMap((part, idx) => {
                const node = part.href
                  ? createElement(
                      Link,
                      { key: `lnk-${idx}`, src: part.href, style: styles.contactLink },
                      part.label,
                    )
                  : createElement(Text, { key: `txt-${idx}` }, part.label);
                return idx > 0
                  ? [
                      createElement(
                        Text,
                        { key: `sep-${idx}`, style: styles.contactSeparator },
                        '\u00A0|\u00A0',
                      ),
                      node,
                    ]
                  : [node];
              }),
            ),
            createElement(View, { style: styles.headerRule }),
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
