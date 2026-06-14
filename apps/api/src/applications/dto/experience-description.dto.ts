import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { AI_PROMPT_HARD_CEILING_CHARS } from '@smart-apply/shared';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class ExperienceDescriptionDto {
  @ApiProperty({
    description: 'Freitext-Anweisungen für die KI (z. B. Fokus auf Erfolge, Metriken)',
    example: 'Betone messbare Erfolge und Teamführung',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(AI_PROMPT_HARD_CEILING_CHARS, { message: 'Die Anweisungen sind zu lang.' })
  @Sanitize()
  instructions: string;

  @ApiProperty({
    description: 'Index der Berufserfahrung im Array (0-basiert)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  experienceIndex: number;

  @ApiPropertyOptional({
    description: 'Aktueller HTML-Inhalt der Beschreibung',
  })
  @IsOptional()
  @IsString()
  currentDescription?: string;

  @ApiProperty({
    description: 'Jobtitel der Erfahrung',
    example: 'Senior Software Engineer',
  })
  @IsNotEmpty()
  @IsString()
  experienceTitle: string;

  @ApiProperty({
    description: 'Firmenname der Erfahrung',
    example: 'TechCorp GmbH',
  })
  @IsNotEmpty()
  @IsString()
  experienceCompany: string;

  @ApiPropertyOptional({
    description: 'Zeitraum der Erfahrung',
    example: 'Jan 2020 - Dez 2023',
  })
  @IsOptional()
  @IsString()
  experienceDateRange?: string;

  @ApiPropertyOptional({
    description: 'Erzwinge neue Generierung über die KI',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

export class ExperienceDescriptionResponseDto {
  @ApiProperty({
    description: 'Generierte Beschreibung im HTML-Format (Bullet-Points)',
  })
  description: string;
}
