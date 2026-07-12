import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryAccessLogDto {
  @IsOptional()
  @IsNumberString()
  userId?: string;

  @IsOptional()
  @IsString()
  userSearch?: string;

  @IsOptional()
  @IsString()
  createdAtFrom?: string;

  @IsOptional()
  @IsString()
  createdAtTo?: string;

  @IsOptional()
  @IsIn(['http', 'mcp', 'all'])
  type?: 'http' | 'mcp' | 'all';
}
