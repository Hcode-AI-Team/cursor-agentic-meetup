import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { localeStorage } from '../utils/locale-context';

@Injectable()
export class LocaleInjectionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const acceptLanguage = req.headers['accept-language'] || 'en';
    const locale = acceptLanguage.split(',')[0].split('-')[0];

    localeStorage.run({ locale }, () => {
      next();
    });
  }
}
