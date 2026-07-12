import { getLocaleText } from '@hed-hog/api-locale';
import { IsJWT } from 'class-validator';

export class ResendMfaCodeDTO {
  @IsJWT({ message: (args) => getLocaleText('validation.tokenMustBeJWT', args.value) })
  token: string;
}
