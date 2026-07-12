import { Injectable } from '@nestjs/common';
import { PageOrderDirection } from '@hed-hog/api-pagination';
import { MenuService } from '../../menu/menu.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreMenusMcpTools {
  constructor(private readonly menuService: MenuService) {}

  @McpTool({
    name: 'core.menus.system',
    description: 'Returns the system menu for the authenticated user.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async getSystemMenu(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.menuService.getSystemMenu(context.locale, context.userId);
  }

  @McpTool({
    name: 'core.menus.stats',
    description: 'Returns menu statistics. Admin only.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async getMenuStats(_args: Record<string, any>, _context: McpContext): Promise<any> {
    return this.menuService.stats();
  }

  @McpTool({
    name: 'core.menus.all',
    description: 'Returns all menus as a flat list (no pagination). Admin only.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async listAllMenus(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.menuService.listAll(context.locale);
  }

  @McpTool({
    name: 'core.menus.list',
    description: 'Lists menus with pagination. Admin only.',
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
  async listMenus(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    context: McpContext,
  ): Promise<any> {
    return this.menuService.list(context.locale, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.menus.get',
    description: 'Returns a single menu by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        menuId: { type: 'number', description: 'Menu ID' },
      },
      required: ['menuId'],
    },
    readOnly: true,
  })
  async getMenu(args: { menuId: number }, context: McpContext): Promise<any> {
    return this.menuService.get(context.locale, args.menuId);
  }

  @McpTool({
    name: 'core.menus.create',
    description: 'Creates a new menu item. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Menu slug' },
        url: { type: 'string', description: 'Target URL' },
        icon: { type: 'string', description: 'Icon identifier' },
        order: { type: 'number', description: 'Display order' },
        menu_id: { type: 'number', description: 'Parent menu ID' },
        locale: { type: 'object', description: 'Locale translations, e.g. {"en": {"name": "Dashboard"}}' },
      },
    },
  })
  async createMenu(args: Record<string, any>, context: McpContext): Promise<any> {
    return this.menuService.create(context.locale, args as any);
  }

  @McpTool({
    name: 'core.menus.update',
    description: 'Updates an existing menu item by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        menuId: { type: 'number', description: 'Menu ID' },
        slug: { type: 'string', description: 'New slug' },
        url: { type: 'string', description: 'New URL' },
        icon: { type: 'string', description: 'New icon' },
        order: { type: 'number', description: 'New display order' },
        menu_id: { type: 'number', description: 'New parent menu ID' },
        locale: { type: 'object', description: 'Updated locale translations' },
      },
      required: ['menuId'],
    },
  })
  async updateMenu(args: { menuId: number; [key: string]: any }, context: McpContext): Promise<any> {
    const { menuId, ...data } = args;
    return this.menuService.update(context.locale, { id: menuId, data: data as any });
  }

  @McpTool({
    name: 'core.menus.delete',
    description: 'Deletes one or more menu items by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Menu IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteMenus(args: { ids: number[] }, context: McpContext): Promise<any> {
    return this.menuService.delete(context.locale, { ids: args.ids });
  }

  @McpTool({
    name: 'core.menus.order',
    description: 'Updates the display order of menus. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Menu IDs in the desired order' },
      },
      required: ['ids'],
    },
  })
  async updateMenuOrder(args: { ids: number[] }, context: McpContext): Promise<any> {
    return this.menuService.updateOrder(context.locale, { ids: args.ids });
  }

  @McpTool({
    name: 'core.menus.roles.list',
    description: 'Lists roles assigned to a menu. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        menuId: { type: 'number', description: 'Menu ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['menuId'],
    },
    readOnly: true,
  })
  async listMenuRoles(args: { menuId: number; page?: number; pageSize?: number }, context: McpContext): Promise<any> {
    return this.menuService.listRoles(context.locale, args.menuId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: PageOrderDirection.Asc,
      fields: '',
    });
  }

  @McpTool({
    name: 'core.menus.roles.update',
    description: 'Replaces all roles assigned to a menu. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        menuId: { type: 'number', description: 'Menu ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Role IDs to assign' },
      },
      required: ['menuId', 'ids'],
    },
  })
  async updateMenuRoles(args: { menuId: number; ids: number[] }, context: McpContext): Promise<any> {
    return this.menuService.updateRoles(context.locale, args.menuId, { ids: args.ids });
  }
}
