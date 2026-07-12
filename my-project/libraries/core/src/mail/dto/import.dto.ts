import { getLocaleText } from '@hed-hog/api-locale';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

class ImportTranslationDTO {
  @IsString({
    message: (args) => getLocaleText('validation.stringRequired', args.value),
  })
  code: string;

  @IsString({
    message: (args) => getLocaleText('validation.stringRequired', args.value),
  })
  subject: string;

  @IsString({
    message: (args) => getLocaleText('validation.stringRequired', args.value),
  })
  body: string;
}

class ImportTemplateDTO {
  @IsString({
    message: (args) => getLocaleText('validation.stringRequired', args.value),
  })
  slug: string;

  @IsArray({
    message: (args) => getLocaleText('validation.arrayRequired', args.value),
  })
  @ValidateNested({ each: true })
  @Type(() => ImportTranslationDTO)
  translations: ImportTranslationDTO[];

  @IsArray({
    message: (args) => getLocaleText('validation.arrayRequired', args.value),
  })
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];
}

export class ImportDTO {
  @IsArray({
    message: (args) => getLocaleText('validation.arrayRequired', args.value),
  })
  @ValidateNested({ each: true })
  @Type(() => ImportTemplateDTO)
  data: ImportTemplateDTO[];

  @IsBoolean({
    message: (args) => getLocaleText('validation.booleanRequired', args.value),
  })
  @IsOptional()
  overwrite?: boolean;
}
