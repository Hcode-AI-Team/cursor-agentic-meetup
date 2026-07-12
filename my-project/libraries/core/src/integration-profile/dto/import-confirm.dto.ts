import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ImportProfileItemDTO {
  @IsString()
  @MaxLength(255)
  slug: string;

  @IsString()
  @MaxLength(127)
  name: string;

  @IsString()
  @MaxLength(255)
  type_slug: string;

  @IsString()
  @MaxLength(255)
  provider_slug: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ConflictResolutionDTO {
  @IsString()
  @MaxLength(255)
  slug: string;

  @IsIn(['ignore', 'replace', 'rename_auto'])
  action: 'ignore' | 'replace' | 'rename_auto';
}

export class ImportConfirmDTO {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportProfileItemDTO)
  profiles: ImportProfileItemDTO[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConflictResolutionDTO)
  conflict_resolutions?: ConflictResolutionDTO[];
}
