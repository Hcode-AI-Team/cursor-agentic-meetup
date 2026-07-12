'use client';

import { PageHeader } from '@/components/entity-list';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PaginatedResult } from '@/types/pagination-result';
import { SettingGroup } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { Check, ChevronDown, Download, MenuIcon, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

interface SettingsValidation {
  totalSettings: number;
  validSettings: number;
  invalidSlugs: string[];
  validSlugs: string[];
  fileData: any[];
}

interface IProps {
  children: React.ReactNode;
}

export default function ConfigurationsLayout({ children }: IProps) {
  const t = useTranslations('core.Configurations');
  const pathname = usePathname();
  const router = useRouter();
  const { request, currentLocaleCode, showToastHandler } = useApp();

  const { data: settingGroups, refetch } = useQuery<
    PaginatedResult<SettingGroup>
  >({
    queryKey: ['setting-groups', currentLocaleCode],
    queryFn: async () => {
      const response = await request<PaginatedResult<SettingGroup>>({
        url: '/setting/group',
      });
      return response.data;
    },
  });

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<SettingsValidation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const tabWidths = useRef<number[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);

  const groups = settingGroups?.data || [];
  const activeGroup = groups.find(
    (item) => pathname === `/core/configurations/${item.slug}`
  );

  useLayoutEffect(() => {
    const container = navContainerRef.current;
    if (!container) return;

    const OVERFLOW_BTN_WIDTH = 96;
    const GAP_WIDTH = 8;

    const calculate = () => {
      const available = container.clientWidth;

      tabRefs.current.forEach((el, idx) => {
        if (el && el.offsetWidth > 0) {
          tabWidths.current[idx] = el.offsetWidth;
        }
      });

      const total = groups.length;
      if (total === 0) return;

      let used = 0;
      let count = 0;

      for (let i = 0; i < total; i++) {
        const w = (tabWidths.current[i] ?? 100) + (count > 0 ? GAP_WIDTH : 0);
        const allFit = count + 1 === total;
        const budget = allFit
          ? available
          : available - OVERFLOW_BTN_WIDTH - GAP_WIDTH;

        if (used + w <= budget) {
          used += w;
          count++;
        } else {
          break;
        }
      }

      setVisibleCount(count);
    };

    const observer = new ResizeObserver(calculate);
    observer.observe(container);
    calculate();
    return () => observer.disconnect();
  }, [groups.length]);

  const handleExport = (includeSecrets: boolean) => {
    request<Blob>({
      url: `/setting/export?secrets=${includeSecrets}`,
      responseType: 'blob',
    })
      .then((response) => {
        const blob = new Blob([response.data], {
          type: 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'settings.hedhog';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        showToastHandler('error', t('exportFailed'));
      });
  };

  const handleImportValidate = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await request<{
        totalSettings: number;
        validSettings: number;
        invalidSlugs: string[];
        validSlugs: string[];
        fileData: any[];
      }>({
        url: '/setting/import',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportData(response.data);
      setImportDialogOpen(true);
    } catch (error) {
      showToastHandler('error', t('importValidateFailed'));
    }
  };

  const handleConfirmImport = useCallback(async () => {
    if (!importData) return;

    try {
      await request({
        url: '/setting/import/confirm',
        method: 'POST',
        data: {
          settings: importData.fileData,
        },
      });
      refetch().then(() => {
        showToastHandler('success', t('importSuccess'));
        setImportDialogOpen(false);
        setImportData(null);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      });
    } catch (error) {
      showToastHandler('error', t('importFailed'));
    }
  }, [importData, request, refetch, showToastHandler, t]);

  const activeIndex = groups.findIndex(
    (item) => pathname === `/core/configurations/${item.slug}`
  );

  const rawVisible = isFinite(visibleCount)
    ? Math.min(Math.max(0, visibleCount), groups.length)
    : groups.length;

  let visibleIdxs: number[];
  if (rawVisible >= groups.length) {
    visibleIdxs = groups.map((_, i) => i);
  } else {
    visibleIdxs = Array.from({ length: rawVisible }, (_, i) => i);
    if (activeIndex >= rawVisible && activeIndex >= 0) {
      visibleIdxs[rawVisible - 1] = activeIndex;
      visibleIdxs.sort((a, b) => a - b);
    }
  }

  const visibleSet = new Set(visibleIdxs);
  const overflowIdxs = groups
    .map((_, i) => i)
    .filter((i) => !visibleSet.has(i));
  const activeInOverflow = activeIndex >= 0 && !visibleSet.has(activeIndex);

  return (
    <div className="flex min-w-0 flex-col px-4">
      <PageHeader
        breadcrumbs={[
          { label: t('breadcrumbHome'), href: '/' },
          { label: t('breadcrumbTitle') },
        ]}
        title={t('title')}
        description={t('description')}
        extraContent={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MenuIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
                  <span className="flex items-center gap-2">
                    <Download size={16} /> {t('menuExport')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <span className="flex items-center gap-2">
                    <Upload size={16} /> {t('menuImport')}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{t('exportDialogTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('exportDialogDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={includeSecrets}
                      onCheckedChange={(checked) =>
                        setIncludeSecrets(checked === true)
                      }
                    />
                    {t('exportIncludeSecrets')}
                  </label>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t('exportCancel')}</Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      setExportDialogOpen(false);
                      handleExport(includeSecrets);
                    }}
                  >
                    {t('exportButton')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('importDialogTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('importDialogDescription')}
                  </DialogDescription>
                </DialogHeader>
                {importData && (
                  <div className="flex flex-col gap-4 py-4">
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">
                          {t('importTotalSettings')}
                        </span>
                        <span className="text-sm">
                          {importData.totalSettings}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-green-600">
                          {t('importValidSettings')}
                        </span>
                        <span className="text-sm text-green-600">
                          {importData.validSettings}
                        </span>
                      </div>
                      {importData.invalidSlugs.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-orange-600">
                            {t('importInvalidSettings')}
                          </span>
                          <span className="text-sm text-orange-600">
                            {importData.invalidSlugs.length}
                          </span>
                        </div>
                      )}
                    </div>

                    {importData.invalidSlugs.length > 0 && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900 p-4 space-y-2">
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
                          {t('importInvalidSettingsLabel')}
                        </p>
                        <div className="max-h-32 overflow-y-auto">
                          <ul className="text-xs text-orange-800 dark:text-orange-100 space-y-1">
                            {importData.invalidSlugs.map((slug) => (
                              <li key={slug} className="font-mono">
                                • {slug}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t('importCancel')}</Button>
                  </DialogClose>
                  <Button onClick={handleConfirmImport}>
                    {t('importButton')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="sticky top-0 z-20 -mx-4 mb-6 overflow-x-hidden border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="min-w-0 overflow-x-hidden">
          <div className="pb-4 pt-2 md:hidden">
            <Select
              value={activeGroup?.slug}
              onValueChange={(value) =>
                router.push(`/core/configurations/${value}`)
              }
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder={activeGroup?.name || t('title')} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((item: SettingGroup) => (
                  <SelectItem key={item.slug} value={item.slug}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden min-w-0 md:block">
            <nav
              ref={navContainerRef}
              className="relative flex w-full items-end gap-2 overflow-x-hidden"
              aria-label="Configuration tabs"
            >
              {groups.map((item: SettingGroup, idx: number) => {
                const isActive = idx === activeIndex;
                const isOverflow = !visibleSet.has(idx);

                if (isOverflow) {
                  return (
                    <span
                      key={item.slug}
                      ref={(el) => {
                        tabRefs.current[idx] =
                          el as unknown as HTMLAnchorElement;
                      }}
                      aria-hidden="true"
                      className="invisible absolute shrink-0 whitespace-nowrap px-3 py-3 text-sm font-medium"
                    >
                      {item.name}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.slug}
                    href={`/core/configurations/${item.slug}`}
                    ref={(el) => {
                      tabRefs.current[idx] = el;
                    }}
                    data-active={isActive}
                    className={cn(
                      'shrink-0 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}

              {overflowIdxs.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'ml-auto h-auto shrink-0 cursor-pointer rounded-none border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                        activeInOverflow
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      )}
                    >
                      {overflowIdxs.length} mais
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {overflowIdxs.map((idx) => {
                      const item = groups[idx];
                      if (!item) return null;
                      const isActive = idx === activeIndex;
                      return (
                        <DropdownMenuItem
                          key={item.slug}
                          onClick={() =>
                            router.push(`/core/configurations/${item.slug}`)
                          }
                          className={cn(
                            'cursor-pointer',
                            isActive && 'text-primary'
                          )}
                        >
                          {item.name}
                          {isActive && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          </div>
        </div>
      </div>

      <div className="min-w-0 pb-25">{children}</div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".hedhog"
        className="hidden"
        onChange={handleImportValidate}
      />
    </div>
  );
}
