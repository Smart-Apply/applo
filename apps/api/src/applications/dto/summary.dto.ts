import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SummaryDto {
  @ApiProperty({
    description: 'Freitext-Anweisungen für die KI (z. B. Fokus, Tonalität)',
    example: 'Betone meine Erfahrung mit Projektmanagement und Teamführung',
  })
  @IsNotEmpty()
  @IsString()
  instructions: string;

  @ApiPropertyOptional({
    description: 'Aktueller HTML-Inhalt der Zusammenfassung',
  })
  @IsOptional()
  @IsString()
  currentSummary?: string;

  @ApiPropertyOptional({
    description: 'Erzwinge neue Generierung über die KI',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

export class SummaryResponseDto {
  @ApiPropertyOptional({
    description: 'Generierte Zusammenfassung im Markdown-Format',
  })
  summary: string;
}
