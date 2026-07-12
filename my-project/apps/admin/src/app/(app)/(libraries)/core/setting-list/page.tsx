'use client';

import {
  EmptyState,
  EntityCard,
  Page,
  PageHeader,
  PaginationFooter,
  SearchBar,
  ViewModeToggle,
} from '@/components/entity-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import {
  Sheet,
  SheetDescription,
  SheetFooter,
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
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { usePersistedViewMode } from '@/hooks/use-persisted-view-mode';
import { PaginatedResult } from '@/types/pagination-result';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Setting,
  SettingComponentEnum,
  SettingSubgroup,
} from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import {
  GripVertical,
  ListTree,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

type SettingWithList = Setting & {
  subgroup_id?: number | null;
  setting_subgroup?: SettingSubgroup | null;
  setting_list?: Array<{
    id: number;
    order?: number;
    value: string;
  }>;
};

type DraftOption = {
  id: string;
  value: string;
};

const createEmptyPage = <T,>(pageSize: number): PaginatedResult<T> => ({
  total: 0,
  lastPage: 0,
  page: 1,
  pageSize,
  prev: null,
  next: null,
  data: [],
});

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export default function CoreSettingListPage() {
  const t = useTranslations('core.SettingListPage');
  const { request, currentLocaleCode, showToastHandler } = useApp();
  const [search, setSearch] = useState('');
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
    storageKey: 'pagination:setting-list:pageSize',
    defaultValue: 12,
    allowedValues: pageSizeOptions,
  });
  const [viewMode, setViewMode] = usePersistedViewMode({
    storageKey: 'pagination:setting-list:viewMode',
    defaultValue: 'list' as const,
    allowedValues: ['list', 'cards'] as const,
  });
  const [savingOptionBySettingId, setSavingOptionBySettingId] = useState<
    Record<number, boolean>
  >({});
  const [editingSettingId, setEditingSettingId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDraftOptions, setSheetDraftOptions] = useState<DraftOption[]>([]);
  const draftIdRef = useRef(0);

  const createDraftOption = (value = ''): DraftOption => {
    draftIdRef.current += 1;
    return { id: `draft-option-${draftIdRef.current}`, value };
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const {
    data: settingsPage,
    isLoading,
    refetch,
  } = useQuery<PaginatedResult<SettingWithList>>({
    queryKey: ['core-setting-list-items', currentLocaleCode],
    queryFn: async () => {
      const response = await request<PaginatedResult<SettingWithList>>({
        url: '/setting?page=1&pageSize=500',
        method: 'GET',
      });
      return response.data;
    },
    placeholderData: (previous) =>
      previous ?? createEmptyPage<SettingWithList>(200),
  });

  const allSettings = useMemo<SettingWithList[]>(
    () => settingsPage?.data ?? [],
    [settingsPage]
  );

  const listTypeSettings = useMemo<SettingWithList[]>(
    () =>
      allSettings.filter((setting) => {
        const component = setting.component;
        return (
          component === SettingComponentEnum.COMBOBOX ||
          component === SettingComponentEnum.CHECKBOX
        );
      }),
    [allSettings]
  );

  const filteredSettings = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    if (!normalizedQuery) {
      return listTypeSettings;
    }

    return listTypeSettings.filter((setting: SettingWithList) => {
      const options = (setting.setting_list ?? []).map(
        (option: { value: string }) => option.value
      );
      const text = [
        setting.name,
        setting.slug,
        setting.description,
        setting.setting_subgroup?.name,
        setting.setting_subgroup?.slug,
        options.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(normalizedQuery);
    });
  }, [search, listTypeSettings]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginatedSettings = useMemo(
    () => filteredSettings.slice((page - 1) * pageSize, page * pageSize),
    [filteredSettings, page, pageSize]
  );

  const editingSetting = useMemo(
    () =>
      editingSettingId == null
        ? null
        : (listTypeSettings.find(
            (setting) => setting.id === editingSettingId
          ) ?? null),
    [editingSettingId, listTypeSettings]
  );

  const openSheetForSetting = (setting: SettingWithList) => {
    if (setting.id == null) {
      return;
    }

    const sortedOptions = [...(setting.setting_list ?? [])].sort(
      (left, right) => (left.order ?? 0) - (right.order ?? 0)
    );

    setEditingSettingId(setting.id);
    setSheetDraftOptions(
      sortedOptions.map((option) => createDraftOption(option.value))
    );
    setSheetOpen(true);
  };

  const handleSheetDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    setSheetDraftOptions((previous) => {
      const oldIndex = previous.findIndex((item) => item.id === active.id);
      const newIndex = previous.findIndex((item) => item.id === over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return previous;
      }

      return arrayMove(previous, oldIndex, newIndex);
    });
  };

  const saveSettingOptions = async (
    setting: SettingWithList,
    overrideValues?: string[]
  ) => {
    const settingId = setting.id;
    if (!settingId) {
      return;
    }

    const values = (overrideValues ?? []).map((value) => value.trim());

    setSavingOptionBySettingId((previous) => ({
      ...previous,
      [settingId]: true,
    }));

    try {
      await request({
        url: `/setting/${settingId}/options`,
        method: 'PUT',
        data: {
          options: values.map((value, index) => ({
            value,
            order: index + 1,
          })),
        },
      });

      showToastHandler('success', t('optionsSavedSuccess'));
      await refetch();
    } catch (_error) {
      showToastHandler('error', t('optionsSavedError'));
    } finally {
      setSavingOptionBySettingId((previous) => ({
        ...previous,
        [settingId]: false,
      }));
    }
  };

  const handleSaveSheet = async () => {
    if (!editingSetting) {
      return;
    }

    const values = sheetDraftOptions.map((option) => option.value);
    await saveSettingOptions(editingSetting, values);
    setSheetOpen(false);
    setEditingSettingId(null);
  };

  const addSheetOption = () => {
    setSheetDraftOptions((previous) => [...previous, createDraftOption('')]);
  };

  const removeSheetOption = (draftId: string) => {
    setSheetDraftOptions((previous) =>
      previous.filter((option) => option.id !== draftId)
    );
  };

  const updateSheetOption = (draftId: string, value: string) => {
    setSheetDraftOptions((previous) =>
      previous.map((option) =>
        option.id === draftId ? { ...option, value } : option
      )
    );
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: t('breadcrumbs.home'), href: '/' },
          { label: t('breadcrumbs.core') },
          { label: t('title') },
        ]}
        title={t('title')}
        description={t('description')}
        actions={[
          {
            label: t('actions.refresh'),
            onClick: () => refetch(),
            icon: <RefreshCw className="h-4 w-4" />,
            iconOnly: true,
          },
        ]}
      />

      <SearchBar
        searchQuery={search}
        onSearchChange={(value) => setSearch(value)}
        placeholder={t('searchPlaceholder')}
        showSearchButton={false}
        actions={
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            listLabel={t('viewMode.list')}
            cardsLabel={t('viewMode.cards')}
          />
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t('loading')}
          </CardContent>
        </Card>
      ) : filteredSettings.length === 0 ? (
        <EmptyState
          icon={<ListTree className="h-10 w-10" />}
          title={t('emptyTitle')}
          description={
            listTypeSettings.length === 0
              ? t('emptyDescriptionNoSettings')
              : t('emptyDescriptionFiltered')
          }
        />
      ) : viewMode === 'list' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.group')}</TableHead>
                <TableHead>{t('columns.type')}</TableHead>
                <TableHead className="text-right">
                  {t('columns.items')}
                </TableHead>
                <TableHead className="w-30" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSettings.map((setting: SettingWithList) => {
                const isSaving =
                  setting.id != null
                    ? savingOptionBySettingId[setting.id] === true
                    : false;

                return (
                  <TableRow
                    key={setting.id}
                    className="cursor-pointer"
                    onDoubleClick={() => openSheetForSetting(setting)}
                  >
                    <TableCell>
                      <p className="font-medium">
                        {String(setting.name ?? setting.slug)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {setting.slug}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {setting.setting_group
                        ? String(
                            setting.setting_group.name ??
                              setting.setting_group.slug
                          )
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{setting.component}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {t('itemCount', {
                          count: setting.setting_list?.length ?? 0,
                        })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openSheetForSetting(setting)}
                        disabled={setting.id == null || isSaving}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        {t('actions.editOptions')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginatedSettings.map((setting: SettingWithList) => (
            <div
              key={setting.id}
              onDoubleClick={() => openSheetForSetting(setting)}
            >
              <EntityCard
                title={String(setting.name ?? setting.slug)}
                description={setting.slug}
                badges={[
                  ...(setting.setting_group
                    ? [
                        {
                          label: String(
                            setting.setting_group.name ??
                              setting.setting_group.slug
                          ),
                          variant: 'secondary' as const,
                        },
                      ]
                    : []),
                  {
                    label: String(setting.component ?? ''),
                    variant: 'outline' as const,
                  },
                ]}
                metadata={[
                  {
                    label: t('columns.items'),
                    value: String(setting.setting_list?.length ?? 0),
                  },
                ]}
                actions={[
                  {
                    label: t('actions.editOptions'),
                    onClick: () => openSheetForSetting(setting),
                    variant: 'outline',
                    icon: <Pencil className="h-3.5 w-3.5" />,
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredSettings.length > 0 && (
        <PaginationFooter
          currentPage={page}
          pageSize={pageSize}
          totalItems={filteredSettings.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          pageSizeOptions={pageSizeOptions}
        />
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditingSettingId(null);
            setSheetDraftOptions([]);
          }
        }}
      >
        <ResizableSheetContent
          sheetId="core-setting-list-options-sheet"
          defaultWidth={560}
          minWidth={400}
          maxWidth={900}
          className="flex w-full flex-col overflow-hidden"
        >
          <SheetHeader className="shrink-0">
            <SheetTitle>
              {editingSetting
                ? String(editingSetting.name ?? editingSetting.slug)
                : t('sheet.title')}
            </SheetTitle>
            <SheetDescription>
              {editingSetting
                ? t('sheet.description', { name: editingSetting.name ?? '' })
                : t('sheet.descriptionFallback')}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">
                {t('itemCount', { count: sheetDraftOptions.length })}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addSheetOption}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t('actions.addOption')}
              </Button>
            </div>

            {sheetDraftOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('emptyOptions')}
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSheetDragEnd}
              >
                <SortableContext
                  items={sheetDraftOptions.map((option) => option.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sheetDraftOptions.map((option, index) => (
                      <SortableOptionItem
                        key={option.id}
                        option={option}
                        index={index}
                        placeholder={t('optionPlaceholder')}
                        removeLabel={t('actions.removeOption')}
                        onChange={updateSheetOption}
                        onRemove={removeSheetOption}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <SheetFooter className="mt-6 shrink-0 px-4 pb-4">
            <Button
              type="button"
              onClick={handleSaveSheet}
              disabled={
                editingSettingId == null ||
                (editingSettingId != null &&
                  savingOptionBySettingId[editingSettingId] === true)
              }
            >
              <Save className="mr-1 h-3.5 w-3.5" />
              {editingSettingId != null &&
              savingOptionBySettingId[editingSettingId]
                ? t('actions.saving')
                : t('actions.saveOptions')}
            </Button>
          </SheetFooter>
        </ResizableSheetContent>
      </Sheet>
    </Page>
  );
}

function SortableOptionItem({
  option,
  index,
  placeholder,
  removeLabel,
  onChange,
  onRemove,
}: {
  option: DraftOption;
  index: number;
  placeholder: string;
  removeLabel: string;
  onChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex cursor-grab touch-none items-center justify-center rounded p-1 text-muted-foreground active:cursor-grabbing"
        aria-label={`reorder-option-${index + 1}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Input
        value={option.value}
        onChange={(event) => onChange(option.id, event.target.value)}
        placeholder={placeholder}
        className="bg-background"
      />

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => onRemove(option.id)}
        aria-label={removeLabel}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
