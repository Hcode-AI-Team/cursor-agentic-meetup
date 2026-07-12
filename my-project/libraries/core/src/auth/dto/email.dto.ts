import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, MinLength } from 'class-validator';
import { IsEmailWithSettings } from '../../validators/is-email-with-settings.validator';

export class EmailDTO {
  @IsNotEmpty({ message: (args) => getLocaleText('validation.currentEmailRequired', args.value) })
  @IsEmailWithSettings({ message: (args) => getLocaleText('validation.currentEmailInvalid', args.value) })
  currentEmail: string;

  @IsNotEmpty({ message: (args) => getLocaleText('validation.passwordRequired', args.value) })
  @MinLength(8, { message: (args) => getLocaleText('validation.passwordMinLength', args.value) })
  password: string;

  @IsNotEmpty({ message: (args) => getLocaleText('validation.currentEmailRequired', args.value) })
  @IsEmailWithSettings({ message: (args) => getLocaleText('validation.currentEmailInvalid', args.value) })
  newEmail: string;
}
