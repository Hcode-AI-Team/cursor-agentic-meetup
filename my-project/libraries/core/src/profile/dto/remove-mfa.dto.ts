import { getLocaleText } from '@hed-hog/api-locale';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class RemoveMfaDto {
  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  token?: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  hash?: string;

  @IsOptional()
  @IsIn(['totp', 'email', 'recovery', 'webauthn'], { message: (args) => getLocaleText('validation.methodTypeInvalid', args.value) })
  verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn';

  @IsOptional()
  assertionResponse?: any;
}
