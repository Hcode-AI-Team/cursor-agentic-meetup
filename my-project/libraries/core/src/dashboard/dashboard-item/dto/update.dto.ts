import { getLocaleText } from '@hed-hog/api-locale';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateDTO {
  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  component_id?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  dashboard_id?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  width?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  height?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  x_axis?: number;

  @IsOptional()
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  y_axis?: number;
}
