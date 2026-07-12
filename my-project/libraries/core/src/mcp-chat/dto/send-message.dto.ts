import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDTO {
  @IsString()
  @IsNotEmpty()
  message: string;
}
