import { Injectable } from '@nestjs/common';
import { PageOrderDirection } from '@hed-hog/api-pagination';
import { SessionService } from '../../session/session.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreSessionsMcpTools {
  constructor(private readonly sessionService: SessionService) {}

  @McpTool({
    name: 'core.sessions.active',
    description: 'Returns active sessions for the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
    },
    readOnly: true,
  })
  async getActiveSessions(args: { page?: number; pageSize?: number }, context: McpContext): Promise<any> {
    return this.sessionService.getUserSessionsActive(
      {
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
        search: '',
        sortField: 'id',
        sortOrder: PageOrderDirection.Asc,
        fields: '',
      },
      context.userId,
      context.locale,
    );
  }

  @McpTool({
    name: 'core.sessions.all',
    description: 'Returns all sessions (active and revoked) for the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
    },
    readOnly: true,
  })
  async getAllSessions(args: { page?: number; pageSize?: number }, context: McpContext): Promise<any> {
    return this.sessionService.getUserSessions(
      {
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
        search: '',
        sortField: 'id',
        sortOrder: PageOrderDirection.Asc,
        fields: '',
      },
      context.userId,
      context.locale,
    );
  }

  @McpTool({
    name: 'core.sessions.revoke',
    description: 'Revokes a specific session for the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'number', description: 'Session ID to revoke' },
      },
      required: ['sessionId'],
    },
  })
  async revokeSession(args: { sessionId: number }, context: McpContext): Promise<any> {
    return this.sessionService.revokeUserSession(context.userId, args.sessionId, context.locale);
  }

  @McpTool({
    name: 'core.sessions.revoke-all',
    description: 'Revokes all sessions for the authenticated user.',
    inputSchema: { type: 'object', properties: {} },
  })
  async revokeAllSessions(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.sessionService.revokeAllSessions(context.userId);
  }

  @McpTool({
    name: 'core.sessions.revoke-all-other',
    description: 'Revokes all sessions except the current one for the authenticated user.',
    inputSchema: { type: 'object', properties: {} },
  })
  async revokeAllOtherSessions(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.sessionService.revokeAllOtherSessions(context.userId, Number(context.sessionId));
  }
}
