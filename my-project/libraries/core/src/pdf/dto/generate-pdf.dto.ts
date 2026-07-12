import { IsIn, IsOptional } from 'class-validator';

export class GeneratePdfDTO {
  @IsOptional()
  @IsIn(['consulting', 'training', 'research'])
  area?: 'consulting' | 'training' | 'research';

  @IsOptional()
  @IsIn(['inline', 'attachment'])
  disposition?: 'inline' | 'attachment';
}
