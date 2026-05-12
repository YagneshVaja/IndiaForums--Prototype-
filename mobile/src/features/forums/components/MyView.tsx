import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import MyForumsList from './MyForumsList';
import MyPostsList from './MyPostsList';
import MyWatchedList from './MyWatchedList';
import { useAuthStore } from '../../../store/authStore';
import type { Forum, ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

type MySegment = 'forums' | 'posts' | 'watching';

interface Props {
  onForumPress: (forum: Forum) => void;
  onTopicPress: (
    topic: ForumTopic,
    opts?: { jumpToLast?: boolean; autoAction?: 'like' | 'reply' | 'quote' },
  ) => void;
  topInset?: number;
}

export default function MyView({ onForumPress, onTopicPress, topInset = 0 }: Props) {
  const [segment, setSegment] = useState<MySegment>('forums');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <SegmentBar
        segment={segment}
        onChange={setSegment}
        styles={styles}
      />
      {!isAuthenticated ? (
        <SignInPrompt styles={styles} />
      ) : segment === 'forums' ? (
        <MyForumsList onForumPress={onForumPress} />
      ) : segment === 'posts' ? (
        <MyPostsList onTopicPress={onTopicPress} />
      ) : (
        <MyWatchedList onTopicPress={onTopicPress} />
      )}
    </View>
  );
}

function SegmentBar({
  segment,
  onChange,
  styles,
}: {
  segment: MySegment;
  onChange: (s: MySegment) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.segmentWrap}>
      <SegmentPill label="Forums"   active={segment === 'forums'}   onPress={() => onChange('forums')}   styles={styles} />
      <SegmentPill label="Posts"    active={segment === 'posts'}    onPress={() => onChange('posts')}    styles={styles} />
      <SegmentPill label="Watching" active={segment === 'watching'} onPress={() => onChange('watching')} styles={styles} />
    </View>
  );
}

function SegmentPill({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      hitSlop={6}
    >
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function SignInPrompt({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  const colors = useThemeStore((s) => s.colors);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();

  const goToAuth = (screen: 'Login' | 'Register') => {
    navigation.getParent()?.getParent()?.navigate('Auth', { screen });
  };

  return (
    <View style={styles.signInWrap}>
      <View style={styles.signInIcon}>
        <Ionicons name="bookmark-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.signInTitle}>Sign in to see your activity</Text>
      <Text style={styles.signInSubtitle}>
        Track your favourite forums, posts, and watched topics in one place.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        onPress={() => goToAuth('Login')}
      >
        <Text style={styles.primaryBtnText}>Sign In</Text>
      </Pressable>
      <Pressable onPress={() => goToAuth('Register')} hitSlop={8}>
        <Text style={styles.signInFooterLink}>Create an account</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    segmentWrap: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 6,
      backgroundColor: c.bg,
    },
    pill: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: c.surface,
      alignItems: 'center',
    },
    pillActive: {
      backgroundColor: c.primary,
    },
    pillLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    pillLabelActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    signInWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    signInIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    signInTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
    },
    signInSubtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 8,
    },
    primaryBtn: {
      backgroundColor: c.primary,
      paddingVertical: 12,
      paddingHorizontal: 40,
      borderRadius: 10,
      marginTop: 4,
    },
    primaryBtnPressed: {
      opacity: 0.85,
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    signInFooterLink: {
      fontSize: 13,
      fontWeight: '600',
      color: c.primary,
      marginTop: 6,
    },
  });
}
