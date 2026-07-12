import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsStrongPasswordWithSettings } from '../../validators/is-strong-password-with-settings.validator';

export class CreateUserDTO {
  @IsString({ message: (args) => getLocaleText('validation.codeMustBeString', args.value) })
  @IsNotEmpty({ message: (args) => getLocaleText('validation.codeRequired', args.value) })
  code: string;

  @IsStrongPasswordWithSettings({
    message: (args) => getLocaleText('password.weakPassword', args.value)
  })
  password: string;

  @IsString({ message: (args) => getLocaleText('validation.streetMustBeString', args.value) })
  street: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.numberMustBeString', args.value) })
  number?: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.complementMustBeString', args.value) })
  complement?: string;

  @IsString({ message: (args) => getLocaleText('validation.districtMustBeString', args.value) })
  district: string;

  @IsString({ message: (args) => getLocaleText('validation.cityMustBeString', args.value) })
  city: string;

  @IsString({ message: (args) => getLocaleText('validation.stateMustBeString', args.value) })
  state: string;

  @IsString({ message: (args) => getLocaleText('validation.postalCodeMustBeString', args.value) })
  postal_code: string;
}
