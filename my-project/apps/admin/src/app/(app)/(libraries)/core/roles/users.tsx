'use client';

import { EmptyState } from '@/components/entity-list';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { getPhotoUrl } from '@/lib/get-photo-url';
import { getUserEmail } from '@/lib/get-user-email';
import { User } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
  UserCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type RoleUsersSectionProps = {
  roleId: number;
  onUserChange?: () => void;
};

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export function RoleUsersSection({
  roleId,
  onUserChange,
}: RoleUsersSectionProps) {
  const t = useTranslations('core.RolePage');
  const { request } = useApp();
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);
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
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm);

  const {
    data: assignedUsersData,
    isLoading: isLoadingAssigned,
    refetch: refetchAssignedUsers,
  } = useQuery<{ data: User[] }>({
    queryKey: ['role-users-assigned', roleId],
    queryFn: async () => {
      const response = await request<{ data: User[] }>({
        url: `/role/${roleId}/user?pageSize=10000`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!roleId,
  });

  const {
    data: allUsersData,
    isLoading: isLoadingAllUsers,
    refetch: refetchAllUsers,
  } = useQuery<{ paginate: { data: User[]; total: number; lastPage: number } }>(
    {
      queryKey: ['all-users-paginated', page, pageSize, debouncedSearch],
      queryFn: async () => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (debouncedSearch) params.set('search', debouncedSearch);

        const response = await request<{
          paginate: { data: User[]; total: number; lastPage: number };
        }>({
          url: `/user?${params.toString()}`,
          method: 'GET',
        });
        return response.data;
      },
    }
  );

  const allUsers = allUsersData?.paginate?.data || [];
  const totalPages = allUsersData?.paginate?.lastPage || 1;
  const totalUsers = allUsersData?.paginate?.total || 0;

  const handleToggleUser = async (userId: number, isAssigned: boolean) => {
    setTogglingUserId(userId);
    try {
      const currentUserIds =
        assignedUsersData?.data
          ?.filter((u: User) => u.role_user && u.role_user.length > 0)
          .map((u: User) => u.id) || [];

      let newUserIds: number[];
      if (isAssigned) {
        newUserIds = currentUserIds.filter(
          (id): id is number => typeof id === 'number' && id !== userId
        );
      } else {
        newUserIds = [...currentUserIds, userId].filter(
          (id): id is number => typeof id === 'number'
        );
      }

      await request({
        url: `/role/${roleId}/user`,
        method: 'PATCH',
        data: { ids: newUserIds.filter(Boolean) },
      });

      toast.success(isAssigned ? t('userRemoved') : t('userAssigned'));
      await refetchAssignedUsers();
      await refetchAllUsers();
      onUserChange?.();
    } catch {
      toast.error(
        isAssigned ? t('errorRemovingUser') : t('errorAssigningUser')
      );
    } finally {
      setTogglingUserId(null);
    }
  };

  const isUserAssigned = (userId: number) => {
    const user = assignedUsersData?.data?.find((u: User) => u.id === userId);
    return !!(user?.role_user && user.role_user.length > 0);
  };

  if (isLoadingAllUsers || isLoadingAssigned) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          {t('loadingUsers')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <UserCircle className="h-4 w-4" />
          {t('usersTitle')}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {t('usersDescription')}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('searchUsers')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {Boolean(allUsers.length) ? (
          allUsers.map((user) => {
            const isAssigned = isUserAssigned(user.id!);
            const isToggling = togglingUserId === user.id;

            return (
              <Card
                key={user.id}
                className={`transition-all ${
                  isAssigned
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={getPhotoUrl(user.photo_id)}
                        alt={user.name}
                      />
                      <AvatarFallback>
                        {user.name
                          ?.split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase() ?? '')
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Label
                        htmlFor={`user-${user.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {user.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getUserEmail(user)}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={`user-${user.id}`}
                    checked={isAssigned}
                    disabled={isToggling}
                    onCheckedChange={() =>
                      handleToggleUser(user.id!, isAssigned)
                    }
                    className="ml-4"
                  />
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState
            className="min-h-60 py-10"
            icon={<UserCircle className="h-12 w-12" />}
            title={t('noUsersAvailable')}
          />
        )}
      </div>

      <div className="flex items-center justify-between px-2 pt-4">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {t('showing')} {allUsers.length} {t('of')} {totalUsers} {t('users')}
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              {t('rowsPerPage')}
            </Label>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            {t('page')} {page} {t('of')} {totalPages}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <span className="sr-only">{t('goToFirstPage')}</span>
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <span className="sr-only">{t('goToPreviousPage')}</span>
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <span className="sr-only">{t('goToNextPage')}</span>
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              <span className="sr-only">{t('goToLastPage')}</span>
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
