import { getLocaleText } from '@hed-hog/api-locale';
import { IsJWT, IsString } from 'class-validator';

export class LoginWithRecoveryCodeDTO {
  @IsString({ message: (args) => getLocaleText('validation.codeMustBeString', args.value) })
  code: string;

  @IsJWT({ message: (args) => getLocaleText('validation.tokenMustBeJWT', args.value) })
  token: string;
}
