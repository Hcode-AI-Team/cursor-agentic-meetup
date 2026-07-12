'use client';

import { Page, PageHeader } from '@/components/entity-list';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import useEmblaCarousel from 'embla-carousel-react';
import * as LucideIcons from 'lucide-react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Save,
  Share2,
  Trash2,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useEffect,
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
} from 'react';
import { toast } from 'sonner';
import { DashboardContent } from './[slug]/dashboard-content';

type DashboardTab = {
  id: number;
  slug: string;
  name?: string;
  icon?: string | null;
  is_home?: boolean;
  dashboard_locale?: Array<{
    name?: string | null;
  }>;
};

type SharedUser = {
  id: number;
  name: string;
  email: string | null;
  isCurrentUser?: boolean;
  isHome?: boolean;
  hasRequiredRoles?: boolean;
  accessStatus?: 'allowed' | 'missing-roles';
};

type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  lastPage: number;
  prev: number | null;
  next: number | null;
};

type DashboardTemplate = {
  id: number;
  slug: string;
  name: string;
  icon?: string | null;
  itemCount: number;
};

const getDashboardName = (dashboard: DashboardTab) =>
  dashboard.name || dashboard.dashboard_locale?.[0]?.name || dashboard.slug;

const reorderDashboards = (
  currentDashboards: DashboardTab[],
  sourceIndex: number,
  targetIndex: number
) => {
  const nextDashboards = [...currentDashboards];
  const [movedDashboard] = nextDashboards.splice(sourceIndex, 1);

  if (!movedDashboard) {
    return currentDashboards;
  }

  nextDashboards.splice(targetIndex, 0, movedDashboard);
  return nextDashboards;
};

const EMPTY_SHAREABLE_USERS_PAGE: PaginatedResponse<SharedUser> = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 10,
  lastPage: 1,
  prev: null,
  next: null,
};

const DASHBOARD_ICON_OPTIONS = [
  'layout-dashboard',
  'bar-chart-3',
  'bar-chart-4',
  'chart-column',
  'chart-line',
  'chart-no-axes-combined',
  'pie-chart',
  'trending-up',
  'trending-down',
  'briefcase',
  'building-2',
  'folder-kanban',
  'graduation-cap',
  'book-open',
  'landmark',
  'wallet',
  'badge-dollar-sign',
  'circle-dollar-sign',
  'banknote',
  'hand-coins',
  'credit-card',
  'receipt',
  'shopping-cart',
  'package',
  'store',
  'users',
  'user-round',
  'contact-round',
  'message-square',
  'mail',
  'file-text',
  'file-code-2',
  'circle-help',
  'tags',
  'hash',
  'ticket',
  'shield',
  'settings-2',
  'database',
  'activity',
  'calendar',
  'calendar-days',
  'clock-3',
  'timer',
  'hourglass',
  'globe',
  'target',
  'wrench',
  'home',
  'house',
  'map-pinned',
  'navigation',
  'compass',
  'zap',
  'flame',
  'star',
  'heart',
  'thumbs-up',
  'rocket',
  'sparkles',
  'bell',
  'megaphone',
  'search',
  'filter',
  'list',
  'layout-list',
  'layout-grid',
  'kanban',
  'sliders-horizontal',
  'cpu',
  'monitor',
  'smartphone',
  'tablet',
  'wifi',
  'cloud',
  'cloud-sun',
  'sun',
  'moon',
  'palette',
  'brush-cleaning',
  'camera',
  'image',
  'video',
  'music',
  'headphones',
  'mic',
  'phone',
  'send',
  'inbox',
  'archive',
  'clipboard-list',
  'check-circle-2',
  'x-circle',
  'alert-triangle',
  'info',
  'notebook-text',
] as const;

const normalizeLucideIconName = (value: string) =>
  value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .replace(/(\d)([a-zA-Z])/g, '$1-$2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase())
    .join('-');

const getLucideComponentName = (value: string) =>
  normalizeLucideIconName(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const isLucideIconComponent = (candidate: unknown): candidate is LucideIcon =>
  candidate !== null &&
  candidate !== undefined &&
  (typeof candidate === 'function' || typeof candidate === 'object');

const resolveDashboardIcon = (iconName?: string | null): LucideIcon => {
  const componentName = iconName ? getLucideComponentName(iconName) : '';
  const candidate = componentName
    ? LucideIcons[componentName as keyof typeof LucideIcons]
    : undefined;

  return isLucideIconComponent(candidate)
    ? (candidate as LucideIcon)
    : LayoutDashboard;
};

const isValidLucideIconName = (iconName: string) => {
  const componentName = getLucideComponentName(iconName);
  const candidate = componentName
    ? LucideIcons[componentName as keyof typeof LucideIcons]
    : undefined;

  return isLucideIconComponent(candidate);
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data
  ) {
    const message = error.response.data.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const EMPTY_DASHBOARDS: DashboardTab[] = [];

export function DashboardHomeTabs() {
  const t = useTranslations('core.DashboardHomeTabs');
  const tDashboardPage = useTranslations('core.DashboardPage');
  const { request, currentLocaleCode } = useApp();
  const [activeSlug, setActiveSlug] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardIcon, setNewDashboardIcon] = useState('layout-dashboard');
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState('');
  const [shareSearch, setShareSearch] = useState('');
  const [sharePage, setSharePage] = useState(1);
  const [selectedShareUsers, setSelectedShareUsers] = useState<SharedUser[]>(
    []
  );
  const [renamingSlug, setRenamingSlug] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSharingUsers, setIsSharingUsers] = useState(false);
  const [revokingUserId, setRevokingUserId] = useState<number | null>(null);
  const [isSettingHome, setIsSettingHome] = useState(false);
  const [openAddWidgetSignal, setOpenAddWidgetSignal] = useState(0);
  const [iconOpen, setIconOpen] = useState(false);
  const [iconDashboard, setIconDashboard] = useState<DashboardTab | null>(null);
  const [iconValue, setIconValue] = useState('layout-dashboard');
  const [isSavingIcon, setIsSavingIcon] = useState(false);
  const [requestSaveLayoutSignal, setRequestSaveLayoutSignal] = useState(0);
  const [runtimeHeaderState, setRuntimeHeaderState] = useState({
    hasChanges: false,
    isSaving: false,
    isAutosavePending: false,
  });

  const [tabsEmblaRef, tabsEmblaApi] = useEmblaCarousel({
    dragFree: true,
    containScroll: 'keepSnaps',
    align: 'start',
  });
  const [canScrollPrevTabs, setCanScrollPrevTabs] = useState(false);
  const [canScrollNextTabs, setCanScrollNextTabs] = useState(false);
  const [orderedDashboards, setOrderedDashboards] = useState<DashboardTab[]>(
    []
  );
  const [draggingDashboardSlug, setDraggingDashboardSlug] = useState<
    string | null
  >(null);
  const [isReordering, setIsReordering] = useState(false);

  const debouncedShareSearch = useDebounce(shareSearch, 300);

  const {
    data: dashboards = EMPTY_DASHBOARDS,
    isLoading,
    refetch: refetchDashboards,
  } = useQuery<DashboardTab[]>({
    queryKey: ['dashboard-home-tabs', currentLocaleCode],
    queryFn: async () => {
      const response = await request<DashboardTab[]>({
        url: '/dashboard-core/user-dashboards',
        method: 'GET',
      });

      return response.data ?? [];
    },
  });

  const { data: dashboardTemplates = [], isLoading: isLoadingTemplates } =
    useQuery<DashboardTemplate[]>({
      queryKey: ['dashboard-templates', currentLocaleCode, createOpen],
      queryFn: async () => {
        const response = await request<DashboardTemplate[]>({
          url: '/dashboard-core/templates',
          method: 'GET',
        });

        return response.data ?? [];
      },
      enabled: createOpen,
    });

  const activeDashboard = useMemo(
    () =>
      orderedDashboards.find((dashboard) => dashboard.slug === activeSlug) ??
      null,
    [activeSlug, orderedDashboards]
  );

  const selectedTemplate = useMemo(
    () =>
      dashboardTemplates.find(
        (template) => template.slug === selectedTemplateSlug
      ) ?? null,
    [dashboardTemplates, selectedTemplateSlug]
  );

  const selectedShareUserIds = useMemo(
    () => selectedShareUsers.map((user) => user.id),
    [selectedShareUsers]
  );

  const selectedUsersWithoutRequiredRoles = useMemo(
    () => selectedShareUsers.filter((user) => user.hasRequiredRoles === false),
    [selectedShareUsers]
  );

  useEffect(() => {
    setOrderedDashboards(dashboards);
  }, [dashboards]);

  useEffect(() => {
    if (orderedDashboards.length === 0) {
      setActiveSlug('');
      return;
    }

    const hasActiveDashboard = orderedDashboards.some(
      (dashboard) => dashboard.slug === activeSlug
    );

    if (!activeSlug || !hasActiveDashboard) {
      const nextDashboard =
        orderedDashboards.find((dashboard) => dashboard.is_home) ??
        orderedDashboards[0];

      if (nextDashboard) {
        setActiveSlug(nextDashboard.slug);
      }
    }
  }, [activeSlug, orderedDashboards]);

  useEffect(() => {
    if (!tabsEmblaApi) return;

    const updateScrollButtons = () => {
      setCanScrollPrevTabs(tabsEmblaApi.canScrollPrev());
      setCanScrollNextTabs(tabsEmblaApi.canScrollNext());
    };

    updateScrollButtons();
    tabsEmblaApi.on('scroll', updateScrollButtons);
    tabsEmblaApi.on('reInit', updateScrollButtons);

    return () => {
      tabsEmblaApi.off('scroll', updateScrollButtons);
      tabsEmblaApi.off('reInit', updateScrollButtons);
    };
  }, [tabsEmblaApi]);

  const {
    data: sharedUsers = [],
    isLoading: isLoadingShares,
    refetch: refetchShares,
  } = useQuery<SharedUser[]>({
    queryKey: ['dashboard-shares', activeSlug, shareOpen],
    queryFn: async () => {
      if (!activeSlug) {
        return [];
      }

      const response = await request<SharedUser[]>({
        url: `/dashboard-core/dashboard/${activeSlug}/shares`,
        method: 'GET',
      });

      return response.data ?? [];
    },
    enabled: shareOpen && Boolean(activeSlug),
  });

  const {
    data: shareableUsersPage = EMPTY_SHAREABLE_USERS_PAGE,
    isLoading: isLoadingShareableUsers,
    refetch: refetchShareableUsers,
  } = useQuery<PaginatedResponse<SharedUser>>({
    queryKey: [
      'dashboard-shareable-users',
      activeSlug,
      debouncedShareSearch,
      sharePage,
      shareOpen,
    ],
    queryFn: async () => {
      if (!activeSlug) {
        return EMPTY_SHAREABLE_USERS_PAGE;
      }

      const params = new URLSearchParams();
      params.set('page', String(sharePage));
      params.set('pageSize', '10');

      if (debouncedShareSearch.trim()) {
        params.set('search', debouncedShareSearch.trim());
      }

      const response = await request<
        PaginatedResponse<SharedUser> | SharedUser[]
      >({
        url: `/dashboard-core/shareable-users/${activeSlug}?${params.toString()}`,
        method: 'GET',
      });

      const payload = response.data;

      if (Array.isArray(payload)) {
        return {
          ...EMPTY_SHAREABLE_USERS_PAGE,
          data: payload,
          total: payload.length,
        };
      }

      return payload ?? EMPTY_SHAREABLE_USERS_PAGE;
    },
    enabled: shareOpen && Boolean(activeSlug),
    placeholderData: (previous) => previous ?? EMPTY_SHAREABLE_USERS_PAGE,
  });

  const shareableUsers = shareableUsersPage.data ?? [];

  const handleTabDragStart = (
    event: ReactDragEvent<HTMLElement>,
    dashboardSlug: string
  ) => {
    setDraggingDashboardSlug(dashboardSlug);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dashboardSlug);
  };

  const handleTabDragOver = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleTabDrop = async (
    event: ReactDragEvent<HTMLElement>,
    targetDashboardSlug: string
  ) => {
    event.preventDefault();

    const sourceDashboardSlug =
      draggingDashboardSlug || event.dataTransfer.getData('text/plain');

    if (!sourceDashboardSlug || sourceDashboardSlug === targetDashboardSlug) {
      setDraggingDashboardSlug(null);
      return;
    }

    const sourceIndex = orderedDashboards.findIndex(
      (dashboard) => dashboard.slug === sourceDashboardSlug
    );
    const targetIndex = orderedDashboards.findIndex(
      (dashboard) => dashboard.slug === targetDashboardSlug
    );

    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggingDashboardSlug(null);
      return;
    }

    const previousDashboards = orderedDashboards;
    const nextDashboards = reorderDashboards(
      orderedDashboards,
      sourceIndex,
      targetIndex
    );

    setOrderedDashboards(nextDashboards);

    try {
      setIsReordering(true);
      await request({
        url: '/dashboard-core/dashboard/order',
        method: 'PATCH',
        data: {
          slugs: nextDashboards.map((dashboard) => dashboard.slug),
        },
      });
      await refetchDashboards();
    } catch (error) {
      setOrderedDashboards(previousDashboards);
      toast.error(
        getErrorMessage(error, 'Unable to save dashboard tab order.')
      );
    } finally {
      setIsReordering(false);
      setDraggingDashboardSlug(null);
    }
  };

  const handleTabDragEnd = () => {
    setDraggingDashboardSlug(null);
  };

  const handleSelectTemplate = (template: DashboardTemplate | null) => {
    setSelectedTemplateSlug(template?.slug ?? '');
    setNewDashboardName(template?.name ?? '');
    setNewDashboardIcon(template?.icon ?? 'layout-dashboard');
  };

  const handleCreateDashboard = async () => {
    const trimmedName = newDashboardName.trim();
    const normalizedIcon = newDashboardIcon.trim()
      ? normalizeLucideIconName(newDashboardIcon)
      : 'layout-dashboard';

    if (!trimmedName) {
      toast.error(t('enterDashboardName'));
      return;
    }

    if (normalizedIcon && !isValidLucideIconName(normalizedIcon)) {
      toast.error(t('enterValidLucideIcon'));
      return;
    }

    try {
      setIsCreating(true);

      const response = await request<DashboardTab>({
        url: '/dashboard-core/dashboard',
        method: 'POST',
        data: {
          name: trimmedName,
          icon: normalizedIcon,
          ...(selectedTemplateSlug
            ? { templateSlug: selectedTemplateSlug }
            : {}),
        },
      });

      await refetchDashboards();
      setActiveSlug(response.data?.slug ?? activeSlug);
      setNewDashboardName('');
      setNewDashboardIcon('layout-dashboard');
      setSelectedTemplateSlug('');
      setCreateOpen(false);
      toast.success(t('dashboardCreated'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('createDashboardError')));
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetHomeDashboard = async (dashboard = activeDashboard) => {
    if (!dashboard || dashboard.is_home) {
      return;
    }

    cancelRenameDashboard();

    try {
      setIsSettingHome(true);
      await request({
        url: `/dashboard-core/dashboard/${dashboard.slug}/home`,
        method: 'POST',
      });
      await refetchDashboards();
      toast.success(t('setAsHomeSuccess'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('updateHomeError')));
    } finally {
      setIsSettingHome(false);
    }
  };

  const startRenameDashboard = (dashboard: DashboardTab) => {
    setActiveSlug(dashboard.slug);
    setRenamingSlug(dashboard.slug);
    setRenameValue(getDashboardName(dashboard));
  };

  const cancelRenameDashboard = () => {
    setRenamingSlug(null);
    setRenameValue('');
  };

  const handleRenameDashboard = async (dashboard: DashboardTab) => {
    const trimmedName = renameValue.trim();

    if (!trimmedName) {
      toast.error(t('enterDashboardName'));
      return;
    }

    if (trimmedName === getDashboardName(dashboard)) {
      cancelRenameDashboard();
      return;
    }

    try {
      setIsRenaming(true);
      await request({
        url: `/dashboard-core/dashboard/${dashboard.slug}`,
        method: 'PATCH',
        data: { name: trimmedName },
      });
      await refetchDashboards();
      cancelRenameDashboard();
      toast.success(t('dashboardRenamed'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('renameDashboardError')));
    } finally {
      setIsRenaming(false);
    }
  };

  const openShareForDashboard = (dashboard: DashboardTab) => {
    cancelRenameDashboard();
    setActiveSlug(dashboard.slug);
    setShareSearch('');
    setSharePage(1);
    setSelectedShareUsers([]);
    setShareOpen(true);
  };

  const openDeleteForDashboard = (dashboard: DashboardTab) => {
    cancelRenameDashboard();
    setActiveSlug(dashboard.slug);
    setDeleteOpen(true);
  };

  const openAddWidgetsForDashboard = (dashboard: DashboardTab) => {
    cancelRenameDashboard();
    setActiveSlug(dashboard.slug);
    setOpenAddWidgetSignal((previous) => previous + 1);
  };

  const openIconForDashboard = (dashboard: DashboardTab) => {
    cancelRenameDashboard();
    setActiveSlug(dashboard.slug);
    setIconDashboard(dashboard);
    setIconValue(
      dashboard.icon
        ? normalizeLucideIconName(dashboard.icon)
        : 'layout-dashboard'
    );
    setIconOpen(true);
  };

  const handleSaveDashboardIcon = async () => {
    if (!iconDashboard) {
      return;
    }

    const trimmedValue = iconValue.trim();
    const normalizedIcon = trimmedValue
      ? normalizeLucideIconName(trimmedValue)
      : null;

    if (normalizedIcon && !isValidLucideIconName(normalizedIcon)) {
      toast.error(t('enterValidLucideIcon'));
      return;
    }

    try {
      setIsSavingIcon(true);
      await request({
        url: `/dashboard-core/dashboard/${iconDashboard.slug}`,
        method: 'PATCH',
        data: {
          icon: normalizedIcon,
        },
      });
      await refetchDashboards();
      setIconOpen(false);
      setIconDashboard(null);
      toast.success(t('dashboardIconUpdated'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('updateDashboardIconError')));
    } finally {
      setIsSavingIcon(false);
    }
  };

  const handleRemoveDashboard = async () => {
    if (!activeDashboard) {
      return;
    }

    try {
      setIsDeleting(true);
      await request({
        url: `/dashboard-core/dashboard/${activeDashboard.slug}`,
        method: 'DELETE',
      });
      await refetchDashboards();
      setDeleteOpen(false);
      toast.success(t('tabRemoved'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('removeTabError')));
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleShareUserSelection = (user: SharedUser) => {
    setSelectedShareUsers((current) => {
      const alreadySelected = current.some((item) => item.id === user.id);

      if (alreadySelected) {
        return current.filter((item) => item.id !== user.id);
      }

      return [...current, user];
    });
  };

  const removeSelectedShareUser = (userId: number) => {
    setSelectedShareUsers((current) =>
      current.filter((user) => user.id !== userId)
    );
  };

  const handleShareSelectedUsers = async () => {
    if (!activeDashboard || selectedShareUserIds.length === 0) {
      return;
    }

    const selectionCount = selectedShareUserIds.length;

    try {
      setIsSharingUsers(true);
      await request({
        url: `/dashboard-core/dashboard/${activeDashboard.slug}/share`,
        method: 'POST',
        data: {
          userIds: selectedShareUserIds,
        },
      });
      await Promise.all([refetchShares(), refetchShareableUsers()]);
      setSelectedShareUsers([]);
      setShareSearch('');
      setSharePage(1);
      toast.success(t('dashboardSharedSelected', { count: selectionCount }));
    } catch (error) {
      toast.error(getErrorMessage(error, t('shareDashboardError')));
    } finally {
      setIsSharingUsers(false);
    }
  };

  const handleRevokeShare = async (userId: number) => {
    if (!activeDashboard) {
      return;
    }

    try {
      setRevokingUserId(userId);
      await request({
        url: `/dashboard-core/dashboard/${activeDashboard.slug}/share/${userId}`,
        method: 'DELETE',
      });
      await Promise.all([refetchShares(), refetchShareableUsers()]);
      toast.success(t('shareRemoved'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('revokeShareError')));
    } finally {
      setRevokingUserId(null);
    }
  };

  const isBusy =
    isCreating ||
    isDeleting ||
    isRenaming ||
    isSettingHome ||
    isSavingIcon ||
    isSharingUsers ||
    isReordering ||
    revokingUserId !== null;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: t('pageTitle'), href: '/core/dashboard' },
          ...(activeDashboard
            ? [{ label: getDashboardName(activeDashboard) }]
            : [{ label: t('home') }]),
        ]}
        title={t('pageTitle')}
        description={t('pageDescription')}
        actions={[
          {
            label: t('share'),
            onClick: () =>
              activeDashboard && openShareForDashboard(activeDashboard),
            icon: <Share2 className="size-4" />,
            variant: 'outline',
            size: 'sm',
            disabled: !activeDashboard || isBusy,
          },
          {
            label: t('addWidgets'),
            onClick: () =>
              activeDashboard && openAddWidgetsForDashboard(activeDashboard),
            icon: <Plus className="size-4" />,
            variant: 'outline',
            size: 'sm',
            disabled: !activeDashboard || isBusy,
          },
          {
            label: runtimeHeaderState.isSaving
              ? tDashboardPage('saving')
              : tDashboardPage('saveLayout'),
            onClick: () =>
              setRequestSaveLayoutSignal((previous) => previous + 1),
            icon: runtimeHeaderState.isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            ),
            size: 'sm',
            disabled:
              !activeDashboard ||
              isBusy ||
              runtimeHeaderState.isSaving ||
              !runtimeHeaderState.hasChanges,
          },
          {
            label: t('newDashboard'),
            onClick: () => setCreateOpen(true),
            icon: <Plus className="size-4" />,
            size: 'sm',
            disabled: isBusy,
          },
        ]}
      />

      {isLoading ? (
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      ) : dashboards.length > 0 ? (
        <div className="overflow-hidden">
          <Tabs
            value={activeSlug}
            onValueChange={setActiveSlug}
            className="gap-0"
          >
            <div className="bg-muted dark:bg-muted/40 relative">
              {canScrollPrevTabs && (
                <button
                  type="button"
                  onClick={() => tabsEmblaApi?.scrollPrev()}
                  aria-label="Scroll tabs left"
                  className="md:hidden absolute left-0 top-0 bottom-0 z-10 flex items-center px-1.5 bg-linear-to-r from-muted dark:from-muted/40 to-transparent"
                >
                  <ChevronLeft className="size-4 text-muted-foreground" />
                </button>
              )}
              <div ref={tabsEmblaRef} className="overflow-hidden">
                <TabsList className="dashboard-tabs-list h-auto min-h-0 items-end gap-0 rounded-none bg-transparent p-0 pt-1 pl-1 flex w-max">
                  {orderedDashboards.map((dashboard) => {
                    const isRenamingCurrentTab =
                      renamingSlug === dashboard.slug;
                    const isActiveTab = activeSlug === dashboard.slug;
                    const DashboardTabIcon = resolveDashboardIcon(
                      dashboard.icon
                    );

                    const tabContent = (
                      <>
                        <DashboardTabIcon
                          className={cn('size-4 transition-colors')}
                        />
                        {isRenamingCurrentTab ? (
                          <Input
                            value={renameValue}
                            onChange={(event) =>
                              setRenameValue(event.target.value)
                            }
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                            onFocus={(event) => event.currentTarget.select()}
                            onBlur={() => void handleRenameDashboard(dashboard)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void handleRenameDashboard(dashboard);
                              }

                              if (event.key === 'Escape') {
                                event.preventDefault();
                                cancelRenameDashboard();
                              }
                            }}
                            autoFocus
                            disabled={isRenaming}
                            className="h-7 w-40"
                          />
                        ) : (
                          <span className="block min-w-0 max-w-45 truncate">
                            {getDashboardName(dashboard)}
                          </span>
                        )}
                      </>
                    );

                    return (
                      <ContextMenu key={dashboard.slug}>
                        <ContextMenuTrigger asChild>
                          {isRenamingCurrentTab ? (
                            <div
                              onDragOver={handleTabDragOver}
                              onDrop={(event) =>
                                void handleTabDrop(event, dashboard.slug)
                              }
                              className="-mb-px flex min-h-9 shrink-0 items-center gap-2 rounded-b-none rounded-t-lg border border-b-0 border-border bg-background px-3 py-2 text-foreground shadow-none"
                            >
                              {tabContent}
                            </div>
                          ) : (
                            <TabsTrigger
                              value={dashboard.slug}
                              draggable={!isBusy}
                              onDragStart={(event) =>
                                handleTabDragStart(event, dashboard.slug)
                              }
                              onDragOver={handleTabDragOver}
                              onDrop={(event) =>
                                void handleTabDrop(event, dashboard.slug)
                              }
                              onDragEnd={handleTabDragEnd}
                              className={cn(
                                'dashboard-tab-trigger -mb-px mt-1 inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-b-none rounded-t-lg border-none px-3 py-2 shadow-none data-[state=active]:shadow-none',
                                draggingDashboardSlug === dashboard.slug &&
                                  'opacity-70'
                              )}
                              style={
                                isActiveTab
                                  ? {
                                      backgroundColor: 'var(--background)',
                                      color: 'var(--primary)',
                                    }
                                  : {
                                      backgroundColor: 'transparent',
                                      color: 'var(--muted-foreground)',
                                    }
                              }
                              onDoubleClick={() =>
                                startRenameDashboard(dashboard)
                              }
                              onContextMenu={() =>
                                setActiveSlug(dashboard.slug)
                              }
                            >
                              {tabContent}
                            </TabsTrigger>
                          )}
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                          <ContextMenuItem
                            onSelect={() =>
                              openAddWidgetsForDashboard(dashboard)
                            }
                          >
                            <Plus className="size-4" />
                            {t('addWidgets')}
                          </ContextMenuItem>
                          {!dashboard.is_home ? (
                            <ContextMenuItem
                              onSelect={() =>
                                void handleSetHomeDashboard(dashboard)
                              }
                            >
                              <Home className="size-4" />
                              {t('setAsHome')}
                            </ContextMenuItem>
                          ) : null}
                          <ContextMenuItem
                            onSelect={() => startRenameDashboard(dashboard)}
                          >
                            <Pencil className="size-4" />
                            {t('rename')}
                          </ContextMenuItem>
                          <ContextMenuItem
                            onSelect={() => openIconForDashboard(dashboard)}
                          >
                            <Palette className="size-4" />
                            {t('changeIcon')}
                          </ContextMenuItem>
                          <ContextMenuItem
                            onSelect={() => openShareForDashboard(dashboard)}
                          >
                            <Share2 className="size-4" />
                            {t('share')}
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            variant="destructive"
                            onSelect={() => openDeleteForDashboard(dashboard)}
                          >
                            <Trash2 className="size-4" />
                            {t('delete')}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    disabled={isBusy}
                    className="my-auto ml-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    title={t('newDashboard')}
                  >
                    <Plus className="size-4" />
                  </button>
                </TabsList>
              </div>
              {canScrollNextTabs && (
                <button
                  type="button"
                  onClick={() => tabsEmblaApi?.scrollNext()}
                  aria-label="Scroll tabs right"
                  className="md:hidden absolute right-0 top-0 bottom-0 z-10 flex items-center px-1.5 bg-linear-to-l from-muted dark:from-muted/40 to-transparent"
                >
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </Tabs>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm font-medium">{t('emptyTitle')}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('emptyDescription')}
          </p>
        </div>
      )}

      {activeDashboard ? (
        <DashboardContent
          key={activeDashboard.slug}
          dashboardSlug={activeDashboard.slug}
          showHeader={false}
          externalHeaderActions
          requestSaveSignal={requestSaveLayoutSignal}
          onRuntimeActionsStateChange={setRuntimeHeaderState}
          openWidgetPickerSignal={openAddWidgetSignal}
          onOpenWidgetPickerHandled={() => setOpenAddWidgetSignal(0)}
        />
      ) : !isLoading ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('createToStart')}
        </div>
      ) : null}

      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setNewDashboardName('');
            setNewDashboardIcon('layout-dashboard');
            setSelectedTemplateSlug('');
          }
        }}
      >
        <ResizableSheetContent
          sheetId="core-dashboard-home-create-sheet"
          defaultWidth={640}
          minWidth={460}
          maxWidth={980}
          side="right"
          className="w-full sm:max-w-xl"
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="px-6 py-5 text-left">
              <SheetTitle>{t('newDashboardTitle')}</SheetTitle>
              <SheetDescription>
                {t('newDashboardDescription')}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">
                    {t('dashboardTemplateLabel')}
                  </label>
                  <Badge variant={selectedTemplate ? 'secondary' : 'outline'}>
                    {selectedTemplate
                      ? t('templateSelectedBadge')
                      : t('blankDashboardBadge')}
                  </Badge>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/30',
                      !selectedTemplateSlug &&
                        'border-primary bg-primary/5 text-foreground'
                    )}
                    onClick={() => handleSelectTemplate(null)}
                  >
                    <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <LayoutDashboard className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {t('blankDashboardTitle')}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t('blankDashboardDescription')}
                      </p>
                    </div>
                  </button>

                  {isLoadingTemplates ? (
                    <div className="grid gap-2">
                      <Skeleton className="h-16 rounded-lg" />
                      <Skeleton className="h-16 rounded-lg" />
                    </div>
                  ) : dashboardTemplates.length > 0 ? (
                    dashboardTemplates.map((template) => {
                      const TemplateIcon = resolveDashboardIcon(template.icon);
                      const isSelected = template.slug === selectedTemplateSlug;

                      return (
                        <button
                          key={template.slug}
                          type="button"
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/30',
                            isSelected &&
                              'border-primary bg-primary/5 text-foreground'
                          )}
                          onClick={() => handleSelectTemplate(template)}
                        >
                          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                            <TemplateIcon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">
                                {template.name}
                              </p>
                              <Badge variant="outline">
                                {t('templateWidgetCount', {
                                  count: template.itemCount,
                                })}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {template.slug}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      {t('noTemplatesAvailable')}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="dashboard-name">
                  {t('dashboardNameLabel')}
                </label>
                <Input
                  id="dashboard-name"
                  value={newDashboardName}
                  onChange={(event) => setNewDashboardName(event.target.value)}
                  placeholder={t('dashboardNamePlaceholder')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleCreateDashboard();
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="new-dashboard-icon-name"
                >
                  {t('dashboardIconLabel')}
                </label>
                <Input
                  id="new-dashboard-icon-name"
                  value={newDashboardIcon}
                  onChange={(event) => setNewDashboardIcon(event.target.value)}
                  placeholder={t('dashboardIconPlaceholder')}
                />
                <p className="text-muted-foreground text-xs">
                  {newDashboardIcon.trim() &&
                  !isValidLucideIconName(newDashboardIcon)
                    ? t('invalidIconName')
                    : t('selectIconHint')}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    {(() => {
                      const SelectedIcon =
                        resolveDashboardIcon(newDashboardIcon);
                      return <SelectedIcon className="size-5" />;
                    })()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {newDashboardIcon.trim()
                        ? normalizeLucideIconName(newDashboardIcon)
                        : 'layout-dashboard'}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {newDashboardName.trim() || t('newDashboard')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t('iconSuggestions')}</p>
                <div className="grid grid-cols-6 gap-2 md:grid-cols-8 lg:grid-cols-12">
                  {DASHBOARD_ICON_OPTIONS.map((iconName) => {
                    const IconOption = resolveDashboardIcon(iconName);
                    const isSelected =
                      normalizeLucideIconName(newDashboardIcon) === iconName;

                    return (
                      <button
                        key={`create-${iconName}`}
                        type="button"
                        title={iconName}
                        aria-label={iconName}
                        className={cn(
                          'flex aspect-square cursor-pointer items-center justify-center rounded-lg border p-2 text-sm transition-colors hover:border-primary/40 hover:bg-accent/30',
                          isSelected &&
                            'border-primary bg-primary/10 text-primary'
                        )}
                        onClick={() => setNewDashboardIcon(iconName)}
                      >
                        <IconOption className="size-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-auto flex justify-end gap-2 border-t px-6 py-4">
              <Button
                className="w-full"
                onClick={handleCreateDashboard}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {t('createDashboard')}
              </Button>
            </div>
          </div>
        </ResizableSheetContent>
      </Sheet>

      <Sheet
        open={iconOpen}
        onOpenChange={(open) => {
          setIconOpen(open);
          if (!open) {
            setIconDashboard(null);
            setIconValue('layout-dashboard');
          }
        }}
      >
        <ResizableSheetContent
          sheetId="core-dashboard-home-icon-sheet"
          defaultWidth={640}
          minWidth={460}
          maxWidth={980}
          side="right"
          className="w-full sm:max-w-xl"
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="px-6 py-5 text-left">
              <SheetTitle>{t('changeDashboardIconTitle')}</SheetTitle>
              <SheetDescription>
                {t('changeDashboardIconDescription')}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="dashboard-icon-name"
                >
                  {t('iconNameLabel')}
                </label>
                <Input
                  id="dashboard-icon-name"
                  value={iconValue}
                  onChange={(event) => setIconValue(event.target.value)}
                  placeholder={t('iconNamePlaceholder')}
                />
                <p className="text-muted-foreground text-xs">
                  {iconValue.trim() && !isValidLucideIconName(iconValue)
                    ? t('invalidIconName')
                    : t('selectIconHint')}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    {(() => {
                      const SelectedIcon = resolveDashboardIcon(iconValue);
                      return <SelectedIcon className="size-5" />;
                    })()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {iconValue.trim()
                        ? normalizeLucideIconName(iconValue)
                        : t('noCustomIcon')}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {iconDashboard
                        ? getDashboardName(iconDashboard)
                        : t('dashboardLabel')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t('suggestions')}</p>
                <div className="grid grid-cols-6 gap-2 md:grid-cols-8 lg:grid-cols-12">
                  {DASHBOARD_ICON_OPTIONS.map((iconName) => {
                    const IconOption = resolveDashboardIcon(iconName);
                    const isSelected =
                      normalizeLucideIconName(iconValue) === iconName;

                    return (
                      <button
                        key={iconName}
                        type="button"
                        title={iconName}
                        aria-label={iconName}
                        className={cn(
                          'flex aspect-square cursor-pointer items-center justify-center rounded-lg border p-2 text-sm transition-colors hover:border-primary/40 hover:bg-accent/30',
                          isSelected &&
                            'border-primary bg-primary/10 text-primary'
                        )}
                        onClick={() => setIconValue(iconName)}
                      >
                        <IconOption className="size-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-auto flex justify-end gap-2 border-t px-6 py-4">
              <Button
                className="w-full"
                onClick={() => void handleSaveDashboardIcon()}
                disabled={isSavingIcon || Boolean(iconValue.trim()) === false}
              >
                {isSavingIcon ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Palette className="size-4" />
                )}
                {t('saveIcon')}
              </Button>
            </div>
          </div>
        </ResizableSheetContent>
      </Sheet>

      <Sheet
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) {
            setShareSearch('');
            setSharePage(1);
            setSelectedShareUsers([]);
          }
        }}
      >
        <ResizableSheetContent
          sheetId="core-dashboard-home-share-sheet"
          defaultWidth={960}
          minWidth={700}
          maxWidth={1400}
          className="w-full sm:max-w-4xl"
        >
          <SheetHeader>
            <SheetTitle>
              {t('shareDashboardTitle', {
                name: activeDashboard ? getDashboardName(activeDashboard) : '',
              })}
            </SheetTitle>
            <SheetDescription>
              {t('shareDashboardDescription')}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 pb-4">
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {t('shareRoleNotice')}
            </div>

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
              <div className="flex min-h-0 flex-col rounded-lg border">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {t('usersWithAccess')}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t('usersWithAccessDescription')}
                    </p>
                  </div>
                  <Badge variant="outline">{sharedUsers.length}</Badge>
                </div>

                <ScrollArea className="h-80">
                  <div className="space-y-2 p-3">
                    {isLoadingShares ? (
                      <>
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                      </>
                    ) : sharedUsers.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {t('noSharedUsers')}
                      </p>
                    ) : (
                      sharedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {user.name}
                              </p>
                              {user.isCurrentUser ? (
                                <Badge variant="secondary">{t('you')}</Badge>
                              ) : null}
                              {user.isHome ? (
                                <Badge variant="outline">{t('home')}</Badge>
                              ) : null}
                              {user.hasRequiredRoles === false ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/50 text-amber-700"
                                >
                                  {t('roleRequiredBadge')}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-muted-foreground truncate text-xs">
                              {user.email || t('noPublicEmail')}
                            </p>
                            {user.hasRequiredRoles === false ? (
                              <p className="text-xs text-amber-700">
                                {t('shareBlockedHint')}
                              </p>
                            ) : null}
                          </div>

                          {!user.isCurrentUser ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => void handleRevokeShare(user.id)}
                              disabled={revokingUserId === user.id}
                            >
                              {revokingUserId === user.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex min-h-0 flex-col rounded-lg border">
                <div className="border-b px-3 py-2">
                  <p className="text-sm font-semibold">{t('addPeople')}</p>
                  <p className="text-muted-foreground text-xs">
                    {t('addPeopleDescription')}
                  </p>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                  <div className="rounded-lg border">
                    <Command shouldFilter={false}>
                      <CommandInput
                        value={shareSearch}
                        onValueChange={(value) => {
                          setShareSearch(value);
                          setSharePage(1);
                        }}
                        placeholder={t('searchUserPlaceholder')}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {isLoadingShareableUsers
                            ? t('loadingUsers')
                            : t('noUsersToShare')}
                        </CommandEmpty>
                        <CommandGroup>
                          {shareableUsers.map((user) => {
                            const isSelected = selectedShareUserIds.includes(
                              user.id
                            );

                            return (
                              <CommandItem
                                key={user.id}
                                value={`${user.name}-${user.email ?? ''}-${user.id}`}
                                className="cursor-pointer items-start gap-3 px-3 py-3"
                                onSelect={() => toggleShareUserSelection(user)}
                              >
                                <div
                                  className={cn(
                                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border',
                                    isSelected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-muted-foreground/30'
                                  )}
                                >
                                  <Check
                                    className={cn(
                                      'size-3',
                                      isSelected ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-medium">
                                      {user.name}
                                    </p>
                                    {user.hasRequiredRoles === false ? (
                                      <Badge
                                        variant="outline"
                                        className="border-amber-500/50 text-amber-700"
                                      >
                                        {t('roleRequiredBadge')}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="text-muted-foreground truncate text-xs">
                                    {user.email || t('noPublicEmail')}
                                  </p>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>

                  {selectedShareUsers.length > 0 ? (
                    <div className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {t('selectedUsers')}
                        </p>
                        <Badge variant="outline">
                          {selectedShareUsers.length}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedShareUsers.map((user) => (
                          <button
                            key={`selected-${user.id}`}
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs"
                            onClick={() => removeSelectedShareUser(user.id)}
                          >
                            <span className="max-w-40 truncate">
                              {user.name}
                            </span>
                            <X className="size-3" />
                          </button>
                        ))}
                      </div>

                      {selectedUsersWithoutRequiredRoles.length > 0 ? (
                        <p className="text-xs text-amber-700">
                          {t('selectedUsersWarning', {
                            count: selectedUsersWithoutRequiredRoles.length,
                          })}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          {t('selectedUsersHint')}
                        </p>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-auto space-y-3 border-t pt-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {t('sharePageStatus', {
                          page: shareableUsersPage.page,
                          totalPages: shareableUsersPage.lastPage,
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() =>
                            setSharePage((current) => Math.max(current - 1, 1))
                          }
                          disabled={
                            isLoadingShareableUsers ||
                            shareableUsersPage.prev === null
                          }
                        >
                          {t('previousPage')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => setSharePage((current) => current + 1)}
                          disabled={
                            isLoadingShareableUsers ||
                            shareableUsersPage.next === null
                          }
                        >
                          {t('nextPage')}
                        </Button>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => void handleShareSelectedUsers()}
                      disabled={
                        isSharingUsers || selectedShareUserIds.length === 0
                      }
                    >
                      {isSharingUsers ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserPlus className="size-4" />
                      )}
                      {t('shareSelectedUsers', {
                        count: selectedShareUserIds.length,
                      })}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizableSheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeTabTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {activeDashboard
                ? t('removeTabDescription', {
                    name: getDashboardName(activeDashboard),
                  })
                : t('removeTabDescriptionFallback')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleRemoveDashboard();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t('removeTab')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
