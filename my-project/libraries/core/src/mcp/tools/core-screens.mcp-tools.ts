import { Injectable } from '@nestjs/common';
import { PageOrderDirection } from '@hed-hog/api-pagination';
import { ScreenService } from '../../screen/screen.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreScreensMcpTools {
  constructor(private readonly screenService: ScreenService) {}

  @McpTool({
    name: 'core.screens.list',
    description: 'Lists all screens with optional pagination and search. Admin only.',
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
  async listScreens(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    context: McpContext,
  ): Promise<any> {
    return this.screenService.list(context.locale, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.screens.get',
    description: 'Returns a single screen by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        screenId: { type: 'number', description: 'Screen ID' },
      },
      required: ['screenId'],
    },
    readOnly: true,
  })
  async getScreen(args: { screenId: number }, _context: McpContext): Promise<any> {
    return this.screenService.get(args.screenId);
  }

  @McpTool({
    name: 'core.screens.create',
    description: 'Creates a new screen. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Screen slug (unique identifier)' },
        locale: { type: 'object', description: 'Locale translations, e.g. {"en": {"name": "Dashboard"}}' },
      },
      required: ['slug'],
    },
  })
  async createScreen(args: { slug: string; locale?: Record<string, any> }, _context: McpContext): Promise<any> {
    return this.screenService.create(args as any);
  }

  @McpTool({
    name: 'core.screens.update',
    description: 'Updates an existing screen by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        screenId: { type: 'number', description: 'Screen ID' },
        slug: { type: 'string', description: 'New slug' },
        locale: { type: 'object', description: 'Updated locale translations' },
      },
      required: ['screenId'],
    },
  })
  async updateScreen(args: { screenId: number; slug?: string; locale?: Record<string, any> }, _context: McpContext): Promise<any> {
    const { screenId, ...data } = args;
    return this.screenService.update({ id: screenId, data: data as any });
  }

  @McpTool({
    name: 'core.screens.delete',
    description: 'Deletes one or more screens by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Screen IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteScreens(args: { ids: number[] }, _context: McpContext): Promise<any> {
    return this.screenService.delete({ ids: args.ids });
  }

  @McpTool({
    name: 'core.screens.roles.list',
    description: 'Lists roles assigned to a screen. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        screenId: { type: 'number', description: 'Screen ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['screenId'],
    },
    readOnly: true,
  })
  async listScreenRoles(args: { screenId: number; page?: number; pageSize?: number }, context: McpContext): Promise<any> {
    return this.screenService.listRoles(context.locale, args.screenId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: PageOrderDirection.Asc,
      fields: '',
    });
  }

  @McpTool({
    name: 'core.screens.roles.update',
    description: 'Replaces all roles assigned to a screen. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        screenId: { type: 'number', description: 'Screen ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Role IDs to assign' },
      },
      required: ['screenId', 'ids'],
    },
  })
  async updateScreenRoles(args: { screenId: number; ids: number[] }, _context: McpContext): Promise<any> {
    return this.screenService.updateRoles(args.screenId, { ids: args.ids });
  }

  @McpTool({
    name: 'core.screens.routes.list',
    description: 'Lists routes assigned to a screen. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        screenId: { type: 'number', description: 'Screen ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['screenId'],
    },
    readOnly: true,
  })
  async listScreenRoutes(args: { screenId: number; page?: number; pageSize?: number }, _context: McpContext): Promise<any> {
    return this.screenService.listRoutes(args.screenId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: PageOrderDirection.Asc,
      fields: '',
    });
  }

  @McpTool({
    name: 'core.screens.routes.update',
    description: 'Replaces all routes assigned to a screen. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        screenId: { type: 'number', description: 'Screen ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Route IDs to assign' },
      },
      required: ['screenId', 'ids'],
    },
  })
  async updateScreenRoutes(args: { screenId: number; ids: number[] }, _context: McpContext): Promise<any> {
    return this.screenService.updateRoutes(args.screenId, { ids: args.ids });
  }
}
