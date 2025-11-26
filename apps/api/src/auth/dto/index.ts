import { IsEmail, IsString, MinLength, IsOptional, Matches, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[\w@$!%*?&#]{8,}$/;

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    minLength: 8,
    description:
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character (@$!%*?&#)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&#)',
  })
  password: string;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @Sanitize()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @Sanitize()
  @IsString()
  lastName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password: string;
  // Note: Password is not sanitized to preserve special characters
}

export class UpdateUserDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @Sanitize()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @Sanitize()
  @IsString()
  lastName?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewPassword123!',
    minLength: 8,
    description:
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character (@$!%*?&#)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&#)',
  })
  newPassword: string;
}

export class UpdateUserPreferencesDto {
  // Notifications
  @ApiProperty({ example: true, required: false, description: 'Receive application status updates' })
  @IsOptional()
  @IsBoolean()
  applicationUpdates?: boolean;

  @ApiProperty({ example: false, required: false, description: 'Receive notifications about new job postings' })
  @IsOptional()
  @IsBoolean()
  newJobPostings?: boolean;

  @ApiProperty({ example: false, required: false, description: 'Receive marketing emails' })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  // Preferences
  @ApiProperty({ example: 'de', required: false, description: 'Preferred language (de, en, fr, es)' })
  @IsOptional()
  @IsString()
  @IsIn(['de', 'en', 'fr', 'es'])
  language?: string;

  @ApiProperty({ example: 'system', required: false, description: 'Theme preference (light, dark, system)' })
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @ApiProperty({ example: false, required: false, description: 'Make profile publicly visible' })
  @IsOptional()
  @IsBoolean()
  profilePublic?: boolean;

  @ApiProperty({ example: true, required: false, description: 'Enable analytics and usage data collection' })
  @IsOptional()
  @IsBoolean()
  analyticsEnabled?: boolean;
}
