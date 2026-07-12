import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreUsersMcpTools {
  constructor(private readonly userService: UserService) {}

  @McpTool({
    name: 'core.users.me',
    description: 'Returns the authenticated user profile',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async getMe(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.userService.findUserById(context.locale, context.userId);
  }

  @McpTool({
    name: 'core.users.list',
    description: 'Lists all users with optional pagination and search. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
        search: { type: 'string', description: 'Search term to filter users' },
        sortField: { type: 'string', description: 'Field to sort by' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
      },
    },
    readOnly: true,
  })
  async listUsers(
    args: {
      page?: number;
      pageSize?: number;
      search?: string;
      sortField?: string;
      sortOrder?: string;
    },
    _context: McpContext,
  ): Promise<any> {
    return this.userService.list({
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.users.get',
    description: 'Returns a single user by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
      },
      required: ['userId'],
    },
    readOnly: true,
  })
  async getUser(
    args: { userId: number },
    context: McpContext,
  ): Promise<any> {
    return this.userService.get(context.locale, args.userId);
  }

  @McpTool({
    name: 'core.users.create',
    description: 'Creates a new user with email and password. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'User email address' },
        password: { type: 'string', description: 'User password' },
        name: { type: 'string', description: 'User full name' },
      },
      required: ['email', 'password', 'name'],
    },
  })
  async createUser(
    args: { email: string; password: string; name: string },
    context: McpContext,
  ): Promise<any> {
    return this.userService.createWithEmailAndPassword(context.locale, args as any);
  }

  @McpTool({
    name: 'core.users.update',
    description: 'Updates a user name by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
        name: { type: 'string', description: 'New user name' },
      },
      required: ['userId'],
    },
  })
  async updateUser(
    args: { userId: number; name?: string },
    context: McpContext,
  ): Promise<any> {
    return this.userService.update(context.locale, args.userId, { name: args.name } as any);
  }

  @McpTool({
    name: 'core.users.reset-password',
    description: 'Resets the password of a user by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
        password: { type: 'string', description: 'New password (must meet strength requirements)' },
      },
      required: ['userId'],
    },
  })
  async resetPassword(
    args: { userId: number; password?: string },
    context: McpContext,
  ): Promise<any> {
    return this.userService.resetPassword(context.locale, args.userId, { password: args.password } as any);
  }

  @McpTool({
    name: 'core.users.delete',
    description: 'Deletes one or more users by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of user IDs to delete',
        },
      },
      required: ['ids'],
    },
  })
  async deleteUsers(
    args: { ids: number[] },
    context: McpContext,
  ): Promise<any> {
    return this.userService.delete(context.locale, { ids: args.ids });
  }

  @McpTool({
    name: 'core.users.roles',
    description: 'Returns the roles assigned to a user. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
      },
      required: ['userId'],
    },
    readOnly: true,
  })
  async getUserRoles(
    args: { userId: number },
    context: McpContext,
  ): Promise<any> {
    return this.userService.getUserRoles(context.locale, args.userId);
  }

  @McpTool({
    name: 'core.users.menus',
    description: 'Returns the menu items accessible to a user. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
      },
      required: ['userId'],
    },
    readOnly: true,
  })
  async getUserMenus(
    args: { userId: number },
    context: McpContext,
  ): Promise<any> {
    return this.userService.getUserMenus(context.locale, args.userId);
  }

  @McpTool({
    name: 'core.users.routes',
    description: 'Returns the routes accessible to a user. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
      },
      required: ['userId'],
    },
    readOnly: true,
  })
  async getUserRoutes(
    args: { userId: number },
    context: McpContext,
  ): Promise<any> {
    return this.userService.getUserRoutes(context.locale, args.userId);
  }

  @McpTool({
    name: 'core.users.assign-role',
    description: 'Assigns a role to a user. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
        roleId: { type: 'number', description: 'Role ID to assign' },
      },
      required: ['userId', 'roleId'],
    },
  })
  async assignRole(
    args: { userId: number; roleId: number },
    context: McpContext,
  ): Promise<any> {
    return this.userService.assignRoleToUser(context.locale, args.userId, args.roleId);
  }

  @McpTool({
    name: 'core.users.remove-role',
    description: 'Removes a role from a user. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
        roleId: { type: 'number', description: 'Role ID to remove' },
      },
      required: ['userId', 'roleId'],
    },
  })
  async removeRole(
    args: { userId: number; roleId: number },
    context: McpContext,
  ): Promise<any> {
    return this.userService.removeRoleFromUser(context.locale, args.userId, args.roleId);
  }

  @McpTool({
    name: 'core.users.verify-identifier',
    description: 'Verifies a user identifier (e.g. email confirmation). Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID' },
        identifierId: { type: 'number', description: 'Identifier ID to verify' },
      },
      required: ['userId', 'identifierId'],
    },
  })
  async verifyIdentifier(
    args: { userId: number; identifierId: number },
    context: McpContext,
  ): Promise<any> {
    return this.userService.verifyIdentifier(context.locale, args.userId, args.identifierId);
  }
}
