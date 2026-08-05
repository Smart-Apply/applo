import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Calendar day (date-only, ISO "YYYY-MM-DD")',
    example: '2026-08-20',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @ApiPropertyOptional({
    description: 'Start time in 24h "HH:mm". Omit for an all-day entry / deadline.',
    example: '10:00',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:mm (24h) format',
  })
  startTime?: string;

  @ApiProperty({ description: 'What the appointment is about', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Sanitize()
  note: string;

  @ApiPropertyOptional({
    description: 'Whether to send an email reminder for this appointment',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  emailReminder?: boolean;
}
