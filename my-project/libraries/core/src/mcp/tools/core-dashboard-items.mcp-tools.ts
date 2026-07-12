import { Injectable } from '@nestjs/common';
import { DashboardItemService } from '../../dashboard/dashboard-item/dashboard-item.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreDashboardItemsMcpTools {
  constructor(private readonly dashboardItemService: DashboardItemService) {}

  @McpTool({
    name: 'core.dashboard-items.list',
    description: 'Lists dashboard items, optionally filtered by dashboard ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
        dashboardId: { type: 'number', description: 'Filter by dashboard ID' },
      },
    },
    readOnly: true,
  })
  async listDashboardItems(args: { page?: number; pageSize?: number; dashboardId?: number }, context: McpContext): Promise<any> {
    return this.dashboardItemService.getAllDashboardItems(
      { page: args.page ?? 1, pageSize: args.pageSize ?? 20, search: '', sortField: 'id', sortOrder: 'asc', fields: '' },
      context.locale,
      args.dashboardId,
    );
  }

  @McpTool({
    name: 'core.dashboard-items.create',
    description: 'Creates a new dashboard item (widget placement). Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        dashboardId: { type: 'number', description: 'Dashboard ID' },
        componentId: { type: 'number', description: 'Component ID' },
        position: { type: 'object', description: 'Position/layout config (x, y, w, h)' },
        config: { type: 'object', description: 'Component configuration' },
      },
      required: ['dashboardId', 'componentId'],
    },
  })
  async createDashboardItem(args: { dashboardId: number; componentId: number; position?: any; config?: any }, context: McpContext): Promise<any> {
    return this.dashboardItemService.createDashboardItem(args as any, context.locale);
  }

  @McpTool({
    name: 'core.dashboard-items.delete',
    description: 'Deletes a dashboard item by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Dashboard item ID' },
      },
      required: ['id'],
    },
  })
  async deleteDashboardItem(args: { id: number }, context: McpContext): Promise<any> {
    return this.dashboardItemService.deleteDashboardItem(args.id, context.locale);
  }
}
