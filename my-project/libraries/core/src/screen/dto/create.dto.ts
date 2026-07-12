import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDTO {
  @IsString({ message: (args) => getLocaleText('validation.slugMustBeString', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.slugRequired', args.value) })
  slug: string;

  @IsString({ message: (args) => getLocaleText('validation.iconMustBeString', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.descriptionRequired', args.value) })
  icon?: string;
}
