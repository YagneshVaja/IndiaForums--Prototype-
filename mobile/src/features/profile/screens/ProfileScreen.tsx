import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type {
  MySpaceStackParamList,
  MainTabParamList,
  RootStackParamList,
} from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { extractApiError } from '../../../services/api';

import { useProfile } from '../hooks/useProfile';
import { useBuddiesCount } from '../hooks/useBuddiesCount';
import type { ProfileTabKey } from '../hooks/useProfileTab';
import ProfileHero from '../components/ProfileHero';
import ProfileStatsRow, { type StatTileKey } from '../components/ProfileStatsRow';
import ProfileTabBar, { tabsFor } from '../components/ProfileTabBar';

import ActivityTab from '../components/tabs/ActivityTab';
import PostsTab from '../components/tabs/PostsTab';
import CommentsTab from '../components/tabs/CommentsTab';
import BuddiesTab from '../components/tabs/BuddiesTab';
import FavoritesTab from '../components/tabs/FavoritesTab';
import ForumsTab from '../components/tabs/ForumsTab';
import BadgesTab from '../components/tabs/BadgesTab';
import DraftsTab from '../components/tabs/DraftsTab';
import WatchingTab from '../components/tabs/WatchingTab';
import WarningsTab from '../components/tabs/WarningsTab';
import FanFictionsTab from '../components/tabs/FanFictionsTab';

type Props = CompositeScreenProps<
  NativeStackScreenProps<MySpaceStackParamList, 'Profile'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'MySpace'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export default function ProfileScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useThemedStyles(makeStyles);

  const viewedUserId = route.params?.userId;
  const q = useProfile(viewedUserId);

  const isOwn = q.data?.isOwnProfile ?? true;
  const buddiesCountQ = useBuddiesCount(q.data?.userId, isOwn);
  const tabs = useMemo(
    () =>
      tabsFor(isOwn, {
        posts: q.data?.postCount,
        comments: q.data?.commentCount,
      }),
    [isOwn, q.data?.postCount, q.data?.commentCount],
  );
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('activity');

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={[styles.screen, { paddingTop: 0 }]}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack
        title={isOwn ? 'My Profile' : q.data?.displayName || q.data?.userName || 'Profile'}
        onBack={() => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate('MySpaceMain');
        }}
      />

      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : q.isError ? (
        <View style={styles.center}>
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        </View>
      ) : q.data ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
          refreshControl={
            <RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.primary} />
          }
        >
          <View style={styles.padH}>
            <ProfileHero
              profile={q.data}
              onEdit={() => navigation.navigate('EditProfile')}
              onMessage={() => navigation.navigate('Messages')}
            />
            <ProfileStatsRow
              profile={q.data}
              buddiesCount={buddiesCountQ.data}
              onTilePress={(key: StatTileKey) => setActiveTab(key)}
            />
          </View>

          <ProfileTabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

          <View style={styles.tabBody}>
            <TabContent
              tab={activeTab}
              userId={q.data.userId}
              isOwn={isOwn}
              viewedUserName={q.data.displayName || q.data.userName}
            />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function TabContent({
  tab,
  userId,
  isOwn,
  viewedUserName,
}: {
  tab: ProfileTabKey;
  userId: number | string;
  isOwn: boolean;
  viewedUserName?: string;
}) {
  switch (tab) {
    // 'activity' is the umbrella; scrap/slam/test are sub-filters owned by
    // ActivityTab, but if a deep-link arrives with one of those keys we still
    // honor it by routing into the same component (it'll preselect 'all').
    case 'activity':
    case 'scrapbook':
    case 'slambook':
    case 'testimonial':
      return <ActivityTab userId={userId} isOwn={isOwn} viewedUserName={viewedUserName} />;
    case 'fan-fictions':
      return <FanFictionsTab userId={userId} isOwn={isOwn} />;
    case 'posts':
      return <PostsTab userId={userId} isOwn={isOwn} />;
    case 'comments':
      return <CommentsTab userId={userId} isOwn={isOwn} />;
    case 'buddies':
      return <BuddiesTab userId={userId} isOwn={isOwn} />;
    case 'favorites':
      return <FavoritesTab userId={userId} isOwn={isOwn} />;
    case 'forums':
      return <ForumsTab userId={userId} isOwn={isOwn} />;
    case 'badges':
      return <BadgesTab userId={userId} isOwn={isOwn} />;
    case 'drafts':
      return <DraftsTab userId={userId} />;
    case 'watching':
      return <WatchingTab userId={userId} />;
    // ff-following / ff-followers are now sub-sections of FanFictionsTab.
    // The keys still exist in useProfileTab for deep-link compatibility.
    case 'ff-following':
    case 'ff-followers':
      return <FanFictionsTab userId={userId} isOwn={isOwn} />;
    case 'warnings':
      return <WarningsTab userId={userId} />;
  }
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scroll: {
      flex: 1,
    },
    padH: {
      paddingHorizontal: 14,
      paddingTop: 12,
    },
    tabBody: {
      paddingHorizontal: 14,
      paddingTop: 4,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 40,
    },
  });
}
