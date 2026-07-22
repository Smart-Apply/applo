'use client';

import { useCallback, useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FONT_SIZES } from '@/lib/tiptap';
import { cn } from '@/lib/utils';

interface FontSizeDropdownProps {
  editor: Editor;
  disabled?: boolean;
  className?: string;
}

/**
 * Font size dropdown for Tiptap editor toolbar
 * 
 * Shows currently selected font size (or blank for mixed selection).
 * Font size changes are visible only in PDF output, not in the editor view.
 * 
 * @example
 * <FontSizeDropdown editor={editor} disabled={false} />
 */
export function FontSizeDropdown({ editor, disabled, className }: FontSizeDropdownProps) {
  const t = useTranslations('editor');
  const [currentFontSize, setCurrentFontSize] = useState('');

  // Update font size when selection changes
  useEffect(() => {
    const updateFontSize = () => {
      const attrs = editor.getAttributes('textStyle');
      setCurrentFontSize(attrs.fontSize || '');
    };

    // Initial update
    updateFontSize();

    // Listen for selection and transaction updates
    editor.on('selectionUpdate', updateFontSize);
    editor.on('transaction', updateFontSize);

    return () => {
      editor.off('selectionUpdate', updateFontSize);
      editor.off('transaction', updateFontSize);
    };
  }, [editor]);

  const handleChange = useCallback(
    (value: string) => {
      if (value === '' || value === 'default') {
        // Clear font size (reset to default)
        editor.chain().focus().unsetFontSize().run();
      } else {
        // Set specific font size
        editor.chain().focus().setFontSize(value).run();
      }
    },
    [editor],
  );

  return (
    <Select
      value={currentFontSize}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-8 w-[80px] text-xs',
          className,
        )}
        aria-label={t('fontSize.ariaLabel')}
      >
        <SelectValue placeholder={t('fontSize.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {FONT_SIZES.map((size) => (
          <SelectItem
            key={size.value || 'default'}
            value={size.value || 'default'}
            className="text-xs"
          >
            {size.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
