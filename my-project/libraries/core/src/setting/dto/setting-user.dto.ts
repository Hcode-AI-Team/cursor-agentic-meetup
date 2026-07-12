import { getLocaleText } from '@hed-hog/api-locale';
import { IsString } from 'class-validator';

export class SettingUserDTO {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  value: string;
}
