import { getLocaleText } from '@hed-hog/api-locale';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

class MailLocaleTranslation {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  locale_code: string;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  subject: string;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  body: string;
}

export class GenerateMailMigrationDTO {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  slug: string;

  @IsArray({ message: (args) => getLocaleText('validation.arrayRequired', args.value) })
  @ValidateNested({ each: true })
  @Type(() => MailLocaleTranslation)
  translations: MailLocaleTranslation[];

  @IsArray({ message: (args) => getLocaleText('validation.arrayRequired', args.value) })
  @IsString({ each: true, message: (args) => getLocaleText('validation.stringRequired', args.value) })
  variables: string[];
}
