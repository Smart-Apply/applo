import { IsBoolean, IsIn, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * PATCH /applications/:id/template-settings — per-application design tuning.
 * Partial update: absent fields keep their stored value; `accentColor: null`
 * removes the override so the template variant's own color applies again.
 * Bounded enums + validated hex keep every combination testable and ATS-safe
 * (see `TemplateSettings` in @applo/shared).
 */
export class UpdateTemplateSettingsDto {
  @ApiPropertyOptional({
    description:
      'Kuratierte Schriftfamilie. "default" behält die Schrift des Designs; ' +
      '"lato", "source-sans" und "merriweather" sind gebündelte OFL-Familien.',
    enum: ['default', 'lato', 'source-sans', 'merriweather'],
    example: 'default',
  })
  @IsOptional()
  @IsString()
  @IsIn(['default', 'lato', 'source-sans', 'merriweather'])
  fontFamily?: 'default' | 'lato' | 'source-sans' | 'merriweather';

  @ApiPropertyOptional({
    description: 'Schriftgröße: "md" = Originalgrößen des Designs, "sm"/"lg" = ±8 %.',
    enum: ['sm', 'md', 'lg'],
    example: 'md',
  })
  @IsOptional()
  @IsString()
  @IsIn(['sm', 'md', 'lg'])
  fontScale?: 'sm' | 'md' | 'lg';

  @ApiPropertyOptional({
    description:
      'Vertikale Dichte: skaliert Abstände und Zeilenhöhe ("compact" | "normal" | "relaxed").',
    enum: ['compact', 'normal', 'relaxed'],
    example: 'normal',
  })
  @IsOptional()
  @IsString()
  @IsIn(['compact', 'normal', 'relaxed'])
  density?: 'compact' | 'normal' | 'relaxed';

  @ApiPropertyOptional({
    description:
      'Freie Akzentfarbe (#rrggbb) — überschreibt die Farbvariante der Vorlage. ' +
      '`null` entfernt die Überschreibung.',
    example: '#1B2A49',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'accentColor muss ein Hex-Farbwert im Format #rrggbb sein',
  })
  accentColor?: string | null;

  @ApiPropertyOptional({
    description:
      'Bewerbungsfoto im Lebenslauf anzeigen (DACH-Konvention). Erfordert ein hochgeladenes ' +
      'Profil-Foto; für ATS-Systeme und Bewerbungen außerhalb der DACH-Region wird "ohne Foto" ' +
      'empfohlen.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  showPhoto?: boolean;
}
