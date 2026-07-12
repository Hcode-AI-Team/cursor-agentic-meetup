import { DeleteDTO } from '@hed-hog/api';
import { MailService as MailMainService } from '@hed-hog/api-mail';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    HttpException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import {
    buildMailConfigFromIntegration,
    getFromAddress,
    getReplyToAddress,
} from '../integration-profile/integration-profile.utils';
import { MailService } from '../mail/mail.service';
import { McpApiKeyService } from '../mcp/mcp-api-key.service';
import { SettingService } from '../setting/setting.service';
import {
    CreateWebhookActionDTO,
    UpdateWebhookActionDTO,
} from './dto/webhook-action.dto';
import { AppCommandRegistry } from '../app-command/app-command.registry';
import {
    createPlainToken,
    createPublicUuid,
    hashToken,
    normalizeJsonObject,
    renderTemplate,
    sanitizeSensitiveData,
    summarizePayload,
} from './webhook-utils';

type ActionExecutionLog = {
  webhookActionId: number;
  actionName: string;
  actionType:
    | 'email'
    | 'whatsapp_evolution'
    | 'http_request'
    | 'internal_api'
    | 'app_command';
  status: 'success' | 'failed';
  durationMs: number;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string | null;
};

type WebhookActionPayload =
  | CreateWebhookActionDTO
  | UpdateWebhookActionDTO
  | Record<string, unknown>;

@Injectable()
export class WebhookIntegrationService {
  private readonly logEmitter = new EventEmitter();
  private readonly webhookActionSelect = {
    id: true,
    webhook_integration_id: true,
    type: true,
    name: true,
    order: true,
    status: true,
    integration_profile_id: true,
    mail_id: true,
    email_to: true,
    email_cc: true,
    email_bcc: true,
    whatsapp_target_type: true,
    whatsapp_target: true,
    whatsapp_template: true,
    whatsapp_instance: true,
    whatsapp_base_url: true,
    whatsapp_token: true,
    http_url: true,
    http_method: true,
    http_headers: true,
    http_query: true,
    http_body: true,
    http_timeout_ms: true,
    http_retry_count: true,
    internal_api_path: true,
    internal_api_method: true,
    internal_api_query: true,
    internal_api_body: true,
    internal_api_token: true,
    internal_api_user_id: true,
    app_command_slug: true,
    app_command_params: true,
    created_at: true,
    updated_at: true,
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly http: HttpService,
    private readonly mailMainService: MailMainService,
    private readonly coreMailService: MailService,
    private readonly settingService: SettingService,
    private readonly commandRegistry: AppCommandRegistry,
    private readonly mcpApiKeyService: McpApiKeyService,
  ) {}

  private get integrations() {
    return (this.prisma as any).webhook_integration;
  }

  private get actions() {
    return (this.prisma as any).webhook_action;
  }

  private get logs() {
    return (this.prisma as any).webhook_call_log;
  }

  private get actionLogs() {
    return (this.prisma as any).webhook_action_log;
  }

  async list(paginationParams: PaginationDTO) {
    const fields = ['slug', 'name', 'description', 'public_uuid', 'status'];
    const OR = this.prisma.createInsensitiveSearch(fields, paginationParams);

    const result = await this.pagination.paginate(
      this.integrations,
      paginationParams,
      {
        where: OR.length > 0 ? { OR } : {},
        include: {
          webhook_action: {
            select: this.webhookActionSelect,
            orderBy: [{ order: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      },
    );

    return {
      ...result,
      data: await this.withPublicUrls(result.data || []),
    };
  }

  async get(id: number) {
    const record = await this.integrations.findUnique({
      where: { id },
      include: {
        webhook_action: {
          select: this.webhookActionSelect,
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!record) {
      throw new NotFoundException(
        `Webhook integration with id ${id} not found.`,
      );
    }

    return this.withPublicUrl(record);
  }

  async create(data: any) {
    await this.ensureSlugAvailable(data.slug);

    let plainToken: string | null = null;
    if (data.require_token) {
      plainToken = createPlainToken();
    }

    const record = await this.integrations.create({
      data: {
        ...this.normalizeIntegration(data),
        public_uuid: createPublicUuid(),
        token_hash: plainToken ? hashToken(plainToken) : null,
      },
    });

    return {
      ...(await this.withPublicUrl(record)),
      plainToken,
    };
  }

  async update(id: number, data: any) {
    const existing = await this.get(id);
    if (data.slug && data.slug !== existing.slug) {
      await this.ensureSlugAvailable(data.slug);
    }

    let plainToken: string | null = null;
    const updateData = this.normalizeIntegration(data, true);
    if (data.require_token === false) {
      updateData.token_hash = null;
    } else if (data.require_token === true && !existing.token_hash) {
      plainToken = createPlainToken();
      updateData.token_hash = hashToken(plainToken);
    }

    const record = await this.integrations.update({
      where: { id },
      data: updateData,
    });

    return {
      ...(await this.withPublicUrl(record)),
      plainToken,
    };
  }

  async delete(data: DeleteDTO) {
    if (!data.ids?.length) {
      throw new BadRequestException(
        'You must select at least one item to delete.',
      );
    }

    return this.integrations.deleteMany({
      where: { id: { in: data.ids } },
    });
  }

  async regenerateUuid(id: number) {
    await this.get(id);
    const record = await this.integrations.update({
      where: { id },
      data: { public_uuid: createPublicUuid() },
    });

    return this.withPublicUrl(record);
  }

  async regenerateToken(id: number) {
    await this.get(id);
    const plainToken = createPlainToken();
    const record = await this.integrations.update({
      where: { id },
      data: {
        require_token: true,
        token_hash: hashToken(plainToken),
      },
    });

    return {
      ...(await this.withPublicUrl(record)),
      plainToken,
    };
  }

  async duplicate(id: number) {
    const original = await this.get(id);

    const newSlug = await this.generateUniqueSlug(original.slug, this.integrations);

    let plainToken: string | null = null;
    let tokenHash: string | null = null;
    if (original.require_token) {
      plainToken = createPlainToken();
      tokenHash = hashToken(plainToken);
    }

    const record = await this.integrations.create({
      data: {
        slug: newSlug,
        name: `${original.name} (copy)`,
        description: original.description,
        public_uuid: createPublicUuid(),
        status: original.status,
        require_token: original.require_token,
        token_hash: tokenHash,
        allowed_ips: original.allowed_ips,
        body_schema: original.body_schema,
        webhook_action: {
          create: (original.webhook_action ?? []).map((a: any) => ({
            type: a.type,
            name: a.name,
            order: a.order,
            status: a.status,
            integration_profile_id:
              a.integration_profile_id ?? null,
            mail_id: a.mail_id,
            email_to: a.email_to,
            email_cc: a.email_cc,
            email_bcc: a.email_bcc,
            whatsapp_target_type: a.whatsapp_target_type,
            whatsapp_target: a.whatsapp_target,
            whatsapp_template: a.whatsapp_template,
            whatsapp_instance: a.whatsapp_instance,
            whatsapp_base_url: a.whatsapp_base_url,
            whatsapp_token: a.whatsapp_token,
            http_url: a.http_url,
            http_method: a.http_method,
            http_headers: a.http_headers,
            http_query: a.http_query,
            http_body: a.http_body,
            http_timeout_ms: a.http_timeout_ms,
            http_retry_count: a.http_retry_count,
            internal_api_path: a.internal_api_path,
            internal_api_method: a.internal_api_method,
            internal_api_query: a.internal_api_query,
            internal_api_body: a.internal_api_body,
            internal_api_token: a.internal_api_token,
            internal_api_user_id: a.internal_api_user_id,
            app_command_slug: a.app_command_slug,
            app_command_params: a.app_command_params,
          })),
        },
      },
    });

    return { ...(await this.withPublicUrl(record)), plainToken };
  }

  private async generateUniqueSlug(base: string, table: any): Promise<string> {
    const candidate = `${base}-copy`;
    const existing = await table.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;

    for (let i = 2; ; i++) {
      const next = `${base}-copy-${i}`;
      const taken = await table.findUnique({ where: { slug: next } });
      if (!taken) return next;
    }
  }

  private async getApplicationBaseUrl() {
    const settings = await this.settingService.getSettingValues([
      'api-url',
      'url',
    ]);
    const value = settings?.['api-url'] || settings?.url;
    return typeof value === 'string' ? value.replace(/\/+$/, '') : '';
  }

  private async withPublicUrl<T extends { public_uuid?: string | null }>(
    record: T,
  ) {
    const baseUrl = await this.getApplicationBaseUrl();
    return {
      ...record,
      public_url:
        baseUrl && record.public_uuid
          ? `${baseUrl}/webhook/${record.public_uuid}`
          : null,
    };
  }

  private async withPublicUrls<T extends { public_uuid?: string | null }>(
    records: T[],
  ) {
    const baseUrl = await this.getApplicationBaseUrl();
    return records.map((record) => ({
      ...record,
      public_url:
        baseUrl && record.public_uuid
          ? `${baseUrl}/webhook/${record.public_uuid}`
          : null,
    }));
  }

  async listActions(integrationId: number) {
    await this.get(integrationId);
    return this.actions.findMany({
      where: { webhook_integration_id: integrationId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  async createAction(integrationId: number, data: WebhookActionPayload) {
    await this.get(integrationId);
    const normalized = this.normalizeAction(data);
    this.validateActionConfiguration(normalized);

    return this.actions.create({
      data: {
        ...normalized,
        webhook_integration_id: integrationId,
      },
    });
  }

  async updateAction(
    integrationId: number,
    actionId: number,
    data: WebhookActionPayload,
  ) {
    const existing = await this.ensureAction(integrationId, actionId);
    const normalized = this.normalizeAction(data, true);
    this.validateActionConfiguration({
      ...existing,
      ...normalized,
    });

    return this.actions.update({
      where: { id: actionId },
      data: normalized,
    });
  }

  async deleteActions(integrationId: number, data: DeleteDTO) {
    await this.get(integrationId);
    if (!data.ids?.length) {
      throw new BadRequestException(
        'You must select at least one item to delete.',
      );
    }

    return this.actions.deleteMany({
      where: {
        webhook_integration_id: integrationId,
        id: { in: data.ids },
      },
    });
  }

  async listUserApiTokens(userId: number) {
    return (this.prisma as any).mcp_api_key.findMany({
      where: { user_id: userId, type: 'api', revoked_at: null },
      select: {
        id: true,
        name: true,
        token_prefix: true,
        last_used_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createUserApiToken(userId: number, name: string) {
    return this.mcpApiKeyService.create(userId, name, 'api');
  }

  async listInternalRoutes() {
    return (this.prisma as any).route.findMany({
      select: {
        id: true,
        url: true,
        method: true,
      },
      where: {
        url: { not: null },
        method: { not: null },
      },
      orderBy: [{ url: 'asc' }, { method: 'asc' }],
    });
  }

  async listAppCommands() {
    return this.commandRegistry.list().map((cmd) => ({
      slug: cmd.slug,
      name: cmd.name,
      description: cmd.description,
      inputSchema: cmd.inputSchema,
    }));
  }

  async listLogs(
    integrationId: number,
    paginationParams: PaginationDTO,
    sort: 'asc' | 'desc' = 'desc',
  ) {
    await this.get(integrationId);

    const page = Math.max(Number(paginationParams.page || 1), 1);
    const pageSize = Math.max(Number(paginationParams.pageSize || 10), 1);
    const skip = (page - 1) * pageSize;
    const normalizedSort = sort === 'asc' ? 'asc' : 'desc';

    const where = { webhook_integration_id: integrationId };

    const [data, total] = await Promise.all([
      this.logs.findMany({
        where,
        orderBy: [{ created_at: normalizedSort }, { id: normalizedSort }],
        skip,
        take: pageSize,
      }),
      this.logs.count({ where }),
    ]);

    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const result = {
      total,
      lastPage,
      page,
      pageSize,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
      // Never expose the raw replay payload (may contain secrets) to clients.
      data: (data || []).map(({ payload_raw, ...rest }: any) => rest),
    };

    const logIds = (result.data || [])
      .map((item: any) => item.id)
      .filter((id: unknown) => typeof id === 'number');

    if (!logIds.length || !this.actionLogs) {
      return result;
    }

    const actionLogs = await this.actionLogs.findMany({
      where: {
        webhook_call_log_id: { in: logIds },
      },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });

    const actionLogsByCallId = new Map<number, any[]>();
    for (const actionLog of actionLogs || []) {
      const list = actionLogsByCallId.get(actionLog.webhook_call_log_id) || [];
      list.push(actionLog);
      actionLogsByCallId.set(actionLog.webhook_call_log_id, list);
    }

    return {
      ...result,
      data: (result.data || []).map((item: any) => ({
        ...item,
        webhook_action_log: actionLogsByCallId.get(item.id) || [],
      })),
    };
  }

  streamLogs(integrationId: number, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    const handler = (payload: unknown) => {
      res.write(`data: ${JSON.stringify({ type: 'log', payload })}\n\n`);
    };

    const eventKey = `log:${integrationId}`;
    this.logEmitter.on(eventKey, handler);

    res.on('close', () => {
      this.logEmitter.off(eventKey, handler);
    });
  }

  async executePublic(uuid: string, body: any, headers: any, req: Request) {
    const startedAt = Date.now();
    const remoteIp = this.getRemoteIp(req);
    let integration: any | null = null;

    try {
      integration = await this.integrations.findUnique({
        where: { public_uuid: uuid },
        include: {
          webhook_action: {
            select: this.webhookActionSelect,
            where: { status: 'active' },
            orderBy: [{ order: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!integration || integration.status !== 'active') {
        throw new NotFoundException('Webhook not found.');
      }

      this.validateToken(integration, headers);
      this.validateIp(integration, remoteIp);
      this.validateBodySchema(integration, body);
    } catch (error) {
      const callLog = await this.createCallLog({
        integration,
        uuid,
        status: 'failed',
        remoteIp,
        durationMs: Date.now() - startedAt,
        payload: body,
        response: {
          success: false,
          actions: [],
        },
        error,
      }).catch(() => null);

      if (integration?.id && callLog?.id) {
        this.logEmitter.emit(`log:${integration.id}`, { id: callLog.id });
      }

      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        actions: [],
      };
    }

    return this.runActionsAndLog({
      integration,
      uuid,
      body,
      remoteIp,
      webhookHeaders: normalizeJsonObject(headers) || {},
      startedAt,
    });
  }

  /**
   * Runs every active action of an integration against `body`, persists a new
   * call log + action logs, and emits the SSE event. Shared by the public
   * webhook entrypoint and by the admin-triggered retry of a failed call.
   */
  private async runActionsAndLog(input: {
    integration: any;
    uuid: string;
    body: any;
    remoteIp: string | null;
    webhookHeaders: Record<string, unknown>;
    startedAt: number;
  }) {
    const { integration, uuid, body, remoteIp, webhookHeaders, startedAt } =
      input;
    const actionLogs: ActionExecutionLog[] = [];

    try {
      const actionResults = [];
      for (const action of integration.webhook_action || []) {
        const actionStartedAt = Date.now();

        try {
          const result = await this.executeAction(action, body, {
            webhookHeaders,
            remoteIp,
            publicUuid: uuid,
            integrationId: integration.id,
          });
          const durationMs = Date.now() - actionStartedAt;

          actionResults.push({
            id: action.id,
            type: action.type,
            success: true,
            duration_ms: durationMs,
            response: summarizePayload(result.responsePayload),
          });

          actionLogs.push({
            webhookActionId: action.id,
            actionName: action.name,
            actionType: action.type,
            status: 'success',
            durationMs,
            requestPayload: result.requestPayload,
            responsePayload: result.responsePayload,
          });
        } catch (error) {
          const durationMs = Date.now() - actionStartedAt;
          const errorMessage = this.extractErrorMessage(error);

          actionResults.push({
            id: action.id,
            type: action.type,
            success: false,
            duration_ms: durationMs,
            error: errorMessage,
            response: summarizePayload(this.extractErrorResponse(error)),
          });

          actionLogs.push({
            webhookActionId: action.id,
            actionName: action.name,
            actionType: action.type,
            status: 'failed',
            durationMs,
            requestPayload: this.extractErrorRequestPayload(error),
            errorMessage,
            responsePayload: this.extractErrorResponse(error),
          });

          throw error;
        }
      }

      const response = {
        success: true,
        actions: actionResults,
      };

      const callLog = await this.createCallLog({
        integration,
        uuid,
        status: 'success',
        remoteIp,
        durationMs: Date.now() - startedAt,
        payload: body,
        response,
      });

      await this.createActionLogs(callLog?.id, actionLogs);

      if (integration?.id && callLog?.id) {
        this.logEmitter.emit(`log:${integration.id}`, { id: callLog.id });
      }

      return response;
    } catch (error) {
      const callLog = await this.createCallLog({
        integration,
        uuid,
        status: 'failed',
        remoteIp,
        durationMs: Date.now() - startedAt,
        payload: body,
        response: {
          success: false,
          actions: actionLogs.map((item) => ({
            id: item.webhookActionId,
            type: item.actionType,
            success: item.status === 'success',
            duration_ms: item.durationMs,
            error: item.errorMessage || null,
          })),
        },
        error,
      }).catch(() => null);

      await this.createActionLogs(callLog?.id, actionLogs).catch(() => undefined);

      if (integration?.id && callLog?.id) {
        this.logEmitter.emit(`log:${integration.id}`, { id: callLog.id });
      }

      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        actions: actionLogs.map((item) => ({
          id: item.webhookActionId,
          type: item.actionType,
          success: item.status === 'success',
          duration_ms: item.durationMs,
          error: item.errorMessage || null,
        })),
      };
    }
  }

  /**
   * Replays a previously failed webhook call from the Logs tab. Re-executes the
   * whole call (all active actions) using the original stored payload, without
   * re-validating token/IP (the retry is triggered by an authenticated admin).
   * Produces a brand-new call log so the retry is itself auditable.
   */
  async retryCall(integrationId: number, logId: number) {
    const log = await this.logs?.findFirst({
      where: { id: logId, webhook_integration_id: integrationId },
    });

    if (!log) {
      throw new NotFoundException('Webhook call log not found.');
    }

    if (log.status !== 'failed') {
      throw new BadRequestException('Only failed webhook calls can be retried.');
    }

    if (log.payload_raw === null || log.payload_raw === undefined) {
      throw new BadRequestException(
        'This webhook call cannot be retried because its original payload was not stored.',
      );
    }

    const integration = await this.integrations.findUnique({
      where: { id: integrationId },
      include: {
        webhook_action: {
          select: this.webhookActionSelect,
          where: { status: 'active' },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!integration) {
      throw new NotFoundException('Webhook integration not found.');
    }

    return this.runActionsAndLog({
      integration,
      uuid: integration.public_uuid ?? log.public_uuid,
      body: log.payload_raw,
      remoteIp: null,
      webhookHeaders: {},
      startedAt: Date.now(),
    });
  }

  private async executeAction(
    action: any,
    body: any,
    context?: {
      webhookHeaders?: Record<string, unknown>;
      remoteIp?: string | null;
      publicUuid?: string;
      integrationId?: number;
    },
  ) {
    if (action.type === 'email') {
      return this.executeEmailAction(action, body);
    }

    if (action.type === 'whatsapp_evolution') {
      return this.executeWhatsappAction(action, body);
    }

    if (action.type === 'http_request') {
      return this.executeHttpRequestAction(action, body);
    }

    if (action.type === 'internal_api') {
      return this.executeInternalApiAction(action, body);
    }

    if (action.type === 'app_command') {
      return this.executeAppCommandAction(action, body, context);
    }

    throw new BadRequestException(`Unsupported action type: ${action.type}`);
  }

  private async executeEmailAction(action: any, body: any) {
    this.validateActionConfiguration(action);

    const profile = await (this.prisma as any).integration_profile.findUnique({
      where: { id: Number(action.integration_profile_id) },
      include: { integration_provider: { select: { slug: true } } },
    });
    const mail = await (this.prisma as any).mail.findUnique({
      where: { id: Number(action.mail_id) },
      include: {
        mail_locale: {
          orderBy: [{ locale_id: 'asc' }],
        },
      },
    });

    if (!profile || !mail?.mail_locale?.length) {
      throw new BadRequestException(
        'Email action references an invalid profile or template.',
      );
    }

    const template = mail.mail_locale[0];
    const config = buildMailConfigFromIntegration(
      profile.integration_provider.slug,
      profile.config,
    );
    const sender = getFromAddress(profile.config);
    const replyTo = getReplyToAddress(profile.config);

    const renderedTo = String(renderTemplate(action.email_to, body) ?? '').trim();
    const renderedCc = action.email_cc
      ? String(renderTemplate(action.email_cc, body) ?? '').trim()
      : '';
    const renderedBcc = action.email_bcc
      ? String(renderTemplate(action.email_bcc, body) ?? '').trim()
      : '';

    if (!renderedTo) {
      throw new BadRequestException(
        'Email action rendered an empty recipient for email_to.',
      );
    }

    const requestPayload = {
      to: renderedTo,
      cc: renderedCc || undefined,
      bcc: renderedBcc || undefined,
      from: sender,
      replyTo,
      subject: renderTemplate(template.subject, body) as string,
      body: renderTemplate(template.body, body) as string,
      mail_id: mail.id,
    };

    try {
      this.mailMainService.setConfig(config as any);
      const providerResponse = await this.mailMainService.send(
        requestPayload as any,
      );

      return {
        requestPayload,
        responsePayload: {
          provider: 'email',
          response: providerResponse || null,
        },
      };
    } finally {
      await this.coreMailService.reloadConfig().catch(() => undefined);
    }
  }

  private async executeWhatsappAction(action: any, body: any) {
    const required = [
      action.whatsapp_target,
      action.whatsapp_template,
      action.whatsapp_instance,
      action.whatsapp_base_url,
      action.whatsapp_token,
    ];

    if (required.some((value) => !String(value || '').trim())) {
      throw new BadRequestException(
        'WhatsApp action is missing required configuration.',
      );
    }

    const baseUrl = String(action.whatsapp_base_url).replace(/\/+$/, '');
    const instance = encodeURIComponent(action.whatsapp_instance);
    const url = `${baseUrl}/message/sendText/${instance}`;
    const targetType =
      action.whatsapp_target_type === 'group' ? 'group' : 'phone';
    const renderedMessage = String(
      renderTemplate(action.whatsapp_template, body) ?? '',
    ).trim();
    const renderedTarget = String(
      renderTemplate(action.whatsapp_target, body) ?? '',
    ).trim();

    if (!renderedMessage) {
      throw new BadRequestException(
        'WhatsApp action template rendered an empty message.',
      );
    }

    const target = this.normalizeWhatsappTarget(renderedTarget, targetType);
    const requestPayload = {
      provider: 'evolution',
      url,
      instance: action.whatsapp_instance,
      targetType,
      number: target,
      text: renderedMessage,
    };

    let response: any;
    try {
      response = await firstValueFrom(
        this.http.post(
          url,
          {
            number: target,
            text: renderedMessage,
          },
          {
            headers: {
              apikey: action.whatsapp_token,
            },
            timeout: 15000,
          },
        ),
      );
    } catch (error) {
      this.attachErrorRequestPayload(error, requestPayload);
      throw error;
    }

    return {
      requestPayload,
      responsePayload: {
        status: response?.status || null,
        statusText: response?.statusText || null,
        data: response?.data || null,
      },
    };
  }

  private async executeHttpRequestAction(action: any, body: any) {
    this.validateActionConfiguration(action);

    const method = String(action.http_method || 'POST').toUpperCase();
    const rawUrl = String(action.http_url || '').trim();
    const timeoutMs = Number(action.http_timeout_ms || 30000);
    const maxAttempts = Math.max(1, Number(action.http_retry_count || 0) + 1);

    const renderedUrl = String(renderTemplate(rawUrl, body) ?? rawUrl).trim();

    const rawHeaders = normalizeJsonObject(action.http_headers) || {};
    const renderedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      renderedHeaders[k] = String(renderTemplate(String(v), body) ?? v);
    }

    const rawQuery = normalizeJsonObject(action.http_query) || {};
    const renderedQuery: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawQuery)) {
      renderedQuery[k] = String(renderTemplate(String(v), body) ?? v);
    }

    const rawBody = String(action.http_body || '').trim();
    const renderedBody = rawBody
      ? (renderTemplate(rawBody, body) as string)
      : undefined;

    let parsedBody: unknown = renderedBody;
    if (renderedBody) {
      try {
        parsedBody = JSON.parse(renderedBody);
      } catch {
        parsedBody = renderedBody;
      }
    }

    const requestPayload = {
      method,
      url: renderedUrl,
      headers: renderedHeaders,
      query: renderedQuery,
      body: parsedBody,
    };

    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await firstValueFrom(
          this.http.request({
            method,
            url: renderedUrl,
            headers: renderedHeaders,
            params: Object.keys(renderedQuery).length ? renderedQuery : undefined,
            data: parsedBody,
            timeout: timeoutMs,
          }),
        );

        return {
          requestPayload,
          responsePayload: {
            status: response?.status || null,
            statusText: response?.statusText || null,
            data: response?.data || null,
          },
        };
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          this.attachErrorRequestPayload(error, requestPayload);
          throw error;
        }
      }
    }

    this.attachErrorRequestPayload(lastError, requestPayload);
    throw lastError;
  }

  private async executeInternalApiAction(action: any, body: any) {
    this.validateActionConfiguration(action);

    const baseUrl = await this.getApplicationBaseUrl();
    if (!baseUrl) {
      throw new BadRequestException(
        'Internal API action requires the api-url setting to be configured.',
      );
    }

    const method = String(action.internal_api_method || 'POST').toUpperCase();
    const rawPath = String(action.internal_api_path || '').trim();
    const token = String(action.internal_api_token || '').trim();

    const renderedPath = String(renderTemplate(rawPath, body) ?? rawPath).trim();

    const rawQuery = normalizeJsonObject(action.internal_api_query) || {};
    const renderedQuery: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawQuery)) {
      renderedQuery[k] = String(renderTemplate(String(v), body) ?? v);
    }

    const rawBody = normalizeJsonObject(action.internal_api_body) || {};
    const renderedBodyObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawBody)) {
      renderedBodyObj[k] = typeof v === 'string' ? renderTemplate(v, body) : v;
    }

    const url = `${baseUrl}${renderedPath.startsWith('/') ? '' : '/'}${renderedPath}`;

    const requestPayload = {
      method,
      url,
      query: renderedQuery,
      body: renderedBodyObj,
    };

    let response: any;
    try {
      response = await firstValueFrom(
        this.http.request({
          method,
          url,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: Object.keys(renderedQuery).length ? renderedQuery : undefined,
          data: Object.keys(renderedBodyObj).length ? renderedBodyObj : undefined,
          timeout: 30000,
        }),
      );
    } catch (error) {
      this.attachErrorRequestPayload(error, requestPayload);
      throw error;
    }

    return {
      requestPayload,
      responsePayload: {
        status: response?.status || null,
        statusText: response?.statusText || null,
        data: response?.data || null,
      },
    };
  }

  private async executeAppCommandAction(
    action: any,
    body: any,
    context?: {
      webhookHeaders?: Record<string, unknown>;
      remoteIp?: string | null;
      publicUuid?: string;
      integrationId?: number;
    },
  ) {
    this.validateActionConfiguration(action);

    const slug = String(action.app_command_slug || '').trim();
    const command = this.commandRegistry.find(slug);
    if (!command) {
      throw new BadRequestException(`app_command: unknown command slug "${slug}".`);
    }

    const rawParams = normalizeJsonObject(action.app_command_params) || {};
    const renderedParams: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawParams)) {
      renderedParams[k] = typeof v === 'string' ? renderTemplate(v, body) : v;
    }

    const schemaErrors = this.validateJsonSchema(command.inputSchema, renderedParams);
    if (schemaErrors.length) {
      throw new BadRequestException({
        message: `app_command "${slug}" params do not match expected schema.`,
        errors: schemaErrors,
      });
    }

    const requestPayload = { slug, params: renderedParams };

    let result: unknown;
    try {
      result = await this.commandRegistry.dispatch(slug, renderedParams, {
        webhookBody: body,
        webhookHeaders: context?.webhookHeaders,
        remoteIp: context?.remoteIp,
        publicUuid: context?.publicUuid,
        integrationId: context?.integrationId,
      });
    } catch (error) {
      this.attachErrorRequestPayload(error, requestPayload);
      throw error;
    }

    return {
      requestPayload,
      responsePayload: result,
    };
  }

  private validateToken(integration: any, headers: any) {
    if (!integration.require_token) {
      return;
    }

    const provided =
      headers['x-webhook-token'] ||
      headers['X-Webhook-Token'] ||
      headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!provided || hashToken(String(provided)) !== integration.token_hash) {
      throw new BadRequestException('Invalid webhook token.');
    }
  }

  private validateIp(integration: any, remoteIp: string | null) {
    const allowedIps = Array.isArray(integration.allowed_ips)
      ? integration.allowed_ips
      : [];

    if (!allowedIps.length) {
      return;
    }

    if (!remoteIp || !allowedIps.includes(remoteIp)) {
      throw new BadRequestException('Remote IP is not allowed.');
    }
  }

  private validateActionConfiguration(action: any) {
    if (action?.type === 'email') {
      const missing: string[] = [];

      if (!this.nullableNumber(action.integration_profile_id)) {
        missing.push('integration_profile_id');
      }

      if (!this.nullableNumber(action.mail_id)) {
        missing.push('mail_id');
      }

      if (!this.nullableString(action.email_to, true)) {
        missing.push('email_to');
      }

      if (missing.length) {
        throw new BadRequestException(
          `Email action is missing required configuration: ${missing.join(', ')}.`,
        );
      }
    }

    if (action?.type === 'whatsapp_evolution') {
      const missing = [
        ['whatsapp_target', action.whatsapp_target],
        ['whatsapp_template', action.whatsapp_template],
        ['whatsapp_instance', action.whatsapp_instance],
        ['whatsapp_base_url', action.whatsapp_base_url],
        ['whatsapp_token', action.whatsapp_token],
      ]
        .filter(([, value]) => !String(value || '').trim())
        .map(([key]) => key);

      if (missing.length) {
        throw new BadRequestException(
          `WhatsApp action is missing required configuration: ${missing.join(', ')}.`,
        );
      }
    }

    if (action?.type === 'http_request') {
      if (!this.nullableString(action.http_url)) {
        throw new BadRequestException(
          'HTTP request action is missing required configuration: http_url.',
        );
      }
    }

    if (action?.type === 'internal_api') {
      const missing: string[] = [];
      if (!this.nullableString(action.internal_api_path)) {
        missing.push('internal_api_path');
      }
      if (!this.nullableNumber(action.internal_api_user_id)) {
        missing.push('internal_api_user_id');
      }
      if (!this.nullableString(action.internal_api_token)) {
        missing.push('internal_api_token');
      }
      if (missing.length) {
        throw new BadRequestException(
          `Internal API action is missing required configuration: ${missing.join(', ')}.`,
        );
      }
    }

    if (action?.type === 'app_command') {
      if (!this.nullableString(action.app_command_slug)) {
        throw new BadRequestException(
          'App command action is missing required configuration: app_command_slug.',
        );
      }
    }
  }

  private validateBodySchema(integration: any, body: any) {
    if (!integration.body_schema) {
      return;
    }

    const errors = this.validateJsonSchema(integration.body_schema, body);
    if (errors.length) {
      throw new BadRequestException({
        message: 'Webhook body does not match the configured schema.',
        errors,
      });
    }
  }

  private validateJsonSchema(schema: any, value: any, path = '$'): string[] {
    if (!schema || typeof schema !== 'object') {
      return [];
    }

    const errors: string[] = [];
    const type = schema.type;

    if (type && !this.matchesJsonSchemaType(type, value)) {
      errors.push(`${path} must be ${type}`);
      return errors;
    }

    if (type === 'object' || schema.properties || schema.required) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${path} must be object`);
        return errors;
      }

      for (const requiredKey of schema.required || []) {
        if (value[requiredKey] === undefined || value[requiredKey] === null) {
          errors.push(`${path}.${requiredKey} is required`);
        }
      }

      for (const [key, childSchema] of Object.entries(
        schema.properties || {},
      )) {
        if (value[key] !== undefined) {
          errors.push(
            ...this.validateJsonSchema(
              childSchema,
              value[key],
              `${path}.${key}`,
            ),
          );
        }
      }
    }

    if (type === 'array' && schema.items && Array.isArray(value)) {
      value.forEach((item, index) => {
        errors.push(
          ...this.validateJsonSchema(schema.items, item, `${path}[${index}]`),
        );
      });
    }

    return errors;
  }

  private matchesJsonSchemaType(type: string | string[], value: any) {
    const types = Array.isArray(type) ? type : [type];
    return types.some((item) => {
      switch (item) {
        case 'object':
          return (
            value !== null && typeof value === 'object' && !Array.isArray(value)
          );
        case 'array':
          return Array.isArray(value);
        case 'string':
          return typeof value === 'string';
        case 'number':
          return typeof value === 'number';
        case 'integer':
          return Number.isInteger(value);
        case 'boolean':
          return typeof value === 'boolean';
        case 'null':
          return value === null;
        default:
          return true;
      }
    });
  }

  private async createCallLog(input: {
    integration: any | null;
    uuid: string;
    status: 'success' | 'failed';
    remoteIp: string | null;
    durationMs: number;
    payload: any;
    response?: any;
    error?: any;
  }) {
    if (!this.logs) {
      return null;
    }

    return this.logs.create({
      data: {
        webhook_integration_id: input.integration?.id ?? null,
        public_uuid: input.uuid,
        status: input.status,
        remote_ip: input.remoteIp,
        duration_ms: input.durationMs,
        error_message: input.error ? this.extractErrorMessage(input.error) : null,
        payload_summary: summarizePayload(sanitizeSensitiveData(input.payload)),
        // Store the full, unsanitized payload only for failed calls so they can
        // be replayed faithfully from the Logs tab. Successful calls keep just
        // the sanitized summary to limit secret exposure and storage.
        payload_raw: input.status === 'failed' ? (input.payload ?? null) : null,
        response_summary: summarizePayload(sanitizeSensitiveData(input.response)),
      },
      select: {
        id: true,
      },
    });
  }

  private async createActionLogs(callLogId: number | undefined, logs: ActionExecutionLog[]) {
    if (!callLogId || !logs.length || !this.actionLogs) {
      return;
    }

    await this.actionLogs.createMany({
      data: logs.map((item) => ({
        webhook_call_log_id: callLogId,
        webhook_action_id: item.webhookActionId,
        action_name: item.actionName,
        action_type: item.actionType,
        status: item.status,
        duration_ms: item.durationMs,
        request_payload: summarizePayload(sanitizeSensitiveData(item.requestPayload)),
        response_payload: summarizePayload(
          sanitizeSensitiveData(item.responsePayload),
        ),
        error_message: item.errorMessage || null,
      })),
    });
  }

  private extractErrorMessage(error: unknown) {
    if (!error) {
      return 'Unknown error';
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && (error as any).message) {
      return String((error as any).message);
    }

    return String(error);
  }

  private extractErrorResponse(error: unknown) {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const maybeResponse = (error as any).response;
    if (!maybeResponse) {
      return null;
    }

    return {
      status: maybeResponse.status || null,
      statusText: maybeResponse.statusText || null,
      data: maybeResponse.data || null,
    };
  }

  private extractErrorRequestPayload(error: unknown) {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const maybePayload = (error as any).__webhookRequestPayload;
    return maybePayload || null;
  }

  private attachErrorRequestPayload(error: unknown, requestPayload: unknown) {
    if (!error || typeof error !== 'object') {
      return;
    }

    (error as any).__webhookRequestPayload = requestPayload;
  }

  private normalizeWhatsappTarget(
    renderedTarget: string,
    targetType: 'phone' | 'group',
  ) {
    const rawTarget = String(renderedTarget || '').trim();
    if (!rawTarget) {
      throw new BadRequestException(
        'WhatsApp action target template rendered an empty value.',
      );
    }

    if (targetType === 'group') {
      return rawTarget;
    }

    const normalized = rawTarget.replace(/\D+/g, '');
    if (!normalized) {
      throw new BadRequestException(
        'WhatsApp action target must contain at least one digit for phone targets.',
      );
    }

    return normalized;
  }

  private getRemoteIp(req: Request) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0];

    return forwardedIp?.trim() || req.ip || req.socket.remoteAddress || null;
  }

  private async ensureAction(integrationId: number, actionId: number) {
    const record = await this.actions.findFirst({
      where: {
        id: actionId,
        webhook_integration_id: integrationId,
      },
    });

    if (!record) {
      throw new NotFoundException(
        `Webhook action with id ${actionId} not found.`,
      );
    }

    return record;
  }

  private async ensureSlugAvailable(slug: string) {
    const existing = await this.integrations.findUnique({
      where: { slug: String(slug || '').trim() },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Webhook integration "${slug}" already exists.`,
      );
    }
  }

  private normalizeIntegration(data: any, partial = false) {
    const normalized: Record<string, any> = {};
    const assign = (key: string, value: any) => {
      if (!partial || value !== undefined) {
        normalized[key] = value;
      }
    };

    assign('slug', data.slug !== undefined ? String(data.slug).trim() : undefined);
    assign('name', data.name !== undefined ? String(data.name).trim() : undefined);
    assign('description', this.nullableString(data.description, partial));
    assign('status', data.status === 'inactive' ? 'inactive' : 'active');
    assign('require_token', Boolean(data.require_token));
    assign('allowed_ips', normalizeJsonObject(data.allowed_ips));
    assign('body_schema', normalizeJsonObject(data.body_schema));

    return normalized;
  }

  private normalizeAction(data: WebhookActionPayload, partial = false) {
    const normalized: Record<string, any> = {};
    const assign = (key: string, value: any) => {
      if (!partial || value !== undefined) {
        normalized[key] = value;
      }
    };

    assign('type', data.type);
    assign('name', String(data.name ?? '').trim());
    assign('order', Number(data.order ?? 0));
    assign('status', data.status === 'inactive' ? 'inactive' : 'active');
    assign(
      'integration_profile_id',
      this.nullableNumber((data as any).integration_profile_id, partial),
    );
    assign('mail_id', this.nullableNumber(data.mail_id, partial));
    assign('email_to', this.nullableString(data.email_to, partial));
    assign('email_cc', this.nullableString(data.email_cc, partial));
    assign('email_bcc', this.nullableString(data.email_bcc, partial));
    assign('whatsapp_target_type', data.whatsapp_target_type || null);
    assign(
      'whatsapp_target',
      this.nullableString(data.whatsapp_target, partial),
    );
    assign(
      'whatsapp_template',
      this.nullableString(data.whatsapp_template, partial),
    );
    assign(
      'whatsapp_instance',
      this.nullableString(data.whatsapp_instance, partial),
    );
    assign(
      'whatsapp_base_url',
      this.nullableString(data.whatsapp_base_url, partial),
    );
    assign('whatsapp_token', this.nullableString(data.whatsapp_token, partial));
    assign('http_url', this.nullableString(data.http_url, partial));
    assign('http_method', this.nullableString(data.http_method, partial));
    assign('http_headers', normalizeJsonObject(data.http_headers));
    assign('http_query', normalizeJsonObject(data.http_query));
    assign('http_body', this.nullableString(data.http_body, partial));
    assign('http_timeout_ms', this.nullableNumber(data.http_timeout_ms, partial));
    assign('http_retry_count', this.nullableNumber(data.http_retry_count, partial));
    assign('internal_api_path', this.nullableString(data.internal_api_path, partial));
    assign(
      'internal_api_method',
      this.nullableString(data.internal_api_method, partial),
    );
    assign('internal_api_query', normalizeJsonObject(data.internal_api_query));
    assign('internal_api_body', normalizeJsonObject(data.internal_api_body));
    assign('internal_api_token', this.nullableString(data.internal_api_token, partial));
    assign(
      'internal_api_user_id',
      this.nullableNumber(data.internal_api_user_id, partial),
    );
    assign('app_command_slug', this.nullableString(data.app_command_slug, partial));
    assign('app_command_params', normalizeJsonObject(data.app_command_params));

    return normalized;
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

  private nullableNumber(value: any, partial = false) {
    if (value === undefined) {
      return partial ? undefined : null;
    }

    if (value === null || value === '') {
      return null;
    }

    return Number(value);
  }

}

