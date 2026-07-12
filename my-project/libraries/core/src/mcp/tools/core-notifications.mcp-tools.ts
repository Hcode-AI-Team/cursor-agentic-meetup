import { Injectable } from '@nestjs/common';
import { NotificationService } from '../../notification/notification.service';
import { McpTool } from '../decorators/mcp-tool.decorator';
import { McpContext } from '../types/mcp-context.type';

@Injectable()
export class CoreNotificationsMcpTools {
  constructor(private readonly notificationService: NotificationService) {}

  @McpTool({
    name: 'core.notifications.list',
    description: 'Lists notifications for the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Items per page (default: 20)' },
      },
    },
    readOnly: true,
  })
  async listNotifications(args: { page?: number; pageSize?: number }, context: McpContext): Promise<any> {
    return this.notificationService.list(context.userId, {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 20,
      search: '',
      sortField: 'id',
      sortOrder: 'desc',
      fields: '',
    });
  }

  @McpTool({
    name: 'core.notifications.unread-count',
    description: 'Returns the unread notification count for the authenticated user.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
  })
  async getUnreadCount(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.notificationService.unreadCount(context.userId);
  }

  @McpTool({
    name: 'core.notifications.mark-read',
    description: 'Marks a specific notification as read.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Notification ID' },
      },
      required: ['id'],
    },
  })
  async markRead(args: { id: number }, context: McpContext): Promise<any> {
    return this.notificationService.markRead(context.userId, args.id);
  }

  @McpTool({
    name: 'core.notifications.mark-all-read',
    description: 'Marks all notifications as read for the authenticated user.',
    inputSchema: { type: 'object', properties: {} },
  })
  async markAllRead(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.notificationService.markAllRead(context.userId);
  }

  @McpTool({
    name: 'core.notifications.create',
    description: 'Creates a new notification for a user. Admin only.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'Target user ID' },
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification message' },
        type: { type: 'string', description: 'Notification type (e.g. info, success, error)' },
      },
      required: ['userId', 'title', 'message'],
    },
  })
  async createNotification(args: { userId: number; title: string; message: string; type?: string }, _context: McpContext): Promise<any> {
    return this.notificationService.create(args as any);
  }

  @McpTool({
    name: 'core.notifications.delete',
    description: 'Deletes a specific notification for the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Notification ID' },
      },
      required: ['id'],
    },
  })
  async deleteNotification(args: { id: number }, context: McpContext): Promise<any> {
    return this.notificationService.delete(context.userId, args.id);
  }

  @McpTool({
    name: 'core.notifications.delete-all',
    description: 'Deletes all notifications for the authenticated user.',
    inputSchema: { type: 'object', properties: {} },
  })
  async deleteAllNotifications(_args: Record<string, any>, context: McpContext): Promise<any> {
    return this.notificationService.deleteAll(context.userId);
  }

  @McpTool({
    name: 'core.notifications.update-progress',
    description: 'Updates the progress of a notification (e.g. for background job tracking).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Notification ID' },
        progress: { type: 'number', description: 'Progress value (0-100)' },
        status: { type: 'string', description: 'Status (e.g. in_progress, completed, failed)' },
      },
      required: ['id', 'progress'],
    },
  })
  async updateProgress(args: { id: number; progress: number; status?: string }, context: McpContext): Promise<any> {
    return this.notificationService.updateProgress(context.userId, args.id, {
      progress: args.progress,
      success: args.status === 'failed' ? false : args.status === 'completed' ? true : undefined,
    });
  }
}
