'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { IconGripVertical, IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface WidgetWrapperProps {
  isLoading: boolean;
  isAccessDenied: boolean;
  isError: boolean;
  widgetName: string;
  onRemove?: () => void;
  children: React.ReactNode;
}

export function WidgetWrapper({
  isLoading,
  isAccessDenied,
  isError,
  widgetName,
  onRemove,
  children,
}: WidgetWrapperProps) {
  const t = useTranslations('core.DashboardPage');

  if (isLoading) {
    return (
      <div className="relative h-full w-full">
        {onRemove && (
          <div className="absolute top-3 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 no-drag"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove();
              }}
            >
              <IconX className="size-3" />
            </Button>
          </div>
        )}
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="group relative flex h-full w-full flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center">
        <div
          className="drag-handle absolute left-4 top-3 z-10"
          style={{ cursor: 'grab' }}
        >
          <IconGripVertical className="size-4 shrink-0 text-muted-foreground/50" />
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="no-drag absolute right-4 top-3 z-10 size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove();
            }}
          >
            <IconX className="size-3" />
          </Button>
        )}
        <div className="mb-2 text-4xl text-destructive">🔒</div>
        <h3 className="mb-2 text-sm font-semibold text-destructive">
          {widgetName}
        </h3>
        <p className="mb-1 text-xs font-medium text-destructive">
          {t('accessDenied')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('widgetDataUnavailable')}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="group relative flex h-full w-full flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center">
        <div
          className="drag-handle absolute left-4 top-3 z-10"
          style={{ cursor: 'grab' }}
        >
          <IconGripVertical className="size-4 shrink-0 text-muted-foreground/50" />
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="no-drag absolute right-4 top-3 z-10 size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove();
            }}
          >
            <IconX className="size-3" />
          </Button>
        )}
        <div className="mb-2 text-4xl text-destructive">⚠️</div>
        <h3 className="mb-2 text-sm font-semibold text-destructive">
          {widgetName}
        </h3>
        <p className="mb-1 text-xs font-medium text-destructive">
          {t('renderError')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('widgetRenderError')}
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-widget group relative h-full w-full">
      <div
        className="drag-handle absolute left-3 top-3 z-20"
        style={{ cursor: 'grab' }}
      >
        <IconGripVertical className="size-4 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="no-drag absolute right-3 top-3 z-20 size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove();
          }}
        >
          <IconX className="size-3" />
        </Button>
      )}
      {children}
    </div>
  );
}
