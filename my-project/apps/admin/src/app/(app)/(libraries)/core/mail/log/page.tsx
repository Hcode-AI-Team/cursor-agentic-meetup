'use client';

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
import { Input } from '@/components/ui/input';
import { KpiCardsGrid, type KpiCardItem } from '@/components/ui/kpi-cards-grid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
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
import { formatDate } from '@/lib/format-date';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  LayoutGrid,
  List,
  Mail,
  TriangleAlert,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type PaginationResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

type MailSent = {
  id: number;
  mail_id: number;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  body: string;
  created_at: string;
  updated_at: string;
  mail_sent_user?: MailSentRecipientLog[];
  deliverySummary?: MailDeliverySummary;
};

type MailSentRecipientLog = {
  id: number;
  recipient_email: string;
  status: 'received' | 'read' | 'error';
  read_at?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  user_id: number;
  user_identifier_id?: number | null;
  created_at: string;
  updated_at: string;
};

type MailDeliverySummary = {
  totalRecipients: number;
  receivedCount: number;
  readCount: number;
  errorCount: number;
  hasError: boolean;
  lastReadAt?: string | null;
};

type DeliveryStatusFilter = 'all' | 'received' | 'read' | 'error';
type HasErrorFilter = 'all' | 'true' | 'false';
type ViewMode = 'cards' | 'table';

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export default function MailLogPage() {
  const t = useTranslations('core.MailLog');
  const [selectedLog, setSelectedLog] = useState<MailSent | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>('all');
  const [hasErrorFilter, setHasErrorFilter] = useState<HasErrorFilter>('all');
  const [createdAtFrom, setCreatedAtFrom] = useState('');
  const [createdAtTo, setCreatedAtTo] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const debouncedSearch = useDebounce(searchTerm);
  const debouncedRecipientEmail = useDebounce(recipientEmail);
  const { request, getSettingValue } = useApp();

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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize({
    storageKey: 'pagination:global:pageSize',
    defaultValue: 12,
    allowedValues: pageSizeOptions,
  });

  const {
    data: logsResult,
    refetch: refetchLogs,
    isLoading,
  } = useQuery<PaginationResult<MailSent>>({
    queryKey: [
      'mail-sent',
      debouncedSearch,
      debouncedRecipientEmail,
      statusFilter,
      hasErrorFilter,
      createdAtFrom,
      createdAtTo,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const response = await request({
        url: '/mail-sent',
        params: {
          search: debouncedSearch,
          recipientEmail: debouncedRecipientEmail || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          hasError: hasErrorFilter !== 'all' ? hasErrorFilter : undefined,
          createdAtFrom: createdAtFrom || undefined,
          createdAtTo: createdAtTo || undefined,
          page,
          pageSize,
        },
      });
      return response.data as PaginationResult<MailSent>;
    },
  });
  const { data: logs = [], total = 0 } = logsResult ?? {};

  const handleViewDetails = (log: MailSent): void => {
    setSelectedLog(log);
    setIsDetailSheetOpen(true);
  };

  const handleSearchChange = (value: string): void => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleRecipientEmailChange = (value: string): void => {
    setRecipientEmail(value);
    setPage(1);
  };

  const hasActiveFilters =
    searchTerm.length > 0 ||
    recipientEmail.length > 0 ||
    statusFilter !== 'all' ||
    hasErrorFilter !== 'all' ||
    createdAtFrom.length > 0 ||
    createdAtTo.length > 0;

  const clearFilters = (): void => {
    setSearchTerm('');
    setRecipientEmail('');
    setStatusFilter('all');
    setHasErrorFilter('all');
    setCreatedAtFrom('');
    setCreatedAtTo('');
    setPage(1);
  };

  const searchControls = useMemo<SearchBarControl[]>(
    () => [
      {
        id: 'status',
        type: 'select',
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as DeliveryStatusFilter);
          setPage(1);
        },
        placeholder: t('filterByStatus'),
        options: [
          { value: 'all', label: t('statusAll') },
          { value: 'received', label: t('statusReceived') },
          { value: 'read', label: t('statusRead') },
          { value: 'error', label: t('statusError') },
        ],
      },
      {
        id: 'has-error',
        type: 'select',
        value: hasErrorFilter,
        onChange: (value) => {
          setHasErrorFilter(value as HasErrorFilter);
          setPage(1);
        },
        placeholder: t('filterByError'),
        options: [
          { value: 'all', label: t('errorAll') },
          { value: 'true', label: t('errorOnly') },
          { value: 'false', label: t('errorNone') },
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
    [createdAtFrom, createdAtTo, hasErrorFilter, statusFilter, t]
  );

  const summary = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        const deliverySummary = log.deliverySummary;
        acc.totalRecipients += deliverySummary?.totalRecipients ?? 0;
        acc.readCount += deliverySummary?.readCount ?? 0;
        acc.errorCount += deliverySummary?.errorCount ?? 0;
        if (deliverySummary?.hasError) {
          acc.emailsWithError += 1;
        }
        return acc;
      },
      {
        totalRecipients: 0,
        readCount: 0,
        errorCount: 0,
        emailsWithError: 0,
      }
    );
  }, [logs]);

  const kpiCards = useMemo<KpiCardItem[]>(
    () => [
      {
        key: 'totalEmails',
        title: t('totalEmails'),
        value: total,
        icon: Mail,
        layout: 'compact',
      },
      {
        key: 'totalRecipients',
        title: t('totalRecipientsCurrentPage'),
        value: summary.totalRecipients,
        icon: Inbox,
        layout: 'compact',
      },
      {
        key: 'readRecipients',
        title: t('readRecipientsCurrentPage'),
        value: summary.readCount,
        icon: Eye,
        layout: 'compact',
      },
      {
        key: 'emailsWithError',
        title: t('emailsWithErrorCurrentPage'),
        value: summary.emailsWithError,
        icon: TriangleAlert,
        layout: 'compact',
      },
    ],
    [
      summary.emailsWithError,
      summary.readCount,
      summary.totalRecipients,
      t,
      total,
    ]
  );

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (!text) return '';
    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
  };

  const renderDeliveryBadges = (deliverySummary?: MailDeliverySummary) => {
    if (!deliverySummary) {
      return <Badge variant="outline">{t('statusUnavailable')}</Badge>;
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {t('statusReceivedShort', { count: deliverySummary.receivedCount })}
        </Badge>
        <Badge variant="outline">
          {t('statusReadShort', { count: deliverySummary.readCount })}
        </Badge>
        <Badge
          variant={deliverySummary.errorCount > 0 ? 'destructive' : 'outline'}
        >
          {t('statusErrorShort', { count: deliverySummary.errorCount })}
        </Badge>
      </div>
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
            onSearchChange={handleSearchChange}
            onSearch={() => setPage(1)}
            placeholder={t('searchPlaceholder')}
            controls={searchControls}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          <Input
            value={recipientEmail}
            onChange={(event) => handleRecipientEmailChange(event.target.value)}
            placeholder={t('recipientPlaceholder')}
            className="sm:w-64"
          />

          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            {t('clearFilters')}
          </Button>

          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <span className="text-xs font-medium text-muted-foreground">
              {t('viewMode')}
            </span>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value === 'cards' || value === 'table') {
                  setViewMode(value);
                }
              }}
              variant="outline"
              size="sm"
              aria-label={t('viewMode')}
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

      <div className="space-y-3 mb-4">
        {!isLoading && logs.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-12 w-12" />}
            title={t('noLogsFound')}
            description={
              hasActiveFilters ? t('adjustSearch') : t('noEmailsSent')
            }
            actionLabel={
              hasActiveFilters ? t('clearFilters') : t('refreshList')
            }
            onAction={() => {
              if (hasActiveFilters) {
                clearFilters();
                return;
              }

              refetchLogs();
            }}
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
                  <TableHead>#{t('id')}</TableHead>
                  <TableHead>{t('subject')}</TableHead>
                  <TableHead>{t('from')}</TableHead>
                  <TableHead>{t('to')}</TableHead>
                  <TableHead>{t('delivery')}</TableHead>
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
                    onDoubleClick={() => handleViewDetails(log)}
                  >
                    <TableCell>#{log.id}</TableCell>
                    <TableCell className="max-w-72 truncate font-medium">
                      {log.subject}
                    </TableCell>
                    <TableCell className="max-w-52 truncate">
                      {log.from}
                    </TableCell>
                    <TableCell className="max-w-64 truncate">
                      {log.to}
                    </TableCell>
                    <TableCell>
                      {renderDeliveryBadges(log.deliverySummary)}
                    </TableCell>
                    <TableCell>
                      {formatDate(log.created_at, getSettingValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleViewDetails(log);
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
              onDoubleClick={() => handleViewDetails(log)}
              className="cursor-pointer transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{log.subject}</h3>
                      <Badge variant="outline">#{log.id}</Badge>
                      {log.deliverySummary?.hasError ? (
                        <Badge variant="destructive">{t('hasError')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('withoutError')}</Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          {t('from')}: {log.from}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>
                          {t('to')}: {truncateText(log.to, 50)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatDate(log.created_at, getSettingValue)}
                        </span>
                      </div>
                    </div>
                    {renderDeliveryBadges(log.deliverySummary)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(log);
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
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        pageSizeOptions={pageSizeOptions}
      />

      {selectedLog && (
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
          <ResizableSheetContent sheetId="mail-log-detail" defaultWidth={672}>
            <SheetHeader>
              <SheetTitle>{t('emailDetails')}</SheetTitle>
              <SheetDescription>{t('detailsDescription')}</SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-9rem)] px-4 pb-4">
              <div className="space-y-4 py-2">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">{t('subject')}</h4>
                  <p className="rounded-md bg-muted p-3 text-sm">
                    {selectedLog.subject}
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">{t('from')}</h4>
                  <p className="rounded-md bg-muted p-3 text-sm">
                    {selectedLog.from}
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">{t('to')}</h4>
                  <p className="rounded-md bg-muted p-3 text-sm">
                    {selectedLog.to}
                  </p>
                </div>
                {selectedLog.cc && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">{t('cc')}</h4>
                    <p className="rounded-md bg-muted p-3 text-sm">
                      {selectedLog.cc}
                    </p>
                  </div>
                )}
                {selectedLog.bcc && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">{t('bcc')}</h4>
                    <p className="rounded-md bg-muted p-3 text-sm">
                      {selectedLog.bcc}
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">{t('body')}</h4>
                  <div
                    className="rounded-md bg-muted p-3 text-sm"
                    dangerouslySetInnerHTML={{ __html: selectedLog.body }}
                  />
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold">
                    {t('delivery')}
                  </h4>
                  <div className="rounded-md border p-3">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {renderDeliveryBadges(selectedLog.deliverySummary)}
                      <Badge variant="outline">
                        {t('totalRecipientsLabel', {
                          count:
                            selectedLog.deliverySummary?.totalRecipients ?? 0,
                        })}
                      </Badge>
                    </div>

                    {selectedLog.mail_sent_user &&
                    selectedLog.mail_sent_user.length > 0 ? (
                      <div className="space-y-2">
                        {selectedLog.mail_sent_user.map((recipient) => (
                          <div
                            key={recipient.id}
                            className="rounded-md border border-border/60 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-medium">
                                {recipient.recipient_email}
                              </div>
                              <Badge
                                variant={
                                  recipient.status === 'error'
                                    ? 'destructive'
                                    : 'outline'
                                }
                              >
                                {t(`status_${recipient.status}` as never)}
                              </Badge>
                            </div>

                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              {recipient.read_at ? (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>
                                    {t('readAt')}:{' '}
                                    {formatDate(
                                      recipient.read_at,
                                      getSettingValue
                                    )}
                                  </span>
                                </div>
                              ) : null}

                              {recipient.error_message ? (
                                <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
                                  <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                                  <span>
                                    {t('errorMessage')}:{' '}
                                    {recipient.error_message}
                                    {recipient.error_code
                                      ? ` (${recipient.error_code})`
                                      : ''}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('noRecipientStatus')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">
                      {t('createdAt')}
                    </h4>
                    <p className="rounded-md bg-muted p-3 text-sm">
                      {formatDate(selectedLog.created_at, getSettingValue)}
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">
                      {t('updatedAt')}
                    </h4>
                    <p className="rounded-md bg-muted p-3 text-sm">
                      {formatDate(selectedLog.updated_at, getSettingValue)}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </ResizableSheetContent>
        </Sheet>
      )}
    </Page>
  );
}
