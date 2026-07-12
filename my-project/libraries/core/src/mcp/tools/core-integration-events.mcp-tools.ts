import { Injectable } from '@nestjs/common';
import { IntegrationEventCatalogService } from '../../webhook-integration/integration-event-catalog.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreIntegrationEventsMcpTools {
  constructor(private readonly catalogService: IntegrationEventCatalogService) {}

  @McpTool({
    name: 'core.integration-events.list',
    description: 'Lists integration event catalog entries with optional pagination. Admin only.',
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
  async listIntegrationEvents(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    _context: McpContext,
  ): Promise<any> {
    return this.catalogService.list({
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'slug',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.integration-events.options',
    description: 'Returns active integration event options (for dropdown selection). Admin only.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async getIntegrationEventOptions(_args: Record<string, any>, _context: McpContext): Promise<any> {
    return this.catalogService.options();
  }

  @McpTool({
    name: 'core.integration-events.get',
    description: 'Returns a single integration event catalog entry by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Event catalog entry ID' },
      },
      required: ['id'],
    },
    readOnly: true,
  })
  async getIntegrationEvent(args: { id: number }, _context: McpContext): Promise<any> {
    return this.catalogService.get(args.id);
  }

  @McpTool({
    name: 'core.integration-events.create',
    description: 'Creates a new integration event catalog entry. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Event slug (unique identifier)' },
        name: { type: 'string', description: 'Event display name' },
        module: { type: 'string', description: 'Module this event belongs to' },
        description: { type: 'string', description: 'Event description' },
        status: { type: 'string', description: 'Event status (active, inactive)' },
      },
      required: ['slug', 'name'],
    },
  })
  async createIntegrationEvent(args: Record<string, any>, _context: McpContext): Promise<any> {
    return this.catalogService.create(args);
  }

  @McpTool({
    name: 'core.integration-events.update',
    description: 'Updates an integration event catalog entry by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Event catalog entry ID' },
        slug: { type: 'string', description: 'New slug' },
        name: { type: 'string', description: 'New display name' },
        description: { type: 'string', description: 'New description' },
        status: { type: 'string', description: 'New status' },
      },
      required: ['id'],
    },
  })
  async updateIntegrationEvent(args: { id: number; [key: string]: any }, _context: McpContext): Promise<any> {
    const { id, ...data } = args;
    return this.catalogService.update(id, data);
  }

  @McpTool({
    name: 'core.integration-events.delete',
    description: 'Deletes one or more integration event catalog entries by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Entry IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteIntegrationEvents(args: { ids: number[] }, _context: McpContext): Promise<any> {
    return this.catalogService.delete({ ids: args.ids });
  }
}
