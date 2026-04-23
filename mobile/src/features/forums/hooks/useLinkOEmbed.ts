import { useQuery } from '@tanstack/react-query';
import { fetchLinkOEmbed, type LinkOEmbed } from '../../../services/api';

// Cache oEmbed results aggressively — link metadata (title/description/image)
// is stable for the lifetime of the URL. Hits once per URL per hour; across
// posts that share a link, the query cache returns the same entry without a
// second network request.
export function useLinkOEmbed(url: string | null | undefined) {
  return useQuery<LinkOEmbed | null>({
    queryKey: ['link-oembed', url],
    queryFn: () => fetchLinkOEmbed(url!),
    enabled: !!url,
    staleTime: 60 * 60 * 1000,
    gcTime:    24 * 60 * 60 * 1000,
    retry: 1,
  });
}
