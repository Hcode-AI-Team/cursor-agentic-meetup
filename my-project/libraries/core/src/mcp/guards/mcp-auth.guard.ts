import { PrismaService } from '@hed-hog/api-prisma';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SecurityService } from '../../security/security.service';
import { TokenService } from '../../token/token.service';

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
    private readonly security: SecurityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const locale =
      request.headers['accept-language']?.split(',')[0]?.split('-')[0] ?? 'en';

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('MCP: Bearer token required');
    }

    if (token.startsWith('hedhog_mcp_')) {
      return this.verifyApiKey(request, token);
    }

    request['auth'] = await this.tokenService.verify(locale, token);
    return true;
  }

  private async verifyApiKey(request: Request, token: string): Promise<boolean> {
    const hash = this.security.hashWithPepper(token);
    const apiKey = await this.prisma.mcp_api_key.findFirst({
      where: { token_hash: hash, type: 'mcp', revoked_at: null },
    });

    if (!apiKey) {
      throw new UnauthorizedException('MCP: Invalid API key');
    }
    if (apiKey.expires_at && apiKey.expires_at <= new Date()) {
      throw new UnauthorizedException('MCP: API key expired');
    }

    this.prisma.mcp_api_key.update({
      where: { id: apiKey.id },
      data: { last_used_at: new Date() },
    }).catch(() => {});

    request['auth'] = { sub: apiKey.user_id, sessionId: null };
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
