import { IsOptional, IsString } from 'class-validator';

export class CreateConversationDTO {
  @IsOptional()
  @IsString()
  title?: string;
}
