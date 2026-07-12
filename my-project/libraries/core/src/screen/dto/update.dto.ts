import { getLocaleText } from '@hed-hog/api-locale';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDTO {
  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.nameMustBeString', args.value) })
  name?: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.slugMustBeString', args.value) })
  slug?: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.descriptionMustBeString', args.value) })
  description?: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.iconMustBeString', args.value) })
  icon?: string;
}
