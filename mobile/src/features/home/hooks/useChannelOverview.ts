import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchChannelOverview,
  type ChannelArchiveFilter,
  type ChannelOverview,
  CHANNEL_AR_ON_AIR,
} from '../../../services/api';

/**
 * Live-data backing for ChannelDetailScreen. The `/channels/{id}/overview`
 * endpoint returns channel meta + paginated catalog of shows; we fetch the
 * first page (24 shows is enough for any channel we've probed) and let the
 * screen handle "show more" if the user paginates in the future.
 *
 * `archive` selects between the ON AIR / OFF AIR / ARCHIVED tabs — each is a
 * distinct cache entry so flipping back to a previously-viewed tab is instant.
 */
export function useChannelOverview(
  channelId: number,
  archive: ChannelArchiveFilter = CHANNEL_AR_ON_AIR,
) {
  return useQuery<ChannelOverview>({
    queryKey: ['channel-overview', channelId, archive],
    queryFn: () => fetchChannelOverview(channelId, 1, 24, archive),
    staleTime: 5 * 60 * 1000,
    // Keep the previous payload visible while a new tab/channel is in flight
    // so the grid doesn't blank out for a half-second on switch.
    placeholderData: keepPreviousData,
  });
}
