import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsEmailWithSettings } from '../../validators/is-email-with-settings.validator';
import { IsPinCodeWithSetting } from '../../validators/is-pin-code-with-setting.validator';

export class ChangeEmailDto {
  @IsString({
      message: (args) =>  getLocaleText('profile.changePassword.currentPasswordIsString', args.value)
  })
  @MinLength(6)
  password: string; 
  
  @IsNotEmpty({ message: (args) => getLocaleText('validation.currentEmailRequired', args.value) })
  @IsEmailWithSettings({ message: (args) => getLocaleText('validation.currentEmailInvalid', args.value) })
  email: string;

  @IsOptional()
  @IsPinCodeWithSetting()
  pin: string;
}
