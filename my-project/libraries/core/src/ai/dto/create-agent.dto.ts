import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAgentDTO {
  @IsString()
  @IsNotEmpty()
  slug: string;

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
