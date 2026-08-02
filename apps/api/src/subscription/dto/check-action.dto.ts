import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for checking if an action is allowed based on subscription limits
 */
export class CheckActionDto {
  @ApiProperty({
    description: 'The action to check',
    enum: ['application', 'coverLetter', 'resume', 'jobParsing', 'interview', 'validation'],
    example: 'application',
  })
  @IsIn(['application', 'coverLetter', 'resume', 'jobParsing', 'interview', 'validation'], {
    message:
      'action must be one of: application, coverLetter, resume, jobParsing, interview, validation',
  })
  action: 'application' | 'coverLetter' | 'resume' | 'jobParsing' | 'interview' | 'validation';
}
