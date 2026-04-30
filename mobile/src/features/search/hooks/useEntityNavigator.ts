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
import {
  fetchVideoDetails,
  type Celebrity,
  type Forum,
  type ForumTopic,
  type Movie,
} from '../../../services/api';
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

/**
 * Builds a minimal ForumTopic from a search payload. TopicDetailScreen drives
 * its post fetch off `topic.id` and merges the server's `topicDetail` over the
 * route param via `{ ...topic, ...firstPage.topicDetail }`, so the zeroed
 * fields below are placeholders that get replaced as soon as the first page
 * lands.
 */
function synthesizeForumTopic(e: SearchEntityShape): ForumTopic {
  return {
    id: e.entityId ?? 0,
    forumId: 0,
    forumName: '',
    forumThumbnail: null,
    title: e.title,
    description: '',
    poster: '',
    lastBy: '',
    time: '',
    lastTime: '',
    replies: 0,
    views: 0,
    likes: 0,
    locked: false,
    pinned: false,
    flairId: 0,
    topicImage: e.imageUrl,
    tags: [],
    linkTypeValue: '',
    poll: null,
  };
}

/**
 * Builds a minimal Movie from a search payload. MovieDetailScreen reads
 * { titleId, titleName, posterUrl } for the hero and refetches story / cast /
 * reviews on mount via useMovieDetail(titleId). The remaining fields are
 * intentionally zero/null — the screen guards rating display on
 * criticRatingCount/audienceRatingCount > 0 and falls back gracefully when
 * releaseDate and startYear are absent, so no broken zeros surface in the UI.
 */
function synthesizeMovie(e: SearchEntityShape): Movie {
  return {
    titleId: e.entityId ?? 0,
    titleName: e.title,
    startYear: null,
    pageUrl: e.url ?? '',
    posterUrl: e.imageUrl,
    hasThumbnail: !!e.imageUrl,
    releaseDate: null,
    titleShortDesc: null,
    titleTypeId: 0,
    audienceRating: 0,
    criticRating: 0,
    audienceRatingCount: 0,
    criticRatingCount: 0,
    averageRating: 0,
  };
}

/**
 * Builds a minimal Forum from a search payload. ForumThreadScreen drives its
 * topic-list fetch off `forum.id` and merges the server's `forumDetail` over
 * the route param via `firstPage?.forumDetail || forum`, so the zeroed fields
 * below are placeholders that get replaced as soon as the first page lands.
 */
function synthesizeForum(e: SearchEntityShape): Forum {
  return {
    id: e.entityId ?? 0,
    name: e.title,
    description: '',
    categoryId: 0,
    slug: e.url ?? '',
    topicCount: 0,
    postCount: 0,
    followCount: 0,
    rank: 0,
    prevRank: 0,
    rankDisplay: '',
    bg: '',
    emoji: '',
    bannerUrl: null,
    thumbnailUrl: e.imageUrl,
    locked: false,
    hot: false,
    priorityPosts: 0,
    editPosts: 0,
    deletePosts: 0,
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
          // Pass thumbnailUrl + title from the search payload — the
          // /articles/{id}/details endpoint frequently returns
          // thumbnailUrl=null/undefined for articles, so the hero would
          // otherwise be blank until ArticleDetailScreen falls back to the
          // route param. Search has the image we need; just hand it over.
          navigation.push('ArticleDetail', {
            id: String(id),
            thumbnailUrl: e.imageUrl ?? undefined,
            title: e.title,
          });
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
        case 'Topic':
          navigation.push('TopicDetail', {
            topic: synthesizeForumTopic(e),
          });
          return;
        case 'Forum':
          navigation.push('ForumThread', {
            forum: synthesizeForum(e),
          });
          return;
        case 'Movie':
          navigation.push('MovieDetail', {
            movie: synthesizeMovie(e),
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
