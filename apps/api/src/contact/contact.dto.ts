import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Sanitize } from '../common/decorators/sanitize.decorator';

export class ContactSubmissionDto {
  @IsString()
  @MinLength(1, { message: 'Bitte gib deinen Namen an.' })
  @MaxLength(100)
  @Sanitize()
  name!: string;

  @IsEmail({}, { message: 'Bitte gib eine gültige E-Mail-Adresse an.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10, { message: 'Bitte schreibe mindestens 10 Zeichen.' })
  @MaxLength(5000, { message: 'Maximal 5000 Zeichen.' })
  @Sanitize()
  message!: string;
}
