import {
  IntegrationProfileSheet,
  type IntegrationProfileSheetSavedProfile,
} from '@/components/integration-profile/integration-profile-sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EntityPicker } from '@/components/ui/entity-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TagsInput } from '@/components/ui/tags-input';
import { ByteSizeInput } from './byte-size-input';
import { DurationInput } from './duration-input';
import { revalidateSystemIcon } from '@/lib/revalidate-icon';
import { cn } from '@/lib/utils';
import {
  Setting,
  SettingComponentEnum,
  SettingTypeEnum,
} from '@hed-hog/api-types';
import { useApp } from '@hed-hog/next-app-provider';
import { Eye, EyeOff, Pencil, Plus, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

type SettingFieldProps = {
  setting: Setting;
  className?: string;
};

type ApiPaginated<T> = {
  data: T[];
  page: number;
  lastPage: number;
};

type IntegrationTypeOption = {
  id: number;
  slug: string;
};

type IntegrationProviderOption = {
  id: number;
  slug: string;
  type_id: number;
  integration_provider_locale?: {
    name: string;
    locale: { code: string };
  }[];
};

type IntegrationProfileOption = {
  id: number;
  slug: string;
  name: string;
  integration_provider?: {
    slug: string;
    integration_provider_locale?: {
      name: string;
      locale: { code: string };
    }[];
  };
};

function getLocalizedIntegrationName(
  locales:
    | {
        name: string;
        locale: { code: string };
      }[]
    | undefined,
  localeCode: string
) {
  if (!locales?.length) {
    return '';
  }

  return (
    locales.find((locale) => locale.locale.code === localeCode)?.name ??
    locales[0]?.name ??
    ''
  );
}

const MAIL_INTEGRATION_PROFILE_SETTING_SLUG = 'mail-integration-profile-id';
const SCALING_INFRA_PROFILE_SETTING_SLUG = 'scaling.video.integration_profile_id';
const HEDHOG_K8S_INFRA_PROFILE_SETTING_SLUG =
  'hedhog.k8s_integration_profile_id';
const COMMERCE_PAYMENT_PROFILE_SETTING_SLUG =
  'commerce-default-payment-profile-id';
const DAILY_REPORT_EMAIL_INTEGRATION_SETTING_SLUG =
  'operations.daily-report.email-integration-profile-id';
const DAILY_REPORT_WHATSAPP_INTEGRATION_SETTING_SLUG =
  'operations.daily-report.whatsapp-integration-profile-id';
const AI_PROFILE_SETTING_SLUGS = [
  'ai-gemini-profile-id',
  'ai-openai-profile-id',
  'mcp-ai-profile-id',
];
const OAUTH_PROFILE_SLUG_TO_PROVIDER: Record<string, string> = {
  'oauth-google-profile-id': 'google-oauth',
  'oauth-facebook-profile-id': 'facebook-oauth',
  'oauth-github-profile-id': 'github-oauth',
  'oauth-microsoft-profile-id': 'microsoft-oauth',
  'oauth-microsoft-entra-id-profile-id': 'microsoft-entra-id-oauth',
  'oauth-apple-profile-id': 'apple-oauth',
  'oauth-linkedin-profile-id': 'linkedin-oauth',
};
// Settings cujo valor é o SLUG de um integration_profile. O picker continua sendo
// selecionado/exibido pelo nome; apenas o valor persistido é o slug.
const ALL_INTEGRATION_PROFILE_SETTING_SLUGS = [
  MAIL_INTEGRATION_PROFILE_SETTING_SLUG,
  SCALING_INFRA_PROFILE_SETTING_SLUG,
  HEDHOG_K8S_INFRA_PROFILE_SETTING_SLUG,
  COMMERCE_PAYMENT_PROFILE_SETTING_SLUG,
  DAILY_REPORT_EMAIL_INTEGRATION_SETTING_SLUG,
  DAILY_REPORT_WHATSAPP_INTEGRATION_SETTING_SLUG,
  'file-storage-profile-id',
  'lms-bulk-upload-storage-profile-id',
  ...AI_PROFILE_SETTING_SLUGS,
  ...Object.keys(OAUTH_PROFILE_SLUG_TO_PROVIDER),
];

function toSlug(value: string) {
  return (value || 'profile')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getDailyReportIntegrationTypeSlug(settingSlug: string) {
  if (settingSlug === DAILY_REPORT_EMAIL_INTEGRATION_SETTING_SLUG) {
    return 'email';
  }

  if (settingSlug === DAILY_REPORT_WHATSAPP_INTEGRATION_SETTING_SLUG) {
    return 'whatsapp';
  }

  return null;
}

function buildIntegrationProfileConfig(
  providerSlug: string,
  values: Record<string, string>
) {
  const trim = (key: string) => String(values[key] ?? '').trim();

  if (providerSlug === 'smtp') {
    return {
      host: trim('host'),
      port: Number(trim('port') || 587),
      username: trim('username'),
      password: trim('password'),
      secure: values.secure === 'true',
      from_email: trim('from_email'),
      from_name: trim('from_name'),
      reply_to_email: trim('reply_to_email'),
    };
  }

  if (providerSlug === 'gmail') {
    return {
      client_id: trim('client_id'),
      client_secret: trim('client_secret'),
      refresh_token: trim('refresh_token'),
      from_email: trim('from_email'),
      from_name: trim('from_name'),
    };
  }

  if (providerSlug === 'ses') {
    return {
      access_key_id: trim('access_key_id'),
      secret_access_key: trim('secret_access_key'),
      region: trim('region'),
      from_email: trim('from_email'),
      from_name: trim('from_name'),
    };
  }

  return {
    host: trim('host'),
    token: trim('token'),
    instance_name: trim('instance_name'),
  };
}

export const SettingField = ({ setting, className }: SettingFieldProps) => {
  const t = useTranslations('core.Configurations');
  const {
    showToastHandler,
    setSettingValue,
    request,
    currentLocaleCode,
    getSettingValue,
  } = useApp();
  const component =
    setting.component?.replaceAll('_', '-') || SettingComponentEnum.INPUT_TEXT;
  const [localValue, setLocalValue] = useState(setting.value);
  const [storageProfileSelectedLabel, setStorageProfileSelectedLabel] =
    useState('');
  const [isStorageProfileSheetOpen, setIsStorageProfileSheetOpen] =
    useState(false);
  const [storageProfileEditingId, setStorageProfileEditingId] = useState<
    number | null
  >(null);
  // Id resolvido a partir do slug salvo (a setting guarda o slug; o botão "editar"
  // e o sheet precisam do id numérico do perfil).
  const [resolvedProfileId, setResolvedProfileId] = useState<number | null>(
    null
  );
  const [showSecretValue, setShowSecretValue] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isTextInputRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isThemeSetting = (slug: string) => {
    return slug.startsWith('theme-') || slug === 'menu-width';
  };

  const applyThemeSettings = async () => {
    try {
      const response = await request<{ setting?: Record<string, unknown> }>({
        url: '/setting/initial',
        method: 'GET',
      });

      const newSettings = response.data?.setting || {};
      localStorage.setItem('settings', JSON.stringify(newSettings));
      window.dispatchEvent(new CustomEvent('hedhog:settings-change'));
    } catch (error) {
      console.error('Error applying theme settings:', error);
    }
  };

  useEffect(() => {
    if (!isTextInputRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (localValue !== setting.value) {
        setSettingValue(setting.slug, localValue)
          .then(async () => {
            showToastHandler('success', t('settingUpdated'));

            if (['icon-url'].includes(setting.slug)) {
              await revalidateSystemIcon();
              showToastHandler('success', t('iconRevalidated'));
              window.location.reload();
            }

            if (isThemeSetting(setting.slug)) {
              await applyThemeSettings();
            }
          })
          .catch(() => {
            showToastHandler('error', t('settingUpdateFailed'));
          });
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localValue]);

  useEffect(() => {
    if (!ALL_INTEGRATION_PROFILE_SETTING_SLUGS.includes(setting.slug)) {
      setStorageProfileSelectedLabel('');
      setResolvedProfileId(null);
      return;
    }

    const profileSlug = String(localValue ?? '').trim();
    if (!profileSlug) {
      setStorageProfileSelectedLabel('');
      setResolvedProfileId(null);
      return;
    }

    let isCurrent = true;

    const qs = new URLSearchParams({ slug: profileSlug, pageSize: '1' });
    request<ApiPaginated<IntegrationProfileOption>>({
      url: `/integration-profile?${qs}`,
      method: 'GET',
    })
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        const profile = response.data?.data?.[0] ?? null;
        setStorageProfileSelectedLabel(profile?.name ?? '');
        setResolvedProfileId(profile?.id ?? null);
      })
      .catch(() => {
        if (isCurrent) {
          setStorageProfileSelectedLabel('');
          setResolvedProfileId(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [localValue, request, setting.slug]);

  const handleChangeValue = (newValue: string, immediate = false) => {
    setLocalValue(newValue);
    if (immediate) {
      setSettingValue(setting.slug, newValue)
        .then(async () => {
          showToastHandler('success', t('settingUpdated'));
          if (isThemeSetting(setting.slug)) {
            await applyThemeSettings();
          }
        })
        .catch(() => {
          showToastHandler('error', t('settingUpdateFailed'));
        });
    }
  };

  const getParsedValue = () => {
    const value = localValue;
    if (value === undefined || value === null) return value;

    switch (setting.type) {
      case SettingTypeEnum.NUMBER:
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      case SettingTypeEnum.BOOLEAN:
        return typeof value === 'boolean'
          ? value
          : value === 'true' || value === '1';
      case SettingTypeEnum.ARRAY:
      case SettingTypeEnum.JSON:
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  const formatValue = (val: unknown): string => {
    switch (setting.type) {
      case SettingTypeEnum.ARRAY:
      case SettingTypeEnum.JSON:
        return typeof val === 'string' ? val : JSON.stringify(val);
      case SettingTypeEnum.BOOLEAN:
        return val ? 'true' : 'false';
      case SettingTypeEnum.NUMBER:
        return val?.toString() || '0';
      default:
        return String(val ?? '');
    }
  };

  const parsedValue = getParsedValue();
  switch (component) {
    case SettingComponentEnum.INPUT_TEXT:
      isTextInputRef.current = true;
      return (
        <Input
          type="text"
          value={parsedValue || ''}
          onChange={(e) => handleChangeValue(formatValue(e.target.value))}
          className={cn(className, 'w-full min-w-0 bg-background md:min-w-50')}
        />
      );

    case SettingComponentEnum.INPUT_NUMBER:
      isTextInputRef.current = true;
      return (
        <Input
          type="number"
          value={parsedValue || 0}
          onChange={(e) =>
            handleChangeValue(formatValue(parseFloat(e.target.value) || 0))
          }
          className={cn(className, 'w-full min-w-0 bg-background md:min-w-50')}
        />
      );

    case SettingComponentEnum.INPUT_DURATION:
      isTextInputRef.current = true; // reaproveita o debounce de 500ms existente
      return (
        <DurationInput
          value={
            typeof parsedValue === 'number'
              ? parsedValue
              : parseFloat(parsedValue) || 0
          }
          onChange={(seconds) => handleChangeValue(formatValue(seconds))}
          persistKey={setting.slug}
          className={cn(className, 'w-full min-w-0 bg-background md:min-w-50')}
        />
      );

    case SettingComponentEnum.INPUT_BYTES:
      isTextInputRef.current = true; // reaproveita o debounce de 500ms existente
      return (
        <ByteSizeInput
          value={
            typeof parsedValue === 'number'
              ? parsedValue
              : parseFloat(parsedValue) || 0
          }
          onChange={(bytes) => handleChangeValue(formatValue(bytes))}
          persistKey={setting.slug}
          className={cn(className, 'w-full min-w-0 bg-background md:min-w-50')}
        />
      );

    case SettingComponentEnum.INPUT_SECRET:
      isTextInputRef.current = true;
      return (
        <div className="relative w-full min-w-0 md:min-w-50">
          <Input
            type={showSecretValue ? 'text' : 'password'}
            value={parsedValue || ''}
            onChange={(e) => handleChangeValue(formatValue(e.target.value))}
            className={cn(
              className,
              'w-full min-w-0 bg-background pr-10 md:min-w-50'
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => setShowSecretValue((prev) => !prev)}
            aria-label={showSecretValue ? t('hidePassword') : t('showPassword')}
          >
            {showSecretValue ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      );

    case SettingComponentEnum.INPUT_FILE:
      isTextInputRef.current = true;

      const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
      ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await request<{ id?: number | string }>({
            url: '/file',
            method: 'POST',
            data: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          const fileId = response.data?.id;

          if (!fileId) {
            throw new Error(t('fileIdNotReturned'));
          }

          const openResponse = await request<{ url?: string }>({
            url: `/file/open/${fileId}`,
            method: 'PUT',
          });

          const openUrl = openResponse?.data?.url;

          if (!openUrl) {
            throw new Error(t('temporaryOpenUrlNotReturned'));
          }

          const fileUrl =
            typeof openUrl === 'string' && openUrl.startsWith('http')
              ? openUrl
              : `${String(process.env.NEXT_PUBLIC_API_BASE_URL || '')}${openUrl}`;

          handleChangeValue(formatValue(fileUrl));
          showToastHandler('success', t('fileUploaded'));
        } catch (error) {
          showToastHandler('error', t('fileUploadFailed'));
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      return (
        <div className="flex w-full min-w-0 flex-col gap-2 md:min-w-50">
          {parsedValue && (
            <div>
              <img
                src={parsedValue || ''}
                alt={t('uploadedFileAlt')}
                className="max-w-full md:w-50"
              />
            </div>
          )}
          <div className="flex w-full min-w-0 items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id={`file-${setting.id}`}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="shrink-0"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Input
              type="text"
              value={parsedValue || ''}
              onChange={(e) => handleChangeValue(formatValue(e.target.value))}
              className="min-w-0 flex-1 bg-background"
              placeholder={t('fileUrlPlaceholder')}
              disabled={isUploading}
            />
          </div>
        </div>
      );

    case SettingComponentEnum.INPUT_TAGS: {
      const tagsValue: string[] = Array.isArray(parsedValue) ? parsedValue : [];
      return (
        <TagsInput
          value={tagsValue}
          onChange={(val) => handleChangeValue(formatValue(val), true)}
          className={cn(className, 'w-full min-w-0 bg-background md:min-w-50')}
        />
      );
    }

    case SettingComponentEnum.SWITCH:
      return (
        <Switch
          checked={parsedValue || false}
          onCheckedChange={(checked) =>
            handleChangeValue(formatValue(checked), true)
          }
          className={cn('w-8! min-w-8 max-w-8', className)}
        />
      );

    case SettingComponentEnum.CHECKBOX:
      if (setting.type === SettingTypeEnum.ARRAY) {
        const options = setting.setting_list || [];
        const selectedValues: string[] = Array.isArray(parsedValue)
          ? parsedValue
          : [];

        return (
          <div
            className={cn(
              'flex w-full min-w-0 flex-col space-y-2 md:min-w-50',
              className
            )}
          >
            {options.map((option) => {
              return (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    className="bg-background"
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      let newValues = [...selectedValues];
                      if (checked) {
                        newValues.push(option.value);
                      } else {
                        newValues = newValues.filter(
                          (val) => val !== option.value
                        );
                      }
                      handleChangeValue(formatValue(newValues), true);
                    }}
                  />
                  <Label>{option.value}</Label>
                </div>
              );
            })}
          </div>
        );
      }
      return (
        <Checkbox
          checked={parsedValue || false}
          onCheckedChange={(checked) =>
            handleChangeValue(formatValue(checked), true)
          }
          className={cn(className)}
        />
      );

    case SettingComponentEnum.COMBOBOX:
      const options = setting.setting_list || [];
      return (
        <Select
          value={parsedValue?.toString() || ''}
          onValueChange={(val) => handleChangeValue(formatValue(val), true)}
        >
          <SelectTrigger
            className={cn(
              'w-full min-w-0 bg-background md:min-w-50',
              className
            )}
          >
            <SelectValue placeholder={t('selectOption')} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case SettingComponentEnum.RADIO:
      const radioOptions = setting.setting_list || [];
      return (
        <RadioGroup
          value={parsedValue?.toString() || ''}
          onValueChange={(val) => handleChangeValue(formatValue(val), true)}
          className={cn(className, 'w-full min-w-0 md:min-w-50')}
        >
          {radioOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`radio-${option.id}`}
                className="bg-background"
              />
              <Label htmlFor={`radio-${option.id}`}>{option.value}</Label>
            </div>
          ))}
        </RadioGroup>
      );

    case SettingComponentEnum.COLOR_PICKER:
      isTextInputRef.current = true;
      return (
        <div className="flex w-full min-w-0 items-center gap-2 md:max-w-50">
          <Input
            type="color"
            value={parsedValue || '#000000'}
            onChange={(e) => handleChangeValue(formatValue(e.target.value))}
            className={cn(
              'h-10 w-10 border-none p-0 cursor-pointer',
              className
            )}
          />
          <Input
            type="text"
            value={parsedValue || '#000000'}
            onChange={(e) => handleChangeValue(formatValue(e.target.value))}
            className="flex-1 bg-background"
            placeholder="#000000"
            maxLength={7}
            minLength={7}
          />
        </div>
      );

    case SettingComponentEnum.ENTITY_PICKER:
      const dailyReportIntegrationTypeSlug = getDailyReportIntegrationTypeSlug(
        setting.slug
      );

      if (
        setting.slug === 'file-storage-profile-id' ||
        setting.slug === 'lms-bulk-upload-storage-profile-id'
      ) {
        const loadStorageTypeId = async () => {
          const typesResponse = await request<IntegrationTypeOption[]>({
            url: '/integration-profile/types',
            method: 'GET',
          });
          const types = (typesResponse.data ?? []) as IntegrationTypeOption[];
          const typeId = types.find((type) => type.slug === 'storage')?.id;

          if (!typeId) {
            throw new Error('Integration type "storage" not found.');
          }

          return typeId;
        };

        return (
          <>
            <div className="flex w-full min-w-0 items-center gap-2 md:max-w-72">
              <EntityPicker<IntegrationProfileOption & Record<string, unknown>>
                placeholder={t('selectStorageProfile')}
                emptyStateDescription={t('storageProfileEmptyState')}
                value={parsedValue || null}
                onChange={(slug, option) => {
                  setStorageProfileSelectedLabel(option?.name ?? '');
                  setResolvedProfileId(
                    option ? Number((option as { id?: number }).id) || null : null
                  );
                  handleChangeValue(slug != null ? String(slug) : '', true);
                }}
                valueType="string"
                initialSelectedLabel={storageProfileSelectedLabel}
                showCreateButton={false}
                clearable={false}
                loadOptions={async ({ page, pageSize, search }) => {
                  const typeId = await loadStorageTypeId();
                  const qs = new URLSearchParams({
                    page: String(page),
                    pageSize: String(pageSize),
                    typeId: String(typeId),
                  });
                  if (search) qs.set('search', search);
                  const response = await request<
                    ApiPaginated<
                      IntegrationProfileOption & Record<string, unknown>
                    >
                  >({
                    url: `/integration-profile?${qs}`,
                    method: 'GET',
                  });
                  const paged = response.data;
                  return {
                    items: paged?.data ?? [],
                    hasMore: (paged?.page ?? 0) < (paged?.lastPage ?? 0),
                  };
                }}
                getOptionValue={(opt) => opt.slug}
                getOptionLabel={(opt) => String(opt.name ?? '')}
                getOptionDescription={(opt) => {
                  const providerSlug = String(
                    opt.integration_provider?.slug ?? ''
                  );
                  const providerName = getLocalizedIntegrationName(
                    opt.integration_provider?.integration_provider_locale,
                    currentLocaleCode
                  );
                  return [providerName || providerSlug, opt.slug]
                    .filter(Boolean)
                    .join(' • ');
                }}
                className={cn('flex-1 min-w-0', className)}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(resolvedProfileId);
                  setIsStorageProfileSheetOpen(true);
                }}
                disabled={!resolvedProfileId}
                aria-label="Editar perfil de armazenamento"
                title="Editar perfil de armazenamento"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(null);
                  setIsStorageProfileSheetOpen(true);
                }}
                aria-label="Criar perfil de armazenamento"
                title="Criar perfil de armazenamento"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <IntegrationProfileSheet
              open={isStorageProfileSheetOpen}
              onOpenChange={(nextOpen) => {
                setIsStorageProfileSheetOpen(nextOpen);
                if (!nextOpen) {
                  setStorageProfileEditingId(null);
                }
              }}
              profileId={storageProfileEditingId}
              initialTypeSlug="storage"
              lockedTypeSlug="storage"
              onSaved={(profile: IntegrationProfileSheetSavedProfile) => {
                setStorageProfileSelectedLabel(profile.name ?? '');
                setResolvedProfileId(profile.id ?? null);
                handleChangeValue(String(profile.slug ?? ''), true);
              }}
            />
          </>
        );
      }

      if (AI_PROFILE_SETTING_SLUGS.includes(setting.slug)) {
        return (
          <>
            <div className="flex w-full min-w-0 items-center gap-2 md:max-w-72">
              <EntityPicker<IntegrationProfileOption & Record<string, unknown>>
                placeholder={t('selectAiProfile')}
                emptyStateDescription={t('aiProfileEmptyState')}
                value={parsedValue || null}
                onChange={(slug, option) => {
                  setStorageProfileSelectedLabel(option?.name ?? '');
                  setResolvedProfileId(
                    option ? Number((option as { id?: number }).id) || null : null
                  );
                  handleChangeValue(slug != null ? String(slug) : '', true);
                }}
                valueType="string"
                initialSelectedLabel={storageProfileSelectedLabel}
                showCreateButton={false}
                clearable={false}
                loadOptions={async ({ page, pageSize, search }) => {
                  const qs = new URLSearchParams({
                    page: String(page),
                    pageSize: String(pageSize),
                    typeSlug: 'ai',
                  });
                  if (search) qs.set('search', search);
                  const response = await request<
                    ApiPaginated<
                      IntegrationProfileOption & Record<string, unknown>
                    >
                  >({
                    url: `/integration-profile?${qs}`,
                    method: 'GET',
                  });
                  const paged = response.data;
                  return {
                    items: paged?.data ?? [],
                    hasMore: (paged?.page ?? 0) < (paged?.lastPage ?? 0),
                  };
                }}
                getOptionValue={(opt) => opt.slug}
                getOptionLabel={(opt) => String(opt.name ?? '')}
                getOptionDescription={(opt) => {
                  const providerSlug = String(
                    opt.integration_provider?.slug ?? ''
                  );
                  const providerName = getLocalizedIntegrationName(
                    opt.integration_provider?.integration_provider_locale,
                    currentLocaleCode
                  );
                  return [providerName || providerSlug, opt.slug]
                    .filter(Boolean)
                    .join(' • ');
                }}
                className={cn('flex-1 min-w-0', className)}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(resolvedProfileId);
                  setIsStorageProfileSheetOpen(true);
                }}
                disabled={!resolvedProfileId}
                aria-label="Editar perfil de IA"
                title="Editar perfil de IA"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(null);
                  setIsStorageProfileSheetOpen(true);
                }}
                aria-label="Criar perfil de IA"
                title="Criar perfil de IA"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <IntegrationProfileSheet
              open={isStorageProfileSheetOpen}
              onOpenChange={(nextOpen) => {
                setIsStorageProfileSheetOpen(nextOpen);
                if (!nextOpen) setStorageProfileEditingId(null);
              }}
              profileId={storageProfileEditingId}
              initialTypeSlug="ai"
              lockedTypeSlug="ai"
              onSaved={(profile: IntegrationProfileSheetSavedProfile) => {
                setStorageProfileSelectedLabel(profile.name ?? '');
                setResolvedProfileId(profile.id ?? null);
                handleChangeValue(String(profile.slug ?? ''), true);
              }}
            />
          </>
        );
      }

      const oauthProviderSlug = OAUTH_PROFILE_SLUG_TO_PROVIDER[setting.slug];
      if (oauthProviderSlug) {
        return (
          <>
            <div className="flex w-full min-w-0 items-center gap-2 md:max-w-72">
              <EntityPicker<IntegrationProfileOption & Record<string, unknown>>
                placeholder={t('selectOAuthProfile')}
                emptyStateDescription={t('oauthProfileEmptyState')}
                value={parsedValue || null}
                onChange={(slug, option) => {
                  setStorageProfileSelectedLabel(option?.name ?? '');
                  setResolvedProfileId(
                    option ? Number((option as { id?: number }).id) || null : null
                  );
                  handleChangeValue(slug != null ? String(slug) : '', true);
                }}
                valueType="string"
                initialSelectedLabel={storageProfileSelectedLabel}
                showCreateButton={false}
                clearable={false}
                loadOptions={async ({ page, pageSize, search }) => {
                  const qs = new URLSearchParams({
                    page: String(page),
                    pageSize: String(pageSize),
                    providerSlug: oauthProviderSlug,
                  });
                  if (search) qs.set('search', search);
                  const response = await request<
                    ApiPaginated<
                      IntegrationProfileOption & Record<string, unknown>
                    >
                  >({
                    url: `/integration-profile?${qs}`,
                    method: 'GET',
                  });
                  const paged = response.data;
                  return {
                    items: paged?.data ?? [],
                    hasMore: (paged?.page ?? 0) < (paged?.lastPage ?? 0),
                  };
                }}
                getOptionValue={(opt) => opt.slug}
                getOptionLabel={(opt) => String(opt.name ?? '')}
                getOptionDescription={(opt) => {
                  const providerSlug = String(
                    opt.integration_provider?.slug ?? ''
                  );
                  const providerName = getLocalizedIntegrationName(
                    opt.integration_provider?.integration_provider_locale,
                    currentLocaleCode
                  );
                  return [providerName || providerSlug, opt.slug]
                    .filter(Boolean)
                    .join(' • ');
                }}
                className={cn('flex-1 min-w-0', className)}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(resolvedProfileId);
                  setIsStorageProfileSheetOpen(true);
                }}
                disabled={!resolvedProfileId}
                aria-label="Editar perfil OAuth"
                title="Editar perfil OAuth"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(null);
                  setIsStorageProfileSheetOpen(true);
                }}
                aria-label="Criar perfil OAuth"
                title="Criar perfil OAuth"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <IntegrationProfileSheet
              open={isStorageProfileSheetOpen}
              onOpenChange={(nextOpen) => {
                setIsStorageProfileSheetOpen(nextOpen);
                if (!nextOpen) setStorageProfileEditingId(null);
              }}
              profileId={storageProfileEditingId}
              initialTypeSlug="oauth"
              lockedTypeSlug="oauth"
              onSaved={(profile: IntegrationProfileSheetSavedProfile) => {
                setStorageProfileSelectedLabel(profile.name ?? '');
                setResolvedProfileId(profile.id ?? null);
                handleChangeValue(String(profile.slug ?? ''), true);
              }}
            />
          </>
        );
      }

      if (setting.slug === COMMERCE_PAYMENT_PROFILE_SETTING_SLUG) {
        return (
          <>
            <div className="flex w-full min-w-0 items-center gap-2 md:max-w-72">
              <EntityPicker<IntegrationProfileOption & Record<string, unknown>>
                placeholder={t('selectPaymentProfile')}
                emptyStateDescription={t('paymentProfileEmptyState')}
                value={parsedValue || null}
                onChange={(slug, option) => {
                  setStorageProfileSelectedLabel(option?.name ?? '');
                  setResolvedProfileId(
                    option ? Number((option as { id?: number }).id) || null : null
                  );
                  handleChangeValue(slug != null ? String(slug) : '', true);
                }}
                valueType="string"
                initialSelectedLabel={storageProfileSelectedLabel}
                showCreateButton={false}
                clearable={false}
                loadOptions={async ({ page, pageSize, search }) => {
                  const qs = new URLSearchParams({
                    page: String(page),
                    pageSize: String(pageSize),
                    typeSlug: 'payment',
                  });
                  if (search) qs.set('search', search);
                  const response = await request<
                    ApiPaginated<
                      IntegrationProfileOption & Record<string, unknown>
                    >
                  >({
                    url: `/integration-profile?${qs}`,
                    method: 'GET',
                  });
                  const paged = response.data;
                  return {
                    items: paged?.data ?? [],
                    hasMore: (paged?.page ?? 0) < (paged?.lastPage ?? 0),
                  };
                }}
                getOptionValue={(opt) => opt.slug}
                getOptionLabel={(opt) => String(opt.name ?? '')}
                getOptionDescription={(opt) => {
                  const providerSlug = String(
                    opt.integration_provider?.slug ?? ''
                  );
                  const providerName = getLocalizedIntegrationName(
                    opt.integration_provider?.integration_provider_locale,
                    currentLocaleCode
                  );
                  return [providerName || providerSlug, opt.slug]
                    .filter(Boolean)
                    .join(' • ');
                }}
                className={cn('flex-1 min-w-0', className)}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(resolvedProfileId);
                  setIsStorageProfileSheetOpen(true);
                }}
                disabled={!resolvedProfileId}
                aria-label="Editar perfil de pagamento"
                title="Editar perfil de pagamento"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(null);
                  setIsStorageProfileSheetOpen(true);
                }}
                aria-label="Criar perfil de pagamento"
                title="Criar perfil de pagamento"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <IntegrationProfileSheet
              open={isStorageProfileSheetOpen}
              onOpenChange={(nextOpen) => {
                setIsStorageProfileSheetOpen(nextOpen);
                if (!nextOpen) setStorageProfileEditingId(null);
              }}
              profileId={storageProfileEditingId}
              initialTypeSlug="payment"
              lockedTypeSlug="payment"
              onSaved={(profile: IntegrationProfileSheetSavedProfile) => {
                setStorageProfileSelectedLabel(profile.name ?? '');
                setResolvedProfileId(profile.id ?? null);
                handleChangeValue(String(profile.slug ?? ''), true);
              }}
            />
          </>
        );
      }

      if (setting.slug === SCALING_INFRA_PROFILE_SETTING_SLUG) {
        return (
          <>
            <div className="flex w-full min-w-0 items-center gap-2 md:max-w-72">
              <EntityPicker<IntegrationProfileOption & Record<string, unknown>>
                placeholder={t('selectInfraProfile')}
                emptyStateDescription={t('infraProfileEmptyState')}
                value={parsedValue || null}
                onChange={(slug, option) => {
                  setStorageProfileSelectedLabel(option?.name ?? '');
                  setResolvedProfileId(
                    option ? Number((option as { id?: number }).id) || null : null
                  );
                  handleChangeValue(slug != null ? String(slug) : '', true);
                }}
                valueType="string"
                initialSelectedLabel={storageProfileSelectedLabel}
                showCreateButton={false}
                clearable
                loadOptions={async ({ page, pageSize, search }) => {
                  const qs = new URLSearchParams({
                    page: String(page),
                    pageSize: String(pageSize),
                    typeSlug: 'infrastructure',
                  });
                  if (search) qs.set('search', search);
                  const response = await request<
                    ApiPaginated<
                      IntegrationProfileOption & Record<string, unknown>
                    >
                  >({
                    url: `/integration-profile?${qs}`,
                    method: 'GET',
                  });
                  const paged = response.data;
                  return {
                    items: paged?.data ?? [],
                    hasMore: (paged?.page ?? 0) < (paged?.lastPage ?? 0),
                  };
                }}
                getOptionValue={(opt) => opt.slug}
                getOptionLabel={(opt) => String(opt.name ?? '')}
                getOptionDescription={(opt) => {
                  const providerSlug = String(
                    opt.integration_provider?.slug ?? ''
                  );
                  const providerName = getLocalizedIntegrationName(
                    opt.integration_provider?.integration_provider_locale,
                    currentLocaleCode
                  );
                  return [providerName || providerSlug, opt.slug]
                    .filter(Boolean)
                    .join(' • ');
                }}
                className={cn('flex-1 min-w-0', className)}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(resolvedProfileId);
                  setIsStorageProfileSheetOpen(true);
                }}
                disabled={!resolvedProfileId}
                aria-label="Editar perfil de infraestrutura"
                title="Editar perfil de infraestrutura"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(null);
                  setIsStorageProfileSheetOpen(true);
                }}
                aria-label="Criar perfil de infraestrutura"
                title="Criar perfil de infraestrutura"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <IntegrationProfileSheet
              open={isStorageProfileSheetOpen}
              onOpenChange={(nextOpen) => {
                setIsStorageProfileSheetOpen(nextOpen);
                if (!nextOpen) setStorageProfileEditingId(null);
              }}
              profileId={storageProfileEditingId}
              initialTypeSlug="infrastructure"
              lockedTypeSlug="infrastructure"
              onSaved={(profile: IntegrationProfileSheetSavedProfile) => {
                setStorageProfileSelectedLabel(profile.name ?? '');
                setResolvedProfileId(profile.id ?? null);
                handleChangeValue(String(profile.slug ?? ''), true);
              }}
            />
          </>
        );
      }

      if (setting.slug === HEDHOG_K8S_INFRA_PROFILE_SETTING_SLUG) {
        return (
          <>
            <div className="flex w-full min-w-0 items-center gap-2 md:max-w-72">
              <EntityPicker<IntegrationProfileOption & Record<string, unknown>>
                placeholder={t('selectK8sInfraProfile')}
                emptyStateDescription={t('k8sInfraProfileEmptyState')}
                value={parsedValue || null}
                onChange={(slug, option) => {
                  setStorageProfileSelectedLabel(option?.name ?? '');
                  setResolvedProfileId(
                    option ? Number((option as { id?: number }).id) || null : null
                  );
                  handleChangeValue(slug != null ? String(slug) : '', true);
                }}
                valueType="string"
                initialSelectedLabel={storageProfileSelectedLabel}
                showCreateButton={false}
                clearable
                loadOptions={async ({ page, pageSize, search }) => {
                  const qs = new URLSearchParams({
                    page: String(page),
                    pageSize: String(pageSize),
                    typeSlug: 'infrastructure',
                    providerSlug: 'kubernetes',
                  });
                  if (search) qs.set('search', search);
                  const response = await request<
                    ApiPaginated<
                      IntegrationProfileOption & Record<string, unknown>
                    >
                  >({
                    url: `/integration-profile?${qs}`,
                    method: 'GET',
                  });
                  const paged = response.data;
                  return {
                    items: paged?.data ?? [],
                    hasMore: (paged?.page ?? 0) < (paged?.lastPage ?? 0),
                  };
                }}
                getOptionValue={(opt) => opt.slug}
                getOptionLabel={(opt) => String(opt.name ?? '')}
                getOptionDescription={(opt) => opt.slug}
                className={cn('flex-1 min-w-0', className)}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(resolvedProfileId);
                  setIsStorageProfileSheetOpen(true);
                }}
                disabled={!resolvedProfileId}
                aria-label="Editar perfil Kubernetes"
                title="Editar perfil Kubernetes"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(null);
                  setIsStorageProfileSheetOpen(true);
                }}
                aria-label="Criar perfil Kubernetes"
                title="Criar perfil Kubernetes"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <IntegrationProfileSheet
              open={isStorageProfileSheetOpen}
              onOpenChange={(nextOpen) => {
                setIsStorageProfileSheetOpen(nextOpen);
                if (!nextOpen) setStorageProfileEditingId(null);
              }}
              profileId={storageProfileEditingId}
              initialTypeSlug="infrastructure"
              lockedTypeSlug="infrastructure"
              lockedProviderSlug="kubernetes"
              onSaved={(profile: IntegrationProfileSheetSavedProfile) => {
                setStorageProfileSelectedLabel(profile.name ?? '');
                setResolvedProfileId(profile.id ?? null);
                handleChangeValue(String(profile.slug ?? ''), true);
              }}
            />
          </>
        );
      }

      if (setting.slug === MAIL_INTEGRATION_PROFILE_SETTING_SLUG) {
        return (
          <>
            <div className="flex w-full min-w-0 items-center gap-2 md:max-w-72">
              <EntityPicker<IntegrationProfileOption & Record<string, unknown>>
                placeholder={t('selectMailProfile')}
                emptyStateDescription={t('mailProfileEmptyState')}
                value={parsedValue || null}
                onChange={(slug, option) => {
                  setStorageProfileSelectedLabel(option?.name ?? '');
                  setResolvedProfileId(
                    option ? Number((option as { id?: number }).id) || null : null
                  );
                  handleChangeValue(slug != null ? String(slug) : '', true);
                }}
                valueType="string"
                initialSelectedLabel={storageProfileSelectedLabel}
                showCreateButton={false}
                clearable={false}
                loadOptions={async ({ page, pageSize, search }) => {
                  const qs = new URLSearchParams({
                    page: String(page),
                    pageSize: String(pageSize),
                    typeSlug: 'email',
                  });
                  if (search) qs.set('search', search);
                  const response = await request<
                    ApiPaginated<
                      IntegrationProfileOption & Record<string, unknown>
                    >
                  >({
                    url: `/integration-profile?${qs}`,
                    method: 'GET',
                  });
                  const paged = response.data;
                  return {
                    items: paged?.data ?? [],
                    hasMore: (paged?.page ?? 0) < (paged?.lastPage ?? 0),
                  };
                }}
                getOptionValue={(opt) => opt.slug}
                getOptionLabel={(opt) => String(opt.name ?? '')}
                getOptionDescription={(opt) => {
                  const providerSlug = String(
                    opt.integration_provider?.slug ?? ''
                  );
                  const providerName = getLocalizedIntegrationName(
                    opt.integration_provider?.integration_provider_locale,
                    currentLocaleCode
                  );
                  return [providerName || providerSlug, opt.slug]
                    .filter(Boolean)
                    .join(' • ');
                }}
                className={cn('flex-1 min-w-0', className)}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(resolvedProfileId);
                  setIsStorageProfileSheetOpen(true);
                }}
                disabled={!resolvedProfileId}
                aria-label="Editar perfil de email"
                title="Editar perfil de email"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setStorageProfileEditingId(null);
                  setIsStorageProfileSheetOpen(true);
                }}
                aria-label="Criar perfil de email"
                title="Criar perfil de email"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <IntegrationProfileSheet
              open={isStorageProfileSheetOpen}
              onOpenChange={(nextOpen) => {
                setIsStorageProfileSheetOpen(nextOpen);
                if (!nextOpen) setStorageProfileEditingId(null);
              }}
              profileId={storageProfileEditingId}
              initialTypeSlug="email"
              lockedTypeSlug="email"
              onSaved={(profile: IntegrationProfileSheetSavedProfile) => {
                setStorageProfileSelectedLabel(profile.name ?? '');
                setResolvedProfileId(profile.id ?? null);
                handleChangeValue(String(profile.slug ?? ''), true);
              }}
            />
          </>
        );
      }

      if (!dailyReportIntegrationTypeSlug) {
        return (
          <Input
            type="text"
            value={parsedValue || ''}
            onChange={(e) => handleChangeValue(formatValue(e.target.value))}
            className={cn(className, 'bg-background')}
          />
        );
      }

      if (dailyReportIntegrationTypeSlug) {
        const loadIntegrationCatalog = async () => {
          const qs = new URLSearchParams({
            typeSlug: dailyReportIntegrationTypeSlug,
          });
          const providersResponse = await request<IntegrationProviderOption[]>({
            url: `/integration-profile/providers?${qs}`,
            method: 'GET',
          });

          return {
            providers: (providersResponse.data ??
              []) as IntegrationProviderOption[],
          };
        };

        return (
          <EntityPicker<IntegrationProfileOption & Record<string, unknown>>
            placeholder={
              dailyReportIntegrationTypeSlug === 'email'
                ? t('selectMailProfile')
                : t('selectWhatsAppProfile')
            }
            value={parsedValue || null}
            onChange={(slug) =>
              handleChangeValue(slug != null ? String(slug) : '', true)
            }
            valueType="string"
            loadOptions={async ({ page, pageSize, search }) => {
              const qs = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                typeSlug: dailyReportIntegrationTypeSlug,
              });
              if (search) qs.set('search', search);
              const response = await request<
                ApiPaginated<IntegrationProfileOption & Record<string, unknown>>
              >({
                url: `/integration-profile?${qs}`,
                method: 'GET',
              });
              const paged = response.data;
              return {
                items: paged?.data ?? [],
                hasMore: (paged?.page ?? 0) < (paged?.lastPage ?? 0),
              };
            }}
            getOptionValue={(opt) => opt.slug}
            getOptionLabel={(opt) => String(opt.name ?? '')}
            getOptionDescription={(opt) =>
              String(opt.integration_provider?.slug ?? opt.slug ?? '')
            }
            mapSearchToCreateValues={(search) =>
              dailyReportIntegrationTypeSlug === 'email'
                ? {
                    name: search,
                    provider: 'smtp',
                    port: '587',
                  }
                : {
                    name: search,
                    provider: 'evolution-api',
                    port: '',
                  }
            }
            showCreateButton
            onCreate={async (values) => {
              const providersCatalog = await loadIntegrationCatalog();
              const providerSlug =
                dailyReportIntegrationTypeSlug === 'email'
                  ? values.provider || 'smtp'
                  : 'evolution-api';
              const provider = providersCatalog.providers.find(
                (item) => item.slug === providerSlug
              );

              if (!provider) {
                throw new Error(
                  `Integration provider "${providerSlug}" not found.`
                );
              }

              const name = String(values.name || 'Profile').trim();
              const response = await request<
                IntegrationProfileOption & Record<string, unknown>
              >({
                url: '/integration-profile',
                method: 'POST',
                data: {
                  name,
                  slug: toSlug(name),
                  type_id: provider.type_id,
                  provider_id: provider.id,
                  config: buildIntegrationProfileConfig(providerSlug, values),
                  is_active: true,
                },
              });
              return response.data;
            }}
            renderCreateContent={({ values, setValue }) => {
              if (dailyReportIntegrationTypeSlug === 'whatsapp') {
                return (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label>{t('whatsappProfile.nameLabel')}</Label>
                      <Input
                        value={values.name || ''}
                        onChange={(e) => setValue('name', e.target.value)}
                        placeholder={t('whatsappProfile.namePlaceholder')}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('whatsappProfile.providerLabel')}</Label>
                      <Select
                        value={values.provider || 'evolution-api'}
                        onValueChange={(v) => setValue('provider', v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="evolution-api">
                            Evolution API
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t('whatsappProfile.hostLabel')}</Label>
                      <Input
                        value={values.host || ''}
                        onChange={(e) => setValue('host', e.target.value)}
                        placeholder={t('whatsappProfile.hostPlaceholder')}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('whatsappProfile.instanceNameLabel')}</Label>
                      <Input
                        value={values.instance_name || ''}
                        onChange={(e) =>
                          setValue('instance_name', e.target.value)
                        }
                        placeholder={t(
                          'whatsappProfile.instanceNamePlaceholder'
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('whatsappProfile.tokenLabel')}</Label>
                      <Input
                        type="password"
                        value={values.token || ''}
                        onChange={(e) => setValue('token', e.target.value)}
                        placeholder={t('whatsappProfile.tokenPlaceholder')}
                      />
                    </div>
                  </div>
                );
              }

              const provider = values.provider || 'smtp';
              return (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label>{t('mailProfile.nameLabel')}</Label>
                    <Input
                      value={values.name || ''}
                      onChange={(e) => setValue('name', e.target.value)}
                      placeholder={t('mailProfile.namePlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('mailProfile.providerLabel')}</Label>
                    <Select
                      value={provider}
                      onValueChange={(v) => setValue('provider', v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smtp">SMTP</SelectItem>
                        <SelectItem value="gmail">Gmail</SelectItem>
                        <SelectItem value="ses">
                          {t('mailProfile.providers.ses')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t('mailProfile.fromEmailLabel')}</Label>
                    <Input
                      type="email"
                      value={values.from_email || ''}
                      onChange={(e) => setValue('from_email', e.target.value)}
                      placeholder={t('mailProfile.fromEmailPlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('mailProfile.fromNameLabel')}</Label>
                    <Input
                      value={values.from_name || ''}
                      onChange={(e) => setValue('from_name', e.target.value)}
                      placeholder={t('mailProfile.fromNamePlaceholder')}
                    />
                  </div>
                  {provider === 'smtp' && (
                    <>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.smtpHostLabel')}</Label>
                        <Input
                          value={values.host || ''}
                          onChange={(e) => setValue('host', e.target.value)}
                          placeholder={t('mailProfile.smtpHostPlaceholder')}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.smtpPortLabel')}</Label>
                        <Input
                          type="number"
                          value={values.port || '587'}
                          onChange={(e) => setValue('port', e.target.value)}
                          placeholder={t('mailProfile.smtpPortPlaceholder')}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.smtpUsernameLabel')}</Label>
                        <Input
                          value={values.username || ''}
                          onChange={(e) => setValue('username', e.target.value)}
                          placeholder={t('mailProfile.smtpUsernamePlaceholder')}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.smtpPasswordLabel')}</Label>
                        <Input
                          type="password"
                          value={values.password || ''}
                          onChange={(e) => setValue('password', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.replyToEmailLabel')}</Label>
                        <Input
                          type="email"
                          value={values.reply_to_email || ''}
                          onChange={(e) =>
                            setValue('reply_to_email', e.target.value)
                          }
                          placeholder={t('mailProfile.replyToEmailPlaceholder')}
                        />
                      </div>
                    </>
                  )}
                  {provider === 'gmail' && (
                    <>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.clientIdLabel')}</Label>
                        <Input
                          value={values.client_id || ''}
                          onChange={(e) =>
                            setValue('client_id', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.clientSecretLabel')}</Label>
                        <Input
                          type="password"
                          value={values.client_secret || ''}
                          onChange={(e) =>
                            setValue('client_secret', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.refreshTokenLabel')}</Label>
                        <Input
                          value={values.refresh_token || ''}
                          onChange={(e) =>
                            setValue('refresh_token', e.target.value)
                          }
                        />
                      </div>
                    </>
                  )}
                  {provider === 'ses' && (
                    <>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.accessKeyIdLabel')}</Label>
                        <Input
                          value={values.access_key_id || ''}
                          onChange={(e) =>
                            setValue('access_key_id', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.secretAccessKeyLabel')}</Label>
                        <Input
                          type="password"
                          value={values.secret_access_key || ''}
                          onChange={(e) =>
                            setValue('secret_access_key', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{t('mailProfile.regionLabel')}</Label>
                        <Input
                          value={values.region || ''}
                          onChange={(e) => setValue('region', e.target.value)}
                          placeholder={t('mailProfile.regionPlaceholder')}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            }}
            className={cn(className, 'w-full min-w-0 md:min-w-50')}
          />
        );
      }

      return (
        <Input
          type="text"
          value={parsedValue || ''}
          onChange={(e) => handleChangeValue(formatValue(e.target.value))}
          className={cn(className, 'bg-background')}
        />
      );

    default:
      return (
        <Input
          type="text"
          value={parsedValue || ''}
          onChange={(e) => handleChangeValue(formatValue(e.target.value))}
          className={cn(className, 'bg-background')}
        />
      );
  }
};
