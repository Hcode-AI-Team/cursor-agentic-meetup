import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { IsEmailWithSettings } from '../../validators/is-email-with-settings.validator';

export class TestMailDTO {
  @IsString()
  @IsNotEmpty({ message: (args) => getLocaleText('validation.slugRequired', args.value) })
  slug: string;

  @IsNotEmpty({ message: (args) => getLocaleText('validation.currentEmailRequired', args.value) })
  @IsEmailWithSettings({ message: (args) => getLocaleText('validation.currentEmailInvalid', args.value) })
  email: string;

  @IsString()
  @IsNotEmpty({ message: (args) => getLocaleText('validation.subjectRequired', args.value) })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: (args) => getLocaleText('validation.bodyRequired', args.value) })
  body: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;
}
