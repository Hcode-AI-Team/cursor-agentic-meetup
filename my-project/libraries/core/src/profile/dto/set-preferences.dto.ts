import { getLocaleText } from '@hed-hog/api-locale';
import { IsIn, IsOptional, Length } from "class-validator";

export class SetPreferencesDto {
  @IsOptional()
  @IsIn(["light", "dark", "system"], { message: (args) => getLocaleText('validation.themeInvalid', args.value) })
  theme?: string;
  
  @IsOptional()
  @Length(2, 2, { message: (args) => getLocaleText('validation.languageLength', args.value) })
  language?: string;
}
