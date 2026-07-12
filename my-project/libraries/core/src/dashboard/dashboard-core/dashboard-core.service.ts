import { getLocaleText } from '@hed-hog/api-locale';
import { PrismaService } from '@hed-hog/api-prisma';
import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SettingService } from '../../setting/setting.service';

type DashboardCoreConfigStatus = {
  isConfigured: boolean;
};

type DashboardCoreLocaleConfigOverview = {
  status: DashboardCoreConfigStatus & {
    enabledLocaleCount: number;
    disabledLocaleCount: number;
  };
  settings: {
    dateFormat: string | null;
    timeFormat: string | null;
    timezone: string | null;
  };
  locales: Array<{
    id: number;
    code: string;
    region: string;
    name: string;
    enabled: boolean;
  }>;
};

type DashboardCoreMailProviderOverview = {
  id: string;
  label: string;
  selected: boolean;
  configured: boolean;
  missingKeys: string[];
};

type DashboardCoreMailConfigOverview = {
  status: DashboardCoreConfigStatus & {
    selectedProvider: string | null;
    configuredProvider: string | null;
  };
  sender: {
    from: string | null;
  };
  metrics: {
    templateCount: number;
    sentCount: number;
    sentLast30Days: number;
  };
  providers: DashboardCoreMailProviderOverview[];
};

type DashboardCoreOAuthProviderOverview = {
  id: string;
  label: string;
  enabled: boolean;
  configured: boolean;
  missingKeys: string[];
  scopesCount: number;
  connectedUsers: number;
};

type DashboardCoreOAuthConfigOverview = {
  status: DashboardCoreConfigStatus & {
    enabledProviderCount: number;
    configuredProviderCount: number;
    connectedAccountCount: number;
  };
  providers: DashboardCoreOAuthProviderOverview[];
};

type DashboardCoreStorageConfigOverview = {
  status: DashboardCoreConfigStatus & {
    totalProfiles: number;
    activeProfiles: number;
    defaultProfileId: number | null;
  };
  providers: Array<{
    providerType: string;
    total: number;
    active: number;
    defaults: number;
  }>;
  profiles: Array<{
    id: number;
    name: string;
    providerType: string;
    bucketName: string;
    region: string | null;
    endpointUrl: string | null;
    basePath: string | null;
    pathTemplate: string | null;
    forcePathStyle: boolean;
    isDefault: boolean;
    isActive: boolean;
    testStatus: string;
    lastTestedAt: Date | null;
    updatedAt: Date;
  }>;
};

type DashboardCoreThemePaletteMode = {
  primary: string | null;
  primaryForeground: string | null;
  secondary: string | null;
  secondaryForeground: string | null;
  accent: string | null;
  accentForeground: string | null;
  muted: string | null;
  mutedForeground: string | null;
  background: string | null;
  backgroundForeground: string | null;
  card: string | null;
  cardForeground: string | null;
};

type DashboardCoreThemeConfigOverview = {
  status: DashboardCoreConfigStatus & {
    configuredTokenCount: number;
  };
  branding: {
    systemName: string | null;
    systemSlogan: string | null;
    iconUrl: string | null;
    imageUrl: string | null;
  };
  presentation: {
    mode: string | null;
    font: string | null;
    textSize: string | null;
    radius: string | null;
  };
  palette: {
    light: DashboardCoreThemePaletteMode;
    dark: DashboardCoreThemePaletteMode;
  };
};

export type DashboardCoreConfigOverview = {
  localeConfig: DashboardCoreLocaleConfigOverview;
  mailConfig: DashboardCoreMailConfigOverview;
  oauthConfig: DashboardCoreOAuthConfigOverview;
  storageConfig: DashboardCoreStorageConfigOverview;
  themeConfig: DashboardCoreThemeConfigOverview;
};

const MAIL_PROVIDER_REQUIREMENTS: Record<string, string[]> = {
  SMTP: ['mail-from', 'mail-smtp-host', 'mail-smtp-port', 'mail-client-secret'],
  GMAIL: [
    'mail-from',
    'mail-gmail-client-id',
    'mail-gmail-client-secret',
    'mail-gmail-refresh-token',
  ],
  SES: [
    'mail-from',
    'mail-aws-access-key-id',
    'mail-aws-secret-access-key',
    'mail-aws-region',
  ],
};

const MAIL_PROVIDER_LABELS: Record<string, string> = {
  SMTP: 'SMTP',
  GMAIL: 'Gmail',
  SES: 'Amazon SES',
};

const OAUTH_PROVIDER_DEFINITIONS = [
  {
    id: 'google',
    label: 'Google',
    requiredKeys: ['google_client_id', 'google_client_secret', 'url'],
    scopeKey: 'google_scopes',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    requiredKeys: ['facebook_client_id', 'facebook_client_secret', 'url'],
    scopeKey: 'facebook_scopes',
  },
  {
    id: 'github',
    label: 'GitHub',
    requiredKeys: ['github_client_id', 'github_client_secret', 'api-url'],
    scopeKey: 'github_scopes',
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    requiredKeys: ['microsoft_client_id', 'microsoft_client_secret', 'url'],
    scopeKey: 'microsoft_scopes',
  },
  {
    id: 'microsoft_entra_id',
    label: 'Microsoft Entra ID',
    requiredKeys: [
      'microsoft_entra_id_client_id',
      'microsoft_entra_id_client_secret',
      'microsoft_entra_id_tenant_id',
      'url',
    ],
    scopeKey: 'microsoft_entra_id_scopes',
  },
] as const;

const LOCALE_SETTING_KEYS = ['date-format', 'time-format', 'timezone'] as const;

const MAIL_SETTING_KEYS = [
  'mail-provider',
  'mail-from',
  'mail-gmail-client-id',
  'mail-gmail-client-secret',
  'mail-gmail-refresh-token',
  'mail-smtp-host',
  'mail-smtp-port',
  'mail-smtp-secure',
  'mail-client-secret',
  'mail-aws-access-key-id',
  'mail-aws-secret-access-key',
  'mail-aws-region',
] as const;

const OAUTH_SETTING_KEYS = [
  'providers',
  'url',
  'api-url',
  'google_client_id',
  'google_client_secret',
  'google_scopes',
  'facebook_client_id',
  'facebook_client_secret',
  'facebook_scopes',
  'github_client_id',
  'github_client_secret',
  'github_scopes',
  'microsoft_client_id',
  'microsoft_client_secret',
  'microsoft_scopes',
  'microsoft_entra_id_client_id',
  'microsoft_entra_id_client_secret',
  'microsoft_entra_id_tenant_id',
  'microsoft_entra_id_scopes',
] as const;

const THEME_SETTING_KEYS = [
  'system-name',
  'system-slogan',
  'icon-url',
  'image-url',
  'theme-mode',
  'theme-font',
  'theme-text-size',
  'theme-radius',
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
] as const;

@Injectable()
export class DashboardCoreService {
  private readonly logger = new Logger(DashboardCoreService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly settingService: SettingService,
  ) {}

  async getConfigOverview(): Promise<DashboardCoreConfigOverview> {
    const [localeConfig, mailConfig, oauthConfig, storageConfig, themeConfig] =
      await Promise.all([
        this.getLocaleConfigOverview(),
        this.getMailConfigOverview(),
        this.getOAuthConfigOverview(),
        this.getStorageConfigOverview(),
        this.getThemeConfigOverview(),
      ]);

    return {
      localeConfig,
      mailConfig,
      oauthConfig,
      storageConfig,
      themeConfig,
    };
  }

  private async getLocaleConfigOverview(): Promise<DashboardCoreLocaleConfigOverview> {
    const [settings, locales] = await Promise.all([
      this.settingService.getSettingValues([...LOCALE_SETTING_KEYS]),
      this.prismaService.locale.findMany({
        orderBy: [{ enabled: 'desc' }, { code: 'asc' }],
        select: {
          id: true,
          code: true,
          region: true,
          name: true,
          enabled: true,
        },
      }),
    ]);

    const enabledLocaleCount = locales.filter((locale) => locale.enabled).length;
    const disabledLocaleCount = locales.length - enabledLocaleCount;

    return {
      status: {
        isConfigured:
          enabledLocaleCount > 0 &&
          this.hasConfigValue(settings['date-format']) &&
          this.hasConfigValue(settings['time-format']) &&
          this.hasConfigValue(settings['timezone']),
        enabledLocaleCount,
        disabledLocaleCount,
      },
      settings: {
        dateFormat: this.toNullableString(settings['date-format']),
        timeFormat: this.toNullableString(settings['time-format']),
        timezone: this.toNullableString(settings['timezone']),
      },
      locales,
    };
  }

  private async getMailConfigOverview(): Promise<DashboardCoreMailConfigOverview> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [settings, templateCount, sentCount, sentLast30Days] = await Promise.all([
      this.settingService.getSettingValues([...MAIL_SETTING_KEYS]),
      this.prismaService.mail.count(),
      this.prismaService.mail_sent.count(),
      this.prismaService.mail_sent.count({
        where: {
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ]);

    const selectedProvider = this.toNullableUppercaseString(settings['mail-provider']);

    const providers = Object.entries(MAIL_PROVIDER_REQUIREMENTS).map(
      ([providerId, requiredKeys]) => {
        const missingKeys = this.getMissingSettingKeys(settings, requiredKeys);

        return {
          id: providerId,
          label: MAIL_PROVIDER_LABELS[providerId] ?? providerId,
          selected: providerId === selectedProvider,
          configured: missingKeys.length === 0,
          missingKeys,
        };
      },
    );

    const configuredProvider = providers.find(
      (provider) => provider.id === selectedProvider && provider.configured,
    );

    return {
      status: {
        isConfigured: configuredProvider !== undefined,
        selectedProvider,
        configuredProvider: configuredProvider?.id ?? null,
      },
      sender: {
        from: this.toNullableString(settings['mail-from']),
      },
      metrics: {
        templateCount,
        sentCount,
        sentLast30Days,
      },
      providers,
    };
  }

  private async getOAuthConfigOverview(): Promise<DashboardCoreOAuthConfigOverview> {
    const [settings, connectedAccounts] = await Promise.all([
      this.settingService.getSettingValues([...OAUTH_SETTING_KEYS]),
      this.prismaService.user_account.groupBy({
        by: ['provider'],
        _count: {
          _all: true,
        },
      }),
    ]);

    const enabledProviders = this.normalizeProviderList(settings['providers']);
    const connectedAccountsByProvider = new Map(
      connectedAccounts.map((entry) => [String(entry.provider), entry._count._all]),
    );

    const providers = OAUTH_PROVIDER_DEFINITIONS.map((provider) => {
      const missingKeys = this.getMissingSettingKeys(settings, provider.requiredKeys);
      const scopes = Array.isArray(settings[provider.scopeKey])
        ? (settings[provider.scopeKey] as unknown[])
        : [];

      return {
        id: provider.id,
        label: provider.label,
        enabled: enabledProviders.includes(provider.id),
        configured: missingKeys.length === 0,
        missingKeys,
        scopesCount: scopes.length,
        connectedUsers: connectedAccountsByProvider.get(provider.id) ?? 0,
      };
    });

    return {
      status: {
        isConfigured: providers.some((provider) => provider.enabled && provider.configured),
        enabledProviderCount: providers.filter((provider) => provider.enabled).length,
        configuredProviderCount: providers.filter((provider) => provider.configured).length,
        connectedAccountCount: providers.reduce(
          (total, provider) => total + provider.connectedUsers,
          0,
        ),
      },
      providers,
    };
  }

  private async getStorageConfigOverview(): Promise<DashboardCoreStorageConfigOverview> {
    const profiles = await this.prismaService.storage_profile.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: [{ is_default: 'desc' }, { is_active: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        provider_type: true,
        bucket_name: true,
        region: true,
        endpoint_url: true,
        base_path: true,
        path_template: true,
        force_path_style: true,
        is_default: true,
        is_active: true,
        test_status: true,
        last_tested_at: true,
        updated_at: true,
      },
    });

    const providerMap = new Map<
      string,
      { providerType: string; total: number; active: number; defaults: number }
    >();

    profiles.forEach((profile) => {
      const providerType = String(profile.provider_type);
      const current = providerMap.get(providerType) ?? {
        providerType,
        total: 0,
        active: 0,
        defaults: 0,
      };

      current.total += 1;
      current.active += profile.is_active ? 1 : 0;
      current.defaults += profile.is_default ? 1 : 0;
      providerMap.set(providerType, current);
    });

    const activeProfiles = profiles.filter((profile) => profile.is_active).length;
    const defaultProfile = profiles.find((profile) => profile.is_default) ?? null;

    return {
      status: {
        isConfigured: activeProfiles > 0,
        totalProfiles: profiles.length,
        activeProfiles,
        defaultProfileId: defaultProfile?.id ?? null,
      },
      providers: Array.from(providerMap.values()),
      profiles: profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        providerType: String(profile.provider_type),
        bucketName: profile.bucket_name,
        region: profile.region,
        endpointUrl: profile.endpoint_url,
        basePath: profile.base_path,
        pathTemplate: profile.path_template,
        forcePathStyle: profile.force_path_style,
        isDefault: profile.is_default,
        isActive: profile.is_active,
        testStatus: String(profile.test_status),
        lastTestedAt: profile.last_tested_at,
        updatedAt: profile.updated_at,
      })),
    };
  }

  private async getThemeConfigOverview(): Promise<DashboardCoreThemeConfigOverview> {
    const settings = await this.settingService.getSettingValues([...THEME_SETTING_KEYS]);
    const configuredTokenCount = THEME_SETTING_KEYS.filter((key) =>
      this.hasConfigValue(settings[key]),
    ).length;

    return {
      status: {
        isConfigured:
          this.hasConfigValue(settings['system-name']) ||
          this.hasConfigValue(settings['theme-primary-light']) ||
          this.hasConfigValue(settings['theme-primary-dark']),
        configuredTokenCount,
      },
      branding: {
        systemName: this.toNullableString(settings['system-name']),
        systemSlogan: this.toNullableString(settings['system-slogan']),
        iconUrl: this.toNullableString(settings['icon-url']),
        imageUrl: this.toNullableString(settings['image-url']),
      },
      presentation: {
        mode: this.toNullableString(settings['theme-mode']),
        font: this.toNullableString(settings['theme-font']),
        textSize: this.toNullableString(settings['theme-text-size']),
        radius: this.toNullableString(settings['theme-radius']),
      },
      palette: {
        light: {
          primary: this.toNullableString(settings['theme-primary-light']),
          primaryForeground: this.toNullableString(
            settings['theme-primary-foreground-light'],
          ),
          secondary: this.toNullableString(settings['theme-secondary-light']),
          secondaryForeground: this.toNullableString(
            settings['theme-secondary-foreground-light'],
          ),
          accent: this.toNullableString(settings['theme-accent-light']),
          accentForeground: this.toNullableString(
            settings['theme-accent-foreground-light'],
          ),
          muted: this.toNullableString(settings['theme-muted-light']),
          mutedForeground: this.toNullableString(
            settings['theme-muted-foreground-light'],
          ),
          background: this.toNullableString(settings['theme-background-light']),
          backgroundForeground: this.toNullableString(
            settings['theme-background-foreground-light'],
          ),
          card: this.toNullableString(settings['theme-card-light']),
          cardForeground: this.toNullableString(
            settings['theme-card-foreground-light'],
          ),
        },
        dark: {
          primary: this.toNullableString(settings['theme-primary-dark']),
          primaryForeground: this.toNullableString(
            settings['theme-primary-foreground-dark'],
          ),
          secondary: this.toNullableString(settings['theme-secondary-dark']),
          secondaryForeground: this.toNullableString(
            settings['theme-secondary-foreground-dark'],
          ),
          accent: this.toNullableString(settings['theme-accent-dark']),
          accentForeground: this.toNullableString(
            settings['theme-accent-foreground-dark'],
          ),
          muted: this.toNullableString(settings['theme-muted-dark']),
          mutedForeground: this.toNullableString(
            settings['theme-muted-foreground-dark'],
          ),
          background: this.toNullableString(settings['theme-background-dark']),
          backgroundForeground: this.toNullableString(
            settings['theme-background-foreground-dark'],
          ),
          card: this.toNullableString(settings['theme-card-dark']),
          cardForeground: this.toNullableString(
            settings['theme-card-foreground-dark'],
          ),
        },
      },
    };
  }

  private getMissingSettingKeys(
    settings: Record<string, unknown>,
    requiredKeys: readonly string[],
  ): string[] {
    return requiredKeys.filter((key) => !this.hasConfigValue(settings[key]));
  }

  private hasConfigValue(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return value !== null && value !== undefined;
  }

  private toNullableString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return value === null || value === undefined ? null : String(value);
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private toNullableUppercaseString(value: unknown): string | null {
    const normalized = this.toNullableString(value);
    return normalized ? normalized.toUpperCase() : null;
  }

  private normalizeProviderList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((provider) => String(provider).toLowerCase());
  }

  private slugifyDashboardName(value: string): string {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || `dashboard-${Date.now()}`;
  }

  private getDashboardDisplayName(
    dashboard: {
      slug: string;
      dashboard_locale?: Array<{ name?: string | null }>;
    },
  ): string {
    return dashboard.dashboard_locale?.[0]?.name || dashboard.slug;
  }

  private async buildUniqueDashboardSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 2;

    while (
      await this.prismaService.dashboard.findFirst({
        where: { slug },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private async getDashboardUserOrThrow(
    userId: number,
    slug: string,
    locale: string,
  ) {
    const dashboardUser = await this.prismaService.dashboard_user.findFirst({
      where: {
        user_id: userId,
        dashboard: { slug },
      },
      include: {
        dashboard: {
          include: {
            dashboard_locale: {
              where: {
                locale: {
                  code: locale,
                },
              },
            },
          },
        },
      },
    });

    if (!dashboardUser) {
      throw new ForbiddenException(
        getLocaleText('dashboardNotFound', locale, 'Dashboard not found.'),
      );
    }

    return dashboardUser;
  }

  private async getUserRoleIds(userId: number) {
    const roleUsers = await this.prismaService.role_user.findMany({
      where: { user_id: userId },
      select: { role_id: true },
    });

    return roleUsers.map((roleUser) => roleUser.role_id);
  }

  private async getDashboardComponentRoleRequirements(dashboardId: number) {
    const dashboardItems = await this.prismaService.dashboard_item.findMany({
      where: {
        dashboard_id: dashboardId,
      },
      select: {
        component_id: true,
        dashboard_component: {
          select: {
            dashboard_component_role: {
              select: {
                role_id: true,
              },
            },
          },
        },
      },
    });

    const uniqueByComponentId = new Map<number, number[]>();

    for (const item of dashboardItems) {
      if (uniqueByComponentId.has(item.component_id)) {
        continue;
      }

      uniqueByComponentId.set(
        item.component_id,
        item.dashboard_component.dashboard_component_role.map(
          (relation) => relation.role_id,
        ),
      );
    }

    return Array.from(uniqueByComponentId.values());
  }

  private userHasRequiredRolesForDashboard(
    componentRoleRequirements: number[][],
    userRoleIds: number[],
  ) {
    if (componentRoleRequirements.length === 0) {
      return true;
    }

    if (userRoleIds.length === 0) {
      return componentRoleRequirements.every(
        (requiredRoles) => requiredRoles.length === 0,
      );
    }

    const userRoleIdSet = new Set(userRoleIds);

    return componentRoleRequirements.every(
      (requiredRoles) =>
        requiredRoles.length === 0 ||
        requiredRoles.some((roleId) => userRoleIdSet.has(roleId)),
    );
  }

  private async getDashboardRoleAccessState(dashboardId: number, userId: number) {
    const [componentRoleRequirements, userRoleIds] = await Promise.all([
      this.getDashboardComponentRoleRequirements(dashboardId),
      this.getUserRoleIds(userId),
    ]);

    const hasRequiredRoles = this.userHasRequiredRolesForDashboard(
      componentRoleRequirements,
      userRoleIds,
    );

    return {
      hasRequiredRoles,
      accessStatus: hasRequiredRoles ? 'allowed' : 'missing-roles',
    };
  }

  private async assertDashboardRoleAccess(dashboardId: number, userId: number) {
    const { hasRequiredRoles } = await this.getDashboardRoleAccessState(
      dashboardId,
      userId,
    );

    if (!hasRequiredRoles) {
      throw new ForbiddenException('Access denied to this dashboard');
    }
  }

  private async getAccessibleTemplateOrThrow(
    userId: number,
    templateSlug: string,
    locale: string,
  ) {
    const userRoleIds = await this.getUserRoleIds(userId);
    const templateAccessFilter =
      userRoleIds.length > 0
        ? {
            OR: [
              {
                dashboard_role: {
                  some: {
                    role_id: {
                      in: userRoleIds,
                    },
                  },
                },
              },
              {
                dashboard_role: {
                  none: {},
                },
              },
            ],
          }
        : {
            dashboard_role: {
              none: {},
            },
          };

    const template = await this.prismaService.dashboard.findFirst({
      where: {
        slug: templateSlug,
        is_template: true,
        ...templateAccessFilter,
      },
      include: {
        dashboard_locale: {
          where: {
            locale: {
              code: locale,
            },
          },
        },
        dashboard_item: {
          select: {
            component_id: true,
            width: true,
            height: true,
            x_axis: true,
            y_axis: true,
          },
        },
      },
    });

    if (!template) {
      throw new ForbiddenException(
        getLocaleText('dashboardNotFound', locale, 'Dashboard template not found.'),
      );
    }

    return template;
  }

  async getHome(userId: number, locale: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        role_user: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException(getLocaleText('userNotFound', locale));
    }

    let dashboard = await this.prismaService.dashboard.findFirst({
      where: {
        dashboard_user: {
          some: {
            user_id: userId,
            is_home: true,
          },
        },
      },
    });

    if (dashboard) {
      return dashboard;
    }

    const hasAdminRole = user.role_user.some((ru) => ru.role.slug === 'admin');
    const hasAdminAccessRole = user.role_user.some(
      (ru) => ru.role.slug === 'admin-access',
    );

    let targetDashboardSlug: string | null = null;
    if (hasAdminRole) {
      targetDashboardSlug = 'default';
    } else if (hasAdminAccessRole) {
      targetDashboardSlug = 'user';
    }

    if (!targetDashboardSlug) {
      return null;
    }

    const targetDashboard = await this.prismaService.dashboard.findFirst({
      where: { slug: targetDashboardSlug },
      select: { id: true },
    });

    if (!targetDashboard) {
      return null;
    }

    const existingDashboardUser = await this.prismaService.dashboard_user.findFirst({
      where: {
        dashboard_id: targetDashboard.id,
        user_id: userId,
      },
      select: { id: true },
    });

    if (existingDashboardUser) {
      await this.prismaService.dashboard_user.update({
        where: { id: existingDashboardUser.id },
        data: { is_home: true },
      });
    } else {
      await this.prismaService.dashboard_user.create({
        data: {
          dashboard_id: targetDashboard.id,
          user_id: userId,
          is_home: true,
        },
      });
    }

    dashboard = await this.prismaService.dashboard.findFirst({
      where: {
        dashboard_user: {
          some: {
            user_id: userId,
            is_home: true,
          },
        },
      },
    });

    return dashboard;
  }

  async fromSlug(slug: string, code: string) {
    return this.prismaService.dashboard_item.findMany({
      where: { dashboard: { slug } },
      include: {
        dashboard_component: {
          include: {
            dashboard_component_locale: {
              where: {
                locale: {
                  code,
                },
              },
            },
          },
        },
      },
    });
  }

  calculateChange(current: number, previous: number){
    if (previous === 0) return current === 0 ? 0 : 100;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  async getUserStatistics() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      sessionsTodayCount, 
      activeUsersCount, 
      rolesCount,
      sessionsCurrentMonth,
      usersCurrentMonth,
      rolesCurrentMonth,
      sessionsLastMonth,
      usersLastMonth,
      rolesLastMonth,
    ] = await Promise.all([
      this.prismaService.user_session.count({ where: { created_at: { gte: todayStart } } }),
      this.prismaService.user.count(),
      this.prismaService.role.count(),
      this.prismaService.user_session.count({ where: { created_at: { gte: currentMonthStart } } }),
      this.prismaService.user.count({ where: { created_at: { gte: currentMonthStart } } }),
      this.prismaService.role.count({ where: { created_at: { gte: currentMonthStart } } }),
      this.prismaService.user_session.count({ where: { created_at: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      this.prismaService.user.count({ where: { created_at: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      this.prismaService.role.count({ where: { created_at: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    ]);

    const sessionsChange = this.calculateChange(sessionsCurrentMonth, sessionsLastMonth);
    const usersChange = this.calculateChange(usersCurrentMonth, usersLastMonth);
    const rolesChange = this.calculateChange(rolesCurrentMonth, rolesLastMonth);
    const permissionDistribution = await this.prismaService.$queryRaw<
      Array<{ name: string; value: bigint }>
    >`
      SELECT 
        r.slug as name,
        COUNT(ru.user_id) as value
      FROM "role" r
      LEFT JOIN "role_user" ru ON r.id = ru.role_id
      GROUP BY r.id, r.slug
      ORDER BY value DESC
    `;

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    const permissionsData = permissionDistribution.map((item, index) => ({
      name: item.name,
      value: Number(item.value),
      color: colors[index % colors.length],
    }));

    const sessionActivity = await this.prismaService.$queryRaw<
      Array<{ hour: number; active: bigint; expired: bigint }>
    >`
      SELECT 
        FLOOR(EXTRACT(HOUR FROM "created_at" AT TIME ZONE 'America/Sao_Paulo') / 2) * 2 as hour,
        COUNT(CASE WHEN "expires_at" > NOW() THEN 1 END) as active,
        COUNT(CASE WHEN "expires_at" <= NOW() THEN 1 END) as expired
      FROM "user_session"
      WHERE "created_at" >= ${todayStart}
      GROUP BY FLOOR(EXTRACT(HOUR FROM "created_at" AT TIME ZONE 'America/Sao_Paulo') / 2)
      ORDER BY hour ASC
    `;

    const sessionActivityData = [];
    for (let h = 0; h < 24; h += 2) {
      const found = sessionActivity.find((s) => Number(s.hour) === h);
      sessionActivityData.push({
        hour: `${h.toString().padStart(2, '0')}h`,
        active: found ? Number(found.active) : 0,
        expired: found ? Number(found.expired) : 0,
      });
    }

    const userGrowth = await this.prismaService.$queryRaw<
      Array<{ month: Date; users: bigint; sessions: bigint }>
    >`
      SELECT 
        DATE_TRUNC('month', u."created_at") as month,
        COUNT(DISTINCT u.id) as users,
        COUNT(s.id) as sessions
      FROM "user" u
      LEFT JOIN "user_session" s ON u.id = s.user_id AND DATE_TRUNC('month', u."created_at") = DATE_TRUNC('month', s."created_at")
      WHERE u."created_at" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', u."created_at")
      ORDER BY month ASC
    `;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const userGrowthData = userGrowth.map((item) => {
      const monthIndex = new Date(item.month).getMonth() + 1;
      return {
        month: monthNames[monthIndex],
        users: Number(item.users),
        sessions: Number(item.sessions),
      };
    });

    return {
      cards: {
        sessionsToday: {
          value: sessionsTodayCount,
          change: sessionsChange,
        },
        activeUsers: {
          value: activeUsersCount,
          change: usersChange,
        },
        roles: {
          value: rolesCount,
          change: rolesChange,
        },
      },
      charts: {
        permissionDistribution: permissionsData,
        sessionActivity: sessionActivityData,
        userGrowth: userGrowthData,
      },
    };
  }

  async getMailStatistics(){
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      emailsSentCount, 
      emailsCurrentMonth,
      emailsLastMonth,
    ] = await Promise.all([
      this.prismaService.mail_sent.count(),
      this.prismaService.mail_sent.count({ where: { created_at: { gte: currentMonthStart } } }),
      this.prismaService.mail_sent.count({ where: { created_at: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    ]);

    const emailsChange = this.calculateChange(emailsCurrentMonth, emailsLastMonth);
    const emailsPerWeek = await this.prismaService.$queryRaw<
      Array<{ day: Date; sent: bigint }>
    >`
      SELECT 
        DATE("created_at") as day,
        COUNT(*) as sent
      FROM "mail_sent"
      WHERE "created_at" >= ${sevenDaysAgo}
      GROUP BY DATE("created_at")
      ORDER BY day ASC
    `;

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const emailWeekData = emailsPerWeek.map((item) => {
      const dayOfWeek = new Date(item.day).getDay();
      return {
        day: weekDays[dayOfWeek],
        sent: Number(item.sent),
      };
    });

    return {
      cards: {
        emailsSent: {
          value: emailsSentCount,
          change: emailsChange,
        },
      },
      charts: {
        emailsPerWeek: emailWeekData,
      },
    };
  }

  async getSystemStatistics() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      menusCount,
      routesCount,
      menusCurrentMonth,
      menusLastMonth,
    ] = await Promise.all([
      this.prismaService.menu.count(),
      this.prismaService.route.count(),
      this.prismaService.menu.count({ where: { created_at: { gte: currentMonthStart } } }),
      this.prismaService.menu.count({ where: { created_at: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    ]);

    const menusChange = this.calculateChange(menusCurrentMonth, menusLastMonth);

    return {
      cards: {
        menus: {
          value: menusCount,
          change: menusChange,
        },
        routes: {
          value: routesCount,
          change: null,
        },
      },
    };
  }

  async getUserLayout(userId: number, slug: string, localeCode: string) {
    const dashboard = await this.prismaService.dashboard.findFirst({ where: { slug } });

    if (!dashboard) {
      return [];
    }

    const canAccess = await this.prismaService.dashboard_user.findFirst({
      where: {
        dashboard_id: dashboard.id,
        user_id: userId,
      },
      select: { id: true },
    });

    if (!canAccess) {
      return [];
    }

    await this.assertDashboardRoleAccess(dashboard.id, userId);

    const dashboardItems = await this.prismaService.dashboard_item.findMany({
      where: {
        dashboard_id: dashboard.id,
      },
      orderBy: [{ y_axis: 'asc' }, { x_axis: 'asc' }],
      include: {
        dashboard_component: {
          include: {
            dashboard_component_locale: {
              where: {
                locale: {
                  code: localeCode,
                },
              },
            },
          },
        },
      },
    });

    return dashboardItems.map((item) => {
      const component = item.dashboard_component as any;
      const locale = component.dashboard_component_locale?.[0];

      return {
        i: `widget-${item.id}`,
        component_id: item.component_id,
        slug: component.slug,
        library_slug: component.library_slug,
        name: locale?.name || component.slug,
        description: locale?.description || '',
        x: item.x_axis,
        y: item.y_axis,
        w: item.width,
        h: item.height,
        minW: component.min_width || 1,
        maxW: component.max_width || 12,
        minH: component.min_height || 1,
        maxH: component.max_height || 10,
        isResizable: component.is_resizable ?? true,
      };
    });
  }

  async saveUserLayout(
    userId: number,
    slug: string,
    layout: Array<{
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }>,
  ) {
    const dashboard = await this.prismaService.dashboard.findFirst({
      where: { slug },
    });

    if (!dashboard) {
      throw new Error(`Dashboard with slug '${slug}' not found`);
    }

    const canAccess = await this.prismaService.dashboard_user.findFirst({
      where: {
        dashboard_id: dashboard.id,
        user_id: userId,
      },
      select: { id: true },
    });

    if (!canAccess) {
      throw new ForbiddenException('Access denied to this dashboard');
    }

    await this.assertDashboardRoleAccess(dashboard.id, userId);

    const layoutUpdates = layout.flatMap((item) => {
      const itemId = Number.parseInt(item.i.replace('widget-', ''), 10);

      if (Number.isNaN(itemId)) {
        this.logger.warn(
          `Skipping dashboard layout item with invalid id: ${item.i}`,
        );
        return [];
      }

      return [
        this.prismaService.dashboard_item.updateMany({
          where: {
            id: itemId,
            dashboard_id: dashboard.id,
          },
          data: {
            x_axis: item.x,
            y_axis: item.y,
            width: item.w,
            height: item.h,
          },
        }),
      ];
    });

    if (layoutUpdates.length > 0) {
      await this.prismaService.$transaction(layoutUpdates);
    }

    return { success: true };
  }

  async addWidgetToUserDashboard(
    userId: number,
    slug: string,
    componentSlug: string,
    localeCode: string,
  ) {
    const dashboard = await this.prismaService.dashboard.findFirst({
      where: { slug },
    });

    if (!dashboard) {
      throw new Error(`Dashboard with slug '${slug}' not found`);
    }

    const canAccess = await this.prismaService.dashboard_user.findFirst({
      where: {
        dashboard_id: dashboard.id,
        user_id: userId,
      },
      select: { id: true },
    });

    if (!canAccess) {
      throw new ForbiddenException('Access denied to this dashboard');
    }

    await this.assertDashboardRoleAccess(dashboard.id, userId);

    const userRoles = await this.prismaService.role_user.findMany({
      where: { user_id: userId },
      select: { role_id: true },
    });

    const userRoleIds = userRoles.map((item) => item.role_id);

    if (userRoleIds.length === 0) {
      throw new ForbiddenException('Access denied to this component');
    }

    const slugParts = componentSlug.split('.').filter(Boolean);
    const requestedSlug =
      slugParts.length > 0 ? slugParts[slugParts.length - 1]! : componentSlug;
    const requestedLibrarySlug =
      slugParts.length > 1 ? slugParts[0] : undefined;

    const component = await this.prismaService.dashboard_component.findFirst({
      where: {
        AND: [
          requestedLibrarySlug
            ? {
                OR: [
                  { slug: componentSlug },
                  {
                    slug: requestedSlug,
                    library_slug: requestedLibrarySlug,
                  },
                ],
              }
            : {
                OR: [{ slug: componentSlug }, { slug: requestedSlug }],
              },
          {
            dashboard_component_role: {
              some: {
                role_id: {
                  in: userRoleIds,
                },
              },
            },
          },
        ],
      },
      include: {
        dashboard_component_locale: {
          where: {
            locale: {
              code: localeCode,
            },
          },
        },
      },
    });

    if (!component) {
      throw new ForbiddenException('Access denied to this component');
    }

    let dashboardItem = await this.prismaService.dashboard_item.findFirst({
      where: {
        dashboard_id: dashboard.id,
        component_id: component.id,
      },
    });

    if (!dashboardItem) {
      const dashboardItems = await this.prismaService.dashboard_item.findMany({
        where: {
          dashboard_id: dashboard.id,
        },
        select: {
          y_axis: true,
          height: true,
        },
      });

      const nextAvailableY = dashboardItems.reduce(
        (maxY, item) => Math.max(maxY, item.y_axis + item.height),
        0,
      );

      dashboardItem = await this.prismaService.dashboard_item.create({
        data: {
          dashboard_id: dashboard.id,
          component_id: component.id,
          width: component.width,
          height: component.height,
          x_axis: 0,
          y_axis: nextAvailableY,
        },
      });
    }

    const locale = (component as any).dashboard_component_locale?.[0];

    return {
      i: `widget-${dashboardItem.id}`,
      component_id: component.id,
      slug: component.slug,
      library_slug: component.library_slug,
      name: locale?.name || component.slug,
      description: locale?.description || '',
      x: dashboardItem.x_axis,
      y: dashboardItem.y_axis,
      w: dashboardItem.width,
      h: dashboardItem.height,
      minW: component.min_width || 1,
      maxW: component.max_width || 12,
      minH: component.min_height || 1,
      maxH: component.max_height || 10,
      isResizable: component.is_resizable ?? true,
    };
  }

  async removeWidgetFromUserDashboard(
    userId: number,
    slug: string,
    widgetId: string,
  ) {
    const dashboard = await this.prismaService.dashboard.findFirst({
      where: { slug },
    });

    if (!dashboard) {
      throw new Error(`Dashboard with slug '${slug}' not found`);
    }

    const canAccess = await this.prismaService.dashboard_user.findFirst({
      where: {
        dashboard_id: dashboard.id,
        user_id: userId,
      },
      select: { id: true },
    });

    if (!canAccess) {
      throw new ForbiddenException('Access denied to this dashboard');
    }

    await this.assertDashboardRoleAccess(dashboard.id, userId);

    const parsedWidgetId = Number(widgetId.replace(/^widget-/, ''));

    if (!Number.isInteger(parsedWidgetId) || parsedWidgetId <= 0) {
      throw new BadRequestException('Invalid widget id');
    }

    const dashboardItem = await this.prismaService.dashboard_item.findFirst({
      where: {
        id: parsedWidgetId,
        dashboard_id: dashboard.id,
      },
      select: { id: true },
    });

    if (!dashboardItem) {
      throw new BadRequestException('Widget not found in this dashboard');
    }

    await this.prismaService.dashboard_item.delete({
      where: { id: dashboardItem.id },
    });

    return {
      success: true,
      removedWidgetId: `widget-${dashboardItem.id}`,
    };
  }

  async checkDashboardAccess(userId: number, slug: string, locale: string) {

    const dashboard = await this.prismaService.dashboard.findFirst({
      where: { slug },
      include: {
        dashboard_locale: {
          where: {
            locale: {
              code: locale,
            },
          },
        },
      },
    });

    if (!dashboard) {
      return {
        hasAccess: false,
        dashboard: null,
      };
    }

    const dashboardUser = await this.prismaService.dashboard_user.findFirst({
      where: {
        dashboard_id: dashboard.id,
        user_id: userId,
      },
    });

    if (!dashboardUser) {
      return {
        hasAccess: false,
        accessStatus: 'not-shared',
        dashboard: null,
      };
    }

    const roleAccess = await this.getDashboardRoleAccessState(dashboard.id, userId);
    const hasAccess = roleAccess.hasRequiredRoles;

    return {
      hasAccess,
      accessStatus: roleAccess.accessStatus,
      dashboard: hasAccess
        ? {
            id: dashboard.id,
            slug: dashboard.slug,
            name: dashboard.dashboard_locale[0]?.name || dashboard.slug,
          }
        : null,
    };
  }

  async getUserDashboards(userId: number, locale: string) {
    await this.getHome(userId, locale);

    const dashboardUsers = await this.prismaService.dashboard_user.findMany({
      where: { user_id: userId },
      include: {
        dashboard: {
          include: {
            dashboard_locale: {
              where: {
                locale: {
                  code: locale,
                },
              },
            },
          },
        },
      },
      orderBy: [{ updated_at: 'asc' }, { id: 'asc' }],
    });

    const uniqueByDashboardId = new Map<number, (typeof dashboardUsers)[number]>();
    for (const dashboardUser of dashboardUsers) {
      if (!uniqueByDashboardId.has(dashboardUser.dashboard_id)) {
        uniqueByDashboardId.set(dashboardUser.dashboard_id, dashboardUser);
      }
    }

    return Array.from(uniqueByDashboardId.values()).map((dashboardUser) => ({
      id: dashboardUser.dashboard.id,
      slug: dashboardUser.dashboard.slug,
      name: this.getDashboardDisplayName(dashboardUser.dashboard),
      icon: dashboardUser.dashboard.icon,
      is_home: dashboardUser.is_home,
      dashboard_locale: dashboardUser.dashboard.dashboard_locale,
    }));
  }

  async reorderUserDashboards(userId: number, slugs: string[] | undefined, locale: string) {
    const normalizedSlugs = Array.from(
      new Set(
        (Array.isArray(slugs) ? slugs : [])
          .map((slug) => this.toNullableString(slug))
          .filter((slug): slug is string => Boolean(slug)),
      ),
    );

    if (normalizedSlugs.length === 0) {
      throw new BadRequestException(
        getLocaleText(
          'validation.fieldRequired',
          locale,
          'Dashboard order is required.',
        ),
      );
    }

    const dashboardUsers = await this.prismaService.dashboard_user.findMany({
      where: { user_id: userId },
      include: {
        dashboard: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: [{ updated_at: 'asc' }, { id: 'asc' }],
    });

    if (dashboardUsers.length === 0) {
      return { success: true };
    }

    const dashboardBySlug = new Map(
      dashboardUsers.map((dashboardUser) => [dashboardUser.dashboard.slug, dashboardUser]),
    );

    for (const slug of normalizedSlugs) {
      if (!dashboardBySlug.has(slug)) {
        throw new ForbiddenException(
          getLocaleText('dashboardNotFound', locale, 'Dashboard not found.'),
        );
      }
    }

    const normalizedSlugSet = new Set(normalizedSlugs);
    const orderedDashboardUsers = [
      ...normalizedSlugs.map((slug) => dashboardBySlug.get(slug)!),
      ...dashboardUsers.filter(
        (dashboardUser) => !normalizedSlugSet.has(dashboardUser.dashboard.slug),
      ),
    ];

    const baseTimestamp = Date.now();

    await this.prismaService.$transaction(
      orderedDashboardUsers.map((dashboardUser, index) =>
        this.prismaService.dashboard_user.update({
          where: { id: dashboardUser.id },
          data: {
            updated_at: new Date(baseTimestamp + index),
          },
        }),
      ),
    );

    return {
      success: true,
      orderedSlugs: orderedDashboardUsers.map((dashboardUser) => dashboardUser.dashboard.slug),
    };
  }

  async getAvailableTemplates(userId: number, locale: string) {
    const userRoleIds = await this.getUserRoleIds(userId);
    const templateAccessFilter =
      userRoleIds.length > 0
        ? {
            OR: [
              {
                dashboard_role: {
                  some: {
                    role_id: {
                      in: userRoleIds,
                    },
                  },
                },
              },
              {
                dashboard_role: {
                  none: {},
                },
              },
            ],
          }
        : {
            dashboard_role: {
              none: {},
            },
          };

    const templates = await this.prismaService.dashboard.findMany({
      where: {
        is_template: true,
        ...templateAccessFilter,
      },
      include: {
        dashboard_locale: {
          where: {
            locale: {
              code: locale,
            },
          },
        },
        dashboard_item: {
          select: { id: true },
        },
      },
      orderBy: [{ id: 'asc' }],
    });

    return templates.map((template) => ({
      id: template.id,
      slug: template.slug,
      name: this.getDashboardDisplayName(template),
      icon: template.icon,
      itemCount: template.dashboard_item.length,
    }));
  }

  async createUserDashboard(
    userId: number,
    data: { name?: string; slug?: string; icon?: string | null; templateSlug?: string },
    locale: string,
  ) {
    const templateSlug = this.toNullableString(data?.templateSlug);
    const template = templateSlug
      ? await this.getAccessibleTemplateOrThrow(userId, templateSlug, locale)
      : null;

    const templateName = template ? this.getDashboardDisplayName(template) : null;
    const name = this.toNullableString(data?.name) || templateName;

    if (!name) {
      throw new BadRequestException(
        getLocaleText('validation.fieldRequired', locale, 'Dashboard name is required.'),
      );
    }

    const requestedSlug = this.toNullableString(data?.slug);
    const baseSlug = this.slugifyDashboardName(requestedSlug || name);
    const slug = await this.buildUniqueDashboardSlug(baseSlug);
    const icon =
      data?.icon === undefined
        ? template?.icon ?? null
        : this.toNullableString(data?.icon) ?? template?.icon ?? null;

    const [localeRecord, existingCount] = await Promise.all([
      this.prismaService.locale.findFirst({
        where: { code: locale },
        select: { id: true },
      }),
      this.prismaService.dashboard_user.count({
        where: { user_id: userId },
      }),
    ]);

    const dashboard = await this.prismaService.dashboard.create({
      data: {
        slug,
        icon,
      },
    });

    if (localeRecord) {
      await this.prismaService.dashboard_locale.create({
        data: {
          dashboard_id: dashboard.id,
          locale_id: localeRecord.id,
          name,
        },
      });
    }

    await this.prismaService.dashboard_user.create({
      data: {
        dashboard_id: dashboard.id,
        user_id: userId,
        is_home: existingCount === 0,
      },
    });

    if (template?.dashboard_item?.length) {
      await this.prismaService.dashboard_item.createMany({
        data: template.dashboard_item.map((item) => ({
          dashboard_id: dashboard.id,
          component_id: item.component_id,
          width: item.width,
          height: item.height,
          x_axis: item.x_axis,
          y_axis: item.y_axis,
        })),
      });
    }

    return {
      id: dashboard.id,
      slug,
      name,
      icon,
      is_home: existingCount === 0,
    };
  }

  async renameUserDashboard(
    userId: number,
    slug: string,
    data: { name?: string; icon?: string | null },
    locale: string,
  ) {
    const dashboardUser = await this.getDashboardUserOrThrow(
      userId,
      slug,
      locale,
    );
    const name = this.toNullableString(data?.name);
    const normalizedIcon =
      data?.icon === undefined ? undefined : this.toNullableString(data?.icon);

    if (!name && data?.icon === undefined) {
      throw new BadRequestException(
        getLocaleText(
          'validation.fieldRequired',
          locale,
          'Dashboard name or icon is required.',
        ),
      );
    }

    if (data?.icon !== undefined) {
      await this.prismaService.dashboard.update({
        where: { id: dashboardUser.dashboard_id },
        data: {
          icon: normalizedIcon ?? null,
        },
      });
    }

    if (name) {
      const localeRecord = await this.prismaService.locale.findFirst({
        where: { code: locale },
        select: { id: true },
      });

      if (!localeRecord) {
        throw new BadRequestException(
          getLocaleText('localeNotFound', locale, 'Locale not found.'),
        );
      }

      const existingLocale = await this.prismaService.dashboard_locale.findFirst({
        where: {
          dashboard_id: dashboardUser.dashboard_id,
          locale_id: localeRecord.id,
        },
        select: { id: true },
      });

      if (existingLocale) {
        await this.prismaService.dashboard_locale.update({
          where: { id: existingLocale.id },
          data: { name },
        });
      } else {
        await this.prismaService.dashboard_locale.create({
          data: {
            dashboard_id: dashboardUser.dashboard_id,
            locale_id: localeRecord.id,
            name,
          },
        });
      }
    }

    const updatedDashboard = await this.prismaService.dashboard.findUnique({
      where: { id: dashboardUser.dashboard_id },
      include: {
        dashboard_locale: {
          where: {
            locale: {
              code: locale,
            },
          },
        },
      },
    });

    return {
      success: true,
      slug,
      name:
        name ||
        (updatedDashboard
          ? this.getDashboardDisplayName(updatedDashboard)
          : slug),
      icon: updatedDashboard?.icon ?? normalizedIcon ?? null,
    };
  }

  async setHomeDashboard(userId: number, slug: string, locale: string) {
    const dashboardUser = await this.getDashboardUserOrThrow(userId, slug, locale);

    await this.prismaService.dashboard_user.updateMany({
      where: { user_id: userId },
      data: { is_home: false },
    });

    await this.prismaService.dashboard_user.update({
      where: { id: dashboardUser.id },
      data: { is_home: true },
    });

    return {
      success: true,
      slug,
    };
  }

  async getDashboardShares(userId: number, slug: string, locale: string) {
    const dashboardUser = await this.getDashboardUserOrThrow(userId, slug, locale);
    const dashboardRoleRequirements = await this.getDashboardComponentRoleRequirements(
      dashboardUser.dashboard_id,
    );

    const sharedUsers = await this.prismaService.dashboard_user.findMany({
      where: {
        dashboard_id: dashboardUser.dashboard_id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role_user: {
              select: {
                role_id: true,
              },
            },
            user_identifier: {
              where: {
                type: 'email',
              },
              select: {
                value: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return sharedUsers.map((sharedDashboardUser) => {
      const userRoleIds = sharedDashboardUser.user.role_user.map(
        (roleUser) => roleUser.role_id,
      );
      const hasRequiredRoles = this.userHasRequiredRolesForDashboard(
        dashboardRoleRequirements,
        userRoleIds,
      );

      return {
        id: sharedDashboardUser.user.id,
        name: sharedDashboardUser.user.name,
        email: sharedDashboardUser.user.user_identifier[0]?.value ?? null,
        isCurrentUser: sharedDashboardUser.user.id === userId,
        isHome: sharedDashboardUser.is_home,
        hasRequiredRoles,
        accessStatus: hasRequiredRoles ? 'allowed' : 'missing-roles',
      };
    });
  }

  async getShareableUsers(
    userId: number,
    slug: string,
    options:
      | {
          search?: string;
          page?: string | number;
          pageSize?: string | number;
        }
      | undefined,
    locale: string,
  ) {
    const dashboardUser = await this.getDashboardUserOrThrow(userId, slug, locale);
    const normalizedSearch = this.toNullableString(options?.search);
    const requestedPage = Number.parseInt(String(options?.page ?? '1'), 10);
    const requestedPageSize = Number.parseInt(String(options?.pageSize ?? '10'), 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 50)
      : 10;

    const [existingUsers, dashboardRoleRequirements] = await Promise.all([
      this.prismaService.dashboard_user.findMany({
        where: {
          dashboard_id: dashboardUser.dashboard_id,
        },
        select: {
          user_id: true,
        },
      }),
      this.getDashboardComponentRoleRequirements(dashboardUser.dashboard_id),
    ]);

    const where: any = {
      id: {
        notIn: existingUsers.map((item) => item.user_id),
      },
      ...(normalizedSearch
        ? {
            OR: [
              {
                name: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
              {
                user_identifier: {
                  some: {
                    type: 'email',
                    value: {
                      contains: normalizedSearch,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const total = await this.prismaService.user.count({ where });
    const lastPage = total > 0 ? Math.ceil(total / pageSize) : 1;
    const safePage = Math.min(page, lastPage);

    const users = await this.prismaService.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        role_user: {
          select: {
            role_id: true,
          },
        },
        user_identifier: {
          where: {
            type: 'email',
          },
          select: {
            value: true,
          },
          take: 1,
        },
      },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return {
      data: users.map((candidateUser) => {
        const userRoleIds = candidateUser.role_user.map(
          (roleUser) => roleUser.role_id,
        );
        const hasRequiredRoles = this.userHasRequiredRolesForDashboard(
          dashboardRoleRequirements,
          userRoleIds,
        );

        return {
          id: candidateUser.id,
          name: candidateUser.name,
          email: candidateUser.user_identifier[0]?.value ?? null,
          hasRequiredRoles,
          accessStatus: hasRequiredRoles ? 'allowed' : 'missing-roles',
        };
      }),
      total,
      page: safePage,
      pageSize,
      lastPage,
      prev: safePage > 1 ? safePage - 1 : null,
      next: safePage < lastPage ? safePage + 1 : null,
    };
  }

  async shareDashboard(
    userId: number,
    slug: string,
    sharedUserIds: number[] | undefined,
    sharedUserId: number | undefined,
    locale: string,
  ) {
    const requestedIds = Array.from(
      new Set(
        [
          ...(Array.isArray(sharedUserIds) ? sharedUserIds : []),
          ...(sharedUserId !== undefined ? [sharedUserId] : []),
        ]
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    if (requestedIds.length === 0) {
      throw new BadRequestException(
        getLocaleText('validation.fieldRequired', locale, 'User is required.'),
      );
    }

    const dashboardUser = await this.getDashboardUserOrThrow(userId, slug, locale);
    const sanitizedUserIds = requestedIds.filter((candidateUserId) => candidateUserId !== userId);

    if (sanitizedUserIds.length === 0) {
      throw new BadRequestException(
        getLocaleText(
          'validation.invalidValue',
          locale,
          'You already have access to this dashboard.',
        ),
      );
    }

    const targetUsers = await this.prismaService.user.findMany({
      where: {
        id: {
          in: sanitizedUserIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (targetUsers.length !== sanitizedUserIds.length) {
      throw new BadRequestException(
        getLocaleText('userNotFound', locale, 'User not found.'),
      );
    }

    const existingShares = await this.prismaService.dashboard_user.findMany({
      where: {
        dashboard_id: dashboardUser.dashboard_id,
        user_id: {
          in: sanitizedUserIds,
        },
      },
      select: {
        user_id: true,
      },
    });

    const alreadySharedUserIds = existingShares.map((item) => item.user_id);
    const alreadySharedSet = new Set(alreadySharedUserIds);
    const newUserIds = sanitizedUserIds.filter(
      (candidateUserId) => !alreadySharedSet.has(candidateUserId),
    );

    if (newUserIds.length > 0) {
      await this.prismaService.dashboard_user.createMany({
        data: newUserIds.map((candidateUserId) => ({
          dashboard_id: dashboardUser.dashboard_id,
          user_id: candidateUserId,
          is_home: false,
        })),
      });
    }

    return {
      success: true,
      sharedCount: newUserIds.length,
      sharedUserIds: newUserIds,
      alreadySharedUserIds,
    };
  }

  async revokeDashboardShare(
    userId: number,
    slug: string,
    sharedUserId: number,
    locale: string,
  ) {
    const dashboardUser = await this.getDashboardUserOrThrow(userId, slug, locale);

    if (sharedUserId === userId) {
      throw new BadRequestException(
        getLocaleText(
          'validation.invalidValue',
          locale,
          'Use the remove dashboard action to leave this tab.',
        ),
      );
    }

    await this.prismaService.dashboard_user.deleteMany({
      where: {
        dashboard_id: dashboardUser.dashboard_id,
        user_id: sharedUserId,
      },
    });

    return {
      success: true,
    };
  }

  async removeUserDashboard(userId: number, slug: string, locale: string) {
    const dashboardUser = await this.getDashboardUserOrThrow(userId, slug, locale);

    await this.prismaService.dashboard_user.delete({
      where: { id: dashboardUser.id },
    });

    if (dashboardUser.is_home) {
      const nextDashboard = await this.prismaService.dashboard_user.findFirst({
        where: { user_id: userId },
        orderBy: { id: 'asc' },
      });

      if (nextDashboard) {
        await this.prismaService.dashboard_user.update({
          where: { id: nextDashboard.id },
          data: { is_home: true },
        });
      }
    }

    const remainingShares = await this.prismaService.dashboard_user.count({
      where: {
        dashboard_id: dashboardUser.dashboard_id,
      },
    });

    if (remainingShares === 0) {
      await this.prismaService.dashboard.delete({
        where: { id: dashboardUser.dashboard_id },
      });
    }

    return {
      success: true,
      removedSlug: slug,
    };
  }

  async getAccountSecurity(userId: number) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const latestPassword = await this.prismaService.user_credential.findFirst({
      where: { user_id: userId, type: 'password', revoked_at: null },
      orderBy: { created_at: 'desc' },
    });
    const passwordOk = latestPassword
      ? latestPassword.created_at >= ninetyDaysAgo
      : false;

    const mfaRecords = await this.prismaService.user_mfa.findMany({
      where: { user_id: userId, verified_at: { not: null }, suspended_until: null },
    });
    const mfaEnabled = mfaRecords.length > 0;
    const mfaTypes = mfaRecords.map((m) => m.type);

    const verifiedEmail = await this.prismaService.user_identifier.findFirst({
      where: {
        user_id: userId,
        type: 'email',
        verified_at: { not: null },
        enabled: true,
      },
    });
    const emailVerified = !!verifiedEmail;
    const oldSession = await this.prismaService.user_session.findFirst({
      where: {
        user_id: userId,
        revoked_at: null,
        expires_at: { gte: now },
        created_at: { lte: thirtyDaysAgo },
      },
    });
    const sessionsOk = !oldSession;
    const checks = [
      {
        id: 'password',
        labelKey: 'strongPassword',
        descriptionKey: passwordOk ? 'passwordRecentlyUpdated' : 'passwordOld',
        enabled: passwordOk,
      },
      {
        id: '2fa',
        labelKey: 'mfaEnabled',
        descriptionKey: mfaEnabled ? 'mfaActive' : 'mfaInactive',
        enabled: mfaEnabled,
        mfaTypes,
      },
      {
        id: 'email',
        labelKey: 'verifiedEmail',
        descriptionKey: emailVerified ? 'emailVerified' : 'emailNotVerified',
        enabled: emailVerified,
      },
      {
        id: 'sessions',
        labelKey: 'sessionReview',
        descriptionKey: sessionsOk ? 'noOldSessions' : 'hasOldSessions',
        enabled: sessionsOk,
      },
    ];

    const enabledCount = checks.filter((c) => c.enabled).length;
    const score = Math.round((enabledCount / checks.length) * 100);

    return { score, checks };
  }

  async getActivityTimeline(userId: number) {
    const events = await this.prismaService.user_activity.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return events.map((e) => ({
      id: e.id,
      action: e.action,
      created_at: e.created_at,
    }));
  }

  async getLoginHistory(userId: number) {
    const now = new Date();
    const days: { day: string; date: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      days.push({ day: weekDays[d.getDay()], date: d });
    }

    const result = await Promise.all(
      days.map(async ({ day, date }) => {
        const start = new Date(date);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const sessions = await this.prismaService.user_session.count({
          where: { user_id: userId, created_at: { gte: start, lte: end } },
        });

        return { day, logins: sessions, failed: 0 };
      }),
    );

    return result;
  }

  async getProfile(userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        user_identifier: {
          where: { type: 'email', enabled: true },
          orderBy: { created_at: 'asc' },
          take: 1,
        },
        role_user: {
          take: 1,
          orderBy: { role_id: 'asc' },
          include: {
            role: {
              include: {
                role_locale: {
                  take: 1,
                },
              },
            },
          },
        },
        user_session: {
          where: { revoked_at: null },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) return null;

    const email = user.user_identifier[0]?.value ?? null;
    const roleName =
      user.role_user[0]?.role?.role_locale[0]?.name ??
      user.role_user[0]?.role?.slug ??
      null;

    const [totalSessions, totalRoles] = await Promise.all([
      this.prismaService.user_session.count({
        where: { user_id: userId, revoked_at: null },
      }),
      this.prismaService.role_user.count({
        where: { user_id: userId },
      }),
    ]);

    return {
      id: user.id,
      name: user.name,
      photo_id: user.photo_id,
      email,
      role: roleName,
      memberSince: user.created_at,
      lastLogin: user.last_login_at,
      totalSessions,
      totalRoles,
    };
  }

  async getQuickStats(userId: number) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const activeSession = await this.prismaService.user_session.findFirst({
      where: {
        user_id: userId,
        revoked_at: null,
        expires_at: { gte: now },
      },
      orderBy: { created_at: 'desc' },
    });

    let onlineMinutes = 0;
    if (activeSession) {
      onlineMinutes = Math.floor(
        (now.getTime() - activeSession.created_at.getTime()) / 60000,
      );
    }
    const onlineHours = Math.floor(onlineMinutes / 60);
    const onlineRemainingMins = onlineMinutes % 60;
    const onlineTime =
      onlineHours > 0
        ? `${onlineHours}h ${onlineRemainingMins}m`
        : `${onlineRemainingMins}m`;

    const actionsToday = await this.prismaService.user_activity.count({
      where: { user_id: userId, created_at: { gte: todayStart } },
    });

    let consecutiveDays = 0;
    const checkDate = new Date(todayStart);
    for (let i = 0; i < 365; i++) {
      const start = new Date(checkDate);
      const end = new Date(checkDate);
      end.setHours(23, 59, 59, 999);
      const count = await this.prismaService.user_session.count({
        where: { user_id: userId, created_at: { gte: start, lte: end } },
      });
      if (count === 0) break;
      consecutiveDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const securityData = await this.getAccountSecurity(userId);
    const securityLevel = Math.max(1, Math.ceil(securityData.score / 20));
    return {
      onlineTime,
      actionsToday,
      consecutiveDays,
      securityLevel,
    };
  }

  async getUserRoles(userId: number, locale: string) {
    const roleUsers = await this.prismaService.role_user.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            role_locale: {
              where: { locale: { code: locale } },
            },
          },
        },
      },
    });

    return roleUsers.map((ru) => ({
      id: ru.role.id,
      slug: ru.role.slug,
      name: ru.role.role_locale[0]?.name ?? ru.role.slug,
    }));
  }

  async getEmailNotificationStats(userId: number) {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    periodStart.setDate(periodStart.getDate() - 13);

    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);

    const toDateKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    try {
      const [cardsRows, chartRows] = await Promise.all([
        this.prismaService.$queryRaw<
          Array<{ received: bigint; read: bigint; unread: bigint; error: bigint }>
        >`
          SELECT
            COUNT(*) FILTER (WHERE "status" IN ('received', 'read'))::bigint as received,
            COUNT(*) FILTER (WHERE "status" = 'read')::bigint as read,
            COUNT(*) FILTER (WHERE "status" = 'received' AND "read_at" IS NULL)::bigint as unread,
            COUNT(*) FILTER (WHERE "status" = 'error')::bigint as error
          FROM "mail_sent_user"
          WHERE "user_id" = ${userId}
            AND "created_at" >= ${periodStart}
            AND "created_at" <= ${periodEnd}
        `,
        this.prismaService.$queryRaw<Array<{ date: Date; received: bigint; read: bigint }>>`
          SELECT
            DATE("created_at") as date,
            COUNT(*) FILTER (WHERE "status" IN ('received', 'read'))::bigint as received,
            COUNT(*) FILTER (WHERE "status" = 'read')::bigint as read
          FROM "mail_sent_user"
          WHERE "user_id" = ${userId}
            AND "created_at" >= ${periodStart}
            AND "created_at" <= ${periodEnd}
          GROUP BY DATE("created_at")
          ORDER BY date ASC
        `,
      ]);

      const cards = cardsRows[0] ?? {
        received: BigInt(0),
        read: BigInt(0),
        unread: BigInt(0),
        error: BigInt(0),
      };

      const chartMap = new Map<string, { received: number; read: number }>();
      for (const row of chartRows) {
        const rowDate = new Date(row.date);
        rowDate.setHours(0, 0, 0, 0);
        const key = toDateKey(rowDate);

        chartMap.set(key, {
          received: Number(row.received),
          read: Number(row.read),
        });
      }

      const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });

      const chart: Array<{ date: string; received: number; read: number }> = [];
      for (let i = 13; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);

        const key = toDateKey(day);
        const values = chartMap.get(key) ?? { received: 0, read: 0 };

        chart.push({
          date: dateFormatter.format(day),
          received: values.received,
          read: values.read,
        });
      }

      return {
        cards: {
          received: Number(cards.received),
          read: Number(cards.read),
          unread: Number(cards.unread),
          error: Number(cards.error),
        },
        chart,
      };
    } catch (error) {
      this.logger.error('Error loading email notification stats:', error);

      const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });

      const chart: Array<{ date: string; received: number; read: number }> = [];
      for (let i = 13; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        chart.push({
          date: dateFormatter.format(day),
          received: 0,
          read: 0,
        });
      }

      return {
        cards: {
          received: 0,
          read: 0,
          unread: 0,
          error: 0,
        },
        chart,
      };
    }
  }

  async getWidgetsData(userId: number, locale: string) {
    const [accountSecurity, activityTimeline, emailNotifications, loginHistory, profile, quickStats, userRoles, userSessions] =
      await Promise.all([
        this.getAccountSecurity(userId),
        this.getActivityTimeline(userId),
        this.getEmailNotificationStats(userId),
        this.getLoginHistory(userId),
        this.getProfile(userId),
        this.getQuickStats(userId),
        this.getUserRoles(userId, locale),
        this.getUserSessions(userId),
      ]);

    return {
      accountSecurity,
      activityTimeline,
      emailNotifications,
      loginHistory,
      profile,
      quickStats,
      userRoles,
      userSessions,
    };
  }

  async getUserSessions(userId: number) {
    const now = new Date();
    const sessions = await this.prismaService.user_session.findMany({
      where: {
        user_id: userId,
        revoked_at: null,
        expires_at: { gte: now },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return sessions.map((s) => ({
      id: String(s.id),
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      created_at: s.created_at,
      expires_at: s.expires_at,
    }));
  }
}
