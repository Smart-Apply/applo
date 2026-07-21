/* =============================================================================
 *  setting-toggle-row.tsx
 *  TARGET PATH: apps/web/src/components/settings/setting-toggle-row.tsx
 *
 *  A labelled row with an icon, title, description and a real toggle Switch.
 *  Replaces the old `<Button>Aktiviert/Deaktiviert</Button>` affordance.
 *
 *  PREREQ: shadcn Switch primitive — add once with:
 *    npx shadcn@latest add switch
 * ========================================================================== */

'use client';

import type { LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface SettingToggleRowProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SettingToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SettingToggleRowProps) {
  return (
    <div className="flex items-center gap-4 py-1">
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={title}
      />
    </div>
  );
}
