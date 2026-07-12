import { UserMfa } from '@hed-hog/api-types';
import { useApp, useQuery } from '@hed-hog/next-app-provider';

export function useMfaMethods() {
  const { request, user } = useApp();

  const { data: mfaMethods, refetch } = useQuery<UserMfa[]>({
    queryKey: ['mfa-methods', user?.id],
    queryFn: async () => {
      const response = await request({
        url: '/profile/mfa',
        method: 'GET',
      });

      if (Array.isArray(response.data)) {
        return response.data as UserMfa[];
      }
      return [];
    },
    enabled: !!user?.id,
  });

  return {
    mfaMethods: mfaMethods ?? [],
    refetchMfaMethods: refetch,
  };
}
