import { getLocaleText } from '@hed-hog/api-locale';
import { IsOptional } from 'class-validator';
import { IsStrongPasswordWithSettings } from '../../validators/is-strong-password-with-settings.validator';

export class ResetPasswordDTO {
  @IsOptional()
  @IsStrongPasswordWithSettings({
    message: (args) => getLocaleText('validation.passwordStrength', args.value),
  })
  password?: string;
}