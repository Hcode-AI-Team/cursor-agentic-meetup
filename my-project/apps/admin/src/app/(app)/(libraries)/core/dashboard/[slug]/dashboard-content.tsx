'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/components/ui/use-mobile';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { useProgress } from '@bprogress/next';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { IconDeviceFloppy, IconLoader2 } from '@tabler/icons-react';
import { toBlob } from 'html-to-image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AddWidgetSelectorDialog,
  DraggableGrid,
  LayoutItem,
} from '../components';
import '../dashboard.css';
import {
  DashboardAccessResponse,
  DashboardComponent,
  WidgetLayout,
} from './types';
import { WidgetRenderer } from './widget-renderer';

interface DashboardContentProps {
  dashboardSlug: string;
  showHeader?: boolean;
  headerActionsTargetId?: string;
  externalHeaderActions?: boolean;
  requestSaveSignal?: number;
  onRuntimeActionsStateChange?: (state: {
    hasChanges: boolean;
    isSaving: boolean;
    isAutosavePending: boolean;
  }) => void;
  openWidgetPickerSignal?: number;
  onOpenWidgetPickerHandled?: () => void;
}

interface DashboardComponentsPage {
  data: DashboardComponent[];
  total: number;
  lastPage: number;
  page: number;
  pageSize: number;
  prev: number | null;
  next: number | null;
  modules?: string[];
}

const USER_STATS_WIDGETS = new Set([
  'stat-online-time',
  'stat-actions-today',
  'stat-consecutive-days',
  'stat-access-level',
]);

const USER_POST_HISTORY_WIDGETS = new Set([
  'account-security',
  'email-notifications',
]);

const USER_BOTTOM_WIDGETS = new Set(['user-roles', 'activity-timeline']);
const LAYOUT_AUTOSAVE_DELAY = 1000;

const normalizeLayoutForSave = (layout: LayoutItem[]) =>
  layout.map(({ i, x, y, w, h }) => ({
    i,
    x,
    y,
    w,
    h,
  }));

const getLayoutSignature = (layout: LayoutItem[]) =>
  JSON.stringify(normalizeLayoutForSave(layout));

const getWidgetBaseSlug = (slug: string): string => {
  const parts = slug.split('.');
  return parts[parts.length - 1] || slug;
};

const getWidgetIdentityKey = ({
  slug,
  library_slug,
}: {
  slug: string;
  library_slug?: string;
}) => {
  const baseSlug = getWidgetBaseSlug(slug);

  if (library_slug) {
    return `${library_slug}.${baseSlug}`;
  }

  return slug.includes('.') ? slug : baseSlug;
};

const normalizeUserDashboardLayout = (item: WidgetLayout): LayoutItem => {
  const baseSlug = getWidgetBaseSlug(item.slug);

  const layoutItem: LayoutItem = {
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW || 1,
    maxW: item.maxW || 12,
    minH: item.minH || 1,
    maxH: item.maxH || 10,
    static: false,
  };

  if (baseSlug === 'profile-card') {
    layoutItem.h = Math.max(item.h, 4);
  }

  if (USER_STATS_WIDGETS.has(baseSlug)) {
    layoutItem.y = Math.max(item.y, 4);
    return layoutItem;
  }

  if (baseSlug === 'login-history-chart') {
    layoutItem.y = Math.max(item.y, 5);
    return layoutItem;
  }

  if (USER_POST_HISTORY_WIDGETS.has(baseSlug)) {
    layoutItem.y = Math.max(item.y, 9);
    return layoutItem;
  }

  if (USER_BOTTOM_WIDGETS.has(baseSlug)) {
    layoutItem.y = Math.max(item.y, 14);
    layoutItem.h = item.h + 1;
    return layoutItem;
  }

  if (layoutItem.y >= 4) {
    layoutItem.y += 1;
  }

  return layoutItem;
};

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export const DashboardContent = ({
  dashboardSlug,
  showHeader = true,
  headerActionsTargetId,
  externalHeaderActions = false,
  requestSaveSignal,
  onRuntimeActionsStateChange,
  openWidgetPickerSignal,
  onOpenWidgetPickerHandled,
}: DashboardContentProps) => {
  const t = useTranslations('core.DashboardPage');
  const { request } = useApp();
  const {
    start: startProgress,
    stop: stopProgress,
    set: setProgress,
  } = useProgress();
  const router = useRouter();
  const isMobile = useIsMobile();
  const isDevelopment = process.env.NODE_ENV === 'development';

  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [widgets, setWidgets] = useState<WidgetLayout[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const [componentsPage, setComponentsPage] = useState(1);
  const [componentsPageSize, setComponentsPageSize] = usePersistedPageSize({
    storageKey: 'pagination:global:pageSize',
    defaultValue: 12,
    allowedValues: pageSizeOptions,
  });
  const [componentsSearchQuery, setComponentsSearchQuery] = useState('');
  const [componentsModuleFilter, setComponentsModuleFilter] = useState('all');
  const [headerActionsTarget, setHeaderActionsTarget] =
    useState<HTMLElement | null>(null);
  const lastSavedLayoutSignatureRef = useRef('[]');
  const latestLayoutRef = useRef(layout);
  const lastHandledSaveSignalRef = useRef<number | undefined>(undefined);

  const debouncedComponentsSearch = useDebounce(componentsSearchQuery, 400);
  const debouncedLayout = useDebounce(layout, LAYOUT_AUTOSAVE_DELAY);

  useEffect(() => {
    latestLayoutRef.current = layout;
  }, [layout]);
  const excludedComponentKeys = useMemo(
    () => widgets.map((widget) => getWidgetIdentityKey(widget)),
    [widgets]
  );

  const { data: dashboardAccess, isLoading: isCheckingAccess } =
    useQuery<DashboardAccessResponse>({
      queryKey: ['dashboard-access', dashboardSlug],
      queryFn: async () => {
        const { data } = await request<DashboardAccessResponse>({
          url: `/dashboard-core/access/${dashboardSlug}`,
          method: 'GET',
        });
        return data;
      },
    });

  useEffect(() => {
    if (
      dashboardAccess &&
      !dashboardAccess.hasAccess &&
      dashboardSlug !== 'default'
    ) {
      router.replace('/core/dashboard/default');
    }
  }, [dashboardAccess, dashboardSlug, router]);

  useEffect(() => {
    setComponentsPage(1);
    setComponentsSearchQuery('');
    setComponentsModuleFilter('all');
  }, [dashboardSlug]);

  const {
    data: availableComponentsResponse,
    isLoading: isLoadingComponents,
    refetch: refetchComponents,
  } = useQuery<DashboardComponentsPage>({
    queryKey: [
      'dashboard-components',
      dashboardSlug,
      componentsPage,
      componentsPageSize,
      debouncedComponentsSearch,
      componentsModuleFilter,
      excludedComponentKeys.join(','),
    ],
    queryFn: async () => {
      const trimmedSearch = debouncedComponentsSearch.trim();

      const { data } = await request<DashboardComponentsPage>({
        url: '/dashboard-component/user',
        method: 'GET',
        params: {
          page: componentsPage,
          pageSize: componentsPageSize,
          ...(trimmedSearch ? { search: trimmedSearch } : {}),
          ...(componentsModuleFilter !== 'all'
            ? { librarySlug: componentsModuleFilter }
            : {}),
          ...(excludedComponentKeys.length > 0
            ? { exclude: excludedComponentKeys.join(',') }
            : {}),
        },
      });
      return data;
    },
    enabled: dashboardAccess?.hasAccess ?? false,
  });

  const {
    data: userLayout,
    isLoading: isLoadingLayout,
    refetch: refetchLayout,
  } = useQuery<WidgetLayout[]>({
    queryKey: ['dashboard-layout', dashboardSlug],
    queryFn: async () => {
      const { data } = await request<WidgetLayout[]>({
        url: `/dashboard-core/layout/${dashboardSlug}`,
        method: 'GET',
      });
      return data;
    },
    enabled: dashboardAccess?.hasAccess ?? false,
  });

  useEffect(() => {
    if (userLayout) {
      if (userLayout.length > 0) {
        const gridLayout = userLayout.map((item) =>
          dashboardSlug === 'user'
            ? normalizeUserDashboardLayout(item)
            : {
                i: item.i,
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h,
                minW: item.minW || 1,
                maxW: item.maxW || 12,
                minH: item.minH || 1,
                maxH: item.maxH || 10,
                static: false,
              }
        );

        lastSavedLayoutSignatureRef.current = getLayoutSignature(gridLayout);
        setLayout(gridLayout);
        setWidgets(userLayout);
      } else {
        lastSavedLayoutSignatureRef.current = '[]';
        setLayout([]);
        setWidgets([]);
      }
      setHasChanges(false);
    }
  }, [userLayout, dashboardSlug]);

  const availableComponents = availableComponentsResponse?.data ?? [];
  const totalAvailableComponents = availableComponentsResponse?.total ?? 0;
  const availableComponentModules = availableComponentsResponse?.modules ?? [];
  const layoutSignature = useMemo(() => getLayoutSignature(layout), [layout]);
  const debouncedLayoutSignature = useMemo(
    () => getLayoutSignature(debouncedLayout),
    [debouncedLayout]
  );
  const isAutosavePending =
    hasChanges && !isSaving && layoutSignature !== debouncedLayoutSignature;

  useEffect(() => {
    onRuntimeActionsStateChange?.({
      hasChanges,
      isSaving,
      isAutosavePending,
    });
  }, [hasChanges, isAutosavePending, isSaving, onRuntimeActionsStateChange]);

  useEffect(() => {
    if (!isAutosavePending && !isSaving) {
      stopProgress(150);
      return;
    }

    startProgress(isSaving ? 0.55 : 0.2, 0, true);
    setProgress(isSaving ? 0.8 : 0.35);
  }, [isAutosavePending, isSaving, setProgress, startProgress, stopProgress]);

  useEffect(() => {
    const lastAvailablePage = Math.max(
      availableComponentsResponse?.lastPage ?? 1,
      1
    );

    if (componentsPage > lastAvailablePage) {
      setComponentsPage(lastAvailablePage);
    }
  }, [availableComponentsResponse?.lastPage, componentsPage]);

  useEffect(() => {
    if (
      !headerActionsTargetId ||
      showHeader ||
      typeof document === 'undefined'
    ) {
      setHeaderActionsTarget(null);
      return;
    }

    setHeaderActionsTarget(document.getElementById(headerActionsTargetId));
  }, [headerActionsTargetId, showHeader]);

  const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
    setLayout((prevLayout) => {
      const hasRealChange =
        JSON.stringify(prevLayout) !== JSON.stringify(newLayout);
      if (hasRealChange) {
        setHasChanges(true);
        return newLayout;
      }
      return prevLayout;
    });
  }, []);

  const handleSaveLayout = useCallback(
    async (layoutToSave: LayoutItem[] = layout) => {
      const normalizedLayout = normalizeLayoutForSave(layoutToSave);
      const nextLayoutSignature = JSON.stringify(normalizedLayout);

      if (
        isSaving ||
        nextLayoutSignature === lastSavedLayoutSignatureRef.current
      ) {
        return;
      }

      setIsSaving(true);
      try {
        await request({
          url: `/dashboard-core/layout/${dashboardSlug}`,
          method: 'POST',
          data: { layout: normalizedLayout },
        });
        lastSavedLayoutSignatureRef.current = nextLayoutSignature;
        setHasChanges(
          getLayoutSignature(latestLayoutRef.current) !== nextLayoutSignature
        );
      } catch (error) {
        console.error('❌ Erro ao salvar layout:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [dashboardSlug, isSaving, layout, request]
  );

  useEffect(() => {
    if (!requestSaveSignal) {
      return;
    }

    if (lastHandledSaveSignalRef.current === requestSaveSignal) {
      return;
    }

    lastHandledSaveSignalRef.current = requestSaveSignal;

    if (!isSaving && hasChanges) {
      void handleSaveLayout();
    }
  }, [handleSaveLayout, hasChanges, isSaving, requestSaveSignal]);

  useEffect(() => {
    if (!hasChanges || isSaving) {
      return;
    }

    const nextLayoutSignature = getLayoutSignature(debouncedLayout);

    if (nextLayoutSignature === lastSavedLayoutSignatureRef.current) {
      return;
    }

    void handleSaveLayout(debouncedLayout);
  }, [debouncedLayout, handleSaveLayout, hasChanges, isSaving]);

  const handleAddWidget = async (slugs: string[]) => {
    if (!slugs.length) return;

    try {
      for (const slug of slugs) {
        await request({
          url: `/dashboard-core/widget/${dashboardSlug}`,
          method: 'POST',
          data: { componentSlug: slug },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      await Promise.all([refetchLayout(), refetchComponents()]);
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao adicionar widgets:', error);
    }
  };

  const handleRemoveWidget = async (widgetId: string) => {
    try {
      await request({
        url: `/dashboard-core/widget/${dashboardSlug}/${widgetId}`,
        method: 'DELETE',
      });
      await Promise.all([refetchLayout(), refetchComponents()]);
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao remover widget:', error);
    }
  };

  const handleCaptureWidgetPreview = async (
    widgetInstanceId: string,
    componentId: number
  ) => {
    if (!isDevelopment) {
      return;
    }

    try {
      const widgetElement = document.querySelector(
        `[data-widget-instance-id="${widgetInstanceId}"]`
      ) as HTMLElement | null;

      if (!widgetElement) {
        throw new Error('Widget element not found for screenshot');
      }

      const screenshot = await toBlob(widgetElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) =>
          !(
            node instanceof HTMLElement && node.dataset.widgetAction === 'true'
          ),
      });

      if (!screenshot) {
        throw new Error('Failed to generate screenshot blob');
      }

      const formData = new FormData();
      formData.append(
        'file',
        screenshot,
        `dashboard-widget-${componentId}-${Date.now()}.png`
      );

      await request({
        url: `/dashboard-component/${componentId}/preview`,
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await refetchComponents();
    } catch (error) {
      console.error('Erro ao capturar preview do widget:', error);
    }
  };

  const renderWidget = (widget: WidgetLayout) => {
    return (
      <WidgetRenderer
        widget={widget}
        onRemove={() => handleRemoveWidget(widget.i)}
        onCapture={
          isDevelopment
            ? () => handleCaptureWidgetPreview(widget.i, widget.component_id)
            : undefined
        }
      />
    );
  };

  if (isCheckingAccess || isLoadingLayout) {
    return (
      <>
        {showHeader ? (
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center justify-between gap-2 px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">{t('dashboard')}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{t('overview')}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          </header>
        ) : null}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (!dashboardAccess?.hasAccess) {
    return (
      <>
        {showHeader ? (
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center justify-between gap-2 px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">{t('dashboard')}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{t('accessDenied')}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          </header>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 pt-0">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{t('accessDenied')}</h2>
            <p className="text-muted-foreground mt-2">
              {t('noAccessToDashboard')}
            </p>
          </div>
        </div>
      </>
    );
  }

  const dashboardName = dashboardAccess?.dashboard?.name || dashboardSlug;
  const autosaveStatusLabel = isSaving
    ? 'Salvando layout...'
    : isAutosavePending
      ? 'Salvando automaticamente...'
      : null;

  const dashboardActions = (
    <>
      {autosaveStatusLabel ? (
        <div className="text-muted-foreground bg-muted inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs">
          <IconLoader2 className="size-3.5 animate-spin" />
          <span>{autosaveStatusLabel}</span>
        </div>
      ) : null}
      {hasChanges ? (
        <Button
          size="sm"
          variant="default"
          className="gap-1 px-2 sm:gap-2 sm:px-3"
          onClick={() => void handleSaveLayout()}
          disabled={isSaving}
          aria-label={isSaving ? t('saving') : t('saveLayout')}
        >
          {isSaving ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconDeviceFloppy className="size-4" />
          )}
          <span className="hidden sm:inline">
            {isSaving ? t('saving') : t('saveLayout')}
          </span>
        </Button>
      ) : null}
      <AddWidgetSelectorDialog
        availableComponents={availableComponents}
        totalItems={totalAvailableComponents}
        currentPage={availableComponentsResponse?.page ?? componentsPage}
        pageSize={availableComponentsResponse?.pageSize ?? componentsPageSize}
        isLoading={isLoadingComponents}
        searchQuery={componentsSearchQuery}
        onSearchQueryChange={(value) => {
          setComponentsSearchQuery(value);
          setComponentsPage(1);
        }}
        moduleFilter={componentsModuleFilter}
        modules={availableComponentModules}
        onModuleFilterChange={(value) => {
          setComponentsModuleFilter(value);
          setComponentsPage(1);
        }}
        onPageChange={setComponentsPage}
        onPageSizeChange={(nextPageSize) => {
          setComponentsPageSize(nextPageSize);
          setComponentsPage(1);
        }}
        onAdd={handleAddWidget}
        openSignal={openWidgetPickerSignal}
        onOpenSignalHandled={onOpenWidgetPickerHandled}
      />
    </>
  );

  const hasExternalActionTarget =
    !externalHeaderActions && !showHeader && Boolean(headerActionsTarget);

  return (
    <>
      {showHeader ? (
        <header className="flex min-h-16 shrink-0 items-center gap-2 py-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:h-16 sm:py-0">
          <div className="flex w-full flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb className="min-w-0">
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">{t('dashboard')}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate">
                      {dashboardName}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              {dashboardActions}
            </div>
          </div>
        </header>
      ) : !externalHeaderActions && !hasExternalActionTarget ? (
        <div className="flex w-full items-center justify-end gap-2 px-4 pt-2">
          {dashboardActions}
        </div>
      ) : null}
      {hasExternalActionTarget && headerActionsTarget
        ? createPortal(dashboardActions, headerActionsTarget)
        : null}
      {externalHeaderActions ? (
        <AddWidgetSelectorDialog
          availableComponents={availableComponents}
          totalItems={totalAvailableComponents}
          currentPage={availableComponentsResponse?.page ?? componentsPage}
          pageSize={availableComponentsResponse?.pageSize ?? componentsPageSize}
          isLoading={isLoadingComponents}
          searchQuery={componentsSearchQuery}
          onSearchQueryChange={(value) => {
            setComponentsSearchQuery(value);
            setComponentsPage(1);
          }}
          moduleFilter={componentsModuleFilter}
          modules={availableComponentModules}
          onModuleFilterChange={(value) => {
            setComponentsModuleFilter(value);
            setComponentsPage(1);
          }}
          onPageChange={setComponentsPage}
          onPageSizeChange={(nextPageSize) => {
            setComponentsPageSize(nextPageSize);
            setComponentsPage(1);
          }}
          onAdd={handleAddWidget}
          hideTrigger
          openSignal={openWidgetPickerSignal}
          onOpenSignalHandled={onOpenWidgetPickerHandled}
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-4 overflow-auto pt-0">
        {widgets.length > 0 ? (
          <div className="min-h-105 sm:min-h-130 lg:min-h-150">
            <DraggableGrid
              className="dashboard-grid"
              layout={layout}
              onLayoutChange={handleLayoutChange}
              cols={12}
              rowHeight={80}
              compactType={null}
              preventCollision
              isDraggable={!isMobile}
              isResizable={!isMobile}
              resizeHandles={['se']}
            >
              {widgets.map((widget) => (
                <div key={widget.i}>{renderWidget(widget)}</div>
              ))}
            </DraggableGrid>
          </div>
        ) : (
          <div className="flex min-h-100 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <h3 className="text-lg font-semibold">{t('noWidgetAdded')}</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('startAddingWidgets')}
            </p>
            <div className="mt-4">
              <AddWidgetSelectorDialog
                availableComponents={availableComponents}
                totalItems={totalAvailableComponents}
                currentPage={
                  availableComponentsResponse?.page ?? componentsPage
                }
                pageSize={
                  availableComponentsResponse?.pageSize ?? componentsPageSize
                }
                isLoading={isLoadingComponents}
                searchQuery={componentsSearchQuery}
                onSearchQueryChange={(value) => {
                  setComponentsSearchQuery(value);
                  setComponentsPage(1);
                }}
                moduleFilter={componentsModuleFilter}
                modules={availableComponentModules}
                onModuleFilterChange={(value) => {
                  setComponentsModuleFilter(value);
                  setComponentsPage(1);
                }}
                onPageChange={setComponentsPage}
                onPageSizeChange={(nextPageSize) => {
                  setComponentsPageSize(nextPageSize);
                  setComponentsPage(1);
                }}
                onAdd={handleAddWidget}
                buttonVariant="default"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
