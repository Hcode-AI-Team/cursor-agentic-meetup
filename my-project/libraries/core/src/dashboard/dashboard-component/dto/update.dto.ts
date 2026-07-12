import { getLocaleText } from '@hed-hog/api-locale';
import { IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateDTO {
  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  slug?: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  library_slug?: string;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  min_width?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  max_width?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  min_height?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  max_height?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  width?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  height?: number;

  @IsOptional()
  @IsBoolean({ message: (args) => getLocaleText('validation.booleanRequired', args.value) })
  is_resizable?: boolean;

  @IsOptional()
  @IsObject({
    message: (args) =>
      getLocaleText('validation.localeMustBeObject', args.value),
  })
  @IsNotEmpty({
    message: (args) => getLocaleText('validation.localeRequired', args.value),
  })
  locale?: Record<string, { name: string; description?: string }>;
}
