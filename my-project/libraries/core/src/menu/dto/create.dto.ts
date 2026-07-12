import { getLocaleText } from '@hed-hog/api-locale';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateDTO {
  @IsString({ message: (args) => getLocaleText('validation.slugMustBeString', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.slugMustBeString', args.value) })
  slug: string;

  @IsString({ message: (args) => getLocaleText('validation.urlMustBeString', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.urlMustBeString', args.value) })
  url: string;

  @IsInt({ message: (args) => getLocaleText('validation.orderMustBeNumber', args.value) })
  @Min(1)
  @IsOptional()
  order?: number;

  @IsString({ message: (args) => getLocaleText('validation.iconMustBeString', args.value) })
  @IsOptional()
  icon?: string;

  @IsInt({ message: (args) => getLocaleText('validation.orderMustBeNumber', args.value) })
  @Min(1)
  @IsOptional()
  menu_id?: number;

  @IsObject()
  @IsOptional()
  locale?: Record<string, string>;
}
