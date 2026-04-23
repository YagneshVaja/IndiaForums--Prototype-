import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  StatusBar,
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
import ReportsForumPickerSheet from '../../forums/components/ReportsForumPickerSheet';
import { useMessagesOverview } from '../../messages/hooks/useMessages';

type Props = CompositeScreenProps<
  NativeStackScreenProps<MySpaceStackParamList, 'MySpaceMain'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'MySpace'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type IconTint = 'blue' | 'green' | 'amber' | 'red' | 'neutral';
type Styles = ReturnType<typeof makeStyles>;

const TINT: Record<IconTint, { bg: string; fg: string }> = {
  blue: { bg: '#EBF0FF', fg: '#3558F0' },
  green: { bg: '#E8F5EE', fg: '#1F9254' },
  amber: { bg: '#FFF4E1', fg: '#B26A00' },
  red: { bg: '#FDECEC', fg: '#C8001E' },
  neutral: { bg: '#F0F1F3', fg: '#555B66' },
};

function fmtNum(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

type MenuItemProps = {
  icon: IoniconName;
  tint: IconTint;
  label: string;
  subtitle?: string;
  badge?: number;
  onPress: () => void;
  last?: boolean;
  styles: Styles;
  chevronColor: string;
  rippleColor: string;
};

function MenuItem({ icon, tint, label, subtitle, badge, onPress, last, styles, chevronColor, rippleColor }: MenuItemProps) {
  const tintColors = TINT[tint];
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [
        styles.menuItem,
        !last && styles.menuItemBorder,
        pressed && styles.menuItemPressed,
      ]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: tintColors.bg }]}>
        <Ionicons name={icon} size={18} color={tintColors.fg} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle ? <Text style={styles.menuSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {badge != null && badge > 0 ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={chevronColor} />
    </Pressable>
  );
}

export default function MySpaceMainScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isModerator = useAuthStore(s => s.isModerator);
  const logout = useAuthStore(s => s.logout);
  const unreadCount = useNotificationsStore(s => s.unreadCount);
  const [reportsPickerOpen, setReportsPickerOpen] = useState(false);
  const overview = useMessagesOverview(isAuthenticated);
  const unreadMessages = (() => {
    const raw = overview.data?.unreadMessageCount;
    if (raw == null) return 0;
    const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    return Number.isFinite(n) ? Number(n) : 0;
  })();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const stats = useMemo(() => {
    const items: { value: string; label: string }[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = user as any;
    if (u?.postCount != null) {
      const v = fmtNum(u.postCount);
      if (v) items.push({ value: v, label: 'Posts' });
    }
    const cc = u?.commentCount ?? u?.commentsCount ?? u?.totalComments;
    if (cc != null) {
      const v = fmtNum(cc);
      if (v) items.push({ value: v, label: 'Comments' });
    }
    if (u?.joinDate) {
      const d = new Date(u.joinDate);
      if (!isNaN(d.getTime())) {
        items.push({
          value: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          label: 'Joined',
        });
      }
    }
    return items;
  }, [user]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = user as any;
  const rank: string | null = u?.rankName || u?.rank || u?.groupName || u?.userGroup || null;
  const displayName = u?.displayName || u?.userName || 'User';
  const avatarUrl: string | null = u?.avatarUrl || u?.thumbnailUrl || null;
  const emailVerified: boolean | undefined = u?.emailVerified;

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.getParent()?.reset({
      index: 0,
      routes: [{ name: 'Guest' }],
    });
  };

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

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

  // ── Authenticated dashboard ─────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle={statusBarStyle} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Email verification banner */}
        {emailVerified === false && (
          <Pressable style={styles.verifyBanner} onPress={() => navigation.navigate('VerifyEmail')}>
            <Ionicons name="mail-unread-outline" size={16} color="#B45309" />
            <Text style={styles.verifyText}>Your email is not verified.</Text>
            <Text style={styles.verifyAction}>Verify now →</Text>
          </Pressable>
        )}

        {/* Profile Hero */}
        <View style={styles.profileHero}>
          <View style={styles.heroCover}>
            <View style={styles.heroCoverOverlay} />
          </View>
          <View style={styles.heroBody}>
            <View style={styles.heroAvatarRing}>
              <View style={styles.heroAvatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.heroAvatarImg} />
                ) : (
                  <Text style={styles.heroAvatarInitial}>
                    {displayName[0]?.toUpperCase() || 'U'}
                  </Text>
                )}
              </View>
            </View>

            <Text style={styles.heroName}>{displayName}</Text>

            {rank ? (
              <View style={styles.heroRankPill}>
                <Text style={styles.heroRankText}>{rank}</Text>
              </View>
            ) : null}

            {stats.length > 0 && (
              <View style={styles.heroStats}>
                {stats.map((s, i) => (
                  <React.Fragment key={s.label}>
                    {i > 0 && <View style={styles.heroStatDivider} />}
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>{s.value}</Text>
                      <Text style={styles.heroStatLabel}>{s.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            )}

            <View style={styles.heroActions}>
              <Pressable
                style={({ pressed }) => [styles.heroPrimaryBtn, pressed && styles.btnPressed]}
                onPress={() =>
                  user?.userId
                    ? navigation.navigate('Profile', { userId: String(user.userId) })
                    : undefined
                }
              >
                <Text style={styles.heroPrimaryBtnText}>View Profile</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.heroOutlineBtn, pressed && styles.btnPressed]}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Text style={styles.heroOutlineBtnText}>Settings</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Social */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Social</Text>
          <View style={styles.sectionCard}>
            <MenuItem
              icon="people-outline"
              tint="blue"
              label="Buddies"
              subtitle="Friends, requests & blocked"
              onPress={() => navigation.navigate('Buddies')}
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
            <MenuItem
              icon="chatbubble-outline"
              tint="blue"
              label="Messages"
              subtitle={
                unreadMessages > 0
                  ? `${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}`
                  : 'Private messages'
              }
              badge={unreadMessages}
              onPress={() => navigation.navigate('Messages')}
              last
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.sectionCard}>
            <MenuItem
              icon="settings-outline"
              tint="green"
              label="Account Settings"
              subtitle="Profile, privacy & theme"
              onPress={() => navigation.navigate('EditProfile')}
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
            <MenuItem
              icon="create-outline"
              tint="green"
              label="Username"
              subtitle={user?.userName ? `@${user.userName}` : 'Change your display name'}
              onPress={() => navigation.navigate('Username')}
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
            <MenuItem
              icon="radio-button-on-outline"
              tint="green"
              label="Status"
              subtitle="Set your online visibility"
              onPress={() => navigation.navigate('Status')}
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
            <MenuItem
              icon="phone-portrait-outline"
              tint="green"
              label="Devices"
              subtitle="Manage connected devices"
              onPress={() => navigation.navigate('Devices')}
              last
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
          </View>
        </View>

        {/* Activity */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Activity</Text>
          <View style={styles.sectionCard}>
            <MenuItem
              icon="notifications-outline"
              tint="amber"
              label="Notifications"
              subtitle={
                unreadCount > 0
                  ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up'
              }
              badge={unreadCount}
              onPress={() => navigation.navigate('Notifications')}
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
            <MenuItem
              icon="list-outline"
              tint="amber"
              label="Activity"
              subtitle="Your wall, updates & history"
              onPress={() => navigation.navigate('MyActivities')}
              last={!isModerator}
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
            {isModerator && (
              <MenuItem
                icon="shield-checkmark-outline"
                tint="red"
                label="Reports Inbox"
                subtitle="Review flagged content"
                onPress={() => setReportsPickerOpen(true)}
                last
                styles={styles}
                chevronColor={colors.textTertiary}
                rippleColor={colors.surface}
              />
            )}
          </View>
        </View>

        {/* Support */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.sectionCard}>
            <MenuItem
              icon="help-circle-outline"
              tint="neutral"
              label="Help Center"
              subtitle="FAQ, guidelines & contact"
              onPress={() => navigation.navigate('HelpCenter')}
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
            <MenuItem
              icon="information-circle-outline"
              tint="neutral"
              label="About IndiaForums"
              subtitle="Version, policies & links"
              onPress={() => navigation.navigate('About')}
              last
              styles={styles}
              chevronColor={colors.textTertiary}
              rippleColor={colors.surface}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#C8001E" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <ReportsForumPickerSheet
        visible={reportsPickerOpen}
        onClose={() => setReportsPickerOpen(false)}
        onPick={(forum) => {
          setReportsPickerOpen(false);
          navigation.getParent()?.navigate('Forums', {
            screen: 'ReportsInbox',
            params: { forum },
          });
        }}
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scroll: {
      paddingHorizontal: 16,
      paddingTop: 12,
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

    // Email verify banner
    verifyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FEF3C7',
      borderWidth: 1,
      borderColor: '#FCD38A',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },
    verifyText: {
      flex: 1,
      fontSize: 13,
      color: '#92400E',
      fontWeight: '500',
    },
    verifyAction: {
      fontSize: 13,
      color: '#B45309',
      fontWeight: '700',
    },

    // Profile hero
    profileHero: {
      backgroundColor: c.card,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    heroCover: {
      height: 88,
      width: '100%',
      backgroundColor: c.primary,
    },
    heroCoverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#5B7BF5',
      opacity: 0.35,
    },
    heroBody: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      alignItems: 'center',
      marginTop: -44,
    },
    heroAvatarRing: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    heroAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    heroAvatarImg: {
      width: '100%',
      height: '100%',
    },
    heroAvatarInitial: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    heroName: {
      fontSize: 20,
      fontWeight: '800',
      color: c.text,
      marginTop: 12,
      letterSpacing: -0.3,
    },
    heroRankPill: {
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    heroRankText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      gap: 16,
    },
    heroStatDivider: {
      width: 1,
      height: 22,
      backgroundColor: c.border,
    },
    heroStat: {
      alignItems: 'center',
    },
    heroStatValue: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
    },
    heroStatLabel: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    heroActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
      width: '100%',
    },
    heroPrimaryBtn: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroPrimaryBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroOutlineBtn: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    heroOutlineBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    btnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },

    // Menu section
    menuSection: {
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },

    // Menu item
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
    },
    menuItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    menuItemPressed: {
      backgroundColor: c.surface,
    },
    menuIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuText: {
      flex: 1,
    },
    menuLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
    },
    menuSubtitle: {
      fontSize: 12,
      color: c.textTertiary,
      marginTop: 2,
    },
    menuBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#C8001E',
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 2,
    },
    menuBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Logout
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: '#FCD4D4',
      marginTop: 4,
    },
    logoutBtnPressed: {
      opacity: 0.8,
      backgroundColor: '#FDECEC',
    },
    logoutText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#C8001E',
    },
  });
}
