import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class UpdateApplicationTitleDto {
  @ApiProperty({
    description: 'Custom application title (user editable)',
    example: 'Senior Frontend Developer @ Google',
    minLength: 3,
    maxLength: 60,
  })
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(60, { message: 'Title must be at most 60 characters long' })
  @Sanitize()
  title: string;
}
