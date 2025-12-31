import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

export type FontSizeOptions = {
  types: string[];
  defaultSize: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * Set the font size
       */
      setFontSize: (size: string) => ReturnType;
      /**
       * Unset the font size (reset to default)
       */
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * Font sizes available in the editor dropdown
 * These match the PDF template CSS variables for consistency
 */
export const FONT_SIZES = [
  { label: 'Standard', value: '' },
  { label: '10pt', value: '10px' },
  { label: '11pt', value: '11px' },
  { label: '12pt', value: '12px' },
  { label: '13pt', value: '13px' },
  { label: '14pt', value: '14px' },
  { label: '16pt', value: '16px' },
  { label: '18pt', value: '18px' },
] as const;

/**
 * Default font size for the editor (matches --font-size-md in PDF templates)
 */
export const DEFAULT_FONT_SIZE = '12px';

/**
 * Custom Tiptap extension for font size support
 * 
 * This extension adds font-size as a mark that wraps text in
 * <span style="font-size: Xpx"> elements.
 * 
 * The font size is visible only in PDF output, not in the editor view
 * (handled via CSS in globals.css).
 */
export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
      defaultSize: DEFAULT_FONT_SIZE,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain()
            .setMark('textStyle', { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

export default FontSize;
