import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for checking if an action is allowed based on subscription limits
 */
export class CheckActionDto {
  @ApiProperty({
    description: 'The action to check',
    enum: ['application', 'interview'],
    example: 'application',
  })
  @IsIn(['application', 'interview'], {
    message: 'action must be either "application" or "interview"',
  })
  action: 'application' | 'interview';
}
