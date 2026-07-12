import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AccessLogService } from './access-log.service';

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  constructor(private readonly accessLogService: AccessLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const path: string = request.url ?? '';

    if (path.startsWith('/mcp')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const userId: number | undefined = request.auth?.sub;
        const forwarded = request.headers['x-forwarded-for'] as string | undefined;
        const ip: string = forwarded ? forwarded.split(',')[0].trim() : (request.ip ?? '');
        const userAgent: string = (request.headers['user-agent'] as string) ?? '';
        const method: string = request.method ?? '';

        this.accessLogService.recordHttp({ userId, ip, userAgent, method, path });
      }),
    );
  }
}
