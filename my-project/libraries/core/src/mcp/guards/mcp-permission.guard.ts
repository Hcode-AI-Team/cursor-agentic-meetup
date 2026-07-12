import { PrismaService } from '@hed-hog/api-prisma';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class McpPermissionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only POST requests carry tool invocations
    if (request.method !== 'POST') return true;

    const body = request.body as any;
    const toolName: string | undefined =
      body?.method === 'tools/call' ? body?.params?.name : undefined;

    // tools/list, initialize, ping, etc. — no per-tool permission check needed
    if (!toolName) return true;

    const userId = (request as any)?.auth?.sub;

    const count = await this.prisma.route.count({
      where: {
        type: 'MCP' as any,
        tool_name: toolName,
        role_route: {
          some: {
            role: {
              role_user: {
                some: { user_id: userId },
              },
            },
          },
        },
      },
    });

    if (count === 0) {
      throw new ForbiddenException(`Access denied to MCP tool '${toolName}'`);
    }

    return true;
  }
}
