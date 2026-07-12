import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class SendTemplatedMailDTO {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  email: string;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  slug: string;

  @IsObject({ message: (args) => getLocaleText('validation.objectRequired', args.value) })
  variables: Record<string, string>;
}
