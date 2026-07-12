'use client';

import {
  EmptyState,
  Page,
  PageHeader,
  PaginationFooter,
  SearchBar,
} from '@/components/entity-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { KpiCardsGrid, type KpiCardItem } from '@/components/ui/kpi-cards-grid';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useFormDraft } from '@/hooks/use-form-draft';
import { formatDateTime } from '@/lib/format-date';
import { Role } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import {
  FileText,
  Menu,
  Route,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { RoleMenusSection } from './menus';
import { RoleRoutesSection } from './routes';
import { RoleUsersSection } from './users';

type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

type RoleStats = {
  totalRoles: number;
};

type Locale = {
  code: string;
  name: string;
};

type RoleLocale = {
  name: string;
  description?: string;
};

type RoleDetail = {
  id: number;
  slug: string;
  role_locale?: Array<{
    name: string;
    description?: string;
    locale?: {
      code: string;
    };
  }>;
  locale?: Record<string, RoleLocale>;
};

type RoleListItem = Role & {
  role_id: number;
  user_count?: number;
  menu_count?: number;
  route_count?: number;
};

type RoleDraftPayload = {
  mode: 'create' | 'edit';
  roleId: number | null;
  localeCode: string;
  values: {
    slug: string;
    name: string;
    description: string;
  };
};

const ROLE_CREATE_DRAFT_STORAGE_KEY = 'core-role-create-draft';
const ROLE_EDIT_DRAFT_STORAGE_KEY = 'core-role-edit-draft';

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

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export default function RolePage() {
  const t = useTranslations('core.RolePage');
  const { request, currentLocaleCode, locales, getSettingValue } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDetail | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [selectedLocale, setSelectedLocale] = useState(currentLocaleCode);

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
    storageKey: 'pagination:core-roles:pageSize',
    defaultValue: 12,
    allowedValues: pageSizeOptions,
  });
  const [activeTab, setActiveTab] = useState('basic-info');
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const {
    data: rolesResponse,
    isLoading,
    refetch,
  } = useQuery<PaginatedResponse<RoleListItem>>({
    queryKey: ['roles', page, pageSize, searchQuery, currentLocaleCode],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (searchQuery) params.set('search', searchQuery);

      const response = await request<PaginatedResponse<RoleListItem>>({
        url: `/role?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
  });

  const stats: RoleStats = {
    totalRoles: Number(rolesResponse?.total || 0),
  };

  const addRoleSchema = z.object({
    slug: z.string().min(2, t('errorSlug')),
    name: z.string().min(2, t('errorName')),
    description: z.string().optional(),
  });

  const form = useForm<z.infer<typeof addRoleSchema>>({
    resolver: zodResolver(addRoleSchema),
    defaultValues: {
      slug: '',
      name: '',
      description: '',
    },
  });

  const editRoleSchema = z.object({
    slug: z.string().min(2, t('errorSlug')),
    name: z.string().min(2, t('errorName')),
    description: z.string().optional(),
  });

  const editForm = useForm<z.infer<typeof editRoleSchema>>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: {
      slug: '',
      name: '',
      description: '',
    },
  });

  const watchedCreateValues = useWatch({
    control: form.control,
  });
  const watchedEditValues = useWatch({
    control: editForm.control,
  });

  const {
    clearDraft: clearCreateDraft,
    loadDraft: loadCreateDraft,
    hasDraft: hasCreateDraft,
    savedAt: createDraftSavedAt,
  } = useFormDraft<RoleDraftPayload>({
    storageKey: ROLE_CREATE_DRAFT_STORAGE_KEY,
    value: {
      mode: 'create',
      roleId: null,
      localeCode: currentLocaleCode,
      values: {
        slug: watchedCreateValues.slug ?? '',
        name: watchedCreateValues.name ?? '',
        description: watchedCreateValues.description ?? '',
      },
    },
    hasData: Boolean(
      (watchedCreateValues.slug ?? '').trim() ||
      (watchedCreateValues.name ?? '').trim() ||
      (watchedCreateValues.description ?? '').trim()
    ),
    enabled: isDialogOpen,
  });

  const {
    clearDraft: clearEditDraft,
    loadDraft: loadEditDraft,
    hasDraft: hasEditDraft,
    savedAt: editDraftSavedAt,
  } = useFormDraft<RoleDraftPayload>({
    storageKey: ROLE_EDIT_DRAFT_STORAGE_KEY,
    value: {
      mode: 'edit',
      roleId: editingRole?.id ?? null,
      localeCode: selectedLocale,
      values: {
        slug: watchedEditValues.slug ?? '',
        name: watchedEditValues.name ?? '',
        description: watchedEditValues.description ?? '',
      },
    },
    hasData: Boolean(
      (watchedEditValues.slug ?? '').trim() ||
      (watchedEditValues.name ?? '').trim() ||
      (watchedEditValues.description ?? '').trim()
    ),
    enabled: Boolean(editingRole),
  });

  const createDraftStatusContent = useMemo(() => {
    if (!hasCreateDraft || !createDraftSavedAt) {
      return null;
    }

    const savedDate = new Date(createDraftSavedAt);
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
  }, [createDraftSavedAt, currentLocaleCode, getSettingValue, hasCreateDraft]);

  const editDraftStatusContent = useMemo(() => {
    if (!hasEditDraft || !editDraftSavedAt) {
      return null;
    }

    const savedDate = new Date(editDraftSavedAt);
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
  }, [editDraftSavedAt, currentLocaleCode, getSettingValue, hasEditDraft]);

  const openCreateDialog = () => {
    const storedDraft = loadCreateDraft();

    form.reset(
      storedDraft?.payload.mode === 'create'
        ? storedDraft.payload.values
        : {
            slug: '',
            name: '',
            description: '',
          }
    );
    setFormError(null);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (editingRole && editingRole.locale && selectedLocale) {
      const storedDraft = loadEditDraft();
      const shouldRestoreDraft =
        storedDraft?.payload.mode === 'edit' &&
        storedDraft.payload.roleId === editingRole.id &&
        storedDraft.payload.localeCode === selectedLocale;
      const localeData = editingRole.locale[selectedLocale];

      editForm.reset(
        shouldRestoreDraft
          ? storedDraft.payload.values
          : {
              slug: editingRole.slug || '',
              name: localeData?.name || '',
              description: localeData?.description || '',
            }
      );
    }
  }, [editForm, editingRole, loadEditDraft, selectedLocale]);

  const onSubmit = async (values: z.infer<typeof addRoleSchema>) => {
    try {
      const localeData: Record<string, RoleLocale> = {};
      localeData[currentLocaleCode] = {
        name: values.name,
        description: values.description || '',
      };

      await request({
        url: '/role',
        method: 'POST',
        data: {
          slug: values.slug,
          locale: localeData,
        },
      });

      clearCreateDraft();
      form.reset();
      refetch();
      setIsDialogOpen(false);
      setFormError(null);
      toast.success(t('roleCreatedSuccess'));
    } catch (err: unknown) {
      setFormError(String(getErrorMessage(err, t('serverError'))));
    }
  };

  const handleEdit = async (role: RoleListItem) => {
    setEditFormError(null);

    try {
      const response = await request<RoleDetail>({
        url: `/role/${role.role_id}`,
        method: 'GET',
      });

      const fullRole = response.data;
      const localeData: Record<string, RoleLocale> = {};
      if (fullRole.role_locale && Array.isArray(fullRole.role_locale)) {
        fullRole.role_locale.forEach((rl) => {
          const localeCode = rl.locale?.code;
          if (localeCode) {
            localeData[localeCode] = {
              name: rl.name || '',
              description: rl.description || '',
            };
          }
        });
      }

      locales?.forEach((locale: Locale) => {
        if (!localeData[locale.code]) {
          localeData[locale.code] = {
            name: '',
            description: '',
          };
        }
      });

      const storedDraft = loadEditDraft();
      const nextLocale =
        storedDraft?.payload.mode === 'edit' &&
        storedDraft.payload.roleId === fullRole.id
          ? storedDraft.payload.localeCode
          : currentLocaleCode;

      setSelectedLocale(nextLocale);
      setActiveTab('basic-info');
      setEditingRole({
        ...fullRole,
        locale: localeData,
      });
    } catch (err) {
      console.error('Error fetching role:', err);
      toast.error(t('serverError'));
    }
  };

  const onEditSubmit = async (values: z.infer<typeof editRoleSchema>) => {
    if (!editingRole || !editingRole.locale) return;

    try {
      const updatedLocale = {
        ...editingRole.locale,
        [selectedLocale]: {
          name: values.name,
          description: values.description || '',
        },
      };

      await request({
        url: `/role/${editingRole.id}`,
        method: 'PATCH',
        data: {
          slug: values.slug,
          locale: updatedLocale,
        },
      });

      clearEditDraft();
      toast.success(t('roleUpdatedSuccess'));
      setEditFormError(null);
      await refetch();
      setEditingRole(null);
    } catch (err: unknown) {
      setEditFormError(String(getErrorMessage(err, t('serverError'))));
    }
  };

  const onDelete = async () => {
    try {
      await request({
        url: `/role`,
        method: 'DELETE',
        data: {
          ids: [Number(editingRole?.id)],
        },
      });
      refetch();
      setOpenDeleteModal(false);
      setEditingRole(null);
      setEditFormError(null);
      toast.success(t('roleDeletedSuccess'));
    } catch (err: unknown) {
      setEditFormError(String(getErrorMessage(err, t('serverError'))));
    }
  };

  const handleRefreshEditingRole = async () => {
    if (!editingRole?.id) return;

    try {
      const response = await request<RoleDetail>({
        url: `/role/${editingRole.id}`,
        method: 'GET',
      });

      const fullRole = response.data;
      const localeData: Record<string, RoleLocale> = {};

      if (fullRole.role_locale && Array.isArray(fullRole.role_locale)) {
        fullRole.role_locale.forEach((rl) => {
          const localeCode = rl.locale?.code;
          if (localeCode) {
            localeData[localeCode] = {
              name: rl.name || '',
              description: rl.description || '',
            };
          }
        });
      }

      locales?.forEach((locale: Locale) => {
        if (!localeData[locale.code]) {
          localeData[locale.code] = {
            name: '',
            description: '',
          };
        }
      });

      setEditingRole({
        ...fullRole,
        locale: localeData,
      });
    } catch (err) {
      console.error('Error refreshing role:', err);
    }
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: t('home'), href: '/' }, { label: t('roles') }]}
        actions={[
          {
            label: t('buttonAddRole'),
            onClick: openCreateDialog,
            variant: 'default',
          },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <KpiCardsGrid
        className="grid-cols-1 md:grid-cols-1 xl:grid-cols-1"
        items={
          [
            {
              key: 'totalRoles',
              title: t('totalRoles'),
              value: stats.totalRoles,
              icon: ShieldCheck,
            },
          ] satisfies KpiCardItem[]
        }
      />

      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={() => refetch()}
        placeholder={t('searchPlaceholder')}
        className="mt-4"
      />

      <div className="flex-1 pt-4">
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card
                key={`skeleton-${i}`}
                className="flex flex-col justify-between gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm animate-pulse"
              >
                <CardHeader className="p-0">
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded bg-muted" />
                    <div className="h-3 w-32 rounded bg-muted" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {!isLoading &&
        (!rolesResponse?.data || rolesResponse.data.length === 0) ? (
          <EmptyState
            icon={<ShieldCheck className="h-12 w-12" />}
            title={t('noRolesFound')}
            description={t('description')}
            actionLabel={t('buttonAddRole')}
            onAction={openCreateDialog}
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {(rolesResponse?.data as RoleListItem[])?.map((role) => (
              <Card
                key={String(role.role_id)}
                onDoubleClick={() => handleEdit(role)}
                className="cursor-pointer rounded-md flex flex-col justify-between gap-2 border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary"
              >
                <CardHeader className="flex items-start justify-between gap-4 p-0">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-12 w-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold">
                        {role.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {role.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(role)}
                  >
                    {t('buttonEditRole')}
                  </Button>
                </CardHeader>
                {role.description && (
                  <CardContent className="p-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {role.description}
                    </p>
                    <div className="text-xs line-clamp-2 flex gap-2 py-2">
                      <div>
                        {role.user_count ?? 0}{' '}
                        {(role.user_count ?? 0) === 1 ? t('user') : t('users')}
                      </div>
                      <div>•</div>
                      <div>
                        {role.menu_count ?? 0}{' '}
                        {(role.menu_count ?? 0) === 1 ? t('menu') : t('menus')}
                      </div>
                      <div>•</div>
                      <div>
                        {role.route_count ?? 0}{' '}
                        {(role.route_count ?? 0) === 1
                          ? t('route')
                          : t('routes')}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        <div className="w-full border-t pt-2 mt-4">
          <PaginationFooter
            currentPage={page}
            pageSize={pageSize}
            totalItems={rolesResponse?.total || 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
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
              setFormError(null);
            }
          }}
        >
          <ResizableSheetContent
            sheetId="core-roles-create-sheet"
            defaultWidth={560}
            minWidth={420}
            maxWidth={920}
            className="w-full sm:max-w-lg overflow-y-auto gap-0"
          >
            <SheetHeader>
              <SheetTitle>{t('dialogAddRoleTitle')}</SheetTitle>
              <SheetDescription>
                {t('dialogAddRoleDescription')}
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 px-4 pt-2"
              >
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formSlugLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('formSlugPlaceholder')}
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
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formDescriptionLabel')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('formDescriptionPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {formError && (
                  <Alert
                    variant="destructive"
                    className="border-red-300 bg-red-50 rounded-md p-4"
                  >
                    <AlertTitle className="text-sm">
                      {t('verifyYourInput')}
                    </AlertTitle>
                    <AlertDescription className="text-sm">
                      {formError}
                    </AlertDescription>
                  </Alert>
                )}

                {createDraftStatusContent ? (
                  <p className="text-xs text-muted-foreground">
                    {createDraftStatusContent}
                  </p>
                ) : null}

                <Button type="submit" className="w-full">
                  {t('buttonAddRole')}
                </Button>
              </form>
            </Form>
          </ResizableSheetContent>
        </Sheet>

        {editingRole && (
          <Sheet open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
            <ResizableSheetContent
              sheetId="core-roles-edit-sheet"
              defaultWidth={920}
              minWidth={620}
              maxWidth={1320}
              className="w-full sm:max-w-3xl overflow-y-auto gap-0"
            >
              <SheetHeader>
                <SheetTitle>{t('titleEditRole')}</SheetTitle>
                <SheetDescription>
                  {editingRole.locale?.[currentLocaleCode]?.name ||
                    editingRole.slug}
                </SheetDescription>
              </SheetHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 bg-muted rounded-md text-muted-foreground text-sm">
                  <TabsTrigger
                    value="basic-info"
                    className="flex items-center justify-center gap-2 px-3 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-medium"
                  >
                    <FileText className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="hidden md:inline">
                      {t('tabBasicInfo')}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="users"
                    className="flex items-center justify-center gap-2 px-3 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-medium"
                  >
                    <Users className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="hidden md:inline">{t('tabUsers')}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="menus"
                    className="flex items-center justify-center gap-2 px-3 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-medium"
                  >
                    <Menu className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="hidden md:inline">{t('tabMenus')}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="routes"
                    className="flex items-center justify-center gap-2 px-3 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-medium"
                  >
                    <Route className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="hidden md:inline">{t('tabRoutes')}</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="basic-info"
                  className="space-y-4 mt-4 p-4 pt-0"
                >
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {t('basicInfoTitle')}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('basicInfoDescription')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('editingInLocale')}:
                      </span>
                      <Select
                        value={selectedLocale}
                        onValueChange={(value) => setSelectedLocale(value)}
                      >
                        <SelectTrigger className="h-8 w-45">
                          <SelectValue placeholder={t('selectLocale')} />
                        </SelectTrigger>
                        <SelectContent>
                          {locales?.map((locale: Locale) => (
                            <SelectItem key={locale.code} value={locale.code}>
                              {locale.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Form {...editForm}>
                      <form
                        onSubmit={editForm.handleSubmit(onEditSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={editForm.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('editSlugLabel')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('editNameLabel')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('editDescriptionLabel')}</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {editFormError && (
                          <Alert
                            variant="destructive"
                            className="border-red-300 bg-red-50 rounded-md p-4"
                          >
                            <AlertTitle className="text-sm">
                              {t('verifyYourInput')}
                            </AlertTitle>
                            <AlertDescription className="text-sm">
                              {editFormError}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex flex-col w-full gap-2 pt-2">
                          {editDraftStatusContent ? (
                            <p className="text-xs text-muted-foreground">
                              {editDraftStatusContent}
                            </p>
                          ) : null}
                          <Button type="submit" className="w-full">
                            {t('saveChanges')}
                          </Button>
                          <Button
                            className="w-full"
                            type="button"
                            variant="outline"
                            onClick={() => {
                              clearEditDraft();
                              setEditingRole(null);
                            }}
                          >
                            {t('cancel')}
                          </Button>
                        </div>
                      </form>
                    </Form>

                    <div className="border-t pt-4">
                      <Button
                        className="w-full cursor-pointer"
                        variant="destructive"
                        onClick={() => setOpenDeleteModal(true)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{t('buttonDeleteRole')}</span>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="space-y-4 mt-4 p-4 pt-0">
                  <RoleUsersSection
                    roleId={editingRole.id!}
                    onUserChange={handleRefreshEditingRole}
                  />
                </TabsContent>

                <TabsContent value="menus" className="space-y-4 mt-4 p-4 pt-0">
                  <RoleMenusSection
                    roleId={editingRole.id!}
                    onMenuChange={handleRefreshEditingRole}
                  />
                </TabsContent>

                <TabsContent value="routes" className="space-y-4 mt-4 p-4 pt-0">
                  <RoleRoutesSection
                    roleId={editingRole.id!}
                    onRouteChange={handleRefreshEditingRole}
                  />
                </TabsContent>
              </Tabs>
            </ResizableSheetContent>
          </Sheet>
        )}

        <AlertDialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dialogDeleteRoleTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('dialogDeleteRoleDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('deleteRoleCancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>
                {t('deleteRoleConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Page>
  );
}
