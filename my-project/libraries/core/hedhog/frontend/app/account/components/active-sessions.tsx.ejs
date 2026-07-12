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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePagination } from '@/hooks/use-pagination';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { parseBrowser, parseDeviceType, parseOS } from '@/lib/session';
import { UserSession } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { Calendar, Clock, LogOut, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48, 96] as const;

export function ActiveSessions() {
  const { request, logout, currentLocaleCode, getSettingValue } = useApp();
  const t = useTranslations('core.ActiveSessions');
  const [sessionToRevoke, setSessionToRevoke] = useState<number | null>(null);
  const [revokeAllSessions, setRevokeAllSessions] = useState(false);
  const [revokeAllOtherSessions, setRevokeAllOtherSessions] = useState(false);

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
    items: sessions,
    refetch,
    page,
    setPage,
    totalItems,
    pageSize,
    setPageSize,
  } = usePagination({
    url: `/sessions/user`,
    paginationOptions: { pageSizeOptions },
  });

  const handleRevokeSession = async (sessionId: number) => {
    try {
      await request({ url: `/sessions/${sessionId}/revoke`, method: 'DELETE' });
      await refetch();
      setSessionToRevoke(null);
      toast.success(t('revokeSuccess'));
    } catch (error) {
      toast.error(t('revokeFailure'));
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await request({ url: '/sessions/revoke-all-other', method: 'DELETE' });
      await refetch();
      toast.success(t('revokeAllSuccess'));
    } catch (error) {
      toast.error(t('revokeAllFailure'));
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await request({ url: '/sessions/revoke-all', method: 'DELETE' });
      await logout();
      toast.success(t('revokeAllSuccess'));
    } catch (error) {
      toast.error(t('revokeAllFailure'));
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            {sessions.length > 1 && (
              <div className="flex flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRevokeAllSessions(true)}
                >
                  {t('revokeAllSessions')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRevokeAllOtherSessions(true)}
                >
                  {t('revokeAllOtherSessions')}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          {sessions.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('device')}</TableHead>
                      <TableHead>{t('browser')}</TableHead>
                      <TableHead>{t('location')}</TableHead>
                      <TableHead>{t('createdAt')}</TableHead>
                      <TableHead>{t('expiredAt')}</TableHead>
                      <TableHead className="text-right">
                        {t('action')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        onRequestRevoke={(id) => setSessionToRevoke(id)}
                        currentLocaleCode={currentLocaleCode}
                        getSettingValue={getSettingValue}
                        t={t}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4">
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
              </div>
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
              {t('noActiveSessions')}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={sessionToRevoke !== null}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revokeSessionTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('revokeSessionDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                sessionToRevoke && handleRevokeSession(sessionToRevoke)
              }
            >
              {t('revokeSession')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeAllSessions} onOpenChange={setRevokeAllSessions}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revokeAllSessionsTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('revokeAllSessionsDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAllSessions}>
              {t('revokeSessions')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={revokeAllOtherSessions}
        onOpenChange={setRevokeAllOtherSessions}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('revokeAllOtherSessionsTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('revokeAllOtherSessionsDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAllOtherSessions}>
              {t('revokeSessions')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SessionRow({
  session,
  onRequestRevoke,
  currentLocaleCode,
  getSettingValue,
  t,
}: {
  session: UserSession;
  onRequestRevoke: (id: number) => void;
  currentLocaleCode: string;
  getSettingValue: (key: string) => any;
  t: any;
}) {
  return (
    <TableRow key={session.id}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div>
            <p className="font-medium capitalize">
              {parseDeviceType(session.user_agent)}
            </p>
            <p className="text-xs text-muted-foreground">
              {parseOS(session.user_agent)}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div>{parseBrowser(session.user_agent)}</div>

        {session.revoked_at === null && (
          <Badge variant="default" className="mt-1 text-xs">
            {t('currentSession')}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <div>
            <p className="text-md">
              {`${session.location?.city || ''} `}
              {session.location?.country}
            </p>
            <p className="text-xs text-muted-foreground">
              {session.ip_address === '::1' ? '127.0.0.1' : session.ip_address}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <div>
            <p className="text-md">
              {formatDate(
                String(session.created_at),
                getSettingValue,
                currentLocaleCode
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {
                formatDateTime(
                  String(session.created_at),
                  getSettingValue,
                  currentLocaleCode
                ).split(' ')[1]
              }
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <div>
            {session.revoked_at ? (
              <>
                <p className="text-md">
                  {formatDate(
                    String(session.revoked_at),
                    getSettingValue,
                    currentLocaleCode
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {
                    formatDateTime(
                      String(session.revoked_at),
                      getSettingValue,
                      currentLocaleCode
                    ).split(' ')[1]
                  }
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">&nbsp;</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {session.revoked_at === null && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRequestRevoke(Number(session.id))}
          >
            <LogOut className="mr-2 size-4" />
            {t('revoke')}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
