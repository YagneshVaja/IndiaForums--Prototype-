import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import Avatar from './Avatar';
import type { NormalizedProfile } from '../hooks/useProfile';
import { useBuddyActions } from '../hooks/useBuddyActions';

interface Props {
  profile: NormalizedProfile;
  onEdit?: () => void;
  onMessage?: () => void;
  onBlockToggle?: (blocked: boolean) => void;
}

export default function ProfileHero({ profile, onEdit, onMessage }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isOwn = profile.isOwnProfile;

  const isOnline = useMemo(() => {
    const raw = profile.lastVisitedDate;
    if (!raw) return false;
    const d = new Date(raw);
    return !isNaN(d.getTime()) && Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
  }, [profile.lastVisitedDate]);

  const displayName = profile.displayName || profile.userName || 'User';
  const rank = profile.rankName || profile.groupName;

  return (
    <View style={styles.card}>
      {/* Banner */}
      <View style={styles.cover}>
        {profile.bannerUrl ? (
          <Image source={profile.bannerUrl} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
        ) : null}
        <View style={styles.coverOverlay} />
      </View>

      <View style={styles.body}>
        <View style={styles.avatarRow}>
          <Avatar
            url={profile.avatarUrl}
            userId={profile.userId}
            updateChecksum={profile.updateChecksum}
            name={displayName}
            size={80}
            ring
          />
          {isOnline ? <View style={styles.onlineDot} /> : null}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        {profile.userName && profile.displayName && profile.userName !== profile.displayName ? (
          <Text style={styles.handle} numberOfLines={1}>@{profile.userName}</Text>
        ) : null}

        {rank ? (
          <View style={styles.rankPill}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        ) : null}

        {profile.statusMessage ? (
          <Text style={styles.status} numberOfLines={3}>
            {profile.statusMessage}
          </Text>
        ) : null}

        {/* Actions — differs by self vs other */}
        {isOwn ? (
          <View style={styles.actions}>
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
            >
              <Ionicons name="create-outline" size={16} color="#FFF" />
              <Text style={styles.primaryBtnText}>Edit Profile</Text>
            </Pressable>
          </View>
        ) : (
          <BuddyActionBar profile={profile} onMessage={onMessage} styles={styles} colors={colors} />
        )}
      </View>
    </View>
  );
}

interface BuddyBarProps {
  profile: NormalizedProfile;
  onMessage?: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

function BuddyActionBar({ profile, onMessage, styles, colors }: BuddyBarProps) {
  const bd = profile.buddyDetails;
  // Backend codes: friend 1 = friends; 2 = request pending; 0 = none. block 1 = blocked.
  const friend = typeof bd?.friend === 'string' ? parseInt(bd.friend, 10) : bd?.friend ?? 0;
  const blocked = typeof bd?.block === 'string' ? parseInt(bd.block, 10) : bd?.block ?? 0;
  const actions = useBuddyActions({
    userId: profile.userId,
    requestId: bd?.userMapId ?? null,
    isFriend: friend === 1,
  });

  const busy =
    actions.send.isPending ||
    actions.accept.isPending ||
    actions.cancel.isPending ||
    actions.block.isPending;

  let primary: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; kind: 'primary' | 'outline' };
  if (blocked === 1) {
    primary = { label: 'Unblock', icon: 'ban-outline', kind: 'outline', onPress: () => actions.block.mutate(false) };
  } else if (friend === 1) {
    primary = {
      label: 'Friends',
      icon: 'checkmark-circle-outline',
      kind: 'outline',
      onPress: () => actions.cancel.mutate(),
    };
  } else if (friend === 2) {
    primary = { label: 'Pending', icon: 'time-outline', kind: 'outline', onPress: () => actions.cancel.mutate() };
  } else {
    primary = { label: 'Add Friend', icon: 'person-add-outline', kind: 'primary', onPress: () => actions.send.mutate() };
  }

  return (
    <View style={styles.actions}>
      <Pressable
        onPress={primary.onPress}
        disabled={busy}
        style={({ pressed }) => [
          primary.kind === 'primary' ? styles.primaryBtn : styles.outlineBtn,
          pressed && styles.btnPressed,
          busy && styles.btnDisabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={primary.kind === 'primary' ? '#FFF' : colors.text} />
        ) : (
          <>
            <Ionicons
              name={primary.icon}
              size={16}
              color={primary.kind === 'primary' ? '#FFF' : colors.text}
            />
            <Text style={primary.kind === 'primary' ? styles.primaryBtnText : styles.outlineBtnText}>
              {primary.label}
            </Text>
          </>
        )}
      </Pressable>
      <Pressable
        onPress={onMessage}
        style={({ pressed }) => [styles.outlineBtn, pressed && styles.btnPressed]}
      >
        <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
        <Text style={styles.outlineBtnText}>Message</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    cover: {
      height: 100,
      width: '100%',
      backgroundColor: c.primary,
    },
    coverOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(53, 88, 240, 0.2)',
    },
    body: {
      paddingHorizontal: 20,
      paddingBottom: 18,
      alignItems: 'center',
      marginTop: -44,
    },
    avatarRow: {
      position: 'relative',
    },
    onlineDot: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#1F9254',
      borderWidth: 2,
      borderColor: c.card,
    },
    name: {
      fontSize: 20,
      fontWeight: '800',
      color: c.text,
      marginTop: 10,
      letterSpacing: -0.3,
    },
    handle: {
      fontSize: 13,
      color: c.textTertiary,
      marginTop: 2,
    },
    rankPill: {
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    rankText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    status: {
      marginTop: 10,
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 8,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      width: '100%',
    },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      height: 42,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    outlineBtn: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    outlineBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    btnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    btnDisabled: {
      opacity: 0.6,
    },
  });
}
