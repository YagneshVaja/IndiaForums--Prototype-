import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import type { SearchStackParamList } from '../../../navigation/types';
import type { SmartSearchItemDto } from '../../../services/searchApi';
import {
  fetchVideoDetails,
  type Celebrity,
  type Forum,
  type ForumTopic,
  type Movie,
} from '../../../services/api';
import type { UnsupportedEntitySheetHandle } from '../components/UnsupportedEntitySheet';
import { normalizeContentType, type EntityKind } from '../utils/entityMetadata';

type Nav = NativeStackNavigationProp<SearchStackParamList>;

function synthesizeCelebrity(item: SmartSearchItemDto): Celebrity {
  return {
    id: String(item.itemId),
    name: item.title,
    shortDesc: '',
    thumbnail: item.thumbnailUrl,
    pageUrl: item.pageUrl ?? '',
    shareUrl: item.pageUrl ? `https://www.indiaforums.com/${item.pageUrl}` : '',
    category: 'bollywood',
    rank: 0,
    prevRank: 0,
    trend: 'stable',
    rankDiff: 0,
  };
}

function synthesizeForumTopic(item: SmartSearchItemDto): ForumTopic {
  return {
    id: item.itemId,
    forumId: 0,
    forumName: '',
    forumThumbnail: null,
    title: item.title,
    description: '',
    poster: '',
    posterId: 0,
    lastBy: '',
    lastById: 0,
    time: '',
    lastTime: '',
    replies: 0,
    views: 0,
    likes: 0,
    userCount: 0,
    locked: false,
    pinned: false,
    flairId: 0,
    topicImage: item.thumbnailUrl,
    tags: [],
    linkTypeValue: '',
    poll: null,
  };
}

function synthesizeMovie(item: SmartSearchItemDto): Movie {
  return {
    titleId: item.itemId,
    titleName: item.title,
    startYear: null,
    pageUrl: item.pageUrl ?? '',
    posterUrl: item.thumbnailUrl,
    hasThumbnail: !!item.thumbnailUrl,
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

function synthesizeForum(item: SmartSearchItemDto): Forum {
  return {
    id: item.itemId,
    name: item.title,
    description: '',
    categoryId: 0,
    slug: item.pageUrl ?? '',
    topicCount: 0,
    postCount: 0,
    followCount: 0,
    rank: 0,
    prevRank: 0,
    rankDisplay: '',
    bg: '',
    emoji: '',
    bannerUrl: null,
    thumbnailUrl: item.thumbnailUrl,
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
  openItem: (item: SmartSearchItemDto) => void;
}

export function useEntityNavigator(): UseEntityNavigator {
  const navigation = useNavigation<Nav>();
  const sheetRef = useRef<UnsupportedEntitySheetHandle | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const resolvingRef = useRef(false);

  const navigateNative = useCallback(
    async (item: SmartSearchItemDto) => {
      const kind: EntityKind = normalizeContentType(item.contentType);

      switch (kind) {
        case 'Article':
          navigation.push('ArticleDetail', {
            id: String(item.itemId),
            thumbnailUrl: item.thumbnailUrl ?? undefined,
            title: item.title,
          });
          return;
        case 'Gallery':
          navigation.push('GalleryDetail', {
            id: item.itemId,
            title: item.title,
            thumbnail: item.thumbnailUrl,
          });
          return;
        case 'Video': {
          if (resolvingRef.current) return;
          resolvingRef.current = true;
          setIsResolving(true);
          try {
            const detail = await fetchVideoDetails(String(item.itemId));
            if (!mountedRef.current) return;
            if (!detail) throw new Error('Video not found');
            navigation.push('VideoDetail', { video: detail });
          } catch {
            if (!mountedRef.current) return;
            sheetRef.current?.open({
              title: item.title,
              entityType: 'Video',
              imageUrl: item.thumbnailUrl,
              url: item.pageUrl,
            });
          } finally {
            resolvingRef.current = false;
            if (mountedRef.current) setIsResolving(false);
          }
          return;
        }
        case 'Person':
          navigation.push('CelebrityProfile', {
            celebrity: synthesizeCelebrity(item),
          });
          return;
        case 'Topic':
          navigation.push('TopicDetail', {
            topic: synthesizeForumTopic(item),
          });
          return;
        case 'Forum':
          navigation.push('ForumThread', {
            forum: synthesizeForum(item),
          });
          return;
        case 'Movie':
          navigation.push('MovieDetail', {
            movie: synthesizeMovie(item),
          });
          return;
        case 'Show':
        case 'Channel':
        case 'Member':
        case 'Unknown':
        default:
          sheetRef.current?.open({
            title: item.title,
            entityType: item.contentType,
            imageUrl: item.thumbnailUrl,
            url: item.pageUrl,
          });
      }
    },
    [navigation],
  );

  const openItem = useCallback(
    (item: SmartSearchItemDto) => {
      void Haptics.selectionAsync().catch(() => undefined);
      void navigateNative(item);
    },
    [navigateNative],
  );

  return { sheetRef, isResolving, openItem };
}
