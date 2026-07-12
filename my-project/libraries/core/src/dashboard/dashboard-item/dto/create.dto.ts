import { getLocaleText } from '@hed-hog/api-locale';
import { IsNumber } from 'class-validator';

export class CreateDTO {
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  component_id: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  dashboard_id: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  width: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  height: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  x_axis: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  y_axis: number;
}
