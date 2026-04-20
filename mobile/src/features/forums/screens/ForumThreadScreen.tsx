import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import SearchBar from '../components/SearchBar';
import FlairDropdown from '../components/FlairDropdown';
import ThreadCard from '../components/ThreadCard';
import NewTopicComposerSheet from '../components/NewTopicComposerSheet';
import ForumTopicSettingsSheet from '../components/ForumTopicSettingsSheet';
import { useForumTopics } from '../hooks/useForumTopics';
import { formatCount } from '../utils/format';
import type { ForumsStackParamList } from '../../../navigation/types';
import type { Forum, ForumTopic } from '../../../services/api';

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'ForumThread'>;
type Rt  = RouteProp<ForumsStackParamList, 'ForumThread'>;

export default function ForumThreadScreen() {
  const navigation = useNavigation<Nav>();
  const { forum } = useRoute<Rt>().params;

  const [activeFlairId, setActiveFlairId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useForumTopics(forum.id);

  const firstPage = data?.pages[0];
  const detail: Forum = firstPage?.forumDetail || forum;
  const flairs = firstPage?.flairs || [];
  const hasModerationRights =
    (detail.priorityPosts ?? 0) > 0 ||
    (detail.editPosts ?? 0) > 0 ||
    (detail.deletePosts ?? 0) > 0;

  const allTopics = useMemo<ForumTopic[]>(
    () => (data?.pages || []).flatMap(p => p.topics),
    [data],
  );

  const filteredTopics = useMemo(() => {
    let list = allTopics;
    if (activeFlairId != null) {
      list = list.filter(t => t.flairId === activeFlairId);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.poster.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTopics, activeFlairId, search]);

  const handleTopicPress = (topic: ForumTopic) => {
    navigation.navigate('TopicDetail', { topic, forum: detail });
  };

  return (
    <View style={styles.screen}>
      <TopNavBack title={detail.name} onBack={() => navigation.goBack()} />

      {isLoading && !data ? (
        <LoadingState height={400} />
      ) : isError && !data ? (
        <ErrorState message="Couldn't load topics" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={filteredTopics}
          keyExtractor={t => String(t.id)}
          renderItem={({ item }) => (
            <ThreadCard topic={item} forum={detail} onPress={handleTopicPress} />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View>
              {detail.bannerUrl && (
                <Image source={{ uri: detail.bannerUrl }} style={styles.banner} />
              )}

              {/* Forum identity */}
              <View style={styles.identity}>
                <View style={[styles.identityAvatar, { backgroundColor: detail.bg }]}>
                  {detail.thumbnailUrl ? (
                    <Image source={{ uri: detail.thumbnailUrl }} style={styles.identityAvatarImg} />
                  ) : (
                    <Text style={styles.identityEmoji}>{detail.emoji}</Text>
                  )}
                </View>
                <View style={styles.identityInfo}>
                  <Text style={styles.identityName} numberOfLines={1}>{detail.name}</Text>
                  {!!detail.description && (
                    <Text style={styles.identityDesc} numberOfLines={2}>{detail.description}</Text>
                  )}
                </View>
                <Pressable style={styles.followBtn}>
                  <Text style={styles.followBtnText}>Follow</Text>
                </Pressable>
                {hasModerationRights && (
                  <Pressable style={styles.gearBtn} onPress={() => setSettingsOpen(true)}>
                    <Ionicons name="settings-outline" size={16} color="#1A1A1A" />
                  </Pressable>
                )}
              </View>

              {/* Stats bar */}
              <View style={styles.statBar}>
                <StatCell label="Topics" value={formatCount(detail.topicCount)} />
                <View style={styles.statDivider} />
                <StatCell label="Posts" value={formatCount(detail.postCount)} />
                <View style={styles.statDivider} />
                <StatCell label="Followers" value={formatCount(detail.followCount)} />
                <View style={styles.statDivider} />
                <StatCell label="Ranked" value={`#${detail.rank || '–'}`} />
              </View>

              {/* Search */}
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search topics…"
              />

              {/* Flair + count + new */}
              <View style={styles.flairBar}>
                {flairs.length > 0 ? (
                  <FlairDropdown
                    flairs={flairs}
                    activeId={activeFlairId}
                    onChange={setActiveFlairId}
                  />
                ) : <View />}
                <View style={styles.flairRight}>
                  <Text style={styles.topicCount}>
                    {filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''}
                  </Text>
                  <Pressable style={styles.newBtn} onPress={() => setNewTopicOpen(true)}>
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                    <Text style={styles.newBtnText}>New</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{search.trim() ? '🔍' : '📭'}</Text>
              <Text style={styles.emptyTitle}>
                {search.trim() ? 'No results found' : 'No topics yet'}
              </Text>
              {!!search.trim() && (
                <Text style={styles.emptySubtitle}>Nothing matched "{search.trim()}"</Text>
              )}
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color="#3558F0" />
              </View>
            ) : null
          }
          contentContainerStyle={styles.content}
        />
      )}

      <NewTopicComposerSheet
        visible={newTopicOpen}
        forum={detail}
        flairs={flairs}
        onClose={() => setNewTopicOpen(false)}
        onCreated={() => {
          setNewTopicOpen(false);
          refetch();
        }}
      />

      <ForumTopicSettingsSheet
        visible={settingsOpen}
        forum={detail}
        topics={allTopics}
        onClose={() => setSettingsOpen(false)}
        onActionComplete={() => refetch()}
      />
    </View>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  content: {
    paddingBottom: 24,
  },
  banner: {
    width: '100%',
    height: 120,
    backgroundColor: '#EEEFF1',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF1',
  },
  identityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  identityAvatarImg: {
    width: '100%',
    height: '100%',
  },
  identityEmoji: {
    fontSize: 24,
  },
  identityInfo: {
    flex: 1,
    minWidth: 0,
  },
  identityName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  identityDesc: {
    fontSize: 11,
    color: '#7A7A7A',
    marginTop: 2,
    lineHeight: 15,
  },
  followBtn: {
    backgroundColor: '#3558F0',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEEFF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF1',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8A8A8A',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E2E2',
  },
  flairBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  flairRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topicCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3558F0',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
  },
});
