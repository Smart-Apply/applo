import { IsNumber, IsString, IsEnum, Min, Max } from 'class-validator';
import { ApplicationStatus } from './application-response.dto';

/**
 * DTO for application generation progress events (SSE)
 */
export class ApplicationProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @IsString()
  message: string;

  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
