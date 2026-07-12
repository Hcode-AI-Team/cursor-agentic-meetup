import { getLocaleText } from '@hed-hog/api-locale';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';

export class DashboardItemLayoutDTO {
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  id: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  width: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  height: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  x_axis: number;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  y_axis: number;
}

export class UpdateDashboardLayoutDTO {
  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  dashboard_id: number;

  @IsArray({ message: (args) => getLocaleText('validation.arrayRequired', args.value) })
  @ValidateNested({ each: true })
  @Type(() => DashboardItemLayoutDTO)
  items: DashboardItemLayoutDTO[];
}
