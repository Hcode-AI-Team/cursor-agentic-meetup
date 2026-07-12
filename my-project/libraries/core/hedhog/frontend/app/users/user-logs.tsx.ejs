'use client';

import { EmptyState } from '@/components/entity-list';
import { formatDateTime } from '@/lib/format-date';
import { User } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import {
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Pencil,
  ScrollText,
  ShieldMinus,
  ShieldPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

type UserChangeLog = {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  summary: string;
  beforeData: string;
  afterData: string;
  ipAddress: string;
  createdAt: string | null;
};

function getActionIcon(action: string) {
  switch (action) {
    case 'update':
      return Pencil;
    case 'reset_password':
      return KeyRound;
    case 'role_assigned':
      return ShieldPlus;
    case 'role_removed':
      return ShieldMinus;
    case 'avatar_changed':
      return ImageIcon;
    default:
      return ScrollText;
  }
}

function safeParse(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function DiffList({ before, after }: { before: string; after: string }) {
  const beforeObj = safeParse(before);
  const afterObj = safeParse(after);

  if (!beforeObj && !afterObj) return null;

  const keys = Array.from(
    new Set([
      ...Object.keys(beforeObj ?? {}),
      ...Object.keys(afterObj ?? {}),
    ]),
  );

  if (!keys.length) return null;

  return (
    <div className="mt-2 space-y-1 rounded-md bg-muted/40 p-2">
      {keys.map((key) => (
        <div key={key} className="flex flex-wrap items-center gap-1 text-[11px]">
          <span className="font-medium text-muted-foreground">{key}:</span>
          {beforeObj && key in beforeObj && (
            <span className="rounded bg-rose-50 px-1 py-0.5 text-rose-700 line-through">
              {formatValue(beforeObj[key])}
            </span>
          )}
          {afterObj && key in afterObj && (
            <span className="rounded bg-emerald-50 px-1 py-0.5 text-emerald-700">
              {formatValue(afterObj[key])}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function UserLogs({ editingUser }: { editingUser: User }) {
  const { request, currentLocaleCode, getSettingValue } = useApp();
  const t = useTranslations('core.UserChangeLog');
  const userId = editingUser?.id;

  const { data: logs = [], isLoading } = useQuery<UserChangeLog[]>({
    queryKey: ['user-change-logs', userId, currentLocaleCode],
    queryFn: async () => {
      const response = await request<{ data: UserChangeLog[] }>({
        url: `/user/${userId}/log`,
        method: 'GET',
      });
      return response.data?.data || [];
    },
    enabled: !!userId,
  });

  const knownActions = [
    'update',
    'reset_password',
    'role_assigned',
    'role_removed',
    'avatar_changed',
  ];
  const getActionLabel = (action: string) =>
    knownActions.includes(action) ? t(action as never) : action;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">{t('title')}</h4>

      <div className="space-y-2">
        {logs.length ? (
          logs.map((log) => {
            const Icon = getActionIcon(log.action);
            const actor =
              log.actorName || log.actorEmail || t('systemActor');

            return (
              <div key={log.id} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-slate-50 p-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {getActionLabel(log.action)}
                      </p>
                      {log.createdAt && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateTime(
                            log.createdAt,
                            getSettingValue,
                            currentLocaleCode,
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('byActor')} {actor}
                    </p>
                    {log.summary && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.summary}
                      </p>
                    )}
                    <DiffList before={log.beforeData} after={log.afterData} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={<ScrollText className="h-6 w-6" />}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
          />
        )}
      </div>
    </div>
  );
}
