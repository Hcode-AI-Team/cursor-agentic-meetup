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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { KpiCardsGrid } from '@/components/ui/kpi-cards-grid';
import { Label } from '@/components/ui/label';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFormDraft } from '@/hooks/use-form-draft';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import {
  BadgeHelp,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  FolderPlus,
  GitBranch,
  GripVertical,
  House,
  LayoutDashboard,
  Link,
  Loader2,
  Menu,
  PanelLeftOpen,
  Plus,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Tag,
  Ticket,
  Trash2,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

type RoleLocale = {
  name: string;
  description?: string;
};

type RoleAccessUser = {
  id: number;
  name?: string | null;
  user_identifier?: Array<{ value: string }>;
};

type RoleItem = {
  id: number;
  name?: string;
  role_locale?: RoleLocale[];
  role_menu?: Array<{ role_id: number; menu_id: number }>;
  role_user?: Array<{ user_id: number; user: RoleAccessUser }>;
};

type MenuRolesSectionProps = {
  menuId: number;
};

function MenuRolesSection({ menuId }: MenuRolesSectionProps) {
  const t = useTranslations('core.MenuPage');
  const { request, currentLocaleCode } = useApp();
  const [togglingRoleId, setTogglingRoleId] = useState<number | null>(null);

  const {
    data: rolesData,
    isLoading,
    refetch,
  } = useQuery<PaginatedResponse<RoleItem>>({
    queryKey: ['menu-roles', menuId, currentLocaleCode],
    queryFn: async () => {
      const response = await request<PaginatedResponse<RoleItem>>({
        url: `/menu/${menuId}/role?pageSize=10000`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!menuId,
  });

  const roles = useMemo(() => rolesData?.data ?? [], [rolesData?.data]);

  const getRoleName = (role: RoleItem) =>
    role.role_locale?.[0]?.name ?? role.name ?? String(role.id);

  const getRoleDescription = (role: RoleItem) =>
    role.role_locale?.[0]?.description ?? '';

  const getRoleUserCount = (role: RoleItem) => role.role_user?.length ?? 0;

  const assignedRoles = useMemo(
    () => roles.filter((role) => Boolean(role.role_menu?.length)),
    [roles]
  );

  const accessPreviewUsers = useMemo(() => {
    const previewMap = new Map<
      number,
      { id: number; name: string; email: string | null; roles: string[] }
    >();

    assignedRoles.forEach((role) => {
      const roleLabel =
        role.role_locale?.[0]?.name ?? role.name ?? String(role.id);

      role.role_user?.forEach((roleUser) => {
        const user = roleUser.user;

        if (!user) {
          return;
        }

        const email = user.user_identifier?.[0]?.value ?? null;
        const name = user.name?.trim() || email || `#${user.id}`;
        const existing = previewMap.get(user.id) ?? {
          id: user.id,
          name,
          email,
          roles: [],
        };

        if (!existing.roles.includes(roleLabel)) {
          existing.roles.push(roleLabel);
        }

        previewMap.set(user.id, existing);
      });
    });

    return Array.from(previewMap.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }, [assignedRoles]);

  const previewUsers = accessPreviewUsers.slice(0, 6);

  const handleToggle = async (roleId: number, currentlyAssigned: boolean) => {
    setTogglingRoleId(roleId);

    try {
      const currentIds = roles
        .filter((role) => Boolean(role.role_menu?.length))
        .map((role) => role.id);

      const newIds = currentlyAssigned
        ? currentIds.filter((id) => id !== roleId)
        : [...new Set([...currentIds, roleId])];

      await request({
        url: `/menu/${menuId}/role`,
        method: 'PATCH',
        data: { ids: newIds },
      });

      toast.success(currentlyAssigned ? t('roleRemoved') : t('roleAssigned'));
      await refetch();
    } catch {
      toast.error(t('errorAssigningRole'));
    } finally {
      setTogglingRoleId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          {t('loadingRoles')}
        </span>
      </div>
    );
  }

  if (!roles.length) {
    return (
      <EmptyState
        className="min-h-60 py-10"
        icon={<ShieldCheck className="h-10 w-10" />}
        title={t('noRolesFound')}
        description={t('rolesDescription')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4" />
          {t('rolesTitle')}
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('rolesDescription')}
        </p>
      </div>

      <div className="space-y-1.5">
        {roles.map((role) => {
          const assigned = Boolean(role.role_menu?.length);
          const toggling = togglingRoleId === role.id;
          const linkedUsers = getRoleUserCount(role);

          return (
            <div
              key={role.id}
              className={cn(
                'flex items-center justify-between rounded-lg border p-2.5 transition-all duration-150 hover:shadow-sm active:scale-[0.99]',
                assigned
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:border-primary/30'
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div
                  className={cn(
                    'shrink-0 rounded-md p-1.5',
                    assigned ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  <ShieldCheck
                    className={cn(
                      'h-4 w-4',
                      assigned ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Label
                      htmlFor={`role-${role.id}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {getRoleName(role)}
                    </Label>
                    <TooltipBadge
                      tooltip={`${t('usersWithAccessTitle')}: ${linkedUsers}`}
                      variant="outline"
                      className="rounded-full px-1.5 py-0 text-[10px]"
                    >
                      <Users className="mr-1 h-3 w-3" />
                      {linkedUsers}
                    </TooltipBadge>
                  </div>
                  {getRoleDescription(role) ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {getRoleDescription(role)}
                    </p>
                  ) : null}
                </div>
              </div>

              <Switch
                id={`role-${role.id}`}
                checked={assigned}
                disabled={toggling}
                onCheckedChange={() => handleToggle(role.id, assigned)}
                className="ml-4 shrink-0"
              />
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h5 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4" />
              {t('usersWithAccessTitle')}
            </h5>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('usersWithAccessDescription')}
            </p>
          </div>

          <TooltipBadge
            tooltip={`${t('usersWithAccessTitle')}: ${accessPreviewUsers.length}`}
            variant="secondary"
            className="rounded-full px-2 py-0.5"
          >
            {accessPreviewUsers.length}
          </TooltipBadge>
        </div>

        {!assignedRoles.length ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t('noAssignedRolesPreview')}
          </p>
        ) : !accessPreviewUsers.length ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t('noUsersWithAccess')}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {previewUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-lg border bg-background/80 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    {user.email ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    ) : null}
                  </div>

                  <TooltipBadge
                    tooltip={`${t('grantedByRole')}: ${user.roles.length}`}
                    variant="outline"
                    className="rounded-full px-2 py-0 text-[10px]"
                  >
                    {user.roles.length}
                  </TooltipBadge>
                </div>

                <div className="mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t('grantedByRole')}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {user.roles.map((roleLabel) => (
                      <TooltipBadge
                        key={`${user.id}-${roleLabel}`}
                        tooltip={roleLabel}
                        variant="secondary"
                        className="rounded-full px-2 py-0 text-[10px]"
                      >
                        {roleLabel}
                      </TooltipBadge>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {accessPreviewUsers.length > previewUsers.length ? (
              <p className="text-xs text-muted-foreground">
                {t('moreUsers', {
                  count: accessPreviewUsers.length - previewUsers.length,
                })}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

type TreeNode = {
  id: number;
  menu_id: number | null;
  slug: string;
  url: string;
  icon: string | null;
  order: number | null;
  name?: string;
  menu_locale?: Array<{ name?: string; locale?: { code: string } }>;
  _count?: { role_menu?: number };
  children: TreeNode[];
};

type DropPosition = 'before' | 'inside' | 'after';

type DropTarget = {
  id: number;
  parentId: number | null;
  position: DropPosition;
} | null;

function buildTree(flat: TreeNode[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  flat.forEach((menu) => map.set(menu.id, { ...menu, children: [] }));

  const roots: TreeNode[] = [];

  map.forEach((node) => {
    if (node.menu_id != null && map.has(node.menu_id)) {
      map.get(node.menu_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortByOrder = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((node) => ({ ...node, children: sortByOrder(node.children) }));

  return sortByOrder(roots);
}

function removeNodeFromTree(
  nodes: TreeNode[],
  id: number
): { tree: TreeNode[]; removed: TreeNode | null } {
  let removed: TreeNode | null = null;

  const process = (items: TreeNode[]): TreeNode[] => {
    const filtered = items.filter((node) => {
      if (node.id === id) {
        removed = node;
        return false;
      }

      return true;
    });

    return filtered.map((node) => ({
      ...node,
      children: process(node.children),
    }));
  };

  return { tree: process(nodes), removed };
}

function insertIntoTree(
  nodes: TreeNode[],
  node: TreeNode,
  targetId: number,
  position: DropPosition
): TreeNode[] {
  if (position === 'inside') {
    return nodes.map((item) => {
      if (item.id === targetId) {
        return { ...item, children: [...item.children, node] };
      }

      return {
        ...item,
        children: insertIntoTree(item.children, node, targetId, position),
      };
    });
  }

  const targetIndex = nodes.findIndex((item) => item.id === targetId);

  if (targetIndex !== -1) {
    const result = [...nodes];
    result.splice(
      position === 'before' ? targetIndex : targetIndex + 1,
      0,
      node
    );
    return result;
  }

  return nodes.map((item) => ({
    ...item,
    children: insertIntoTree(item.children, node, targetId, position),
  }));
}

function isDescendantOf(
  nodes: TreeNode[],
  ancestorId: number,
  candidateId: number
): boolean {
  const findAncestor = (items: TreeNode[]): TreeNode | null => {
    for (const node of items) {
      if (node.id === ancestorId) {
        return node;
      }

      const found = findAncestor(node.children);
      if (found) {
        return found;
      }
    }

    return null;
  };

  const ancestor = findAncestor(nodes);

  if (!ancestor) {
    return false;
  }

  const searchChildren = (items: TreeNode[]): boolean =>
    items.some(
      (node) => node.id === candidateId || searchChildren(node.children)
    );

  return searchChildren(ancestor.children);
}

function collectOrderGroups(nodes: TreeNode[]): { ids: number[] }[] {
  const groups: { ids: number[] }[] = [];

  const traverse = (siblings: TreeNode[]) => {
    if (siblings.length > 0) {
      groups.push({ ids: siblings.map((node) => node.id) });
      siblings.forEach((node) => traverse(node.children));
    }
  };

  traverse(nodes);
  return groups;
}

function collectExpandableIds(nodes: TreeNode[]): number[] {
  const ids: number[] = [];

  const traverse = (items: TreeNode[]) => {
    items.forEach((node) => {
      if (node.children.length > 0) {
        ids.push(node.id);
        traverse(node.children);
      }
    });
  };

  traverse(nodes);
  return ids;
}

function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    const filteredChildren = filterTreeNodes(node.children, query);
    const label = node.menu_locale?.[0]?.name ?? node.name ?? node.slug;
    const matches = [label, node.slug, node.url]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery));

    if (!matches && filteredChildren.length === 0) {
      return [];
    }

    return [{ ...node, children: filteredChildren }];
  });
}

function getDescendantIds(menus: MenuItem[], parentId: number): number[] {
  const descendants: number[] = [];
  const stack = menus
    .filter((menu) => menu.menu_id === parentId)
    .map((menu) => menu.id);

  while (stack.length > 0) {
    const currentId = stack.pop();

    if (currentId == null) {
      continue;
    }

    descendants.push(currentId);

    menus
      .filter((menu) => menu.menu_id === currentId)
      .forEach((menu) => stack.push(menu.id));
  }

  return descendants;
}

function getMenuRoleCount(
  menu: Pick<MenuItem, '_count'> | Pick<TreeNode, '_count'>
) {
  return menu._count?.role_menu ?? 0;
}

type MenuVisualConfig = {
  Icon: LucideIcon;
  iconWrapperClassName: string;
  iconClassName: string;
};

function getMenuVisual(menu: {
  slug: string;
  url: string;
  name?: string;
  icon?: string | null;
}): MenuVisualConfig {
  const lookup =
    `${menu.slug} ${menu.url} ${menu.name ?? ''} ${menu.icon ?? ''}`.toLowerCase();

  if (/(dashboard|painel|home|inicio)/.test(lookup)) {
    return {
      Icon: LayoutDashboard,
      iconWrapperClassName: 'bg-blue-50',
      iconClassName: 'text-blue-600',
    };
  }

  if (/(user|usuario|account|conta|contact|cliente|cargo|role)/.test(lookup)) {
    return {
      Icon: Users,
      iconWrapperClassName: 'bg-violet-50',
      iconClassName: 'text-violet-600',
    };
  }

  if (/(config|setting|admin|security|permission)/.test(lookup)) {
    return {
      Icon: Settings,
      iconWrapperClassName: 'bg-slate-100',
      iconClassName: 'text-slate-700',
    };
  }

  if (
    /(finance|billing|payment|bank|cash|invoice|transfer|credit|debit)/.test(
      lookup
    )
  ) {
    return {
      Icon: Wallet,
      iconWrapperClassName: 'bg-emerald-50',
      iconClassName: 'text-emerald-600',
    };
  }

  if (/(faq|help|support|ajuda)/.test(lookup)) {
    return {
      Icon: BadgeHelp,
      iconWrapperClassName: 'bg-amber-50',
      iconClassName: 'text-amber-600',
    };
  }

  if (/(ticket|chamado|suporte)/.test(lookup)) {
    return {
      Icon: Ticket,
      iconWrapperClassName: 'bg-rose-50',
      iconClassName: 'text-rose-600',
    };
  }

  if (/(blog|content|post|article|template|email|report|doc)/.test(lookup)) {
    return {
      Icon: FileText,
      iconWrapperClassName: 'bg-cyan-50',
      iconClassName: 'text-cyan-600',
    };
  }

  if (/(course|lesson|lms|class|academy)/.test(lookup)) {
    return {
      Icon: BookOpen,
      iconWrapperClassName: 'bg-indigo-50',
      iconClassName: 'text-indigo-600',
    };
  }

  if (/(tag|label|category|catalog)/.test(lookup)) {
    return {
      Icon: Tag,
      iconWrapperClassName: 'bg-fuchsia-50',
      iconClassName: 'text-fuchsia-600',
    };
  }

  if (/(company|business|operation|studio|workspace)/.test(lookup)) {
    return {
      Icon: Building2,
      iconWrapperClassName: 'bg-orange-50',
      iconClassName: 'text-orange-600',
    };
  }

  return {
    Icon: Menu,
    iconWrapperClassName: 'bg-muted',
    iconClassName: 'text-muted-foreground',
  };
}

type MenuTreeWorkspaceProps = {
  menus: TreeNode[];
  searchQuery: string;
  selectedId: number | null;
  onSelect: (menuId: number) => void | Promise<void>;
  onSaved: () => void | Promise<void>;
  onAddSubmenu: (menuId: number) => void | Promise<void>;
  onDuplicate: (menuId: number) => void | Promise<void>;
  onDelete: (menuId: number) => void | Promise<void>;
  onMoveToRoot: (menuId: number) => void | Promise<void>;
};

function MenuTreeWorkspace({
  menus,
  searchQuery,
  selectedId,
  onSelect,
  onSaved,
  onAddSubmenu,
  onDuplicate,
  onDelete,
  onMoveToRoot,
}: MenuTreeWorkspaceProps) {
  const t = useTranslations('core.MenuPage');
  const { request } = useApp();

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<{
    id: number;
    parentId: number | null;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const nextTree = buildTree(menus as TreeNode[]);
    setTree(nextTree);
    setExpandedIds(new Set(collectExpandableIds(nextTree)));
  }, [menus]);

  const filteredTree = useMemo(
    () => filterTreeNodes(tree, searchQuery),
    [searchQuery, tree]
  );

  const getDisplayName = (node: TreeNode) =>
    node.menu_locale?.[0]?.name ?? node.name ?? node.slug;

  const toggleExpanded = (id: number) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const handleDrop = async (target: DropTarget) => {
    if (!target || !dragging || dragging.id === target.id) {
      setDragging(null);
      setDropTarget(null);
      return;
    }

    if (
      target.position === 'inside' &&
      isDescendantOf(tree, dragging.id, target.id)
    ) {
      setDragging(null);
      setDropTarget(null);
      return;
    }

    const newParentId =
      target.position === 'inside' ? target.id : target.parentId;
    const oldParentId = dragging.parentId;
    const draggedId = dragging.id;

    const { tree: treeWithoutNode, removed } = removeNodeFromTree(
      tree,
      dragging.id
    );

    if (!removed) {
      setDragging(null);
      setDropTarget(null);
      return;
    }

    const newTree = insertIntoTree(
      treeWithoutNode,
      removed,
      target.id,
      target.position
    );

    setTree(newTree);
    setDragging(null);
    setDropTarget(null);

    setSaving(true);

    try {
      if (oldParentId !== newParentId) {
        await request({
          url: `/menu/${draggedId}`,
          method: 'PATCH',
          data: { menu_id: newParentId },
        });
      }

      const groups = collectOrderGroups(newTree);
      await Promise.all(
        groups.map(({ ids }) =>
          request({
            url: '/menu/order',
            method: 'PATCH',
            data: { ids },
          })
        )
      );

      toast.success(t('treeOrderSaved'));
      await onSaved();
    } catch {
      toast.error(t('treeOrderError'));
      setTree(buildTree(menus as TreeNode[]));
    } finally {
      setSaving(false);
    }
  };

  const renderNode = (
    node: TreeNode,
    parentId: number | null,
    depth = 0
  ): React.ReactNode => {
    const isDraggingThis = dragging?.id === node.id;
    const isTarget = dropTarget?.id === node.id;
    const isBefore = isTarget && dropTarget?.position === 'before';
    const isAfter = isTarget && dropTarget?.position === 'after';
    const isInside = isTarget && dropTarget?.position === 'inside';
    const hasChildren = node.children.length > 0;
    const isExpanded = searchQuery.trim() ? true : expandedIds.has(node.id);
    const roleCount = getMenuRoleCount(node);
    const visual = getMenuVisual(node);
    const NodeIcon = visual.Icon;

    return (
      <div key={node.id} className="space-y-1">
        {isBefore ? (
          <div className="mx-2 my-0.5 h-0.5 rounded bg-primary" />
        ) : null}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              draggable
              onClick={() => {
                void onSelect(node.id);
              }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                setDragging({ id: node.id, parentId });
              }}
              onDragEnd={() => {
                setDragging(null);
                setDropTarget(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!dragging || dragging.id === node.id) {
                  return;
                }

                if (isDescendantOf(tree, dragging.id, node.id)) {
                  return;
                }

                const rect = (
                  event.currentTarget as HTMLDivElement
                ).getBoundingClientRect();
                const ratio = (event.clientY - rect.top) / rect.height;

                let position: DropPosition = 'inside';
                if (ratio < 0.25) {
                  position = 'before';
                } else if (ratio > 0.75) {
                  position = 'after';
                }

                setDropTarget({ id: node.id, parentId, position });
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  setDropTarget((previous) =>
                    previous?.id === node.id ? null : previous
                  );
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void handleDrop(dropTarget);
              }}
              style={{ paddingLeft: `${depth * 14}px` }}
              className={cn(
                'group relative mr-1 flex cursor-pointer items-center gap-2 rounded-xl border px-2 py-1.5 transition-all duration-150 select-none active:scale-[0.99]',
                isDraggingThis ? 'opacity-40' : 'opacity-100',
                selectedId === node.id
                  ? 'border-primary/70 bg-linear-to-r from-primary/10 via-primary/5 to-background shadow-[0_10px_24px_-18px_var(--primary)] ring-1 ring-primary/15'
                  : 'border-transparent hover:border-primary/30 hover:bg-muted/60 hover:shadow-sm',
                isInside ? 'ring-2 ring-primary bg-primary/10' : ''
              )}
            >
              {selectedId === node.id ? (
                <span className="absolute inset-y-1 left-1 w-1 rounded-full bg-primary/70" />
              ) : null}

              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted"
                onClick={(event) => {
                  event.stopPropagation();
                  if (hasChildren) {
                    toggleExpanded(node.id);
                  }
                }}
                aria-label={hasChildren ? t('buttonViewTree') : t('menus')}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )
                ) : (
                  <span className="h-4 w-4" />
                )}
              </button>

              <span
                className="cursor-grab text-muted-foreground"
                title="Arrastar"
              >
                <GripVertical className="h-4 w-4" />
              </span>

              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
                  selectedId === node.id
                    ? `${visual.iconWrapperClassName} ring-1 ring-primary/20`
                    : visual.iconWrapperClassName
                )}
              >
                <NodeIcon
                  className={cn(
                    'h-4 w-4',
                    selectedId === node.id
                      ? 'text-primary'
                      : visual.iconClassName
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {getDisplayName(node)}
                  </span>
                  <TooltipBadge
                    tooltip={
                      node.menu_id == null ? t('rootMenuLabel') : t('subMenu')
                    }
                    variant={node.menu_id == null ? 'default' : 'secondary'}
                    className="rounded-full px-2 py-0 text-[10px]"
                  >
                    {node.menu_id == null ? t('rootMenuLabel') : t('subMenu')}
                  </TooltipBadge>
                  <TooltipBadge
                    tooltip={`${t('tabRoles')}: ${roleCount}`}
                    variant="outline"
                    className={cn(
                      'rounded-full px-1.5 py-0 text-[10px]',
                      roleCount > 0
                        ? 'border-primary/30 bg-primary/5 text-primary'
                        : 'text-muted-foreground'
                    )}
                  >
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    {roleCount}
                  </TooltipBadge>
                </div>

                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{node.url || '/'}</span>
                  {node.order != null ? <span>#{node.order}</span> : null}
                </div>
              </div>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-56">
            <ContextMenuItem onClick={() => void onSelect(node.id)}>
              <Menu className="h-4 w-4" />
              {t('buttonEditMenu')}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void onAddSubmenu(node.id)}>
              <FolderPlus className="h-4 w-4" />
              {t('addSubmenu')}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void onDuplicate(node.id)}>
              <Copy className="h-4 w-4" />
              {t('duplicateMenu')}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void onMoveToRoot(node.id)}>
              <House className="h-4 w-4" />
              {t('moveToRoot')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onClick={() => void onDelete(node.id)}
            >
              <Trash2 className="h-4 w-4" />
              {t('buttonDeleteMenu')}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {isAfter ? (
          <div className="mx-2 my-0.5 h-0.5 rounded bg-primary" />
        ) : null}

        {hasChildren && isExpanded ? (
          <div className="mb-0.5 ml-3.5 space-y-1 border-l border-dashed border-primary/20 pl-1.5">
            {node.children.map((child) =>
              renderNode(child, node.id, depth + 1)
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-110 flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <GitBranch className="h-4 w-4" />
            {t('treeWorkspaceTitle')}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('treeWorkspaceDescription')}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <TooltipBadge
              tooltip={`${t('menus')}: ${menus.length}`}
              variant="outline"
              className="rounded-full px-2 py-0.5"
            >
              {menus.length} {t('menus')}
            </TooltipBadge>
            <TooltipBadge
              tooltip={`${t('searchResults')}: ${filteredTree.length}`}
              variant="secondary"
              className="rounded-full px-2 py-0.5"
            >
              {filteredTree.length} {t('searchResults')}
            </TooltipBadge>
          </div>
        </div>

        {saving ? (
          <Badge variant="outline" className="gap-1 rounded-full px-2 py-0.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('saveChanges')}
          </Badge>
        ) : null}
      </div>

      <div className="mt-1.5 rounded-lg border border-dashed bg-muted/20 p-2 text-[11px] leading-4 text-muted-foreground">
        {t('treeDialogDescription')}
      </div>

      <ScrollArea className="mt-2 flex-1 pr-3">
        <div className="space-y-1.5 pr-2">
          {filteredTree.length === 0 ? (
            <div className="flex min-h-55 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              {t('treeEmptySearch')}
            </div>
          ) : (
            filteredTree.map((node) => renderNode(node, null, 0))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

type MenuLocale = {
  name: string;
};

type MenuItem = {
  id: number;
  menu_id: number | null;
  slug: string;
  url: string;
  icon: string | null;
  order: number | null;
  menu_locale?: Array<{
    name?: string;
    locale?: { code: string };
  }>;
  _count?: { role_menu?: number };
  name?: string;
  locale?: Record<string, MenuLocale>;
};

type MenuStats = {
  total: number;
};

type LocaleOption = {
  code: string;
  name: string;
};

type RequestError = {
  response?: {
    data?: {
      message?: string | string[];
      error?: string;
    };
  };
  message?: string;
};

type MenuDraftPayload = {
  mode: 'create' | 'edit';
  menuId: number | null;
  localeCode: string;
  values: {
    slug: string;
    url: string;
    name: string;
    icon: string;
    order?: number;
    menu_id: string;
  };
};

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const requestError = error as RequestError;
    const message = requestError.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return (
      message ||
      requestError.response?.data?.error ||
      requestError.message ||
      fallback
    );
  }

  return fallback;
}

type TooltipBadgeProps = React.ComponentProps<typeof Badge> & {
  tooltip: React.ReactNode;
};

function TooltipBadge({
  tooltip,
  className,
  children,
  ...props
}: TooltipBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge {...props} className={cn('cursor-help', className)}>
          {children}
        </Badge>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

const NO_PARENT = '__none__';
const MENU_CREATE_DRAFT_STORAGE_KEY = 'core-menu-create-draft';
const MENU_EDIT_DRAFT_STORAGE_KEY = 'core-menu-edit-draft';

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export default function MenuPage() {
  const t = useTranslations('core.MenuPage');
  const { request, currentLocaleCode, locales, getSettingValue } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(currentLocaleCode);
  const [isRefreshingMenu, setIsRefreshingMenu] = useState(false);

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
    storageKey: 'pagination:core-menu:pageSize',
    defaultValue: 12,
    allowedValues: pageSizeOptions,
  });

  const { data: allMenus, refetch: refetchAllMenus } = useQuery<MenuItem[]>({
    queryKey: ['menus-all', currentLocaleCode],
    queryFn: async () => {
      const response = await request<MenuItem[]>({
        url: '/menu/all',
        method: 'GET',
      });
      return response.data;
    },
    enabled: true,
  });

  const { data: menuStats } = useQuery<MenuStats>({
    queryKey: ['menus-stats'],
    queryFn: async () => {
      const response = await request<MenuStats>({
        url: '/menu/stats',
        method: 'GET',
      });
      return response.data;
    },
  });

  const {
    data: menusResponse,
    isLoading,
    refetch,
  } = useQuery<PaginatedResponse<MenuItem>>({
    queryKey: ['menus', page, pageSize, searchQuery, currentLocaleCode],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await request<PaginatedResponse<MenuItem>>({
        url: `/menu?${params.toString()}`,
        method: 'GET',
      });

      return response.data;
    },
  });

  const addMenuSchema = z.object({
    slug: z.string().min(2, t('errorSlug')),
    url: z.string().min(1, t('errorUrl')),
    name: z.string().optional(),
    icon: z.string().optional(),
    order: z.coerce.number().int().min(1).optional(),
    menu_id: z.string().optional(),
  });

  const editMenuSchema = z.object({
    slug: z.string().min(2, t('errorSlug')),
    url: z.string().min(1, t('errorUrl')),
    icon: z.string().optional(),
    order: z.coerce.number().int().min(1).optional(),
    menu_id: z.string().optional(),
    name: z.string().optional(),
  });

  const form = useForm<z.infer<typeof addMenuSchema>>({
    resolver: zodResolver(addMenuSchema),
    defaultValues: {
      slug: '',
      url: '',
      name: '',
      icon: '',
      order: undefined,
      menu_id: NO_PARENT,
    },
  });

  const editForm = useForm<z.infer<typeof editMenuSchema>>({
    resolver: zodResolver(editMenuSchema),
    defaultValues: {
      slug: '',
      url: '',
      icon: '',
      order: undefined,
      menu_id: NO_PARENT,
      name: '',
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
  } = useFormDraft<MenuDraftPayload>({
    storageKey: MENU_CREATE_DRAFT_STORAGE_KEY,
    value: {
      mode: 'create',
      menuId: null,
      localeCode: currentLocaleCode,
      values: {
        slug: watchedCreateValues.slug ?? '',
        url: watchedCreateValues.url ?? '',
        name: watchedCreateValues.name ?? '',
        icon: watchedCreateValues.icon ?? '',
        order: watchedCreateValues.order,
        menu_id: watchedCreateValues.menu_id ?? NO_PARENT,
      },
    },
    hasData: Boolean(
      (watchedCreateValues.slug ?? '').trim() ||
      (watchedCreateValues.url ?? '').trim() ||
      (watchedCreateValues.name ?? '').trim() ||
      (watchedCreateValues.icon ?? '').trim() ||
      watchedCreateValues.order != null ||
      (watchedCreateValues.menu_id ?? NO_PARENT) !== NO_PARENT
    ),
    enabled: isDialogOpen,
  });

  const {
    clearDraft: clearEditDraft,
    loadDraft: loadEditDraft,
    hasDraft: hasEditDraft,
    savedAt: editDraftSavedAt,
  } = useFormDraft<MenuDraftPayload>({
    storageKey: MENU_EDIT_DRAFT_STORAGE_KEY,
    value: {
      mode: 'edit',
      menuId: editingMenu?.id ?? null,
      localeCode: selectedLocale,
      values: {
        slug: watchedEditValues.slug ?? '',
        url: watchedEditValues.url ?? '',
        name: watchedEditValues.name ?? '',
        icon: watchedEditValues.icon ?? '',
        order: watchedEditValues.order,
        menu_id: watchedEditValues.menu_id ?? NO_PARENT,
      },
    },
    hasData: Boolean(
      (watchedEditValues.slug ?? '').trim() ||
      (watchedEditValues.url ?? '').trim() ||
      (watchedEditValues.name ?? '').trim() ||
      (watchedEditValues.icon ?? '').trim() ||
      watchedEditValues.order != null ||
      (watchedEditValues.menu_id ?? NO_PARENT) !== NO_PARENT
    ),
    enabled: Boolean(editingMenu),
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

  const getMenuDisplayName = useCallback((menu: MenuItem | TreeNode) => {
    return menu.name || menu.menu_locale?.[0]?.name || menu.slug;
  }, []);

  const handleEdit = useCallback(
    async (menu: Pick<MenuItem, 'id'>) => {
      setEditFormError(null);
      setIsRefreshingMenu(true);

      try {
        const response = await request<MenuItem>({
          url: `/menu/${menu.id}`,
          method: 'GET',
        });

        const fullMenu = response.data;
        const localeData: Record<string, MenuLocale> = {};

        if (fullMenu.menu_locale && Array.isArray(fullMenu.menu_locale)) {
          fullMenu.menu_locale.forEach((localeItem) => {
            const localeCode = localeItem.locale?.code;
            if (localeCode) {
              localeData[localeCode] = { name: localeItem.name || '' };
            }
          });
        }

        (locales as LocaleOption[] | undefined)?.forEach((locale) => {
          if (!localeData[locale.code]) {
            localeData[locale.code] = { name: '' };
          }
        });

        const storedDraft = loadEditDraft();
        const nextLocale =
          storedDraft?.payload.mode === 'edit' &&
          storedDraft.payload.menuId === fullMenu.id
            ? storedDraft.payload.localeCode
            : currentLocaleCode;

        setSelectedLocale(nextLocale);
        setEditingMenu({ ...fullMenu, locale: localeData });
      } catch (error) {
        console.error('Error fetching menu:', error);
        toast.error(t('serverError'));
      } finally {
        setIsRefreshingMenu(false);
      }
    },
    [currentLocaleCode, loadEditDraft, locales, request, t]
  );

  useEffect(() => {
    if (!editingMenu) {
      return;
    }

    const storedDraft = loadEditDraft();
    const shouldRestoreDraft =
      storedDraft?.payload.mode === 'edit' &&
      storedDraft.payload.menuId === editingMenu.id &&
      storedDraft.payload.localeCode === selectedLocale;
    const localeData = editingMenu.locale?.[selectedLocale];

    editForm.reset(
      shouldRestoreDraft
        ? storedDraft.payload.values
        : {
            slug: editingMenu.slug || '',
            url: editingMenu.url || '',
            icon: editingMenu.icon || '',
            order: editingMenu.order ?? undefined,
            menu_id: editingMenu.menu_id
              ? String(editingMenu.menu_id)
              : NO_PARENT,
            name: localeData?.name || editingMenu.name || '',
          }
    );
  }, [editForm, editingMenu, loadEditDraft, selectedLocale]);

  useEffect(() => {
    if (!allMenus || allMenus.length === 0) {
      setEditingMenu(null);
      return;
    }

    if (editingMenu && allMenus.some((menu) => menu.id === editingMenu.id)) {
      return;
    }

    const firstMenu = allMenus[0];
    if (!firstMenu) {
      return;
    }

    void handleEdit({ id: firstMenu.id });
  }, [allMenus, editingMenu, handleEdit]);

  const openCreateMenu = (parentId?: number | null) => {
    setFormError(null);
    const storedDraft = loadCreateDraft();

    form.reset(
      storedDraft?.payload.mode === 'create'
        ? storedDraft.payload.values
        : {
            slug: '',
            url: '',
            name: '',
            icon: '',
            order: undefined,
            menu_id: parentId ? String(parentId) : NO_PARENT,
          }
    );
    setIsDialogOpen(true);
  };

  const refreshWorkspace = useCallback(
    async (menuIdToReload?: number | null) => {
      await Promise.all([refetch(), refetchAllMenus()]);

      if (menuIdToReload) {
        await handleEdit({ id: menuIdToReload });
      }
    },
    [handleEdit, refetch, refetchAllMenus]
  );

  const onSubmit = async (values: z.infer<typeof addMenuSchema>) => {
    try {
      const localePayload: Record<string, string> = {};
      if (values.name) {
        localePayload[currentLocaleCode] = values.name;
      }

      const response = await request<MenuItem>({
        url: '/menu',
        method: 'POST',
        data: {
          slug: values.slug,
          url: values.url,
          icon: values.icon || undefined,
          order: values.order || undefined,
          menu_id:
            values.menu_id && values.menu_id !== NO_PARENT
              ? Number(values.menu_id)
              : undefined,
          ...(Object.keys(localePayload).length > 0
            ? { locale: localePayload }
            : {}),
        },
      });

      clearCreateDraft();
      form.reset({
        slug: '',
        url: '',
        name: '',
        icon: '',
        order: undefined,
        menu_id: NO_PARENT,
      });

      setIsDialogOpen(false);
      setFormError(null);
      toast.success(t('menuCreatedSuccess'));

      await refreshWorkspace(response.data?.id ?? null);
    } catch (error: unknown) {
      setFormError(getRequestErrorMessage(error, t('serverError')));
    }
  };

  const onEditSubmit = async (values: z.infer<typeof editMenuSchema>) => {
    if (!editingMenu) {
      return;
    }

    try {
      const localePayload: Record<string, string> = {};

      if (editingMenu.locale) {
        Object.entries(editingMenu.locale).forEach(([code, data]) => {
          localePayload[code] = data.name;
        });
      }

      localePayload[selectedLocale] = values.name || '';

      await request({
        url: `/menu/${editingMenu.id}`,
        method: 'PATCH',
        data: {
          slug: values.slug,
          url: values.url,
          icon: values.icon || undefined,
          order: values.order || undefined,
          menu_id:
            values.menu_id && values.menu_id !== NO_PARENT
              ? Number(values.menu_id)
              : null,
          locale: localePayload,
        },
      });

      clearEditDraft();
      toast.success(t('menuUpdatedSuccess'));
      setEditFormError(null);
      await refreshWorkspace(editingMenu.id);
    } catch (error: unknown) {
      setEditFormError(getRequestErrorMessage(error, t('serverError')));
    }
  };

  const handleDuplicateMenu = async (menuId: number) => {
    try {
      const response = await request<MenuItem>({
        url: `/menu/${menuId}`,
        method: 'GET',
      });

      const fullMenu = response.data;
      const localePayload: Record<string, string> = {};

      if (Array.isArray(fullMenu.menu_locale)) {
        fullMenu.menu_locale.forEach((localeItem) => {
          const localeCode = localeItem.locale?.code;
          if (localeCode && localeItem.name) {
            localePayload[localeCode] = `${localeItem.name} Copy`;
          }
        });
      }

      const slugSuffix = `copy-${Date.now().toString().slice(-4)}`;
      const created = await request<MenuItem>({
        url: '/menu',
        method: 'POST',
        data: {
          slug: `${fullMenu.slug}-${slugSuffix}`.slice(0, 120),
          url: fullMenu.url || '',
          icon: fullMenu.icon || undefined,
          order: fullMenu.order || undefined,
          menu_id: fullMenu.menu_id ?? undefined,
          ...(Object.keys(localePayload).length > 0
            ? { locale: localePayload }
            : {}),
        },
      });

      toast.success(t('duplicateSuccess'));
      await refreshWorkspace(created.data?.id ?? null);
    } catch {
      toast.error(t('duplicateError'));
    }
  };

  const handleMoveToRoot = async (menuId: number) => {
    try {
      await request({
        url: `/menu/${menuId}`,
        method: 'PATCH',
        data: { menu_id: null },
      });

      toast.success(t('moveToRootSuccess'));
      await refreshWorkspace(menuId);
    } catch {
      toast.error(t('serverError'));
    }
  };

  const requestDeleteMenu = async (menuId: number) => {
    if (editingMenu?.id !== menuId) {
      await handleEdit({ id: menuId });
    }

    setOpenDeleteModal(true);
  };

  const onDelete = async () => {
    if (!editingMenu) {
      return;
    }

    try {
      await request({
        url: '/menu',
        method: 'DELETE',
        data: { ids: [Number(editingMenu.id)] },
      });

      clearEditDraft();
      setOpenDeleteModal(false);
      setEditingMenu(null);
      setEditFormError(null);
      toast.success(t('menuDeletedSuccess'));

      await Promise.all([refetch(), refetchAllMenus()]);
    } catch (error: unknown) {
      setEditFormError(getRequestErrorMessage(error, t('serverError')));
    }
  };

  const descendantIds = useMemo(
    () => (editingMenu ? getDescendantIds(allMenus ?? [], editingMenu.id) : []),
    [allMenus, editingMenu]
  );

  const parentMenuOptions = useMemo(
    () =>
      (allMenus ?? []).filter(
        (menu) =>
          menu.id !== editingMenu?.id && !descendantIds.includes(menu.id)
      ),
    [allMenus, descendantIds, editingMenu]
  );

  const rootMenusCount = useMemo(
    () => (allMenus ?? []).filter((menu) => menu.menu_id == null).length,
    [allMenus]
  );

  const selectedChildrenCount = useMemo(
    () =>
      editingMenu
        ? (allMenus ?? []).filter((menu) => menu.menu_id === editingMenu.id)
            .length
        : 0,
    [allMenus, editingMenu]
  );

  const subMenuCount = useMemo(
    () => Math.max((allMenus?.length ?? 0) - rootMenusCount, 0),
    [allMenus, rootMenusCount]
  );

  const highlightKpiTitle = searchQuery.trim()
    ? t('searchResults')
    : t('childrenCount');

  const highlightKpiValue = searchQuery.trim()
    ? String(menusResponse?.total ?? 0)
    : String(selectedChildrenCount);

  const selectedParentLabel = useMemo(() => {
    if (!editingMenu?.menu_id) {
      return t('formParentMenuNone');
    }

    const parent = (allMenus ?? []).find(
      (menu) => menu.id === editingMenu.menu_id
    );
    return parent ? getMenuDisplayName(parent) : t('formParentMenuNone');
  }, [allMenus, editingMenu, getMenuDisplayName, t]);

  const selectedRoleCount = useMemo(() => {
    if (!editingMenu) {
      return 0;
    }

    const currentMenu = (allMenus ?? []).find(
      (menu) => menu.id === editingMenu.id
    );
    return getMenuRoleCount(currentMenu ?? editingMenu);
  }, [allMenus, editingMenu]);

  const selectedMenuVisual = editingMenu ? getMenuVisual(editingMenu) : null;

  const detailPanel = editingMenu ? (
    <div className="space-y-2.5">
      <Card className="rounded-xl border-border/60 bg-linear-to-br from-primary/4 via-background to-background shadow-sm">
        <CardHeader className="gap-2.5 p-3.5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-border/60',
                  selectedMenuVisual?.iconWrapperClassName ?? 'bg-primary/10'
                )}
              >
                {selectedMenuVisual ? (
                  <selectedMenuVisual.Icon
                    className={cn('h-6 w-6', selectedMenuVisual.iconClassName)}
                  />
                ) : (
                  <Menu className="h-6 w-6 text-primary" />
                )}
              </div>

              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {getMenuDisplayName(editingMenu)}
                  {isRefreshingMenu ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : null}
                  <TooltipBadge
                    tooltip={`${t('tabRoles')}: ${selectedRoleCount}`}
                    variant="outline"
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px]',
                      selectedRoleCount > 0
                        ? 'border-primary/30 bg-primary/5 text-primary'
                        : 'text-muted-foreground'
                    )}
                  >
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    {selectedRoleCount}
                  </TooltipBadge>
                </CardTitle>
                <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                  <Link className="h-3 w-3" />
                  <span className="truncate">{editingMenu.url || '/'}</span>
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <TooltipBadge tooltip={editingMenu.slug} variant="secondary">
                    {editingMenu.slug}
                  </TooltipBadge>
                  <TooltipBadge
                    tooltip={
                      editingMenu.menu_id == null
                        ? t('rootMenuLabel')
                        : t('subMenu')
                    }
                    variant="outline"
                  >
                    {editingMenu.menu_id == null
                      ? t('rootMenuLabel')
                      : t('subMenu')}
                  </TooltipBadge>
                  {editingMenu.order != null ? (
                    <TooltipBadge
                      tooltip={`${t('editOrderLabel')}: #${editingMenu.order}`}
                      variant="outline"
                    >
                      #{editingMenu.order}
                    </TooltipBadge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
              <Select
                value={selectedLocale}
                onValueChange={(value) => {
                  const currentName = editForm.getValues('name');
                  setEditingMenu((previous) => {
                    if (!previous) {
                      return previous;
                    }

                    return {
                      ...previous,
                      locale: {
                        ...previous.locale,
                        [selectedLocale]: { name: currentName ?? '' },
                      },
                    };
                  });
                  setSelectedLocale(value);
                }}
              >
                <SelectTrigger className="h-8 w-full sm:w-36">
                  <SelectValue placeholder={t('selectedLocaleLabel')} />
                </SelectTrigger>
                <SelectContent>
                  {((locales as LocaleOption[] | undefined) ?? []).map(
                    (locale) => (
                      <SelectItem key={locale.code} value={locale.code}>
                        {locale.name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => openCreateMenu(editingMenu.id)}
                    className="h-8 w-8 cursor-pointer"
                    aria-label={t('addSubmenu')}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('addSubmenu')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => void handleDuplicateMenu(editingMenu.id)}
                    className="h-8 w-8 cursor-pointer"
                    aria-label={t('duplicateMenu')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('duplicateMenu')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => setOpenDeleteModal(true)}
                    className="h-8 w-8 cursor-pointer"
                    aria-label={t('buttonDeleteMenu')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('buttonDeleteMenu')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <KpiCardsGrid
            columns={4}
            className="gap-2.5"
            cardClassName="border-border/60 shadow-none"
            items={[
              {
                key: 'selected-parent',
                title: t('parentMenuSummary'),
                value: selectedParentLabel,
                icon: House,
                layout: 'compact',
                accentClassName:
                  'from-emerald-500/20 via-emerald-400/10 to-transparent',
                iconContainerClassName: 'bg-emerald-50 text-emerald-600',
                valueClassName: 'mt-2 text-sm font-semibold leading-5',
              },
              {
                key: 'selected-children',
                title: t('childrenCount'),
                value: String(selectedChildrenCount),
                icon: GitBranch,
                layout: 'compact',
                accentClassName:
                  'from-violet-500/20 via-fuchsia-500/10 to-transparent',
                iconContainerClassName: 'bg-violet-50 text-violet-600',
              },
              {
                key: 'selected-roles',
                title: t('tabRoles'),
                value: String(selectedRoleCount),
                icon: ShieldCheck,
                layout: 'compact',
                accentClassName:
                  'from-sky-500/20 via-cyan-500/10 to-transparent',
                iconContainerClassName: 'bg-sky-50 text-sky-700',
              },
              {
                key: 'selected-locale',
                title: t('selectedLocaleLabel'),
                value: selectedLocale.toUpperCase(),
                icon: Settings,
                layout: 'compact',
                accentClassName:
                  'from-amber-500/20 via-yellow-500/10 to-transparent',
                iconContainerClassName: 'bg-amber-50 text-amber-700',
                valueClassName: 'mt-2 text-sm font-semibold uppercase',
              },
            ]}
          />
        </CardHeader>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-3.5">
          <Tabs defaultValue="basic-info" className="space-y-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic-info">{t('tabBasicInfo')}</TabsTrigger>
              <TabsTrigger value="roles">{t('tabRoles')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic-info" className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {t('selectedMenuTitle')}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('selectedMenuDescription')}
                </p>
              </div>

              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit(onEditSubmit)}
                  className="space-y-3"
                >
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('editNameLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('editNamePlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
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
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('editUrlLabel')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={editForm.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('editIconLabel')}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('editOrderLabel')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="menu_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('editParentMenuLabel')}</FormLabel>
                        <Select
                          value={field.value ?? NO_PARENT}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={t('editParentMenuPlaceholder')}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="w-full">
                            <SelectItem value={NO_PARENT}>
                              {t('formParentMenuNone')}
                            </SelectItem>
                            {parentMenuOptions.map((menu) => (
                              <SelectItem key={menu.id} value={String(menu.id)}>
                                {getMenuDisplayName(menu)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {editFormError ? (
                    <Alert
                      variant="destructive"
                      className="rounded-md border-red-300 bg-red-50 p-4"
                    >
                      <AlertTitle className="text-sm">
                        {t('verifyYourInput')}
                      </AlertTitle>
                      <AlertDescription className="text-sm">
                        {editFormError}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {editDraftStatusContent ? (
                    <p className="text-xs text-muted-foreground">
                      {editDraftStatusContent}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="submit"
                      className="cursor-pointer sm:min-w-36"
                    >
                      {t('saveChanges')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => void handleMoveToRoot(editingMenu.id)}
                    >
                      <House className="mr-1 h-4 w-4" />
                      {t('moveToRoot')}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="roles">
              <MenuRolesSection menuId={editingMenu.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  ) : (
    <EmptyState
      className="h-full min-h-105"
      icon={<GitBranch className="h-12 w-12" />}
      title={t('noMenuSelectedTitle')}
      description={t('noMenuSelectedDescription')}
      actionLabel={t('buttonAddMenu')}
      onAction={() => openCreateMenu()}
    />
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: t('home'), href: '/' }, { label: t('menus') }]}
        actions={[
          {
            label: t('buttonAddMenu'),
            onClick: () => openCreateMenu(),
            variant: 'default',
            icon: <Plus className="h-4 w-4" />,
          },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <KpiCardsGrid
        columns={4}
        className="mt-3 gap-3"
        cardClassName="shadow-sm"
        items={[
          {
            key: 'total-menus',
            title: t('totalMenus'),
            value: String(menuStats?.total ?? 0),
            icon: Menu,
            layout: 'compact',
            accentClassName: 'from-blue-500/20 via-sky-500/10 to-transparent',
            iconContainerClassName: 'bg-blue-50 text-blue-600',
          },
          {
            key: 'root-menus',
            title: t('rootMenuLabel'),
            value: String(rootMenusCount),
            icon: House,
            layout: 'compact',
            accentClassName:
              'from-emerald-500/20 via-green-500/10 to-transparent',
            iconContainerClassName: 'bg-emerald-50 text-emerald-600',
          },
          {
            key: 'submenus',
            title: t('totalSubmenus'),
            value: String(subMenuCount),
            icon: GitBranch,
            layout: 'compact',
            accentClassName:
              'from-violet-500/20 via-fuchsia-500/10 to-transparent',
            iconContainerClassName: 'bg-violet-50 text-violet-600',
          },
          {
            key: 'search-or-children',
            title: highlightKpiTitle,
            value: highlightKpiValue,
            icon: PanelLeftOpen,
            layout: 'compact',
            accentClassName:
              'from-amber-500/20 via-yellow-500/10 to-transparent',
            iconContainerClassName: 'bg-amber-50 text-amber-700',
          },
        ]}
      />

      <div className="mt-3 flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={() => {
            void Promise.all([refetch(), refetchAllMenus()]);
          }}
          placeholder={t('searchPlaceholder')}
          className="mt-0 flex-1"
        />

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Button
            variant="outline"
            className="cursor-pointer lg:hidden"
            onClick={() => setIsTreeOpen(true)}
          >
            <PanelLeftOpen className="mr-1 h-4 w-4" />
            {t('openTreeOnMobile')}
          </Button>

          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              void refreshWorkspace(editingMenu?.id ?? null);
            }}
          >
            <RefreshCcw className="mr-1 h-4 w-4" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      <div className="mt-3 hidden lg:block">
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-145 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
        >
          <ResizablePanel defaultSize={38} minSize={28} className="p-3">
            <MenuTreeWorkspace
              menus={(allMenus ?? []) as TreeNode[]}
              searchQuery={searchQuery}
              selectedId={editingMenu?.id ?? null}
              onSelect={async (menuId) => {
                await handleEdit({ id: menuId });
              }}
              onSaved={async () => {
                await refreshWorkspace(editingMenu?.id ?? null);
              }}
              onAddSubmenu={(menuId) => openCreateMenu(menuId)}
              onDuplicate={handleDuplicateMenu}
              onDelete={requestDeleteMenu}
              onMoveToRoot={handleMoveToRoot}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize={62}
            minSize={36}
            className="bg-muted/10 p-3"
          >
            {detailPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="mt-3 space-y-3 lg:hidden">{detailPanel}</div>

      <div className="pt-4 lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{t('menus')}</h3>
            <p className="text-xs text-muted-foreground">{t('description')}</p>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 py-1">
            {menusResponse?.total ?? 0}
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={`skeleton-${index}`}
                className="animate-pulse rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
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
        ) : !menusResponse?.data || menusResponse.data.length === 0 ? (
          <EmptyState
            icon={<Menu className="h-12 w-12" />}
            title={t('noMenusFound')}
            description={t('description')}
            actionLabel={t('buttonAddMenu')}
            onAction={() => openCreateMenu()}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {menusResponse.data.map((menu: MenuItem) => {
              const visual = getMenuVisual(menu);
              const CardIcon = visual.Icon;
              const roleCount = getMenuRoleCount(menu);

              return (
                <Card
                  key={menu.id}
                  onClick={() => {
                    void handleEdit(menu);
                  }}
                  className={cn(
                    'cursor-pointer rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary hover:shadow-md active:scale-[0.99]',
                    editingMenu?.id === menu.id
                      ? 'border-primary bg-linear-to-r from-primary/5 to-background shadow-md'
                      : ''
                  )}
                >
                  <CardHeader className="flex items-start justify-between gap-4 p-0">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
                          visual.iconWrapperClassName
                        )}
                      >
                        <CardIcon
                          className={cn('h-6 w-6', visual.iconClassName)}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-sm font-semibold">
                          {getMenuDisplayName(menu)}
                        </CardTitle>
                        <CardDescription className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Link className="h-3 w-3" />
                          <span className="truncate">{menu.url || '/'}</span>
                        </CardDescription>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <TooltipBadge
                            tooltip={menu.slug}
                            variant="secondary"
                            className="px-1.5 py-0 text-xs"
                          >
                            {menu.slug}
                          </TooltipBadge>
                          {menu.order != null ? (
                            <TooltipBadge
                              tooltip={`${t('editOrderLabel')}: #${menu.order}`}
                              variant="outline"
                              className="px-1.5 py-0 text-xs"
                            >
                              #{menu.order}
                            </TooltipBadge>
                          ) : null}
                          {menu.menu_id != null ? (
                            <TooltipBadge
                              tooltip={t('subMenu')}
                              variant="outline"
                              className="px-1.5 py-0 text-xs"
                            >
                              {t('subMenu')}
                            </TooltipBadge>
                          ) : (
                            <TooltipBadge
                              tooltip={t('rootMenuLabel')}
                              variant="outline"
                              className="px-1.5 py-0 text-xs"
                            >
                              {t('rootMenuLabel')}
                            </TooltipBadge>
                          )}
                          <TooltipBadge
                            tooltip={`${t('tabRoles')}: ${roleCount}`}
                            variant="outline"
                            className={cn(
                              'px-1.5 py-0 text-xs',
                              roleCount > 0
                                ? 'border-primary/30 bg-primary/5 text-primary'
                                : 'text-muted-foreground'
                            )}
                          >
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            {roleCount}
                          </TooltipBadge>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleEdit(menu);
                      }}
                    >
                      {t('buttonEditMenu')}
                    </Button>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 w-full border-t pt-2 lg:hidden">
        <PaginationFooter
          currentPage={page}
          pageSize={pageSize}
          totalItems={menusResponse?.total || 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          pageSizeOptions={pageSizeOptions}
        />
      </div>

      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ResizableSheetContent
          sheetId="core-menu-form-sheet"
          defaultWidth={560}
          minWidth={420}
          maxWidth={920}
          className="w-full gap-0 overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>{t('dialogAddMenuTitle')}</SheetTitle>
            <SheetDescription>{t('dialogAddMenuDescription')}</SheetDescription>
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
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('formUrlLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('formUrlPlaceholder')} {...field} />
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formIconLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('formIconPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formOrderLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder={t('formOrderPlaceholder')}
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="menu_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('formParentMenuLabel')}</FormLabel>
                    <Select
                      value={field.value ?? NO_PARENT}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t('formParentMenuPlaceholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value={NO_PARENT}>
                          {t('formParentMenuNone')}
                        </SelectItem>
                        {(allMenus ?? []).map((menu) => (
                          <SelectItem key={menu.id} value={String(menu.id)}>
                            {getMenuDisplayName(menu)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {formError ? (
                <Alert
                  variant="destructive"
                  className="rounded-md border-red-300 bg-red-50 p-4"
                >
                  <AlertTitle className="text-sm">
                    {t('verifyYourInput')}
                  </AlertTitle>
                  <AlertDescription className="text-sm">
                    {formError}
                  </AlertDescription>
                </Alert>
              ) : null}

              {createDraftStatusContent ? (
                <p className="text-xs text-muted-foreground">
                  {createDraftStatusContent}
                </p>
              ) : null}

              <Button type="submit" className="w-full cursor-pointer">
                <Plus className="mr-1 h-4 w-4" />
                {t('buttonAddMenu')}
              </Button>
            </form>
          </Form>
        </ResizableSheetContent>
      </Sheet>

      <AlertDialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogDeleteMenuTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogDeleteMenuDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteMenuCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>
              {t('deleteMenuConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Drawer open={isTreeOpen} onOpenChange={setIsTreeOpen} direction="left">
        <DrawerContent className="max-w-full sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>{t('treeWorkspaceTitle')}</DrawerTitle>
            <DrawerDescription>
              {t('treeWorkspaceDescription')}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4">
            <MenuTreeWorkspace
              menus={(allMenus ?? []) as TreeNode[]}
              searchQuery={searchQuery}
              selectedId={editingMenu?.id ?? null}
              onSelect={async (menuId) => {
                await handleEdit({ id: menuId });
                setIsTreeOpen(false);
              }}
              onSaved={async () => {
                await refreshWorkspace(editingMenu?.id ?? null);
              }}
              onAddSubmenu={(menuId) => {
                setIsTreeOpen(false);
                openCreateMenu(menuId);
              }}
              onDuplicate={handleDuplicateMenu}
              onDelete={requestDeleteMenu}
              onMoveToRoot={handleMoveToRoot}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </Page>
  );
}
