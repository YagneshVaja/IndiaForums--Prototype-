import { useQuery } from '@tanstack/react-query';
import { getMyPreferences } from '../services/profileApi';

export function usePreferences() {
  return useQuery({
    queryKey: ['profile', 'preferences'],
    queryFn: getMyPreferences,
    staleTime: 5 * 60 * 1000,
  });
}
