import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { plainToClass } from 'class-transformer';

export const InjectLocale = createParamDecorator(
  (data: any, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const body = request.body;
    const locale = request['locale'] || 'en';
    
    // Inject locale into the body object
    if (body && typeof body === 'object') {
      body['_locale'] = locale;
    }
    
    return data ? plainToClass(data, body) : body;
  },
);
