'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PaginatedResult } from '@/types/pagination-result';
import { Setting, SettingSubgroup } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { Loader } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { SettingField } from './components/setting-field';

type SettingSection = {
  key: string;
  subgroupId: number | null;
  subgroup: SettingSubgroup | null;
  settings: Setting[];
};

type SettingWithLegacySubgroup = Setting & {
  subgroup_id?: number | null;
};

const getLocalizedValue = (
  value?: string | Record<string, string>
): string | undefined => {
  if (!value) return undefined;

  if (typeof value === 'string') {
    return value;
  }

  return value.en || Object.values(value)[0];
};

export default function Page() {
  const params = useParams();
  const slug = params?.slug;

  const { request, currentLocaleCode } = useApp();
  const { data: settings, isLoading } = useQuery<PaginatedResult<Setting>>({
    queryKey: [`setting`, slug, currentLocaleCode],
    queryFn: async () => {
      const response = await request<PaginatedResult<Setting>>({
        url: `/setting/group/${slug}`,
      });
      return response.data;
    },
  });

  const groupedSections = useMemo<SettingSection[]>(() => {
    const sectionsMap = new Map<string, SettingSection>();

    for (const setting of (settings?.data ||
      []) as SettingWithLegacySubgroup[]) {
      const subgroupId =
        setting.subgroupId ??
        setting.subgroup_id ??
        setting.setting_subgroup?.id ??
        null;
      const subgroup = setting.setting_subgroup ?? null;
      const sectionKey =
        subgroupId === null ? 'ungrouped' : `subgroup-${subgroupId}`;

      if (!sectionsMap.has(sectionKey)) {
        sectionsMap.set(sectionKey, {
          key: sectionKey,
          subgroupId,
          subgroup,
          settings: [],
        });
      }

      sectionsMap.get(sectionKey)?.settings.push(setting);
    }

    const sections = Array.from(sectionsMap.values());

    sections.forEach((section) => {
      section.settings.sort((a, b) => a.slug.localeCompare(b.slug));
    });

    sections.sort((a, b) => {
      if (a.subgroupId === null && b.subgroupId !== null) return 1;
      if (a.subgroupId !== null && b.subgroupId === null) return -1;

      const aSlug = a.subgroup?.slug || '';
      const bSlug = b.subgroup?.slug || '';

      const slugSort = aSlug.localeCompare(bSlug);
      if (slugSort !== 0) return slugSort;

      return (
        (a.subgroupId ?? Number.MAX_SAFE_INTEGER) -
        (b.subgroupId ?? Number.MAX_SAFE_INTEGER)
      );
    });

    return sections;
  }, [settings?.data]);

  if (!slug) {
    return <></>;
  }

  return (
    <div className="min-w-0 space-y-6">
      <form className="min-w-0 space-y-6">
        {isLoading && (
          <Card className="border-none bg-accent">
            <CardContent className="flex h-32 w-full items-center justify-center">
              <Loader className="animate-spin text-muted-foreground w-4 h-4" />
            </CardContent>
          </Card>
        )}

        {!isLoading &&
          groupedSections.map((section) => {
            const subgroupName = getLocalizedValue(section.subgroup?.name);
            const subgroupDescription = getLocalizedValue(
              section.subgroup?.description
            );

            return (
              <Card key={section.key} className="min-w-0 border-none bg-accent">
                {section.subgroup && (
                  <CardHeader className="pb-3">
                    <CardTitle>
                      {subgroupName || section.subgroup.slug}
                    </CardTitle>
                    {subgroupDescription && (
                      <CardDescription>{subgroupDescription}</CardDescription>
                    )}
                  </CardHeader>
                )}

                <CardContent className="min-w-0 space-y-4">
                  {section.settings.map((setting: Setting) => (
                    <div
                      key={setting.id}
                      className="group flex min-w-0 flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0 md:flex-row md:items-center md:justify-between md:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <label className="block font-semibold">
                          {setting.name}
                        </label>
                        <p className="text-muted-foreground text-sm wrap-break-word">
                          {setting.description}
                          <Badge
                            variant="outline"
                            className="ml-1 align-middle font-mono text-xs opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            {setting.slug}
                          </Badge>
                        </p>
                      </div>

                      <div className="flex w-full min-w-0 items-center md:h-full md:w-auto md:max-w-full md:justify-end">
                        <SettingField setting={setting} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
      </form>
    </div>
  );
}
