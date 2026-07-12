import { Injectable } from '@nestjs/common';
import { EventWebhookService } from '../../webhook-integration/event-webhook.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreEventWebhooksMcpTools {
  constructor(private readonly eventWebhookService: EventWebhookService) {}

  @McpTool({
    name: 'core.event-webhooks.list',
    description: 'Lists event-driven webhooks with optional pagination. Admin only.',
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
  async listEventWebhooks(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    _context: McpContext,
  ): Promise<any> {
    return this.eventWebhookService.list({
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.event-webhooks.get',
    description: 'Returns a single event webhook by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Event webhook ID' },
      },
      required: ['id'],
    },
    readOnly: true,
  })
  async getEventWebhook(args: { id: number }, _context: McpContext): Promise<any> {
    return this.eventWebhookService.get(args.id);
  }

  @McpTool({
    name: 'core.event-webhooks.create',
    description: 'Creates a new event webhook. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Webhook name' },
        slug: { type: 'string', description: 'Webhook slug' },
        url: { type: 'string', description: 'Target URL to POST events to' },
        method: { type: 'string', description: 'HTTP method (default: POST)' },
        status: { type: 'string', description: 'Status (active, inactive)' },
        events: { type: 'array', items: { type: 'string' }, description: 'Event slugs to subscribe to' },
      },
      required: ['name', 'url'],
    },
  })
  async createEventWebhook(args: Record<string, any>, _context: McpContext): Promise<any> {
    return this.eventWebhookService.create(args);
  }

  @McpTool({
    name: 'core.event-webhooks.update',
    description: 'Updates an existing event webhook by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Event webhook ID' },
        name: { type: 'string', description: 'New name' },
        url: { type: 'string', description: 'New target URL' },
        status: { type: 'string', description: 'New status (active, inactive)' },
        events: { type: 'array', items: { type: 'string' }, description: 'New event slugs to subscribe to' },
      },
      required: ['id'],
    },
  })
  async updateEventWebhook(args: { id: number; [key: string]: any }, _context: McpContext): Promise<any> {
    const { id, ...data } = args;
    return this.eventWebhookService.update(id, data);
  }

  @McpTool({
    name: 'core.event-webhooks.delete',
    description: 'Deletes one or more event webhooks by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Event webhook IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteEventWebhooks(args: { ids: number[] }, _context: McpContext): Promise<any> {
    return this.eventWebhookService.delete({ ids: args.ids });
  }

  @McpTool({
    name: 'core.event-webhooks.logs.list',
    description: 'Lists delivery logs for an event webhook. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        webhookId: { type: 'number', description: 'Event webhook ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['webhookId'],
    },
    readOnly: true,
  })
  async listEventWebhookLogs(args: { webhookId: number; page?: number; pageSize?: number }, _context: McpContext): Promise<any> {
    return this.eventWebhookService.listLogs(args.webhookId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: 'desc' as any,
      fields: '',
    });
  }
}
