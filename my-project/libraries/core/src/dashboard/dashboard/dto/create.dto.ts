import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateDTO {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  slug: string;

  @IsObject({
    message: (args) =>
      getLocaleText('validation.localeMustBeObject', args.value),
  })
  @IsNotEmpty({
    message: (args) => getLocaleText('validation.localeRequired', args.value),
  })
  locale: Record<string, { name: string }>;
}
