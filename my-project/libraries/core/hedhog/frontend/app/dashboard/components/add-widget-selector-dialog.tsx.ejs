'use client';

import { PaginationFooter } from '@/components/entity-list/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { IconLayoutDashboard, IconPlus } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

interface DashboardComponent {
  id: number;
  slug: string;
  library_slug?: string;
  path: string;
  min_width: number;
  max_width?: number;
  min_height: number;
  max_height?: number;
  width: number;
  height: number;
  is_resizable: boolean;
  dashboard_component_locale?: Array<{
    name: string;
    locale: {
      code: string;
    };
  }>;
}

interface AddWidgetSelectorDialogProps {
  availableComponents: DashboardComponent[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  searchQuery: string;
  moduleFilter: string;
  modules: string[];
  onSearchQueryChange: (value: string) => void;
  onModuleFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onAdd: (slugs: string[]) => Promise<void> | void;
  buttonLabel?: string;
  buttonVariant?: 'default' | 'outline';
  hideTrigger?: boolean;
  openSignal?: number;
  onOpenSignalHandled?: () => void;
}

const getWidgetLookupKey = (slug: string, librarySlug?: string): string => {
  const parts = slug.split('.');
  const baseSlug = parts[parts.length - 1] || slug;

  if (librarySlug) {
    return `${librarySlug}.${baseSlug}`;
  }

  return slug;
};

const getWidgetPreviewSlug = (slug: string): string => {
  const parts = slug.split('.');
  return parts[parts.length - 1] || slug;
};

const formatModuleLabel = (moduleSlug?: string): string => {
  const normalized = (moduleSlug || 'core').replace(/[._-]+/g, ' ').trim();

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

function WidgetPreview({
  name,
  slug,
  width,
  height,
  isResizable,
  resizableLabel,
  fixedLabel,
}: {
  name: string;
  slug: string;
  width: number;
  height: number;
  isResizable: boolean;
  resizableLabel: string;
  fixedLabel: string;
}) {
  const previewSlug = getWidgetPreviewSlug(slug);
  const previewUrl = `/libraries/core/dashboard-previews/${previewSlug}.png`;

  return (
    <div className="overflow-hidden rounded-lg border bg-background/80 p-2">
      <div className="flex items-center gap-2">
        <img
          src={previewUrl}
          alt={name}
          className="h-16 w-24 shrink-0 rounded-md border object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {width}x{height}
            </Badge>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {isResizable ? resizableLabel : fixedLabel}
            </Badge>
          </div>
          <p className="truncate text-[10px] text-muted-foreground">{name}</p>
        </div>
      </div>
    </div>
  );
}

export function AddWidgetSelectorDialog({
  availableComponents,
  totalItems,
  currentPage,
  pageSize,
  isLoading,
  searchQuery,
  moduleFilter,
  modules,
  onSearchQueryChange,
  onModuleFilterChange,
  onPageChange,
  onPageSizeChange,
  onAdd,
  buttonLabel,
  buttonVariant = 'outline',
  hideTrigger = false,
  openSignal,
  onOpenSignalHandled,
}: AddWidgetSelectorDialogProps) {
  const tWidget = useTranslations('core.AddWidgetDialog');
  const tMenu = useTranslations('core.DashboardMenu');

  const [openWidgets, setOpenWidgets] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(
    new Set()
  );
  const [isAdding, setIsAdding] = useState(false);
  const lastHandledOpenSignalRef = useRef<number | null>(null);

  const availableModuleOptions = Array.from(new Set(modules.filter(Boolean)));

  useEffect(() => {
    if (!openSignal) {
      lastHandledOpenSignalRef.current = 0;
      return;
    }

    if (openSignal !== lastHandledOpenSignalRef.current) {
      lastHandledOpenSignalRef.current = openSignal;
      setOpenWidgets(true);
      onOpenSignalHandled?.();
    }
  }, [onOpenSignalHandled, openSignal]);

  const toggleSelectedWidget = (slug: string) => {
    setSelectedWidgets((prev) => {
      const next = new Set(prev);

      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }

      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedWidgets.size === 0 || isAdding) return;

    setIsAdding(true);
    try {
      await onAdd(Array.from(selectedWidgets));
      setSelectedWidgets(new Set());
      setOpenWidgets(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      {!hideTrigger ? (
        <Button
          size="sm"
          variant={buttonVariant}
          className="cursor-pointer gap-2"
          onClick={() => setOpenWidgets(true)}
        >
          <IconPlus className="size-4" />
          {buttonLabel || tMenu('addWidgets')}
        </Button>
      ) : null}

      <Sheet
        open={openWidgets}
        onOpenChange={(open) => {
          setOpenWidgets(open);
          if (!open) {
            setSelectedWidgets(new Set());
          }
        }}
      >
        <ResizableSheetContent sheetId="dashboard-add-widget" defaultWidth={896} className="p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-5 text-left">
              <SheetTitle>{tWidget('title')}</SheetTitle>
              <SheetDescription>
                {tWidget('selectedOfTotal', {
                  selected: selectedWidgets.size,
                  total: totalItems,
                })}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-3 border-b px-4 py-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <label
                  htmlFor="dashboard-widget-search"
                  className="text-sm font-medium"
                >
                  {tWidget('search')}
                </label>
                <Input
                  id="dashboard-widget-search"
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder={tWidget('searchPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="dashboard-widget-module-filter"
                  className="text-sm font-medium"
                >
                  {tWidget('moduleFilterLabel')}
                </label>
                <Select
                  value={moduleFilter}
                  onValueChange={onModuleFilterChange}
                >
                  <SelectTrigger
                    id="dashboard-widget-module-filter"
                    className="w-full"
                  >
                    <SelectValue placeholder={tWidget('allModules')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tWidget('allModules')}</SelectItem>
                    {availableModuleOptions.map((module) => (
                      <SelectItem key={module} value={module}>
                        {formatModuleLabel(module)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 p-4">
              <ScrollArea className="min-h-0 pr-4">
                {isLoading ? (
                  <div className="grid gap-2.5">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    {availableComponents.length === 0 ? (
                      <div className="flex min-h-55 flex-col items-center justify-center rounded-xl border border-dashed text-center">
                        <p className="text-sm text-muted-foreground">
                          {tWidget('noComponentsAvailable')}
                        </p>
                      </div>
                    ) : (
                      availableComponents.map((component) => {
                        const name =
                          component.dashboard_component_locale?.[0]?.name ||
                          component.slug;
                        const selectionKey = getWidgetLookupKey(
                          component.slug,
                          component.library_slug
                        );
                        const isSelected = selectedWidgets.has(selectionKey);
                        const moduleLabel = formatModuleLabel(
                          component.library_slug
                        );

                        return (
                          <Card
                            key={selectionKey}
                            role="checkbox"
                            tabIndex={0}
                            aria-checked={isSelected}
                            className={cn(
                              'cursor-pointer border px-3 py-2.5 transition-all hover:border-primary/40 hover:bg-accent/30',
                              isSelected &&
                                'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/25'
                            )}
                            onClick={() => toggleSelectedWidget(selectionKey)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                toggleSelectedWidget(selectionKey);
                              }
                            }}
                          >
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    'flex size-9 items-center justify-center rounded-lg',
                                    isSelected
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-primary/10 text-primary'
                                  )}
                                >
                                  <IconLayoutDashboard className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <CardTitle className="truncate text-sm">
                                        {name}
                                      </CardTitle>
                                      <CardDescription className="mt-0.5 truncate text-[11px]">
                                        {selectionKey}
                                      </CardDescription>
                                    </div>
                                    <Checkbox
                                      checked={isSelected}
                                      aria-label={name}
                                      className="pointer-events-none mt-0.5"
                                    />
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className="px-1.5 py-0 text-[10px]"
                                    >
                                      {tWidget('module')}: {moduleLabel}
                                    </Badge>
                                    <Badge
                                      variant="secondary"
                                      className="px-1.5 py-0 text-[10px]"
                                    >
                                      {tWidget('dimensions')}: {component.width}
                                      x{component.height}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="px-1.5 py-0 text-[10px]"
                                    >
                                      {component.is_resizable
                                        ? tWidget('resizable')
                                        : tWidget('fixedSize')}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="lg:block">
                                <WidgetPreview
                                  name={name}
                                  slug={component.slug}
                                  width={component.width}
                                  height={component.height}
                                  isResizable={component.is_resizable}
                                  resizableLabel={tWidget('resizable')}
                                  fixedLabel={tWidget('fixedSize')}
                                />
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>

            <SheetFooter className="border-t px-6 py-4">
              <div className="flex w-full flex-col gap-4">
                <PaginationFooter
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  selectedCount={selectedWidgets.size}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="cursor-pointer"
                    onClick={handleAdd}
                    disabled={
                      selectedWidgets.size === 0 || isLoading || isAdding
                    }
                  >
                    {tWidget('add')}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </div>
        </ResizableSheetContent>
      </Sheet>
    </>
  );
}
