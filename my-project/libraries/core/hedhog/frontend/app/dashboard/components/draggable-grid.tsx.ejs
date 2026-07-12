'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import GridLayout, { Layout as RGLLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  static?: boolean;
}

export type Layout = LayoutItem[];

interface DraggableGridProps {
  layout: Layout;
  onLayoutChange: (layout: Layout) => void;
  children: ReactNode;
  className?: string;
  cols?: number;
  rowHeight?: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  margin?: [number, number];
  containerPadding?: [number, number];
  resizeHandles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>;
}

const MOBILE_WIDTH = 640;
const TABLET_WIDTH = 1024;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const deriveResponsiveLayout = (
  layout: Layout,
  effectiveCols: number,
  cols: number
): Layout => {
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  const ratio = effectiveCols / cols;

  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  return sorted.map((item) => {
    const nextW =
      effectiveCols === 1
        ? 1
        : clamp(Math.round(item.w * ratio), 1, effectiveCols);
    const nextH = Math.max(1, item.h || 1);

    if (cursorX + nextW > effectiveCols) {
      cursorY += Math.max(1, rowHeight);
      cursorX = 0;
      rowHeight = 0;
    }

    const mappedItem: LayoutItem = {
      ...item,
      x: cursorX,
      y: cursorY,
      w: nextW,
      h: nextH,
      minW: clamp(Math.min(item.minW || 1, nextW), 1, nextW),
      maxW: clamp(item.maxW || effectiveCols, nextW, effectiveCols),
    };

    cursorX += nextW;
    rowHeight = Math.max(rowHeight, nextH);

    return mappedItem;
  });
};

const scaleToColumnCount = (
  value: number,
  sourceCols: number,
  targetCols: number
) => {
  if (sourceCols === targetCols) {
    return value;
  }

  return Math.round((value * targetCols) / sourceCols);
};

const mapLayoutToBaseColumns = (
  nextLayout: RGLLayout,
  sourceCols: number,
  targetCols: number,
  previousLayout: Layout
): Layout => {
  const previousItems = new Map(previousLayout.map((item) => [item.i, item]));

  return nextLayout.map((item) => {
    const previousItem = previousItems.get(item.i);
    const nextW =
      sourceCols === 1
        ? (previousItem?.w ?? 1)
        : clamp(
            scaleToColumnCount(item.w, sourceCols, targetCols),
            1,
            targetCols
          );
    const nextX =
      sourceCols === 1
        ? clamp(previousItem?.x ?? 0, 0, Math.max(0, targetCols - nextW))
        : clamp(
            scaleToColumnCount(item.x, sourceCols, targetCols),
            0,
            Math.max(0, targetCols - nextW)
          );

    return {
      i: item.i,
      x: nextX,
      y: item.y,
      w: nextW,
      h: item.h,
      minW: previousItem?.minW ?? item.minW,
      maxW: previousItem?.maxW ?? item.maxW,
      minH: previousItem?.minH ?? item.minH,
      maxH: previousItem?.maxH ?? item.maxH,
      static: previousItem?.static ?? item.static,
    } satisfies LayoutItem;
  });
};

// Simple compaction function for grid layout
const compactLayout = (
  layout: RGLLayout,
  cols: number,
  compactType: 'vertical' | 'horizontal' | null
): RGLLayout => {
  if (!Array.isArray(layout)) return layout;

  const sorted = [...layout].sort((a, b) => {
    if (compactType === 'vertical') {
      return a.y - b.y || a.x - b.x;
    }
    return a.x - b.x || a.y - b.y;
  });

  return sorted as RGLLayout;
};

export function DraggableGrid({
  layout,
  onLayoutChange,
  children,
  className = '',
  cols = 12,
  rowHeight = 100,
  isDraggable = true,
  isResizable = true,
  compactType = 'vertical',
  preventCollision = true,
  margin = [16, 16],
  containerPadding = [0, 0],
  resizeHandles = ['se'],
}: DraggableGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  const effectiveCols =
    containerWidth < MOBILE_WIDTH
      ? 1
      : containerWidth < TABLET_WIDTH
        ? Math.min(6, cols)
        : cols;

  const effectiveRowHeight =
    containerWidth < MOBILE_WIDTH ? Math.max(76, rowHeight - 4) : rowHeight;

  const effectiveMargin: [number, number] =
    containerWidth < MOBILE_WIDTH
      ? [Math.min(10, margin[0]), Math.min(10, margin[1])]
      : margin;

  const responsiveLayout = (() => {
    if (effectiveCols === cols) {
      return layout;
    }

    return deriveResponsiveLayout(layout, effectiveCols, cols);
  })();

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const emitUserLayoutChange = (newLayout: RGLLayout) => {
    const layouts = Array.isArray(newLayout) ? newLayout : [newLayout];
    const convertedLayout = mapLayoutToBaseColumns(
      layouts,
      effectiveCols,
      cols,
      layout
    );

    onLayoutChange(convertedLayout);
  };

  return (
    <div ref={containerRef} className="w-full">
      <GridLayout
        className={`layout ${className}`}
        layout={responsiveLayout}
        gridConfig={{
          cols: effectiveCols,
          rowHeight: effectiveRowHeight,
          containerPadding,
          margin: effectiveMargin,
        }}
        dragConfig={{
          enabled: isDraggable,
          handle: '.drag-handle',
          cancel: 'button,.no-drag',
        }}
        width={containerWidth}
        resizeConfig={{
          enabled: isResizable,
          handles: resizeHandles,
        }}
        compactor={{
          type: compactType,
          allowOverlap: !preventCollision,
          compact: (layout, cols) => compactLayout(layout, cols, compactType),
        }}
        onDragStop={(nextLayout) => emitUserLayoutChange(nextLayout)}
        onResizeStop={(nextLayout) => emitUserLayoutChange(nextLayout)}
      >
        {children}
      </GridLayout>
    </div>
  );
}

interface DraggableGridItemProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function DraggableGridItem({
  id,
  children,
  className = '',
}: DraggableGridItemProps) {
  return (
    <div key={id} className={className} style={{ position: 'relative' }}>
      {children}
    </div>
  );
}
