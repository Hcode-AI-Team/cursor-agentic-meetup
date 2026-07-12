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
import * as TablerIcons from '@tabler/icons-react';
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

interface Component {
  id: number;
  slug: string;
  path: string;
  min_width: number | null;
  max_width: number | null;
  min_height: number | null;
  max_height: number | null;
  width: number;
  height: number;
  is_resizable: boolean;
  stat_key?: string;
  icon?: string;
  color?: string;
  dashboard_component_locale: Array<{
    locale: { code: string };
    name: string;
    description?: string;
  }>;
  dashboard_component_role?: Array<{
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

export function ComponentsTab() {
  const t = useTranslations('core.DashboardManagement');
  const { request, locales, currentLocaleCode } = useApp();
  const [open, setOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(currentLocaleCode);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<number | null>(
    null
  );
  const [removeRoleDialogOpen, setRemoveRoleDialogOpen] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<{
    componentId: number;
    roleId: number;
    roleName: string;
  } | null>(null);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [componentForRoleSheet, setComponentForRoleSheet] =
    useState<Component | null>(null);
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

  const renderIcon = (iconName?: string) => {
    if (!iconName) {
      return <TablerIcons.IconBox className="h-4 w-4" />;
    }

    const toPascalCase = (str: string) =>
      str.replace(/(^\w|-\w)/g, (match) =>
        match.replace('-', '').toUpperCase()
      );

    const pascalName = toPascalCase(String(iconName));

    let IconComponent = (TablerIcons as any)[`Icon${pascalName}`];
    if (!IconComponent) {
      IconComponent = (TablerIcons as any)[`Icon${pascalName}Filled`];
    }
    if (!IconComponent) {
      IconComponent = (TablerIcons as any)[`Icon${pascalName}Circle`];
    }

    if (IconComponent) {
      return <IconComponent className="h-4 w-4" />;
    }

    return <TablerIcons.IconBox className="h-4 w-4" />;
  };

  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery<{ data: Component[]; total: number }>({
    queryKey: [
      'dashboard-components',
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

      const response = await request<{ data: Component[]; total: number }>({
        url: `/dashboard-component?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
  });

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery<{
    data: RoleOption[];
    total: number;
  }>({
    queryKey: ['roles-for-component-sheet', currentLocaleCode],
    queryFn: async () => {
      const response = await request<{ data: RoleOption[]; total: number }>({
        url: '/role?page=1&pageSize=1000',
        method: 'GET',
      });

      return response.data;
    },
  });

  const components = paginatedData?.data ?? [];
  const availableRoles = rolesData?.data ?? [];
  const total = paginatedData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleNew = () => {
    const newComponent: any = {
      slug: '',
      path: '',
      min_width: 2,
      max_width: 6,
      min_height: 1,
      max_height: 2,
      width: 3,
      height: 2,
      is_resizable: true,
      stat_key: '',
      icon: '',
      color: '#3b82f6',
      locale: {},
    };

    locales.forEach((locale: any) => {
      newComponent.locale[locale.code] = { name: '', description: '' };
    });

    setSelectedComponent(newComponent);
    setIsNew(true);
    setSelectedLocale(currentLocaleCode);
    setOpen(true);
  };

  const handleEdit = async (component: Component) => {
    try {
      const { data } = await request<any>({
        url: `/dashboard-component/${component.id}`,
        method: 'GET',
      });

      const localeData: Record<string, { name: string; description?: string }> =
        {};
      if (
        data.dashboard_component_locale &&
        Array.isArray(data.dashboard_component_locale)
      ) {
        data.dashboard_component_locale.forEach((dl: any) => {
          const localeCode = locales.find(
            (l: any) => l.code === dl.locale?.code
          )?.code;
          if (localeCode) {
            localeData[localeCode] = {
              name: dl.name || '',
              description: dl.description || '',
            };
          }
        });
      }

      locales.forEach((locale: any) => {
        if (!localeData[locale.code]) {
          localeData[locale.code] = { name: '', description: '' };
        }
      });

      setSelectedComponent({
        ...data,
        locale: localeData,
      });
      setIsNew(false);
      setSelectedLocale(currentLocaleCode);
      setOpen(true);
    } catch (error) {
      console.error('Erro ao carregar componente:', error);
      toast.error(t('loadComponentError'));
    }
  };

  const handleSave = async () => {
    if (!selectedComponent || !selectedComponent.locale) return;

    const payload = {
      slug: selectedComponent.slug,
      path: selectedComponent.path,
      min_width: selectedComponent.min_width || null,
      max_width: selectedComponent.max_width || null,
      min_height: selectedComponent.min_height || null,
      max_height: selectedComponent.max_height || null,
      width: selectedComponent.width,
      height: selectedComponent.height,
      is_resizable: selectedComponent.is_resizable ?? true,
      stat_key: selectedComponent.stat_key || null,
      icon: selectedComponent.icon || null,
      color: selectedComponent.color || null,
      locale: selectedComponent.locale,
    };

    try {
      if (selectedComponent.id) {
        await request({
          url: `/dashboard-component/${selectedComponent.id}`,
          method: 'PATCH',
          data: payload,
        });
        toast.success(t('componentUpdated'));
      } else {
        await request({
          url: '/dashboard-component',
          method: 'POST',
          data: payload,
        });
        toast.success(t('componentCreated'));
      }

      setOpen(false);
      setSelectedComponent(null);
      refetch();
    } catch (error) {
      console.error('Erro ao salvar componente:', error);
      toast.error(t('saveComponentError'));
    }
  };

  const handleDeleteClick = (id: number) => {
    setComponentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!componentToDelete) return;

    try {
      await request({
        url: `/dashboard-component/${componentToDelete}`,
        method: 'DELETE',
      });
      toast.success(t('componentDeleted'));
      setPage(1);
      refetch();
    } catch (error) {
      console.error('Erro ao excluir componente:', error);
      toast.error(t('deleteComponentError'));
    } finally {
      setDeleteDialogOpen(false);
      setComponentToDelete(null);
    }
  };

  const handleOpenRoleSheet = (component: Component) => {
    setComponentForRoleSheet(component);
    setSelectedRoleIds([]);
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

  const handleAddRolesToComponent = async () => {
    if (!componentForRoleSheet) return;

    if (selectedRoleIds.length === 0) {
      toast.error(t('selectRoleRequired'));
      return;
    }

    try {
      await request({
        url: '/dashboard-component-role/batch',
        method: 'POST',
        data: {
          component_id: componentForRoleSheet.id,
          role_ids: selectedRoleIds,
        },
      });

      toast.success(t('roleAdded'));
      setRoleSheetOpen(false);
      setComponentForRoleSheet(null);
      setSelectedRoleIds([]);
      refetch();
    } catch (error: any) {
      console.error('Erro ao adicionar permissões ao componente:', error);
      toast.error(t('errorAddingRole'));
    }
  };

  const handleRoleRemoveClick = (
    componentId: number,
    roleId: number,
    roleName: string
  ) => {
    setRoleToRemove({ componentId, roleId, roleName });
    setRemoveRoleDialogOpen(true);
  };

  const handleRoleRemoveConfirm = async () => {
    if (!roleToRemove) return;

    try {
      await request({
        url: `/dashboard-component-role/component/${roleToRemove.componentId}/role/${roleToRemove.roleId}`,
        method: 'DELETE',
      });

      toast.success(t('roleDeleted'));
      refetch();
    } catch (error) {
      console.error('Erro ao remover permissão do componente:', error);
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
          <h2 className="text-lg font-semibold">{t('componentsTab')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('manageComponents')}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={handleNew}>
              <IconPlus className="size-4" />
              {t('newComponent')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isNew ? t('newComponent') : t('editComponent')}
              </DialogTitle>
              <DialogDescription>{t('fillComponentData')}</DialogDescription>
            </DialogHeader>
            {selectedComponent && (
              <div className="space-y-4">
                {!isNew && (
                  <div className="flex items-center gap-2">
                    <IconGlobe className="size-4" />
                    <Select
                      value={selectedLocale}
                      onValueChange={setSelectedLocale}
                    >
                      <SelectTrigger style={{ width: 200 }}>
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
                    placeholder={t('componentSlugPlaceholder')}
                    value={selectedComponent.slug || ''}
                    onChange={(e) =>
                      setSelectedComponent({
                        ...selectedComponent,
                        slug: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{t('name')}</Label>
                  <Input
                    id="name"
                    placeholder={t('componentNamePlaceholder')}
                    value={
                      selectedComponent.locale?.[selectedLocale]?.name || ''
                    }
                    onChange={(e) =>
                      setSelectedComponent({
                        ...selectedComponent,
                        locale: {
                          ...selectedComponent.locale,
                          [selectedLocale]: {
                            ...selectedComponent.locale?.[selectedLocale],
                            name: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('descriptionLabel')}</Label>
                  <Input
                    id="description"
                    placeholder={t('descriptionPlaceholder')}
                    value={
                      selectedComponent.locale?.[selectedLocale]?.description ||
                      ''
                    }
                    onChange={(e) =>
                      setSelectedComponent({
                        ...selectedComponent,
                        locale: {
                          ...selectedComponent.locale,
                          [selectedLocale]: {
                            ...selectedComponent.locale?.[selectedLocale],
                            description: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>

                <div className="rounded-md border p-4 bg-muted/50">
                  <h4 className="text-sm font-medium mb-3">
                    {t('dimensions')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="width">{t('defaultWidth')}</Label>
                      <Input
                        id="width"
                        type="number"
                        min="1"
                        max="12"
                        value={selectedComponent.width || 3}
                        onChange={(e) =>
                          setSelectedComponent({
                            ...selectedComponent,
                            width: parseInt(e.target.value) || 3,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">{t('defaultHeight')}</Label>
                      <Input
                        id="height"
                        type="number"
                        min="1"
                        value={selectedComponent.height || 2}
                        onChange={(e) =>
                          setSelectedComponent({
                            ...selectedComponent,
                            height: parseInt(e.target.value) || 2,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_width">{t('minWidth')}</Label>
                      <Input
                        id="min_width"
                        type="number"
                        min="1"
                        max="12"
                        value={selectedComponent.min_width || ''}
                        onChange={(e) =>
                          setSelectedComponent({
                            ...selectedComponent,
                            min_width: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_width">{t('maxWidth')}</Label>
                      <Input
                        id="max_width"
                        type="number"
                        min="1"
                        max="12"
                        value={selectedComponent.max_width || ''}
                        onChange={(e) =>
                          setSelectedComponent({
                            ...selectedComponent,
                            max_width: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_height">{t('minHeight')}</Label>
                      <Input
                        id="min_height"
                        type="number"
                        min="1"
                        value={selectedComponent.min_height || ''}
                        onChange={(e) =>
                          setSelectedComponent({
                            ...selectedComponent,
                            min_height: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_height">{t('maxHeight')}</Label>
                      <Input
                        id="max_height"
                        type="number"
                        min="1"
                        value={selectedComponent.max_height || ''}
                        onChange={(e) =>
                          setSelectedComponent({
                            ...selectedComponent,
                            max_height: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="is_resizable"
                      checked={selectedComponent.is_resizable ?? true}
                      onCheckedChange={(checked) =>
                        setSelectedComponent({
                          ...selectedComponent,
                          is_resizable: checked === true,
                        })
                      }
                    />
                    <Label
                      htmlFor="is_resizable"
                      className="text-sm font-normal cursor-pointer"
                    >
                      {t('resizableLabel')}
                    </Label>
                  </div>

                  <div className="mt-4 p-3 rounded-md bg-background border">
                    <p className="text-xs text-muted-foreground mb-2">
                      {t('sizePreview')}
                    </p>
                    <div className="grid grid-cols-12 gap-1 h-32">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className={`border border-dashed ${
                            i < (selectedComponent.width || 3)
                              ? 'bg-primary/20 border-primary'
                              : 'border-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('sizeLabel')} {selectedComponent.width || 3} x{' '}
                      {selectedComponent.height || 2}
                      {selectedComponent.min_width &&
                        ` (${t('minWidth')}: ${selectedComponent.min_width})`}
                      {selectedComponent.max_width &&
                        ` (${t('maxWidth')}: ${selectedComponent.max_width})`}
                    </p>
                  </div>
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
              <TableHead>{t('slug')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('size')}</TableHead>
              <TableHead>{t('resizable')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead style={{ width: 100 }}>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  {t('loading')}
                </TableCell>
              </TableRow>
            ) : components && components.length > 0 ? (
              components.map((component) => {
                const name =
                  component.dashboard_component_locale.find(
                    (l) => l.locale.code === currentLocaleCode
                  )?.name || component.slug;

                const description = component.dashboard_component_locale.find(
                  (l) => l.locale.code === currentLocaleCode
                )?.description;

                const roleEntries = (
                  component.dashboard_component_role?.map((componentRole) => {
                    const roleId =
                      componentRole.role_id ??
                      componentRole.role.role_id ??
                      componentRole.role.id;

                    if (!roleId) return null;

                    const localeRoleName = componentRole.role.role_locale?.find(
                      (roleLocale) =>
                        roleLocale.locale.code === currentLocaleCode
                    )?.name;

                    return {
                      id: roleId,
                      name: localeRoleName || componentRole.role.slug,
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
                  <TableRow key={component.id}>
                    <TableCell className="font-mono">
                      {component.slug}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{name}</span>
                        {description && (
                          <span className="text-muted-foreground text-xs">
                            {description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {component.width}x{component.height}
                    </TableCell>
                    <TableCell>
                      {component.is_resizable ? t('yes') : t('no')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {roleEntries.length > 0 ? (
                          roleEntries.map((roleEntry) => (
                            <Badge
                              key={`${component.id}-${roleEntry.id}`}
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
                                        component.id,
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
                              onClick={() => handleOpenRoleSheet(component)}
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
                          onClick={() => handleEdit(component)}
                        >
                          <IconEdit className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteClick(component.id)}
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
                <TableCell colSpan={6} className="text-center">
                  {t('noComponents')}
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
            setComponentForRoleSheet(null);
            setSelectedRoleIds([]);
          }
        }}
      >
        <ResizableSheetContent
          sheetId="core-dashboard-components-role-sheet"
          defaultWidth={560}
          minWidth={420}
          maxWidth={920}
          side="right"
          className="sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>{t('addRole')}</SheetTitle>
            <SheetDescription>
              {componentForRoleSheet
                ? `${t('component')}: ${componentForRoleSheet.slug}`
                : t('manageComponentRoles')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 py-4">
            {isLoadingRoles ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : availableRoles.length > 0 ? (
              availableRoles.map((role) => {
                const roleId = role.role_id ?? role.id;
                if (!roleId) return null;

                const roleName = role.name || role.slug;
                const alreadyLinked =
                  componentForRoleSheet?.dashboard_component_role?.some(
                    (componentRole) =>
                      (componentRole.role_id ??
                        componentRole.role.role_id ??
                        componentRole.role.id) === roleId
                  ) ?? false;

                const isSelected = selectedRoleIds.includes(roleId);

                return (
                  <div
                    key={`available-role-${roleId}`}
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
            <Button onClick={handleAddRolesToComponent}>{t('save')}</Button>
          </SheetFooter>
        </ResizableSheetContent>
      </Sheet>
    </div>
  );
}
