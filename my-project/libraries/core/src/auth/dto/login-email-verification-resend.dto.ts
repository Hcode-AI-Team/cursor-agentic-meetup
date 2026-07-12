import { IsNotEmpty, IsString } from 'class-validator';

export class LoginEmailVerificationResendDTO {
  @IsString()
  @IsNotEmpty()
  token: string;
}
