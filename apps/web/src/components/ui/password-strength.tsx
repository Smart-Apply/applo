'use client';

import { useTranslations } from 'next-intl';

interface PasswordStrengthProps {
  password: string;
}

interface PasswordRequirement {
  regex: RegExp;
  text: string;
  met: boolean;
}

const REQUIREMENTS_CONFIG = [
  { regex: /.{8,}/, key: 'requirementMinLength' },
  { regex: /[A-Z]/, key: 'requirementUppercase' },
  { regex: /[a-z]/, key: 'requirementLowercase' },
  { regex: /\d/, key: 'requirementNumber' },
  { regex: /[@$!%*?&#]/, key: 'requirementSpecial' },
] as const;

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations('common.passwordStrength');

  // Compute requirements based on password value
  const requirements: PasswordRequirement[] = REQUIREMENTS_CONFIG.map((config) => ({
    regex: config.regex,
    text: t(config.key),
    met: config.regex.test(password),
  }));

  const metCount = requirements.filter((req) => req.met).length;
  const strengthPercentage = (metCount / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage === 0) return 'bg-muted';
    if (strengthPercentage < 40) return 'bg-destructive';
    if (strengthPercentage < 80) return 'bg-warning';
    return 'bg-success';
  };

  const getStrengthText = () => {
    if (strengthPercentage === 0) return '';
    if (strengthPercentage < 40) return t('weak');
    if (strengthPercentage < 80) return t('medium');
    return t('strong');
  };

  if (!password) return null;

  return (
    <div className="space-y-2 text-sm">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('label')}</span>
          {strengthPercentage > 0 && (
            <span
              className={`font-medium ${
                strengthPercentage < 40
                  ? 'text-destructive'
                  : strengthPercentage < 80
                  ? 'text-[#A16207] dark:text-amber-300/90'
                  : 'text-success'
              }`}
            >
              {getStrengthText()}
            </span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-[2px] bg-muted">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={`flex items-center gap-2 ${
              req.met ? 'text-success' : 'text-muted-foreground'
            }`}
          >
            <span className="flex-shrink-0">
              {req.met ? (
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
            <span className="text-xs">{req.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
