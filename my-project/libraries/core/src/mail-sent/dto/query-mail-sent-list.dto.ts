import { PaginationDTO } from '@hed-hog/api-pagination';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryMailSentListDTO extends PaginationDTO {
  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsIn(['all', 'received', 'read', 'error'])
  status?: 'all' | 'received' | 'read' | 'error';

  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsString()
  hasError?: string;

  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  recipientEmail?: string;

  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  createdAtFrom?: string;

  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  createdAtTo?: string;
}
