import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import type { SearchStackParamList } from '../../../navigation/types';
import {
  trackClick,
  type SuggestItemDto,
  type SearchResultItemDto,
} from '../../../services/searchApi';
import { fetchVideoDetails, type Celebrity } from '../../../services/api';
import type { UnsupportedEntitySheetHandle } from '../components/UnsupportedEntitySheet';

type Nav = NativeStackNavigationProp<SearchStackParamList>;

export type SearchEntityShape = {
  entityType: string | null;
  entityId: number | null;
  title: string;
  url: string | null;
  imageUrl: string | null;
};

function fromSuggestion(s: SuggestItemDto): SearchEntityShape {
  return {
    entityType: s.entityType,
    entityId: s.entityId,
    title: s.phrase,
    url: s.url,
    imageUrl: s.imageUrl,
  };
}

function fromResult(r: SearchResultItemDto): SearchEntityShape {
  return {
    entityType: r.entityType,
    entityId: r.entityId,
    title: r.title,
    url: r.url,
    imageUrl: r.imageUrl,
  };
}

/**
 * Builds a minimal Celebrity from a search payload. CelebrityDetailScreen
 * only reads { id, name, thumbnail } off the route param — biography, fans,
 * rank, and category are refetched inside the screen via useCelebrityBiography
 * and useCelebrityFans. The defaults below (rank: 0, category: 'bollywood',
 * etc.) are placeholders the screen never displays.
 */
function synthesizeCelebrity(e: SearchEntityShape): Celebrity {
  return {
    id: String(e.entityId ?? ''),
    name: e.title,
    shortDesc: '',
    thumbnail: e.imageUrl,
    pageUrl: e.url ?? '',
    shareUrl: e.url ? `https://www.indiaforums.com/${e.url}` : '',
    category: 'bollywood',
    rank: 0,
    prevRank: 0,
    trend: 'stable',
    rankDiff: 0,
  };
}

export interface UseEntityNavigator {
  sheetRef: React.MutableRefObject<UnsupportedEntitySheetHandle | null>;
  isResolving: boolean;
  openSuggestion: (s: SuggestItemDto) => void;
  openResult: (r: SearchResultItemDto, searchLogId: number | null) => void;
}

export function useEntityNavigator(): UseEntityNavigator {
  const navigation = useNavigation<Nav>();
  const sheetRef = useRef<UnsupportedEntitySheetHandle | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Drop async results that arrive after unmount so we don't navigate the
  // user to a screen they never asked for.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Mirror of `isResolving` accessible inside the closure without re-creating
  // navigateNative. Used to drop spam taps on Video while a fetch is in flight.
  const resolvingRef = useRef(false);

  const navigateNative = useCallback(
    async (e: SearchEntityShape) => {
      const id = e.entityId;
      if (id == null) {
        sheetRef.current?.open({
          title: e.title,
          entityType: e.entityType ?? 'Item',
          imageUrl: e.imageUrl,
          url: e.url,
        });
        return;
      }

      switch (e.entityType) {
        case 'Article':
          navigation.push('ArticleDetail', { id: String(id) });
          return;
        case 'Gallery':
          navigation.push('GalleryDetail', {
            id,
            title: e.title,
            thumbnail: e.imageUrl,
          });
          return;
        case 'Video': {
          if (resolvingRef.current) return; // ignore spam taps mid-fetch
          resolvingRef.current = true;
          setIsResolving(true);
          try {
            const detail = await fetchVideoDetails(String(id));
            if (!mountedRef.current) return;
            if (!detail) throw new Error('Video not found');
            // VideoDetail extends Video — assignable directly, no cast needed.
            navigation.push('VideoDetail', { video: detail });
          } catch {
            if (!mountedRef.current) return;
            sheetRef.current?.open({
              title: e.title,
              entityType: 'Video',
              imageUrl: e.imageUrl,
              url: e.url,
            });
          } finally {
            resolvingRef.current = false;
            if (mountedRef.current) setIsResolving(false);
          }
          return;
        }
        case 'Person':
          navigation.push('CelebrityProfile', {
            celebrity: synthesizeCelebrity(e),
          });
          return;
        default:
          sheetRef.current?.open({
            title: e.title,
            entityType: e.entityType ?? 'Item',
            imageUrl: e.imageUrl,
            url: e.url,
          });
      }
    },
    [navigation],
  );

  const openSuggestion = useCallback(
    (s: SuggestItemDto) => {
      void Haptics.selectionAsync().catch(() => undefined);
      void navigateNative(fromSuggestion(s));
    },
    [navigateNative],
  );

  const openResult = useCallback(
    (r: SearchResultItemDto, searchLogId: number | null) => {
      void Haptics.selectionAsync().catch(() => undefined);
      if (searchLogId != null) {
        // Fire-and-forget — never await before navigating.
        void trackClick({
          searchLogId,
          entityType: r.entityType,
          entityId: r.entityId,
        });
      }
      void navigateNative(fromResult(r));
    },
    [navigateNative],
  );

  return { sheetRef, isResolving, openSuggestion, openResult };
}
