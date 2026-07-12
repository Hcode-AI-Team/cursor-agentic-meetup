import { getLocaleText } from '@hed-hog/api-locale';
import { IsString } from 'class-validator';
import { IsEmailWithSettings } from '../../validators/is-email-with-settings.validator';
import { IsStrongPasswordWithSettings } from '../../validators/is-strong-password-with-settings.validator';

export class CreateWithEmailAndPasswordDTO {
  @IsEmailWithSettings({ message: (args) => getLocaleText('validation.emailInvalid', args.value) })
  set email(value: string) {
    this._email = value?.trim().toLowerCase();
  }
  get email(): string {
    return this._email;
  }
  private _email: string;

  @IsStrongPasswordWithSettings()
  password: string;

  @IsString({ message: (args) => getLocaleText('validation.nameRequired', args.value) })
  name: string;
}
