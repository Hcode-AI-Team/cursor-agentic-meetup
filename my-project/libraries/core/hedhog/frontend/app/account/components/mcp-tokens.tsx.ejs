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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePagination } from '@/hooks/use-pagination';
import { formatDateTime } from '@/lib/format-date';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type McpApiKey = {
  id: number;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export function McpTokens() {
  const { request, getSettingValue } = useApp();
  const t = useTranslations('core.McpTokens');

  const [keyToRevoke, setKeyToRevoke] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedUrl, setIsCopiedUrl] = useState(false);
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

  const apiUrl = getSettingValue('api-url') as string | null;
  const mcpUrl = apiUrl ? `${apiUrl.replace(/\/$/, '')}/mcp` : '/mcp';

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await request<McpApiKey & { rawToken: string }>({
        url: '/mcp/api-keys',
        method: 'POST',
        data: { name: newKeyName.trim() },
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

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(mcpUrl);
    setIsCopiedUrl(true);
    setTimeout(() => setIsCopiedUrl(false), 2000);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreatedToken(null);
    setNewKeyName('');
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
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            {t('createToken')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
            <span className="text-sm text-muted-foreground shrink-0">{t('mcpUrlLabel')}:</span>
            <code className="flex-1 text-sm break-all">{mcpUrl}</code>
            <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleCopyUrl}>
              {isCopiedUrl ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
            </Button>
          </div>

          {(keys as McpApiKey[]).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <KeyRound className="size-8 opacity-40" />
              <p className="text-sm">{t('noTokens')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('tokenPrefix')}</TableHead>
                  <TableHead>{t('lastUsed')}</TableHead>
                  <TableHead>{t('createdAt')}</TableHead>
                  <TableHead className="w-15" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(keys as McpApiKey[]).map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {key.token_prefix}…
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {key.last_used_at ? formatDateTime(key.last_used_at, getSettingValue) : t('never')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(key.created_at, getSettingValue)}
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
      <AlertDialog open={keyToRevoke !== null} onOpenChange={(open) => !open && setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revokeTokenTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('revokeTokenDescription')}</AlertDialogDescription>
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

      {/* Create token dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && handleCloseCreateDialog()}>
        <DialogContent className="sm:max-w-md">
          {createdToken === null ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('createTokenTitle')}</DialogTitle>
                <DialogDescription>{t('createTokenDescription')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="token-name">{t('tokenNameLabel')}</Label>
                <Input
                  id="token-name"
                  placeholder={t('tokenNamePlaceholder')}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreateDialog}>{t('cancel')}</Button>
                <Button onClick={handleCreate} disabled={!newKeyName.trim()}>
                  {t('createToken')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('tokenCreatedTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                  {t('tokenCreatedWarning')}
                </div>
                <div className="space-y-1">
                  <Label>{t('tokenCreatedLabel')}</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded border bg-muted px-3 py-2 text-xs break-all">
                      {createdToken}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopyToken} className="shrink-0">
                      {isCopied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseCreateDialog}>{t('closeDialog')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
