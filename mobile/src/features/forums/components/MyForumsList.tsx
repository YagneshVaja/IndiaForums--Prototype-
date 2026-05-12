import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import BrandRefreshIndicator from '../../../components/ui/BrandPullToRefresh';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';

import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import { describeFetchError } from '../../../services/fetchError';
import ForumCard from './ForumCard';
import { useMyFavouriteForums } from '../hooks/useMyFavouriteForums';
import { useForumFollowStore } from '../store/forumFollowStore';
import type { Forum, InvitedForum } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  onForumPress: (forum: Forum) => void;
  topInset?: number;
}

export default function MyForumsList({ onForumPress, topInset = 0 }: Props) {
  const [showInvites, setShowInvites] = useState(false);
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();
  const { applyScroll: applyChromeScroll, resetChrome } = useScrollChrome();

  const listScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      applyChromeScroll(e);
    },
  });

  const {
    data,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyFavouriteForums(true);

  const firstPage = data?.pages[0];
  const followOverrides = useForumFollowStore((s) => s.byForumId);
  const forums = useMemo<Forum[]>(() => {
    const seen = new Set<number>();
    const out: Forum[] = [];
    for (const p of data?.pages ?? []) {
      for (const f of p.forums) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        // Optimistically hide forums the user just unfollowed.
        if (followOverrides[f.id]?.isFollowing === false) continue;
        out.push(f);
      }
    }
    return out;
  }, [data, followOverrides]);
  const invitedForums = firstPage?.invitedForums ?? [];
  const requestedForums = firstPage?.requestedForums ?? [];
  const pendingCount = invitedForums.length + requestedForums.length;
  const totalCount = firstPage?.totalRecordCount ?? 0;

  if (isLoading && !data) return <LoadingState height={400} />;
  if (isError && !data) return (
    <ErrorState
      message={describeFetchError(error, "Couldn't load your forums.")}
      onRetry={() => refetch()}
    />
  );

  return (
    <View style={{ flex: 1 }}>
    { }
    <Animated.FlatList
      data={forums}
      keyExtractor={f => String(f.id)}
      renderItem={({ item }) => <ForumCard forum={item} onPress={onForumPress} />}
      onScroll={listScrollHandler as any}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            resetChrome();
            refetch();
          }}
          // OS spinner hidden — BrandRefreshIndicator paints on top.
          tintColor="transparent"
          colors={['transparent']}
          progressBackgroundColor="transparent"
          progressViewOffset={topInset}
        />
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View>
          {pendingCount > 0 && (
            <InvitationsSection
              invited={invitedForums}
              requested={requestedForums}
              expanded={showInvites}
              onToggle={() => setShowInvites(v => !v)}
              onForumPress={onForumPress}
              styles={styles}
            />
          )}
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {totalCount.toLocaleString()} FORUMS
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTitle}>No forums yet</Text>
          <Text style={styles.emptySubtitle}>
            Forums you follow will appear here.
          </Text>
        </View>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
      contentContainerStyle={[
        styles.content,
        topInset > 0 && { paddingTop: topInset },
        { paddingBottom: tabBarHeight + 24 },
      ]}
    />
    <BrandRefreshIndicator refreshing={isRefetching} topInset={topInset} />
    </View>
  );
}

function InvitationsSection({
  invited,
  requested,
  expanded,
  onToggle,
  onForumPress,
  styles,
}: {
  invited: InvitedForum[];
  requested: InvitedForum[];
  expanded: boolean;
  onToggle: () => void;
  onForumPress: (forum: Forum) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const colors = useThemeStore((s) => s.colors);
  const total = invited.length + requested.length;

  return (
    <View style={styles.invitesWrap}>
      <Pressable style={styles.invitesHeader} onPress={onToggle}>
        <Ionicons name="mail-unread-outline" size={16} color={colors.primary} />
        <Text style={styles.invitesHeaderText}>
          {total} pending {total === 1 ? 'invitation' : 'invitations'}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textTertiary}
        />
      </Pressable>
      {expanded && (
        <View style={styles.invitesBody}>
          {[...invited, ...requested].map(inv => (
            <Pressable
              key={`${inv.status}-${inv.forumId}`}
              style={styles.invRow}
              onPress={() =>
                onForumPress({
                  id: inv.forumId,
                  name: inv.forumName,
                  description: inv.forumDescription,
                  categoryId: 0,
                  slug: 'general',
                  topicCount: 0,
                  postCount: 0,
                  followCount: 0,
                  rank: 0,
                  prevRank: 0,
                  rankDisplay: '',
                  bg: '#E5E7EB',
                  emoji: '💬',
                  bannerUrl: null,
                  thumbnailUrl: inv.thumbnailUrl,
                  locked: false,
                  hot: false,
                  priorityPosts: 0,
                  editPosts: 0,
                  deletePosts: 0,
                } as Forum)
              }
            >
              {inv.thumbnailUrl ? (
                <Image
                  source={{ uri: inv.thumbnailUrl }}
                  style={styles.invAvatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.invAvatar, styles.invAvatarFallback]}>
                  <Text style={styles.invAvatarFallbackText}>
                    {(inv.forumName || 'F').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.invBody}>
                <Text style={styles.invName} numberOfLines={1}>{inv.forumName}</Text>
                <Text style={styles.invStatus}>
                  {inv.status === 'invited' ? 'Invited to join' : 'Request pending'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingTop: 0,
    },
    countRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
    },
    countText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.5,
    },
    empty: {
      alignItems: 'center',
      padding: 40,
      gap: 8,
    },
    emptyIcon: {
      fontSize: 36,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    emptySubtitle: {
      fontSize: 12,
      color: c.textTertiary,
      textAlign: 'center',
    },
    footer: {
      paddingVertical: 16,
    },
    invitesWrap: {
      marginHorizontal: 14,
      marginTop: 14,
      backgroundColor: c.primarySoft,
      borderRadius: 12,
      overflow: 'hidden',
    },
    invitesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    invitesHeaderText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: c.primary,
    },
    invitesBody: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    invRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    invAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
    },
    invAvatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    invAvatarFallbackText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textSecondary,
    },
    invBody: {
      flex: 1,
      minWidth: 0,
    },
    invName: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    invStatus: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 2,
    },
  });
}
