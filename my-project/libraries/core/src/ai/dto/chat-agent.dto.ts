import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatAgentDTO {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  file_id?: number;
}
