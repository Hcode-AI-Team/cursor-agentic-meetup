import { Injectable } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreMailMcpTools {
  constructor(private readonly mailService: MailService) {}

  @McpTool({
    name: 'core.mail.list',
    description: 'Lists mail templates with optional pagination. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
        search: { type: 'string', description: 'Search term' },
        sortField: { type: 'string', description: 'Field to sort by' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
      },
    },
    readOnly: true,
  })
  async listMails(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    context: McpContext,
  ): Promise<any> {
    return this.mailService.list(context.locale, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.mail.get',
    description: 'Returns a single mail template by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Mail template ID' },
      },
      required: ['id'],
    },
    readOnly: true,
  })
  async getMail(args: { id: number }, context: McpContext): Promise<any> {
    return this.mailService.get(context.locale, args.id);
  }

  @McpTool({
    name: 'core.mail.create',
    description: 'Creates a new mail template. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Template slug (unique identifier)' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body (HTML)' },
      },
      required: ['slug'],
    },
  })
  async createMail(args: { slug: string; subject?: string; body?: string }, _context: McpContext): Promise<any> {
    return this.mailService.create(args as any);
  }

  @McpTool({
    name: 'core.mail.update',
    description: 'Updates an existing mail template by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Mail template ID' },
        slug: { type: 'string', description: 'New slug' },
        subject: { type: 'string', description: 'New subject' },
        body: { type: 'string', description: 'New body (HTML)' },
      },
      required: ['id'],
    },
  })
  async updateMail(args: { id: number; slug?: string; subject?: string; body?: string }, _context: McpContext): Promise<any> {
    const { id, ...data } = args;
    return this.mailService.update({ id, data: data as any });
  }

  @McpTool({
    name: 'core.mail.delete',
    description: 'Deletes one or more mail templates by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Template IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteMails(args: { ids: number[] }, _context: McpContext): Promise<any> {
    return this.mailService.delete({ ids: args.ids });
  }

  @McpTool({
    name: 'core.mail.test',
    description: 'Sends a test email using a specific template. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        templateId: { type: 'number', description: 'Mail template ID' },
      },
      required: ['to', 'templateId'],
    },
  })
  async testMail(args: { to: string; templateId: number }, context: McpContext): Promise<any> {
    return this.mailService.sendTestMail(context.locale, args as any);
  }

  @McpTool({
    name: 'core.mail.reload',
    description: 'Reloads the mail configuration from settings. Admin only.',
    inputSchema: { type: 'object', properties: {} },
  })
  async reloadMailConfig(_args: Record<string, any>, _context: McpContext): Promise<any> {
    return this.mailService.reloadConfig();
  }
}
