import { getLocaleText } from '@hed-hog/api-locale';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyMfaTotpDto {
    @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
    @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
    name: string;

    @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
    @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
    @MinLength(6, { message: (args) => getLocaleText('validation.minLength', args.value) })
    @MaxLength(6, { message: (args) => getLocaleText('validation.maxLength', args.value) })
    @Matches(/^\d{6}$/, { message: (args) => getLocaleText('validation.tokenFormat', args.value) })
    token: string;

    @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
    @IsNotEmpty({ message: (args) => getLocaleText('validation.fieldRequired', args.value) })
    secret: string;

}