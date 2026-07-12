import { getLocaleText } from '@hed-hog/api-locale';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

class Setting {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  slug: string;

  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  value: string;
}

export class SettingDTO {
  @IsArray({ message: (args) => getLocaleText('validation.arrayRequired', args.value) })
  @ValidateNested({ each: true })
  @Type(() => Setting)
  setting: Setting[];
}
