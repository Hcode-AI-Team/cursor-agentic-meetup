'use client';

import { PageHeader } from '@/components/entity-list';
import { cn } from '@/lib/utils';
import {
  KeyRound,
  Link as LinkIcon,
  Lock,
  LucideIcon,
  Mail,
  Shield,
  Smartphone,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
};

type TabConfig = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export default function AccountLayout({ children }: LayoutProps) {
  const pathname = usePathname();
  const t = useTranslations('core.Profile');

  const tabs: TabConfig[] = [
    { value: 'profile', label: t('tabProfile'), icon: User },
    { value: 'password', label: t('tabPassword'), icon: Lock },
    { value: 'email', label: t('tabEmail'), icon: Mail },
    { value: '2fa', label: t('tab2fa'), icon: Shield },
    { value: 'accounts', label: t('tabAccounts'), icon: LinkIcon },
    { value: 'sessions', label: t('tabSessions'), icon: Smartphone },
    { value: 'tokens', label: t('tabTokens'), icon: KeyRound },
  ];

  return (
    <div className="flex min-w-0 flex-col px-4">
      <PageHeader
        breadcrumbs={[
          { label: t('home'), href: '/' },
          { label: t('breadcrumbLabel') },
        ]}
        title={t('title')}
        description={t('description')}
      />

      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
        <nav
          className="flex items-end gap-1 overflow-x-auto"
          aria-label="Account tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname.includes(`/${tab.value}`);
            return (
              <Link
                key={tab.value}
                href={`/core/account/${tab.value}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="min-w-0 pb-25">{children}</div>
    </div>
  );
}
