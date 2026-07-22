'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Code, Pencil, Trash2, FolderPlus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeSkillCategory } from '@applo/shared';
import type { Skill } from '@/types';
import { useTranslations } from 'next-intl';

interface SkillsManagerProps {
  skills: Skill[];
  onSkillsChange: (skills: Skill[]) => void;
  disabled?: boolean;
}

function categoryOf(skill: Skill): string | null {
  return normalizeSkillCategory(skill.category);
}

export function SkillsManager({ skills, onSkillsChange, disabled = false }: SkillsManagerProps) {
  const t = useTranslations('profile');
  const uncategorizedLabel = t('skills.uncategorized');
  // Categories that exist but hold no skills yet (freshly added or emptied)
  const [emptyCategories, setEmptyCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  // Which category's skill input is open (null = uncategorized bucket, undefined = none)
  const [activeCategory, setActiveCategory] = useState<string | null | undefined>(undefined);
  const [skillInput, setSkillInput] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const skillInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  // Named categories in first-seen order, then still-empty ones
  const categories: string[] = [];
  for (const skill of skills) {
    const category = categoryOf(skill);
    if (category && !categories.includes(category)) categories.push(category);
  }
  for (const category of emptyCategories) {
    if (!categories.includes(category)) categories.push(category);
  }
  const uncategorized = skills.filter((s) => !categoryOf(s));

  const skillsIn = (category: string) => skills.filter((s) => categoryOf(s) === category);

  const openSkillInput = (category: string | null) => {
    setActiveCategory(category);
    setSkillInput('');
    setTimeout(() => skillInputRef.current?.focus(), 80);
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      toast.error(t('skills.duplicateCategory'));
      return;
    }
    setEmptyCategories([...emptyCategories, name]);
    setNewCategoryName('');
    setShowCategoryInput(false);
    openSkillInput(name);
    toast.success(t('skills.categoryAdded', { name }));
  };

  const renameCategory = () => {
    const from = renamingCategory;
    const to = renameValue.trim();
    setRenamingCategory(null);
    if (!from || !to || to === from) return;
    if (categories.some((c) => c !== from && c.toLowerCase() === to.toLowerCase())) {
      toast.error(t('skills.duplicateCategory'));
      return;
    }
    onSkillsChange(skills.map((s) => (categoryOf(s) === from ? { ...s, category: to } : s)));
    setEmptyCategories(emptyCategories.map((c) => (c === from ? to : c)));
    if (activeCategory === from) setActiveCategory(to);
  };

  const removeCategory = (category: string) => {
    // Skills survive: they move into the uncategorized bucket
    onSkillsChange(
      skills.map((s) => (categoryOf(s) === category ? { ...s, category: null } : s)),
    );
    setEmptyCategories(emptyCategories.filter((c) => c !== category));
    if (activeCategory === category) setActiveCategory(undefined);
    toast.success(t('skills.categoryRemoved', { name: category }));
  };

  const addSkill = () => {
    const name = skillInput.trim();
    if (!name || activeCategory === undefined) return;
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t('skills.duplicateSkill'));
      return;
    }
    onSkillsChange([...skills, { name, category: activeCategory }]);
    if (activeCategory) {
      setEmptyCategories(emptyCategories.filter((c) => c !== activeCategory));
    }
    setSkillInput('');
    skillInputRef.current?.focus();
    toast.success(t('skills.skillAdded', { name }));
  };

  const removeSkill = (skillName: string) => {
    const removed = skills.find((s) => s.name === skillName);
    const category = removed ? categoryOf(removed) : null;
    const next = skills.filter((s) => s.name !== skillName);
    // Keep the category visible when its last skill is removed
    if (category && !next.some((s) => categoryOf(s) === category)) {
      setEmptyCategories((prev) => (prev.includes(category) ? prev : [...prev, category]));
    }
    onSkillsChange(next);
    toast.success(t('skills.skillRemoved', { name: skillName }));
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    } else if (e.key === 'Escape') {
      setActiveCategory(undefined);
      setSkillInput('');
    }
  };

  const handleCategoryKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCategory();
    } else if (e.key === 'Escape') {
      setShowCategoryInput(false);
      setNewCategoryName('');
    }
  };

  const renderSkillChips = (items: Skill[]) => (
    <div className="flex flex-wrap gap-2">
      {items.map((skill, index) => (
        <span
          key={`${skill.name}-${index}`}
          className="group relative inline-flex items-center rounded-md border border-primary bg-primary/10 py-1.5 pl-3 pr-7 text-xs font-medium text-primary transition-all duration-300 ease-in-out hover:bg-primary hover:text-primary-foreground"
        >
          {skill.name}
          <button
            type="button"
            onClick={() => removeSkill(skill.name)}
            disabled={disabled}
            className="absolute right-1.5 shrink-0 rounded-[2px] p-0.5 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t('languages.removeAria', { name: skill.name })}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );

  const renderSkillInput = (category: string | null) =>
    activeCategory === category && (
      <div className="mt-3 flex gap-2">
        <Input
          ref={skillInputRef}
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={handleSkillKeyDown}
          disabled={disabled}
          placeholder={t('skills.skillPlaceholder')}
          className="flex-1"
        />
        <Button type="button" onClick={addSkill} disabled={disabled || !skillInput.trim()} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t('actions.add')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setActiveCategory(undefined);
            setSkillInput('');
          }}
        >
          {t('actions.done')}
        </Button>
      </div>
    );

  const hasContent = skills.length > 0 || categories.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('skills.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('skills.description')}
          </p>
        </div>
        {!showCategoryInput && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowCategoryInput(true);
              setTimeout(() => categoryInputRef.current?.focus(), 80);
            }}
            disabled={disabled}
            size="sm"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            {t('skills.addCategory')}
          </Button>
        )}
      </div>

      {showCategoryInput && (
        <div className="flex gap-2">
          <Input
            ref={categoryInputRef}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={handleCategoryKeyDown}
            disabled={disabled}
            placeholder={t('skills.categoryPlaceholder')}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addCategory}
            disabled={disabled || !newCategoryName.trim()}
            size="sm"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t('actions.create')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCategoryInput(false);
              setNewCategoryName('');
            }}
          >
            {t('actions.cancel')}
          </Button>
        </div>
      )}

      {hasContent ? (
        <div className="space-y-5">
          {categories.map((category) => {
            const items = skillsIn(category);
            return (
              <div key={category} className="rounded-[3px] border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  {renamingCategory === category ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            renameCategory();
                          } else if (e.key === 'Escape') {
                            setRenamingCategory(null);
                          }
                        }}
                        disabled={disabled}
                        className="h-8 max-w-xs"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={renameCategory}
                        aria-label={t('skills.confirmRename')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">
                      {category}{' '}
                      <span className="font-normal text-muted-foreground">({items.length})</span>
                    </p>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openSkillInput(category)}
                      disabled={disabled}
                      aria-label={t('skills.addSkillTo', { category })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRenamingCategory(category);
                        setRenameValue(category);
                      }}
                      disabled={disabled}
                      aria-label={t('skills.renameCategory', { category })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCategory(category)}
                      disabled={disabled}
                      aria-label={t('skills.removeCategory', { category })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {items.length > 0 ? (
                  renderSkillChips(items)
                ) : (
                  <p className="text-xs text-muted-foreground">{t('skills.noSkillsInCategory')}</p>
                )}
                {renderSkillInput(category)}
              </div>
            );
          })}

          <div className="rounded-[3px] border border-dashed border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {uncategorizedLabel}{' '}
                <span className="font-normal text-muted-foreground">({uncategorized.length})</span>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => openSkillInput(null)}
                disabled={disabled}
                aria-label={t('skills.addSkillTo', { category: uncategorizedLabel })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {uncategorized.length > 0 ? (
              renderSkillChips(uncategorized)
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('skills.uncategorizedHelp')}
              </p>
            )}
            {renderSkillInput(null)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[4px] border border-dashed border-border bg-muted/20 py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center border border-border bg-muted">
            <Code className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground">{t('skills.emptyTitle')}</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {t('skills.emptyDescription')}
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCategoryInput(true);
                setTimeout(() => categoryInputRef.current?.focus(), 80);
              }}
              disabled={disabled}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              {t('skills.createCategory')}
            </Button>
            <Button type="button" onClick={() => openSkillInput(null)} disabled={disabled}>
              <Plus className="mr-2 h-4 w-4" />
              {t('actions.addFirst')}
            </Button>
          </div>
          {activeCategory === null && !hasContent && renderSkillInput(null)}
        </div>
      )}
    </div>
  );
}
