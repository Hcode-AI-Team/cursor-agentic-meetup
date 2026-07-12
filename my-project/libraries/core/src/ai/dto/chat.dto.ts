import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatDTO {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  @IsIn(['openai', 'gemini'])
  provider?: 'openai' | 'gemini';

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  file_id?: number;
}
