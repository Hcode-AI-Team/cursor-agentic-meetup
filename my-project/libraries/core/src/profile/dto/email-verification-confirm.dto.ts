
import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { IsPinCodeWithSetting } from '../../validators/is-pin-code-with-setting.validator';

export class EmailVerificationDto {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsPinCodeWithSetting()
  pin: string;

  @IsNumber({}, { message: (args) => getLocaleText('validation.numberRequired', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) }) 
  challengeId: number;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  name?: string;
}
