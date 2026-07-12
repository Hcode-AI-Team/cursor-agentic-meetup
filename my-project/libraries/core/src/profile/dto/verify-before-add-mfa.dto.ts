import { getLocaleText } from '@hed-hog/api-locale';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class VerifyBeforeAddMfaDto {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  verificationCode: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  hash?: string;

  @IsIn(['totp', 'email', 'recovery', 'webauthn'], { message: (args) => getLocaleText('validation.methodTypeInvalid', args.value) })
  verificationType: 'totp' | 'email' | 'recovery' | 'webauthn';

  @IsOptional()
  assertionResponse?: any;
}
