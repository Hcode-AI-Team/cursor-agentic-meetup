import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLocaleDTO {
  @IsString()
  name: string;

  @IsString()
  @MaxLength(2)
  code: string;

  @IsString()
  @MaxLength(2)
  @IsOptional()
  region?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}