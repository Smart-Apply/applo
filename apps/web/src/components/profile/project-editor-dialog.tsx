'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Project } from '@/types';
import { useTranslations } from 'next-intl';

/* ── Technology tag input ── */
function TechTagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const t = useTranslations('profile');
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (tags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) {
        toast.error(t('projects.errors.duplicate'));
        return;
      }
      onChange([...tags, trimmed]);
      setInput('');
    },
    [tags, onChange, t],
  );

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-[3px] border border-input bg-background px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            className="rounded-[2px] p-0.5 transition-colors hover:bg-primary/20"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
          } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags.length - 1);
          }
        }}
        onBlur={() => {
          if (input.trim()) addTag(input);
        }}
        placeholder={tags.length === 0 ? t('projects.tagPlaceholder') : ''}
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

interface ProjectEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item being edited; `null`/`undefined` opens add mode. */
  initial?: Project | null;
  onSubmit: (project: Project) => void;
}

/** Add / edit form for a single project, rendered as a dialog on the profile page. */
export function ProjectEditorDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: ProjectEditorDialogProps) {
  const t = useTranslations('profile');
  const isEditing = !!initial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {isEditing ? t('projects.editTitle') : t('projects.newTitle')}
          </DialogTitle>
        </DialogHeader>
        <ProjectForm
          initial={initial}
          isEditing={isEditing}
          onSubmit={(proj) => {
            onSubmit(proj);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({
  initial,
  isEditing,
  onSubmit,
  onCancel,
}: {
  initial?: Project | null;
  isEditing: boolean;
  onSubmit: (project: Project) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('profile');

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [technologies, setTechnologies] = useState<string[]>(initial?.technologies ?? []);
  const [url, setUrl] = useState(initial?.url ?? '');
  const [startDate, setStartDate] = useState(
    initial?.startDate ? initial.startDate.split('T')[0] : '',
  );
  const [endDate, setEndDate] = useState(initial?.endDate ? initial.endDate.split('T')[0] : '');
  const [urlError, setUrlError] = useState('');

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = setTimeout(() => nameRef.current?.focus(), 120);
    return () => clearTimeout(focus);
  }, []);

  const validate = (): boolean => {
    if (!name.trim()) {
      toast.error(t('projects.errors.name'));
      nameRef.current?.focus();
      return false;
    }
    if (url.trim()) {
      try {
        new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`);
      } catch {
        setUrlError(t('projects.errors.url'));
        return false;
      }
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast.error(t('projects.errors.dateOrder'));
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    let finalUrl = url.trim() || undefined;
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = `https://${finalUrl}`;
    }

    onSubmit({
      ...(initial?.id && { id: initial.id }),
      name: name.trim(),
      description: description.trim() || undefined,
      technologies: technologies.length > 0 ? technologies : undefined,
      url: finalUrl,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-5 px-6 pb-6 pt-2">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('projects.name')} <span className="text-destructive">*</span>
        </label>
        <Input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('projects.namePlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('labels.description')}{' '}
          <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('projects.descriptionPlaceholder')}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Technologies */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('projects.methods')}{' '}
          <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
        </label>
        <TechTagInput tags={technologies} onChange={setTechnologies} />
        <p className="text-xs text-muted-foreground">{t('projects.confirmWithEnter')}</p>
      </div>

      {/* URL */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('labels.link')}{' '}
          <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
        </label>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError('');
            }}
            placeholder="github.com/user/project"
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
          />
        </div>
        {urlError && <p className="text-xs text-destructive">{urlError}</p>}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {t('labels.from')}{' '}
            <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
          </label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {t('labels.to')}{' '}
            <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
          </label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t('education.ongoingHelp')}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!name.trim()}>
          {isEditing ? t('actions.save') : t('actions.add')}
        </Button>
      </div>
    </div>
  );
}
