'use client';

import { Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SubmitButton } from '@/components/ui/submit-button';
import { PromptUsageMeter } from '@/components/ui/prompt-usage-meter';
import { usePromptUsage } from '@/hooks/use-prompt-usage';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

export interface AiAssistantPopoverProps {
  /** Whether the popover is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current instructions text */
  instructions: string;
  /** Callback when instructions change */
  onInstructionsChange: (instructions: string) => void;
  /** Callback when apply button is clicked */
  onApply: () => void;
  /** Whether the AI operation is in progress */
  isLoading: boolean;
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Title displayed in the popover header */
  title?: string;
  /** Description displayed under the title */
  description?: string;
  /** Loading text shown on button during operation */
  loadingText?: string;
  /** Warning/info message shown above the button */
  warningMessage?: string;
  /** Text for the apply button */
  applyButtonText?: string;
  /** Button variant */
  buttonVariant?: 'outline' | 'default' | 'ghost';
  /** Button size */
  buttonSize?: 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';
  /** Additional class names for the trigger button */
  buttonClassName?: string;
}

/**
 * Reusable AI Assistant Popover component
 * Used for AI-powered content modification (cover letters, summaries, etc.)
 */
export function AiAssistantPopover({
  open,
  onOpenChange,
  instructions,
  onInstructionsChange,
  onApply,
  isLoading,
  placeholder,
  title,
  description,
  loadingText,
  warningMessage,
  applyButtonText,
  buttonVariant = 'outline',
  buttonSize = 'sm',
  buttonClassName = 'h-8 px-3 text-xs border-primary/30 hover:border-primary/50 hover:bg-primary/5',
}: AiAssistantPopoverProps) {
  const t = useTranslations('editor');
  const resolvedPlaceholder = placeholder ?? t('aiAssistant.defaultPlaceholder');
  const resolvedTitle = title ?? t('aiAssistant.title');
  const resolvedDescription = description ?? t('aiAssistant.description');
  const resolvedLoadingText = loadingText ?? t('aiAssistant.loading');
  const resolvedWarningMessage = warningMessage ?? t('aiAssistant.warning');
  const resolvedApplyButtonText = applyButtonText ?? t('aiAssistant.apply');
  // Live character/token guardrail for the instructions field (issue #520).
  const usage = usePromptUsage(instructions, 'editModeAssistant');

  // Handle Enter key to submit (Shift+Enter for new line)
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (instructions.trim() && !isLoading && !usage.isOverLimit) {
          onApply();
        }
      }
    },
    [instructions, isLoading, usage.isOverLimit, onApply],
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={buttonClassName}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
          {t('aiAssistant.trigger')}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-80">
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {resolvedTitle}
            </h4>
            <p className="text-xs text-muted-foreground">{resolvedDescription}</p>
          </div>
          <Textarea
            value={instructions}
            onChange={(event) => onInstructionsChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            rows={3}
            disabled={isLoading}
            aria-invalid={usage.isOverLimit}
            className="resize-none text-sm"
          />
          <PromptUsageMeter usage={usage} />
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{resolvedWarningMessage}</span>
          </div>
          <SubmitButton
            variant="default"
            size="sm"
            onClick={onApply}
            isLoading={isLoading}
            loadingText={resolvedLoadingText}
            disabled={isLoading || !instructions.trim() || usage.isOverLimit}
            className="w-full"
          >
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            {resolvedApplyButtonText}
          </SubmitButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
