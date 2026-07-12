'use client';

import { EmptyState } from '@/components/entity-list';
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
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Route as RouteIcon,
  Search,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type RouteType = {
  id: number;
  url: string;
  method: string | null;
  description?: string;
  role_route?: Array<{
    route_id: number;
    role_id: number;
  }>;
};

type RoleRoutesSectionProps = {
  roleId: number;
  onRouteChange?: () => void;
};

type SearchType = 'contains' | 'startsWith' | 'endsWith';

const UNKNOWN_METHOD_LABEL = '-';

const normalizeRouteMethod = (method: string | null) => {
  const normalizedMethod = method?.trim().toUpperCase();
  return normalizedMethod || UNKNOWN_METHOD_LABEL;
};

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export function RoleRoutesSection({
  roleId,
  onRouteChange,
}: RoleRoutesSectionProps) {
  const t = useTranslations('core.RolePage');
  const { request } = useApp();
  const [togglingRouteId, setTogglingRouteId] = useState<number | null>(null);
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
  const [searchType, setSearchType] = useState<SearchType>('contains');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(searchTerm);

  const handleSearchTypeChange = (value: string) => {
    if (
      value === 'contains' ||
      value === 'startsWith' ||
      value === 'endsWith'
    ) {
      setSearchType(value);
    }
  };

  const {
    data: assignedRoutesData,
    isLoading: isLoadingAssigned,
    refetch: refetchAssignedRoutes,
  } = useQuery<{ data: RouteType[] }>({
    queryKey: ['role-routes-assigned', roleId],
    queryFn: async () => {
      const response = await request<{ data: RouteType[] }>({
        url: `/role/${roleId}/route?pageSize=10000`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!roleId,
  });

  const {
    data: routesData,
    isLoading: isLoadingRoutes,
    refetch: refetchRoutes,
  } = useQuery<{ data: RouteType[]; total: number; lastPage: number }>({
    queryKey: [
      'role-routes-paginated',
      roleId,
      page,
      pageSize,
      debouncedSearch,
      searchType,
      methodFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
        params.set('searchType', searchType);
      }
      if (methodFilter && methodFilter !== 'all') {
        params.set('method', methodFilter);
      }

      const response = await request<{
        data: RouteType[];
        total: number;
        lastPage: number;
      }>({
        url: `/role/${roleId}/route?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!roleId,
  });

  const routes = routesData?.data || [];
  const totalPages = routesData?.lastPage || 1;
  const totalRoutes = routesData?.total || 0;

  const handleToggleRoute = async (routeId: number, isAssigned: boolean) => {
    setTogglingRouteId(routeId);
    try {
      const currentRouteIds =
        assignedRoutesData?.data
          ?.filter((r: RouteType) => r.role_route && r.role_route.length > 0)
          .map((r: RouteType) => r.id) || [];

      let newRouteIds: number[];
      if (isAssigned) {
        newRouteIds = currentRouteIds.filter((id: number) => id !== routeId);
      } else {
        newRouteIds = [...currentRouteIds, routeId];
      }

      await request({
        url: `/role/${roleId}/route`,
        method: 'PATCH',
        data: { ids: newRouteIds },
      });

      toast.success(isAssigned ? t('routeRemoved') : t('routeAssigned'));
      await refetchAssignedRoutes();
      await refetchRoutes();
      onRouteChange?.();
    } catch {
      toast.error(
        isAssigned ? t('errorRemovingRoute') : t('errorAssigningRoute')
      );
    } finally {
      setTogglingRouteId(null);
    }
  };

  const isRouteAssigned = (route: RouteType) => {
    const assignedRoute = assignedRoutesData?.data?.find(
      (r: RouteType) => r.id === route.id
    );
    return !!(assignedRoute?.role_route && assignedRoute.role_route.length > 0);
  };

  const getMethodColor = (method: string | null) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-green-100 text-green-700',
      PUT: 'bg-amber-100 text-amber-700',
      PATCH: 'bg-purple-100 text-purple-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    return colors[normalizeRouteMethod(method)] || 'bg-gray-100 text-gray-700';
  };

  if (isLoadingRoutes || isLoadingAssigned) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          {t('loadingRoutes')}
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <RouteIcon className="h-4 w-4" />
          {t('routesTitle')}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {t('routesDescription')}
        </p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchRoutes')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full flex gap-2">
          <Select value={searchType} onValueChange={handleSearchTypeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('selectSearchType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contains">{t('searchContains')}</SelectItem>
              <SelectItem value="startsWith">
                {t('searchStartsWith')}
              </SelectItem>
              <SelectItem value="endsWith">{t('searchEndsWith')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('selectMethod')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allMethods')}</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {Boolean(routes.length) ? (
          routes.map((route) => {
            const isAssigned = isRouteAssigned(route);
            const isToggling = togglingRouteId === route.id;
            const methodLabel = normalizeRouteMethod(route.method);

            return (
              <Card
                key={route.id}
                className={`transition-all ${
                  isAssigned
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`rounded-md ${
                        isAssigned ? 'bg-primary/10' : 'bg-muted'
                      }`}
                    >
                      <RouteIcon
                        className={`h-5 w-5 ${
                          isAssigned ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${getMethodColor(
                            route.method
                          )}`}
                        >
                          {methodLabel}
                        </span>
                        <Label
                          htmlFor={`route-${route.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {route.url}
                        </Label>
                      </div>
                      {route.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {route.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Switch
                    id={`route-${route.id}`}
                    checked={isAssigned}
                    disabled={isToggling}
                    onCheckedChange={() =>
                      handleToggleRoute(route.id, isAssigned)
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
            icon={<RouteIcon className="h-12 w-12" />}
            title={t('noRoutesAvailable')}
          />
        )}
      </div>

      <div className="flex items-center justify-between px-2 pt-4">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {t('showing')} {routes.length} {t('of')} {totalRoutes} {t('routes')}
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label
              htmlFor="rows-per-page-routes"
              className="text-sm font-medium"
            >
              {t('rowsPerPage')}
            </Label>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-20"
                id="rows-per-page-routes"
              >
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
