import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsEmailWithSettings } from '../../validators/is-email-with-settings.validator';

export class ForgetDTO {
  @IsNotEmpty({ message: (args) => getLocaleText('validation.currentEmailRequired', args.value) })
  @IsEmailWithSettings({ message: (args) => getLocaleText('validation.currentEmailInvalid', args.value) })
  set email(value: string) {
    this._email = value?.trim().toLowerCase();
  }
  get email(): string {
    return this._email;
  }
  private _email: string;

  @IsOptional()
  @IsString()
  app?: string;
}
