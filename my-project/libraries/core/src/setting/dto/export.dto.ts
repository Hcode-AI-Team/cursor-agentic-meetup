import { getLocaleText } from '@hed-hog/api-locale';
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class ExportDto {

  @IsOptional()
  @IsBoolean({ message: (args) => getLocaleText('validation.booleanRequired', args.value) })
  @Transform(({ value }) => value === 'true' || value === true)
  secrets?: boolean;

}