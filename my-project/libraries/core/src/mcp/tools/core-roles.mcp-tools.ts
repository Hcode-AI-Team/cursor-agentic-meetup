import { Injectable } from '@nestjs/common';
import { PageOrderDirection } from '@hed-hog/api-pagination';
import { RoleService } from '../../role/role.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreRolesMcpTools {
  constructor(private readonly roleService: RoleService) {}

  @McpTool({
    name: 'core.roles.list',
    description: 'Lists all roles with optional pagination and search. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
        search: { type: 'string', description: 'Search term to filter roles' },
        sortField: { type: 'string', description: 'Field to sort by' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
      },
    },
    readOnly: true,
  })
  async listRoles(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    context: McpContext,
  ): Promise<any> {
    return this.roleService.list(
      {
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
        search: args.search ?? '',
        sortField: args.sortField ?? 'id',
        sortOrder: (args.sortOrder as any) ?? 'asc',
        fields: '',
      },
      context.locale,
    );
  }

  @McpTool({
    name: 'core.roles.get',
    description: 'Returns a single role by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
      },
      required: ['roleId'],
    },
    readOnly: true,
  })
  async getRole(args: { roleId: number }, _context: McpContext): Promise<any> {
    return this.roleService.get(args.roleId);
  }

  @McpTool({
    name: 'core.roles.create',
    description: 'Creates a new role. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Role slug (unique identifier)' },
        locale: {
          type: 'object',
          description: 'Locale translations keyed by locale code, e.g. {"en": {"name": "Admin", "description": "..."}}',
        },
      },
      required: ['slug'],
    },
  })
  async createRole(args: { slug: string; locale?: Record<string, { name: string; description?: string }> }, _context: McpContext): Promise<any> {
    return this.roleService.create(args as any);
  }

  @McpTool({
    name: 'core.roles.update',
    description: 'Updates an existing role by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
        slug: { type: 'string', description: 'New slug' },
        locale: { type: 'object', description: 'Updated locale translations' },
      },
      required: ['roleId'],
    },
  })
  async updateRole(
    args: { roleId: number; slug?: string; locale?: Record<string, any> },
    context: McpContext,
  ): Promise<any> {
    const { roleId, ...data } = args;
    return this.roleService.update(roleId, data as any, context.locale);
  }

  @McpTool({
    name: 'core.roles.delete',
    description: 'Deletes one or more roles by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Array of role IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteRoles(args: { ids: number[] }, context: McpContext): Promise<any> {
    return this.roleService.delete({ ids: args.ids }, context.locale);
  }

  @McpTool({
    name: 'core.roles.users.list',
    description: 'Lists users assigned to a role. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['roleId'],
    },
    readOnly: true,
  })
  async listRoleUsers(args: { roleId: number; page?: number; pageSize?: number }, _context: McpContext): Promise<any> {
    return this.roleService.listUsers(args.roleId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: PageOrderDirection.Asc,
      fields: '',
    });
  }

  @McpTool({
    name: 'core.roles.users.update',
    description: 'Replaces all users assigned to a role. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'User IDs to assign' },
      },
      required: ['roleId', 'ids'],
    },
  })
  async updateRoleUsers(args: { roleId: number; ids: number[] }, _context: McpContext): Promise<any> {
    return this.roleService.updateUsers(args.roleId, { ids: args.ids });
  }

  @McpTool({
    name: 'core.roles.menus.list',
    description: 'Lists menus assigned to a role. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['roleId'],
    },
    readOnly: true,
  })
  async listRoleMenus(args: { roleId: number; page?: number; pageSize?: number }, context: McpContext): Promise<any> {
    return this.roleService.listMenus(context.locale, args.roleId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: PageOrderDirection.Asc,
      fields: '',
    });
  }

  @McpTool({
    name: 'core.roles.menus.update',
    description: 'Replaces all menus assigned to a role. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Menu IDs to assign' },
      },
      required: ['roleId', 'ids'],
    },
  })
  async updateRoleMenus(args: { roleId: number; ids: number[] }, _context: McpContext): Promise<any> {
    return this.roleService.updateMenus(args.roleId, { ids: args.ids });
  }

  @McpTool({
    name: 'core.roles.routes.list',
    description: 'Lists routes assigned to a role with optional URL filter. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
        search: { type: 'string', description: 'Search filter for URL' },
        method: { type: 'string', description: 'HTTP method filter (GET, POST, etc.)' },
      },
      required: ['roleId'],
    },
    readOnly: true,
  })
  async listRoleRoutes(
    args: { roleId: number; page?: number; pageSize?: number; search?: string; method?: string },
    _context: McpContext,
  ): Promise<any> {
    return this.roleService.listRoutes(
      args.roleId,
      {
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
        search: '',
        sortField: 'id',
        sortOrder: PageOrderDirection.Asc,
        fields: '',
      },
      args.search,
      'contains',
      args.method,
    );
  }

  @McpTool({
    name: 'core.roles.routes.update',
    description: 'Replaces all routes assigned to a role. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Route IDs to assign' },
      },
      required: ['roleId', 'ids'],
    },
  })
  async updateRoleRoutes(args: { roleId: number; ids: number[] }, _context: McpContext): Promise<any> {
    return this.roleService.updateRoutes(args.roleId, { ids: args.ids });
  }

  @McpTool({
    name: 'core.roles.screens.list',
    description: 'Lists screens assigned to a role. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
      required: ['roleId'],
    },
    readOnly: true,
  })
  async listRoleScreens(args: { roleId: number; page?: number; pageSize?: number }, context: McpContext): Promise<any> {
    return this.roleService.listScreens(context.locale, args.roleId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: PageOrderDirection.Asc,
      fields: '',
    });
  }

  @McpTool({
    name: 'core.roles.screens.update',
    description: 'Replaces all screens assigned to a role. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: 'Role ID' },
        ids: { type: 'array', items: { type: 'number' }, description: 'Screen IDs to assign' },
      },
      required: ['roleId', 'ids'],
    },
  })
  async updateRoleScreens(args: { roleId: number; ids: number[] }, _context: McpContext): Promise<any> {
    return this.roleService.updateScreens(args.roleId, { ids: args.ids });
  }
}
