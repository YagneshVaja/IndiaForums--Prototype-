import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  MySpaceStackParamList,
  MainTabParamList,
  RootStackParamList,
} from '../../../navigation/types';
import { useAuthStore } from '../../../store/authStore';
import { useNotificationsStore } from '../../../store/notificationsStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import ErrorState from '../../../components/ui/ErrorState';
import { extractApiError } from '../../../services/api';
import { useMessagesOverview } from '../../messages/hooks/useMessages';

import { useProfile } from '../../profile/hooks/useProfile';
import type { ProfileTabKey } from '../../profile/hooks/useProfileTab';
import ProfileHero from '../../profile/components/ProfileHero';
import ProfileStatsRow from '../../profile/components/ProfileStatsRow';
import ProfileTabBar, { tabsFor } from '../../profile/components/ProfileTabBar';
import ActivityTab from '../../profile/components/tabs/ActivityTab';
import PostsTab from '../../profile/components/tabs/PostsTab';
import CommentsTab from '../../profile/components/tabs/CommentsTab';
import BuddiesTab from '../../profile/components/tabs/BuddiesTab';
import FavoritesTab from '../../profile/components/tabs/FavoritesTab';
import ForumsTab from '../../profile/components/tabs/ForumsTab';
import BadgesTab from '../../profile/components/tabs/BadgesTab';
import DraftsTab from '../../profile/components/tabs/DraftsTab';
import WatchingTab from '../../profile/components/tabs/WatchingTab';
import FFollowingTab from '../../profile/components/tabs/FFollowingTab';
import WarningsTab from '../../profile/components/tabs/WarningsTab';

type Props = CompositeScreenProps<
  NativeStackScreenProps<MySpaceStackParamList, 'MySpaceMain'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'MySpace'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

type Styles = ReturnType<typeof makeStyles>;

type IconBtnProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  badge?: number;
  onPress: () => void;
  styles: Styles;
  iconColor: string;
};

function HeaderIconBtn({ icon, label, badge, onPress, styles, iconColor }: IconBtnProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      {badge != null && badge > 0 ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function TabContent({
  tab,
  userId,
  viewedUserName,
}: {
  tab: ProfileTabKey;
  userId: number | string;
  viewedUserName?: string;
}) {
  switch (tab) {
    case 'activity':
      return <ActivityTab userId={userId} isOwn viewedUserName={viewedUserName} />;
    case 'posts':
      return <PostsTab userId={userId} isOwn />;
    case 'comments':
      return <CommentsTab userId={userId} isOwn />;
    case 'buddies':
      return <BuddiesTab userId={userId} isOwn />;
    case 'favorites':
      return <FavoritesTab userId={userId} isOwn />;
    case 'forums':
      return <ForumsTab userId={userId} isOwn />;
    case 'badges':
      return <BadgesTab userId={userId} isOwn />;
    case 'drafts':
      return <DraftsTab userId={userId} />;
    case 'watching':
      return <WatchingTab userId={userId} />;
    case 'ff-following':
      return <FFollowingTab userId={userId} variant="following" />;
    case 'ff-followers':
      return <FFollowingTab userId={userId} variant="followers" />;
    case 'warnings':
      return <WarningsTab userId={userId} />;
  }
}

export default function MySpaceMainScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const overview = useMessagesOverview(isAuthenticated);
  const unreadMessages = (() => {
    const raw = overview.data?.unreadMessageCount;
    if (raw == null) return 0;
    const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    return Number.isFinite(n) ? Number(n) : 0;
  })();

  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors, mode), [colors, mode]);

  const profileQ = useProfile();
  const tabs = useMemo(() => tabsFor(true), []);
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('activity');

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  const firstName = (() => {
    const dn = profileQ.data?.displayName?.trim();
    if (dn) return dn.split(/\s+/)[0];
    const un = profileQ.data?.userName?.trim();
    if (un) return un;
    return null;
  })();
  const headerTitle = firstName ? `Hi, ${firstName}` : 'My Space';

  // ── Unauthenticated state ───────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={[styles.screen, styles.signInScreen, { paddingTop: insets.top + 24 }]}>
        <StatusBar barStyle={statusBarStyle} />
        <View style={styles.signInIcon}>
          <Ionicons name="person-circle-outline" size={64} color={colors.primary} />
        </View>
        <Text style={styles.signInTitle}>My Space</Text>
        <Text style={styles.signInSubtitle}>
          Sign in to manage your profile, messages, notifications, and activity.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          onPress={() =>
            navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Login' })
          }
        >
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            navigation.getParent()?.getParent()?.navigate('Auth', { screen: 'Register' })
          }
          hitSlop={8}
        >
          <Text style={styles.signInFooterLink}>Create an account</Text>
        </Pressable>
      </View>
    );
  }

  const profile = profileQ.data;
  const emailVerified = profile && (profile.raw as { isEmailConfirmed?: boolean }).isEmailConfirmed;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle={statusBarStyle} />

      {/* Top bar — title + functional action icons */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={styles.topBarActions}>
          <HeaderIconBtn
            icon="mail-outline"
            label="Messages"
            badge={unreadMessages}
            onPress={() => navigation.navigate('Messages')}
            styles={styles}
            iconColor={colors.text}
          />
          <HeaderIconBtn
            icon="notifications-outline"
            label="Notifications"
            badge={unreadCount}
            onPress={() => navigation.navigate('Notifications')}
            styles={styles}
            iconColor={colors.text}
          />
          <HeaderIconBtn
            icon="settings-outline"
            label="Settings"
            onPress={() => navigation.navigate('MySpaceSettings')}
            styles={styles}
            iconColor={colors.text}
          />
        </View>
      </View>

      {profileQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : profileQ.isError || !profile ? (
        <View style={styles.center}>
          <ErrorState message={extractApiError(profileQ.error)} onRetry={profileQ.refetch} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
          refreshControl={
            <RefreshControl
              refreshing={profileQ.isRefetching}
              onRefresh={profileQ.refetch}
              tintColor={colors.primary}
            />
          }
        >
          {/* ── Static header ───────────────────────────────────────── */}
          <View style={styles.staticHeader}>
            {/* Email verification banner */}
            {emailVerified === false && (
              <Pressable
                style={({ pressed }) => [styles.verifyBanner, pressed && styles.verifyBannerPressed]}
                onPress={() => navigation.navigate('VerifyEmail')}
              >
                <Ionicons name="mail-unread-outline" size={16} color={styles.verifyAccent.color} />
                <Text style={styles.verifyText} numberOfLines={1}>
                  Your email is not verified.
                </Text>
                <Text style={styles.verifyAction}>Verify now →</Text>
              </Pressable>
            )}

            <ProfileHero
              profile={profile}
              onEdit={() => navigation.navigate('EditProfile')}
              onMessage={() => navigation.navigate('Messages')}
            />
            <ProfileStatsRow profile={profile} />
          </View>

          {/* ── Sticky tab bar ──────────────────────────────────────── */}
          <ProfileTabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* ── Active tab content ──────────────────────────────────── */}
          <View style={styles.tabBody}>
            <TabContent
              tab={activeTab}
              userId={profile.userId}
              viewedUserName={profile.displayName || profile.userName}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors, mode: 'light' | 'dark') {
  // Theme-aware amber for the verify-email warning. Light: warm cream bg + dark
  // amber text. Dark: muted brown-amber bg + warm gold text — sits naturally
  // against the dark surface without screaming.
  const warn = {
    bg: mode === 'dark' ? '#3A2E12' : '#FEF3C7',
    border: mode === 'dark' ? '#5A4519' : '#FCD38A',
    text: mode === 'dark' ? '#F4C45A' : '#92400E',
    accent: mode === 'dark' ? '#E0AC4D' : '#B45309',
  };

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scroll: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 40,
    },

    // Top bar — matches TopNavBack pattern (card bg, border-bottom)
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 52,
      paddingHorizontal: 14,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    topBarTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.3,
    },
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    iconBtnPressed: {
      backgroundColor: c.surface,
    },
    iconBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: c.card,
    },
    iconBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
      lineHeight: 11,
    },

    // Static profile header
    staticHeader: {
      paddingHorizontal: 14,
      paddingTop: 4,
    },
    tabBody: {
      paddingHorizontal: 14,
      paddingTop: 4,
    },

    // Email verify banner — theme-aware amber
    verifyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: warn.bg,
      borderWidth: 1,
      borderColor: warn.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },
    verifyBannerPressed: {
      opacity: 0.85,
    },
    verifyText: {
      flex: 1,
      fontSize: 13,
      color: warn.text,
      fontWeight: '500',
    },
    verifyAction: {
      fontSize: 13,
      color: warn.accent,
      fontWeight: '700',
    },
    verifyAccent: {
      color: warn.accent,
    },

    // Unauthenticated
    signInScreen: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 14,
    },
    signInIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    signInTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.4,
    },
    signInSubtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 16,
    },
    primaryBtn: {
      backgroundColor: c.primary,
      height: 50,
      paddingHorizontal: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 6,
    },
    primaryBtnPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    signInFooterLink: {
      marginTop: 8,
      fontSize: 14,
      color: c.primary,
      fontWeight: '600',
    },
  });
}
