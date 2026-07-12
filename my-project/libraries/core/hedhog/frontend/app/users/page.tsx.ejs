'use client';

import {
  EmptyState,
  Page,
  PageHeader,
  PaginationFooter,
  SearchBar,
} from '@/components/entity-list';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { KpiCardsGrid } from '@/components/ui/kpi-cards-grid';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { getPhotoUrl } from '@/lib/get-photo-url';
import { getUserEmail } from '@/lib/get-user-email';
import { PaginatedResult } from '@/types/pagination-result';
import { User, UserMfa } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  LayoutGrid,
  List,
  Mail,
  Pencil,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { UserSheet } from './user-sheet';

const USER_VIEW_STORAGE_KEY = 'core-user-view-mode';
type UserViewMode = 'table' | 'cards';

type RequestResponse<T> = {
  paginate: PaginatedResult<T>;
  stats: {
    total: number;
    newLast7Days: number;
    blocked: number;
  };
};

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export default function UserPage() {
  const t = useTranslations('core.UserPage');
  const { request, currentLocaleCode } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<UserViewMode>('table');

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
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(USER_VIEW_STORAGE_KEY);
      if (saved === 'table' || saved === 'cards') setViewMode(saved);
    } catch {
      // Ignore storage read failures.
    }
  }, []);

  const handleViewModeChange = (value: string) => {
    if (value !== 'table' && value !== 'cards') return;
    setViewMode(value);
    try {
      window.localStorage.setItem(USER_VIEW_STORAGE_KEY, value);
    } catch {
      // Ignore storage write failures.
    }
  };

  const {
    data: { paginate, stats } = {
      paginate: {},
      stats: { total: 0, newLast7Days: 0, blocked: 0 },
    },
    isLoading,
    refetch,
  } = useQuery<RequestResponse<User>>({
    queryKey: [
      'users',
      page,
      pageSize,
      searchQuery,
      statusFilter,
      currentLocaleCode,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter && statusFilter !== 'all')
        params.set('filter', statusFilter);

      const response = await request<RequestResponse<User>>({
        url: `/user?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
  });

  const handleOpenCreate = () => {
    setSelectedUserId(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUserId(Number(user.id));
    setIsSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) setSelectedUserId(null);
  };

  const statsCards = useMemo(
    () => [
      {
        key: 'total',
        title: t('totalUsers'),
        value: stats?.total ?? 0,
        icon: Users,
        accentClassName: 'from-purple-500/20 via-purple-400/10 to-transparent',
        iconContainerClassName: 'bg-purple-50 text-purple-600',
      },
      {
        key: 'new7days',
        title: t('totalNewUsers7Days'),
        value: stats?.newLast7Days ?? 0,
        icon: UserPlus,
        accentClassName: 'from-rose-500/20 via-rose-400/10 to-transparent',
        iconContainerClassName: 'bg-rose-50 text-rose-600',
      },
      {
        key: 'validated',
        title: t('totalValidatedUsers'),
        value: 0,
        icon: Mail,
        accentClassName: 'from-green-500/20 via-emerald-400/10 to-transparent',
        iconContainerClassName: 'bg-green-50 text-green-600',
      },
      {
        key: 'blocked',
        title: t('totalBlockedUsers'),
        value: stats?.blocked ?? 0,
        icon: ShieldCheck,
        accentClassName: 'from-amber-500/20 via-orange-400/10 to-transparent',
        iconContainerClassName: 'bg-amber-50 text-amber-600',
      },
    ],
    [stats, t]
  );

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('columnName'),
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage
                  src={getPhotoUrl(user.photo_id)}
                  alt={user.name}
                  className="rounded-full object-cover"
                />
                <AvatarFallback className="rounded-full bg-muted text-xs font-semibold uppercase">
                  {(user.name ?? '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{user.name || '—'}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: t('columnEmail'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {getUserEmail(row.original)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('columnStatus'),
        cell: ({ row }) => {
          const user = row.original;
          return user.suspended_until ? (
            <Badge
              variant="outline"
              className="border-red-500/20 bg-red-500/10 text-red-600"
            >
              {t('blocked')}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-green-500/20 bg-green-500/10 text-green-600"
            >
              {t('active')}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleOpenEdit(row.original)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('buttonEditUser')}</TooltipContent>
            </Tooltip>
          </div>
        ),
      },
    ],
    [t]
  );

  const tableData = useMemo(
    () => (paginate as PaginatedResult<User>)?.data ?? [],
    [paginate]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const users: User[] = tableData;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: t('home'), href: '/' }, { label: t('users') }]}
        actions={[
          {
            label: t('buttonAddUser'),
            onClick: handleOpenCreate,
            variant: 'default',
          },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <KpiCardsGrid items={statsCards} />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="flex-1">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={(v) => {
              setSearchQuery(v);
              setPage(1);
            }}
            onSearch={() => refetch()}
            placeholder={t('searchPlaceholder')}
            filters={{
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value);
                setPage(1);
              },
              placeholder: t('filterPlaceholder'),
              options: [
                { label: t('filterOptionAll'), value: 'all' },
                { label: t('filterOptionNew'), value: 'new' },
                { label: t('filterOptionBlocked'), value: 'blocked' },
              ],
            }}
          />
        </div>

        <div className="flex items-center gap-3 xl:justify-end">
          <span className="text-xs font-medium text-muted-foreground">
            {t('viewMode')}
          </span>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewModeChange}
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

      <div className="flex-1">
        {isLoading ? (
          viewMode === 'cards' ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={t('noUsersFound')}
            description={t('description')}
            actionLabel={t('buttonAddUser')}
            onAction={handleOpenCreate}
          />
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onDoubleClick={() => handleOpenEdit(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {users.map((user: User) => (
              <Card
                key={user.id}
                onDoubleClick={() => handleOpenEdit(user)}
                className="cursor-pointer overflow-hidden border-border/70 py-0 transition-colors hover:border-border hover:shadow-md"
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <CardHeader className="flex items-start justify-between gap-4 p-0">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 shrink-0 rounded-full">
                        <AvatarImage
                          src={getPhotoUrl(user.photo_id)}
                          alt={user.name}
                          className="rounded-full object-cover"
                        />
                        <AvatarFallback className="rounded-full bg-muted text-sm font-semibold uppercase">
                          {(user.name ?? '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {user.name || '—'}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          {getUserEmail(user)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(user)}
                      >
                        {t('buttonEditUser')}
                      </Button>
                      <div className="mt-1">
                        {user.suspended_until ? (
                          <Badge
                            variant="outline"
                            className="border-red-500/20 bg-red-500/10 text-red-600"
                          >
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            {t('blocked')}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-green-500/20 bg-green-500/10 text-green-600"
                          >
                            <Users className="mr-1 h-3 w-3" />
                            {t('active')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      {(user as any).user_account?.includes('google') && (
                        <div
                          title={t('googleConnected')}
                          className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                          />
                          {t('google')}
                        </div>
                      )}
                      {(user as any).connectedAccounts?.includes('github') && (
                        <div
                          title={t('githubConnected')}
                          className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                          />
                          {t('github')}
                        </div>
                      )}
                      {(user as any).connectedAccounts?.includes(
                        'facebook'
                      ) && (
                        <div
                          title={t('facebookConnected')}
                          className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                          />
                          {t('facebook')}
                        </div>
                      )}
                      {(!(user as any).connectedAccounts ||
                        (user as any).connectedAccounts.length === 0) && (
                        <div className="text-xs text-muted-foreground">
                          {t('noConnectedAccounts')}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {user.user_mfa && user.user_mfa.length > 0 ? (
                        user.user_mfa.map((mfa: UserMfa) => (
                          <span
                            key={String(mfa.id)}
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                          >
                            {mfa.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('noMfaMethods')}
                        </span>
                      )}
                    </div>
                    {user.suspended_reason && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {t('reason')}:
                        </span>{' '}
                        {user.suspended_reason}
                      </div>
                    )}
                    {user.suspended_until && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {t('until')}:
                        </span>{' '}
                        {user.suspended_until}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="w-full border-t pt-2 mt-4">
          <PaginationFooter
            currentPage={page}
            pageSize={pageSize}
            totalItems={
              (paginate as any)?.total ?? (paginate as any)?.count ?? 0
            }
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            pageSizeOptions={pageSizeOptions}
          />
        </div>

        <UserSheet
          open={isSheetOpen}
          onOpenChange={handleSheetClose}
          userId={selectedUserId}
          onSuccess={refetch}
        />
      </div>
    </Page>
  );
}
