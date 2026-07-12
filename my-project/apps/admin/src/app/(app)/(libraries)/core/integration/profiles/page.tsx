'use client';

import type React from 'react';

import {
  EmptyState,
  Page,
  PageHeader,
  PaginationFooter,
  SearchBar,
} from '@/components/entity-list';
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
import { IntegrationProfileSheet } from '@/components/integration-profile/integration-profile-sheet';
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
} from '@/components/ui/dialog';
import { IntegrationLogo } from '@/components/ui/integration-logo';
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
import { TableBodySkeleton } from '@/components/ui/skeletons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePagination } from '@/hooks/use-pagination';
import { formatDate } from '@/lib/format-date';
import { useApp } from '@hed-hog/next-app-provider';
import { Pencil, PlugZap, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type LocaleEntry = { name: string; locale: { code: string } };

type IntegrationType = {
  id: number;
  slug: string;
  icon: string | null;
  integration_type_locale: LocaleEntry[];
};

type IntegrationProvider = {
  id: number;
  slug: string;
  type_id: number;
  integration_provider_locale: LocaleEntry[];
};

type IntegrationProfile = {
  id: number;
  slug: string;
  name: string;
  type_id: number;
  provider_id: number;
  config: Record<string, unknown> | null;
  is_active: boolean;
  uses_count: number;
  created_at: string;
  updated_at: string;
  integration_type?: IntegrationType;
  integration_provider?: IntegrationProvider;
};

type ImportValidatedProfile = {
  index: number;
  slug: string;
  name: string;
  type_slug: string;
  provider_slug: string;
  config: Record<string, unknown> | null;
  is_active: boolean;
  has_conflict: boolean;
};

type ImportValidationResponse = {
  format: {
    type: string;
    version: number;
    generated_at: string;
    include_secrets: boolean;
  };
  total_profiles: number;
  valid_profiles: number;
  invalid_profiles: number;
  conflict_profiles: number;
  importable_profiles: number;
  conflict_slugs: string[];
  profiles: ImportValidatedProfile[];
  invalid_items: Array<{
    index: number;
    slug?: string;
    errors: string[];
  }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocaleName(locales: LocaleEntry[], code: string): string {
  return (
    locales.find((l) => l.locale.code === code)?.name ?? locales[0]?.name ?? ''
  );
}

// ─── Tab list component ───────────────────────────────────────────────────────

function TypeTab({
  typeId,
  localeCode,
  types,
  providers,
  onEdit,
  onDelete,
  refreshKey,
  t,
  getSettingValue,
  currentLocaleCode,
  selectedProfileIds,
  onToggleProfileSelection,
  onToggleAllVisible,
}: {
  typeId: number;
  localeCode: string;
  types: IntegrationType[];
  providers: IntegrationProvider[];
  onEdit: (profile: IntegrationProfile) => void;
  onDelete: (id: number) => void;
  refreshKey: number;
  t: ReturnType<typeof useTranslations>;
  getSettingValue: (key: string) => string | undefined;
  currentLocaleCode: string;
  selectedProfileIds: Set<number>;
  onToggleProfileSelection: (id: number, checked: boolean) => void;
  onToggleAllVisible: (ids: number[], checked: boolean) => void;
}) {
  const {
    items,
    refetch,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    search,
    setSearch,
    isLoading,
  } = usePagination({ url: `/integration-profile?typeId=${typeId}` });

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  const profiles = Array.isArray(items) ? (items as IntegrationProfile[]) : [];
  const allVisibleSelected =
    profiles.length > 0 &&
    profiles.every((profile) => selectedProfileIds.has(profile.id));

  const typeById = new Map(types.map((type) => [type.id, type]));
  const providerById = new Map(
    providers.map((provider) => [provider.id, provider])
  );

  const toTitle = (value: string) =>
    value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const getResolvedType = (profile: IntegrationProfile) => {
    return profile.integration_type ?? typeById.get(profile.type_id);
  };

  const getResolvedProvider = (profile: IntegrationProfile) => {
    return (
      profile.integration_provider ?? providerById.get(profile.provider_id)
    );
  };

  const getProviderName = (profile: IntegrationProfile) => {
    const provider = getResolvedProvider(profile);
    if (!provider) return '';
    return (
      getLocaleName(provider.integration_provider_locale, localeCode) ||
      toTitle(provider.slug)
    );
  };

  const getProviderSlug = (profile: IntegrationProfile) => {
    return getResolvedProvider(profile)?.slug ?? '';
  };

  const getConfigurationLabel = (profile: IntegrationProfile) => {
    const providerSlug = getProviderSlug(profile);
    if (providerSlug) return providerSlug.toUpperCase();

    const typeSlug = getResolvedType(profile)?.slug;
    if (typeSlug === 'email') return 'SMTP';

    return '—';
  };

  return (
    <div className="space-y-4">
      <SearchBar
        searchQuery={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onSearch={() => setPage(1)}
        placeholder={t('searchPlaceholder')}
      />

      {isLoading || profiles.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) =>
                      onToggleAllVisible(
                        profiles.map((profile) => profile.id),
                        checked === true
                      )
                    }
                    aria-label={t('selectAllVisible')}
                  />
                </TableHead>
                <TableHead>{t('tableName')}</TableHead>
                <TableHead>{t('tableSlug')}</TableHead>
                <TableHead>{t('tableProvider')}</TableHead>
                <TableHead>
                  {currentLocaleCode.startsWith('pt')
                    ? 'Configuração'
                    : 'Configuration'}
                </TableHead>
                <TableHead>{t('tableStatus')}</TableHead>
                <TableHead className="text-right">{t('tableUses')}</TableHead>
                <TableHead>{t('tableUpdated')}</TableHead>
                <TableHead className="text-right">
                  {t('tableActions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableBodySkeleton rows={pageSize} columns={9} />
              ) : (
                profiles.map((profile) => (
                <TableRow
                  key={profile.id}
                  className="cursor-pointer"
                  onDoubleClick={() => onEdit(profile)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedProfileIds.has(profile.id)}
                      onCheckedChange={(checked) =>
                        onToggleProfileSelection(profile.id, checked === true)
                      }
                      onClick={(event) => event.stopPropagation()}
                      aria-label={t('selectProfile')}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{profile.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {profile.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1.5">
                      <IntegrationLogo
                        provider={getProviderSlug(profile)}
                        size={14}
                        decorative
                      />
                      {getProviderName(profile)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getConfigurationLabel(profile)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={profile.is_active ? 'default' : 'outline'}>
                      {profile.is_active
                        ? t('statusActive')
                        : t('statusInactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {profile.uses_count > 0 ? (
                      <Badge variant="secondary">{profile.uses_count}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(
                      profile.updated_at,
                      getSettingValue,
                      currentLocaleCode
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(profile);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(profile.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<PlugZap className="h-12 w-12" />}
          title={t('noProfilesFound')}
          description={t('noProfilesHint')}
        />
      )}

      <PaginationFooter
        currentPage={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IntegrationProfilesPage() {
  const t = useTranslations('core.IntegrationProfilePage');
  const { request, currentLocaleCode, getSettingValue } = useApp();
  const searchParams = useSearchParams();
  const requestedType = searchParams.get('type')?.trim().toLowerCase() ?? '';

  const [types, setTypes] = useState<IntegrationType[]>([]);
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [activeTab, setActiveTab] = useState<string>(requestedType);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<number | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(
    null
  );
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<number>>(
    new Set()
  );
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportIncludeSecrets, setExportIncludeSecrets] = useState(false);
  const [pendingExportScope, setPendingExportScope] = useState<
    'all' | 'selected'
  >('all');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [importPreview, setImportPreview] =
    useState<ImportValidationResponse | null>(null);
  const [conflictActions, setConflictActions] = useState<
    Record<string, 'ignore' | 'replace' | 'rename_auto'>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    request<IntegrationType[]>({
      url: '/integration-profile/types',
      method: 'GET',
    })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : ((data as any).data ?? []);
        setTypes(list);
        if (list.length === 0) return;

        const hasRequestedType = requestedType
          ? list.some((type: IntegrationType) => type.slug === requestedType)
          : false;

        if (hasRequestedType) {
          setActiveTab(requestedType);
          return;
        }

        setActiveTab((currentTab) => {
          if (
            currentTab &&
            list.some((type: IntegrationType) => type.slug === currentTab)
          ) {
            return currentTab;
          }

          return list[0].slug;
        });
      })
      .catch(() => toast.error(t('loadError')));

    request<IntegrationProvider[]>({
      url: '/integration-profile/providers',
      method: 'GET',
    })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : ((data as any).data ?? []);
        setProviders(list);
      })
      .catch(() => {});
  }, [request, requestedType, t]);

  useEffect(() => {
    if (!requestedType) return;
    if (!types.some((type) => type.slug === requestedType)) return;
    setActiveTab(requestedType);
  }, [requestedType, types]);

  const handleCreate = () => {
    setEditingProfileId(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (profile: IntegrationProfile) => {
    setEditingProfileId(profile.id);
    setIsSheetOpen(true);
  };

  const handleDelete = (id: number) => {
    setProfileToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleProfileSelection = (id: number, checked: boolean) => {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleAllVisible = (ids: number[], checked: boolean) => {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const openExportDialog = (scope: 'all' | 'selected') => {
    setPendingExportScope(scope);
    setExportIncludeSecrets(false);
    setIsExportDialogOpen(true);
  };

  const handleExport = async () => {
    const ids = Array.from(selectedProfileIds);
    if (pendingExportScope === 'selected' && ids.length === 0) {
      toast.error(t('noProfilesSelected'));
      return;
    }

    const params = new URLSearchParams();
    params.set('include_secrets', exportIncludeSecrets ? 'true' : 'false');
    if (pendingExportScope === 'selected') {
      params.set('ids', ids.join(','));
    }

    try {
      const response = await request<Blob>({
        url: `/integration-profile/export?${params.toString()}`,
        method: 'GET',
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `integration-profiles-${new Date().toISOString().split('T')[0]}.hedhog`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setIsExportDialogOpen(false);
      toast.success(t('exportSuccess'));
    } catch {
      toast.error(t('exportError'));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await request<ImportValidationResponse>({
        url: '/integration-profile/import/validate',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const initialConflictActions = Object.fromEntries(
        response.data.conflict_slugs.map((slug) => [
          slug,
          'rename_auto' as const,
        ])
      );

      setImportPreview(response.data);
      setConflictActions(initialConflictActions);
      setIsImportDialogOpen(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || t('importValidateError');
      toast.error(String(message));
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;

    if (importPreview.conflict_slugs.length > 0) {
      const allResolved = importPreview.conflict_slugs.every(
        (slug) => !!conflictActions[slug]
      );

      if (!allResolved) {
        toast.error(t('importResolveAllConflicts'));
        return;
      }
    }

    setIsImportSubmitting(true);
    try {
      const response = await request<{
        imported: number;
      }>({
        url: '/integration-profile/import/confirm',
        method: 'POST',
        data: {
          profiles: importPreview.profiles.map((profile) => ({
            slug: profile.slug,
            name: profile.name,
            type_slug: profile.type_slug,
            provider_slug: profile.provider_slug,
            config: profile.config,
            is_active: profile.is_active,
          })),
          conflict_resolutions: Object.entries(conflictActions).map(
            ([slug, action]) => ({ slug, action })
          ),
        },
      });

      setIsImportDialogOpen(false);
      setImportPreview(null);
      setConflictActions({});
      setSelectedProfileIds(new Set());
      setRefreshKey((k) => k + 1);
      toast.success(
        t('importSuccessCount', { count: Number(response.data.imported ?? 0) })
      );
    } catch (error: any) {
      const message = error?.response?.data?.message || t('importError');
      toast.error(String(message));
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (profileToDelete === null) return;
    try {
      await request({
        url: '/integration-profile',
        method: 'DELETE',
        data: { ids: [profileToDelete] },
      });
      toast.success(t('deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setProfileToDelete(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error(t('deleteError'));
    }
  };


  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: t('breadcrumbHome'), href: '/' },
          { label: t('breadcrumbTitle') },
        ]}
        actions={[
          ...(selectedProfileIds.size > 0
            ? [
                {
                  label: t('exportSelected'),
                  onClick: () => openExportDialog('selected'),
                  variant: 'outline' as const,
                },
              ]
            : []),
          {
            label: t('exportAll'),
            onClick: () => openExportDialog('all'),
            variant: 'outline' as const,
          },
          {
            label: t('import'),
            onClick: handleImportClick,
            variant: 'outline' as const,
          },
          {
            label: t('newProfile'),
            onClick: handleCreate,
            variant: 'default' as const,
          },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {types.map((ty) => (
            <TabsTrigger key={ty.slug} value={ty.slug}>
              {getLocaleName(ty.integration_type_locale, currentLocaleCode)}
            </TabsTrigger>
          ))}
        </TabsList>

        {types.map((ty) => (
          <TabsContent key={ty.slug} value={ty.slug} className="mt-4">
            <TypeTab
              typeId={ty.id}
              localeCode={currentLocaleCode}
              types={types}
              providers={providers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              refreshKey={refreshKey}
              t={t}
              getSettingValue={getSettingValue}
              currentLocaleCode={currentLocaleCode}
              selectedProfileIds={selectedProfileIds}
              onToggleProfileSelection={handleToggleProfileSelection}
              onToggleAllVisible={handleToggleAllVisible}
            />
          </TabsContent>
        ))}
      </Tabs>

      <input
        ref={fileInputRef}
        type="file"
        accept=".hedhog,application/octet-stream"
        className="hidden"
        onChange={handleImportFileChange}
      />

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('exportDialogTitle')}</DialogTitle>
            <DialogDescription>
              {pendingExportScope === 'selected'
                ? t('exportDialogDescriptionSelected')
                : t('exportDialogDescriptionAll')}
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-3 rounded-md border px-3 py-2">
            <Checkbox
              checked={exportIncludeSecrets}
              onCheckedChange={(checked) =>
                setExportIncludeSecrets(checked === true)
              }
            />
            <span className="text-sm">{t('exportIncludeSecrets')}</span>
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleExport}>{t('export')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('importDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('importDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground">
                    {t('importTotalProfiles')}
                  </p>
                  <p className="text-lg font-semibold">
                    {importPreview.total_profiles}
                  </p>
                </div>
                <div className="rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground">
                    {t('importValidProfiles')}
                  </p>
                  <p className="text-lg font-semibold">
                    {importPreview.valid_profiles}
                  </p>
                </div>
                <div className="rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground">
                    {t('importInvalidProfiles')}
                  </p>
                  <p className="text-lg font-semibold">
                    {importPreview.invalid_profiles}
                  </p>
                </div>
                <div className="rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground">
                    {t('importConflictProfiles')}
                  </p>
                  <p className="text-lg font-semibold">
                    {importPreview.conflict_profiles}
                  </p>
                </div>
              </div>

              {importPreview.invalid_items.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-semibold">
                    {t('importInvalidItemsTitle')}
                  </p>
                  <div className="space-y-2">
                    {importPreview.invalid_items.map((item) => (
                      <div
                        key={item.index}
                        className="rounded border p-2 text-xs"
                      >
                        <p className="font-semibold">
                          {item.slug
                            ? t('importInvalidItemWithSlug', {
                                slug: item.slug,
                              })
                            : t('importInvalidItemWithoutSlug', {
                                index: item.index,
                              })}
                        </p>
                        {item.errors.map((error, errorIndex) => (
                          <p key={errorIndex} className="text-muted-foreground">
                            {error}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importPreview.conflict_slugs.length > 0 && (
                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-sm font-semibold">
                    {t('importConflictTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('importConflictDescription')}
                  </p>

                  {importPreview.conflict_slugs.map((slug) => (
                    <div
                      key={slug}
                      className="grid gap-2 rounded border p-2 sm:grid-cols-[1fr_180px] sm:items-center"
                    >
                      <Badge variant="destructive" className="w-fit font-mono">
                        {slug}
                      </Badge>
                      <Select
                        value={conflictActions[slug] ?? 'rename_auto'}
                        onValueChange={(value) =>
                          setConflictActions((prev) => ({
                            ...prev,
                            [slug]: value as
                              | 'ignore'
                              | 'replace'
                              | 'rename_auto',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignore">
                            {t('conflictActionIgnore')}
                          </SelectItem>
                          <SelectItem value="replace">
                            {t('conflictActionReplace')}
                          </SelectItem>
                          <SelectItem value="rename_auto">
                            {t('conflictActionRenameAuto')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportPreview(null);
                setConflictActions({});
              }}
              disabled={isImportSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleConfirmImport} disabled={isImportSubmitting}>
              {isImportSubmitting ? t('importing') : t('confirmImport')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IntegrationProfileSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        profileId={editingProfileId}
        initialTypeSlug={activeTab}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      {/* ── Delete confirmation ── */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
