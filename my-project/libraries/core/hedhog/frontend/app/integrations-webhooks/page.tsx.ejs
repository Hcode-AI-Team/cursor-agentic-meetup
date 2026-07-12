'use client';

import { CopyButton } from '@/components/copy-button';
import {
  EmptyState,
  Page,
  PageHeader,
  PaginationFooter,
  SearchBar,
} from '@/components/entity-list';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EntityPicker } from '@/components/ui/entity-picker';
import { Input } from '@/components/ui/input';
import { KpiCardsGrid } from '@/components/ui/kpi-cards-grid';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { usePagination } from '@/hooks/use-pagination';
import { formatDate } from '@/lib/format-date';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  BookOpenText,
  ChevronRight,
  Clock3,
  Copy,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Webhook,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const RichTextEditor = dynamic(
  () =>
    import('@/components/rich-text-editor').then((mod) => ({
      default: mod.RichTextEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-56 animate-pulse rounded-md bg-muted" />
    ),
  }
);

type Status = 'active' | 'inactive';

type EventCatalog = {
  id: number;
  slug: string;
  name: string;
  module: string;
  description?: string | null;
  status: Status;
  updated_at: string;
};

type IncomingAction = {
  id: number;
  type:
    | 'email'
    | 'whatsapp_evolution'
    | 'http_request'
    | 'internal_api'
    | 'app_command';
  name: string;
  order: number;
  status: Status;
  integration_profile_id?: number | null;
  mail_id?: number | null;
  email_to?: string | null;
  email_cc?: string | null;
  email_bcc?: string | null;
  whatsapp_target_type?: 'phone' | 'group' | null;
  whatsapp_target?: string | null;
  whatsapp_template?: string | null;
  whatsapp_instance?: string | null;
  whatsapp_base_url?: string | null;
  whatsapp_token?: string | null;
  http_url?: string | null;
  http_method?: string | null;
  http_headers?: string | null;
  http_query?: string | null;
  http_body?: string | null;
  http_timeout_ms?: number | null;
  http_retry_count?: number | null;
  internal_api_path?: string | null;
  internal_api_method?: string | null;
  internal_api_query?: string | null;
  internal_api_body?: string | null;
  internal_api_token?: string | null;
  internal_api_user_id?: number | null;
  app_command_slug?: string | null;
  app_command_params?: string | null;
};

type IncomingActionForm = {
  type: IncomingAction['type'];
  name: string;
  order: number;
  status: Status;
  integration_profile_id: number | null;
  mail_id: number | null;
  email_to: string;
  email_cc: string;
  email_bcc: string;
  whatsapp_target_type: 'phone' | 'group';
  whatsapp_target: string;
  whatsapp_template: string;
  whatsapp_instance: string;
  whatsapp_base_url: string;
  whatsapp_token: string;
  http_url: string;
  http_method: string;
  http_headers: string;
  http_query: string;
  http_body: string;
  http_timeout_ms: number;
  http_retry_count: number;
  internal_api_path: string;
  internal_api_method: string;
  internal_api_query: string;
  internal_api_body: string;
  internal_api_token: string;
  internal_api_user_id: number | null;
  app_command_slug: string;
  app_command_params: string;
};

type IncomingIntegration = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  public_uuid: string;
  public_url?: string | null;
  status: Status;
  require_token: boolean;
  allowed_ips?: unknown;
  body_schema?: unknown;
  webhook_action?: IncomingAction[];
  updated_at: string;
  plainToken?: string | null;
};

type IncomingActionLog = {
  id: number;
  action_name: string;
  action_type: IncomingAction['type'];
  status: 'success' | 'failed';
  duration_ms: number;
  request_payload?: unknown;
  response_payload?: unknown;
  error_message?: string | null;
  created_at: string;
};

type IncomingCallLog = {
  id: number;
  public_uuid: string;
  status: 'success' | 'failed';
  remote_ip?: string | null;
  duration_ms: number;
  error_message?: string | null;
  payload_summary?: unknown;
  response_summary?: unknown;
  created_at: string;
  webhook_action_log?: IncomingActionLog[];
};

type EventWebhook = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  status: Status;
  priority: number;
  url: string;
  method: string;
  headers?: unknown;
  query?: unknown;
  payload?: unknown;
  timeout_ms: number;
  retry_count: number;
  event_webhook_event?: Array<{
    integration_event_catalog: EventCatalog;
  }>;
  updated_at: string;
};

type SelectOption = {
  id: number;
  slug: string;
  name?: string;
  subject?: string;
  provider?: string;
  module?: string;
};

type MailProfileProvider = 'SMTP' | 'GMAIL' | 'SES';

type MailProfileDetail = {
  id: number;
  slug: string;
  name: string;
  type_id: number;
  provider_id: number;
  config?: Record<string, unknown> | null;
  integration_provider?: {
    slug?: string | null;
  };
};

type IntegrationProvider = {
  id: number;
  slug: string;
  type_id: number;
};

const EMAIL_TYPE_SLUG = 'email';

const MAIL_PROVIDER_SLUG_BY_LABEL: Record<MailProfileProvider, string> = {
  SMTP: 'smtp',
  GMAIL: 'gmail',
  SES: 'ses',
};

const MAIL_PROVIDER_LABEL_BY_SLUG: Record<string, MailProfileProvider> = {
  smtp: 'SMTP',
  gmail: 'GMAIL',
  ses: 'SES',
};

type MailTemplateDetail = {
  id: number;
  slug: string;
  mail_id?: number;
  subject?: string;
  body?: string;
  mail_var?: Array<{ name?: string }>;
  locale?: { code: string };
};

const defaultMailProfileEditForm = {
  slug: '',
  name: '',
  provider: 'SMTP' as MailProfileProvider,
  from_name: '',
  from_email: '',
  reply_to_name: '',
  reply_to_email: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_secure: true,
  smtp_username: '',
  smtp_password: '',
  gmail_client_id: '',
  gmail_client_secret: '',
  gmail_refresh_token: '',
  ses_access_key_id: '',
  ses_secret_access_key: '',
  ses_region: '',
};

function trimString(value: unknown) {
  return String(value ?? '').trim();
}

function buildMailConfigFromForm(
  providerSlug: string,
  form: typeof defaultMailProfileEditForm
) {
  if (providerSlug === 'smtp') {
    return {
      host: trimString(form.smtp_host),
      port: Number(trimString(form.smtp_port) || 587),
      username: trimString(form.smtp_username),
      password: trimString(form.smtp_password),
      secure: Boolean(form.smtp_secure),
      from_email: trimString(form.from_email),
      from_name: trimString(form.from_name),
      reply_to_email: trimString(form.reply_to_email),
      reply_to_name: trimString(form.reply_to_name),
    };
  }

  if (providerSlug === 'gmail') {
    return {
      client_id: trimString(form.gmail_client_id),
      client_secret: trimString(form.gmail_client_secret),
      refresh_token: trimString(form.gmail_refresh_token),
      from_email: trimString(form.from_email),
      from_name: trimString(form.from_name),
      reply_to_email: trimString(form.reply_to_email),
      reply_to_name: trimString(form.reply_to_name),
    };
  }

  return {
    access_key_id: trimString(form.ses_access_key_id),
    secret_access_key: trimString(form.ses_secret_access_key),
    region: trimString(form.ses_region),
    from_email: trimString(form.from_email),
    from_name: trimString(form.from_name),
    reply_to_email: trimString(form.reply_to_email),
    reply_to_name: trimString(form.reply_to_name),
  };
}

const defaultMailTemplateEditForm = {
  slug: '',
  locale_code: 'en',
  subject: '',
  body: '',
  variables: '',
};

type PaginatedResponse<T> = {
  data: T[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
};

const statusClass = {
  active: 'border-green-500/20 bg-green-500/10 text-green-600',
  inactive: 'border-slate-500/20 bg-slate-500/10 text-slate-600',
};

const defaultCatalogForm = {
  slug: '',
  name: '',
  module: '',
  description: '',
  status: 'active' as Status,
};

const defaultIncomingForm = {
  slug: '',
  name: '',
  description: '',
  status: 'active' as Status,
  require_token: false,
  allowed_ips: '',
  body_schema: '',
};

const defaultActionForm: IncomingActionForm = {
  type: 'email' as IncomingAction['type'],
  name: '',
  order: 0,
  status: 'active' as Status,
  integration_profile_id: null,
  mail_id: null,
  email_to: '',
  email_cc: '',
  email_bcc: '',
  whatsapp_target_type: 'phone',
  whatsapp_target: '',
  whatsapp_template: '',
  whatsapp_instance: '',
  whatsapp_base_url: '',
  whatsapp_token: '',
  http_url: '',
  http_method: 'POST',
  http_headers: '',
  http_query: '',
  http_body: '',
  http_timeout_ms: 30000,
  http_retry_count: 0,
  internal_api_path: '',
  internal_api_method: 'POST',
  internal_api_query: '',
  internal_api_body: '',
  internal_api_token: '',
  internal_api_user_id: null,
  app_command_slug: '',
  app_command_params: '',
};

const defaultEventWebhookForm = {
  slug: '',
  name: '',
  description: '',
  status: 'active' as Status,
  priority: 0,
  url: '',
  method: 'POST',
  headers: '{\n  "Content-Type": "application/json"\n}',
  query: '{}',
  payload:
    '{\n  "eventName": "{{eventName}}",\n  "aggregateId": "{{aggregateId}}",\n  "sourceModule": "{{sourceModule}}"\n}',
  timeout_ms: 10000,
  retry_count: 0,
  event_ids: [] as number[],
};

function stringifyJson(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJsonText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

function parseStringArrayText(value: string) {
  try {
    const parsed = parseJsonText(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function stringifyStringArray(values: string[]) {
  const filtered = values.map((value) => value.trim()).filter(Boolean);
  return filtered.length ? JSON.stringify(filtered, null, 2) : '';
}

function stringifyTemplateVars(value?: Array<{ name?: string }>) {
  if (!Array.isArray(value) || value.length === 0) {
    return '';
  }

  return value
    .map((item) => item?.name?.trim())
    .filter((name): name is string => Boolean(name))
    .join('\n');
}

function parseTemplateVars(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

function getPublicWebhookUrl(uuid: string, publicUrl?: string | null) {
  if (publicUrl) return publicUrl;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  return `${baseUrl.replace(/\/+$/, '')}/webhook/${uuid}`;
}

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export default function IntegrationsWebhooksPage() {
  const t = useTranslations('core.IntegrationsWebhooksPage');
  const { request, currentLocaleCode, getSettingValue, locales, accessToken } =
    useApp();
  const queryClient = useQueryClient();

  const { data: generalSettings } = useQuery<{
    data: Array<{ slug: string; value: string }>;
  }>({
    queryKey: ['setting-group-general'],
    queryFn: async () => {
      const response = await request<{
        data: Array<{ slug: string; value: string }>;
      }>({ url: '/setting/group/general', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const pageSizeOptions = useMemo(() => {
    const setting = generalSettings?.data?.find(
      (s) => s.slug === 'pagination-page-sizes'
    );
    if (!setting?.value) return DEFAULT_PAGE_SIZES;
    try {
      const parsed = JSON.parse(setting.value) as string[];
      const sizes = parsed
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0)
        .sort((a, b) => a - b);
      return sizes.length > 0 ? sizes : DEFAULT_PAGE_SIZES;
    } catch {
      return DEFAULT_PAGE_SIZES;
    }
  }, [generalSettings]);

  const catalog = usePagination({
    url: '/integration-event-catalog',
    paginationOptions: { pageSizeOptions },
  });
  const incoming = usePagination({
    url: '/webhook-integration',
    paginationOptions: { pageSizeOptions },
  });
  const eventWebhooks = usePagination({
    url: '/event-webhook',
    paginationOptions: { pageSizeOptions },
  });

  const [activeTab, setActiveTab] = useState('incoming');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogEdit, setCatalogEdit] = useState<EventCatalog | null>(null);
  const [catalogForm, setCatalogForm] = useState(defaultCatalogForm);

  const [incomingOpen, setIncomingOpen] = useState(false);
  const [incomingEdit, setIncomingEdit] = useState<IncomingIntegration | null>(
    null
  );
  const [incomingForm, setIncomingForm] = useState(defaultIncomingForm);
  const [incomingSheetTab, setIncomingSheetTab] = useState('settings');
  const [oneTimeToken, setOneTimeToken] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [allowedIpDraft, setAllowedIpDraft] = useState('');
  const [incomingActions, setIncomingActions] = useState<IncomingAction[]>([]);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [actionEdit, setActionEdit] = useState<IncomingAction | null>(null);
  const [actionForm, setActionForm] =
    useState<IncomingActionForm>(defaultActionForm);
  const [mailProfileEditorOpen, setMailProfileEditorOpen] = useState(false);
  const [mailProfileEditId, setMailProfileEditId] = useState<number | null>(
    null
  );
  const [mailProfileEditForm, setMailProfileEditForm] = useState(
    defaultMailProfileEditForm
  );
  const [mailProfileIsTesting, setMailProfileIsTesting] = useState(false);
  const [mailProfileTestedSignature, setMailProfileTestedSignature] = useState<
    string | null
  >(null);
  const [mailTemplateEditorOpen, setMailTemplateEditorOpen] = useState(false);
  const [mailTemplateEditId, setMailTemplateEditId] = useState<number | null>(
    null
  );
  const [mailTemplateEditForm, setMailTemplateEditForm] = useState(
    defaultMailTemplateEditForm
  );
  const [incomingLogsPage, setIncomingLogsPage] = useState(1);
  const [incomingLogsPageSize, setIncomingLogsPageSize] = useState(12);
  const [logOrder, setLogOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedLog, setSelectedLog] = useState<IncomingCallLog | null>(null);
  const [retryTarget, setRetryTarget] = useState<IncomingCallLog | null>(null);
  const [isRetryingLog, setIsRetryingLog] = useState(false);
  const sseAbortRef = useRef<AbortController | null>(null);

  const [eventWebhookOpen, setEventWebhookOpen] = useState(false);
  const [eventWebhookEdit, setEventWebhookEdit] = useState<EventWebhook | null>(
    null
  );
  const [eventWebhookForm, setEventWebhookForm] = useState(
    defaultEventWebhookForm
  );

  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'catalog' | 'incoming' | 'eventWebhook' | 'action';
    id: number;
    parentId?: number;
    name: string;
  } | null>(null);

  const { data: eventOptions = [], refetch: refetchEventOptions } = useQuery<
    SelectOption[]
  >({
    queryKey: ['integration-event-catalog-options', currentLocaleCode],
    queryFn: async () => {
      const response = await request<SelectOption[]>({
        url: '/integration-event-catalog/options',
        method: 'GET',
      });
      return response.data || [];
    },
    placeholderData: (previous) => previous ?? [],
  });

  const { data: mailProfiles = [], refetch: refetchMailProfiles } = useQuery<
    SelectOption[]
  >({
    queryKey: ['webhook-integration-profiles', currentLocaleCode],
    queryFn: async () => {
      const response = await request<{
        data: Array<{
          id: number;
          slug: string;
          name: string;
          integration_provider?: { slug?: string | null };
        }>;
      }>({
        url: '/integration-profile?pageSize=100&typeSlug=email',
        method: 'GET',
      });
      return (response.data.data || []).map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        provider: String(item.integration_provider?.slug ?? ''),
      }));
    },
    placeholderData: (previous) => previous ?? [],
  });

  const resolveEmailProviderMeta = async (providerSlug: string) => {
    const response = await request<IntegrationProvider[]>({
      url: `/integration-profile/providers?typeSlug=${EMAIL_TYPE_SLUG}`,
      method: 'GET',
    });

    const provider = (response.data ?? []).find(
      (item) => item.slug === providerSlug
    );

    if (!provider) {
      throw new Error(`Integration provider "${providerSlug}" not found.`);
    }

    return provider;
  };

  const { data: mailTemplates = [], refetch: refetchMailTemplates } = useQuery<
    SelectOption[]
  >({
    queryKey: ['webhook-mail-templates', currentLocaleCode],
    queryFn: async () => {
      const response = await request<{ data: SelectOption[] }>({
        url: '/mail?pageSize=100',
        method: 'GET',
      });
      return response.data.data || [];
    },
    placeholderData: (previous) => previous ?? [],
  });

  const { data: appCommands = [] } = useQuery<
    Array<{
      slug: string;
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>
  >({
    queryKey: ['webhook-app-commands'],
    queryFn: async () => {
      const response = await request<
        Array<{
          slug: string;
          name: string;
          description: string;
          inputSchema: Record<string, unknown>;
        }>
      >({
        url: '/webhook-integration/app-commands',
        method: 'GET',
      });
      return response.data || [];
    },
    placeholderData: (previous) => previous ?? [],
  });

  const { data: internalRoutes = [] } = useQuery<
    Array<{
      id: number;
      url: string;
      method: string;
    }>
  >({
    queryKey: ['webhook-internal-routes'],
    queryFn: async () => {
      const response = await request<
        Array<{
          id: number;
          url: string;
          method: string;
        }>
      >({
        url: '/webhook-integration/internal-routes',
        method: 'GET',
      });
      return response.data || [];
    },
    placeholderData: (previous) => previous ?? [],
  });

  const { data: incomingLogsResult, isFetching: isFetchingIncomingLogs } =
    useQuery<PaginatedResponse<IncomingCallLog>>({
      queryKey: [
        'incoming-webhook-logs',
        incomingEdit?.id,
        incomingLogsPage,
        incomingLogsPageSize,
        logOrder,
      ],
      queryFn: async () => {
        if (!incomingEdit?.id) {
          return {
            data: [],
            totalItems: 0,
            currentPage: 1,
            pageSize: incomingLogsPageSize,
          };
        }

        const response = await request<PaginatedResponse<IncomingCallLog>>({
          url: `/webhook-integration/${incomingEdit.id}/log?page=${incomingLogsPage}&pageSize=${incomingLogsPageSize}&sort=${logOrder}`,
          method: 'GET',
        });

        return (
          response.data || {
            data: [],
            totalItems: 0,
            currentPage: 1,
            pageSize: incomingLogsPageSize,
          }
        );
      },
      placeholderData: (previous) =>
        previous || {
          data: [],
          totalItems: 0,
          currentPage: 1,
          pageSize: incomingLogsPageSize,
        },
    });

  useEffect(() => {
    if (!incomingEdit?.id || !incomingOpen || incomingSheetTab !== 'logs') {
      sseAbortRef.current?.abort();
      sseAbortRef.current = null;
      return;
    }

    const controller = new AbortController();
    sseAbortRef.current = controller;

    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
    const apiBase = rawBase.replace(/\/$/, '');
    const url = `${apiBase}/webhook-integration/${incomingEdit.id}/log/stream`;

    (async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const eventBlock of events) {
            const dataLine = eventBlock
              .split('\n')
              .find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            try {
              const payload = JSON.parse(dataLine.slice(5).trim());
              if (payload?.type === 'log') {
                queryClient.invalidateQueries({
                  queryKey: ['incoming-webhook-logs', incomingEdit.id],
                });
              }
            } catch {
              // ignore malformed frames
            }
          }
        }
      } catch {
        // connection closed or aborted — ignore
      }
    })();

    return () => {
      controller.abort();
      sseAbortRef.current = null;
    };
  }, [
    incomingEdit?.id,
    incomingOpen,
    incomingSheetTab,
    accessToken,
    queryClient,
  ]);

  const stats = useMemo(
    () => [
      {
        key: 'events',
        title: t('statsEvents'),
        value: catalog.totalItems,
        icon: BookOpenText,
        accentClassName: 'from-slate-500/20 via-slate-400/10 to-transparent',
      },
      {
        key: 'incoming',
        title: t('statsIncoming'),
        value: incoming.totalItems,
        icon: Webhook,
        accentClassName: 'from-blue-500/20 via-cyan-500/10 to-transparent',
      },
      {
        key: 'eventWebhooks',
        title: t('statsEventWebhooks'),
        value: eventWebhooks.totalItems,
        icon: Send,
        accentClassName: 'from-emerald-500/20 via-green-500/10 to-transparent',
      },
    ],
    [catalog.totalItems, incoming.totalItems, eventWebhooks.totalItems, t]
  );
  const allowedIpList = useMemo(
    () => parseStringArrayText(incomingForm.allowed_ips),
    [incomingForm.allowed_ips]
  );
  const incomingLogItems = incomingLogsResult?.data || [];
  const incomingLogsTotalItems = incomingLogsResult?.totalItems || 0;
  const actionSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const openCatalogCreate = () => {
    setCatalogEdit(null);
    setCatalogForm(defaultCatalogForm);
    setCatalogOpen(true);
  };

  const openCatalogEdit = (item: EventCatalog) => {
    setCatalogEdit(item);
    setCatalogForm({
      slug: item.slug,
      name: item.name,
      module: item.module,
      description: item.description || '',
      status: item.status,
    });
    setCatalogOpen(true);
  };

  const saveCatalog = async () => {
    try {
      if (catalogEdit) {
        await request({
          url: `/integration-event-catalog/${catalogEdit.id}`,
          method: 'PATCH',
          data: catalogForm,
        });
        toast.success(t('updated'));
      } else {
        await request({
          url: '/integration-event-catalog',
          method: 'POST',
          data: catalogForm,
        });
        toast.success(t('created'));
      }
      setCatalogOpen(false);
      await Promise.all([catalog.refetch(), refetchEventOptions()]);
    } catch {
      toast.error(t('saveError'));
    }
  };

  const openIncomingCreate = () => {
    setIncomingEdit(null);
    setIncomingSheetTab('settings');
    setIncomingLogsPage(1);
    setLogOrder('desc');
    setSelectedLog(null);
    setIncomingActions([]);
    setIncomingForm(defaultIncomingForm);
    setOneTimeToken(null);
    setAllowedIpDraft('');
    setActionEdit(null);
    setActionSheetOpen(false);
    setActionForm(defaultActionForm);
    setIncomingOpen(true);
  };

  const openIncomingEdit = async (item: IncomingIntegration) => {
    const response = await request<IncomingIntegration>({
      url: `/webhook-integration/${item.id}`,
      method: 'GET',
    });
    const data = response.data;
    setIncomingEdit(data);
    setIncomingForm({
      slug: data.slug,
      name: data.name,
      description: data.description || '',
      status: data.status,
      require_token: data.require_token,
      allowed_ips: stringifyJson(data.allowed_ips),
      body_schema: stringifyJson(data.body_schema),
    });
    if (data.plainToken) {
      setOneTimeToken(data.plainToken);
    }
    setIncomingActions(
      [...(data.webhook_action || [])].sort(
        (a, b) => a.order - b.order || a.id - b.id
      )
    );
    setAllowedIpDraft('');
    setActionEdit(null);
    setActionSheetOpen(false);
    setActionForm(defaultActionForm);
    setIncomingSheetTab('settings');
    setIncomingLogsPage(1);
    setLogOrder('desc');
    setSelectedLog(null);
    setIncomingOpen(true);
  };

  const openActionCreate = () => {
    setActionEdit(null);
    setGeneratedToken(null);
    setActionForm({
      ...defaultActionForm,
      order: incomingActions.length,
    });
    setActionSheetOpen(true);
  };

  const openActionEdit = (action: IncomingAction) => {
    setActionEdit(action);
    setGeneratedToken(null);
    setActionForm({
      type: action.type,
      name: action.name,
      order: Number(action.order || 0),
      status: action.status,
      integration_profile_id: action.integration_profile_id ?? null,
      mail_id: action.mail_id ?? null,
      email_to: action.email_to || '',
      email_cc: action.email_cc || '',
      email_bcc: action.email_bcc || '',
      whatsapp_target_type: action.whatsapp_target_type || 'phone',
      whatsapp_target: action.whatsapp_target || '',
      whatsapp_template: action.whatsapp_template || '',
      whatsapp_instance: action.whatsapp_instance || '',
      whatsapp_base_url: action.whatsapp_base_url || '',
      whatsapp_token: action.whatsapp_token || '',
      http_url: action.http_url || '',
      http_method: action.http_method || 'POST',
      http_headers: action.http_headers
        ? JSON.stringify(action.http_headers, null, 2)
        : '',
      http_query: action.http_query
        ? JSON.stringify(action.http_query, null, 2)
        : '',
      http_body: action.http_body || '',
      http_timeout_ms: action.http_timeout_ms ?? 30000,
      http_retry_count: action.http_retry_count ?? 0,
      internal_api_path: action.internal_api_path || '',
      internal_api_method: action.internal_api_method || 'POST',
      internal_api_query: action.internal_api_query
        ? JSON.stringify(action.internal_api_query, null, 2)
        : '',
      internal_api_body: action.internal_api_body
        ? JSON.stringify(action.internal_api_body, null, 2)
        : '',
      internal_api_token: action.internal_api_token || '',
      internal_api_user_id: action.internal_api_user_id ?? null,
      app_command_slug: action.app_command_slug || '',
      app_command_params: action.app_command_params
        ? JSON.stringify(action.app_command_params, null, 2)
        : '',
    });
    setActionSheetOpen(true);
  };

  const openMailProfileEditor = async (id: number) => {
    try {
      const response = await request<MailProfileDetail>({
        url: `/integration-profile/${id}`,
        method: 'GET',
      });

      const data = response.data;
      const config = (data.config as Record<string, unknown> | null) ?? {};
      const providerSlug = String(data.integration_provider?.slug ?? 'smtp');
      setMailProfileEditId(data.id);
      setMailProfileEditForm({
        slug: data.slug || '',
        name: data.name || '',
        provider: MAIL_PROVIDER_LABEL_BY_SLUG[providerSlug] || 'SMTP',
        from_name: String(config.from_name ?? ''),
        from_email: String(config.from_email ?? ''),
        reply_to_name: String(config.reply_to_name ?? ''),
        reply_to_email: String(config.reply_to_email ?? ''),
        smtp_host: String(config.host ?? ''),
        smtp_port: String(config.port ?? '587'),
        smtp_secure: Boolean(config.secure),
        smtp_username: String(config.username ?? ''),
        smtp_password: String(config.password ?? ''),
        gmail_client_id: String(config.client_id ?? ''),
        gmail_client_secret: String(config.client_secret ?? ''),
        gmail_refresh_token: String(config.refresh_token ?? ''),
        ses_access_key_id: String(config.access_key_id ?? ''),
        ses_secret_access_key: String(config.secret_access_key ?? ''),
        ses_region: String(config.region ?? ''),
      });
      setMailProfileTestedSignature(null);
      setMailProfileEditorOpen(true);
    } catch {
      toast.error(t('loadError'));
    }
  };

  const createMailProfilePayload = async () => {
    const providerSlug =
      MAIL_PROVIDER_SLUG_BY_LABEL[mailProfileEditForm.provider] ?? 'smtp';
    const provider = await resolveEmailProviderMeta(providerSlug);

    return {
      slug: trimString(mailProfileEditForm.slug),
      name: trimString(mailProfileEditForm.name),
      type_id: provider.type_id,
      provider_id: provider.id,
      config: buildMailConfigFromForm(providerSlug, mailProfileEditForm),
      is_active: true,
    };
  };

  const currentMailProfileSignature = JSON.stringify(mailProfileEditForm);
  const canSubmitMailProfile =
    mailProfileTestedSignature === currentMailProfileSignature;

  const handleTestMailProfile = async () => {
    const payload = await createMailProfilePayload();

    try {
      setMailProfileIsTesting(true);
      const { data } = await request<{ success: boolean; destination: string }>(
        {
          url: '/integration-profile/test',
          method: 'POST',
          data: payload,
        }
      );

      const fallbackFromEmail =
        payload.config && typeof payload.config === 'object'
          ? String((payload.config as Record<string, unknown>).from_email ?? '')
          : '';

      setMailProfileTestedSignature(currentMailProfileSignature);
      toast.success(
        data.destination || fallbackFromEmail
          ? `Perfil testado com sucesso para ${data.destination || fallbackFromEmail}`
          : 'Perfil testado com sucesso.'
      );
    } catch (error) {
      console.error('Error testing integration profile:', error);
      setMailProfileTestedSignature(null);
      toast.error('Erro ao testar o perfil de e-mail.');
    } finally {
      setMailProfileIsTesting(false);
    }
  };

  const saveMailProfileEditor = async () => {
    if (!mailProfileEditId) return;
    const payload = await createMailProfilePayload();

    try {
      await request({
        url: `/integration-profile/${mailProfileEditId}`,
        method: 'PATCH',
        data: payload,
      });

      await refetchMailProfiles();
      toast.success(t('updated'));
      setMailProfileTestedSignature(null);
      setMailProfileEditorOpen(false);
    } catch {
      toast.error(t('saveError'));
    }
  };

  const openMailTemplateEditor = async (id: number) => {
    const defaultLocale = locales?.[0]?.code || 'en';
    try {
      const response = await request<MailTemplateDetail>({
        url: `/mail/${id}?locale=${defaultLocale}`,
        method: 'GET',
      });

      const data = response.data;
      setMailTemplateEditId(data.mail_id || data.id);
      setMailTemplateEditForm({
        slug: data.slug || '',
        locale_code: data.locale?.code || defaultLocale,
        subject: data.subject || '',
        body: data.body || '',
        variables: stringifyTemplateVars(data.mail_var),
      });
      setMailTemplateEditorOpen(true);
    } catch {
      toast.error(t('loadError'));
    }
  };

  const loadMailTemplateLocale = async (localeCode: string) => {
    if (!mailTemplateEditId) return;

    try {
      const response = await request<MailTemplateDetail>({
        url: `/mail/${mailTemplateEditId}?locale=${localeCode}`,
        method: 'GET',
      });

      const data = response.data;
      setMailTemplateEditForm((current) => ({
        ...current,
        locale_code: localeCode,
        subject: data.subject || '',
        body: data.body || '',
        variables: stringifyTemplateVars(data.mail_var),
      }));
    } catch {
      toast.error(t('loadError'));
    }
  };

  const saveMailTemplateEditor = async () => {
    if (!mailTemplateEditId) return;

    try {
      await request({
        url: `/mail/${mailTemplateEditId}`,
        method: 'PATCH',
        data: {
          slug: mailTemplateEditForm.slug,
          mail_locale: [
            {
              locale_id:
                locales.findIndex(
                  (locale) => locale.code === mailTemplateEditForm.locale_code
                ) + 1 || 1,
              subject: mailTemplateEditForm.subject,
              body: mailTemplateEditForm.body,
            },
          ],
          mail_var: parseTemplateVars(mailTemplateEditForm.variables),
        },
      });

      await refetchMailTemplates();
      toast.success(t('updated'));
      setMailTemplateEditorOpen(false);
    } catch {
      toast.error(t('saveError'));
    }
  };

  const setAllowedIpList = (items: string[]) => {
    setIncomingForm((current) => ({
      ...current,
      allowed_ips: stringifyStringArray(items),
    }));
  };

  const addAllowedIp = () => {
    const nextIp = allowedIpDraft.trim();
    if (!nextIp) return;
    setAllowedIpList([...allowedIpList, nextIp]);
    setAllowedIpDraft('');
  };

  const updateAllowedIp = (index: number, value: string) => {
    const items = [...allowedIpList];
    items[index] = value;
    setAllowedIpList(items);
  };

  const removeAllowedIp = (index: number) => {
    setAllowedIpList(
      allowedIpList.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const saveIncoming = async () => {
    try {
      const payload = {
        ...incomingForm,
        allowed_ips: parseJsonText(incomingForm.allowed_ips),
        body_schema: parseJsonText(incomingForm.body_schema),
      };

      const response = incomingEdit
        ? await request<IncomingIntegration>({
            url: `/webhook-integration/${incomingEdit.id}`,
            method: 'PATCH',
            data: payload,
          })
        : await request<IncomingIntegration>({
            url: '/webhook-integration',
            method: 'POST',
            data: payload,
          });

      if (response.data.plainToken) {
        setOneTimeToken(response.data.plainToken);
        toast.success(t('tokenGenerated'));
      } else {
        toast.success(incomingEdit ? t('updated') : t('created'));
      }

      if (!incomingEdit) {
        await openIncomingEdit(response.data);
      }

      await incoming.refetch();
    } catch {
      toast.error(t('saveError'));
    }
  };

  const saveAction = async () => {
    if (!incomingEdit) return;

    const missingFields: string[] = [];

    if (actionForm.type === 'email') {
      if (actionForm.integration_profile_id == null)
        missingFields.push('integration_profile_id');
      if (actionForm.mail_id == null) missingFields.push('mail_id');
      if (!actionForm.email_to.trim()) missingFields.push('email_to');
    }

    if (actionForm.type === 'whatsapp_evolution') {
      if (!actionForm.whatsapp_target.trim()) {
        missingFields.push('whatsapp_target');
      }
      if (!actionForm.whatsapp_template.trim()) {
        missingFields.push('whatsapp_template');
      }
      if (!actionForm.whatsapp_instance.trim()) {
        missingFields.push('whatsapp_instance');
      }
      if (!actionForm.whatsapp_base_url.trim()) {
        missingFields.push('whatsapp_base_url');
      }
      if (!actionForm.whatsapp_token.trim()) {
        missingFields.push('whatsapp_token');
      }
    }

    if (actionForm.type === 'http_request') {
      if (!actionForm.http_url.trim()) missingFields.push('http_url');
    }

    if (actionForm.type === 'internal_api') {
      if (!actionForm.internal_api_path.trim())
        missingFields.push('internal_api_path');
      if (actionForm.internal_api_user_id == null)
        missingFields.push('internal_api_user_id');
      if (!actionForm.internal_api_token.trim())
        missingFields.push('internal_api_token');
    }

    if (actionForm.type === 'app_command') {
      if (!actionForm.app_command_slug.trim())
        missingFields.push('app_command_slug');
    }

    if (missingFields.length) {
      toast.error(
        `Preencha os campos obrigatorios da acao: ${missingFields.join(', ')}`
      );
      return;
    }

    try {
      const payload = {
        ...actionForm,
        order: Number(actionForm.order || 0),
        integration_profile_id: actionForm.integration_profile_id,
        mail_id: actionForm.mail_id,
        email_to: actionForm.email_to.trim(),
        email_cc: actionForm.email_cc.trim(),
        email_bcc: actionForm.email_bcc.trim(),
        whatsapp_target: actionForm.whatsapp_target.trim(),
        whatsapp_template: actionForm.whatsapp_template.trim(),
        whatsapp_instance: actionForm.whatsapp_instance.trim(),
        whatsapp_base_url: actionForm.whatsapp_base_url.trim(),
        whatsapp_token: actionForm.whatsapp_token.trim(),
        http_url: actionForm.http_url.trim() || undefined,
        http_method: actionForm.http_method || 'POST',
        http_headers: actionForm.http_headers.trim()
          ? (() => {
              try {
                return JSON.parse(actionForm.http_headers);
              } catch {
                return undefined;
              }
            })()
          : undefined,
        http_query: actionForm.http_query.trim()
          ? (() => {
              try {
                return JSON.parse(actionForm.http_query);
              } catch {
                return undefined;
              }
            })()
          : undefined,
        http_body: actionForm.http_body.trim() || undefined,
        http_timeout_ms: actionForm.http_timeout_ms || undefined,
        http_retry_count: actionForm.http_retry_count ?? 0,
        internal_api_path: actionForm.internal_api_path.trim() || undefined,
        internal_api_method: actionForm.internal_api_method || 'POST',
        internal_api_query: actionForm.internal_api_query.trim()
          ? (() => {
              try {
                return JSON.parse(actionForm.internal_api_query);
              } catch {
                return undefined;
              }
            })()
          : undefined,
        internal_api_body: actionForm.internal_api_body.trim()
          ? (() => {
              try {
                return JSON.parse(actionForm.internal_api_body);
              } catch {
                return undefined;
              }
            })()
          : undefined,
        internal_api_token: actionForm.internal_api_token.trim() || undefined,
        internal_api_user_id: actionForm.internal_api_user_id ?? undefined,
        app_command_slug: actionForm.app_command_slug.trim() || undefined,
        app_command_params: actionForm.app_command_params.trim()
          ? (() => {
              try {
                return JSON.parse(actionForm.app_command_params);
              } catch {
                return undefined;
              }
            })()
          : undefined,
      };

      if (actionEdit) {
        await request({
          url: `/webhook-integration/${incomingEdit.id}/action/${actionEdit.id}`,
          method: 'PATCH',
          data: payload,
        });
        toast.success(t('updated'));
      } else {
        await request({
          url: `/webhook-integration/${incomingEdit.id}/action`,
          method: 'POST',
          data: payload,
        });
        toast.success(t('created'));
      }

      setActionEdit(null);
      setActionSheetOpen(false);
      setGeneratedToken(null);
      setActionForm(defaultActionForm);
      await openIncomingEdit(incomingEdit);
      await incoming.refetch();
    } catch {
      toast.error(t('saveError'));
    }
  };

  const handleIncomingActionDragEnd = async ({
    active,
    over,
  }: DragEndEvent) => {
    if (!incomingEdit || !over || active.id === over.id) {
      return;
    }

    const current = [...incomingActions];
    const oldIndex = current.findIndex(
      (item) => String(item.id) === String(active.id)
    );
    const newIndex = current.findIndex(
      (item) => String(item.id) === String(over.id)
    );

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reordered = arrayMove(current, oldIndex, newIndex).map(
      (item, index) => ({
        ...item,
        order: index,
      })
    );

    setIncomingActions(reordered);

    try {
      await Promise.all(
        reordered.map((item, index) =>
          request({
            url: `/webhook-integration/${incomingEdit.id}/action/${item.id}`,
            method: 'PATCH',
            data: { order: index },
          })
        )
      );
      await openIncomingEdit(incomingEdit);
      await incoming.refetch();
    } catch {
      setIncomingActions(current);
      toast.error(t('saveError'));
    }
  };

  const regenerateUuid = async () => {
    if (!incomingEdit) return;
    const response = await request<IncomingIntegration>({
      url: `/webhook-integration/${incomingEdit.id}/regenerate-uuid`,
      method: 'POST',
    });
    toast.success(t('uuidRegenerated'));
    await openIncomingEdit(response.data);
    await incoming.refetch();
  };

  const retryIncomingLog = async (log: IncomingCallLog) => {
    if (!incomingEdit) return;
    setIsRetryingLog(true);
    try {
      const response = await request<{ success?: boolean }>({
        url: `/webhook-integration/${incomingEdit.id}/log/${log.id}/retry`,
        method: 'POST',
      });
      // A new call log is always created by the retry, so refresh the list.
      await queryClient.invalidateQueries({
        queryKey: ['incoming-webhook-logs', incomingEdit.id],
      });
      if (response.data?.success) {
        toast.success(t('logRetrySuccess'));
      } else {
        toast.error(t('logRetryFailedAgain'));
      }
      setSelectedLog(null);
      setRetryTarget(null);
    } catch {
      toast.error(t('logRetryError'));
    } finally {
      setIsRetryingLog(false);
    }
  };

  const regenerateToken = async () => {
    if (!incomingEdit) return;
    const response = await request<IncomingIntegration>({
      url: `/webhook-integration/${incomingEdit.id}/regenerate-token`,
      method: 'POST',
    });
    toast.success(
      response.data.plainToken ? t('tokenGenerated') : t('tokenGenerated')
    );
    setOneTimeToken(response.data.plainToken || null);
    await openIncomingEdit(response.data);
    await incoming.refetch();
  };

  const duplicateIncoming = async (item: IncomingIntegration) => {
    const response = await request<IncomingIntegration>({
      url: `/webhook-integration/${item.id}/duplicate`,
      method: 'POST',
    });
    toast.success(t('duplicated'));
    await incoming.refetch();
    await openIncomingEdit(response.data);
  };

  const openEventWebhookCreate = () => {
    setEventWebhookEdit(null);
    setEventWebhookForm(defaultEventWebhookForm);
    setEventWebhookOpen(true);
  };

  const openEventWebhookEdit = async (item: EventWebhook) => {
    const response = await request<EventWebhook>({
      url: `/event-webhook/${item.id}`,
      method: 'GET',
    });
    const data = response.data;
    setEventWebhookEdit(data);
    setEventWebhookForm({
      slug: data.slug,
      name: data.name,
      description: data.description || '',
      status: data.status,
      priority: data.priority || 0,
      url: data.url,
      method: data.method || 'POST',
      headers: stringifyJson(data.headers) || '{}',
      query: stringifyJson(data.query) || '{}',
      payload: stringifyJson(data.payload) || '{}',
      timeout_ms: data.timeout_ms || 10000,
      retry_count: data.retry_count || 0,
      event_ids:
        data.event_webhook_event?.map(
          (row) => row.integration_event_catalog.id
        ) || [],
    });
    setEventWebhookOpen(true);
  };

  const duplicateEventWebhook = async (item: EventWebhook) => {
    const response = await request<EventWebhook>({
      url: `/event-webhook/${item.id}/duplicate`,
      method: 'POST',
    });
    toast.success(t('duplicated'));
    await eventWebhooks.refetch();
    await openEventWebhookEdit(response.data);
  };

  const saveEventWebhook = async () => {
    try {
      const payload = {
        ...eventWebhookForm,
        headers: parseJsonText(eventWebhookForm.headers),
        query: parseJsonText(eventWebhookForm.query),
        payload: parseJsonText(eventWebhookForm.payload),
      };

      if (eventWebhookEdit) {
        await request({
          url: `/event-webhook/${eventWebhookEdit.id}`,
          method: 'PATCH',
          data: payload,
        });
        toast.success(t('updated'));
      } else {
        await request({
          url: '/event-webhook',
          method: 'POST',
          data: payload,
        });
        toast.success(t('created'));
      }
      setEventWebhookOpen(false);
      await eventWebhooks.refetch();
    } catch {
      toast.error(t('saveError'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.kind === 'catalog') {
        await request({
          url: '/integration-event-catalog',
          method: 'DELETE',
          data: { ids: [deleteTarget.id] },
        });
        await Promise.all([catalog.refetch(), refetchEventOptions()]);
      }
      if (deleteTarget.kind === 'incoming') {
        await request({
          url: '/webhook-integration',
          method: 'DELETE',
          data: { ids: [deleteTarget.id] },
        });
        await incoming.refetch();
      }
      if (deleteTarget.kind === 'eventWebhook') {
        await request({
          url: '/event-webhook',
          method: 'DELETE',
          data: { ids: [deleteTarget.id] },
        });
        await eventWebhooks.refetch();
      }
      if (deleteTarget.kind === 'action' && deleteTarget.parentId) {
        await request({
          url: `/webhook-integration/${deleteTarget.parentId}/action`,
          method: 'DELETE',
          data: { ids: [deleteTarget.id] },
        });
        if (incomingEdit) {
          await openIncomingEdit(incomingEdit);
        }
        await incoming.refetch();
      }
      toast.success(t('deleted'));
      setDeleteTarget(null);
    } catch {
      toast.error(t('deleteError'));
    }
  };

  const renderStatus = (status: Status) => (
    <Badge variant="outline" className={statusClass[status]}>
      {t(status)}
    </Badge>
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: t('breadcrumbHome'), href: '/' },
          { label: t('breadcrumbManagement'), href: '/core/management' },
          { label: t('title') },
        ]}
        title={t('title')}
        description={t('description')}
        actions={[
          activeTab === 'catalog'
            ? {
                label: t('newEvent'),
                icon: <Plus className="h-4 w-4" />,
                onClick: openCatalogCreate,
              }
            : activeTab === 'incoming'
              ? {
                  label: t('newIncoming'),
                  icon: <Plus className="h-4 w-4" />,
                  onClick: openIncomingCreate,
                }
              : {
                  label: t('newEventWebhook'),
                  icon: <Plus className="h-4 w-4" />,
                  onClick: openEventWebhookCreate,
                },
        ]}
      />

      <KpiCardsGrid items={stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="incoming">
            <Webhook className="h-4 w-4" />
            {t('tabIncoming')}
          </TabsTrigger>
          <TabsTrigger value="eventWebhooks">
            <Send className="h-4 w-4" />
            {t('tabEventWebhooks')}
          </TabsTrigger>
          <TabsTrigger value="catalog">
            <BookOpenText className="h-4 w-4" />
            {t('tabCatalog')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <SearchBar
            searchQuery={catalog.search}
            onSearchChange={(value) => {
              catalog.setSearch(value);
              catalog.setPage(1);
            }}
            onSearch={() => catalog.setPage(1)}
            placeholder={t('searchEvents')}
          />

          {catalog.items.length === 0 ? (
            <EmptyState
              icon={<BookOpenText className="h-12 w-12" />}
              title={t('emptyEvents')}
              description={t('emptyEventsDescription')}
              actionLabel={t('newEvent')}
              onAction={openCatalogCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('eventName')}</TableHead>
                    <TableHead>{t('module')}</TableHead>
                    <TableHead>{t('descriptionColumn')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('updatedAt')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(catalog.items as EventCatalog[]).map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onDoubleClick={() => openCatalogEdit(item)}
                    >
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {item.slug}
                        </div>
                      </TableCell>
                      <TableCell>{item.module}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {item.description || '-'}
                      </TableCell>
                      <TableCell>{renderStatus(item.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(
                          item.updated_at,
                          getSettingValue,
                          currentLocaleCode
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openCatalogEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'catalog',
                              id: item.id,
                              name: item.name,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <PaginationFooter
            currentPage={catalog.page}
            pageSize={catalog.pageSize}
            totalItems={catalog.totalItems}
            onPageChange={catalog.setPage}
            onPageSizeChange={(size) => {
              catalog.setPageSize(size);
              catalog.setPage(1);
            }}
          />
        </TabsContent>

        <TabsContent value="incoming" className="space-y-4">
          <SearchBar
            searchQuery={incoming.search}
            onSearchChange={(value) => {
              incoming.setSearch(value);
              incoming.setPage(1);
            }}
            onSearch={() => incoming.setPage(1)}
            placeholder={t('searchIncoming')}
          />

          {incoming.items.length === 0 ? (
            <EmptyState
              icon={<Webhook className="h-12 w-12" />}
              title={t('emptyIncoming')}
              description={t('emptyIncomingDescription')}
              actionLabel={t('newIncoming')}
              onAction={openIncomingCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('publicUrl')}</TableHead>
                    <TableHead>{t('security')}</TableHead>
                    <TableHead>{t('actionsCount')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(incoming.items as IncomingIntegration[]).map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onDoubleClick={() => openIncomingEdit(item)}
                    >
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {item.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-md items-center gap-2">
                          <span className="truncate font-mono text-xs">
                            {getPublicWebhookUrl(
                              item.public_uuid,
                              item.public_url
                            )}
                          </span>
                          <CopyButton
                            value={getPublicWebhookUrl(
                              item.public_uuid,
                              item.public_url
                            )}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.require_token ? (
                          <Badge variant="secondary">{t('token')}</Badge>
                        ) : (
                          <Badge variant="outline">{t('uuid')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.webhook_action?.length || 0}</TableCell>
                      <TableCell>{renderStatus(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openIncomingEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateIncoming(item)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'incoming',
                              id: item.id,
                              name: item.name,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <PaginationFooter
            currentPage={incoming.page}
            pageSize={incoming.pageSize}
            totalItems={incoming.totalItems}
            onPageChange={incoming.setPage}
            onPageSizeChange={(size) => {
              incoming.setPageSize(size);
              incoming.setPage(1);
            }}
          />
        </TabsContent>

        <TabsContent value="eventWebhooks" className="space-y-4">
          <SearchBar
            searchQuery={eventWebhooks.search}
            onSearchChange={(value) => {
              eventWebhooks.setSearch(value);
              eventWebhooks.setPage(1);
            }}
            onSearch={() => eventWebhooks.setPage(1)}
            placeholder={t('searchEventWebhooks')}
          />

          {eventWebhooks.items.length === 0 ? (
            <EmptyState
              icon={<Send className="h-12 w-12" />}
              title={t('emptyEventWebhooks')}
              description={t('emptyEventWebhooksDescription')}
              actionLabel={t('newEventWebhook')}
              onAction={openEventWebhookCreate}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('events')}</TableHead>
                    <TableHead>{t('httpTarget')}</TableHead>
                    <TableHead>{t('retry')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(eventWebhooks.items as EventWebhook[]).map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onDoubleClick={() => openEventWebhookEdit(item)}
                    >
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {item.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.event_webhook_event?.map((row) => (
                            <Badge
                              key={row.integration_event_catalog.id}
                              variant="secondary"
                              className="font-mono text-xs"
                            >
                              {row.integration_event_catalog.slug}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.method}</Badge>
                          <span className="max-w-md truncate font-mono text-xs">
                            {item.url}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{item.retry_count}</TableCell>
                      <TableCell>{renderStatus(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEventWebhookEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateEventWebhook(item)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'eventWebhook',
                              id: item.id,
                              name: item.name,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <PaginationFooter
            currentPage={eventWebhooks.page}
            pageSize={eventWebhooks.pageSize}
            totalItems={eventWebhooks.totalItems}
            onPageChange={eventWebhooks.setPage}
            onPageSizeChange={(size) => {
              eventWebhooks.setPageSize(size);
              eventWebhooks.setPage(1);
            }}
          />
        </TabsContent>
      </Tabs>

      <Sheet open={catalogOpen} onOpenChange={setCatalogOpen}>
        <ResizableSheetContent
          sheetId="webhooks-catalog-form"
          defaultWidth={672}
        >
          <SheetHeader>
            <SheetTitle>
              {catalogEdit ? t('editEvent') : t('newEvent')}
            </SheetTitle>
            <SheetDescription>{t('eventFormDescription')}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-8 sm:px-4">
            <Field label={t('eventName')}>
              <Input
                value={catalogForm.name}
                onChange={(event) =>
                  setCatalogForm({ ...catalogForm, name: event.target.value })
                }
              />
            </Field>
            <Field label={t('technicalName')}>
              <Input
                value={catalogForm.slug}
                onChange={(event) =>
                  setCatalogForm({ ...catalogForm, slug: event.target.value })
                }
                placeholder="module.entity.changed"
              />
            </Field>
            <Field label={t('module')}>
              <Input
                value={catalogForm.module}
                onChange={(event) =>
                  setCatalogForm({ ...catalogForm, module: event.target.value })
                }
              />
            </Field>
            <Field label={t('descriptionColumn')}>
              <Textarea
                value={catalogForm.description}
                onChange={(event) =>
                  setCatalogForm({
                    ...catalogForm,
                    description: event.target.value,
                  })
                }
              />
            </Field>
            <StatusSelect
              value={catalogForm.status}
              onValueChange={(status) =>
                setCatalogForm({ ...catalogForm, status })
              }
              t={t}
            />
            <SheetActions
              onSave={saveCatalog}
              onCancel={() => setCatalogOpen(false)}
              t={t}
            />
          </div>
        </ResizableSheetContent>
      </Sheet>

      <Sheet
        open={incomingOpen}
        onOpenChange={(open) => {
          setIncomingOpen(open);
          if (!open) {
            setOneTimeToken(null);
            setIncomingSheetTab('settings');
            setIncomingLogsPage(1);
            setLogOrder('desc');
            setSelectedLog(null);
            setActionEdit(null);
            setActionSheetOpen(false);
          }
        }}
      >
        <ResizableSheetContent
          sheetId="webhooks-incoming-form"
          defaultWidth={1024}
        >
          <SheetHeader>
            <SheetTitle>
              {incomingEdit ? t('editIncoming') : t('newIncoming')}
            </SheetTitle>
            <SheetDescription>{t('incomingFormDescription')}</SheetDescription>
          </SheetHeader>
          <Tabs
            value={incomingSheetTab}
            onValueChange={setIncomingSheetTab}
            className="mt-4 flex min-h-0 flex-1 flex-col"
          >
            <div className="px-3 sm:px-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="settings">
                  <Webhook className="mr-2 h-4 w-4" />
                  {t('incomingSheetTabSettings')}
                </TabsTrigger>
                <TabsTrigger value="logs" disabled={!incomingEdit}>
                  <Clock3 className="mr-2 h-4 w-4" />
                  {t('incomingSheetTabLogs')}
                </TabsTrigger>
                <TabsTrigger value="actions" disabled={!incomingEdit}>
                  <Activity className="mr-2 h-4 w-4" />
                  {t('actionSection')}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="settings"
              className="mt-0 min-h-0 flex-1 overflow-y-auto"
            >
              <div className="space-y-6 px-3 pb-8 sm:px-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t('name')}>
                    <Input
                      value={incomingForm.name}
                      onChange={(event) =>
                        setIncomingForm({
                          ...incomingForm,
                          name: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label={t('technicalName')}>
                    <Input
                      value={incomingForm.slug}
                      onChange={(event) =>
                        setIncomingForm({
                          ...incomingForm,
                          slug: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label={t('descriptionColumn')}>
                  <Textarea
                    value={incomingForm.description}
                    onChange={(event) =>
                      setIncomingForm({
                        ...incomingForm,
                        description: event.target.value,
                      })
                    }
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatusSelect
                    value={incomingForm.status}
                    onValueChange={(status) =>
                      setIncomingForm({ ...incomingForm, status })
                    }
                    t={t}
                  />
                  <div className="flex items-center justify-between rounded-md border px-4 py-3 md:col-span-2">
                    <div>
                      <p className="text-sm font-medium">{t('requireToken')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('requireTokenHelp')}
                      </p>
                    </div>
                    <Switch
                      checked={incomingForm.require_token}
                      onCheckedChange={(checked) =>
                        setIncomingForm({
                          ...incomingForm,
                          require_token: checked,
                        })
                      }
                    />
                  </div>
                </div>
                {oneTimeToken ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <Label>{t('oneTimeTokenTitle')}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t('oneTimeTokenDescription')}
                        </p>
                        <div className="mt-2 flex min-w-0 items-center gap-2 rounded-md border bg-background px-3 py-2">
                          <code className="min-w-0 flex-1 truncate text-xs">
                            {oneTimeToken}
                          </code>
                          <CopyButton
                            value={oneTimeToken}
                            className="h-7 w-7"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : incomingForm.require_token ? (
                  <div className="rounded-md border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Label>{t('tokenConfiguredTitle')}</Label>
                        <p className="text-xs text-muted-foreground">
                          {incomingEdit
                            ? t('tokenConfiguredDescription')
                            : t('tokenWillBeCreatedDescription')}
                        </p>
                      </div>
                      {incomingEdit ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={regenerateToken}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {t('regenerateToken')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t('allowedIps')}>
                    <div className="space-y-3">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('ipAddress')}</TableHead>
                              <TableHead className="w-18 text-right">
                                {t('actions')}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allowedIpList.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={2}
                                  className="h-16 text-center text-sm text-muted-foreground"
                                >
                                  {t('emptyAllowedIps')}
                                </TableCell>
                              </TableRow>
                            ) : (
                              allowedIpList.map((ip, index) => (
                                <TableRow key={`${ip}-${index}`}>
                                  <TableCell>
                                    <Input
                                      value={ip}
                                      onChange={(event) =>
                                        updateAllowedIp(
                                          index,
                                          event.target.value
                                        )
                                      }
                                      placeholder="127.0.0.1"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeAllowedIp(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={allowedIpDraft}
                          onChange={(event) =>
                            setAllowedIpDraft(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addAllowedIp();
                            }
                          }}
                          placeholder="127.0.0.1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addAllowedIp}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {t('addIp')}
                        </Button>
                      </div>
                    </div>
                  </Field>
                  <Field label={t('bodySchema')}>
                    <Textarea
                      value={incomingForm.body_schema}
                      onChange={(event) =>
                        setIncomingForm({
                          ...incomingForm,
                          body_schema: event.target.value,
                        })
                      }
                      placeholder='{"type":"object"}'
                    />
                  </Field>
                </div>
                {incomingEdit && (
                  <div className="rounded-md border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Label>{t('publicUrl')}</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="truncate font-mono text-xs">
                            {getPublicWebhookUrl(
                              incomingEdit.public_uuid,
                              incomingEdit.public_url
                            )}
                          </span>
                          <CopyButton
                            value={getPublicWebhookUrl(
                              incomingEdit.public_uuid,
                              incomingEdit.public_url
                            )}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={regenerateUuid}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {t('regenerateUuid')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <SheetActions
                  onSave={saveIncoming}
                  onCancel={() => setIncomingOpen(false)}
                  t={t}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="actions"
              className="mt-0 min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-8 sm:px-4"
            >
              {!incomingEdit ? (
                <EmptyState
                  icon={<Activity className="h-12 w-12" />}
                  title={t('actionSection')}
                  description={t('emptyIncomingDescription')}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {t('actionsCount')}: {incomingActions.length}
                    </p>
                    <Button onClick={openActionCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('addAction')}
                    </Button>
                  </div>

                  <div className="rounded-md border">
                    <DndContext
                      sensors={actionSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleIncomingActionDragEnd}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8" />
                            <TableHead>{t('name')}</TableHead>
                            <TableHead>{t('actionType')}</TableHead>
                            <TableHead>{t('order')}</TableHead>
                            <TableHead className="text-right">
                              {t('actions')}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <SortableContext
                          items={incomingActions.map((action) => action.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <TableBody>
                            {incomingActions.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="h-16 text-center text-sm text-muted-foreground"
                                >
                                  {t('emptyIncomingDescription')}
                                </TableCell>
                              </TableRow>
                            ) : (
                              incomingActions.map((action) => (
                                <SortableIncomingActionRow
                                  key={action.id}
                                  action={action}
                                  t={t}
                                  onEdit={openActionEdit}
                                  onDelete={() =>
                                    setDeleteTarget({
                                      kind: 'action',
                                      id: action.id,
                                      parentId: incomingEdit.id,
                                      name: action.name,
                                    })
                                  }
                                />
                              ))
                            )}
                          </TableBody>
                        </SortableContext>
                      </Table>
                    </DndContext>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="logs"
              className="mt-0 min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-8 sm:px-4"
            >
              {!incomingEdit ? (
                <EmptyState
                  icon={<Clock3 className="h-12 w-12" />}
                  title={t('emptyIncomingLogs')}
                  description={t('emptyIncomingLogsDescription')}
                />
              ) : incomingLogItems.length === 0 ? (
                <EmptyState
                  icon={<Clock3 className="h-12 w-12" />}
                  title={t('emptyIncomingLogs')}
                  description={t('emptyIncomingLogsDescription')}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    <Select
                      value={logOrder}
                      onValueChange={(v: 'desc' | 'asc') => {
                        setLogOrder(v);
                        setIncomingLogsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-52">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">
                          {t('logOrderDesc')}
                        </SelectItem>
                        <SelectItem value="asc">{t('logOrderAsc')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-28">{t('status')}</TableHead>
                          <TableHead>{t('logDate')}</TableHead>
                          <TableHead className="hidden sm:table-cell">
                            {t('logRemoteIp')}
                          </TableHead>
                          <TableHead className="w-24 text-right">
                            {t('logDuration')}
                          </TableHead>
                          <TableHead className="w-16 text-center">
                            {t('actions')}
                          </TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomingLogItems.map((log) => (
                          <TableRow
                            key={log.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedLog(log)}
                          >
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  log.status === 'success'
                                    ? 'border-green-500/20 bg-green-500/10 text-green-600'
                                    : 'border-red-500/20 bg-red-500/10 text-red-600'
                                }
                              >
                                {log.status === 'success'
                                  ? t('logStatusSuccess')
                                  : t('logStatusFailed')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(
                                log.created_at,
                                getSettingValue,
                                currentLocaleCode
                              )}
                            </TableCell>
                            <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                              {log.remote_ip || '-'}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {log.duration_ms}ms
                            </TableCell>
                            <TableCell className="text-center">
                              {log.webhook_action_log?.length ? (
                                <Badge variant="secondary" className="text-xs">
                                  {log.webhook_action_log.length}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <PaginationFooter
                currentPage={incomingLogsPage}
                pageSize={incomingLogsPageSize}
                totalItems={incomingLogsTotalItems}
                onPageChange={setIncomingLogsPage}
                onPageSizeChange={(size) => {
                  setIncomingLogsPageSize(size);
                  setIncomingLogsPage(1);
                }}
              />

              {isFetchingIncomingLogs ? (
                <p className="text-xs text-muted-foreground">
                  {t('incomingLogsLoading')}
                </p>
              ) : null}
            </TabsContent>
          </Tabs>

          <Sheet
            open={actionSheetOpen}
            onOpenChange={(open) => {
              setActionSheetOpen(open);
              if (!open) {
                setActionEdit(null);
                setGeneratedToken(null);
                setActionForm(defaultActionForm);
              }
            }}
          >
            <ResizableSheetContent
              sheetId="webhooks-action-form"
              defaultWidth={768}
            >
              <SheetHeader>
                <SheetTitle>
                  {actionEdit ? t('updated') : t('addAction')}
                </SheetTitle>
                <SheetDescription>{t('actionSection')}</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-8 sm:px-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label={t('actionType')}>
                    <Select
                      value={actionForm.type}
                      onValueChange={(value: IncomingAction['type']) =>
                        setActionForm({ ...actionForm, type: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">{t('email')}</SelectItem>
                        <SelectItem value="whatsapp_evolution">
                          {t('whatsapp')}
                        </SelectItem>
                        <SelectItem value="http_request">
                          HTTP Request
                        </SelectItem>
                        <SelectItem value="internal_api">
                          Internal API
                        </SelectItem>
                        <SelectItem value="app_command">App Command</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t('name')}>
                    <Input
                      value={actionForm.name}
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          name: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label={t('order')}>
                    <Input
                      type="number"
                      value={actionForm.order}
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          order: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                </div>

                {actionForm.type === 'email' && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label={t('mailProfile')}>
                      <div className="flex items-start gap-2">
                        <EntityPicker<SelectOption>
                          value={actionForm.integration_profile_id}
                          className="w-full"
                          valueType="number"
                          placeholder={t('select')}
                          entityLabel={t('mailProfile')}
                          options={mailProfiles}
                          loadOptions={async ({ page, pageSize, search }) => {
                            const response = await request<{
                              data: Array<{
                                id: number;
                                slug: string;
                                name: string;
                                integration_provider?: { slug?: string | null };
                              }>;
                            }>({
                              url: `/integration-profile?page=${page}&pageSize=${pageSize}&typeSlug=email&search=${encodeURIComponent(search)}`,
                              method: 'GET',
                            });

                            return {
                              items: (response.data?.data || []).map(
                                (item) => ({
                                  id: item.id,
                                  slug: item.slug,
                                  name: item.name,
                                  provider: String(
                                    item.integration_provider?.slug ?? ''
                                  ),
                                })
                              ),
                              hasMore: false,
                            };
                          }}
                          getOptionValue={(option) => option.id}
                          getOptionLabel={(option) =>
                            option.name || option.slug
                          }
                          getOptionDescription={(option) =>
                            option.provider || option.slug
                          }
                          createFields={[
                            {
                              name: 'slug',
                              label: 'Slug',
                              required: true,
                            },
                            {
                              name: 'name',
                              label: t('name'),
                              required: true,
                            },
                            {
                              name: 'from_email',
                              label: 'From e-mail',
                              type: 'email',
                              required: true,
                            },
                            {
                              name: 'smtp_host',
                              label: 'SMTP host',
                              required: true,
                            },
                            {
                              name: 'smtp_port',
                              label: 'SMTP port',
                              type: 'number',
                              defaultValue: '587',
                              required: true,
                            },
                            {
                              name: 'smtp_username',
                              label: 'SMTP username',
                              required: true,
                            },
                            {
                              name: 'smtp_password',
                              label: 'SMTP password',
                              type: 'password',
                              required: true,
                            },
                          ]}
                          createTitle="Criar perfil de e-mail"
                          createDescription="Crie rapidamente um perfil SMTP para usar nesta ação."
                          onCreate={async (values) => {
                            const provider =
                              await resolveEmailProviderMeta('smtp');
                            const response = await request<SelectOption>({
                              url: '/integration-profile',
                              method: 'POST',
                              data: {
                                slug: values.slug,
                                name: values.name,
                                type_id: provider.type_id,
                                provider_id: provider.id,
                                config: {
                                  from_email: values.from_email,
                                  host: values.smtp_host,
                                  port: Number(values.smtp_port || 587),
                                  secure: false,
                                  username: values.smtp_username,
                                  password: values.smtp_password,
                                },
                                is_active: true,
                              },
                            });

                            await refetchMailProfiles();

                            return {
                              id: response.data.id,
                              slug: response.data.slug,
                              name: response.data.name,
                              provider: response.data.provider,
                            };
                          }}
                          onChange={(value) =>
                            setActionForm((current) => ({
                              ...current,
                              integration_profile_id:
                                typeof value === 'number'
                                  ? value
                                  : value != null && value !== ''
                                    ? Number(value)
                                    : null,
                            }))
                          }
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          disabled={!actionForm.integration_profile_id}
                          aria-label="Editar perfil de e-mail selecionado"
                          title="Editar perfil de e-mail selecionado"
                          onClick={() => {
                            if (actionForm.integration_profile_id) {
                              void openMailProfileEditor(
                                actionForm.integration_profile_id
                              );
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </Field>
                    <Field label={t('mailTemplate')}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <EntityPicker<SelectOption>
                            className="w-full"
                            value={actionForm.mail_id}
                            valueType="number"
                            placeholder={t('select')}
                            entityLabel={t('mailTemplate')}
                            options={mailTemplates}
                            loadOptions={async ({ page, pageSize, search }) => {
                              const response = await request<{
                                data: SelectOption[];
                              }>({
                                url: `/mail?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
                                method: 'GET',
                              });

                              return {
                                items: response.data?.data || [],
                                hasMore: false,
                              };
                            }}
                            getOptionValue={(option) => option.id}
                            getOptionLabel={(option) => option.slug}
                            getOptionDescription={(option) =>
                              option.subject || option.name
                            }
                            createFields={[
                              {
                                name: 'slug',
                                label: 'Slug',
                                required: true,
                              },
                            ]}
                            createTitle="Criar template de e-mail"
                            createDescription="Crie rapidamente um template para usar nesta ação."
                            onCreate={async (values) => {
                              const response = await request<SelectOption>({
                                url: '/mail',
                                method: 'POST',
                                data: {
                                  slug: values.slug,
                                },
                              });

                              await refetchMailTemplates();

                              return {
                                id: response.data.id,
                                slug: response.data.slug,
                                subject: response.data.subject,
                                name: response.data.name,
                              };
                            }}
                            onChange={(value) =>
                              setActionForm((current) => ({
                                ...current,
                                mail_id:
                                  typeof value === 'number'
                                    ? value
                                    : value != null && value !== ''
                                      ? Number(value)
                                      : null,
                              }))
                            }
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          disabled={!actionForm.mail_id}
                          aria-label="Editar template de e-mail selecionado"
                          title="Editar template de e-mail selecionado"
                          onClick={() => {
                            if (actionForm.mail_id) {
                              void openMailTemplateEditor(actionForm.mail_id);
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </Field>
                    <Field label={t('emailTo')}>
                      <Input
                        value={actionForm.email_to}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            email_to: event.target.value,
                          })
                        }
                        placeholder="{{email}}"
                      />
                    </Field>
                    <Field label={t('emailCc')}>
                      <Input
                        value={actionForm.email_cc}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            email_cc: event.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                )}

                {actionForm.type === 'whatsapp_evolution' && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label={t('whatsappTargetType')}>
                      <Select
                        value={actionForm.whatsapp_target_type}
                        onValueChange={(value) =>
                          setActionForm({
                            ...actionForm,
                            whatsapp_target_type: value as 'phone' | 'group',
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">{t('phone')}</SelectItem>
                          <SelectItem value="group">{t('group')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={t('whatsappTarget')}>
                      <Input
                        value={actionForm.whatsapp_target}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            whatsapp_target: event.target.value,
                          })
                        }
                        placeholder="{{phone}}"
                      />
                    </Field>
                    <Field label={t('whatsappInstance')}>
                      <Input
                        value={actionForm.whatsapp_instance}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            whatsapp_instance: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label={t('whatsappBaseUrl')}>
                      <Input
                        value={actionForm.whatsapp_base_url}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            whatsapp_base_url: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label={t('whatsappToken')}>
                      <Input
                        type="password"
                        value={actionForm.whatsapp_token}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            whatsapp_token: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label={t('whatsappTemplate')}>
                      <Textarea
                        value={actionForm.whatsapp_template}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            whatsapp_template: event.target.value,
                          })
                        }
                        placeholder="Olá {{name}}"
                      />
                    </Field>
                  </div>
                )}

                {actionForm.type === 'http_request' && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Método HTTP">
                      <Select
                        value={actionForm.http_method}
                        onValueChange={(value) =>
                          setActionForm({ ...actionForm, http_method: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(
                            (m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="URL *">
                      <Input
                        value={actionForm.http_url}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            http_url: event.target.value,
                          })
                        }
                        placeholder="https://example.com/api/{{endpoint}}"
                      />
                    </Field>
                    <Field label="Timeout (ms)">
                      <Input
                        type="number"
                        value={actionForm.http_timeout_ms}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            http_timeout_ms: Number(event.target.value),
                          })
                        }
                        placeholder="30000"
                      />
                    </Field>
                    <Field label="Tentativas extras (retry)">
                      <Input
                        type="number"
                        value={actionForm.http_retry_count}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            http_retry_count: Number(event.target.value),
                          })
                        }
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Headers (JSON)">
                      <Textarea
                        value={actionForm.http_headers}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            http_headers: event.target.value,
                          })
                        }
                        className="font-mono text-xs"
                        rows={3}
                        placeholder='{"Authorization": "Bearer {{token}}"}'
                      />
                    </Field>
                    <Field label="Query Params (JSON)">
                      <Textarea
                        value={actionForm.http_query}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            http_query: event.target.value,
                          })
                        }
                        className="font-mono text-xs"
                        rows={3}
                        placeholder='{"search": "{{query}}"}'
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Body">
                        <Textarea
                          value={actionForm.http_body}
                          onChange={(event) =>
                            setActionForm({
                              ...actionForm,
                              http_body: event.target.value,
                            })
                          }
                          className="font-mono text-xs"
                          rows={5}
                          placeholder='{"userId": "{{userId}}", "event": "{{type}}"}'
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {actionForm.type === 'internal_api' && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Usuário (ID) *">
                      <Input
                        type="number"
                        value={actionForm.internal_api_user_id ?? ''}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            internal_api_user_id: event.target.value
                              ? Number(event.target.value)
                              : null,
                          })
                        }
                        placeholder="ID do usuário dono do token"
                      />
                    </Field>
                    <Field label="Token de autenticação *">
                      <div className="flex items-start gap-2">
                        <Input
                          type="password"
                          value={actionForm.internal_api_token}
                          onChange={(event) =>
                            setActionForm({
                              ...actionForm,
                              internal_api_token: event.target.value,
                            })
                          }
                          placeholder="hedhog_api_..."
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!actionForm.internal_api_user_id}
                          onClick={async () => {
                            if (!actionForm.internal_api_user_id) return;
                            try {
                              const response = await request<{
                                rawToken: string;
                              }>({
                                url: '/webhook-integration/user-tokens',
                                method: 'POST',
                                data: {
                                  userId: actionForm.internal_api_user_id,
                                  name: `webhook-action-${Date.now()}`,
                                },
                              });
                              const raw = response.data?.rawToken;
                              if (raw) {
                                setActionForm({
                                  ...actionForm,
                                  internal_api_token: raw,
                                });
                                setGeneratedToken(raw);
                                toast.success(
                                  'Token gerado! Copie-o antes de salvar.'
                                );
                              }
                            } catch {
                              toast.error('Erro ao gerar token');
                            }
                          }}
                        >
                          Gerar
                        </Button>
                      </div>
                    </Field>
                    {generatedToken && (
                      <div className="md:col-span-2 rounded border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800">
                        <strong>Token gerado (exibido apenas uma vez):</strong>
                        <div className="mt-1 flex items-center gap-2 font-mono break-all">
                          <span className="flex-1">{generatedToken}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                generatedToken
                              );
                              toast.success('Token copiado!');
                            }}
                          >
                            Copiar
                          </Button>
                        </div>
                      </div>
                    )}
                    <Field label="Método HTTP">
                      <Select
                        value={actionForm.internal_api_method}
                        onValueChange={(value) =>
                          setActionForm({
                            ...actionForm,
                            internal_api_method: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(
                            (m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Path / Endpoint *">
                      <Select
                        value={actionForm.internal_api_path}
                        onValueChange={(value) => {
                          const route = internalRoutes.find(
                            (r) => r.url === value
                          );
                          setActionForm({
                            ...actionForm,
                            internal_api_path: value,
                            internal_api_method:
                              route?.method || actionForm.internal_api_method,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um endpoint" />
                        </SelectTrigger>
                        <SelectContent>
                          {internalRoutes.map((route) => (
                            <SelectItem key={route.id} value={route.url}>
                              <span className="mr-2 font-mono text-xs text-muted-foreground">
                                {route.method}
                              </span>
                              {route.url}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Query Params (JSON)">
                      <Textarea
                        value={actionForm.internal_api_query}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            internal_api_query: event.target.value,
                          })
                        }
                        className="font-mono text-xs"
                        rows={3}
                        placeholder='{"page": "1"}'
                      />
                    </Field>
                    <Field label="Body (JSON)">
                      <Textarea
                        value={actionForm.internal_api_body}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            internal_api_body: event.target.value,
                          })
                        }
                        className="font-mono text-xs"
                        rows={3}
                        placeholder='{"userId": "{{userId}}"}'
                      />
                    </Field>
                  </div>
                )}

                {actionForm.type === 'app_command' && (
                  <div className="grid gap-3">
                    <Field label="Comando *">
                      <Select
                        value={actionForm.app_command_slug}
                        onValueChange={(value) =>
                          setActionForm({
                            ...actionForm,
                            app_command_slug: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um comando" />
                        </SelectTrigger>
                        <SelectContent>
                          {appCommands.map((cmd) => (
                            <SelectItem key={cmd.slug} value={cmd.slug}>
                              {cmd.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    {actionForm.app_command_slug &&
                      (() => {
                        const cmd = appCommands.find(
                          (c) => c.slug === actionForm.app_command_slug
                        );
                        return cmd ? (
                          <p className="text-sm text-muted-foreground">
                            {cmd.description}
                          </p>
                        ) : null;
                      })()}
                    <Field label="Parâmetros (JSON)">
                      <Textarea
                        value={actionForm.app_command_params}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            app_command_params: event.target.value,
                          })
                        }
                        className="font-mono text-xs"
                        rows={5}
                        placeholder="{}"
                      />
                    </Field>
                    {actionForm.app_command_slug &&
                      (() => {
                        const cmd = appCommands.find(
                          (c) => c.slug === actionForm.app_command_slug
                        );
                        return cmd?.inputSchema ? (
                          <div className="rounded border bg-muted/40 p-2">
                            <p className="mb-1 text-xs font-medium text-muted-foreground">
                              Schema esperado:
                            </p>
                            <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                              {JSON.stringify(cmd.inputSchema, null, 2)}
                            </pre>
                          </div>
                        ) : null;
                      })()}
                  </div>
                )}

                <SheetActions
                  onSave={saveAction}
                  onCancel={() => setActionSheetOpen(false)}
                  t={t}
                />
              </div>
            </ResizableSheetContent>
          </Sheet>
        </ResizableSheetContent>
      </Sheet>

      <Sheet open={eventWebhookOpen} onOpenChange={setEventWebhookOpen}>
        <ResizableSheetContent
          sheetId="webhooks-event-webhook-form"
          defaultWidth={1024}
        >
          <SheetHeader>
            <SheetTitle>
              {eventWebhookEdit ? t('editEventWebhook') : t('newEventWebhook')}
            </SheetTitle>
            <SheetDescription>
              {t('eventWebhookFormDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-8 sm:px-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('name')}>
                <Input
                  value={eventWebhookForm.name}
                  onChange={(event) =>
                    setEventWebhookForm({
                      ...eventWebhookForm,
                      name: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label={t('technicalName')}>
                <Input
                  value={eventWebhookForm.slug}
                  onChange={(event) =>
                    setEventWebhookForm({
                      ...eventWebhookForm,
                      slug: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <Field label={t('events')}>
              <div className="grid max-h-52 gap-2 overflow-y-auto rounded-md border p-3 md:grid-cols-2">
                {eventOptions.map((event) => {
                  const checked = eventWebhookForm.event_ids.includes(event.id);
                  return (
                    <label
                      key={event.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) => {
                          setEventWebhookForm({
                            ...eventWebhookForm,
                            event_ids: nextChecked
                              ? [...eventWebhookForm.event_ids, event.id]
                              : eventWebhookForm.event_ids.filter(
                                  (id) => id !== event.id
                                ),
                          });
                        }}
                      />
                      <span>
                        <span className="block font-mono text-xs">
                          {event.slug}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {event.module}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
            <div className="grid gap-4 md:grid-cols-[160px_1fr]">
              <Field label={t('method')}>
                <Select
                  value={eventWebhookForm.method}
                  onValueChange={(method) =>
                    setEventWebhookForm({ ...eventWebhookForm, method })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('url')}>
                <Input
                  value={eventWebhookForm.url}
                  onChange={(event) =>
                    setEventWebhookForm({
                      ...eventWebhookForm,
                      url: event.target.value,
                    })
                  }
                  placeholder="https://api.example.com/webhook"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <StatusSelect
                value={eventWebhookForm.status}
                onValueChange={(status) =>
                  setEventWebhookForm({ ...eventWebhookForm, status })
                }
                t={t}
              />
              <Field label={t('timeout')}>
                <Input
                  type="number"
                  value={eventWebhookForm.timeout_ms}
                  onChange={(event) =>
                    setEventWebhookForm({
                      ...eventWebhookForm,
                      timeout_ms: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label={t('retry')}>
                <Input
                  type="number"
                  value={eventWebhookForm.retry_count}
                  onChange={(event) =>
                    setEventWebhookForm({
                      ...eventWebhookForm,
                      retry_count: Number(event.target.value),
                    })
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t('headers')}>
                <Textarea
                  className="min-h-48 font-mono text-xs"
                  value={eventWebhookForm.headers}
                  onChange={(event) =>
                    setEventWebhookForm({
                      ...eventWebhookForm,
                      headers: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label={t('query')}>
                <Textarea
                  className="min-h-48 font-mono text-xs"
                  value={eventWebhookForm.query}
                  onChange={(event) =>
                    setEventWebhookForm({
                      ...eventWebhookForm,
                      query: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label={t('payload')}>
                <Textarea
                  className="min-h-48 font-mono text-xs"
                  value={eventWebhookForm.payload}
                  onChange={(event) =>
                    setEventWebhookForm({
                      ...eventWebhookForm,
                      payload: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <SheetActions
              onSave={saveEventWebhook}
              onCancel={() => setEventWebhookOpen(false)}
              t={t}
            />
          </div>
        </ResizableSheetContent>
      </Sheet>

      <Sheet
        open={mailProfileEditorOpen}
        onOpenChange={(open) => {
          setMailProfileEditorOpen(open);
          if (!open) {
            setMailProfileEditId(null);
            setMailProfileEditForm(defaultMailProfileEditForm);
            setMailProfileTestedSignature(null);
            setMailProfileIsTesting(false);
          }
        }}
      >
        <ResizableSheetContent
          sheetId="webhooks-integration-profile-editor"
          defaultWidth={896}
        >
          <SheetHeader>
            <SheetTitle>Editar perfil de e-mail</SheetTitle>
            <SheetDescription>
              Atualize o perfil selecionado sem sair desta tela.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-8 sm:px-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label={t('name')}>
                <Input
                  value={mailProfileEditForm.name}
                  onChange={(event) =>
                    setMailProfileEditForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label={t('technicalName')}>
                <Input
                  value={mailProfileEditForm.slug}
                  onChange={(event) =>
                    setMailProfileEditForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label={t('provider')}>
                <Select
                  value={mailProfileEditForm.provider}
                  onValueChange={(provider: MailProfileProvider) =>
                    setMailProfileEditForm((current) => ({
                      ...current,
                      provider,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMTP">SMTP</SelectItem>
                    <SelectItem value="GMAIL">GMAIL</SelectItem>
                    <SelectItem value="SES">SES</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="From e-mail">
                <Input
                  type="email"
                  value={mailProfileEditForm.from_email}
                  onChange={(event) =>
                    setMailProfileEditForm((current) => ({
                      ...current,
                      from_email: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="From name">
                <Input
                  value={mailProfileEditForm.from_name}
                  onChange={(event) =>
                    setMailProfileEditForm((current) => ({
                      ...current,
                      from_name: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Reply-to e-mail">
                <Input
                  type="email"
                  value={mailProfileEditForm.reply_to_email}
                  onChange={(event) =>
                    setMailProfileEditForm((current) => ({
                      ...current,
                      reply_to_email: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Reply-to name">
                <Input
                  value={mailProfileEditForm.reply_to_name}
                  onChange={(event) =>
                    setMailProfileEditForm((current) => ({
                      ...current,
                      reply_to_name: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            {mailProfileEditForm.provider === 'SMTP' ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="SMTP host">
                  <Input
                    value={mailProfileEditForm.smtp_host}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        smtp_host: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="SMTP port">
                  <Input
                    type="number"
                    value={mailProfileEditForm.smtp_port}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        smtp_port: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="SMTP username">
                  <Input
                    value={mailProfileEditForm.smtp_username}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        smtp_username: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="SMTP password">
                  <Input
                    type="password"
                    value={mailProfileEditForm.smtp_password}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        smtp_password: event.target.value,
                      }))
                    }
                  />
                </Field>
                <div className="rounded-md border px-4 py-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SMTP secure</span>
                    <Switch
                      checked={mailProfileEditForm.smtp_secure}
                      onCheckedChange={(checked) =>
                        setMailProfileEditForm((current) => ({
                          ...current,
                          smtp_secure: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {mailProfileEditForm.provider === 'GMAIL' ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Gmail client id">
                  <Input
                    value={mailProfileEditForm.gmail_client_id}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        gmail_client_id: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Gmail client secret">
                  <Input
                    type="password"
                    value={mailProfileEditForm.gmail_client_secret}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        gmail_client_secret: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Gmail refresh token">
                  <Textarea
                    className="md:col-span-2"
                    value={mailProfileEditForm.gmail_refresh_token}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        gmail_refresh_token: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            ) : null}

            {mailProfileEditForm.provider === 'SES' ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="SES access key id">
                  <Input
                    value={mailProfileEditForm.ses_access_key_id}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        ses_access_key_id: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="SES secret access key">
                  <Input
                    type="password"
                    value={mailProfileEditForm.ses_secret_access_key}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        ses_secret_access_key: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="SES region">
                  <Input
                    value={mailProfileEditForm.ses_region}
                    onChange={(event) =>
                      setMailProfileEditForm((current) => ({
                        ...current,
                        ses_region: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            ) : null}

            <div className="flex justify-end border-t pt-4">
              {canSubmitMailProfile ? (
                <Button
                  type="button"
                  className="min-w-40"
                  onClick={saveMailProfileEditor}
                >
                  Salvar alterações
                </Button>
              ) : (
                <Button
                  type="button"
                  className="min-w-40"
                  onClick={handleTestMailProfile}
                  disabled={mailProfileIsTesting}
                >
                  {mailProfileIsTesting ? 'Testando...' : 'Testar perfil'}
                </Button>
              )}
            </div>
          </div>
        </ResizableSheetContent>
      </Sheet>

      <Sheet
        open={mailTemplateEditorOpen}
        onOpenChange={(open) => {
          setMailTemplateEditorOpen(open);
          if (!open) {
            setMailTemplateEditId(null);
            setMailTemplateEditForm(defaultMailTemplateEditForm);
          }
        }}
      >
        <ResizableSheetContent
          sheetId="webhooks-mail-template-editor"
          defaultWidth={896}
        >
          <SheetHeader>
            <SheetTitle>Editar template de e-mail</SheetTitle>
            <SheetDescription>
              Atualize o template selecionado sem sair desta tela.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-8 sm:px-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label={t('technicalName')}>
                <Input
                  value={mailTemplateEditForm.slug}
                  onChange={(event) =>
                    setMailTemplateEditForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Locale">
                <Select
                  value={mailTemplateEditForm.locale_code}
                  onValueChange={(localeCode) => {
                    void loadMailTemplateLocale(localeCode);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locales.map((locale) => (
                      <SelectItem key={locale.code} value={locale.code}>
                        {locale.name || locale.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Subject">
              <Input
                value={mailTemplateEditForm.subject}
                onChange={(event) =>
                  setMailTemplateEditForm((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Body">
              <RichTextEditor
                value={mailTemplateEditForm.body}
                onChange={(value) =>
                  setMailTemplateEditForm((current) => ({
                    ...current,
                    body: value,
                  }))
                }
              />
            </Field>

            <Field label="Variaveis (uma por linha)">
              <Textarea
                className="min-h-32 font-mono text-xs"
                value={mailTemplateEditForm.variables}
                onChange={(event) =>
                  setMailTemplateEditForm((current) => ({
                    ...current,
                    variables: event.target.value,
                  }))
                }
                placeholder="first_name\ninvoice_number"
              />
            </Field>

            <SheetActions
              onSave={saveMailTemplateEditor}
              onCancel={() => setMailTemplateEditorOpen(false)}
              t={t}
            />
          </div>
        </ResizableSheetContent>
      </Sheet>

      <Sheet
        open={Boolean(selectedLog)}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <ResizableSheetContent sheetId="webhooks-log-detail" defaultWidth={768}>
          <SheetHeader>
            <SheetTitle>{t('logDetailTitle')}</SheetTitle>
            <SheetDescription>
              {selectedLog
                ? formatDate(
                    selectedLog.created_at,
                    getSettingValue,
                    currentLocaleCode
                  )
                : ''}
            </SheetDescription>
          </SheetHeader>

          {selectedLog ? (
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-8 sm:px-4">
              <div className="flex flex-wrap gap-3 pt-2">
                <Badge
                  variant="outline"
                  className={
                    selectedLog.status === 'success'
                      ? 'border-green-500/20 bg-green-500/10 text-green-600'
                      : 'border-red-500/20 bg-red-500/10 text-red-600'
                  }
                >
                  {selectedLog.status === 'success'
                    ? t('logStatusSuccess')
                    : t('logStatusFailed')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t('logDuration')}: {selectedLog.duration_ms}ms
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('logRemoteIp')}: {selectedLog.remote_ip || '-'}
                </span>
              </div>

              {selectedLog.status === 'failed' ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRetryTarget(selectedLog)}
                    disabled={isRetryingLog}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t('logRetry')}
                  </Button>
                </div>
              ) : null}

              {selectedLog.error_message ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-destructive">
                    {t('logError')}
                  </p>
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-destructive dark:border-red-900 dark:bg-red-950">
                    {selectedLog.error_message}
                  </p>
                </div>
              ) : null}

              {selectedLog.payload_summary ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {t('logPayload')}
                  </p>
                  <pre className="max-h-56 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
                    {stringifyJson(selectedLog.payload_summary)}
                  </pre>
                </div>
              ) : null}

              {selectedLog.response_summary ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {t('logResponse')}
                  </p>
                  <pre className="max-h-56 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
                    {stringifyJson(selectedLog.response_summary)}
                  </pre>
                </div>
              ) : null}

              {selectedLog.webhook_action_log?.length ? (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {t('actionSection')}
                  </p>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('actionType')}</TableHead>
                          <TableHead>{t('name')}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                          <TableHead className="w-20 text-right">
                            {t('logDuration')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLog.webhook_action_log.map((actionLog) => (
                          <TableRow key={actionLog.id}>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {actionLog.action_type === 'email'
                                  ? t('email')
                                  : t('whatsapp')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {actionLog.action_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  actionLog.status === 'success'
                                    ? 'border-green-500/20 bg-green-500/10 text-green-600'
                                    : 'border-red-500/20 bg-red-500/10 text-red-600'
                                }
                              >
                                {actionLog.status === 'success'
                                  ? t('logStatusSuccess')
                                  : t('logStatusFailed')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {actionLog.duration_ms}ms
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedLog.webhook_action_log.some(
                    (al) =>
                      al.request_payload ||
                      al.response_payload ||
                      al.error_message
                  ) ? (
                    <div className="mt-4 space-y-4">
                      {selectedLog.webhook_action_log.map((actionLog) =>
                        actionLog.request_payload ||
                        actionLog.response_payload ||
                        actionLog.error_message ? (
                          <div
                            key={actionLog.id}
                            className="rounded-md border p-3 text-xs"
                          >
                            <p className="mb-2 font-medium">
                              {actionLog.action_name}
                            </p>
                            {actionLog.error_message ? (
                              <p className="mb-2 text-destructive">
                                {actionLog.error_message}
                              </p>
                            ) : null}
                            {actionLog.request_payload ? (
                              <div className="mb-2">
                                <p className="mb-1 text-muted-foreground">
                                  {t('logRequest')}
                                </p>
                                <pre className="max-h-32 overflow-auto rounded border bg-muted/40 p-2 font-mono">
                                  {stringifyJson(actionLog.request_payload)}
                                </pre>
                              </div>
                            ) : null}
                            {actionLog.response_payload ? (
                              <div>
                                <p className="mb-1 text-muted-foreground">
                                  {t('logResponse')}
                                </p>
                                <pre className="max-h-32 overflow-auto rounded border bg-muted/40 p-2 font-mono">
                                  {stringifyJson(actionLog.response_payload)}
                                </pre>
                              </div>
                            ) : null}
                          </div>
                        ) : null
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </ResizableSheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDescription', { name: deleteTarget?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(retryTarget)}
        onOpenChange={(open) => {
          if (!open && !isRetryingLog) setRetryTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('logRetryConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('logRetryConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRetryingLog}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (retryTarget) retryIncomingLog(retryTarget);
              }}
              disabled={isRetryingLog}
            >
              {t('logRetry')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SortableIncomingActionRow({
  action,
  t,
  onEdit,
  onDelete,
}: {
  action: IncomingAction;
  t: (key: string) => string;
  onEdit: (action: IncomingAction) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'bg-muted/40' : ''}
    >
      <TableCell className="w-8 pr-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex cursor-grab touch-none items-center justify-center rounded p-1 text-muted-foreground active:cursor-grabbing"
          aria-label={t('order')}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>{action.name}</TableCell>
      <TableCell>
        <Badge variant="secondary">
          {action.type === 'email'
            ? t('email')
            : action.type === 'whatsapp_evolution'
              ? t('whatsapp')
              : action.type === 'http_request'
                ? 'HTTP Request'
                : action.type === 'internal_api'
                  ? 'Internal API'
                  : 'App Command'}
        </Badge>
      </TableCell>
      <TableCell>{action.order}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" onClick={() => onEdit(action)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function StatusSelect({
  value,
  onValueChange,
  t,
}: {
  value: Status;
  onValueChange: (value: Status) => void;
  t: (key: string) => string;
}) {
  return (
    <Field label={t('status')}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">{t('active')}</SelectItem>
          <SelectItem value="inactive">{t('inactive')}</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

function SheetActions({
  onSave,
  onCancel,
  t,
}: {
  onSave: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex justify-end gap-3 border-t pt-4">
      <Button variant="outline" onClick={onCancel}>
        {t('cancel')}
      </Button>
      <Button onClick={onSave}>{t('save')}</Button>
    </div>
  );
}
