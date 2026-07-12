'use client';

import { EmptyState } from '@/components/entity-list';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import * as TablerIcons from '@tabler/icons-react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Menu as MenuIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { JSX, useEffect, useMemo, useState, type ComponentType } from 'react';
import { toast } from 'sonner';

type Menu = {
  id: number;
  slug: string;
  url: string;
  icon?: string;
  menu_id?: number | null;
  menu_locale?: Array<{
    name: string;
  }>;
  role_menu?: Array<{
    menu_id: number;
    role_id: number;
  }>;
  children?: Menu[];
};

type RoleMenusSectionProps = {
  roleId: number;
  onMenuChange?: () => void;
};

const EMPTY_MENUS: Menu[] = [];

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export function RoleMenusSection({
  roleId,
  onMenuChange,
}: RoleMenusSectionProps) {
  const t = useTranslations('core.RolePage');
  const { request, currentLocaleCode } = useApp();
  const [togglingMenuId, setTogglingMenuId] = useState<number | null>(null);
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
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const {
    data: assignedMenusData,
    isLoading: isLoadingAssigned,
    refetch: refetchAssignedMenus,
  } = useQuery<{ data: Menu[] }>({
    queryKey: ['role-menus-assigned', roleId, currentLocaleCode],
    queryFn: async () => {
      const response = await request<{ data: Menu[] }>({
        url: `/role/${roleId}/menu?pageSize=10000`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!roleId,
  });

  const {
    data: menusData,
    isLoading: isLoadingMenus,
    refetch: refetchMenus,
  } = useQuery<{ data: Menu[]; total: number; lastPage: number }>({
    queryKey: [
      'role-menus-paginated',
      roleId,
      currentLocaleCode,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const response = await request<{
        data: Menu[];
        total: number;
        lastPage: number;
      }>({
        url: `/role/${roleId}/menu?page=${page}&pageSize=${pageSize}`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!roleId,
  });

  const menus = menusData?.data ?? EMPTY_MENUS;
  const totalPages = menusData?.lastPage || 1;
  const totalMenus = menusData?.total || 0;

  const handleToggleMenu = async (
    menuId: number,
    isAssigned: boolean,
    includeChildren: boolean = true
  ) => {
    setTogglingMenuId(menuId);
    try {
      const currentMenuIds =
        assignedMenusData?.data
          ?.filter((m: Menu) => m.role_menu && m.role_menu.length > 0)
          .map((m: Menu) => m.id) || [];

      const menuIdsToToggle = [menuId];
      const findMenuWithChildren = (
        menusList: Menu[],
        targetId: number
      ): Menu | undefined => {
        for (const menu of menusList) {
          if (menu.id === targetId) return menu;
          if (menu.children && menu.children.length > 0) {
            const found = findMenuWithChildren(menu.children, targetId);
            if (found) return found;
          }
        }
        return undefined;
      };

      const findParentMenu = (targetMenuId: number): Menu | undefined => {
        const menu = menus.find((m) => m.id === targetMenuId);
        if (menu?.menu_id) {
          return menus.find((m) => m.id === menu.menu_id);
        }
        return undefined;
      };

      if (includeChildren) {
        const menu = findMenuWithChildren(hierarchicalMenus, menuId);
        if (menu?.children && menu.children.length > 0) {
          const getAllChildrenIds = (children: Menu[]): number[] => {
            return children.flatMap((child) => [
              child.id,
              ...(child.children ? getAllChildrenIds(child.children) : []),
            ]);
          };
          menuIdsToToggle.push(...getAllChildrenIds(menu.children));
        }
      }

      let newMenuIds: number[];
      if (isAssigned) {
        newMenuIds = currentMenuIds.filter(
          (id: number) => !menuIdsToToggle.includes(id)
        );
      } else {
        newMenuIds = [...new Set([...currentMenuIds, ...menuIdsToToggle])];
        const getAllParentIds = (childMenuId: number): number[] => {
          const parentIds: number[] = [];
          const parent = findParentMenu(childMenuId);
          if (parent) {
            parentIds.push(parent.id);
            parentIds.push(...getAllParentIds(parent.id));
          }
          return parentIds;
        };

        const parentIds = getAllParentIds(menuId);
        if (parentIds.length > 0) {
          newMenuIds = [...new Set([...newMenuIds, ...parentIds])];
        }
      }

      await request({
        url: `/role/${roleId}/menu`,
        method: 'PATCH',
        data: { ids: newMenuIds },
      });

      toast.success(isAssigned ? t('menuRemoved') : t('menuAssigned'));
      await refetchAssignedMenus();
      await refetchMenus();
      onMenuChange?.();
    } catch {
      toast.error(
        isAssigned ? t('errorRemovingMenu') : t('errorAssigningMenu')
      );
    } finally {
      setTogglingMenuId(null);
    }
  };

  const isMenuAssigned = (menu: Menu) => {
    const assignedMenu = assignedMenusData?.data?.find(
      (m: Menu) => m.id === menu.id
    );
    return !!(assignedMenu?.role_menu && assignedMenu.role_menu.length > 0);
  };

  const getMenuName = (menu: Menu) => {
    return menu.menu_locale?.[0]?.name || menu.slug;
  };

  const renderIcon = (iconName?: string) => {
    if (!iconName) {
      return <MenuIcon className="h-5 w-5" />;
    }

    const toPascalCase = (str: string) =>
      str.replace(/(^\w|-\w)/g, (match) =>
        match.replace('-', '').toUpperCase()
      );

    const tablerIcons = TablerIcons as unknown as Record<
      string,
      ComponentType<{ className?: string }>
    >;
    const pascalName = toPascalCase(String(iconName));
    const iconCandidates = [
      `Icon${pascalName}`,
      `Icon${pascalName}Filled`,
      `Icon${pascalName}Circle`,
    ];
    const IconComponent = iconCandidates
      .map((candidate) => tablerIcons[candidate])
      .find(Boolean);

    return IconComponent ? (
      <IconComponent className="h-5 w-5" />
    ) : (
      <MenuIcon className="h-5 w-5" />
    );
  };

  const organizeMenuHierarchy = (menusList: Menu[]): Menu[] => {
    const menuMap = new Map<number, Menu>();
    const rootMenus: Menu[] = [];

    menusList.forEach((menu) => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    menuMap.forEach((menu) => {
      if (menu.menu_id && menuMap.has(menu.menu_id)) {
        const parent = menuMap.get(menu.menu_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(menu);
      } else {
        rootMenus.push(menu);
      }
    });

    return rootMenus;
  };

  const hierarchicalMenus = useMemo(
    () => organizeMenuHierarchy(menus),
    [menus]
  );
  const defaultExpandedMenus = useMemo(
    () =>
      hierarchicalMenus
        .filter((menu) => menu.children && menu.children.length > 0)
        .map((menu) => `menu-${menu.id}`),
    [hierarchicalMenus]
  );

  useEffect(() => {
    if (expandedMenus.length === 0 && defaultExpandedMenus.length > 0) {
      setExpandedMenus(defaultExpandedMenus);
    }
  }, [defaultExpandedMenus, expandedMenus.length]);

  const renderChildMenu = (menu: Menu): JSX.Element => {
    const isAssigned = isMenuAssigned(menu);
    const isToggling = togglingMenuId === menu.id;

    return (
      <div
        key={menu.id}
        className={`flex items-center justify-between p-3 rounded-md border transition-all ${
          isAssigned
            ? 'border-primary/50 bg-primary/5'
            : 'border-border hover:border-primary/30'
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`rounded-md p-2 ${
              isAssigned ? 'bg-primary/10' : 'bg-muted'
            }`}
          >
            <div
              className={`${
                isAssigned ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {renderIcon(menu.icon)}
            </div>
          </div>
          <div className="flex-1">
            <Label
              htmlFor={`menu-${menu.id}`}
              className="text-sm font-medium cursor-pointer"
            >
              {getMenuName(menu)}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">{menu.url}</p>
          </div>
        </div>
        <Switch
          id={`menu-${menu.id}`}
          checked={isAssigned}
          disabled={isToggling}
          onCheckedChange={() => handleToggleMenu(menu.id, isAssigned, false)}
          className="ml-4"
        />
      </div>
    );
  };

  if (isLoadingMenus || isLoadingAssigned) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          {t('loadingMenus')}
        </span>
      </div>
    );
  }

  if (!menus || menus.length === 0) {
    return (
      <EmptyState
        className="min-h-60 py-10"
        icon={<MenuIcon className="h-12 w-12" />}
        title={t('noMenusAvailable')}
        description={t('menusDescription')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <MenuIcon className="h-4 w-4" />
          {t('menusTitle')}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {t('menusDescription')}
        </p>
      </div>

      <Accordion
        type="multiple"
        value={expandedMenus}
        onValueChange={setExpandedMenus}
        className="space-y-2"
      >
        {hierarchicalMenus.map((menu) => {
          const isAssigned = isMenuAssigned(menu);
          const isToggling = togglingMenuId === menu.id;
          const hasChildren = menu.children && menu.children.length > 0;

          if (!hasChildren) {
            return renderChildMenu(menu);
          }

          return (
            <AccordionItem
              key={menu.id}
              value={`menu-${menu.id}`}
              className={`border rounded-lg transition-all ${
                isAssigned ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1">
                  <AccordionTrigger className="hover:no-underline p-0" />
                  <div
                    className={`rounded-md p-2 ${
                      isAssigned ? 'bg-primary/10' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`${
                        isAssigned ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {renderIcon(menu.icon)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label
                      htmlFor={`menu-${menu.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {getMenuName(menu)}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {menu.url}
                    </p>
                  </div>
                </div>
                <Switch
                  id={`menu-${menu.id}`}
                  checked={isAssigned}
                  disabled={isToggling}
                  onCheckedChange={() =>
                    handleToggleMenu(menu.id, isAssigned, true)
                  }
                  className="ml-4"
                />
              </div>
              <AccordionContent className="px-4 pb-4 pt-2 space-y-2 ml-8">
                {menu.children?.map((child) => renderChildMenu(child))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Paginação */}
      <div className="flex items-center justify-between px-2 pt-4">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {t('showing')} {menus.length} {t('of')} {totalMenus} {t('menus')}
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label
              htmlFor="rows-per-page-menus"
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
                id="rows-per-page-menus"
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
