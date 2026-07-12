import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetDTO {
  @IsNotEmpty({
    message: (args) =>  getLocaleText('reset.password.required', args.value)
  })
  @MinLength(8, { message: (args) => getLocaleText('reset.password.minLength', args.value) })
  password: string;

  @IsNotEmpty({ message: (args) => getLocaleText('reset.code.required', args.value) })
  code: string;
}
