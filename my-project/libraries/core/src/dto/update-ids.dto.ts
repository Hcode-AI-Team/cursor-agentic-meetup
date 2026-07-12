import { getLocaleText } from '@hed-hog/api-locale';
import { IsArray, IsInt } from 'class-validator';

export class UpdateIdsDTO {
  @IsInt({
    each: true,
    message: (args) => getLocaleText('validation.numberRequired', args.value),
  })
  @IsArray({
    message: (args) => getLocaleText('validation.arrayRequired', args.value),
  })
  ids: number[];
}
