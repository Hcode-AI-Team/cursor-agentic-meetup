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
import { Label } from '@/components/ui/label';
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

type RoleFormData = {
  component_id: number;
  role_id: number;
};

type ComponentRoleDraftPayload = {
  values: RoleFormData;
};

const COMPONENT_ROLE_DRAFT_STORAGE_KEY =
  'core-dashboard-component-role-form-draft';

interface ComponentRole {
  id: number;
  component_id: number;
  role_id: number;
  dashboard_component: {
    slug: string;
    dashboard_component_locale: Array<{
      locale: { code: string };
      name: string;
    }>;
  };
  role: {
    slug: string;
    role_locale: Array<{
      locale: { code: string };
      name: string;
    }>;
  };
}

interface Component {
  id: number;
  slug: string;
  dashboard_component_locale: Array<{
    locale: { code: string };
    name: string;
  }>;
}

interface Role {
  id: number;
  role_id?: number;
  slug: string;
  name?: string;
  role_locale: Array<{
    locale: { code: string };
    name: string;
  }>;
}

type ComponentListResponse = {
  data?: Component[];
};

type RoleListResponse = {
  data?: Role[];
};

type RequestError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export function ComponentRolesTab() {
  const t = useTranslations('core.DashboardManagement');
  const { request, currentLocaleCode, getSettingValue } = useApp();

  const roleSchema = z.object({
    component_id: z.coerce.number().min(1, t('selectComponentRequired')),
    role_id: z.coerce.number().min(1, t('selectRoleRequired')),
  });

  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);
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
  } = useQuery<{ data: ComponentRole[]; total: number }>({
    queryKey: [
      'dashboard-component-roles',
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

      const response = await request<{ data: ComponentRole[]; total: number }>({
        url: `/dashboard-component-role?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
  });

  const roles = paginatedData?.data ?? [];
  const total = paginatedData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

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

  const { data: availableRoles } = useQuery<RoleListResponse>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await request<RoleListResponse>({
        url: '/role',
        method: 'GET',
      });
      return data;
    },
  });

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      component_id: 0,
      role_id: 0,
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
  } = useFormDraft<ComponentRoleDraftPayload>({
    storageKey: COMPONENT_ROLE_DRAFT_STORAGE_KEY,
    value: {
      values: {
        component_id: Number(watchedValues.component_id ?? 0),
        role_id: Number(watchedValues.role_id ?? 0),
      },
    },
    hasData:
      Number(watchedValues.component_id ?? 0) > 0 ||
      Number(watchedValues.role_id ?? 0) > 0,
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
      component_id: storedDraft?.payload.values.component_id ?? 0,
      role_id: storedDraft?.payload.values.role_id ?? 0,
    });
  }, [form, loadDraft, open]);

  const onSubmit = async (values: RoleFormData) => {
    try {
      await request({
        url: '/dashboard-component-role',
        method: 'POST',
        data: {
          component_id: values.component_id,
          role_id: values.role_id,
        },
      });
      toast.success(t('roleAdded'));
      clearDraft();
      setOpen(false);
      form.reset();
      refetch();
    } catch (error: unknown) {
      console.error('Erro ao adicionar permissão:', error);
      const message = (error as RequestError)?.response?.data?.message ?? '';
      if (message.includes('already exists')) {
        toast.error(t('roleAlreadyExists'));
      } else {
        toast.error(t('errorAddingRole'));
      }
    }
  };

  const handleDeleteClick = (id: number) => {
    setRoleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      await request({
        url: `/dashboard-component-role/${roleToDelete}`,
        method: 'DELETE',
      });
      toast.success(t('roleDeleted'));
      refetch();
    } catch (error) {
      console.error('Erro ao excluir permissão:', error);
      toast.error(t('errorDeletingRole'));
    } finally {
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
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
          <h2 className="text-lg font-semibold">{t('componentRolesTab')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('manageComponentRoles')}
          </p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <IconPlus className="size-4" />
              {t('addRole')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('addRole')}</DialogTitle>
              <DialogDescription>
                {t('selectComponentAndRole')}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="component_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('component')}</FormLabel>
                      <Select
                        value={field.value ? String(field.value) : undefined}
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
                                  value={String(component.id)}
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
                <FormField
                  control={form.control}
                  name="role_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('role')}</FormLabel>
                      <Select
                        value={field.value ? String(field.value) : undefined}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('selectRole')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(availableRoles?.data ?? []).map((role: Role) => {
                            return (
                              <SelectItem
                                key={role.role_id}
                                value={String(role.role_id)}
                              >
                                {role.name} ({role.slug})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              <TableHead>ID</TableHead>
              <TableHead>{t('component')}</TableHead>
              <TableHead>{t('role')}</TableHead>
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
            ) : roles && roles.length > 0 ? (
              roles.map((role) => {
                const componentName =
                  role.dashboard_component.dashboard_component_locale.find(
                    (l) => l.locale.code === currentLocaleCode
                  )?.name || role.dashboard_component.slug;

                const roleName =
                  role.role.role_locale.find(
                    (l) => l.locale.code === currentLocaleCode
                  )?.name || role.role.slug;

                return (
                  <TableRow key={role.id}>
                    <TableCell>{role.id}</TableCell>
                    <TableCell>
                      {componentName}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({role.dashboard_component.slug})
                      </span>
                    </TableCell>
                    <TableCell>
                      {roleName}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({role.role.slug})
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteClick(role.id)}
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
                  {t('noRoles')}
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
    </div>
  );
}
