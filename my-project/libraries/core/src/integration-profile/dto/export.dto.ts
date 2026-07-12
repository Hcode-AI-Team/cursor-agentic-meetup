import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ExportDTO {
  @IsOptional()
  @IsString()
  ids?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === true || value === 'true' || value === 1 || value === '1',
  )
  include_secrets?: boolean;
}
