import { Injectable } from '@nestjs/common';
import { ProfileService } from '../../profile/profile.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreProfileMcpTools {
  constructor(private readonly profileService: ProfileService) {}

  @McpTool({
    name: 'core.profile.get',
    description: 'Returns the authenticated user profile.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async getProfile(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.profileService.getProfile(context.userId);
  }

  @McpTool({
    name: 'core.profile.update',
    description: 'Updates the authenticated user profile name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'New display name' },
      },
    },
  })
  async updateProfile(args: { name?: string }, context: McpContext): Promise<any> {
    return this.profileService.update(context.userId, { name: args.name } as any);
  }

  @McpTool({
    name: 'core.profile.update-preferences',
    description: 'Updates authenticated user preferences such as theme and language.',
    inputSchema: {
      type: 'object',
      properties: {
        theme: { type: 'string', description: 'UI theme (e.g. dark, light)' },
        language: { type: 'string', description: 'Locale code (e.g. en, pt-BR)' },
      },
    },
  })
  async updatePreferences(args: { theme?: string; language?: string }, context: McpContext): Promise<any> {
    return this.profileService.updatePreferences(context.locale, context.userId, args as any);
  }

  @McpTool({
    name: 'core.profile.mfa.list',
    description: 'Returns the MFA methods configured for the authenticated user.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async getMfaMethods(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.profileService.getMFAMethods(context.userId);
  }

  @McpTool({
    name: 'core.profile.change-password',
    description: 'Changes the password of the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string', description: 'Current password' },
        newPassword: { type: 'string', description: 'New password (must meet strength requirements)' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  async changePassword(args: { currentPassword: string; newPassword: string }, context: McpContext): Promise<any> {
    return this.profileService.changePassword(context.locale, context.userId, args as any);
  }
}
