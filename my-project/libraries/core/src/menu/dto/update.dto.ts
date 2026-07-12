import { getLocaleText } from '@hed-hog/api-locale';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateDTO {
  @IsString({ message: (args) => getLocaleText('validation.nameMustBeString', args.value) })
  @IsOptional()
  name?: string;

  @IsString({ message: (args) => getLocaleText('validation.urlMustBeString', args.value) })
  @IsOptional()
  url?: string;

  @IsInt({ message: (args) => getLocaleText('validation.orderMustBeNumber', args.value) })
  @IsOptional()
  order?: number;

  @IsString({ message: (args) => getLocaleText('validation.iconMustBeString', args.value) })
  @IsOptional()
  icon?: string;

  @IsOptional()
  locale?: Record<string, string>;

  @IsOptional()
  menu_id?: number;
}
