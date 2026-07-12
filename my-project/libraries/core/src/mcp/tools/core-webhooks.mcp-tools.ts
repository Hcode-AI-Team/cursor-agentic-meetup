import { Injectable } from '@nestjs/common';
import { WebhookIntegrationService } from '../../webhook-integration/webhook-integration.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreWebhooksMcpTools {
  constructor(private readonly webhookService: WebhookIntegrationService) {}

  @McpTool({
    name: 'core.webhooks.list',
    description: 'Lists webhook integrations with optional pagination. Admin only.',
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
  async listWebhooks(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    _context: McpContext,
  ): Promise<any> {
    return this.webhookService.list({
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.webhooks.get',
    description: 'Returns a single webhook integration by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Webhook ID' },
      },
      required: ['id'],
    },
    readOnly: true,
  })
  async getWebhook(args: { id: number }, _context: McpContext): Promise<any> {
    return this.webhookService.get(args.id);
  }

  @McpTool({
    name: 'core.webhooks.create',
    description: 'Creates a new webhook integration. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Webhook name' },
        slug: { type: 'string', description: 'Webhook slug' },
        description: { type: 'string', description: 'Webhook description' },
      },
      required: ['name'],
    },
  })
  async createWebhook(args: Record<string, any>, _context: McpContext): Promise<any> {
    return this.webhookService.create(args);
  }

  @McpTool({
    name: 'core.webhooks.update',
    description: 'Updates an existing webhook integration by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Webhook ID' },
        name: { type: 'string', description: 'New name' },
        slug: { type: 'string', description: 'New slug' },
        description: { type: 'string', description: 'New description' },
      },
      required: ['id'],
    },
  })
  async updateWebhook(args: { id: number; [key: string]: any }, _context: McpContext): Promise<any> {
    const { id, ...data } = args;
    return this.webhookService.update(id, data);
  }

  @McpTool({
    name: 'core.webhooks.delete',
    description: 'Deletes one or more webhook integrations by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Webhook IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteWebhooks(args: { ids: number[] }, _context: McpContext): Promise<any> {
    return this.webhookService.delete({ ids: args.ids });
  }

  @McpTool({
    name: 'core.webhooks.actions.list',
    description: 'Lists actions configured for a webhook. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        webhookId: { type: 'number', description: 'Webhook ID' },
      },
      required: ['webhookId'],
    },
    readOnly: true,
  })
  async listWebhookActions(args: { webhookId: number }, _context: McpContext): Promise<any> {
    return this.webhookService.listActions(args.webhookId);
  }

  @McpTool({
    name: 'core.webhooks.actions.create',
    description: 'Creates a new action for a webhook. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        webhookId: { type: 'number', description: 'Webhook ID' },
        type: { type: 'string', description: 'Action type (e.g. email, http)' },
        config: { type: 'object', description: 'Action configuration' },
      },
      required: ['webhookId', 'type'],
    },
  })
  async createWebhookAction(args: { webhookId: number; [key: string]: any }, _context: McpContext): Promise<any> {
    const { webhookId, ...data } = args;
    return this.webhookService.createAction(webhookId, data);
  }

  @McpTool({
    name: 'core.webhooks.actions.update',
    description: 'Updates an existing webhook action. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        webhookId: { type: 'number', description: 'Webhook ID' },
        actionId: { type: 'number', description: 'Action ID' },
        type: { type: 'string', description: 'New action type' },
        config: { type: 'object', description: 'New action configuration' },
      },
      required: ['webhookId', 'actionId'],
    },
  })
  async updateWebhookAction(args: { webhookId: number; actionId: number; [key: string]: any }, _context: McpContext): Promise<any> {
    const { webhookId, actionId, ...data } = args;
    return this.webhookService.updateAction(webhookId, actionId, data);
  }

  @McpTool({
    name: 'core.webhooks.actions.delete',
    description: 'Deletes one or more webhook actions. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        webhookId: { type: 'number', description: 'Webhook ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Action IDs to delete' },
      },
      required: ['webhookId', 'ids'],
    },
  })
  async deleteWebhookActions(args: { webhookId: number; ids: number[] }, _context: McpContext): Promise<any> {
    return this.webhookService.deleteActions(args.webhookId, { ids: args.ids });
  }

  @McpTool({
    name: 'core.webhooks.logs.list',
    description: 'Lists execution logs for a webhook. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        webhookId: { type: 'number', description: 'Webhook ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['webhookId'],
    },
    readOnly: true,
  })
  async listWebhookLogs(args: { webhookId: number; page?: number; pageSize?: number }, _context: McpContext): Promise<any> {
    return this.webhookService.listLogs(args.webhookId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: 'desc' as any,
      fields: '',
    });
  }
}
