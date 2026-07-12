import { Injectable } from '@nestjs/common';
import { DashboardService } from '../../dashboard/dashboard/dashboard.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreDashboardMcpTools {
  constructor(private readonly dashboardService: DashboardService) {}

  @McpTool({
    name: 'core.dashboard.list',
    description: 'Lists all dashboards with optional pagination. Admin only.',
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
  async listDashboards(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    _context: McpContext,
  ): Promise<any> {
    return this.dashboardService.getAllDashboards({
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: args.sortOrder ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.dashboard.get',
    description: 'Returns a single dashboard by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Dashboard ID' },
      },
      required: ['id'],
    },
    readOnly: true,
  })
  async getDashboard(args: { id: number }, context: McpContext): Promise<any> {
    return this.dashboardService.getDashboard(args.id, context.locale);
  }

  @McpTool({
    name: 'core.dashboard.create',
    description: 'Creates a new dashboard. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Dashboard name' },
        description: { type: 'string', description: 'Dashboard description' },
      },
      required: ['name'],
    },
  })
  async createDashboard(args: { name: string; description?: string }, context: McpContext): Promise<any> {
    return this.dashboardService.createDashboard(args as any, context.locale);
  }

  @McpTool({
    name: 'core.dashboard.update',
    description: 'Updates an existing dashboard by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Dashboard ID' },
        name: { type: 'string', description: 'New name' },
        description: { type: 'string', description: 'New description' },
      },
      required: ['id'],
    },
  })
  async updateDashboard(args: { id: number; name?: string; description?: string }, context: McpContext): Promise<any> {
    const { id, ...data } = args;
    return this.dashboardService.updateDashboard(id, data as any, context.locale);
  }

  @McpTool({
    name: 'core.dashboard.delete',
    description: 'Deletes a dashboard by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Dashboard ID' },
      },
      required: ['id'],
    },
  })
  async deleteDashboard(args: { id: number }, context: McpContext): Promise<any> {
    return this.dashboardService.deleteDashboard(args.id, context.locale);
  }
}
