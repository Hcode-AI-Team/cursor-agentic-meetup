import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, MinLength } from 'class-validator';
import { IsEmailWithSettings } from '../../validators/is-email-with-settings.validator';

export class ChangeDTO {
  @IsNotEmpty({
    message: 'Precisa preencher a nova senha',
  })
  @MinLength(8, {
    message: 'A senha deve ter pelo menos 8 caracteres',
  })
  newPassword: string;

  @IsNotEmpty({
    message: 'Precisa confirmar a nova senha',
  })
  @MinLength(8)
  confirmNewPassword: string;

  @IsNotEmpty({
    message: 'Precisa preencher a senha atual',
  })
  @MinLength(8, {
    message: 'A senha atual deve ter pelo menos 8 caracteres',
  })
  currentPassword: string;

  @IsNotEmpty({ message: (args) => getLocaleText('validation.currentEmailRequired', args.value) })
  @IsEmailWithSettings({ message: (args) => getLocaleText('validation.currentEmailInvalid', args.value) })
  email: string;
}
