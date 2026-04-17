import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, NewsStackParamList } from '../../../navigation/types';
import { fetchArticleDetails } from '../../../services/api';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';

// ArticleDetail params are identical in both HomeStack and NewsStack ({ id: string })
// We accept either navigator's props so the component can be shared.
type Props =
  | NativeStackScreenProps<HomeStackParamList, 'ArticleDetail'>
  | NativeStackScreenProps<NewsStackParamList, 'ArticleDetail'>;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export default function ArticleDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const {
    data: article,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['article', id],
    queryFn: () => fetchArticleDetails(id),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState />
      </View>
    );
  }

  if (isError || !article) {
    return (
      <View style={styles.screen}>
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  const contentWidth = width - 32;

  return (
    <View style={styles.screen}>
      {/* Floating header bar: back + share */}
      <View style={[styles.headerBar, { top: insets.top + 8 }]}>
        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
        </Pressable>
        <Pressable
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Share article"
        >
          <Ionicons name="share-outline" size={20} color="#1A1A1A" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        {article.thumbnailUrl ? (
          <Image
            source={{ uri: article.thumbnailUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.body}>
          {/* Category + time ago row */}
          <View style={styles.metaRow}>
            {article.category ? (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{article.category}</Text>
              </View>
            ) : null}
            {article.timeAgo ? (
              <Text style={styles.timeAgo}>{article.timeAgo}</Text>
            ) : null}
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Author row */}
          <View style={styles.authorRow}>
            {article.authorAvatarUrl ? (
              <Image
                source={{ uri: article.authorAvatarUrl }}
                style={styles.authorAvatar}
              />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <Text style={styles.authorAvatarInitial}>
                  {article.authorName ? article.authorName[0] : 'A'}
                </Text>
              </View>
            )}
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{article.authorName}</Text>
              {article.publishedAt ? (
                <Text style={styles.publishedAt}>
                  {new Date(article.publishedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Article body — react-native-render-html not installed, fallback to plain text */}
          <View style={{ width: contentWidth }}>
            <Text style={styles.bodyText}>{stripHtml(article.body ?? '')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#3558F0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeAgo: {
    fontSize: 12,
    color: '#999999',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 30,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E8E8',
  },
  authorAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3558F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  authorInfo: {
    gap: 2,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  publishedAt: {
    fontSize: 12,
    color: '#999999',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333333',
  },
});
