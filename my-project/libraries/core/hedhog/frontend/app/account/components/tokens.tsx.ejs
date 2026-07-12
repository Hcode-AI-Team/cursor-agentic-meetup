'use client';

import { PaginationFooter } from '@/components/entity-list/pagination-footer';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import { usePagination } from '@/hooks/use-pagination';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type ApiToken = {
  id: number;
  name: string;
  type: 'mcp' | 'api';
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

function daysSince(
  date: string | null,
  t: (key: string, values?: Record<string, unknown>) => string,
): string {
  if (!date) return t('never');
  const days = Math.floor(
    (Date.now() - new Date(date).getTime()) / 86400000,
  );
  if (days === 0) return t('today');
  return t('daysAgo', { days });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleCopy}>
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  );
}

function CodeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}:</span>
      <code className="flex-1 text-xs break-all">{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export function Tokens() {
  const { request, getSettingValue } = useApp();
  const t = useTranslations('core.Tokens');

  const [keyToRevoke, setKeyToRevoke] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'mcp' | 'api'>('mcp');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
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

  const {
    items: keys,
    refetch,
    page,
    setPage,
    totalItems,
    pageSize,
    setPageSize,
  } = usePagination({
    url: '/mcp/api-keys',
    paginationOptions: { pageSizeOptions },
  });

  const apiUrl = (getSettingValue('api-url') as string | null)?.replace(/\/$/, '') ?? '';
  const mcpUrl = apiUrl ? `${apiUrl}/mcp` : '/mcp';

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await request<ApiToken & { rawToken: string }>({
        url: '/mcp/api-keys',
        method: 'POST',
        data: { name: newKeyName.trim(), type: newKeyType },
      });
      setCreatedToken(res.data.rawToken);
      setNewKeyName('');
      refetch();
    } catch {
      toast.error(t('createFailure'));
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await request({ url: `/mcp/api-keys/${id}`, method: 'DELETE' });
      setKeyToRevoke(null);
      refetch();
      toast.success(t('revokeSuccess'));
    } catch {
      toast.error(t('revokeFailure'));
    }
  };

  const handleCopyToken = () => {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setCreatedToken(null);
    setNewKeyName('');
    setNewKeyType('mcp');
    setIsCopied(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription className="mt-1">{t('description')}</CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsSheetOpen(true)}>
            <Plus className="size-4 mr-2" />
            {t('createToken')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(keys as ApiToken[]).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <KeyRound className="size-8 opacity-40" />
              <p className="text-sm">{t('noTokens')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('tokenPrefix')}</TableHead>
                  <TableHead>{t('lastUsed')}</TableHead>
                  <TableHead>{t('createdAt')}</TableHead>
                  <TableHead className="w-15" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(keys as ApiToken[]).map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={key.type === 'mcp' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {key.type === 'mcp' ? t('typeMcp') : t('typeApi')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {key.token_prefix}…
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {daysSince(key.last_used_at, t as any)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(key.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setKeyToRevoke(key.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <PaginationFooter
            currentPage={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            pageSizeOptions={pageSizeOptions}
          />
        </CardContent>
      </Card>

      {/* Revoke confirmation */}
      <AlertDialog
        open={keyToRevoke !== null}
        onOpenChange={(open) => !open && setKeyToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revokeTokenTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('revokeTokenDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => keyToRevoke !== null && handleRevoke(keyToRevoke)}
            >
              {t('revokeConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create token sheet */}
      <Sheet open={isSheetOpen} onOpenChange={(open) => !open && handleCloseSheet()}>
        <ResizableSheetContent sheetId="create-token" defaultWidth={520}>
          <SheetHeader>
            <SheetTitle>
              {createdToken ? t('tokenCreatedTitle') : t('createTokenTitle')}
            </SheetTitle>
            <SheetDescription>
              {createdToken ? t('tokenCreatedWarning') : t('createTokenDescription')}
            </SheetDescription>
          </SheetHeader>

          {createdToken === null ? (
            <div className="flex flex-col gap-6 px-4 py-2 overflow-y-auto">
              {/* Type selector */}
              <div className="space-y-2">
                <Label>{t('tokenTypeLabel')}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newKeyType === 'mcp' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewKeyType('mcp')}
                  >
                    {t('typeMcp')}
                  </Button>
                  <Button
                    type="button"
                    variant={newKeyType === 'api' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewKeyType('api')}
                  >
                    {t('typeApi')}
                  </Button>
                </div>
              </div>

              {/* Token name */}
              <div className="space-y-2">
                <Label htmlFor="token-name">{t('tokenNameLabel')}</Label>
                <Input
                  id="token-name"
                  placeholder={t('tokenNamePlaceholder')}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>

              {/* Usage instructions */}
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">{t('usageTitle')}</p>

                {newKeyType === 'mcp' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">{t('mcpUsageDesc')}</p>
                    <CodeRow label={t('serverUrlLabel')} value={mcpUrl} />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t('mcpUsageHeader')}</p>
                      <pre className="rounded bg-muted px-3 py-2 text-xs overflow-x-auto">
                        {`Authorization: Bearer <${t('yourToken')}>`}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t('mcpUsageExampleLabel')}</p>
                      <pre className="rounded bg-muted px-3 py-2 text-xs overflow-x-auto whitespace-pre-wrap break-all">
{`{
  "mcpServers": {
    "hub": {
      "type": "sse",
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer <${t('yourToken')}>"
      }
    }
  }
}`}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">{t('apiUsageDesc')}</p>
                    <CodeRow label={t('serverUrlLabel')} value={apiUrl || '/api'} />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t('apiUsageHeader')}</p>
                      <pre className="rounded bg-muted px-3 py-2 text-xs overflow-x-auto">
                        {`Authorization: Bearer <${t('yourToken')}>`}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t('apiUsageExampleLabel')}</p>
                      <pre className="rounded bg-muted px-3 py-2 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                        {`curl -H "Authorization: Bearer <${t('yourToken')}>" \\\n  ${apiUrl || '/api'}/users/me`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-4 py-2 overflow-y-auto">
              <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                {t('tokenCreatedWarning')}
              </div>
              <div className="space-y-1">
                <Label>{t('tokenCreatedLabel')}</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border bg-muted px-3 py-2 text-xs break-all">
                    {createdToken}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyToken}
                    className="shrink-0"
                  >
                    {isCopied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="px-4">
            {createdToken === null ? (
              <>
                <Button variant="outline" onClick={handleCloseSheet}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleCreate} disabled={!newKeyName.trim()}>
                  {t('createToken')}
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={handleCloseSheet}>
                {t('closeSheet')}
              </Button>
            )}
          </SheetFooter>
        </ResizableSheetContent>
      </Sheet>
    </>
  );
}
