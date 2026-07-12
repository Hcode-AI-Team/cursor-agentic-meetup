'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as TablerIcons from '@tabler/icons-react';
import { IconGripVertical, IconX } from '@tabler/icons-react';
import { ComponentType } from 'react';

interface DynamicWidgetProps {
  title: string;
  value: string | number;
  description?: string;
  iconName?: string;
  color?: string;
  draggable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function DynamicWidget({
  title,
  value,
  description,
  iconName,
  color,
  draggable = false,
  onRemove,
  className,
}: DynamicWidgetProps) {
  // Dynamically get icon from Tabler Icons
  const Icon: ComponentType<{ className?: string }> | null = iconName
    ? (TablerIcons as any)[iconName] || null
    : null;

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader
        className={cn(
          'flex flex-row items-center justify-between space-y-0 pb-2',
          draggable && 'drag-handle'
        )}
        style={draggable ? { cursor: 'grab', userSelect: 'none' } : undefined}
        onMouseDown={(e) =>
          draggable && (e.currentTarget.style.cursor = 'grabbing')
        }
        onMouseUp={(e) => draggable && (e.currentTarget.style.cursor = 'grab')}
      >
        <div className="flex items-center gap-2">
          {draggable && (
            <IconGripVertical className="text-muted-foreground size-4 shrink-0" />
          )}
          <CardTitle className="text-md font-medium">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {onRemove && (
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
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-muted-foreground text-xs mt-1">{description}</p>
        )}
        {Icon && (
          <Icon
            className={cn(
              'size-6 absolute bottom-4 right-4 shrink-0',
              color ? `text-${color}` : 'text-muted-foreground'
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
