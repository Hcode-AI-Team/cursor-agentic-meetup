'use client';

import { Badge } from '@/components/ui/badge';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { Globe, Loader2, Lock, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';

type MenuRole = { name: string; slug: string };

type UserMenu = {
  id: number;
  menuId: number | null;
  name: string;
  url?: string;
  icon?: string;
  order?: number;
  roles?: MenuRole[];
};

type MenuNode = UserMenu & { children: MenuNode[] };

type UserRoute = {
  id: number;
  url: string;
  method: string;
  roles?: MenuRole[];
};

type UserAccessSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName?: string;
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-50 text-green-700 border-green-200',
  POST: 'bg-blue-50 text-blue-700 border-blue-200',
  PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
  PUT: 'bg-orange-50 text-orange-700 border-orange-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
};

function buildTree(flat: UserMenu[]): MenuNode[] {
  const map = new Map<number, MenuNode>();
  flat.forEach((m) => map.set(m.id, { ...m, children: [] }));

  const roots: MenuNode[] = [];
  map.forEach((node) => {
    if (node.menuId != null && map.has(node.menuId)) {
      map.get(node.menuId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: MenuNode[]) => {
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

function MenuIcon({ name, className }: { name?: string; className?: string }) {
  if (name) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { [name]: DynamicIcon } = require('lucide-react');
      if (DynamicIcon) return <DynamicIcon className={className} />;
    } catch {
      // fallback below
    }
  }
  return <Menu className={className} />;
}

function MenuTreeNode({ node, depth }: { node: MenuNode; depth: number }) {
  const isLeaf = node.children.length === 0;
  const indent = depth * 16;

  return (
    <>
      <div
        className="flex items-center gap-2 rounded py-1 px-1 hover:bg-muted/50 transition-colors group"
        style={{ paddingLeft: `${indent + 4}px` }}
      >
        {/* tree line connector */}
        {depth > 0 && (
          <span className="shrink-0 w-3 h-px bg-border" aria-hidden />
        )}

        <span
          className={`shrink-0 flex items-center justify-center rounded p-1 ${
            isLeaf ? 'bg-muted/60' : 'bg-primary/10'
          }`}
        >
          <MenuIcon
            name={node.icon}
            className={`h-3.5 w-3.5 ${isLeaf ? 'text-muted-foreground' : 'text-primary'}`}
          />
        </span>

        <div className="flex-1 min-w-0">
          <span className="text-sm leading-tight truncate block">
            {node.name}
          </span>
          {node.url && (
            <span className="text-xs text-muted-foreground truncate block font-mono">
              {node.url}
            </span>
          )}
          {node.roles && node.roles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {node.roles.map((role) => (
                <span
                  key={role.slug}
                  className="inline-block rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground leading-4"
                  title={role.slug}
                >
                  {role.name || role.slug}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {node.children.map((child) => (
        <MenuTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function UserAccessSheet({
  open,
  onOpenChange,
  userId,
  userName,
}: UserAccessSheetProps) {
  const t = useTranslations('core.UserPage');
  const { request, currentLocaleCode } = useApp();

  const { data: menus = [], isLoading: loadingMenus } = useQuery<UserMenu[]>({
    queryKey: ['user-menus', userId, currentLocaleCode],
    queryFn: async () => {
      const res = await request<UserMenu[]>({
        url: `/user/${userId}/menu`,
        method: 'GET',
      });
      return res.data || [];
    },
    enabled: open && !!userId,
  });

  const { data: routes = [], isLoading: loadingRoutes } = useQuery<UserRoute[]>(
    {
      queryKey: ['user-routes', userId],
      queryFn: async () => {
        const res = await request<UserRoute[]>({
          url: `/user/${userId}/route`,
          method: 'GET',
        });
        return res.data || [];
      },
      enabled: open && !!userId,
    }
  );

  const menuTree = buildTree(menus);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent
        sheetId="core-users-access-sheet"
        defaultWidth={640}
        minWidth={460}
        maxWidth={980}
        className="w-full sm:max-w-xl overflow-y-auto gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {t('accessViewTitle')}
          </SheetTitle>
          <SheetDescription>
            {userName
              ? t('accessViewDescriptionUser', { name: userName })
              : t('accessViewDescription')}
          </SheetDescription>
        </SheetHeader>

        <div className="w-full border-t" />

        <Tabs defaultValue="menu" className="px-6 pt-4">
          <div className="sticky top-0 z-20 -mx-6 bg-background/95 px-6 backdrop-blur supports-backdrop-filter:bg-background/80">
            <TabsList className="mb-4 w-full">
              <TabsTrigger
                value="menu"
                className="flex-1 flex items-center gap-2"
              >
                <Menu className="h-4 w-4" />
                {t('accessTabMenu')}
                {!loadingMenus && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {menus.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="routes"
                className="flex-1 flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                {t('accessTabRoutes')}
                {!loadingRoutes && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {routes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="menu" className="mt-0">
            {loadingMenus ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('loading')}
                </span>
              </div>
            ) : menuTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Menu className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t('accessNoMenus')}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-card px-2 py-2">
                {menuTree.map((node) => (
                  <MenuTreeNode key={node.id} node={node} depth={0} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="routes" className="space-y-2 mt-0">
            {loadingRoutes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('loading')}
                </span>
              </div>
            ) : routes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t('accessNoRoutes')}
                </p>
              </div>
            ) : (
              routes.map((route) => (
                <div
                  key={route.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-4 py-2.5 hover:border-primary/40 transition-colors"
                >
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 text-xs font-mono font-semibold ${
                      METHOD_COLORS[route.method] ??
                      'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {route.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate">{route.url}</p>
                    {route.roles && route.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {route.roles.map((role) => (
                          <span
                            key={role.slug}
                            className="inline-block rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground leading-4"
                            title={role.slug}
                          >
                            {role.name || role.slug}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </ResizableSheetContent>
    </Sheet>
  );
}
