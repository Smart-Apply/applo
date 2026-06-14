import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { AI_PROMPT_HARD_CEILING_CHARS } from '@smart-apply/shared';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class ProjectDescriptionDto {
  @ApiProperty({
    description: 'Freitext-Anweisungen für die KI (z. B. Fokus auf Technologien, Impact)',
    example: 'Betone die verwendeten Technologien und den Business-Impact',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(AI_PROMPT_HARD_CEILING_CHARS, { message: 'Die Anweisungen sind zu lang.' })
  @Sanitize()
  instructions: string;

  @ApiProperty({
    description: 'Index des Projekts im Array (0-basiert)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  projectIndex: number;

  @ApiPropertyOptional({
    description: 'Aktueller HTML-Inhalt der Beschreibung',
  })
  @IsOptional()
  @IsString()
  currentDescription?: string;

  @ApiProperty({
    description: 'Name des Projekts',
    example: 'E-Commerce Plattform Redesign',
  })
  @IsNotEmpty()
  @IsString()
  projectName: string;

  @ApiPropertyOptional({
    description: 'Zeitraum des Projekts',
    example: '2023 - 2024',
  })
  @IsOptional()
  @IsString()
  projectDate?: string;

  @ApiPropertyOptional({
    description: 'Erzwinge neue Generierung über die KI',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

export class ProjectDescriptionResponseDto {
  @ApiProperty({
    description: 'Generierte Beschreibung im HTML-Format (Bullet-Points)',
  })
  description: string;
}
