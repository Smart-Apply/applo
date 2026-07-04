'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Code, Pencil, Trash2, FolderPlus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeSkillCategory } from '@smart-apply/shared';
import type { Skill } from '@/types';

interface SkillsManagerProps {
  skills: Skill[];
  onSkillsChange: (skills: Skill[]) => void;
  disabled?: boolean;
}

const UNCATEGORIZED_LABEL = 'Weitere Kenntnisse';

function categoryOf(skill: Skill): string | null {
  return normalizeSkillCategory(skill.category);
}

export function SkillsManager({ skills, onSkillsChange, disabled = false }: SkillsManagerProps) {
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
      toast.error('Diese Kategorie existiert bereits');
      return;
    }
    setEmptyCategories([...emptyCategories, name]);
    setNewCategoryName('');
    setShowCategoryInput(false);
    openSkillInput(name);
    toast.success(`Kategorie "${name}" hinzugefügt`);
  };

  const renameCategory = () => {
    const from = renamingCategory;
    const to = renameValue.trim();
    setRenamingCategory(null);
    if (!from || !to || to === from) return;
    if (categories.some((c) => c !== from && c.toLowerCase() === to.toLowerCase())) {
      toast.error('Diese Kategorie existiert bereits');
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
    toast.success(`Kategorie "${category}" entfernt`);
  };

  const addSkill = () => {
    const name = skillInput.trim();
    if (!name || activeCategory === undefined) return;
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Dieser Skill existiert bereits');
      return;
    }
    onSkillsChange([...skills, { name, category: activeCategory }]);
    if (activeCategory) {
      setEmptyCategories(emptyCategories.filter((c) => c !== activeCategory));
    }
    setSkillInput('');
    skillInputRef.current?.focus();
    toast.success(`Skill "${name}" hinzugefügt`);
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
    toast.success(`Skill "${skillName}" entfernt`);
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
            className="absolute right-1.5 shrink-0 rounded-full p-0.5 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${skill.name} entfernen`}
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
          placeholder="z.B. Projektmanagement, Grundpflege, SAP …"
          className="flex-1"
        />
        <Button type="button" onClick={addSkill} disabled={disabled || !skillInput.trim()} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Hinzufügen
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
          Fertig
        </Button>
      </div>
    );

  const hasContent = skills.length > 0 || categories.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Fähigkeiten</h3>
          <p className="text-sm text-muted-foreground">
            Gruppiere deine Kompetenzen in Kategorien – sie erscheinen so im Lebenslauf
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
            Kategorie hinzufügen
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
            placeholder="z.B. Fachkenntnisse, Software, Methoden …"
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addCategory}
            disabled={disabled || !newCategoryName.trim()}
            size="sm"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Anlegen
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
            Abbrechen
          </Button>
        </div>
      )}

      {hasContent ? (
        <div className="space-y-5">
          {categories.map((category) => {
            const items = skillsIn(category);
            return (
              <div key={category} className="rounded-lg border border-border/60 p-4">
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
                        aria-label="Umbenennen bestätigen"
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
                      aria-label={`Skill zu ${category} hinzufügen`}
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
                      aria-label={`Kategorie ${category} umbenennen`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCategory(category)}
                      disabled={disabled}
                      aria-label={`Kategorie ${category} entfernen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {items.length > 0 ? (
                  renderSkillChips(items)
                ) : (
                  <p className="text-xs text-muted-foreground">Noch keine Skills in dieser Kategorie.</p>
                )}
                {renderSkillInput(category)}
              </div>
            );
          })}

          <div className="rounded-lg border border-dashed border-border/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {UNCATEGORIZED_LABEL}{' '}
                <span className="font-normal text-muted-foreground">({uncategorized.length})</span>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => openSkillInput(null)}
                disabled={disabled}
                aria-label={`Skill zu ${UNCATEGORIZED_LABEL} hinzufügen`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {uncategorized.length > 0 ? (
              renderSkillChips(uncategorized)
            ) : (
              <p className="text-xs text-muted-foreground">
                Skills ohne Kategorie erscheinen im Lebenslauf ohne Überschrift.
              </p>
            )}
            {renderSkillInput(null)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Code className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground">Keine Fähigkeiten</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Lege Kategorien wie „Fachkenntnisse“ oder „Software“ an und füge deine Fähigkeiten
            hinzu.
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
              Kategorie anlegen
            </Button>
            <Button type="button" onClick={() => openSkillInput(null)} disabled={disabled}>
              <Plus className="mr-2 h-4 w-4" />
              Ersten Skill hinzufügen
            </Button>
          </div>
          {activeCategory === null && !hasContent && renderSkillInput(null)}
        </div>
      )}
    </div>
  );
}
