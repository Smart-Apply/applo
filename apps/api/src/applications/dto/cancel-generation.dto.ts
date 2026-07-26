import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelGenerationDto {
  @ApiProperty({
    description: 'ID des Job Postings, dessen laufende Generierung abgebrochen werden soll',
    example: 'cmhkpp7xr000he752e3o5s8ut',
  })
  @IsString()
  @IsNotEmpty()
  jobPostingId: string;
}

export class CancelGenerationResponseDto {
  @ApiProperty({
    description: 'Ob eine laufende Generierung gefunden und verworfen wurde',
    example: true,
  })
  cancelled: boolean;

  @ApiProperty({
    description: 'ID der verworfenen Bewerbung (falls eine gefunden wurde)',
    example: 'cmhkpp7xr000he752e3o5s8ut',
    required: false,
    nullable: true,
  })
  applicationId: string | null;
}
