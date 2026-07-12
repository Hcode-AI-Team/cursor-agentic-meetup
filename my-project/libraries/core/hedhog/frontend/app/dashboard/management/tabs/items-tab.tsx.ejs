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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { useFormDraft } from '@/hooks/use-form-draft';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { formatDateTime } from '@/lib/format-date';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type ItemFormData = {
  dashboard_id: number;
  component_id: number;
  width: number;
  height: number;
  x_axis: number;
  y_axis: number;
};

type DashboardItemDraftPayload = {
  values: ItemFormData;
};

const DASHBOARD_ITEM_DRAFT_STORAGE_KEY = 'core-dashboard-item-form-draft';

interface DashboardItem {
  id: number;
  dashboard_id: number;
  dashboard_component_id: number;
  dashboard: {
    slug: string;
    dashboard_locale: Array<{
      locale: { code: string };
      name: string;
    }>;
  };
  dashboard_component: {
    slug: string;
    dashboard_component_locale: Array<{
      locale: { code: string };
      name: string;
    }>;
  };
}

interface Dashboard {
  id: number;
  slug: string;
  dashboard_locale: Array<{
    locale: { code: string };
    name: string;
  }>;
}

interface Component {
  id: number;
  slug: string;
  dashboard_component_locale: Array<{
    locale: { code: string };
    name: string;
  }>;
}

type DashboardListResponse = {
  data?: Dashboard[];
};

type ComponentListResponse = {
  data?: Component[];
};

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export function ItemsTab() {
  const t = useTranslations('core.DashboardManagement');
  const { request, currentLocaleCode, getSettingValue } = useApp();

  const itemSchema = z.object({
    dashboard_id: z.coerce.number().min(1, t('selectDashboardRequired')),
    component_id: z.coerce.number().min(1, t('selectComponentRequired')),
    width: z.coerce.number().min(1).default(3),
    height: z.coerce.number().min(1).default(2),
    x_axis: z.coerce.number().min(0).default(0),
    y_axis: z.coerce.number().min(0).default(0),
  });

  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
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
  const searchQuery = '';
  const debouncedSearch = useDebounce(searchQuery, 500);

  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery<{ data: DashboardItem[]; total: number }>({
    queryKey: [
      'dashboard-items',
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

      const response = await request<{ data: DashboardItem[]; total: number }>({
        url: `/dashboard-item?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
  });

  const items = paginatedData?.data ?? [];
  const total = paginatedData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const { data: dashboards } = useQuery<DashboardListResponse>({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data } = await request<DashboardListResponse>({
        url: '/dashboard',
        method: 'GET',
      });
      return data;
    },
  });

  const { data: components } = useQuery<ComponentListResponse>({
    queryKey: ['dashboard-components'],
    queryFn: async () => {
      const { data } = await request<ComponentListResponse>({
        url: '/dashboard-component',
        method: 'GET',
      });
      return data;
    },
  });

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      dashboard_id: 0,
      component_id: 0,
      width: 3,
      height: 2,
      x_axis: 0,
      y_axis: 0,
    },
  });

  const watchedValues = useWatch({
    control: form.control,
  });

  const {
    clearDraft,
    loadDraft,
    hasDraft,
    savedAt: draftSavedAt,
  } = useFormDraft<DashboardItemDraftPayload>({
    storageKey: DASHBOARD_ITEM_DRAFT_STORAGE_KEY,
    value: {
      values: {
        dashboard_id: Number(watchedValues.dashboard_id ?? 0),
        component_id: Number(watchedValues.component_id ?? 0),
        width: Number(watchedValues.width ?? 3),
        height: Number(watchedValues.height ?? 2),
        x_axis: Number(watchedValues.x_axis ?? 0),
        y_axis: Number(watchedValues.y_axis ?? 0),
      },
    },
    hasData:
      Number(watchedValues.dashboard_id ?? 0) > 0 ||
      Number(watchedValues.component_id ?? 0) > 0 ||
      Number(watchedValues.width ?? 3) !== 3 ||
      Number(watchedValues.height ?? 2) !== 2 ||
      Number(watchedValues.x_axis ?? 0) !== 0 ||
      Number(watchedValues.y_axis ?? 0) !== 0,
    enabled: open,
  });

  const draftStatusContent = useMemo(() => {
    if (!hasDraft || !draftSavedAt) {
      return null;
    }

    const savedDate = new Date(draftSavedAt);
    if (Number.isNaN(savedDate.getTime())) {
      return null;
    }

    const locale = currentLocaleCode.startsWith('pt') ? ptBR : enUS;
    const relativeLabel = formatDistanceToNow(savedDate, {
      addSuffix: true,
      locale,
    });
    const absoluteLabel = formatDateTime(
      savedDate,
      getSettingValue,
      currentLocaleCode
    );

    return currentLocaleCode.startsWith('pt')
      ? `Rascunho salvo ${relativeLabel} • Último salvamento: ${absoluteLabel}`
      : `Draft saved ${relativeLabel} • Last saved: ${absoluteLabel}`;
  }, [draftSavedAt, currentLocaleCode, getSettingValue, hasDraft]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const storedDraft = loadDraft();
    form.reset({
      dashboard_id: storedDraft?.payload.values.dashboard_id ?? 0,
      component_id: storedDraft?.payload.values.component_id ?? 0,
      width: storedDraft?.payload.values.width ?? 3,
      height: storedDraft?.payload.values.height ?? 2,
      x_axis: storedDraft?.payload.values.x_axis ?? 0,
      y_axis: storedDraft?.payload.values.y_axis ?? 0,
    });
  }, [form, loadDraft, open]);

  const onSubmit = async (values: ItemFormData) => {
    try {
      await request({
        url: '/dashboard-item',
        method: 'POST',
        data: values,
      });

      toast.success(t('itemAdded'));
      clearDraft();
      setOpen(false);
      form.reset();
      refetch();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error(t('addItemError'));
    }
  };

  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await request({
        url: `/dashboard-item/${itemToDelete}`,
        method: 'DELETE',
      });
      toast.success(t('itemDeleted'));
      refetch();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error(t('deleteItemError'));
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">{t('itemsTab')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('relateComponents')}
          </p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <IconPlus className="size-4" />
              {t('addItem')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>{t('addItem')}</DialogTitle>
              <DialogDescription>
                {t('selectDashboardAndComponent')}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="dashboard_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dashboard')}</FormLabel>
                      <Select
                        value={field.value ? field.value.toString() : undefined}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('selectDashboard')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(dashboards?.data ?? []).map(
                            (dashboard: Dashboard) => {
                              const name =
                                dashboard.dashboard_locale.find(
                                  (l) => l.locale.code === currentLocaleCode
                                )?.name || dashboard.slug;
                              return (
                                <SelectItem
                                  key={dashboard.id}
                                  value={dashboard.id.toString()}
                                >
                                  {name} ({dashboard.slug})
                                </SelectItem>
                              );
                            }
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="component_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('component')}</FormLabel>
                      <Select
                        value={field.value ? field.value.toString() : undefined}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('selectComponent')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(components?.data ?? []).map(
                            (component: Component) => {
                              const name =
                                component.dashboard_component_locale.find(
                                  (l) => l.locale.code === currentLocaleCode
                                )?.name || component.slug;
                              return (
                                <SelectItem
                                  key={component.id}
                                  value={component.id.toString()}
                                >
                                  {name} ({component.slug})
                                </SelectItem>
                              );
                            }
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('width')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('height')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="x_axis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('positionX')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="y_axis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('positionY')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-md border p-4 bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('positionPreview')}
                  </p>
                  <div
                    className="grid grid-cols-12 gap-1"
                    style={{ gridAutoRows: '40px' }}
                  >
                    {Array.from({ length: 12 * 8 }).map((_, index) => {
                      const col = index % 12;
                      const row = Math.floor(index / 12);
                      const x = form.watch('x_axis') || 0;
                      const y = form.watch('y_axis') || 0;
                      const w = form.watch('width') || 3;
                      const h = form.watch('height') || 2;

                      const isInside =
                        col >= x && col < x + w && row >= y && row < y + h;

                      return (
                        <div
                          key={index}
                          className={`border ${
                            isInside
                              ? 'bg-primary/30 border-primary'
                              : 'border-dashed border-muted'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('willOccupy', {
                      x: form.watch('x_axis'),
                      y: form.watch('y_axis'),
                      w: form.watch('width'),
                      h: form.watch('height'),
                    })}
                  </p>
                </div>

                {draftStatusContent ? (
                  <p className="text-xs text-muted-foreground">
                    {draftStatusContent}
                  </p>
                ) : null}

                <DialogFooter>
                  <Button type="submit">{t('save')}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('id')}</TableHead>
              <TableHead>{t('dashboard')}</TableHead>
              <TableHead>{t('component')}</TableHead>
              <TableHead className="w-25">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  {t('loading')}
                </TableCell>
              </TableRow>
            ) : items && items.length > 0 ? (
              items.map((item) => {
                const dashboardName =
                  item.dashboard.dashboard_locale.find(
                    (l) => l.locale.code === currentLocaleCode
                  )?.name || item.dashboard.slug;
                const componentName =
                  item.dashboard_component.dashboard_component_locale.find(
                    (l) => l.locale.code === currentLocaleCode
                  )?.name || item.dashboard_component.slug;
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>
                      {dashboardName}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({item.dashboard.slug})
                      </span>
                    </TableCell>
                    <TableCell>
                      {componentName}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({item.dashboard_component.slug})
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteClick(item.id)}
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  {t('noItems')}
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
              <label htmlFor="pageSize" className="text-sm">
                {t('itemsPerPage')}
              </label>
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
    </div>
  );
}
