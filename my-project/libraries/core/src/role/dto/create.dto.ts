import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateDTO {
  @IsString({ message: (args) => getLocaleText('validation.slugMustBeString', args.value) })
  slug: string;

  @IsObject({
    message: (args) =>
      getLocaleText('validation.localeMustBeObject', args.value),
  })
  @IsNotEmpty({
    message: (args) => getLocaleText('validation.localeRequired', args.value),
  })
  locale: Record<string, { name: string; description: string }>;
}
