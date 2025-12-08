'use client';

import { useEffect, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
  className?: string;
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

/**
 * Reusable rich text editor component powered by Tiptap
 * Supports bold, italic, bullet lists, ordered lists, and blockquotes
 * 
 * @example
 * <RichTextEditor
 *   value={description}
 *   onChange={setDescription}
 *   placeholder="Beschreiben Sie Ihre Aufgaben und Erfolge..."
 *   minHeight="120px"
 * />
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Beginnen Sie mit dem Schreiben...',
  minHeight = '120px',
  disabled = false,
  className,
}: RichTextEditorProps) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          bulletList: { keepMarks: true },
          orderedList: { keepMarks: true },
        }),
      ],
      content: value || '<p></p>',
      editable: !disabled,
      immediatelyRender: false, // Required for Next.js SSR
      editorProps: {
        attributes: {
          class: cn(
            'tiptap-editor max-w-none px-4 py-3 text-sm focus:outline-none',
            `min-h-[${minHeight}]`
          ),
          'data-placeholder': placeholder,
        },
      },
      onUpdate({ editor }) {
        onChange(editor.getHTML());
      },
    },
    [], // Remove value from dependencies - we handle updates via useEffect
  );

  // Sync value changes to editor
  useEffect(() => {
    if (!editor) return;
    
    const current = editor.getHTML();
    
    // Only update if the value actually changed and is different from current
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
    return <div className={cn('rounded-lg border border-slate-200 bg-white', className)} style={{ minHeight }} />;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2">
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
