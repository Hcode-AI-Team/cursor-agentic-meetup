import { getLocaleText } from '@hed-hog/api-locale';
import {
  IsString
} from 'class-validator';

export class UpdateDTO {
  @IsString({ message: (args) => getLocaleText('validation.nameMustBeString', args.value) })
  name?: string;
}
