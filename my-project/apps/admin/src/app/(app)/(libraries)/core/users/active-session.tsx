import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format-date';
import { User, UserSession } from '@hed-hog/api-types';
import { useApp } from '@hed-hog/next-app-provider';
import { Monitor } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

function parseUserAgent(ua: string) {
  if (!ua) return { os: 'Unknown OS', browser: 'Unknown Browser' };

  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';

  return { os, browser };
}

interface IProps {
  editingUser: User;
  refetch: () => void;
}

export function ActiveSessions({ editingUser, refetch }: IProps) {
  const { request, currentLocaleCode, getSettingValue } = useApp();
  const t = useTranslations('core.UserActiveSessions');
  const sessions = editingUser?.user_session ?? [];
  const currentSession = sessions[0];
  const otherSessions = sessions.slice(1);

  const handleRevokeSession = async (sessionId: number) => {
    try {
      await request({
        url: `/sessions/${sessionId}/revoke`,
        method: 'DELETE',
      });

      refetch();
      toast.success(t('revokeSuccess'));
    } catch (error) {
      toast.error(t('revokeFailure'));
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await request({
        url: '/sessions/revoke-all',
        method: 'DELETE',
      });

      refetch();
      toast.success(t('revokeAllSuccess'));
    } catch (error) {
      toast.error(t('revokeAllFailure'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{t('title')}</h4>
        <Button variant="outline" size="sm" onClick={handleRevokeAllSessions}>
          {t('revokeAll')}
        </Button>
      </div>
      <div className="space-y-2">
        {currentSession ? (
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-blue-50 p-2">
                <Monitor className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('currentSession')}</p>
                <p className="text-xs text-muted-foreground">
                  {parseUserAgent(currentSession.user_agent).os} ·{' '}
                  {parseUserAgent(currentSession.user_agent).browser} ·{' '}
                  {t('lastActive')}{' '}
                  {formatDateTime(
                    String(currentSession.updated_at),
                    getSettingValue,
                    currentLocaleCode
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('ip')} {currentSession.ip_address} · {t('expires')}{' '}
                  {formatDateTime(
                    currentSession.expires_at,
                    getSettingValue,
                    currentLocaleCode
                  )}
                </p>
              </div>
              <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                {t('active')}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border p-3 text-center">
            <p className="text-sm text-muted-foreground">
              {t('noActiveSession')}
            </p>
          </div>
        )}

        {otherSessions.length
          ? otherSessions.map((session: UserSession) => {
              const { os, browser } = parseUserAgent(session.user_agent);
              return (
                <div key={session.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-slate-50 p-2">
                      <Monitor className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t('otherSession')}</p>
                      <p className="text-xs text-muted-foreground">
                        {os} · {browser} · {t('lastActive')}{' '}
                        {formatDateTime(
                          String(session.updated_at),
                          getSettingValue,
                          currentLocaleCode
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t('ip')} {session.ip_address} · {t('expires')}{' '}
                        {formatDateTime(
                          session.expires_at,
                          getSettingValue,
                          currentLocaleCode
                        )}
                      </p>
                    </div>
                    <button
                      className="text-xs text-red-400 cursor-pointer hover:text-red-700"
                      onClick={() => {
                        handleRevokeSession(Number(session.id));
                      }}
                    >
                      {t('disconnect')}
                    </button>
                  </div>
                </div>
              );
            })
          : null}
      </div>
    </div>
  );
}
