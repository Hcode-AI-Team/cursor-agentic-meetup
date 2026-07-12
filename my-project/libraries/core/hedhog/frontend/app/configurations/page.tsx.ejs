'use client';

import { Loading } from '@/components/loading';
import { PaginatedResult } from '@/types/pagination-result';
import { SettingGroup } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Page() {
  const router = useRouter();
  const { request, currentLocaleCode } = useApp();

  const { data: settingGroups } = useQuery<PaginatedResult<SettingGroup>>({
    queryKey: ['setting-groups', currentLocaleCode],
    queryFn: async () => {
      const response = await request<PaginatedResult<SettingGroup>>({
        url: '/setting/group',
      });
      return response.data;
    },
  });

  useEffect(() => {
    if ((settingGroups?.data || []).length > 0) {
      router.push(`/core/configurations/${settingGroups?.data?.[0]?.slug}`);
    }
  }, [settingGroups]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loading />
    </div>
  );
}
