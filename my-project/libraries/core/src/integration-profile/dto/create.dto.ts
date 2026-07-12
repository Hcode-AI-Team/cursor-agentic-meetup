import { getLocaleText } from '@hed-hog/api-locale';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDTO {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @MaxLength(255)
  @Transform(({ value }) => String(value ?? '').trim())
  slug: string;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @MaxLength(127)
  @Transform(({ value }) => String(value ?? '').trim())
  name: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  type_id: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  provider_id: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === true || value === 'true' || value === 1 || value === '1',
  )
  is_active?: boolean;
}
