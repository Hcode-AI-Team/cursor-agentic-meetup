import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateWebAuthnRegistrationOptionsDto {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  name: string;
}
