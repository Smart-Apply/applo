import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppointmentResponseDto {
  @ApiProperty({ description: 'Appointment ID' })
  id: string;

  @ApiProperty({ description: 'Calendar day (date-only, ISO "YYYY-MM-DD")', example: '2026-08-20' })
  date: string;

  @ApiPropertyOptional({ description: 'Start time in 24h "HH:mm" (absent for all-day entries)', example: '10:00' })
  startTime?: string;

  @ApiProperty({ description: 'What the appointment is about' })
  note: string;

  @ApiProperty({ description: 'Whether an email reminder was requested' })
  emailReminder: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
