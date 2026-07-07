import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AI_PROMPT_HARD_CEILING_CHARS } from '@applo/shared';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

/**
 * DTO for submitting an answer to a question
 */
export class SubmitAnswerDto {
  @ApiProperty({
    description: 'User\'s answer to the question',
    example: 'In meiner vorherigen Position habe ich ein Team von 5 Entwicklern geleitet...',
  })
  @IsString()
  @MaxLength(AI_PROMPT_HARD_CEILING_CHARS, { message: 'Die Antwort ist zu lang.' })
  @Sanitize()
  answer: string;

  @ApiPropertyOptional({
    description: 'Time taken to answer in seconds',
    example: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  answerDuration?: number;
}
