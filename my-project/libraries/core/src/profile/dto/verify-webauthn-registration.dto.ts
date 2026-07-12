import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class VerifyWebAuthnRegistrationDto {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  name: string;

  @IsObject({ message: (args) => getLocaleText('validation.objectRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  attestationResponse: any;
}
