import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Share } from 'react-native';
import type { TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
  const showHandle = !!(
    profile.userName &&
    profile.displayName &&
    profile.userName !== profile.displayName
  );
  const rank = profile.rankName || profile.groupName;
  const bio = ((profile.raw as { bio?: string | null }).bio || '').trim();

  const onShare = async () => {
    const handle = profile.userName || String(profile.userId);
    const url = `https://www.indiaforums.com/u/${handle}`;
    try {
      await Share.share({
        message: `${displayName}'s profile on Indiaforums\n${url}`,
        url,
      });
    } catch {
      // user dismissed or share failed; non-critical
    }
  };

  return (
    <View style={styles.card}>
      {/* Cover banner — image or gradient fallback. No overlaid actions. */}
      <View style={styles.cover}>
        {profile.bannerUrl ? (
          <>
            <Image
              source={profile.bannerUrl}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={styles.coverScrim} />
          </>
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.primarySoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>

      <View style={styles.body}>
        {/* Row 1: avatar (overlapping cover) + action pills aligned to its bottom */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarBox}>
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

          <View style={styles.actionPills}>
            {isOwn ? (
              <Pressable
                onPress={onEdit}
                hitSlop={6}
                style={({ pressed }) => [styles.editPill, pressed && styles.pillPressed]}
                accessibilityLabel="Edit profile"
              >
                <Ionicons name="create-outline" size={14} color={colors.text} />
                <Text style={styles.editPillText}>Edit</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onShare}
              hitSlop={6}
              style={({ pressed }) => [styles.iconPill, pressed && styles.pillPressed]}
              accessibilityLabel="Share profile"
            >
              <Ionicons name="share-outline" size={16} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Identity block — left aligned */}
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        {showHandle ? (
          <Text style={styles.handle} numberOfLines={1}>
            @{profile.userName}
          </Text>
        ) : null}

        {rank ? (
          <View style={styles.rankPill}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        ) : null}

        {bio ? (
          <ExpandableText
            text={bio}
            maxLines={4}
            textStyle={styles.bio}
            toggleStyle={styles.showMore}
          />
        ) : null}

        {profile.statusMessage ? (
          <Text style={styles.status} numberOfLines={3}>
            {profile.statusMessage}
          </Text>
        ) : null}

        {/* Action row only for other-user view (Add Friend / Message) */}
        {!isOwn ? (
          <BuddyActionBar profile={profile} onMessage={onMessage} styles={styles} colors={colors} />
        ) : null}
      </View>
    </View>
  );
}

interface ExpandableTextProps {
  text: string;
  maxLines: number;
  textStyle: TextStyle | TextStyle[];
  toggleStyle: TextStyle | TextStyle[];
}

// Truncates `text` to `maxLines`, then reveals a "Show more" toggle when the
// natural line count exceeds the cap. The hidden measurer renders the full
// text invisibly so we know whether truncation actually happened — avoids the
// false-positive of "Show more" appearing on text that's exactly maxLines tall.
function ExpandableText({ text, maxLines, textStyle, toggleStyle }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  return (
    <View>
      <Text
        style={[textStyle, expandableStyles.measurer]}
        onTextLayout={(e) => {
          setCanExpand(e.nativeEvent.lines.length > maxLines);
        }}
      >
        {text}
      </Text>

      <Text style={textStyle} numberOfLines={expanded ? undefined : maxLines}>
        {text}
      </Text>

      {canExpand ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          hitSlop={6}
          accessibilityRole="button"
        >
          <Text style={toggleStyle}>{expanded ? 'Show less' : 'Show more'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const expandableStyles = StyleSheet.create({
  measurer: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
  },
});

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
      height: 110,
      width: '100%',
      backgroundColor: c.primarySoft,
    },
    coverScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },

    body: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginTop: -40,
      marginBottom: 10,
      gap: 8,
    },
    avatarBox: {
      position: 'relative',
    },
    actionPills: {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      // sit slightly above the avatar baseline so the pills feel anchored to
      // the cover edge rather than dropping below the avatar
      marginBottom: 6,
    },
    editPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      height: 32,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    editPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      letterSpacing: 0.1,
    },
    iconPill: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    pillPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.97 }],
    },
    onlineDot: {
      position: 'absolute',
      right: 4,
      bottom: 4,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.success,
      borderWidth: 2,
      borderColor: c.card,
    },
    name: {
      fontSize: 22,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.4,
    },
    handle: {
      fontSize: 13,
      color: c.textTertiary,
      marginTop: 2,
    },
    rankPill: {
      alignSelf: 'flex-start',
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
    bio: {
      marginTop: 12,
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
    },
    showMore: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '600',
      color: c.primary,
      letterSpacing: 0.1,
    },
    status: {
      marginTop: 8,
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
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
      color: c.onPrimary,
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
