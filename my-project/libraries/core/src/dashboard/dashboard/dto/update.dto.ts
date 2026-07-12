import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateDTO {
  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  slug?: string;

  @IsOptional()
  @IsObject({
    message: (args) =>
      getLocaleText('validation.localeMustBeObject', args.value),
  })
  @IsNotEmpty({
    message: (args) => getLocaleText('validation.localeRequired', args.value),
  })
  locale?: Record<string, { name: string }>;
}
