import { getLocaleText } from '@hed-hog/api-locale';
import { IsString, MinLength } from 'class-validator';
import { IsStrongPasswordWithSettings } from '../../validators/is-strong-password-with-settings.validator';

export class ChangePasswordDto {
  @IsStrongPasswordWithSettings({
    message: (args) =>  getLocaleText('profile.changePassword.currentPasswordIsString', args.value)
  })
  currentPassword: string;

  @IsString({
      message: (args) =>  getLocaleText('profile.changePassword.newPasswordIsString', args.value)
  })
  @MinLength(6)
  newPassword: string;
}
