import { getLocaleText } from '@hed-hog/api-locale';
import { IsIn, IsJWT, IsOptional, IsString } from 'class-validator';

export class LoginWithCodeDTO {
  @IsString({ message: (args) => getLocaleText('validation.codeMustBeString', args.value) })
  code: string;

  @IsJWT({ message: (args) => getLocaleText('validation.tokenMustBeJWT', args.value) })
  token: string;

  @IsOptional()
  @IsIn(['totp', 'email', 'recovery'], { message: (args) => getLocaleText('validation.methodTypeInvalid', args.value) })
  methodType?: 'totp' | 'email' | 'recovery';
}
