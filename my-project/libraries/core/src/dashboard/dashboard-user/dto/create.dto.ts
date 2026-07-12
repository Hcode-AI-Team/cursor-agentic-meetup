import { getLocaleText, WithLocaleDTO } from '@hed-hog/api-locale';
import { IsNumber } from 'class-validator';

export class CreateDTO extends WithLocaleDTO {
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  dashboard_id: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  user_id: number;
}
