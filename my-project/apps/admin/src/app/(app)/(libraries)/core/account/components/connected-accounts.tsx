'use client';

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
  formatIntegrationProviderName,
  IntegrationLogo,
  normalizeIntegrationProvider,
} from '@/components/ui/integration-logo';
import { useApp } from '@hed-hog/next-app-provider';
import { Link as LinkIcon, Unlink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function ConnectedAccounts() {
  const { getSettingValue, request, setAccessToken, showToastHandler, user } =
    useApp();
  const t = useTranslations('core.ConnectedAccounts');
  const availableProviders = getSettingValue('providers') || '[]';

  const providers = Array.isArray(availableProviders)
    ? availableProviders.map((p: any) => {
        if (typeof p === 'string') {
          return {
            id: p,
            name: p.charAt(0).toUpperCase() + p.slice(1),
            normalizedId: normalizeIntegrationProvider(p),
          };
        }
        return {
          ...p,
          normalizedId: normalizeIntegrationProvider(p.id),
        };
      })
    : [];

  const handleDisconnect = async (email: string, providerName: string) => {
    try {
      const { data }: any = await request({
        url: `/oauth/${normalizeIntegrationProvider(providerName)}`,
        method: 'DELETE',
        data: { email },
      });

      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }
      showToastHandler('success', t('disconnectSuccess'));
    } catch (error) {
      showToastHandler('error', t('disconnectFailure'));
      throw error;
    }
  };

  const getConnectionInfo = (providerName: string) => {
    const normalizedProviderName = normalizeIntegrationProvider(providerName);
    const accounts = (user?.user_account ?? []).filter(
      (ua) =>
        normalizeIntegrationProvider(ua.provider) === normalizedProviderName
    );

    return {
      isConnected: accounts.length > 0,
      account: accounts[0],
      accountCount: accounts.length,
    };
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        {providers?.map((provider: any) => {
          const { isConnected, account } = getConnectionInfo(provider.id);

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <IntegrationLogo
                    provider={provider.id}
                    size={20}
                    decorative
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {formatIntegrationProviderName(
                        provider.id,
                        provider.name
                      )}
                    </p>
                    {Boolean(isConnected) && (
                      <Badge variant="default" className="text-xs">
                        {t('connected')}
                      </Badge>
                    )}
                  </div>
                  {Boolean(isConnected) && (
                    <p className="text-sm text-muted-foreground">
                      {account?.email || t('connected')}
                    </p>
                  )}
                </div>
              </div>
              <div>
                {Boolean(isConnected) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDisconnect(String(account?.email), provider.id)
                    }
                  >
                    <Unlink className="mr-2 size-4" />
                    {t('disconnect')}
                  </Button>
                ) : (
                  <Link
                    href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/oauth/${provider.normalizedId}/connect`}
                  >
                    <Button type="button" variant="outline" size="sm">
                      <LinkIcon className="mr-2 size-4" />
                      {t('connect')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
