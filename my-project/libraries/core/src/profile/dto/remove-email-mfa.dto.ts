import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveEmailMfaDto {
    @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
    @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
    token: string;

    @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
    @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
    hash: string;
}