import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for checking if an action is allowed based on subscription limits
 */
export class CheckActionDto {
  @ApiProperty({
    description: 'The action to check',
    enum: ['coverLetter', 'resume', 'jobParsing', 'interview', 'autoApply'],
    example: 'coverLetter',
  })
  @IsIn(['coverLetter', 'resume', 'jobParsing', 'interview', 'autoApply'], {
    message: 'action must be one of: coverLetter, resume, jobParsing, interview, autoApply',
  })
  action: 'coverLetter' | 'resume' | 'jobParsing' | 'interview' | 'autoApply';
}
