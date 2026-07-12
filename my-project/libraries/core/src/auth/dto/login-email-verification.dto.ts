import { IsNotEmpty, IsString } from 'class-validator';
import { IsPinCodeWithSetting } from '../../validators/is-pin-code-with-setting.validator';

export class LoginEmailVerificationDTO {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsPinCodeWithSetting()
  @IsNotEmpty()
  code: string;
}
