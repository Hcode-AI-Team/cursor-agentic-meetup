import { getLocaleText } from '@hed-hog/api-locale';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

class MailLocaleDTO {
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  locale_id: number;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  subject: string;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  body: string;
}

class MailVarDTO {
  [key: string]: string;
}

export class CreateDTO {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  slug: string;

  @IsArray({ message: (args) => getLocaleText('validation.arrayRequired', args.value) })
  @ValidateNested({ each: true })
  @Type(() => MailLocaleDTO)
  @IsOptional()
  mail_locale?: MailLocaleDTO[];

  @IsArray({ message: (args) => getLocaleText('validation.arrayRequired', args.value) })
  @ValidateNested({ each: true })
  @Type(() => MailVarDTO)
  @IsOptional()
  mail_var?: MailVarDTO[];
}
