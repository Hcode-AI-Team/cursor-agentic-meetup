import { IS_PUBLIC_KEY, WITH_NO_ROLE, WITH_ROLE } from '@hed-hog/api';
import { getLocaleText } from '@hed-hog/api-locale';
import { PrismaService } from '@hed-hog/api-prisma';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ALLOW_MCP_TOKEN } from '../../mcp/decorators/allow-mcp-token.decorator';
import { SecurityService } from '../../security/security.service';
import { TokenService } from '../../token/token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private token: TokenService,
    private reflector: Reflector,
    private prisma: PrismaService,
    private security: SecurityService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const withRole = this.reflector.getAllAndOverride<boolean>(WITH_ROLE, [
      context.getHandler(),
      context.getClass(),
    ]);

    const withNoRole = this.reflector.getAllAndOverride<boolean>(WITH_NO_ROLE, [
      context.getHandler(),
      context.getClass(),
    ]);

    const allowMcpToken = this.reflector.getAllAndOverride<boolean>(ALLOW_MCP_TOKEN, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    const locale = request.headers['locale'] || request.headers['accept-language'] || 'en';

    if (token?.startsWith('hedhog_api_')) {
      return this.verifyApiKey(request, token, isPublic);
    }

    if (token?.startsWith('hedhog_mcp_')) {
      if (allowMcpToken) {
        // Real validation (mcp_api_key lookup) happens in McpAuthGuard on /mcp.
        return true;
      }
      if (isPublic) return true;
      throw new UnauthorizedException('Invalid API key');
    }

    // If endpoint requires role/authentication and no token provided
    if (!token) {
      if (isPublic) {
        return true;
      } else if (withNoRole) {
        this.logger.debug(`[AuthGuard] No token: ${request.method} ${request.url}`);
        // @NoRole() requires authentication but no specific role — token is mandatory
        throw new UnauthorizedException(
          getLocaleText('accessDenied', locale, 'Access denied.'),
        );
      } else if (withRole) {
        this.logger.debug(`[AuthGuard] No token: ${request.method} ${request.url}`);
        // @Role() decorator requires authentication
        throw new UnauthorizedException(
          getLocaleText('accessDenied', locale, 'Access denied.'),
        );
      } else {
        this.logger.debug(`[AuthGuard] No token: ${request.method} ${request.url}`);
        // No explicit decorator, default behavior (deny)
        throw new UnauthorizedException(
          getLocaleText('accessDenied', locale, 'Access denied.'),
        );
      }
    }

    try {
      const payload = await this.token.verify(locale, token);

      request['auth'] = payload;
    } catch (error) {
      if (isPublic) {
        return true;
      } else {
        const errName = (error as any)?.name ?? 'UnknownError';
        const message = (error as any)?.message || errName || 'Unauthorized';
        // Token expirado é rotineiro (cliente renova); só alerta para rejeições genuínas.
        if (!/expired/i.test(message)) {
          this.logger.warn(`[AuthGuard] Token rejected ${request.method} ${request.url} error=${errName}: ${message}`);
        }
        throw new UnauthorizedException(message);
      }
    }

    return true;
  }

  private async verifyApiKey(request: Request, token: string, isPublic: boolean): Promise<boolean> {
    const hash = this.security.hashWithPepper(token);
    const apiKey = await this.prisma.mcp_api_key.findFirst({
      where: { token_hash: hash, type: 'api', revoked_at: null },
    });

    if (!apiKey) {
      if (isPublic) return true;
      throw new UnauthorizedException('Invalid API key');
    }
    if (apiKey.expires_at && apiKey.expires_at <= new Date()) {
      if (isPublic) return true;
      throw new UnauthorizedException('API key expired');
    }

    this.prisma.mcp_api_key.update({
      where: { id: apiKey.id },
      data: { last_used_at: new Date() },
    }).catch(() => {});

    request['auth'] = { sub: apiKey.user_id, sessionId: null };
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
