import { getLocaleText } from '@hed-hog/api-locale';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDTO {
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  mail_id: number;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  subject: string;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  from: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @Transform(({ value }) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(';');
    return value;
  })
  to?: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @Transform(({ value }) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(';');
    return value;
  })
  cc?: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @Transform(({ value }) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(';');
    return value;
  })
  bcc?: string;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  body: string;
}
