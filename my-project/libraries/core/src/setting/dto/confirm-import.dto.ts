import { getLocaleText } from '@hed-hog/api-locale';
import { IsArray, IsNotEmpty } from 'class-validator';

export class ConfirmImportDTO {
  @IsArray({ message: (args) => getLocaleText('validation.arrayRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
  settings: Array<{ slug: string; value: string }>;
}
