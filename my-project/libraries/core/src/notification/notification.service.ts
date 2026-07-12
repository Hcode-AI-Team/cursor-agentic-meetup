import { PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
    BadRequestException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Client, type Notification as PgNotification } from 'pg';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import {
    NOTIFICATION_STALE_PROGRESS_CHECK,
    NotificationStaleProgressCheckEvent,
} from './events/notification-stale-progress-check.event';

type NotificationStreamEventType =
  | 'ready'
  | 'notification.created'
  | 'notification.updated';

type NotificationStreamEvent = {
  type: NotificationStreamEventType;
  notificationId?: number;
  notification?: unknown;
};

type ClusterNotificationPayload = NotificationStreamEvent & {
  userId: number;
  originInstanceId: string;
};

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notificationEvents = new EventEmitter();
  private readonly instanceId = randomUUID();
  private readonly channelName = 'notification_events';
  private pgClient: Client | null = null;

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly pagination: PaginationService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.notificationEvents.setMaxListeners(0);
  }

  async onModuleInit() {
    const databaseUrl = String(process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '');
    if (!databaseUrl.startsWith('postgresql://')) {
      this.logger.warn(
        'Cluster notification stream disabled because DATABASE_URL is not PostgreSQL',
      );
      return;
    }

    this.pgClient = new Client({ connectionString: databaseUrl });
    this.pgClient.on('notification', (message: PgNotification) => {
      this.handleClusterNotification(message);
    });
    this.pgClient.on('error', (error) => {
      this.logger.error('Cluster notification listener error', error);
    });

    await this.pgClient.connect();
    await this.pgClient.query(`LISTEN ${this.channelName}`);
    this.logger.log(
      `Cluster notification listener ready on channel ${this.channelName}`,
    );
  }

  async onModuleDestroy() {
    if (!this.pgClient) {
      return;
    }

    try {
      await this.pgClient.query(`UNLISTEN ${this.channelName}`);
    } catch (error) {
      this.logger.warn('Failed to unlisten notification channel', error as any);
    }

    try {
      await this.pgClient.end();
    } finally {
      this.pgClient = null;
    }
  }

  async list(userId: number, paginationParams: any) {
    await this.cleanupStaleProgressNotifications(userId);
    return this.pagination.paginate(
      this.prisma.notification,
      paginationParams,
      {
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      },
    );
  }

  private async cleanupStaleProgressNotifications(userId: number) {
    await this.eventEmitter.emitAsync(
      NOTIFICATION_STALE_PROGRESS_CHECK,
      new NotificationStaleProgressCheckEvent(userId),
    );
  }

  async notifyUpdated(userId: number) {
    await this.broadcastNotificationEvent(userId, { type: 'notification.updated' });
  }

  async unreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { user_id: userId, status: 'unread' },
    });
    return { count };
  }

  async markRead(userId: number, id: number) {
    const notification = await this.assertOwnership(userId, id);
    if (notification.auto_remove) {
      if (this.isActiveAsyncNotification(notification)) {
        throw new BadRequestException('Active async notifications cannot be deleted');
      }
      const deleted = await this.prisma.notification.delete({ where: { id } });
      await this.broadcastNotificationEvent(userId, {
        type: 'notification.updated',
        notificationId: id,
      });
      return deleted;
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: 'read' },
    });
    await this.broadcastNotificationEvent(userId, {
      type: 'notification.updated',
      notificationId: id,
    });
    return updated;
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.deleteMany({
      where: {
        user_id: userId,
        status: 'unread',
        auto_remove: true,
        OR: [
          { progress: null },
          { progress: { gte: 100 } },
          { finished_at: { not: null } },
        ],
      },
    });
    const updated = await this.prisma.notification.updateMany({
      where: { user_id: userId, status: 'unread' },
      data: { status: 'read' },
    });
    await this.broadcastNotificationEvent(userId, { type: 'notification.updated' });
    return updated;
  }

  async delete(userId: number, id: number) {
    const notification = await this.assertOwnership(userId, id);
    if (this.isActiveAsyncNotification(notification)) {
      throw new BadRequestException('Active async notifications cannot be deleted');
    }
    const deleted = await this.prisma.notification.delete({ where: { id } });
    await this.broadcastNotificationEvent(userId, {
      type: 'notification.updated',
      notificationId: id,
    });
    return deleted;
  }

  async deleteAll(userId: number) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        user_id: userId,
        OR: [
          { progress: null },
          { progress: { gte: 100 } },
          { finished_at: { not: null } },
        ],
      },
    });
    await this.broadcastNotificationEvent(userId, { type: 'notification.updated' });
    return result;
  }

  async create(data: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        user_id: data.user_id,
        title: data.title,
        body: data.body,
        icon: data.icon,
        type: (data.type as any) ?? 'info',
        action_type: (data.action_type as any) ?? 'url',
        action_data: data.action_data as any,
        action_url: data.action_url,
        auto_remove: data.auto_remove ?? false,
        progress: data.progress,
        started_at: data.started_at ? new Date(data.started_at) : undefined,
      },
    });
    await this.broadcastNotificationEvent(data.user_id, {
      type: 'notification.created',
      notificationId: notification.id,
      notification,
    });
    return notification;
  }

  async updateProgress(userId: number, id: number, dto: UpdateProgressDto) {
    await this.assertOwnership(userId, id);
    const finished = dto.progress >= 100;
    const notification = await this.prisma.notification.update({
      where: { id },
      data: {
        progress: dto.progress,
        body: dto.body,
        type: finished ? (dto.success === false ? 'error' : 'success') as any : undefined,
        finished_at: finished ? new Date() : undefined,
      },
    });
    await this.broadcastNotificationEvent(userId, {
      type: 'notification.updated',
      notificationId: id,
      notification,
    });
    return notification;
  }

  stream(userId: number, req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const writeEvent = (event: NotificationStreamEvent) => {
      if (res.writableEnded) {
        return;
      }

      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const eventKey = this.getEventKey(userId);
    const handler = (event: NotificationStreamEvent) => {
      writeEvent(event);
    };

    this.notificationEvents.on(eventKey, handler);
    writeEvent({ type: 'ready' });

    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': ping\n\n');
      }
    }, 25000);

    const cleanup = () => {
      clearInterval(heartbeat);
      this.notificationEvents.off(eventKey, handler);
    };

    req.on('close', cleanup);
    res.on('close', cleanup);
  }

  async clearOldNotifications(retentionDays: number, batchLimit: number) {
    return this.prisma.$executeRawUnsafe(
      `WITH del AS (
         SELECT id FROM notification
         WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
         ORDER BY id
         LIMIT ${batchLimit}
       )
       DELETE FROM notification n
       USING del WHERE n.id = del.id`,
    );
  }

  private async assertOwnership(userId: number, id: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: {
        user_id: true,
        auto_remove: true,
        progress: true,
        finished_at: true,
      },
    });
    if (!notification) throw new NotFoundException();
    if (notification.user_id !== userId) throw new ForbiddenException();
    return notification;
  }

  private isActiveAsyncNotification(notification: {
    progress: number | null;
    finished_at: Date | null;
  }) {
    return (
      notification.progress != null &&
      notification.progress < 100 &&
      notification.finished_at == null
    );
  }

  private async broadcastNotificationEvent(
    userId: number,
    event: NotificationStreamEvent,
  ) {
    this.emitLocalNotificationEvent(userId, event);

    const payload: ClusterNotificationPayload = {
      ...event,
      userId,
      originInstanceId: this.instanceId,
    };

    try {
      await this.prisma.$executeRaw`
        SELECT pg_notify(${this.channelName}, ${JSON.stringify(payload)})
      `;
    } catch (error) {
      this.logger.warn('Failed to broadcast notification event', error as any);
    }
  }

  private getEventKey(userId: number) {
    return `notification:${userId}`;
  }

  private emitLocalNotificationEvent(
    userId: number,
    event: NotificationStreamEvent,
  ) {
    this.notificationEvents.emit(this.getEventKey(userId), event);
  }

  private handleClusterNotification(message: PgNotification) {
    if (message.channel !== this.channelName || !message.payload) {
      return;
    }

    let payload: ClusterNotificationPayload;
    try {
      payload = JSON.parse(message.payload) as ClusterNotificationPayload;
    } catch {
      return;
    }

    if (!payload || payload.originInstanceId === this.instanceId) {
      return;
    }

    this.emitLocalNotificationEvent(payload.userId, {
      type: payload.type,
      notificationId: payload.notificationId,
      notification: payload.notification,
    });
  }
}
