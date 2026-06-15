'use client';

import { useEffect, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Bold, Italic, List, ListOrdered, Quote } from 'lucide-react';
import { FontSize } from '@/lib/tiptap';
import { FontSizeDropdown } from './font-size-dropdown';
import { cn } from '@/lib/utils';

interface CoverLetterEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /**
   * Inline mode: render just the editable body (no toolbar, no bordered box) so
   * it can sit inside the WYSIWYG letter document. Keyboard formatting still
   * works via StarterKit.
   */
  inline?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
}

function ToolbarButton({ onClick, active, icon, label, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition-colors',
        active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {icon}
    </button>
  );
}

export function CoverLetterEditor({ value, onChange, disabled, inline }: CoverLetterEditorProps) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          bulletList: { keepMarks: true },
          orderedList: { keepMarks: true },
          // Cover letters are prose — never code. Disabling these prevents stray
          // Markdown (e.g. an indented line from the AI) from rendering as a
          // monospaced code block with escaped entities.
          code: false,
          codeBlock: false,
        }),
        TextStyle,
        FontSize,
      ],
      content: value || '<p></p>',
      editable: !disabled,
      immediatelyRender: false, // Required for Next.js SSR
      editorProps: {
        attributes: {
          class: inline
            ? 'tiptap-editor max-w-none focus:outline-none'
            : 'tiptap-editor min-h-[320px] max-w-none px-4 py-3 text-sm focus:outline-none',
        },
      },
      onUpdate({ editor }) {
        onChange(editor.getHTML());
      },
    },
    [], // Remove value from dependencies - we handle updates via useEffect
  );

  // Sync external value changes into the editor (without emitting an update).
  useEffect(() => {
    if (!editor) return;

    const current = editor.getHTML();

    if (value && value !== current) {
      // Use queueMicrotask to avoid React state update conflicts
      queueMicrotask(() => {
        editor.commands.setContent(value, { emitUpdate: false });
      });
    }

    if (!value && current !== '<p></p>') {
      queueMicrotask(() => {
        editor.commands.clearContent();
      });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return inline ? (
      <div className="min-h-[220px]" />
    ) : (
      <div className="min-h-[320px] rounded-lg border border-slate-200 bg-white" />
    );
  }

  if (inline) {
    return <EditorContent editor={editor} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
        <FontSizeDropdown editor={editor} disabled={disabled} />
        <div className="mx-1 h-6 w-px bg-slate-200" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          icon={<Bold className="h-4 w-4" />}
          label="Fett"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          icon={<Italic className="h-4 w-4" />}
          label="Kursiv"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          icon={<List className="h-4 w-4" />}
          label="Aufzählung"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          icon={<ListOrdered className="h-4 w-4" />}
          label="Nummerierte Liste"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          icon={<Quote className="h-4 w-4" />}
          label="Zitat"
          disabled={disabled}
        />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
