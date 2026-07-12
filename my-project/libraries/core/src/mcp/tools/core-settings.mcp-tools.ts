import { Injectable } from '@nestjs/common';
import { SettingService } from '../../setting/setting.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreSettingsMcpTools {
  constructor(private readonly settingService: SettingService) {}

  @McpTool({
    name: 'core.settings.get',
    description: 'Returns effective settings for the authenticated user',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async getEffectiveSettings(
    _args: Record<string, any>,
    context: McpContext,
  ): Promise<any> {
    return this.settingService.getEffectiveSettings(context.userId);
  }

  @McpTool({
    name: 'core.settings.set',
    description:
      'Updates a user-overridable setting value for the authenticated user. Only settings with user_override=true can be changed.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug identifier of the setting to update',
        },
        value: {
          type: 'string',
          description: 'The new value for the setting',
        },
      },
      required: ['slug', 'value'],
    },
  })
  async setUserSetting(
    args: { slug: string; value: string },
    context: McpContext,
  ): Promise<any> {
    return this.settingService.setSettingUserValue(
      context.locale,
      context.userId,
      args.slug,
      args.value,
    );
  }

  @McpTool({
    name: 'core.settings.list',
    description: 'Lists all settings with optional pagination and search. Admin only.',
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
  async listSettings(
    args: { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: string },
    context: McpContext,
  ): Promise<any> {
    return this.settingService.listSettings(context.locale, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: args.sortField ?? 'id',
      sortOrder: (args.sortOrder as any) ?? 'asc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.settings.get-by-id',
    description: 'Returns a single setting by ID. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        settingId: { type: 'number', description: 'Setting ID' },
      },
      required: ['settingId'],
    },
    readOnly: true,
  })
  async getSettingById(args: { settingId: number }, _context: McpContext): Promise<any> {
    return this.settingService.get(args.settingId);
  }

  @McpTool({
    name: 'core.settings.groups.list',
    description: 'Lists setting groups with optional pagination. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
        search: { type: 'string', description: 'Search term' },
      },
    },
    readOnly: true,
  })
  async listSettingGroups(
    args: { page?: number; pageSize?: number; search?: string },
    context: McpContext,
  ): Promise<any> {
    return this.settingService.listSettingGroups(context.locale, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: args.search ?? '',
      sortField: 'id',
      sortOrder: 'asc' as any,
      fields: '',
    });
  }

  @McpTool({
    name: 'core.settings.set-many',
    description: 'Updates multiple settings at once. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        settings: { type: 'object', description: 'Key-value pairs of slug → value to update' },
      },
      required: ['settings'],
    },
  })
  async setManySettings(args: { settings: Record<string, string> }, _context: McpContext): Promise<any> {
    return this.settingService.setManySettings(args.settings as any);
  }

  @McpTool({
    name: 'core.settings.update-from-slug',
    description: 'Updates a single setting value by its slug. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Setting slug' },
        value: { type: 'string', description: 'New value' },
      },
      required: ['slug', 'value'],
    },
  })
  async updateSettingFromSlug(args: { slug: string; value: string }, _context: McpContext): Promise<any> {
    return this.settingService.updateFromSlug(args.slug, { value: args.value } as any);
  }

  @McpTool({
    name: 'core.settings.delete',
    description: 'Deletes one or more settings by their IDs. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Setting IDs to delete' },
      },
      required: ['ids'],
    },
  })
  async deleteSettings(args: { ids: number[] }, context: McpContext): Promise<any> {
    return this.settingService.delete(context.locale, { ids: args.ids });
  }
}
