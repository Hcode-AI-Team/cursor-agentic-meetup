import { IS_PUBLIC_KEY, WITH_NO_ROLE, WITH_ROLE } from '@hed-hog/api';
import { getLocaleText } from '@hed-hog/api-locale';
import { PrismaService } from '@hed-hog/api-prisma';
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    RequestMethod,
    UnauthorizedException,
} from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly forcePasswordResetAllowedRoutes = new Set([
    'PUT /profile/change-password',
    'GET /auth/verify',
  ]);

  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const withNoRole = this.reflector.getAllAndOverride<boolean>(WITH_NO_ROLE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (withNoRole) {
      // @NoRole() — user must be authenticated but no specific role is required
      return true;
    }

    const withRole = this.reflector.getAllAndOverride<boolean>(WITH_ROLE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!withRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const controller = context.getClass();
    const handler = context.getHandler();
    const controllerPath = this.reflector.get<string>('path', controller) || '';
    const methodPath = this.reflector.get<string>('path', handler) || '';

    const requestMethod = this.reflector.get<RequestMethod>(
      METHOD_METADATA,
      handler,
    );

    let fullPath = `/${controllerPath}/${methodPath}`.replace(/\/+/g, '/');

    if (fullPath.endsWith('/')) {
      fullPath = fullPath.slice(0, -1);
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      const locale = request['locale'] || 'en';
      throw new UnauthorizedException(
        getLocaleText('accessDenied', locale, 'Access denied.')
      );
    }

    const userId = (request as any)?.auth?.sub;

    let httpMethod: any;
    switch (requestMethod) {
      case RequestMethod.GET:
        httpMethod = 'GET';
        break;
      case RequestMethod.POST:
        httpMethod = 'POST';
        break;
      case RequestMethod.PUT:
        httpMethod = 'PUT';
        break;
      case RequestMethod.DELETE:
        httpMethod = 'DELETE';
        break;
      case RequestMethod.PATCH:
        httpMethod = 'PATCH';
        break;
      case RequestMethod.OPTIONS:
        httpMethod = 'OPTIONS';
        break;
      case RequestMethod.HEAD:
        httpMethod = 'HEAD';
        break;
      case RequestMethod.ALL:
        httpMethod = 'ALL';
        break;
    }
    
    const route = await this.prisma.route.count({
      where: {
        method: httpMethod,
        url: fullPath,
        role_route: {
          some: {
            role: {
              role_user: {
                some: {
                  user_id: userId,
                }
              }
            }
          }
        },
      },
    });

    if (route !== 1) {
      const locale = request['locale'] || 'en';
      const message = getLocaleText(
        'accessDenied', 
        locale, 
        'Access denied. User does not have permission to access {{method}} {{path}}'
      )
        .replace('{{method}}', httpMethod)
        .replace('{{path}}', fullPath);
      
      throw new ForbiddenException(message);
    }

    const hasPendingPasswordReset = await this.prisma.user_credential.findFirst({
      where: {
        user_id: userId,
        type: 'password',
        requires_reset: true,
        revoked_at: null,
      },
      select: { id: true },
    });

    if (
      hasPendingPasswordReset &&
      !this.forcePasswordResetAllowedRoutes.has(`${httpMethod} ${fullPath}`)
    ) {
      const locale = request['locale'] || 'en';
      throw new UnauthorizedException(
        getLocaleText(
          'profile.changePassword.required',
          locale,
          'Password update required before accessing this resource.',
        ),
      );
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
