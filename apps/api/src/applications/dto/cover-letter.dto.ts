import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { AI_PROMPT_HARD_CEILING_CHARS } from '@applo/shared';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CoverLetterDto {
  @ApiPropertyOptional({
    description: 'Freitext-Hinweise für die KI (z. B. Fokus, Tonalität)',
    example: 'Betone Projekterfahrung mit Azure AI',
  })
  @IsOptional()
  @IsString()
  @MaxLength(AI_PROMPT_HARD_CEILING_CHARS, { message: 'Die Anweisungen sind zu lang.' })
  @Sanitize()
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Manuell bearbeiteter HTML-Inhalt des Anschreibens',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Erzwinge neue Generierung über die KI, selbst wenn content gesetzt ist',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}
