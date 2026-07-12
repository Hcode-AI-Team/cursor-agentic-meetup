import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsObject } from 'class-validator';

export class VerifyWebAuthnDto {
  @IsObject({ message: (args) => getLocaleText('validation.objectRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  assertionResponse: any;
}
