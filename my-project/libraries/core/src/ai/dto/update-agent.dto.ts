import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAgentDTO {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  @IsIn(['openai', 'gemini'])
  provider?: 'openai' | 'gemini';

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
