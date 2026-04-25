import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
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
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ReportsForumPickerSheet from '../../forums/components/ReportsForumPickerSheet';

type Props = CompositeScreenProps<
  NativeStackScreenProps<MySpaceStackParamList, 'MySpaceSettings'>,
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

type RowProps = {
  icon: IoniconName;
  tint: IconTint;
  label: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
  styles: Styles;
  chevronColor: string;
  rippleColor: string;
};

function Row({ icon, tint, label, subtitle, onPress, last, styles, chevronColor, rippleColor }: RowProps) {
  const t = TINT[tint];
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={18} color={t.fg} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={chevronColor} />
    </Pressable>
  );
}

export default function MySpaceSettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const isModerator = useAuthStore((s) => s.isModerator);
  const logout = useAuthStore((s) => s.logout);
  const [reportsPickerOpen, setReportsPickerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.getParent()?.reset({
      index: 0,
      routes: [{ name: 'Guest' }],
    });
  };

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Row
            icon="person-circle-outline"
            tint="green"
            label="Edit Profile"
            subtitle="Avatar, banner, bio & display name"
            onPress={() => navigation.navigate('EditProfile')}
            styles={styles}
            chevronColor={colors.textTertiary}
            rippleColor={colors.surface}
          />
          <Row
            icon="at-outline"
            tint="green"
            label="Username"
            subtitle={user?.userName ? `@${user.userName}` : 'Change your username'}
            onPress={() => navigation.navigate('Username')}
            styles={styles}
            chevronColor={colors.textTertiary}
            rippleColor={colors.surface}
          />
          <Row
            icon="radio-button-on-outline"
            tint="green"
            label="Status"
            subtitle="Set your online visibility"
            onPress={() => navigation.navigate('Status')}
            styles={styles}
            chevronColor={colors.textTertiary}
            rippleColor={colors.surface}
          />
          <Row
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

        {/* Activity */}
        <Text style={styles.sectionLabel}>Activity</Text>
        <View style={styles.card}>
          <Row
            icon="people-outline"
            tint="blue"
            label="Buddies"
            subtitle="Friends, requests & blocked"
            onPress={() => navigation.navigate('Buddies')}
            styles={styles}
            chevronColor={colors.textTertiary}
            rippleColor={colors.surface}
          />
          <Row
            icon="list-outline"
            tint="blue"
            label="My Activity"
            subtitle="Wall, updates & history"
            onPress={() => navigation.navigate('MyActivities')}
            last={!isModerator}
            styles={styles}
            chevronColor={colors.textTertiary}
            rippleColor={colors.surface}
          />
          {isModerator && (
            <Row
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

        {/* Support */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.card}>
          <Row
            icon="help-circle-outline"
            tint="neutral"
            label="Help Center"
            subtitle="FAQ, guidelines & contact"
            onPress={() => navigation.navigate('HelpCenter')}
            styles={styles}
            chevronColor={colors.textTertiary}
            rippleColor={colors.surface}
          />
          <Row
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

        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
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
      paddingTop: 16,
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
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowPressed: {
      backgroundColor: c.surface,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
    },
    sub: {
      fontSize: 12,
      color: c.textTertiary,
      marginTop: 2,
    },
    signOut: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.danger,
      marginTop: 4,
    },
    signOutPressed: {
      opacity: 0.85,
      backgroundColor: c.dangerSoft,
    },
    signOutText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.danger,
    },
  });
}
