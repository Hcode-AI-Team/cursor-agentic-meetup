import { getLocaleText } from '@hed-hog/api-locale';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsStrongPassword } from 'class-validator';
import { IsEmailWithSettings } from '../../validators/is-email-with-settings.validator';

export class LoginDTO {
  @IsNotEmpty({ message: (args) => getLocaleText('validation.currentEmailRequired', args.value) })
  @IsEmailWithSettings({ message: (args) => getLocaleText('validation.currentEmailInvalid', args.value) })
  set email(value: string) {
    this._email = value?.trim().toLowerCase();
  }
  get email(): string {
    return this._email;
  }
  private _email: string;

  @IsStrongPassword(
    {
      minLength: 6,
      minLowercase: 0,
      minUppercase: 0,
      minNumbers: 0,
      minSymbols: 0,
    },
    {
      message: (args) => getLocaleText('validation.passwordStrength', args.value),
    },
  )
  password: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === undefined ? false : value)
  refreshToken?: boolean = false;
}
