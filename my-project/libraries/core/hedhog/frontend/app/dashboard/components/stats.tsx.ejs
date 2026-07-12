'use client';

import { Card, CardContent } from '@/components/ui/card';
import { IconGripVertical } from '@tabler/icons-react';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType: 'up' | 'down';
  icon: React.ReactNode;
  iconBg: string;
  delay: number;
}

export default function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
  iconBg,
  delay,
}: StatCardProps) {
  const t = useTranslations('core.Dashboard');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Card
      className={`h-full flex flex-col group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
        mounted ? 'animate-fade-in-up' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 animate-shimmer opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div
        className="drag-handle absolute top-2 left-3 z-10"
        style={{ cursor: 'grab' }}
      >
        <IconGripVertical className="text-muted-foreground/50 size-4 shrink-0" />
      </div>
      <CardContent className="flex-1 p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
            <span className="text-3xl font-bold tracking-tight text-foreground animate-count-up">
              {value}
            </span>
            {change !== undefined && (
              <div className="flex items-center gap-1 pt-1">
                {changeType === 'up' ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                )}
                <span
                  className={`text-xs font-medium ${
                    changeType === 'up'
                      ? 'text-emerald-500'
                      : 'text-destructive'
                  }`}
                >
                  {change}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('vsPreviousMonth')}
                </span>
              </div>
            )}
          </div>
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span>{t('viewDetails')}</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
}
