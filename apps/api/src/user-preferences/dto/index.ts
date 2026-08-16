import { IsBoolean, IsOptional, IsString, IsIn, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Theme } from '../../generated/prisma/client';

/**
 * Maps legacy string theme values to Theme enum
 */
function mapToTheme(value: string | undefined): Theme | undefined {
  if (!value) return undefined;
  const normalized = value.toUpperCase().trim();
  if (Object.values(Theme).includes(normalized as Theme)) {
    return normalized as Theme;
  }
  // Legacy mappings
  const mappings: Record<string, Theme> = {
    LIGHT: Theme.LIGHT,
    DARK: Theme.DARK,
    SYSTEM: Theme.SYSTEM,
  };
  return mappings[normalized] || Theme.SYSTEM;
}

export class UpdateUserPreferencesDto {
  // Notifications
  @ApiProperty({
    example: true,
    required: false,
    description: 'Receive application update notifications',
  })
  @IsOptional()
  @IsBoolean()
  applicationUpdates?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Receive new job posting notifications',
  })
  @IsOptional()
  @IsBoolean()
  newJobPostings?: boolean;

  @ApiProperty({ example: false, required: false, description: 'Receive marketing emails' })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description:
      'Receive an email when the inbox-tracking agent (Premium) changes the status of one of your applications.',
  })
  @IsOptional()
  @IsBoolean()
  emailTrackingNotify?: boolean;

  // Preferences
  @ApiProperty({
    example: 'de',
    required: false,
    description: 'Preferred language (de, en, fr, es, pt, it)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['de', 'en', 'fr', 'es', 'pt', 'it'], {
    message: 'Language must be one of: de, en, fr, es, pt, it',
  })
  language?: string;

  @ApiProperty({
    example: 'SYSTEM',
    required: false,
    enum: Theme,
    description: 'Theme preference (LIGHT, DARK, SYSTEM). Also accepts lowercase values.',
  })
  @IsOptional()
  @Transform(({ value }) => mapToTheme(value))
  theme?: Theme;

  @ApiProperty({
    example: true,
    required: false,
    description:
      'Opt-out for pseudonymous LLM usage telemetry. When false, no llm_usage_events row is written for this user.',
  })
  @IsOptional()
  @IsBoolean()
  analyticsEnabled?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description:
      'Whether the user finished or skipped the onboarding guide. Once true, the guided tour is no longer auto-opened on login (it stays manually re-openable).',
  })
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}

export class UserPreferencesResponseDto {
  @ApiProperty({ example: 'clq1234567890' })
  id: string;

  @ApiProperty({ example: 'clq0987654321' })
  userId: string;

  @ApiProperty({ example: true })
  applicationUpdates: boolean;

  @ApiProperty({ example: false })
  newJobPostings: boolean;

  @ApiProperty({ example: false })
  marketingEmails: boolean;

  @ApiProperty({
    example: true,
    description: 'Notify on inbox-tracking-driven status changes (Premium)',
  })
  emailTrackingNotify: boolean;

  @ApiProperty({ example: 'de' })
  language: string;

  @ApiProperty({ example: 'SYSTEM', enum: Theme })
  theme: Theme;

  @ApiProperty({ example: true })
  analyticsEnabled: boolean;

  @ApiProperty({
    example: false,
    description: 'Onboarding guide finished or skipped (suppresses the auto-opened tour)',
  })
  onboardingCompleted: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
