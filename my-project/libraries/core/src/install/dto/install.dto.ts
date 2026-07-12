import { getLocaleText } from '@hed-hog/api-locale';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { IsEmailWithSettings } from '../../validators/is-email-with-settings.validator';

export class InstallDTO {
  @IsOptional()
  @IsString({ message: 'Nome da aplicação obrigatório' })
  @MinLength(1, { message: 'Nome da aplicação obrigatório' })
  appName?: string = 'HedHog';

  @IsOptional()
  @IsString({ message: 'Slogan obrigatório' })
  @MinLength(1, { message: 'Slogan obrigatório' })
  slogan?: string = 'Administration Panel';

  @IsOptional()
  @IsString({ message: 'Nome de usuário obrigatório' })
  @MinLength(1, { message: 'Nome de usuário obrigatório' })
  userName?: string = 'Root User';

  @IsOptional()
  @IsEmailWithSettings({ message: (args) => getLocaleText('validation.currentEmailInvalid', args.value) })
  email?: string = 'root@hedhog.com';

  @IsOptional()
  @IsString({ message: 'Senha deve ter pelo menos 6 caracteres' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password?: string = 'changeme';

  @IsOptional()
  @IsUrl(
    { require_protocol: true, require_tld: false },
    { message: 'URL da admin invalida' },
  )
  adminUrl?: string = 'http://localhost:3200';

  @IsOptional()
  @IsUrl(
    { require_protocol: true, require_tld: false },
    { message: 'URL da API invalida' },
  )
  apiUrl?: string = 'http://localhost:3100';
}
