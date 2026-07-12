import { itemTranslations } from '@hed-hog/api';
import { getLocaleText, LocaleService } from '@hed-hog/api-locale';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService, setting_type_0f055cd5ea_enum } from '@hed-hog/api-prisma';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as pako from 'pako';
import { createClient, type RedisClientType } from 'redis';
import { IntegrationDeveloperApiService } from '../integration/services/integration-developer-api.service';
import { CreateDTO } from './dto/create.dto';
import { DeleteDTO } from './dto/delete.dto';
import { SettingDTO } from './dto/setting.dto';
import { UpdateSettingListDTO } from './dto/update-setting-list.dto';
import { UpdateDTO } from './dto/update.dto';

type SettingChangeEventInput = {
  settingId?: number | null;
  slug: string;
  type?: string | null;
  oldValue?: any;
  newValue?: any;
  source: string;
};

type SettingsVersionMessage = {
  originInstanceId: string;
  version: number;
  slugs: string[];
};

@Injectable()
export class SettingService implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(SettingService.name);
  private cachedSettings: Record<string, any> = {};
  private readonly instanceId = randomUUID();
  private readonly redisChannel = 'core:settings:version-changed';
  private readonly redisUrl = String(process.env.REDIS_URL || '').trim();
  private readonly settingsVersionCheckIntervalMs = Math.max(
    1000,
    Number(process.env.SETTINGS_VERSION_CHECK_INTERVAL_MS || 5000),
  );
  private localSettingsVersion = 0;
  private lastSettingsVersionCheckAt = 0;
  private redisPublisher: RedisClientType | null = null;
  private redisSubscriber: RedisClientType | null = null;
  private readonly redisErrorLogCooldownMs = Math.max(
    1000,
    Number(process.env.REDIS_SETTINGS_ERROR_LOG_COOLDOWN_MS || 30000),
  );
  private lastRedisSubscriberErrorLogAt = 0;
  private lastRedisPublisherErrorLogAt = 0;

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
    @Inject(forwardRef(() => LocaleService))
    private readonly localeService: LocaleService,
    @Inject(forwardRef(() => IntegrationDeveloperApiService))
    private readonly integrationApi: IntegrationDeveloperApiService,
  ) { }

  async onModuleInit() {
    await this.syncSettingsVersionFromDatabase();
    await this.initializeRedisSync();
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.safeCloseRedisClient(this.redisSubscriber),
      this.safeCloseRedisClient(this.redisPublisher),
    ]);
  }

  private async safeCloseRedisClient(client: RedisClientType | null) {
    if (!client || !client.isOpen) {
      return;
    }

    try {
      await client.quit();
    } catch {
      try {
        client.disconnect();
      } catch {
        // ignore shutdown errors
      }
    }
  }

  private logRedisClientError(kind: 'subscriber' | 'publisher', error: unknown) {
    const now = Date.now();
    const lastLogAt =
      kind === 'subscriber'
        ? this.lastRedisSubscriberErrorLogAt
        : this.lastRedisPublisherErrorLogAt;

    if (now - lastLogAt < this.redisErrorLogCooldownMs) {
      return;
    }

    if (kind === 'subscriber') {
      this.lastRedisSubscriberErrorLogAt = now;
    } else {
      this.lastRedisPublisherErrorLogAt = now;
    }

    const message = this.extractRedisErrorMessage(error);
    this.logger.warn(`Redis settings ${kind} error: ${message}`);
  }

  private extractRedisErrorMessage(error: unknown): string {
    if (error instanceof AggregateError && error.errors?.length) {
      return error.errors
        .map((e) => (e instanceof Error ? e.message || e.toString() : String(e)))
        .join('; ');
    }
    if (error instanceof Error) {
      return error.message || error.toString();
    }
    return String(error);
  }

  private async initializeRedisSync() {
    if (!this.redisUrl) {
      this.logger.log(
        'Redis settings sync disabled because REDIS_URL is not configured.',
      );
      return;
    }

    try {
      this.redisSubscriber = createClient({
        url: this.redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 250, 5000),
        },
      });
      this.redisPublisher = createClient({
        url: this.redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 250, 5000),
        },
      });

      this.redisSubscriber.on('error', (error) => {
        this.logRedisClientError('subscriber', error);
      });
      this.redisPublisher.on('error', (error) => {
        this.logRedisClientError('publisher', error);
      });

      await this.redisSubscriber.connect();
      await this.redisPublisher.connect();
      await this.redisSubscriber.subscribe(this.redisChannel, async (message) => {
        await this.handleRedisSettingsVersionMessage(message);
      });

      this.logger.log(
        `Redis settings sync enabled on channel ${this.redisChannel}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Redis settings sync: ${this.extractRedisErrorMessage(error)}`,
      );

      await Promise.allSettled([
        this.safeCloseRedisClient(this.redisSubscriber),
        this.safeCloseRedisClient(this.redisPublisher),
      ]);

      this.redisSubscriber = null;
      this.redisPublisher = null;
    }
  }

  private async handleRedisSettingsVersionMessage(message: string) {
    let payload: SettingsVersionMessage;

    try {
      payload = JSON.parse(message) as SettingsVersionMessage;
    } catch {
      return;
    }

    if (!payload || payload.originInstanceId === this.instanceId) {
      return;
    }

    if (!Number.isFinite(payload.version) || payload.version <= this.localSettingsVersion) {
      return;
    }

    this.localSettingsVersion = payload.version;
    this.lastSettingsVersionCheckAt = Date.now();
    this.clearCache();
  }

  private async ensureSettingsVersionState() {
    await this.prismaService.$executeRawUnsafe(`
      INSERT INTO "setting_runtime_state" ("scope", "version", "updated_at")
      VALUES ('global', 0, NOW())
      ON CONFLICT ("scope") DO NOTHING
    `);
  }

  private parseVersionValue(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'bigint') {
      return Number(value);
    }

    if (typeof value === 'string') {
      return Number(value);
    }

    return 0;
  }

  private async getSettingsVersionFromDatabase(): Promise<number> {
    await this.ensureSettingsVersionState();

    const rows = await this.prismaService.$queryRawUnsafe<Array<{ version: unknown }>>(`
      SELECT "version"
      FROM "setting_runtime_state"
      WHERE "scope" = 'global'
      LIMIT 1
    `);

    return this.parseVersionValue(rows[0]?.version);
  }

  private async syncSettingsVersionFromDatabase() {
    this.localSettingsVersion = await this.getSettingsVersionFromDatabase();
    this.lastSettingsVersionCheckAt = Date.now();
  }

  private async bumpSettingsVersion(): Promise<number> {
    await this.ensureSettingsVersionState();

    const rows = await this.prismaService.$queryRawUnsafe<Array<{ version: unknown }>>(`
      UPDATE "setting_runtime_state"
      SET "version" = "version" + 1,
          "updated_at" = NOW()
      WHERE "scope" = 'global'
      RETURNING "version"
    `);

    const nextVersion = this.parseVersionValue(rows[0]?.version);
    this.localSettingsVersion = nextVersion;
    this.lastSettingsVersionCheckAt = Date.now();
    return nextVersion;
  }

  private async ensureCacheVersionFresh() {
    const now = Date.now();
    if (now - this.lastSettingsVersionCheckAt < this.settingsVersionCheckIntervalMs) {
      return;
    }

    const currentVersion = await this.getSettingsVersionFromDatabase();
    this.lastSettingsVersionCheckAt = now;

    if (currentVersion > this.localSettingsVersion) {
      this.localSettingsVersion = currentVersion;
      this.clearCache();
    }
  }

  private async publishSettingsVersionChange(slugs: string[]) {
    const filteredSlugs = Array.from(new Set(slugs.filter(Boolean)));
    if (filteredSlugs.length === 0) {
      return;
    }

    const nextVersion = await this.bumpSettingsVersion();

    if (!this.redisPublisher?.isOpen) {
      return;
    }

    const payload: SettingsVersionMessage = {
      originInstanceId: this.instanceId,
      version: nextVersion,
      slugs: filteredSlugs,
    };

    try {
      await this.redisPublisher.publish(this.redisChannel, JSON.stringify(payload));
    } catch (error) {
      this.logger.warn(
        `Failed to publish settings version change: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async exportSettings(includeSecrets = false): Promise<Buffer> {
    const settings = await this.prismaService.setting.findMany({
      where: {
        ...( !includeSecrets ? {
              NOT: [
                { type: setting_type_0f055cd5ea_enum.secret },
              ],
        } : {}),
      },
      select: {
        slug: true,
        value: true, 
      }
    });

    // Converte para JSON e compacta com gzip
    const jsonString = JSON.stringify(settings);
    const compressed = pako.gzip(jsonString);
    return Buffer.from(compressed);
  }

  async importSettings(locale: string, file: MulterFile) {
    this.clearCache();
    let json;
    try {
      // Descompacta o arquivo .hedhog
      const decompressed = pako.ungzip(file.buffer, { to: 'string' });
      json = JSON.parse(decompressed);
    } catch (err) {
      throw new BadRequestException(getLocaleText('invalidCompressedFile', locale, 'File is not a valid .hedhog file or is corrupted.'));
    }

    if (!Array.isArray(json)) {
      throw new BadRequestException(getLocaleText('invalidJsonArray', locale, 'The JSON file must contain an array of settings.'));
    }

    const slugsFromFile = json.map((item: any) => item.slug).filter(Boolean);
    const existingSettings = await this.prismaService.setting.findMany({
      where: {
        slug: {
          in: slugsFromFile,
        },
      },
      select: {
        slug: true,
      },
    });

    const existingSlugs = existingSettings.map((s) => s.slug);
    const validSlugs = slugsFromFile.filter((slug: string) => existingSlugs.includes(slug));
    const invalidSlugs = slugsFromFile.filter((slug: string) => !existingSlugs.includes(slug));

    // Filtra apenas os dados válidos para retornar
    const validData = json.filter((item: any) => validSlugs.includes(item.slug));

    return {
      totalSettings: slugsFromFile.length,
      validSettings: validSlugs.length,
      invalidSlugs,
      validSlugs,
      fileData: validData,
    };
  }

  async confirmImport(settings: Array<{ slug: string; value: string }>) {
    this.clearCache();
    const slugs = settings.map((s) => s.slug);
    const existingSettings = await this.prismaService.setting.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
      select: {
        id: true,
        slug: true,
        type: true,
        value: true,
      },
    });

    const transaction = [];
    const changedSettings: SettingChangeEventInput[] = [];

    for (const setting of settings) {
      const existingSetting = existingSettings.find((s) => s.slug === setting.slug);
      if (existingSetting) {
        const nextValue = this.setValueFormattedByType(existingSetting.type, setting.value);

        transaction.push(
          this.prismaService.setting.update({
            where: {
              id: existingSetting.id,
            },
            data: {
              value: nextValue,
            },
          }),
        );

        changedSettings.push({
          settingId: existingSetting.id,
          slug: existingSetting.slug,
          type: existingSetting.type,
          oldValue: existingSetting.value,
          newValue: nextValue,
          source: 'confirmImport',
        });
      }
    }

    if (transaction.length > 0) {
      await this.prismaService.$transaction(transaction);
      await this.emitSettingChangedEvents(changedSettings);
      await this.publishSettingsVersionChange(changedSettings.map((item) => item.slug));
    }

    return {
      success: true,
      updatedCount: transaction.length,
    };
  }

  async getSystemSettings(): Promise<any> {
    const locales = await this.localeService.getEnables();
    const slugs = [
      'language',
      'system-name',
      'system-slogan',
      'icon-url',
      'image-url',
      'theme-primary-light',
      'theme-primary-foreground-light',
      'theme-secondary-light',
      'theme-secondary-foreground-light',
      'theme-accent-light',
      'theme-accent-foreground-light',
      'theme-muted-light',
      'theme-muted-foreground-light',
      'theme-background-light',
      'theme-background-foreground-light',
      'theme-card-light',
      'theme-card-foreground-light',
      'theme-primary-dark',
      'theme-primary-foreground-dark',
      'theme-secondary-dark',
      'theme-secondary-foreground-dark',
      'theme-accent-dark',
      'theme-accent-foreground-dark',
      'theme-muted-dark',
      'theme-muted-foreground-dark',
      'theme-background-dark',
      'theme-background-foreground-dark',
      'theme-card-dark',
      'theme-card-foreground-dark',
      'theme-radius',
      'theme-font',
      'theme-text-size',
      'theme-mode',
      'password-min-symbols',
      'password-min-numbers',
      'password-min-uppercase',
      'password-min-length',
      'mfa-email-code-length',
      'mcp-enabled',
      'date-format',
      'time-format',
      'timezone',
      'menu-width',
      'maintenance-mode-enabled',
      'providers',
      'oauth-facebook-enabled',
      'oauth-github-enabled',
      'oauth-google-enabled',
      'oauth-microsoft-enabled',
      'oauth-microsoft-entra-id-enabled',
      'oauth-apple-enabled',
      'oauth-linkedin-enabled',
      'disable-authentication-with-email-and-password',
      'contact-allow-company-registration',
      'operations.comment-edit-window',
      'lms-video-conversion-enabled',
      'lms-video-frame-capture-interval-seconds',
      'lms-error-modal-enabled',
      'url',
      'app-urls'
    ];
    const setting = await this.getSettingValues(slugs);
    return { locales, setting };
  }

  async getEffectiveSettings(userId: number): Promise<any> {
    const { locales, setting } = await this.getSystemSettings();
    const userSettings = await this.getUserSettings(userId);

    for (const userSetting of userSettings) {
      const slug = userSetting.setting?.slug;
      if (!slug) continue;

      const value = userSetting.value;
      if (value === undefined || value === null) continue;

      const globalValue = setting?.[slug];
      const globalType = typeof globalValue;

      if (globalType === 'boolean') {
        setting[slug] = value === 'true';
        continue;
      }

      if (globalType === 'number') {
        const parsed = Number(value);
        setting[slug] = Number.isNaN(parsed) ? value : parsed;
        continue;
      }

      if (Array.isArray(globalValue) || globalType === 'object') {
        try {
          setting[slug] = JSON.parse(value);
        } catch {
          setting[slug] = value;
        }
        continue;
      }

      setting[slug] = value;
    }

    return { locales, setting };
  }

  async setManySettings(data: SettingDTO) {
    this.clearCache();
    const transaction = [];
    const existingSettings = await this.prismaService.setting.findMany({
      where: {
        slug: {
          in: data.setting.map((item) => item.slug),
        },
      },
      select: {
        id: true,
        slug: true,
        type: true,
        value: true,
      },
    });
    const changedSettings: SettingChangeEventInput[] = [];

    for (const { slug, value } of data.setting) {
      const existingSetting = existingSettings.find((item) => item.slug === slug);
      if (!existingSetting) {
        continue;
      }

      const nextValue = this.setValueFormattedByType(existingSetting.type, value);

      transaction.push(
        this.prismaService.setting.updateMany({
          where: {
            slug,
          },
          data: {
            value: nextValue,
          },
        }),
      );

      changedSettings.push({
        settingId: existingSetting.id,
        slug: existingSetting.slug,
        type: existingSetting.type,
        oldValue: existingSetting.value,
        newValue: nextValue,
        source: 'setManySettings',
      });
    }

    await this.prismaService.$transaction(transaction);
    await this.emitSettingChangedEvents(changedSettings);
    await this.publishSettingsVersionChange(changedSettings.map((item) => item.slug));
    return { success: true };
  }

  async getSettingFromGroup(
    locale: any,
    paginationParams: any,
    slug: string,
    userId: number,
  ) {
    const fields = ['slug', 'value'];

    paginationParams.pageSize = 100;

    const OR: any[] = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    const result = await this.paginationService.paginate(
      this.prismaService.setting,
      paginationParams,
      {
        where: {
          AND: {
            setting_group: {
              slug,
            },
            OR,
          },
        },
        include: {
          setting_group: {
            include: {
              setting_group_locale: {
                where: {
                  locale: {
                    code: locale,
                  },
                },
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
          setting_subgroup: {
            include: {
              setting_subgroup_locale: {
                where: {
                  locale: {
                    code: locale,
                  },
                },
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
          setting_locale: {
            where: {
              locale: {
                code: locale,
              },
            },
            select: {
              name: true,
              description: true,
            },
          },
          setting_list: {
            select: {
              id: true,
              order: true,
              value: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          setting_user: {
            where: {
              user_id: userId,
            },
            select: {
              setting_id: true,
              value: true,
            },
          },
        },
      },
      'setting_locale',
    );

    result.data = result.data.map((setting: any) => {
      setting.setting_group = itemTranslations(
        'setting_group_locale',
        setting.setting_group,
      );

      if (setting.setting_subgroup) {
        setting.setting_subgroup = itemTranslations(
          'setting_subgroup_locale',
          setting.setting_subgroup,
        );
      }

      setting.subgroupId ??= setting.subgroup_id ?? setting.setting_subgroup?.id ?? null;

      return setting;
    });

    return result;
  }

  async listSettingGroups(locale: string, paginationParams: PaginationDTO) {
    const fields = ['slug', 'icon'];

    paginationParams.pageSize = 100;

    const OR: any[] = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    const result = await this.paginationService.paginate(
      this.prismaService.setting_group,
      paginationParams,
      {
        where: {
          slug: {
            not: 'hidden',
          },
          OR,
        },
        include: {
          setting_group_locale: {
            where: {
              locale: {
                code: locale,
              },
            },
            select: {
              name: true,
              description: true,
            },
          },
        },
      },
      'setting_group_locale',
    );

    return result;
  }

  async listSettings(locale: string, paginationParams: PaginationDTO) {
    const fields = ['slug', 'value'];

    const OR: any[] = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    const result = await this.paginationService.paginate(
      this.prismaService.setting,
      paginationParams,
      {
        where: {
          OR,
        },
        include: {
          setting_group: {
            include: {
              setting_group_locale: {
                where: {
                  locale: {
                    code: locale,
                  },
                },
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
          setting_subgroup: {
            include: {
              setting_subgroup_locale: {
                where: {
                  locale: {
                    code: locale,
                  },
                },
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
          setting_locale: {
            where: {
              locale: {
                code: locale,
              },
            },
            select: {
              name: true,
              description: true,
            },
          },
          setting_list: {
            select: {
              id: true,
              order: true,
              value: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      },
      'setting_locale',
    );

    result.data = result.data.map((setting: any) => {
      setting.setting_group = itemTranslations(
        'setting_group_locale',
        setting.setting_group,
      );

      if (setting.setting_subgroup) {
        setting.setting_subgroup = itemTranslations(
          'setting_subgroup_locale',
          setting.setting_subgroup,
        );
      }

      setting.subgroupId ??=
        setting.subgroup_id ?? setting.setting_subgroup?.id ?? null;

      return setting;
    });

    return result;
  }

  async updateSettingListOptions(settingId: number, data: UpdateSettingListDTO) {
    this.clearCache();

    const setting = await this.prismaService.setting.findUnique({
      where: { id: settingId },
      select: {
        id: true,
        component: true,
      },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with ID ${settingId} not found.`);
    }

    const component = String(setting.component ?? '').toLowerCase();
    if (component !== 'combobox' && component !== 'checkbox') {
      throw new BadRequestException(
        'Only combobox and checkbox settings support list options.',
      );
    }

    const options = (data.options ?? [])
      .map((option, index) => ({
        value: option.value?.trim() ?? '',
        order: option.order ?? index + 1,
      }))
      .filter((option) => option.value.length > 0);

    const updatedSetting = await this.prismaService.setting.update({
      where: { id: settingId },
      data: {
        setting_list: {
          deleteMany: {},
          create: options,
        },
      },
      include: {
        setting_list: {
          select: {
            id: true,
            order: true,
            value: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return updatedSetting;
  }

  async get(settingId: number) {
    const setting = await this.prismaService.setting.findUnique({
      where: { id: settingId },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with ID ${settingId} not found.`);
    }

    return setting;
  }

  async create(data: CreateDTO, _locale: string) {
    this.clearCache();
    const createdSetting = await this.prismaService.setting.create({
      data: {
        slug: data.slug,
        type: data.type as any,
        value: this.setValueFormattedByType(data.type, data.value),
        user_override: data.user_override,
        setting_group: {
          connect: {
            id: data.group_id,
          },
        },
      },
    });

    await this.emitSettingChangedEvents([
      {
        settingId: createdSetting.id,
        slug: createdSetting.slug,
        type: createdSetting.type,
        oldValue: undefined,
        newValue: createdSetting.value,
        source: 'create',
      },
    ]);

    await this.publishSettingsVersionChange([createdSetting.slug]);

    return createdSetting;
  }

  async update({ id, data }: { id: number; data: UpdateDTO }) {
    this.clearCache();

    const currentSetting = await this.prismaService.setting.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        slug: true,
        type: true,
        value: true,
      },
    });

    if (!currentSetting?.type) {
      throw new NotFoundException(`Setting not found.`);
    }

    const { type } = currentSetting;

    // Build update data object with only provided fields
    const updateData: any = {};
    
    if (data.slug !== undefined) {
      updateData.slug = data.slug;
    }
    
    if (data.type !== undefined) {
      updateData.type = data.type as any;
    }
    
    if (data.value !== undefined) {
      updateData.value = this.setValueFormattedByType(data.type || type, data.value);
    }
    
    if (data.user_override !== undefined) {
      updateData.user_override = data.user_override;
    }
    
    if (data.component !== undefined) {
      updateData.component = data.component as any;
    }
    
    if (data.group_id !== undefined) {
      updateData.setting_group = {
        connect: {
          id: data.group_id,
        },
      };
    }

    const updatedSetting = await this.prismaService.setting.update({
      where: { id },
      data: updateData,
    });

    await this.emitSettingChangedEvents([
      {
        settingId: updatedSetting.id,
        slug: updatedSetting.slug,
        type: updatedSetting.type,
        oldValue: currentSetting.value,
        newValue: updatedSetting.value,
        source: 'update',
      },
    ]);

    await this.publishSettingsVersionChange([updatedSetting.slug]);

    // Garantir que o value sobrescreve o valor original
    const result = { ...updatedSetting };
    result.value = this.getValueFormattedByType(updatedSetting.type, updatedSetting.value);
    return result;
  }

  async updateFromSlug(slug: string, data: UpdateDTO) {
    this.clearCache();
    const currentSetting = await this.prismaService.setting.findFirst({
      where: {
        slug,
      },
      select: {
        id: true,
        slug: true,
        type: true,
        value: true,
      },
    });

    if (!currentSetting?.id) {
      throw new NotFoundException(`Setting with slug ${slug} not found.`);
    }

    const nextValue = this.setValueFormattedByType(currentSetting.type, data.value);

    const updatedSetting = await this.prismaService.setting.update({
      where: { id: currentSetting.id },
      data: {
        value: nextValue,
      },
    });

    await this.emitSettingChangedEvents([
      {
        settingId: updatedSetting.id,
        slug: updatedSetting.slug,
        type: updatedSetting.type,
        oldValue: currentSetting.value,
        newValue: updatedSetting.value,
        source: 'updateFromSlug',
      },
    ]);

    await this.publishSettingsVersionChange([updatedSetting.slug]);

    const result = { ...updatedSetting };
    result.value = this.getValueFormattedByType(updatedSetting.type, updatedSetting.value);
    return result;
  }

  private normalizeValueForComparison(value: any) {
    if (value === undefined) {
      return '__undefined__';
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private isValueDefined(value: any) {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return true;
  }

  private async emitSettingChangedEvents(changes: SettingChangeEventInput[]) {
    const events = changes
      .filter((change) => Boolean(change.slug))
      .filter(
        (change) =>
          this.normalizeValueForComparison(change.oldValue) !==
          this.normalizeValueForComparison(change.newValue),
      )
      .map((change) => ({
        eventName: 'core.setting.changed',
        sourceModule: 'core',
        aggregateType: 'setting',
        aggregateId: String(change.settingId ?? change.slug),
        payload: {
          settingId: change.settingId ?? null,
          slug: change.slug,
          type: change.type ?? null,
          source: change.source,
          hasValue: this.isValueDefined(change.newValue),
        },
        metadata: {
          settingSlug: change.slug,
          source: change.source,
        },
      }));

    if (events.length === 0) {
      return;
    }

    try {
      await this.integrationApi.publishEvents(events);
    } catch (error) {
      this.logger.error(
        `Failed to publish ${events.length} setting change event(s).`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  setValueFormattedByType(type: string, value: any) {
    switch (type) {
      case 'boolean':
        return value === true || value === 'true' ? 'true' : 'false';
      case 'number': {
        if (value === undefined || value === null || String(value).trim() === '') {
          return '';
        }

        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          throw new BadRequestException(`Invalid numeric value for setting: ${value}`);
        }

        return numericValue.toString();
      }
      case 'array':
      case 'json':
        return typeof value === 'string' ? value : JSON.stringify(value);
      default:
        return value;
    }
  }

  getValueFormattedByType(type: string, value: any) {
    switch (type) {
      case 'boolean':
        return value === true || value === 'true' ? 'true' : 'false';
      case 'number': {
        if (value === undefined || value === null || String(value).trim() === '') {
          return '';
        }

        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          throw new BadRequestException(`Invalid numeric value for setting: ${value}`);
        }

        return numericValue.toString();
      }
      case 'array':
      case 'json':
        return typeof value === 'string' ? value : JSON.stringify(value);
      default:
        return value;
    }
  }

  async delete(locale:string,{ ids }: DeleteDTO) {
    this.clearCache();
    if (ids == undefined || ids == null) {
      throw new BadRequestException(
        `You must select at least one setting to delete.`,
      );
    }

    const existingSettings = await this.prismaService.setting.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (existingSettings.length !== ids.length) {
      throw new BadRequestException(
        getLocaleText('someSettingsNotFound', locale, `Some settings were not found.`),
      );
    }

    const deleted = await this.prismaService.setting.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (deleted.count > 0) {
      await this.publishSettingsVersionChange(existingSettings.map((item) => item.slug));
    }

    return deleted;
  }

  async setSettingUserValue(locale:string, user_id: number, slug: string, value: string) {
    this.clearCache();
    const user = await this.prismaService.user.findUnique({
      where: {
        id: user_id,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException(getLocaleText('userNotFound', locale, `User not found.`));
    }

    const setting = await this.prismaService.setting.findFirst({
      where: {
        slug,
        user_override: true,
      },
    });

    if (!setting) {
      throw new NotFoundException(
        getLocaleText('settingNotFound', locale, `Setting not found or user can not override.`),
      );
    }

    return await this.prismaService.setting_user.upsert({
      where: {
        user_id_setting_id: {
          setting_id: setting.id,
          user_id: user.id,
        },
      },
      create: {
        setting_id: setting.id,
        value,
        user_id: user.id,
      },
      update: {
        value,
      },
      select: {
        setting_id: true,
        user_id: true,
        value: true,
      },
    });
  }

  async getSettingValues(
    slug: string | string[],
    userId?: number,
  ): Promise<Record<string, any>> {

    const slugs = Array.isArray(slug) ? slug : [slug];
    if (userId === undefined) {
      await this.ensureCacheVersionFresh();
    }

    if (
      userId === undefined &&
      this.cachedSettings &&
      slugs.every(s => Object.prototype.hasOwnProperty.call(this.cachedSettings, s))
    ) {
      // Retorna apenas os slugs requisitados do cache
      const cached: Record<string, any> = {};
      slugs.forEach(s => {
        cached[s] = this.cachedSettings[s];
      });
      return cached;
    }

    

    slug = Array.isArray(slug) ? slug : [slug];

    let setting = await this.prismaService.setting.findMany({
      where: {
        slug: {
          in: slug,
        },
      },
      select: {
        id: true,
        value: true,
        slug: true,
        type: true,
        user_override: true,
      },
    });

    const slugUserOverride = setting.filter((s) => s.user_override);

    const settingUser =
      userId === undefined
        ? []
        : await this.prismaService.setting_user.findMany({
            where: {
              user_id: userId,
              setting_id: {
                in: slugUserOverride.map((setting) => setting?.id),
              },
            },
            select: {
              value: true,
              setting_id: true,
            },
          });

    const data: Record<string, any> = {};
    const cacheData: Record<string, any> = {};

    for (const s of setting) {
      switch (s.type) {
        case 'boolean':
          data[s.slug] = s.value === 'true';
          cacheData[s.slug] = s.value === 'true';
          break;
        case 'number':
          data[s.slug] = Number(s.value);
          cacheData[s.slug] = Number(s.value);
          break;
        case 'array':
        case 'json':
          try {
            data[s.slug] = JSON.parse(s.value);
            cacheData[s.slug] = JSON.parse(s.value);
          } catch (err) {
            console.error('Error parsing JSON', s.value, err);
            data[s.slug] = s.value;
            cacheData[s.slug] = s.value;
          }
          break;
        default:
          data[s.slug] = s.value;
          cacheData[s.slug] = s.value;
      }
    }

    // sobrescreve os valores em data, mas NÃO salva no cache
    settingUser.forEach((ss) => {
      const slugOverride = slugUserOverride.find((s) => s.id === ss.setting_id)?.slug;
      if (slugOverride) {
        data[slugOverride] = ss.value;
      }
    });

    this.setCache(cacheData);
    return data;
  }

  setCache(value: Record<string, any>) {
    Object.keys(value).forEach(key => {
      this.cachedSettings[key] = value[key];
    });
    return this.cachedSettings;
  }

  clearCache() {
    this.cachedSettings = {};
  }

  async getUserSettings(user_id: number) {

    const user = await this.prismaService.user.findUnique({
      where: {
        id: user_id,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User not found.`);
    }

    return this.prismaService.setting_user.findMany({
      where: {
        user_id,
      },
      include: {
        setting: {
          select: {
            slug: true,
          },
        },
      },
    });
  }

  async setValue(slug: string, value: string) {
    this.clearCache();

    const currentSetting = await this.prismaService.setting.findFirst({
      where: {
        slug,
      },
      select: {
        id: true,
        slug: true,
        type: true,
        value: true,
      },
    });

    if (!currentSetting?.id) {
      throw new NotFoundException(`Setting with slug ${slug} not found.`);
    }

    const nextValue = this.setValueFormattedByType(currentSetting.type, value);
    const result = await this.prismaService.setting.updateMany({
      where: {
        slug,
      },
      data: {
        value: nextValue,
      },
    });

    await this.emitSettingChangedEvents([
      {
        settingId: currentSetting.id,
        slug: currentSetting.slug,
        type: currentSetting.type,
        oldValue: currentSetting.value,
        newValue: nextValue,
        source: 'setValue',
      },
    ]);

    await this.publishSettingsVersionChange([currentSetting.slug]);

    return result;
  }
}
