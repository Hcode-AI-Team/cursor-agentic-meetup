'use client';

import {
  EmptyState,
  Page,
  PageHeader,
  PaginationFooter,
  SearchBar,
} from '@/components/entity-list';
import { ViewModeToggle } from '@/components/entity-list/view-mode-toggle';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { KpiCardsGrid } from '@/components/ui/kpi-cards-grid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { cn } from '@/lib/utils';
import { Route as ApiRoute, Screen } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bot,
  FileText,
  Globe,
  Layers3,
  Loader2,
  Plus,
  Route as RouteIcon,
  Save,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

type RouteType = 'HTTP' | 'MCP';

type RouteItem = ApiRoute & {
  id: number;
  type?: RouteType;
  tool_name?: string | null;
  name?: string | null;
  role_route?: Array<{ route_id: number; role_id: number }>;
  route_screen?: Array<{ route_id: number; screen_id: number }>;
};

type RoleItem = {
  id: number;
  slug: string;
  name?: string;
  role_locale?: Array<{
    name?: string;
    description?: string;
  }>;
  role_route?: Array<{
    route_id: number;
    role_id: number;
  }>;
};

type ScreenItem = Screen & {
  id: number;
  route_screen?: Array<{
    route_id: number;
    screen_id: number;
  }>;
};

type RouteFormValues = {
  type: RouteType;
  url: string;
  method: string;
  tool_name: string;
  name: string;
};

const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
] as const;
const ALL_FILTER = '__all__';

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error && typeof error === 'object') {
    const record = error as {
      message?: string;
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
    };

    return (
      record.response?.data?.message ||
      record.response?.data?.error ||
      record.message ||
      fallbackMessage
    );
  }

  return fallbackMessage;
}

function normalizeRouteType(route: Partial<RouteItem>): RouteType {
  if (route.type === 'MCP' || route.tool_name) {
    return 'MCP';
  }

  return 'HTTP';
}

function getRouteTitle(route: RouteItem) {
  const type = normalizeRouteType(route);

  if (type === 'MCP') {
    return route.name?.trim() || route.tool_name?.trim() || `#${route.id}`;
  }

  return route.url || `#${route.id}`;
}

function getRouteSubtitle(route: RouteItem) {
  const type = normalizeRouteType(route);

  if (type === 'MCP') {
    return route.tool_name?.trim() || '—';
  }

  return route.method || '—';
}

function getMethodBadgeClass(method?: string | null) {
  const normalized = (method || '').toUpperCase();

  if (normalized === 'GET') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (normalized === 'POST')
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'PUT')
    return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized === 'PATCH')
    return 'bg-violet-50 text-violet-700 border-violet-200';
  if (normalized === 'DELETE')
    return 'bg-rose-50 text-rose-700 border-rose-200';

  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function RouteRolesSection({ routeId }: { routeId: number }) {
  const t = useTranslations('core.RoutePage');
  const { request, currentLocaleCode } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery<PaginatedResponse<RoleItem>>({
    queryKey: ['route-roles', routeId, currentLocaleCode],
    queryFn: async () => {
      const response = await request<PaginatedResponse<RoleItem>>({
        url: `/route/${routeId}/role?pageSize=10000`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!routeId,
  });

  const roles = data?.data ?? [];

  const filteredRoles = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) return roles;

    return roles.filter((role) => {
      const name = role.role_locale?.[0]?.name ?? role.name ?? '';
      const description = role.role_locale?.[0]?.description ?? '';

      return [name, role.slug, description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [roles, searchQuery]);

  const assignedCount = roles.filter((role) =>
    Boolean(role.role_route?.length)
  ).length;

  const toggleRole = async (roleIdToToggle: number, assigned: boolean) => {
    setTogglingId(roleIdToToggle);

    try {
      const currentIds = roles
        .filter((role) => Boolean(role.role_route?.length))
        .map((role) => role.id);

      const nextIds = assigned
        ? currentIds.filter((id) => id !== roleIdToToggle)
        : [...new Set([...currentIds, roleIdToToggle])];

      await request({
        url: `/route/${routeId}/role`,
        method: 'PATCH',
        data: { ids: nextIds },
      });

      toast.success(assigned ? t('roleRemoved') : t('roleAssigned'));
      await refetch();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          assigned ? t('errorRemovingRole') : t('errorAssigningRole')
        )
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loadingRoles')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" />
              {t('rolesTitle')}
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('rolesDescription')}
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full px-2.5 py-1">
            {assignedCount}
          </Badge>
        </div>
      </div>

      <Input
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={t('searchRoles')}
      />

      {filteredRoles.length ? (
        <div className="space-y-2">
          {filteredRoles.map((role) => {
            const assigned = Boolean(role.role_route?.length);
            const label = role.role_locale?.[0]?.name ?? role.name ?? role.slug;

            return (
              <div
                key={role.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  assigned
                    ? 'border-primary/40 bg-primary/5'
                    : 'hover:border-primary/30'
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{label}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {role.role_locale?.[0]?.description || role.slug}
                  </div>
                </div>
                <Switch
                  checked={assigned}
                  disabled={togglingId === role.id}
                  onCheckedChange={() => toggleRole(role.id, assigned)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          className="min-h-52"
          icon={<ShieldCheck className="h-10 w-10" />}
          title={t('noRolesFound')}
          description={t('rolesDescription')}
        />
      )}
    </div>
  );
}

function RouteScreensSection({ routeId }: { routeId: number }) {
  const t = useTranslations('core.RoutePage');
  const { request, currentLocaleCode } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery<PaginatedResponse<ScreenItem>>({
    queryKey: ['route-screens', routeId, currentLocaleCode],
    queryFn: async () => {
      const response = await request<PaginatedResponse<ScreenItem>>({
        url: `/route/${routeId}/screen?pageSize=10000`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!routeId,
  });

  const screens = data?.data ?? [];

  const filteredScreens = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) return screens;

    return screens.filter((screen) => {
      const name = screen.screen_locale?.[0]?.name ?? screen.name ?? '';
      const description =
        screen.screen_locale?.[0]?.description ?? screen.description ?? '';

      return [name, screen.slug, description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [screens, searchQuery]);

  const assignedCount = screens.filter((screen) =>
    Boolean(screen.route_screen?.length)
  ).length;

  const toggleScreen = async (screenIdToToggle: number, assigned: boolean) => {
    setTogglingId(screenIdToToggle);

    try {
      const currentIds = screens
        .filter((screen) => Boolean(screen.route_screen?.length))
        .map((screen) => screen.id);

      const nextIds = assigned
        ? currentIds.filter((id) => id !== screenIdToToggle)
        : [...new Set([...currentIds, screenIdToToggle])];

      await request({
        url: `/route/${routeId}/screen`,
        method: 'PATCH',
        data: { ids: nextIds },
      });

      toast.success(assigned ? t('screenRemoved') : t('screenAssigned'));
      await refetch();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          assigned ? t('errorRemovingScreen') : t('errorAssigningScreen')
        )
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loadingScreens')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Layers3 className="h-4 w-4" />
              {t('screensTitle')}
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('screensDescription')}
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full px-2.5 py-1">
            {assignedCount}
          </Badge>
        </div>
      </div>

      <Input
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={t('searchScreens')}
      />

      {filteredScreens.length ? (
        <div className="space-y-2">
          {filteredScreens.map((screen) => {
            const assigned = Boolean(screen.route_screen?.length);
            const label =
              screen.screen_locale?.[0]?.name ?? screen.name ?? screen.slug;
            const description =
              screen.screen_locale?.[0]?.description ??
              screen.description ??
              screen.slug;

            return (
              <div
                key={screen.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  assigned
                    ? 'border-primary/40 bg-primary/5'
                    : 'hover:border-primary/30'
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{label}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {description}
                  </div>
                </div>
                <Switch
                  checked={assigned}
                  disabled={togglingId === screen.id}
                  onCheckedChange={() => toggleScreen(screen.id, assigned)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          className="min-h-52"
          icon={<Layers3 className="h-10 w-10" />}
          title={t('noScreensFound')}
          description={t('screensDescription')}
        />
      )}
    </div>
  );
}

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export default function RoutePage() {
  const t = useTranslations('core.RoutePage');
  const { request, currentLocaleCode } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(ALL_FILTER);
  const [methodFilter, setMethodFilter] = useState<string>(ALL_FILTER);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [page, setPage] = useState(1);
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

  const [pageSize, setPageSize] = usePersistedPageSize({
    storageKey: 'pagination:core-routes:pageSize',
    defaultValue: 12,
    allowedValues: pageSizeOptions,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('basic-info');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const formSchema = z
    .object({
      type: z.enum(['HTTP', 'MCP']),
      url: z.string(),
      method: z.string(),
      tool_name: z.string(),
      name: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.type === 'HTTP') {
        if (!values.url.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['url'],
            message: t('errorUrlRequired'),
          });
        }

        if (!values.method.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['method'],
            message: t('errorMethodRequired'),
          });
        }
      }

      if (values.type === 'MCP' && !values.tool_name.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['tool_name'],
          message: t('errorToolNameRequired'),
        });
      }
    });

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'HTTP',
      url: '',
      method: 'GET',
      tool_name: '',
      name: '',
    },
  });

  const watchedType = form.watch('type');

  const {
    data: routesResponse,
    isLoading,
    refetch,
  } = useQuery<PaginatedResponse<RouteItem>>({
    queryKey: ['routes-admin', currentLocaleCode],
    queryFn: async () => {
      const response = await request<PaginatedResponse<RouteItem>>({
        url: '/route?pageSize=10000',
        method: 'GET',
      });
      return response.data;
    },
  });

  const allRoutes = routesResponse?.data ?? [];

  const filteredRoutes = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return allRoutes.filter((route) => {
      const routeType = normalizeRouteType(route);
      const matchesType = typeFilter === ALL_FILTER || routeType === typeFilter;
      const matchesMethod =
        methodFilter === ALL_FILTER ||
        (route.method || '').toUpperCase() === methodFilter;

      const matchesSearch =
        !normalizedSearch ||
        [
          route.url,
          route.method,
          route.tool_name,
          route.name,
          getRouteTitle(route),
          getRouteSubtitle(route),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
          );

      return matchesType && matchesMethod && matchesSearch;
    });
  }, [allRoutes, methodFilter, searchQuery, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRoutes = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRoutes.slice(start, start + pageSize);
  }, [filteredRoutes, page, pageSize]);

  const routeStats = useMemo(
    () => ({
      total: allRoutes.length,
      http: allRoutes.filter((route) => normalizeRouteType(route) === 'HTTP')
        .length,
      mcp: allRoutes.filter((route) => normalizeRouteType(route) === 'MCP')
        .length,
      filtered: filteredRoutes.length,
    }),
    [allRoutes, filteredRoutes.length]
  );

  const renderRouteBadges = (route: RouteItem) => {
    const roleCount = route.role_route?.length ?? 0;
    const screenCount = route.route_screen?.length ?? 0;

    return (
      <>
        <Badge variant="secondary" className="rounded-full px-2 py-1">
          <ShieldCheck className="mr-1 h-3 w-3" />
          {t('rolesCount', { count: roleCount })}
        </Badge>
        <Badge variant="secondary" className="rounded-full px-2 py-1">
          <Layers3 className="mr-1 h-3 w-3" />
          {t('screensCount', { count: screenCount })}
        </Badge>
        {route.name ? (
          <Badge variant="outline" className="rounded-full px-2 py-1">
            <FileText className="mr-1 h-3 w-3" />
            {route.name}
          </Badge>
        ) : null}
      </>
    );
  };

  const openCreateDialog = () => {
    form.reset({
      type: 'HTTP',
      url: '',
      method: 'GET',
      tool_name: '',
      name: '',
    });
    setFormError(null);
    setEditingRoute(null);
    setActiveTab('basic-info');
    setIsDialogOpen(true);
  };

  const handleEdit = async (route: RouteItem) => {
    setFormError(null);
    form.reset({
      type: normalizeRouteType(route),
      url: route.url ?? '',
      method: route.method ?? 'GET',
      tool_name: route.tool_name ?? '',
      name: route.name ?? '',
    });
    setEditingRoute(route);
    setActiveTab('basic-info');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (values: RouteFormValues) => {
    setSaving(true);
    setFormError(null);

    const payload =
      values.type === 'HTTP'
        ? {
            type: 'HTTP',
            url: values.url.trim(),
            method: values.method,
            tool_name: null,
            name: values.name.trim() || null,
          }
        : {
            type: 'MCP',
            url: null,
            method: null,
            tool_name: values.tool_name.trim(),
            name: values.name.trim() || null,
          };

    try {
      if (editingRoute?.id) {
        await request({
          url: `/route/${editingRoute.id}`,
          method: 'PATCH',
          data: payload,
        });
        toast.success(t('routeUpdatedSuccess'));
      } else {
        await request({
          url: '/route',
          method: 'POST',
          data: payload,
        });
        toast.success(t('routeCreatedSuccess'));
      }

      await refetch();
      setIsDialogOpen(false);
      setEditingRoute(null);
    } catch (error) {
      setFormError(getErrorMessage(error, t('serverError')));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!editingRoute?.id) return;

    try {
      await request({
        url: '/route',
        method: 'DELETE',
        data: {
          ids: [editingRoute.id],
        },
      });

      toast.success(t('routeDeletedSuccess'));
      setOpenDeleteModal(false);
      setIsDialogOpen(false);
      setEditingRoute(null);
      await refetch();
    } catch (error) {
      setFormError(getErrorMessage(error, t('serverError')));
    }
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: t('home'), href: '/' }, { label: t('routes') }]}
        actions={[
          {
            label: t('buttonAddRoute'),
            onClick: openCreateDialog,
            variant: 'default',
            icon: <Plus className="h-4 w-4" />,
          },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <KpiCardsGrid
        columns={4}
        className="mt-3 gap-3"
        cardClassName="shadow-sm"
        items={[
          {
            key: 'total-routes',
            title: t('totalRoutes'),
            value: String(routeStats.total),
            icon: RouteIcon,
            layout: 'compact',
            accentClassName: 'from-blue-500/20 via-sky-500/10 to-transparent',
            iconContainerClassName: 'bg-blue-50 text-blue-600',
          },
          {
            key: 'http-routes',
            title: t('httpRoutes'),
            value: String(routeStats.http),
            icon: Globe,
            layout: 'compact',
            accentClassName:
              'from-emerald-500/20 via-green-500/10 to-transparent',
            iconContainerClassName: 'bg-emerald-50 text-emerald-600',
          },
          {
            key: 'mcp-routes',
            title: t('mcpRoutes'),
            value: String(routeStats.mcp),
            icon: Bot,
            layout: 'compact',
            accentClassName:
              'from-violet-500/20 via-fuchsia-500/10 to-transparent',
            iconContainerClassName: 'bg-violet-50 text-violet-600',
          },
          {
            key: 'filtered-routes',
            title: t('filteredRoutes'),
            value: String(routeStats.filtered),
            icon: Wrench,
            layout: 'compact',
            accentClassName:
              'from-amber-500/20 via-yellow-500/10 to-transparent',
            iconContainerClassName: 'bg-amber-50 text-amber-700',
          },
        ]}
      />

      <SearchBar
        className="mt-4"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearchButton={false}
        placeholder={t('searchPlaceholder')}
        controls={[
          {
            id: 'type-filter',
            type: 'select',
            value: typeFilter,
            onChange: (value) => {
              setTypeFilter(value);
              setPage(1);
            },
            options: [
              { label: t('allTypes'), value: ALL_FILTER },
              { label: 'HTTP', value: 'HTTP' },
              { label: 'MCP', value: 'MCP' },
            ],
            placeholder: t('selectType'),
          },
          {
            id: 'method-filter',
            type: 'select',
            value: methodFilter,
            onChange: (value) => {
              setMethodFilter(value);
              setPage(1);
            },
            options: [
              { label: t('allMethods'), value: ALL_FILTER },
              ...HTTP_METHODS.map((method) => ({
                label: method,
                value: method,
              })),
            ],
            placeholder: t('selectMethod'),
            disabled: typeFilter === 'MCP',
          },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {t('viewMode')}
            </span>
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              cardsLabel={t('viewModeCards')}
              listLabel={t('viewModeList')}
            />
          </div>
        }
      />

      <div className="pt-4">
        {isLoading ? (
          viewMode === 'cards' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card
                  key={`route-skeleton-${index}`}
                  className="animate-pulse rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                >
                  <CardHeader className="space-y-2 p-0">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-48 rounded bg-muted" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`route-list-skeleton-${index}`}
                  className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/40"
                />
              ))}
            </div>
          )
        ) : !paginatedRoutes.length ? (
          <EmptyState
            icon={<RouteIcon className="h-12 w-12" />}
            title={t('noRoutesFound')}
            description={t('emptyDescription')}
            actionLabel={t('buttonAddRoute')}
            onAction={openCreateDialog}
          />
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {paginatedRoutes.map((route) => {
              const routeType = normalizeRouteType(route);

              return (
                <div
                  key={route.id}
                  className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm transition hover:border-primary hover:shadow-md md:flex-row md:items-center md:justify-between"
                  onClick={() => void handleEdit(route)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-full px-2 py-0.5',
                          routeType === 'MCP'
                            ? 'border-violet-200 bg-violet-50 text-violet-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        )}
                      >
                        {routeType}
                      </Badge>

                      {routeType === 'HTTP' ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full px-2 py-0.5',
                            getMethodBadgeClass(route.method)
                          )}
                        >
                          {route.method}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="truncate text-sm font-semibold">
                      {getRouteTitle(route)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {getRouteSubtitle(route)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {renderRouteBadges(route)}
                    </div>
                  </div>

                  <div className="flex shrink-0 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleEdit(route);
                      }}
                    >
                      {t('buttonEditRoute')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            {paginatedRoutes.map((route) => {
              const routeType = normalizeRouteType(route);

              return (
                <Card
                  key={route.id}
                  className="cursor-pointer rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary hover:shadow-md"
                  onClick={() => void handleEdit(route)}
                >
                  <CardHeader className="flex items-start justify-between gap-4 p-0">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full px-2 py-0.5',
                            routeType === 'MCP'
                              ? 'border-violet-200 bg-violet-50 text-violet-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          )}
                        >
                          {routeType}
                        </Badge>

                        {routeType === 'HTTP' ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'rounded-full px-2 py-0.5',
                              getMethodBadgeClass(route.method)
                            )}
                          >
                            {route.method}
                          </Badge>
                        ) : null}
                      </div>

                      <CardTitle className="truncate text-sm font-semibold">
                        {getRouteTitle(route)}
                      </CardTitle>
                      <CardDescription className="mt-1 truncate text-xs text-muted-foreground">
                        {getRouteSubtitle(route)}
                      </CardDescription>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleEdit(route);
                      }}
                    >
                      {t('buttonEditRoute')}
                    </Button>
                  </CardHeader>

                  <CardContent className="mt-4 flex flex-wrap gap-2 p-0">
                    {renderRouteBadges(route)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 w-full border-t pt-2">
        <PaginationFooter
          currentPage={page}
          pageSize={pageSize}
          totalItems={filteredRoutes.length}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
          pageSizeOptions={pageSizeOptions}
        />
      </div>

      <Sheet
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingRoute(null);
            setFormError(null);
          }
        }}
      >
        <ResizableSheetContent
          sheetId="core-routes-form-sheet"
          defaultWidth={920}
          minWidth={620}
          maxWidth={1320}
          className="w-full gap-0 overflow-y-auto sm:max-w-3xl"
        >
          <SheetHeader>
            <SheetTitle>
              {editingRoute ? t('titleEditRoute') : t('dialogAddRouteTitle')}
            </SheetTitle>
            <SheetDescription>
              {editingRoute
                ? getRouteTitle(editingRoute)
                : t('dialogAddRouteDescription')}
            </SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className={cn(
                'grid w-full rounded-md bg-muted text-sm text-muted-foreground',
                editingRoute ? 'grid-cols-3' : 'grid-cols-1'
              )}
            >
              <TabsTrigger value="basic-info" className="gap-2">
                <FileText className="h-4 w-4" />
                <span>{t('tabBasicInfo')}</span>
              </TabsTrigger>
              {editingRoute ? (
                <TabsTrigger value="roles" className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t('tabRoles')}</span>
                </TabsTrigger>
              ) : null}
              {editingRoute ? (
                <TabsTrigger value="screens" className="gap-2">
                  <Layers3 className="h-4 w-4" />
                  <span>{t('tabScreens')}</span>
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent
              value="basic-info"
              className="mt-4 space-y-4 px-4 pb-4"
            >
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{t('basicInfoTitle')}</h4>
                <p className="text-xs text-muted-foreground">
                  {t('basicInfoDescription')}
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('formTypeLabel')}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange(value as RouteType)
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="HTTP">HTTP</SelectItem>
                            <SelectItem value="MCP">MCP</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedType === 'HTTP' ? (
                    <>
                      <FormField
                        control={form.control}
                        name="url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('formUrlLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('formUrlPlaceholder')}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('formMethodLabel')}</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {HTTP_METHODS.map((method) => (
                                  <SelectItem key={method} value={method}>
                                    {method}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="tool_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('formToolNameLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('formToolNamePlaceholder')}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('formNameLabel')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('formNamePlaceholder')}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {watchedType === 'HTTP' ? (
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('formOptionalNameLabel')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('formOptionalNamePlaceholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {formError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {formError}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                    {editingRoute ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setOpenDeleteModal(true)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        {t('buttonDeleteRoute')}
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t('cancel')}
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-1 h-4 w-4" />
                      )}
                      {t('saveChanges')}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {editingRoute ? (
              <TabsContent value="roles" className="mt-4 space-y-4 px-4 pb-4">
                <RouteRolesSection routeId={editingRoute.id} />
              </TabsContent>
            ) : null}

            {editingRoute ? (
              <TabsContent value="screens" className="mt-4 space-y-4 px-4 pb-4">
                <RouteScreensSection routeId={editingRoute.id} />
              </TabsContent>
            ) : null}
          </Tabs>
        </ResizableSheetContent>
      </Sheet>

      <AlertDialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogDeleteRouteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogDeleteRouteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteRouteCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>
              {t('deleteRouteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
