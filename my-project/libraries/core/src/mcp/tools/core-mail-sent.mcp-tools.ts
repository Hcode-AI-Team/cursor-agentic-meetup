import { Injectable } from '@nestjs/common';
import { MailSentService } from '../../mail-sent/mail-sent.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreMailSentMcpTools {
  constructor(private readonly mailSentService: MailSentService) {}

  @McpTool({
    name: 'core.mail-sent.list',
    description: 'Lists sent mail records with optional filters. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
        search: { type: 'string', description: 'Search term' },
        sortField: { type: 'string', description: 'Field to sort by' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
        status: { type: 'string', description: 'Filter by status (e.g. sent, failed)' },
        hasError: { type: 'boolean', description: 'Filter by error presence' },
        recipientEmail: { type: 'string', description: 'Filter by recipient email' },
        createdAtFrom: { type: 'string', description: 'Start date filter (ISO 8601)' },
        createdAtTo: { type: 'string', description: 'End date filter (ISO 8601)' },
      },
    },
    readOnly: true,
  })
  async listMailSent(args: Record<string, any>, _context: McpContext): Promise<any> {
    return this.mailSentService.list({
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: args.sortOrder ?? 'asc',
      fields: '',
      status: args.status,
      hasError: args.hasError,
      recipientEmail: args.recipientEmail,
      createdAtFrom: args.createdAtFrom,
      createdAtTo: args.createdAtTo,
    } as any);
  }

  @McpTool({
    name: 'core.mail-sent.get',
    description: 'Returns a single sent mail record by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Sent mail record ID' },
      },
      required: ['id'],
    },
    readOnly: true,
  })
  async getMailSent(args: { id: number }, context: McpContext): Promise<any> {
    return this.mailSentService.get(context.locale, args.id);
  }

  @McpTool({
    name: 'core.mail-sent.delete',
    description: 'Deletes one or more sent mail records by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Sent mail record IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteMailSent(args: { ids: number[] }, context: McpContext): Promise<any> {
    return this.mailSentService.delete(context.locale, { ids: args.ids });
  }
}
