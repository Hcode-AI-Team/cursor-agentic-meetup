import { getLocaleText } from '@hed-hog/api-locale';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { HttpMethod } from '../../types/http-method';
import { RouteType } from './create.dto';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

export class UpdateDTO {
  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.urlMustBeString', args.value) })
  url?: string;

  @IsOptional()
  @IsString({ message: (args) => getLocaleText('validation.methodMustBeString', args.value) })
  @IsIn(HTTP_METHODS, {
    message: (args) => getLocaleText('validation.methodMustBeValid', args.value),
  })
  method?: HttpMethod;

  @IsOptional()
  @IsIn(['HTTP', 'MCP'])
  type?: RouteType;

  @IsOptional()
  @IsString()
  tool_name?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
