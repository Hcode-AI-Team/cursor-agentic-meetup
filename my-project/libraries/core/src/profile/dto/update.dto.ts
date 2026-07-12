
import { getLocaleText } from '@hed-hog/api-locale';
import { IsString } from 'class-validator';

export class UpdateDto {
  @IsString({
    message: (args) =>  getLocaleText('profile.update.nameRequired', args.value)
  })
  name: string;
}
