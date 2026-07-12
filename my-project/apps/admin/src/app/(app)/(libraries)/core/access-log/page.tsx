'use client';

import { BrowserIcon, CountryFlag, OsIcon } from '@/components/browser-os-icon';
import {
  EmptyState,
  Page,
  PageHeader,
  PaginationFooter,
  SearchBar,
  type SearchBarControl,
} from '@/components/entity-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EntityPicker } from '@/components/ui/entity-picker';
import { KpiCardsGrid, type KpiCardItem } from '@/components/ui/kpi-cards-grid';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { formatDateTime } from '@/lib/format-date';
import { getPhotoUrl } from '@/lib/get-photo-url';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import {
  Activity,
  Clock,
  Globe,
  LayoutGrid,
  List,
  Pause,
  Play,
  Terminal,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { UserSheet } from '../users/user-sheet';

type AccessLog = {
  id: number;
  user_id: number | null;
  ip: string | null;
  user_agent: string | null;
  method: string | null;
  path: string | null;
  mcp_tool: string | null;
  mcp_prompt: string | null;
  created_at: string;
  user: { id: number; name: string; photo_id: number | null } | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  country: string | null;
  city: string | null;
};

type PaginationResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

type UserPickerOption = { id: number; name: string; photoId: number | null };
type TypeFilter = 'all' | 'http' | 'mcp';
type ViewMode = 'table' | 'cards';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  POST: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PATCH:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function MethodBadge({ method }: { method: string | null }) {
  if (!method) return null;
  const cls =
    METHOD_COLORS[method.toUpperCase()] ?? 'bg-gray-100 text-gray-800';
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {method.toUpperCase()}
    </span>
  );
}

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export default function AccessLogPage() {
  const t = useTranslations('core.AccessLog');
  const { request, getSettingValue } = useApp();

  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isUserSheetOpen, setIsUserSheetOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [createdAtFrom, setCreatedAtFrom] = useState('');
  const [createdAtTo, setCreatedAtTo] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isLive, setIsLive] = useState(true);
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
    storageKey: 'pagination:global:pageSize',
    defaultValue: 12,
    allowedValues: pageSizeOptions,
  });

  const debouncedSearch = useDebounce(searchTerm);

  const {
    data: logsResult,
    isLoading,
    refetch,
  } = useQuery<PaginationResult<AccessLog>>({
    queryKey: [
      'access-log',
      debouncedSearch,
      filterUserId,
      typeFilter,
      createdAtFrom,
      createdAtTo,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const response = await request({
        url: '/access-log',
        params: {
          search: debouncedSearch || undefined,
          userId: filterUserId || undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          createdAtFrom: createdAtFrom || undefined,
          createdAtTo: createdAtTo || undefined,
          page,
          pageSize,
        },
      });
      return response.data as PaginationResult<AccessLog>;
    },
    refetchInterval: isLive ? 3000 : false,
  });

  const { data: logs = [], total = 0 } = logsResult ?? {};

  const hasActiveFilters =
    searchTerm.length > 0 ||
    filterUserId !== null ||
    typeFilter !== 'all' ||
    createdAtFrom.length > 0 ||
    createdAtTo.length > 0;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterUserId(null);
    setTypeFilter('all');
    setCreatedAtFrom('');
    setCreatedAtTo('');
    setPage(1);
  };

  const searchControls = useMemo<SearchBarControl[]>(
    () => [
      {
        id: 'type',
        type: 'select',
        value: typeFilter,
        onChange: (value) => {
          setTypeFilter(value as TypeFilter);
          setPage(1);
        },
        placeholder: t('filterByType'),
        options: [
          { value: 'all', label: t('typeAll') },
          { value: 'http', label: t('typeHttp') },
          { value: 'mcp', label: t('typeMcp') },
        ],
      },
      {
        id: 'created-at-from',
        type: 'date',
        value: createdAtFrom,
        onChange: (value) => {
          setCreatedAtFrom(value);
          setPage(1);
        },
        max: createdAtTo || undefined,
      },
      {
        id: 'created-at-to',
        type: 'date',
        value: createdAtTo,
        onChange: (value) => {
          setCreatedAtTo(value);
          setPage(1);
        },
        min: createdAtFrom || undefined,
      },
    ],
    [createdAtFrom, createdAtTo, typeFilter, t]
  );

  const kpiCards = useMemo<KpiCardItem[]>(() => {
    const httpCount = logs.filter((l) => l.method).length;
    const mcpCount = logs.filter((l) => l.mcp_tool).length;
    const uniqueUsers = new Set(logs.map((l) => l.user_id).filter(Boolean))
      .size;
    return [
      {
        key: 'total',
        title: t('totalLogs'),
        value: total,
        icon: Activity,
        layout: 'compact',
        accentClassName: 'from-sky-500 via-cyan-400 to-blue-500',
        iconContainerClassName:
          'bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300',
      },
      {
        key: 'http',
        title: t('httpRequests'),
        value: httpCount,
        icon: Globe,
        layout: 'compact',
        accentClassName: 'from-emerald-500 via-teal-400 to-cyan-500',
        iconContainerClassName:
          'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300',
      },
      {
        key: 'mcp',
        title: t('mcpCalls'),
        value: mcpCount,
        icon: Terminal,
        layout: 'compact',
        accentClassName: 'from-violet-500 via-fuchsia-400 to-pink-500',
        iconContainerClassName:
          'bg-violet-500/15 text-violet-700 ring-1 ring-violet-500/20 dark:text-violet-300',
      },
      {
        key: 'users',
        title: t('uniqueUsers'),
        value: uniqueUsers,
        icon: Users,
        layout: 'compact',
        accentClassName: 'from-amber-500 via-orange-400 to-rose-500',
        iconContainerClassName:
          'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300',
      },
    ];
  }, [logs, total, t]);

  const truncate = (text: string | null, max = 60) => {
    if (!text) return '—';
    return text.length > max ? text.slice(0, max) + '…' : text;
  };

  const getUserInitials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  const handleOpenUser = (userId: number) => {
    setSelectedUserId(userId);
    setIsUserSheetOpen(true);
  };

  const renderUserCell = (log: AccessLog) => {
    if (!log.user) {
      return (
        <span className="text-xs text-muted-foreground">{t('anonymous')}</span>
      );
    }
    return (
      <button
        type="button"
        className="flex items-center gap-2 hover:opacity-80"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenUser(log.user!.id);
        }}
        title={log.user.name}
      >
        <Avatar className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
          <AvatarImage
            src={getPhotoUrl(log.user.photo_id)}
            alt={log.user.name}
          />
          <AvatarFallback className="flex h-full w-full items-center justify-center bg-muted text-[10px] font-medium">
            {getUserInitials(log.user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-30 truncate text-sm">{log.user.name}</span>
      </button>
    );
  };

  const renderPathOrTool = (log: AccessLog) => {
    if (log.mcp_tool) {
      return (
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-mono">
            {truncate(log.mcp_tool, 40)}
          </span>
        </div>
      );
    }
    return (
      <span className="max-w-65 truncate text-xs font-mono">
        {truncate(log.path, 60)}
      </span>
    );
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: t('breadcrumbHome'), href: '/' },
          { label: t('breadcrumbTitle') },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <KpiCardsGrid items={kpiCards} className="mb-1" />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="flex-1">
          <SearchBar
            searchQuery={searchTerm}
            onSearchChange={(v) => {
              setSearchTerm(v);
              setPage(1);
            }}
            onSearch={() => setPage(1)}
            placeholder={t('searchPlaceholder')}
            controls={searchControls}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          <EntityPicker<UserPickerOption>
            placeholder={t('userPickerPlaceholder')}
            emptySelectionLabel={t('userPickerPlaceholder')}
            searchPlaceholder={t('userPickerSearch')}
            clearable
            allowEmptySelection
            value={filterUserId !== null ? String(filterUserId) : ''}
            onChange={(val) => {
              setFilterUserId(val ? Number(val) : null);
              setPage(1);
            }}
            getOptionValue={(o) => o.id}
            getOptionLabel={(o) => o.name}
            loadOptions={async ({ page, pageSize, search }) => {
              const params = new URLSearchParams();
              params.set('page', String(page));
              params.set('pageSize', String(pageSize));
              if (search.trim()) params.set('search', search.trim());
              const res = await request<{
                paginate: {
                  data: Array<{
                    id: number;
                    name: string | null;
                    photo_id: number | null;
                  }>;
                  lastPage: number;
                  page: number;
                };
              }>({ url: `/user?${params.toString()}` });
              const raw = res.data?.paginate?.data ?? [];
              return {
                items: raw.map((u) => ({
                  id: u.id,
                  name: u.name || `#${u.id}`,
                  photoId: u.photo_id ?? null,
                })),
                hasMore:
                  (res.data?.paginate?.page ?? 1) <
                  (res.data?.paginate?.lastPage ?? 1),
              };
            }}
            pageSize={10}
            renderOption={({ option }) => (
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
                  <AvatarImage
                    src={getPhotoUrl(option.photoId)}
                    alt={option.name}
                  />
                  <AvatarFallback className="flex h-full w-full items-center justify-center bg-muted text-[10px] font-medium">
                    {getUserInitials(option.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{option.name}</span>
              </div>
            )}
            renderSelectedValue={({ option, label }) =>
              option ? (
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
                    <AvatarImage
                      src={getPhotoUrl(option.photoId)}
                      alt={option.name}
                    />
                    <AvatarFallback className="flex h-full w-full items-center justify-center bg-muted text-[10px] font-medium">
                      {getUserInitials(option.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{label}</span>
                </span>
              ) : (
                label
              )
            }
            className="sm:w-52"
          />

          <Button
            variant={isLive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsLive((v) => !v)}
            className="gap-1.5"
          >
            {isLive ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                {t('pauseUpdates')}
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                {t('resumeUpdates')}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            {t('clearFilters')}
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('viewMode')}
            </span>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => {
                if (v === 'table' || v === 'cards') setViewMode(v);
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem
                value="table"
                className="gap-1.5 px-2.5"
                aria-label={t('viewModeTable')}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">{t('viewModeTable')}</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="cards"
                className="gap-1.5 px-2.5"
                aria-label={t('viewModeCards')}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">{t('viewModeCards')}</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        {!isLoading && logs.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-12 w-12" />}
            title={t('noLogsFound')}
            description={hasActiveFilters ? t('adjustSearch') : t('noLogsYet')}
            actionLabel={
              hasActiveFilters ? t('clearFilters') : t('refreshList')
            }
            onAction={() => (hasActiveFilters ? clearFilters() : refetch())}
          />
        ) : isLoading ? (
          <Card className="py-0">
            <CardContent className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              {t('loadingLogs')}
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#{t('id')}</TableHead>
                  <TableHead>{t('user')}</TableHead>
                  <TableHead>{t('ip')}</TableHead>
                  <TableHead>{t('browser')}</TableHead>
                  <TableHead>{t('os')}</TableHead>
                  <TableHead>{t('location')}</TableHead>
                  <TableHead>{t('method')}</TableHead>
                  <TableHead>{t('path')}</TableHead>
                  <TableHead>{t('createdAt')}</TableHead>
                  <TableHead className="w-24 text-right">
                    {t('actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer"
                    onDoubleClick={() => {
                      setSelectedLog(log);
                      setIsDetailOpen(true);
                    }}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      #{log.id}
                    </TableCell>
                    <TableCell>{renderUserCell(log)}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {log.ip ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.browser_name ? (
                        <span className="flex items-center gap-1">
                          <BrowserIcon
                            name={log.browser_name}
                            size={12}
                            className="shrink-0"
                          />
                          {log.browser_name}
                          {log.browser_version
                            ? ` ${log.browser_version.split('.')[0]}`
                            : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.os_name ? (
                        <span className="flex items-center gap-1">
                          <OsIcon
                            name={log.os_name}
                            size={11}
                            className="shrink-0"
                          />
                          {log.os_name}
                          {log.os_version ? ` ${log.os_version}` : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.country ? (
                        <span className="flex items-center gap-1">
                          <CountryFlag code={log.country} width={20} />
                          {[log.city, log.country].filter(Boolean).join(', ')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {log.method ? (
                        <MethodBadge method={log.method} />
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          MCP
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{renderPathOrTool(log)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(log.created_at, getSettingValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                          setIsDetailOpen(true);
                        }}
                      >
                        {t('viewDetails')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          logs.map((log) => (
            <Card
              key={log.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onDoubleClick={() => {
                setSelectedLog(log);
                setIsDetailOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {renderUserCell(log)}
                      <Badge variant="outline" className="text-xs">
                        #{log.id}
                      </Badge>
                      {log.method ? (
                        <MethodBadge method={log.method} />
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          MCP
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {log.ip && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5" />
                          {log.ip}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono">
                        {renderPathOrTool(log)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(log.created_at, getSettingValue)}
                      </span>
                    </div>
                    {(log.browser_name || log.os_name || log.country) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {log.browser_name && (
                          <span className="flex items-center gap-1">
                            <BrowserIcon
                              name={log.browser_name}
                              size={12}
                              className="shrink-0"
                            />
                            {log.browser_name}
                            {log.browser_version
                              ? ` ${log.browser_version.split('.')[0]}`
                              : ''}
                          </span>
                        )}
                        {log.os_name && (
                          <span className="flex items-center gap-1">
                            <OsIcon
                              name={log.os_name}
                              size={12}
                              className="shrink-0"
                            />
                            {log.os_name}
                          </span>
                        )}
                        {log.country && (
                          <span className="flex items-center gap-1">
                            <CountryFlag code={log.country} width={20} />
                            {[log.city, log.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLog(log);
                      setIsDetailOpen(true);
                    }}
                  >
                    {t('viewDetails')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <PaginationFooter
        currentPage={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        pageSizeOptions={pageSizeOptions}
      />

      {selectedLog && (
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <ResizableSheetContent
            sheetId="core-access-log-detail-sheet"
            defaultWidth={640}
            minWidth={460}
            maxWidth={980}
            className="w-full overflow-y-auto sm:max-w-xl"
          >
            <SheetHeader>
              <SheetTitle>{t('logDetails')}</SheetTitle>
              <SheetDescription>{t('detailsDescription')}</SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-9rem)] px-4 pb-4">
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">{t('id')}</h4>
                    <p className="rounded-md bg-muted p-2 text-sm">
                      #{selectedLog.id}
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">
                      {t('createdAt')}
                    </h4>
                    <p className="rounded-md bg-muted p-2 text-sm">
                      {formatDateTime(selectedLog.created_at, getSettingValue)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-1 text-sm font-semibold">{t('user')}</h4>
                  <div className="rounded-md bg-muted p-2">
                    {selectedLog.user ? (
                      <button
                        type="button"
                        className="flex cursor-pointer items-center gap-2 hover:opacity-80"
                        onClick={() => handleOpenUser(selectedLog.user!.id)}
                      >
                        <Avatar className="h-7 w-7 overflow-hidden rounded-full">
                          <AvatarImage
                            src={getPhotoUrl(selectedLog.user.photo_id)}
                            alt={selectedLog.user.name}
                          />
                          <AvatarFallback className="flex h-full w-full items-center justify-center bg-muted-foreground/20 text-xs font-medium">
                            {getUserInitials(selectedLog.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium underline underline-offset-2">
                          {selectedLog.user.name}
                        </span>
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {t('anonymous')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">{t('ip')}</h4>
                    <p className="rounded-md bg-muted p-2 text-sm font-mono">
                      {selectedLog.ip ?? '—'}
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">
                      {t('method')}
                    </h4>
                    <div className="rounded-md bg-muted p-2">
                      {selectedLog.method ? (
                        <MethodBadge method={selectedLog.method} />
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          MCP
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedLog.path && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">{t('path')}</h4>
                    <p className="rounded-md bg-muted p-2 text-sm font-mono break-all">
                      {selectedLog.path}
                    </p>
                  </div>
                )}

                {selectedLog.mcp_tool && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">{t('tool')}</h4>
                    <p className="rounded-md bg-muted p-2 text-sm font-mono">
                      {selectedLog.mcp_tool}
                    </p>
                  </div>
                )}

                {selectedLog.mcp_prompt && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">
                      {t('prompt')}
                    </h4>
                    <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs font-mono whitespace-pre-wrap break-all">
                      {selectedLog.mcp_prompt}
                    </pre>
                  </div>
                )}

                {(selectedLog.browser_name ||
                  selectedLog.os_name ||
                  selectedLog.country) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.browser_name && (
                      <div>
                        <h4 className="mb-1 text-sm font-semibold">
                          {t('browser')}
                        </h4>
                        <p className="flex items-center gap-1.5 rounded-md bg-muted p-2 text-sm">
                          <BrowserIcon
                            name={selectedLog.browser_name}
                            size={16}
                            className="shrink-0 text-muted-foreground"
                          />
                          {selectedLog.browser_name}
                          {selectedLog.browser_version
                            ? ` ${selectedLog.browser_version}`
                            : ''}
                        </p>
                      </div>
                    )}
                    {selectedLog.os_name && (
                      <div>
                        <h4 className="mb-1 text-sm font-semibold">
                          {t('os')}
                        </h4>
                        <p className="flex items-center gap-1.5 rounded-md bg-muted p-2 text-sm">
                          <OsIcon
                            name={selectedLog.os_name}
                            size={15}
                            className="shrink-0 text-muted-foreground"
                          />
                          {selectedLog.os_name}
                          {selectedLog.os_version
                            ? ` ${selectedLog.os_version}`
                            : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedLog.country && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">
                      {t('location')}
                    </h4>
                    <p className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
                      <CountryFlag code={selectedLog.country} width={28} />
                      {[selectedLog.city, selectedLog.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <details className="group">
                    <summary className="mb-1 cursor-pointer select-none text-sm font-semibold text-muted-foreground group-open:text-foreground">
                      {t('rawUserAgent')}
                    </summary>
                    <p className="rounded-md bg-muted p-2 text-xs break-all">
                      {selectedLog.user_agent}
                    </p>
                  </details>
                )}
              </div>
            </ScrollArea>
          </ResizableSheetContent>
        </Sheet>
      )}

      <UserSheet
        open={isUserSheetOpen}
        onOpenChange={setIsUserSheetOpen}
        userId={selectedUserId}
      />
    </Page>
  );
}
