import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import SectionHeader from '../../../components/ui/SectionHeader';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { deleteMovieReview, fetchMovieDiscussionTopics, type MovieReview } from '../../../services/api';

import MovieInfoCard from '../components/MovieInfoCard';
import MovieRatingCard from '../components/MovieRatingCard';
import MovieCastStrip from '../components/MovieCastStrip';
import MovieNewsCard from '../components/MovieNewsCard';
import ReviewCard from '../components/ReviewCard';
import MetadataPills, { type Pill } from '../components/MetadataPills';
import MovieDetailSkeleton from '../components/MovieDetailSkeleton';
import DiscussionTopicRow from '../components/DiscussionTopicRow';
import DiscussionListSkeleton from '../components/DiscussionListSkeleton';
import { useMovieDetail } from '../hooks/useMovieDetail';
import { useMovieNews } from '../hooks/useMovieNews';
import { useMovieDiscussion } from '../hooks/useMovieDiscussion';

type Route = RouteProp<HomeStackParamList, 'MovieDetail'>;
type Nav   = NativeStackNavigationProp<HomeStackParamList, 'MovieDetail'>;

const FALLBACK_GRADIENTS: { bg: string; accent: string }[] = [
  { bg: '#1F2A44', accent: '#FFB347' },
  { bg: '#3A1F22', accent: '#FF6B6B' },
  { bg: '#1A3A2E', accent: '#84E1BC' },
  { bg: '#2E1B3A', accent: '#C39BD3' },
  { bg: '#3A2E1A', accent: '#F5CB5C' },
  { bg: '#172A3A', accent: '#7CC4FF' },
];

type TabId = 'overview' | 'reviews' | 'news' | 'discussion';
const TAB_ORDER: TabId[] = ['overview', 'reviews', 'news', 'discussion'];

function compactNumber(n: number | null | undefined): string {
  if (n == null || n <= 0) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MovieDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { movie } = route.params;
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const { cast, reviews } = useMovieDetail(movie.titleId);
  // Lazy: gate the bottom-of-screen sections so cold-load only fetches the
  // hero / about / cast / reviews. News + Discussion light up once the user
  // either taps their tab OR scrolls within ~600px of the section.
  const [hasReachedNews, setHasReachedNews] = useState(false);
  const [hasReachedDiscussion, setHasReachedDiscussion] = useState(false);
  const news = useMovieNews(6, hasReachedNews);
  const discussion = useMovieDiscussion(movie.titleName, 6, hasReachedDiscussion);
  const currentUserId = useAuthStore((s) => s.user?.userId ?? null);
  const queryClient = useQueryClient();

  // Kick off the discussion fetch the instant the screen mounts, regardless
  // of whether the tile-press prefetch ran (it may not, if we landed here
  // from a deep link or an entry point that doesn't warm the cache). The
  // useMovieDiscussion hook is `enabled`-gated to control RENDERING, not
  // fetching — this prefetch overlaps the ~2s cold-start with the hero
  // animation + the user's first scroll, so by the time the discussion
  // section comes into view the data is already in cache.
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['movieDiscussion', movie.titleName, 6],
      queryFn:  () => fetchMovieDiscussionTopics(movie.titleName, 6),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient, movie.titleName]);

  const scrollRef = useRef<ScrollView>(null);
  const sectionYRef = useRef<Record<TabId, number>>({
    overview: 0, reviews: 0, news: 0, discussion: 0,
  });
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [posterFailed, setPosterFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fb = FALLBACK_GRADIENTS[movie.titleId % FALLBACK_GRADIENTS.length];
  const showFallback = !movie.posterUrl || posterFailed;
  // One source object, two <Image>s (backdrop + foreground). expo-image's
  // memory-disk cache resolves the second view from cache instantly, so the
  // poster is fetched once.
  const posterSource = useMemo(
    () => (movie.posterUrl ? { uri: movie.posterUrl } : null),
    [movie.posterUrl],
  );

  const reviewsMovie  = reviews.data?.movie;
  const aboutText     = reviewsMovie?.titleShortDesc || movie.titleShortDesc || null;
  const language      = reviewsMovie?.language || null;
  const castList      = cast.data?.cast ?? [];
  const criticReviews = reviews.data?.criticReviews ?? [];
  const userReviews   = useMemo(() => reviews.data?.userReviews ?? [], [reviews.data]);
  const yearLabel     = movie.startYear ? String(movie.startYear) : null;
  const newsList      = news.data ?? [];
  const discussionTopics = discussion.data ?? [];
  const ownReview     = useMemo(
    () => userReviews.find((r) => currentUserId != null && r.userId === currentUserId) ?? null,
    [userReviews, currentUserId],
  );

  // Show skeleton on cold load when neither core query has resolved.
  const isInitialLoading = reviews.isLoading && !reviews.data && cast.isLoading && !cast.data;
  // Note: news + discussion are gated by section visibility (handleScroll
  // below), so they don't fire until the user scrolls near them.

  // ---- Status pill (Released vs Coming Soon) ---------------------------------
  const releaseDateObj = useMemo(
    () => (movie.releaseDate ? new Date(movie.releaseDate) : null),
    [movie.releaseDate],
  );
  const isUpcoming =
    !!releaseDateObj && !Number.isNaN(releaseDateObj.getTime()) && releaseDateObj.getTime() > Date.now();

  // ---- Metadata pills below hero ---------------------------------------------
  const pills: Pill[] = useMemo(() => {
    const p: Pill[] = [];
    if (language)            p.push({ label: language, tone: 'accent' });
    if (yearLabel)           p.push({ label: yearLabel });
    const releaseFmt = formatLongDate(movie.releaseDate);
    if (releaseFmt)          p.push({ label: releaseFmt });
    if (isUpcoming)          p.push({ label: 'Coming Soon', tone: 'warn' });
    else if (releaseDateObj) p.push({ label: 'Released',    tone: 'success' });
    return p;
  }, [language, yearLabel, movie.releaseDate, isUpcoming, releaseDateObj]);

  // ---- Tab counts ------------------------------------------------------------
  const newsCount   = reviewsMovie?.articleCount ?? null;
  const topicCount  = reviewsMovie?.topicCount   ?? null;
  const reviewsCountTotal =
    (reviews.data?.criticTotal ?? 0) + (reviews.data?.userTotal ?? 0);
  // Prefer the live count from /search/smart (what we actually render) over
  // the topicCount field from /reviews, which is often 0 even when topics exist.
  const discussionCount = discussionTopics.length > 0 ? discussionTopics.length : topicCount;
  const tabBadges: Record<TabId, number | null> = {
    overview:   null,
    reviews:    reviewsCountTotal > 0 ? reviewsCountTotal : null,
    news:       newsCount,
    discussion: discussionCount,
  };

  // ---- Stats row above pills -------------------------------------------------
  const statsLine = useMemo(() => {
    const parts: string[] = [];
    if (reviewsMovie?.viewCount)    parts.push(`👁 ${compactNumber(reviewsMovie.viewCount)} views`);
    if (reviewsMovie?.fanCount)     parts.push(`★ ${compactNumber(reviewsMovie.fanCount)} fans`);
    if (reviewsMovie?.commentCount) parts.push(`💬 ${compactNumber(reviewsMovie.commentCount)}`);
    return parts.join('  ·  ');
  }, [reviewsMovie]);

  // ---- Section layout + tab sync ---------------------------------------------
  const onSectionLayout = useCallback(
    (id: TabId) => (e: LayoutChangeEvent) => {
      sectionYRef.current[id] = e.nativeEvent.layout.y;
    },
    [],
  );

  const handleTabPress = useCallback((id: TabId) => {
    setActiveTab(id);
    if (id === 'news')       setHasReachedNews(true);
    if (id === 'discussion') setHasReachedDiscussion(true);
    const y = sectionYRef.current[id] ?? 0;
    const offset = id === 'overview' ? 0 : Math.max(0, y - 8);
    scrollRef.current?.scrollTo({ y: offset, animated: true });
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y + 60; // small lookahead so the
    // active tab flips a little before the next section header passes the top
    let next: TabId = 'overview';
    for (const id of TAB_ORDER) {
      const sy = sectionYRef.current[id] ?? 0;
      if (sy <= y) next = id;
    }
    setActiveTab((prev) => (prev === next ? prev : next));

    // Light up a section's render gate when within 600px of its top so the
    // content is visible by the time the user scrolls there. (The discussion
    // network call itself fires earlier — see the mount-time prefetch above.)
    const newsY = sectionYRef.current.news;
    const discY = sectionYRef.current.discussion;
    if (newsY && y + 600 >= newsY) setHasReachedNews(true);
    if (discY && y + 600 >= discY) setHasReachedDiscussion(true);
  }, []);

  // ---- Refresh ---------------------------------------------------------------
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['movie', movie.titleId] }),
      queryClient.invalidateQueries({ queryKey: ['movieNews'] }),
      queryClient.invalidateQueries({ queryKey: ['movieDiscussion', movie.titleName] }),
    ]);
    setRefreshing(false);
  }, [queryClient, movie.titleId, movie.titleName]);

  // ---- Review actions --------------------------------------------------------
  const handleEditOwnReview = useCallback((r: MovieReview) => {
    const reviewIdNum = Number(r.reviewId);
    const stars = r.rating != null ? Math.round(r.rating / 20) : 0;
    navigation.navigate('WriteMovieReview', {
      titleId: movie.titleId,
      titleName: movie.titleName,
      existingReview: {
        reviewId: reviewIdNum,
        rating: Math.max(1, Math.min(5, stars)),
        subject: r.title ?? '',
        message: r.body ?? '',
      },
    });
  }, [movie.titleId, movie.titleName, navigation]);

  const handleDeleteOwnReview = useCallback((r: MovieReview) => {
    Alert.alert(
      'Delete review?',
      'This will permanently remove your review for this movie.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const reviewIdNum = Number(r.reviewId);
            const res = await deleteMovieReview({
              titleId: movie.titleId,
              reviewId: reviewIdNum,
            });
            if (!res.ok) {
              Alert.alert('Could not delete', res.error ?? 'Failed to delete review.');
              return;
            }
            await queryClient.invalidateQueries({ queryKey: ['movie', movie.titleId, 'reviews'] });
          },
        },
      ],
    );
  }, [movie.titleId, queryClient]);

  // ---- Tabs config -----------------------------------------------------------
  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview',   label: 'OVERVIEW' },
    { id: 'reviews',    label: 'REVIEWS' },
    { id: 'news',       label: 'NEWS' },
    { id: 'discussion', label: 'DISCUSSION' },
  ];

  return (
    <View style={styles.screen}>
      <TopNavBack title={movie.titleName} onBack={() => navigation.goBack()} />

      {/* Sticky tab bar */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((t) => {
            const active = t.id === activeTab;
            const badge = tabBadges[t.id];
            return (
              <Pressable
                key={t.id}
                onPress={() => handleTabPress(t.id)}
                style={styles.tabBtn}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.tabLabelRow}>
                  <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>
                    {t.label}
                  </Text>
                  {badge ? (
                    <Text style={[styles.tabBadge, active ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
                      {compactNumber(badge) || badge}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.tabUnderline, active ? styles.tabUnderlineActive : null]} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isInitialLoading ? (
        <ScrollView style={styles.flex}><MovieDetailSkeleton /></ScrollView>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {/* OVERVIEW anchor */}
          <View onLayout={onSectionLayout('overview')}>
            {/* Cinematic hero ----------------------------------------------- */}
            <View style={styles.hero}>
              {!showFallback && posterSource ? (
                <Image
                  source={posterSource}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  blurRadius={28}
                  cachePolicy="memory-disk"
                  recyclingKey={`hero-bg-${movie.titleId}`}
                  onError={() => setPosterFailed(true)}
                />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: fb.bg }]} />
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.heroContent}>
                <View style={styles.posterShadow}>
                  {!showFallback && posterSource ? (
                    <Image
                      source={posterSource}
                      style={styles.posterImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={150}
                      recyclingKey={`hero-fg-${movie.titleId}`}
                      onError={() => setPosterFailed(true)}
                    />
                  ) : (
                    <View style={[styles.posterImage, styles.posterFallback, { backgroundColor: fb.bg }]}>
                      <Text style={[styles.posterEmoji, { color: fb.accent }]}>🎬</Text>
                      <Text style={styles.posterFallbackTitle} numberOfLines={3}>{movie.titleName}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.heroMeta}>
                  <Text style={styles.heroTitle} numberOfLines={3}>{movie.titleName}</Text>
                  {yearLabel ? (
                    <Text style={styles.heroSubtitle}>
                      {yearLabel}{language ? `  ·  ${language}` : ''}
                    </Text>
                  ) : null}

                  <View style={styles.ratingsRow}>
                    {movie.criticRatingCount > 0 ? (
                      <View style={styles.ratingChip}>
                        <Text style={styles.ratingChipValue}>{Math.round(movie.criticRating)}%</Text>
                        <Text style={styles.ratingChipLabel}>Critics · {movie.criticRatingCount}</Text>
                      </View>
                    ) : null}
                    {movie.audienceRatingCount > 0 ? (
                      <View style={styles.ratingChip}>
                        <Text style={styles.ratingChipValue}>{Math.round(movie.audienceRating)}%</Text>
                        <Text style={styles.ratingChipLabel}>Users · {movie.audienceRatingCount}</Text>
                      </View>
                    ) : null}
                    {movie.criticRatingCount === 0 && movie.audienceRatingCount === 0 ? (
                      <Text style={styles.notRated}>Not rated yet</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>

            {/* Pills + stats ------------------------------------------------ */}
            <MetadataPills pills={pills} />
            {statsLine ? (
              <Text style={styles.statsLine}>{statsLine}</Text>
            ) : null}

            <MovieInfoCard
              releaseDate={movie.releaseDate}
              language={language}
              about={aboutText}
              storyLoading={reviews.isLoading && !aboutText}
            />

            <MovieRatingCard movie={movie} ownReview={ownReview} />

            <SectionHeader title="Cast" />
            {cast.isLoading ? (
              <View style={styles.sectionLoading} />
            ) : castList.length > 0 ? (
              <>
                <MovieCastStrip cast={castList.slice(0, 8)} />
                {(cast.data?.totalCount ?? 0) > 8 ? (
                  <Pressable style={styles.viewAll} onPress={() => { /* placeholder */ }}>
                    <Text style={styles.viewAllText}>View all cast</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Text style={styles.emptyInline}>Cast information not available yet.</Text>
            )}
          </View>

          {/* REVIEWS anchor */}
          <View onLayout={onSectionLayout('reviews')}>
            <SectionHeader title="Critic Reviews" />
            {reviews.isLoading ? null : criticReviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {criticReviews.slice(0, 3).map((r) => (
                  <ReviewCard key={`c-${r.reviewId}`} review={r} />
                ))}
                {(reviews.data?.criticTotal ?? 0) > 3 ? (
                  <Pressable style={styles.viewAll} onPress={() => { /* placeholder */ }}>
                    <Text style={styles.viewAllText}>View all critic reviews</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text style={styles.emptyInline}>No critic reviews yet.</Text>
            )}

            <SectionHeader title="User Reviews" />
            {reviews.isLoading ? null : userReviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {userReviews.slice(0, 3).map((r) => {
                  const isOwn = currentUserId != null && r.userId === currentUserId;
                  return (
                    <ReviewCard
                      key={`u-${r.reviewId}`}
                      review={r}
                      isOwn={isOwn}
                      onEdit={isOwn ? () => handleEditOwnReview(r) : undefined}
                      onDelete={isOwn ? () => handleDeleteOwnReview(r) : undefined}
                    />
                  );
                })}
                {(reviews.data?.userTotal ?? 0) > 3 ? (
                  <Pressable style={styles.viewAll} onPress={() => { /* placeholder */ }}>
                    <Text style={styles.viewAllText}>View all user reviews</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text style={styles.emptyInline}>No user reviews yet. Be the first to review.</Text>
            )}
          </View>

          {/* NEWS anchor */}
          <View onLayout={onSectionLayout('news')}>
            <SectionHeader title="Latest from IndiaForums" />
            <Text style={styles.sectionNote}>
              Movie-specific news isn't filterable in the public API yet — showing recent site-wide news instead.
            </Text>
            {news.isLoading ? null : newsList.length > 0 ? (
              <View>
                {newsList.map((a) => (
                  <MovieNewsCard key={a.id} article={a} />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyInline}>No news to show right now.</Text>
            )}
          </View>

          {/* DISCUSSION anchor */}
          <View onLayout={onSectionLayout('discussion')}>
            <SectionHeader title="Discussion" />
            {!hasReachedDiscussion || (discussion.isLoading && discussionTopics.length === 0) ? (
              <DiscussionListSkeleton rows={3} />
            ) : discussion.isError ? (
              <View style={styles.discussionInline}>
                <Text style={styles.emptyInline}>Couldn't load discussion threads.</Text>
                <Pressable onPress={() => discussion.refetch()} hitSlop={6}>
                  <Text style={styles.retryInlineText}>Try again →</Text>
                </Pressable>
              </View>
            ) : discussionTopics.length > 0 ? (
              <View style={styles.discussionList}>
                {discussionTopics.map((t) => (
                  <DiscussionTopicRow key={`t-${t.topicId}`} topic={t} />
                ))}
              </View>
            ) : (
              <View style={styles.discussionEmpty}>
                <Text style={styles.discussionEmptyEmoji}>💬</Text>
                <Text style={styles.discussionEmptyTitle}>No threads yet</Text>
                <Text style={styles.discussionEmptyBody}>
                  Be the first to start a conversation about this movie on IndiaForums.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    tabBar: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tabRow: { paddingHorizontal: 4, gap: 4 },
    tabBtn: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 0,
      alignItems: 'center',
    },
    tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 8 },
    tabText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
    tabTextActive: { color: c.text },
    tabTextInactive: { color: c.textTertiary },
    tabBadge: {
      fontSize: 10,
      fontWeight: '800',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      overflow: 'hidden',
    },
    tabBadgeActive: { backgroundColor: c.primary, color: '#FFFFFF' },
    tabBadgeInactive: { backgroundColor: c.cardElevated, color: c.textTertiary },
    tabUnderline: { height: 2, width: '100%', backgroundColor: 'transparent' },
    tabUnderlineActive: { backgroundColor: c.primary },

    hero: {
      paddingHorizontal: 14,
      paddingTop: 18,
      paddingBottom: 22,
      overflow: 'hidden',
    },
    heroContent: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'flex-end',
      minHeight: 200,
    },
    posterShadow: {
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    posterImage: { width: 130, height: 195, backgroundColor: c.cardElevated },
    posterFallback: {
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10,
    },
    posterEmoji: { fontSize: 38, marginBottom: 6, opacity: 0.9 },
    posterFallbackTitle: {
      fontSize: 12, fontWeight: '800', color: '#FFFFFF',
      textAlign: 'center', lineHeight: 16,
    },
    heroMeta: { flex: 1, paddingBottom: 4 },
    heroTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 28,
      letterSpacing: -0.3,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    heroSubtitle: {
      marginTop: 6,
      fontSize: 12.5,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.4,
    },
    ratingsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    ratingChip: {
      backgroundColor: 'rgba(255,255,255,0.20)',
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    },
    ratingChipValue: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    ratingChipLabel: {
      fontSize: 10.5, color: 'rgba(255,255,255,0.85)', marginTop: 1,
    },
    notRated: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },

    statsLine: {
      paddingHorizontal: 14,
      paddingTop: 6,
      fontSize: 11.5,
      fontWeight: '600',
      color: c.textTertiary,
    },

    sectionLoading: { paddingVertical: 16 },
    sectionLoadingVisible: { paddingVertical: 24, alignItems: 'center' },
    sectionNote: {
      paddingHorizontal: 14,
      paddingBottom: 8,
      fontSize: 11.5,
      fontStyle: 'italic',
      color: c.textTertiary,
    },
    emptyInline: {
      paddingHorizontal: 16, paddingVertical: 6,
      fontSize: 13, fontStyle: 'italic', color: c.textTertiary,
    },
    reviewsList: { paddingHorizontal: 14 },
    viewAll: {
      marginHorizontal: 14, marginTop: 6,
      paddingVertical: 10, borderRadius: 8,
      backgroundColor: c.primarySoft, alignItems: 'center',
    },
    viewAllText: { fontSize: 13, fontWeight: '700', color: c.primary },

    discussionList: {
      marginTop: 4,
    },
    discussionEmpty: {
      marginHorizontal: 14,
      marginTop: 4,
      marginBottom: 14,
      paddingHorizontal: 22,
      paddingVertical: 26,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: 'dashed',
      alignItems: 'center',
    },
    discussionEmptyEmoji: { fontSize: 32, marginBottom: 8, opacity: 0.6 },
    discussionEmptyTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      marginBottom: 4,
    },
    discussionEmptyBody: {
      fontSize: 12.5,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 280,
    },
    discussionInline: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    retryInlineText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.primary,
    },

    bottomSpacer: { height: 24 },
  });
}
