'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { IconCamera, IconScreenshot } from '@tabler/icons-react';
import { toBlob } from 'html-to-image';
import { useTranslations } from 'next-intl';
import {
  type ComponentType,
  type MouseEvent,
  useEffect,
  useState,
} from 'react';
import { toast } from 'sonner';
import { DynamicWidget } from '../components';
import { WidgetLayout, WidgetRendererProps } from './types';

const getWidgetBaseSlug = (slug: string): string => {
  const parts = slug.split('.');
  return parts[parts.length - 1] || slug;
};

const getWidgetLibrarySlug = (
  slug: string,
  librarySlug?: string
): string | undefined => {
  if (librarySlug) {
    return librarySlug;
  }

  const parts = slug.split('.');
  return parts.length > 1 ? parts[0] : 'core';
};

const getWidgetImportCandidates = (
  slug: string,
  librarySlug?: string
): string[] => {
  const baseSlug = getWidgetBaseSlug(slug);
  const effectiveLibrarySlug = getWidgetLibrarySlug(slug, librarySlug);
  const libraryPrefixedSlug = effectiveLibrarySlug
    ? `${effectiveLibrarySlug}.${baseSlug}`
    : null;

  return Array.from(
    new Set(
      [libraryPrefixedSlug, slug, baseSlug].filter(
        (candidate): candidate is string => Boolean(candidate)
      )
    )
  );
};

const importWidgetComponent = (candidate: string) =>
  import(`@/components/widgets/${candidate}`);

type LoadedWidgetComponent = ComponentType<{
  widget: WidgetLayout;
  onRemove: () => void;
}>;

export const WidgetRenderer = ({
  widget,
  onRemove,
  onCapture,
}: WidgetRendererProps) => {
  const t = useTranslations('core.WidgetRenderer');
  const [Component, setComponent] = useState<LoadedWidgetComponent | null>(
    null
  );
  const [useFallback, setUseFallback] = useState(false);
  const [isScreenshotDialogOpen, setIsScreenshotDialogOpen] = useState(false);
  const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false);
  const [isSharingScreenshot, setIsSharingScreenshot] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;

    setComponent(null);
    setUseFallback(false);

    const loadWidgetComponent = async () => {
      const candidates = getWidgetImportCandidates(
        widget.slug,
        widget.library_slug
      );

      for (const candidate of candidates) {
        try {
          const mod = await importWidgetComponent(candidate);
          if (!cancelled) {
            setComponent(() => mod.default);
          }
          return;
        } catch {
          // Try next candidate.
        }
      }

      if (!cancelled) {
        console.warn(`Widget component not found for slug: ${widget.slug}`, {
          candidates,
        });
        setUseFallback(true);
      }
    };

    void loadWidgetComponent();

    return () => {
      cancelled = true;
    };
  }, [widget.slug, widget.library_slug]);

  useEffect(() => {
    return () => {
      if (screenshotUrl) {
        URL.revokeObjectURL(screenshotUrl);
      }
    };
  }, [screenshotUrl]);

  const getScreenshotFileName = () => {
    const baseSlug = getWidgetBaseSlug(widget.slug)
      .replace(/[^a-z0-9-_]+/gi, '-')
      .toLowerCase();

    return `dashboard-widget-${baseSlug}-${Date.now()}.png`;
  };

  const generateScreenshotBlob = async () => {
    const widgetElement = document.querySelector(
      `[data-widget-instance-id="${widget.i}"]`
    ) as HTMLElement | null;

    if (!widgetElement) {
      throw new Error('Widget element not found for screenshot');
    }

    const screenshot = await toBlob(widgetElement, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      filter: (node) =>
        !(node instanceof HTMLElement && node.dataset.widgetAction === 'true'),
    });

    if (!screenshot) {
      throw new Error('Failed to generate screenshot blob');
    }

    return screenshot;
  };

  const handleOpenScreenshotDialog = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    event.preventDefault();

    setIsGeneratingScreenshot(true);

    try {
      const screenshot = await generateScreenshotBlob();
      const nextScreenshotUrl = URL.createObjectURL(screenshot);

      setScreenshotBlob(screenshot);
      setScreenshotUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }

        return nextScreenshotUrl;
      });
      setIsScreenshotDialogOpen(true);
    } catch (error) {
      console.error('Erro ao gerar print do widget:', error);
      toast.error(t('generateScreenshotError'));
    } finally {
      setIsGeneratingScreenshot(false);
    }
  };

  const handleDownloadScreenshot = () => {
    if (!screenshotBlob) {
      toast.error(t('generateAgainToDownload'));
      return;
    }

    const downloadUrl = URL.createObjectURL(screenshotBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = getScreenshotFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleShareScreenshot = async () => {
    if (!screenshotBlob) {
      toast.error(t('generateAgainToShare'));
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      typeof navigator.share !== 'function' ||
      typeof File === 'undefined'
    ) {
      toast.error(t('shareNotSupported'));
      return;
    }

    setIsSharingScreenshot(true);

    try {
      const file = new File([screenshotBlob], getScreenshotFileName(), {
        type: screenshotBlob.type || 'image/png',
      });

      if (
        typeof navigator.canShare === 'function' &&
        !navigator.canShare({ files: [file] })
      ) {
        throw new Error('Browser does not support sharing this file');
      }

      await navigator.share({
        title: widget.name,
        text: t('shareText', { name: widget.name }),
        files: [file],
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error('Erro ao compartilhar print do widget:', error);
      toast.error(t('shareImageError'));
    } finally {
      setIsSharingScreenshot(false);
    }
  };

  const actionButtons = (
    <>
      {onCapture ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="no-drag absolute right-17 top-3 z-30 size-6 cursor-pointer shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          title={t('saveWidgetPreview')}
          aria-label={t('saveWidgetPreview')}
          data-widget-action="true"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onCapture();
          }}
        >
          <IconCamera className="size-3" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="no-drag absolute right-10 top-3 z-30 size-6 cursor-pointer shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        title={
          isGeneratingScreenshot
            ? t('generatingWidgetScreenshot')
            : t('generateWidgetScreenshot')
        }
        aria-label={
          isGeneratingScreenshot
            ? t('generatingWidgetScreenshot')
            : t('generateWidgetScreenshot')
        }
        data-widget-action="true"
        onClick={(event) => {
          void handleOpenScreenshotDialog(event);
        }}
        disabled={isGeneratingScreenshot}
      >
        <IconScreenshot className="size-3" />
      </Button>
    </>
  );

  if (!Component && !useFallback) {
    return (
      <div className="h-full w-full" data-widget-instance-id={widget.i}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <>
      <div
        className="group relative h-full w-full"
        data-widget-instance-id={widget.i}
      >
        {actionButtons}
        {useFallback ? (
          <DynamicWidget
            title={widget.name}
            value={0}
            description={widget.description || ''}
            iconName="settings"
            color="#000000"
            draggable
            onRemove={onRemove}
          />
        ) : Component ? (
          <Component widget={widget} onRemove={onRemove} />
        ) : null}
      </div>

      <Dialog
        open={isScreenshotDialogOpen}
        onOpenChange={setIsScreenshotDialogOpen}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('screenshotTitle')}</DialogTitle>
            <DialogDescription>{t('screenshotDescription')}</DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-lg border bg-muted/30">
            {screenshotUrl ? (
              <img
                src={screenshotUrl}
                alt={t('screenshotAlt', { name: widget.name })}
                className="max-h-[70vh] w-full object-contain"
              />
            ) : (
              <div className="flex h-60 items-center justify-center p-4">
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <p className="text-muted-foreground text-xs">{widget.name}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handleShareScreenshot();
                }}
                disabled={!screenshotBlob || isSharingScreenshot}
              >
                {isSharingScreenshot ? t('sharing') : t('share')}
              </Button>
              <Button
                type="button"
                onClick={handleDownloadScreenshot}
                disabled={!screenshotBlob}
              >
                {t('downloadImage')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
