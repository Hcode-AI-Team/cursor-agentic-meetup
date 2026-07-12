'use client';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconEdit,
  IconGlobe,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Dashboard {
  id: number;
  slug: string;
  dashboard_locale: Array<{
    locale: { code: string };
    name: string;
  }>;
  dashboard_role?: Array<{
    role_id?: number;
    role: {
      id?: number;
      role_id?: number;
      slug: string;
      role_locale?: Array<{
        locale: { code: string };
        name: string;
      }>;
    };
  }>;
}

interface RoleOption {
  id?: number;
  role_id?: number;
  slug: string;
  name?: string;
}

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export function DashboardsTab() {
  const t = useTranslations('core.DashboardManagement');
  const { request, locales, currentLocaleCode } = useApp();
  const [open, setOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(currentLocaleCode);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dashboardToDelete, setDashboardToDelete] = useState<number | null>(
    null
  );
  const [removeRoleDialogOpen, setRemoveRoleDialogOpen] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<{
    dashboardId: number;
    roleId: number;
    roleName: string;
  } | null>(null);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [dashboardForRoleSheet, setDashboardForRoleSheet] =
    useState<Dashboard | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery<{ data: Dashboard[]; total: number }>({
    queryKey: [
      'dashboards',
      page,
      pageSize,
      debouncedSearch,
      currentLocaleCode,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await request<{ data: Dashboard[]; total: number }>({
        url: `/dashboard?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
  });

  const dashboards = paginatedData?.data ?? [];

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery<{
    data: RoleOption[];
    total: number;
  }>({
    queryKey: ['roles-for-dashboard-sheet', currentLocaleCode],
    queryFn: async () => {
      const response = await request<{ data: RoleOption[]; total: number }>({
        url: '/role?page=1&pageSize=1000',
        method: 'GET',
      });

      return response.data;
    },
  });

  const availableRoles = rolesData?.data ?? [];
  const filteredAvailableRoles = availableRoles.filter((role) => {
    const roleName = role.name || role.slug;
    if (!roleSearchQuery.trim()) return true;

    const query = roleSearchQuery.toLowerCase();
    return (
      roleName.toLowerCase().includes(query) ||
      role.slug.toLowerCase().includes(query)
    );
  });
  const total = paginatedData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleNew = () => {
    const newDashboard: any = {
      slug: '',
      locale: {},
    };

    locales.forEach((locale: any) => {
      newDashboard.locale[locale.code] = { name: '' };
    });

    setSelectedDashboard(newDashboard);
    setIsNew(true);
    setSelectedLocale(currentLocaleCode);
    setOpen(true);
  };

  const handleEdit = async (dashboard: Dashboard) => {
    try {
      const { data } = await request<any>({
        url: `/dashboard/${dashboard.id}`,
        method: 'GET',
      });

      const localeData: Record<string, { name: string }> = {};
      if (data.dashboard_locale && Array.isArray(data.dashboard_locale)) {
        data.dashboard_locale.forEach((dl: any) => {
          const localeCode = locales.find(
            (l: any) => l.code === dl.locale?.code
          )?.code;
          if (localeCode) {
            localeData[localeCode] = { name: dl.name || '' };
          }
        });
      }

      locales.forEach((locale: any) => {
        if (!localeData[locale.code]) {
          localeData[locale.code] = { name: '' };
        }
      });

      setSelectedDashboard({
        ...data,
        locale: localeData,
      });
      setIsNew(false);
      setSelectedLocale(currentLocaleCode);
      setOpen(true);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error(t('loadDashboardError'));
    }
  };

  const handleSave = async () => {
    if (!selectedDashboard || !selectedDashboard.locale) return;

    const payload = {
      slug: selectedDashboard.slug,
      locale: selectedDashboard.locale,
    };

    try {
      if (selectedDashboard.id) {
        await request({
          url: `/dashboard/${selectedDashboard.id}`,
          method: 'PATCH',
          data: payload,
        });
        toast.success(t('dashboardUpdated'));
      } else {
        await request({
          url: '/dashboard',
          method: 'POST',
          data: payload,
        });
        toast.success(t('dashboardCreated'));
      }

      setOpen(false);
      setSelectedDashboard(null);
      refetch();
    } catch (error) {
      console.error('Erro ao salvar dashboard:', error);
      toast.error(t('saveDashboardError'));
    }
  };

  const handleDeleteClick = (id: number) => {
    setDashboardToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!dashboardToDelete) return;

    try {
      await request({
        url: `/dashboard/${dashboardToDelete}`,
        method: 'DELETE',
      });
      toast.success(t('dashboardDeleted'));
      refetch();
    } catch (error) {
      console.error('Erro ao excluir dashboard:', error);
      toast.error(t('deleteDashboardError'));
    } finally {
      setDeleteDialogOpen(false);
      setDashboardToDelete(null);
    }
  };

  const handleOpenRoleSheet = (dashboard: Dashboard) => {
    setDashboardForRoleSheet(dashboard);
    setSelectedRoleIds([]);
    setRoleSearchQuery('');
    setRoleSheetOpen(true);
  };

  const handleRoleSelection = (roleId: number, checked: boolean) => {
    setSelectedRoleIds((prev) => {
      if (checked) {
        if (prev.includes(roleId)) return prev;
        return [...prev, roleId];
      }

      return prev.filter((id) => id !== roleId);
    });
  };

  const handleAddRolesToDashboard = async () => {
    if (!dashboardForRoleSheet) return;

    if (selectedRoleIds.length === 0) {
      toast.error(t('selectRoleRequired'));
      return;
    }

    try {
      await request({
        url: '/dashboard-role/batch',
        method: 'POST',
        data: {
          dashboard_id: dashboardForRoleSheet.id,
          role_ids: selectedRoleIds,
        },
      });

      toast.success(t('roleAdded'));
      setRoleSheetOpen(false);
      setDashboardForRoleSheet(null);
      setSelectedRoleIds([]);
      setRoleSearchQuery('');
      refetch();
    } catch (error: any) {
      console.error('Erro ao adicionar permissões ao dashboard:', error);
      toast.error(t('errorAddingRole'));
    }
  };

  const handleRoleRemoveClick = (
    dashboardId: number,
    roleId: number,
    roleName: string
  ) => {
    setRoleToRemove({ dashboardId, roleId, roleName });
    setRemoveRoleDialogOpen(true);
  };

  const handleRoleRemoveConfirm = async () => {
    if (!roleToRemove) return;

    try {
      await request({
        url: `/dashboard-role/dashboard/${roleToRemove.dashboardId}/role/${roleToRemove.roleId}`,
        method: 'DELETE',
      });

      toast.success(t('roleDeleted'));
      refetch();
    } catch (error) {
      console.error('Erro ao remover permissão do dashboard:', error);
      toast.error(t('errorDeletingRole'));
    } finally {
      setRemoveRoleDialogOpen(false);
      setRoleToRemove(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">{t('dashboardsTab')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('manageDashboards')}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={handleNew}>
              <IconPlus className="size-4" />
              {t('newDashboard')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isNew ? t('newDashboard') : t('editDashboard')}
              </DialogTitle>
              <DialogDescription>{t('fillDashboardData')}</DialogDescription>
            </DialogHeader>
            {selectedDashboard && (
              <div className="space-y-4">
                {!isNew && (
                  <div className="flex items-center gap-2">
                    <IconGlobe className="size-4" />
                    <Select
                      value={selectedLocale}
                      onValueChange={setSelectedLocale}
                    >
                      <SelectTrigger className="w-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locales.map((locale: any) => (
                          <SelectItem key={locale.code} value={locale.code}>
                            {locale.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="slug">{t('slug')}</Label>
                  <Input
                    id="slug"
                    placeholder={t('dashboardSlugPlaceholder')}
                    value={selectedDashboard.slug || ''}
                    onChange={(e) =>
                      setSelectedDashboard({
                        ...selectedDashboard,
                        slug: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">{t('name')}</Label>
                  <Input
                    id="name"
                    placeholder={t('dashboardNamePlaceholder')}
                    value={
                      selectedDashboard.locale?.[selectedLocale]?.name || ''
                    }
                    onChange={(e) =>
                      setSelectedDashboard({
                        ...selectedDashboard,
                        locale: {
                          ...selectedDashboard.locale,
                          [selectedLocale]: {
                            ...selectedDashboard.locale?.[selectedLocale],
                            name: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleSave}>{t('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('id')}</TableHead>
              <TableHead>{t('slug')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead className="w-25">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  {t('loading')}
                </TableCell>
              </TableRow>
            ) : dashboards && dashboards.length > 0 ? (
              dashboards.map((dashboard) => {
                const name =
                  dashboard.dashboard_locale.find(
                    (l) => l.locale.code === currentLocaleCode
                  )?.name || dashboard.slug;

                const roleEntries = (
                  dashboard.dashboard_role?.map((dashboardRole) => {
                    const roleId =
                      dashboardRole.role_id ??
                      dashboardRole.role.role_id ??
                      dashboardRole.role.id;

                    if (!roleId) return null;

                    const localeRoleName = dashboardRole.role.role_locale?.find(
                      (roleLocale) =>
                        roleLocale.locale.code === currentLocaleCode
                    )?.name;

                    return {
                      id: roleId,
                      name: localeRoleName || dashboardRole.role.slug,
                    };
                  }) || []
                ).filter(
                  (
                    roleEntry,
                    index,
                    array
                  ): roleEntry is { id: number; name: string } =>
                    !!roleEntry &&
                    array.findIndex((item) => item?.id === roleEntry.id) ===
                      index
                );

                return (
                  <TableRow key={dashboard.id}>
                    <TableCell>{dashboard.id}</TableCell>
                    <TableCell className="font-mono">
                      {dashboard.slug}
                    </TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {roleEntries.length > 0 ? (
                          roleEntries.map((roleEntry) => (
                            <Badge
                              key={`${dashboard.id}-${roleEntry.id}`}
                              variant="outline"
                              className="gap-1 pr-1"
                            >
                              <span>{roleEntry.name}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="rounded-sm p-0.5 hover:bg-muted"
                                    onClick={() =>
                                      handleRoleRemoveClick(
                                        dashboard.id,
                                        roleEntry.id,
                                        roleEntry.name
                                      )
                                    }
                                    aria-label={`${t('delete')} ${roleEntry.name}`}
                                  >
                                    <IconX className="size-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {`${t('delete')} ${roleEntry.name}`}
                                </TooltipContent>
                              </Tooltip>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs mr-1">
                            {t('noRoles')}
                          </span>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="size-6"
                              onClick={() => handleOpenRoleSheet(dashboard)}
                            >
                              <IconPlus className="size-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('addRole')}</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(dashboard)}
                          title={t('editDashboardTitle')}
                        >
                          <IconEdit className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteClick(dashboard.id)}
                          title={t('deleteDashboardTitle')}
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  {t('noDashboards')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-muted-foreground text-sm">
            {t('showingResults', {
              from: (page - 1) * pageSize + 1,
              to: Math.min(page * pageSize, total),
              total: total,
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="pageSize" className="text-sm">
                {t('itemsPerPage')}
              </Label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-20" id="pageSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm">
              {t('pageOf', { page: page, total: totalPages })}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <IconChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <IconChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <IconChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <IconChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={removeRoleDialogOpen}
        onOpenChange={setRemoveRoleDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>
              {roleToRemove
                ? `${t('deleteDescription')} (${roleToRemove.roleName})`
                : t('deleteDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveRoleDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRoleRemoveConfirm}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={roleSheetOpen}
        onOpenChange={(openValue) => {
          setRoleSheetOpen(openValue);
          if (!openValue) {
            setDashboardForRoleSheet(null);
            setSelectedRoleIds([]);
            setRoleSearchQuery('');
          }
        }}
      >
        <ResizableSheetContent
          sheetId="core-dashboard-dashboards-role-sheet"
          defaultWidth={560}
          minWidth={420}
          maxWidth={920}
          side="right"
          className="sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>{t('addRole')}</SheetTitle>
            <SheetDescription>
              {dashboardForRoleSheet
                ? `${t('dashboard')}: ${dashboardForRoleSheet.slug}`
                : t('manageComponentRoles')}
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 py-4">
            <Input
              placeholder={t('searchPlaceholder')}
              value={roleSearchQuery}
              onChange={(event) => setRoleSearchQuery(event.target.value)}
            />
          </div>

          <div className="space-y-3 px-6 pb-4">
            {isLoadingRoles ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : filteredAvailableRoles.length > 0 ? (
              filteredAvailableRoles.map((role) => {
                const roleId = role.role_id ?? role.id;
                if (!roleId) return null;

                const roleName = role.name || role.slug;
                const alreadyLinked =
                  dashboardForRoleSheet?.dashboard_role?.some(
                    (dashboardRole) =>
                      (dashboardRole.role_id ??
                        dashboardRole.role.role_id ??
                        dashboardRole.role.id) === roleId
                  ) ?? false;

                const isSelected = selectedRoleIds.includes(roleId);

                return (
                  <div
                    key={`available-dashboard-role-${roleId}`}
                    className={`flex items-center gap-3 rounded-md border p-3 transition-colors ${
                      alreadyLinked
                        ? 'cursor-not-allowed opacity-70'
                        : 'cursor-pointer hover:bg-muted/40'
                    } ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => {
                      if (alreadyLinked) return;
                      handleRoleSelection(roleId, !isSelected);
                    }}
                  >
                    <div onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={alreadyLinked || isSelected}
                        onCheckedChange={(checked) =>
                          handleRoleSelection(roleId, checked === true)
                        }
                        disabled={alreadyLinked}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{roleName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {role.slug}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">{t('noRoles')}</p>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setRoleSheetOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddRolesToDashboard}>{t('save')}</Button>
          </SheetFooter>
        </ResizableSheetContent>
      </Sheet>
    </div>
  );
}
