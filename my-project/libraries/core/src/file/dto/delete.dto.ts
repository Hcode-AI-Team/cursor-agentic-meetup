import { getLocaleText } from '@hed-hog/api-locale';
import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class DeleteDTO {
  @IsArray({ message: (args) => getLocaleText('validation.arrayRequired', args.value) })
  @ArrayMinSize(1, { message: (args) => getLocaleText('validation.arrayNotEmpty', args.value) })
  @IsInt({ each: true, message: (args) => getLocaleText('validation.numberRequired', args.value) })
  ids: number[];
}
