import { useQuery } from '@tanstack/react-query';
import { getMyBuddies, getUserBuddies } from '../services/profileApi';

// Lightweight count-only fetch for the stats row. We page-size 1 so the wire
// payload stays tiny — only `totalRecordCount` matters here. The full list is
// fetched separately by the Buddies tab.
export function useBuddiesCount(userId: number | string | null | undefined, isOwn: boolean) {
  return useQuery({
    queryKey: ['buddies-count', String(userId ?? ''), isOwn],
    queryFn: async () => {
      const r = isOwn
        ? await getMyBuddies({ pn: 1, ps: 1, mode: 'bl' })
        : await getUserBuddies(userId as number | string, { pn: 1, ps: 1 });
      const raw = r.totalRecordCount;
      const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
      return Number.isFinite(n) ? Number(n) : 0;
    },
    enabled: userId != null && userId !== '',
    staleTime: 60 * 1000,
  });
}
