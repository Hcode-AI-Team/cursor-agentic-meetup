import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export class UpdateSettingListItemDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @IsString()
  @Length(1, 255)
  value: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class UpdateSettingListDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSettingListItemDTO)
  options: UpdateSettingListItemDTO[];
}