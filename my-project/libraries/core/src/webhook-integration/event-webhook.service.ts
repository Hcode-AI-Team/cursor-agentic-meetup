import { DeleteDTO } from '@hed-hog/api';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { IntegrationDeveloperApiService } from '../integration/services/integration-developer-api.service';
import { DomainEvent } from '../integration/types';
import {
  normalizeJsonObject,
  renderTemplate,
  summarizePayload,
} from './webhook-utils';

@Injectable()
export class EventWebhookService implements OnModuleInit {
  private readonly logger = new Logger(EventWebhookService.name);
  private readonly registeredEvents = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly http: HttpService,
    private readonly integrationApi: IntegrationDeveloperApiService,
  ) {}

  private get webhooks() {
    return (this.prisma as any).event_webhook;
  }

  private get webhookEvents() {
    return (this.prisma as any).event_webhook_event;
  }

  private get catalog() {
    return (this.prisma as any).integration_event_catalog;
  }

  private get logs() {
    return (this.prisma as any).event_webhook_delivery_log;
  }

  async onModuleInit() {
    await this.registerConfiguredEvents();
  }

  async list(paginationParams: PaginationDTO) {
    const fields = ['slug', 'name', 'description', 'url', 'method', 'status'];
    const OR = this.prisma.createInsensitiveSearch(fields, paginationParams);

    return this.pagination.paginate(this.webhooks, paginationParams, {
      where: OR.length > 0 ? { OR } : {},
      include: {
        event_webhook_event: {
          include: {
            integration_event_catalog: true,
          },
        },
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  }

  async get(id: number) {
    const record = await this.webhooks.findUnique({
      where: { id },
      include: {
        event_webhook_event: {
          include: {
            integration_event_catalog: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Event webhook with id ${id} not found.`);
    }

    return record;
  }

  async create(data: any) {
    await this.ensureSlugAvailable(data.slug);

    const record = await this.webhooks.create({
      data: {
        ...this.normalizeWebhook(data),
        event_webhook_event: {
          create: this.normalizeEventIds(data.event_ids).map((eventId) => ({
            integration_event_catalog_id: eventId,
          })),
        },
      },
      include: {
        event_webhook_event: {
          include: { integration_event_catalog: true },
        },
      },
    });

    await this.registerEventsFromWebhook(record);
    return record;
  }

  async update(id: number, data: any) {
    const existing = await this.get(id);
    if (data.slug && data.slug !== existing.slug) {
      await this.ensureSlugAvailable(data.slug);
    }

    const record = await this.webhooks.update({
      where: { id },
      data: this.normalizeWebhook(data, true),
      include: {
        event_webhook_event: {
          include: { integration_event_catalog: true },
        },
      },
    });

    if (data.event_ids !== undefined) {
      await this.webhookEvents.deleteMany({
        where: { event_webhook_id: id },
      });

      const eventIds = this.normalizeEventIds(data.event_ids);
      for (const eventId of eventIds) {
        await this.webhookEvents.create({
          data: {
            event_webhook_id: id,
            integration_event_catalog_id: eventId,
          },
        });
      }
    }

    const refreshed = await this.get(id);
    await this.registerEventsFromWebhook(refreshed);
    return refreshed;
  }

  async delete(data: DeleteDTO) {
    if (!data.ids?.length) {
      throw new BadRequestException('You must select at least one item to delete.');
    }

    return this.webhooks.deleteMany({
      where: { id: { in: data.ids } },
    });
  }

  async duplicate(id: number) {
    const original = await this.get(id);

    const newSlug = await this.generateUniqueSlug(original.slug);
    const eventIds = (original.event_webhook_event ?? []).map(
      (e: any) => e.integration_event_catalog_id,
    );

    const record = await this.webhooks.create({
      data: {
        ...this.normalizeWebhook({ ...original, slug: newSlug, name: `${original.name} (copy)` }),
        event_webhook_event: {
          create: eventIds.map((eventId: number) => ({
            integration_event_catalog_id: eventId,
          })),
        },
      },
      include: {
        event_webhook_event: { include: { integration_event_catalog: true } },
      },
    });

    await this.registerEventsFromWebhook(record);
    return record;
  }

  private async generateUniqueSlug(base: string): Promise<string> {
    const candidate = `${base}-copy`;
    const existing = await this.webhooks.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;

    for (let i = 2; ; i++) {
      const next = `${base}-copy-${i}`;
      const taken = await this.webhooks.findUnique({ where: { slug: next } });
      if (!taken) return next;
    }
  }

  async listLogs(webhookId: number, paginationParams: PaginationDTO) {
    await this.get(webhookId);
    return this.pagination.paginate(this.logs, paginationParams, {
      where: { event_webhook_id: webhookId },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async handleEvent(event: DomainEvent) {
    const webhooks = await this.findActiveWebhooksForEvent(event.eventName);

    for (const webhook of webhooks) {
      await this.deliverWebhook(webhook, event);
    }
  }

  async registerConfiguredEvents() {
    const rows = await this.catalog.findMany({
      where: {
        status: 'active',
        event_webhook_event: {
          some: {
            event_webhook: {
              status: 'active',
            },
          },
        },
      },
      select: { slug: true },
    });

    for (const row of rows) {
      this.registerEvent(row.slug);
    }
  }

  private async findActiveWebhooksForEvent(eventName: string) {
    return this.webhooks.findMany({
      where: {
        status: 'active',
        event_webhook_event: {
          some: {
            integration_event_catalog: {
              slug: eventName,
              status: 'active',
            },
          },
        },
      },
      include: {
        event_webhook_event: {
          include: {
            integration_event_catalog: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { id: 'asc' }],
    });
  }

  private async deliverWebhook(webhook: any, event: DomainEvent) {
    const startedAt = Date.now();
    let attemptCount = 0;
    let lastError: any = null;
    let httpStatus: number | null = null;
    let responseSummary: any = null;

    const context = {
      ...event,
      timestamp: event.timestamp?.toISOString?.() ?? event.timestamp,
      outboxEventId: (event as any).outboxEventId ?? null,
    };

    const url = renderTemplate(webhook.url, context) as string;
    const method = webhook.method || 'POST';
    const headers = renderTemplate(webhook.headers || {}, context) as Record<string, string>;
    const query = renderTemplate(webhook.query || {}, context) as Record<string, string>;
    const payload = renderTemplate(webhook.payload ?? event.payload ?? {}, context);
    const maxAttempts = Math.max(1, Number(webhook.retry_count || 0) + 1);

    for (attemptCount = 1; attemptCount <= maxAttempts; attemptCount++) {
      try {
        const result = await firstValueFrom(
          this.http.request({
            url,
            method,
            headers,
            params: query,
            data: ['GET', 'DELETE'].includes(method) ? undefined : payload,
            timeout: Number(webhook.timeout_ms || 10000),
          }),
        );

        httpStatus = result.status;
        responseSummary = summarizePayload(result.data);
        lastError = null;
        break;
      } catch (error: any) {
        lastError = error;
        httpStatus = error?.response?.status ?? null;
        responseSummary = summarizePayload(error?.response?.data);
      }
    }

    const success = !lastError;
    await this.logs.create({
      data: {
        event_webhook_id: webhook.id,
        integration_event_catalog_id:
          webhook.event_webhook_event?.[0]?.integration_event_catalog?.id ?? null,
        outbox_event_id: Number((event as any).outboxEventId || 0) || null,
        event_name: event.eventName,
        method,
        url,
        status: success ? 'success' : 'failed',
        http_status: httpStatus,
        duration_ms: Date.now() - startedAt,
        attempt_count: attemptCount,
        error_message: lastError
          ? lastError instanceof Error
            ? lastError.message
            : String(lastError)
          : null,
        request_summary: summarizePayload({
          headers,
          query,
          payload,
        }),
        response_summary: responseSummary,
      },
    });

    if (!success) {
      throw lastError;
    }
  }

  private async registerEventsFromWebhook(webhook: any) {
    const eventNames =
      webhook.event_webhook_event
        ?.map((row: any) => row.integration_event_catalog?.slug)
        .filter(Boolean) || [];

    for (const eventName of eventNames) {
      this.registerEvent(eventName);
    }
  }

  private registerEvent(eventName: string) {
    if (this.registeredEvents.has(eventName)) {
      return;
    }

    this.integrationApi.subscribe({
      eventName,
      consumerName: `core.event-webhook.${eventName}`,
      priority: -100,
      handler: async (event) => {
        await this.handleEvent(event);
      },
    });

    this.registeredEvents.add(eventName);
    this.logger.log(`Registered event webhook dispatcher for ${eventName}`);
  }

  private async ensureSlugAvailable(slug: string) {
    const existing = await this.webhooks.findUnique({
      where: { slug: String(slug || '').trim() },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(`Event webhook "${slug}" already exists.`);
    }
  }

  private normalizeWebhook(data: any, partial = false) {
    const normalized: Record<string, any> = {};
    const assign = (key: string, value: any) => {
      if (!partial || value !== undefined) {
        normalized[key] = value;
      }
    };

    assign('slug', String(data.slug ?? '').trim());
    assign('name', String(data.name ?? '').trim());
    assign('description', this.nullableString(data.description, partial));
    assign('status', data.status === 'inactive' ? 'inactive' : 'active');
    assign('priority', Number(data.priority ?? 0));
    assign('url', String(data.url ?? '').trim());
    assign('method', String(data.method || 'POST').toUpperCase());
    assign('headers', normalizeJsonObject(data.headers));
    assign('query', normalizeJsonObject(data.query));
    assign('payload', normalizeJsonObject(data.payload));
    assign('timeout_ms', Number(data.timeout_ms || 10000));
    assign('retry_count', Number(data.retry_count || 0));

    return normalized;
  }

  private normalizeEventIds(value: any) {
    if (!value) {
      return [];
    }

    const values = Array.isArray(value) ? value : String(value).split(',');
    return values
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);
  }

  private nullableString(value: any, partial = false) {
    if (value === undefined) {
      return partial ? undefined : null;
    }

    if (value === null) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized || null;
  }
}

