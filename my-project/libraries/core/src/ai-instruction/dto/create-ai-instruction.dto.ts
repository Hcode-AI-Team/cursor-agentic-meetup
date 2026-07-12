import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiInstructionLayer } from '../types/ai-instruction.types';

export class CreateAiInstructionDTO {
  @IsString()
  @MaxLength(255)
  slug: string;

  @IsEnum(['system', 'product', 'module', 'agent', 'tool', 'output'])
  layer: AiInstructionLayer;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  variables_schema?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  module_slug?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
