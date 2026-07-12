import { Injectable } from '@nestjs/common';
import { PageOrderDirection } from '@hed-hog/api-pagination';
import { RouteService } from '../../route/route.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreRoutesMcpTools {
  constructor(private readonly routeService: RouteService) {}

  @McpTool({
    name: 'core.routes.list',
    description: 'Lists all routes with optional pagination and search. Admin only.',
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
  async listRoutes(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    _context: McpContext,
  ): Promise<any> {
    return this.routeService.list({
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.routes.get',
    description: 'Returns a single route by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        routeId: { type: 'number', description: 'Route ID' },
      },
      required: ['routeId'],
    },
    readOnly: true,
  })
  async getRoute(args: { routeId: number }, context: McpContext): Promise<any> {
    return this.routeService.get(args.routeId, context.locale);
  }

  @McpTool({
    name: 'core.routes.create',
    description: 'Creates a new HTTP or MCP route. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Route URL (for HTTP routes)' },
        method: { type: 'string', description: 'HTTP method (GET, POST, PATCH, DELETE, PUT)' },
        type: { type: 'string', enum: ['HTTP', 'MCP'], description: 'Route type (default: HTTP)' },
        tool_name: { type: 'string', description: 'MCP tool name (for MCP routes)' },
        name: { type: 'string', description: 'Display name' },
      },
    },
  })
  async createRoute(
    args: { url?: string; method?: string; type?: string; tool_name?: string; name?: string },
    context: McpContext,
  ): Promise<any> {
    return this.routeService.create(args as any, context.locale);
  }

  @McpTool({
    name: 'core.routes.update',
    description: 'Updates an existing route by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        routeId: { type: 'number', description: 'Route ID' },
        url: { type: 'string', description: 'New URL' },
        method: { type: 'string', description: 'New HTTP method' },
        tool_name: { type: 'string', description: 'New MCP tool name' },
        name: { type: 'string', description: 'New display name' },
      },
      required: ['routeId'],
    },
  })
  async updateRoute(
    args: { routeId: number; url?: string; method?: string; tool_name?: string; name?: string },
    context: McpContext,
  ): Promise<any> {
    const { routeId, ...data } = args;
    return this.routeService.update({ id: routeId, data: data as any }, context.locale);
  }

  @McpTool({
    name: 'core.routes.delete',
    description: 'Deletes one or more routes by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Route IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteRoutes(args: { ids: number[] }, context: McpContext): Promise<any> {
    return this.routeService.delete({ ids: args.ids }, context.locale);
  }

  @McpTool({
    name: 'core.routes.roles.list',
    description: 'Lists roles assigned to a route. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        routeId: { type: 'number', description: 'Route ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['routeId'],
    },
    readOnly: true,
  })
  async listRouteRoles(args: { routeId: number; page?: number; pageSize?: number }, context: McpContext): Promise<any> {
    return this.routeService.listRoles(context.locale, args.routeId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: PageOrderDirection.Asc,
      fields: '',
    });
  }

  @McpTool({
    name: 'core.routes.roles.update',
    description: 'Replaces all roles assigned to a route. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        routeId: { type: 'number', description: 'Route ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Role IDs to assign' },
      },
      required: ['routeId', 'ids'],
    },
  })
  async updateRouteRoles(args: { routeId: number; ids: number[] }, _context: McpContext): Promise<any> {
    return this.routeService.updateRoles(args.routeId, { ids: args.ids });
  }

  @McpTool({
    name: 'core.routes.screens.list',
    description: 'Lists screens assigned to a route. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        routeId: { type: 'number', description: 'Route ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['routeId'],
    },
    readOnly: true,
  })
  async listRouteScreens(args: { routeId: number; page?: number; pageSize?: number }, context: McpContext): Promise<any> {
    return this.routeService.listScreens(context.locale, args.routeId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: PageOrderDirection.Asc,
      fields: '',
    });
  }

  @McpTool({
    name: 'core.routes.screens.update',
    description: 'Replaces all screens assigned to a route. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        routeId: { type: 'number', description: 'Route ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Screen IDs to assign' },
      },
      required: ['routeId', 'ids'],
    },
  })
  async updateRouteScreens(args: { routeId: number; ids: number[] }, _context: McpContext): Promise<any> {
    return this.routeService.updateScreens(args.routeId, { ids: args.ids });
  }
}
