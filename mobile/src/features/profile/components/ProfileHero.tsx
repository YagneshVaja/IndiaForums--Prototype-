import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Share, Linking, Alert } from 'react-native';
import type { TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import Avatar from './Avatar';
import type { NormalizedProfile } from '../hooks/useProfile';
import { useBuddyActions } from '../hooks/useBuddyActions';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import ReportUserSheet from './ReportUserSheet';
import { getGroupName } from '../utils/groups';
import { usePronoun } from '../utils/profileLocalCache';

interface Props {
  profile: NormalizedProfile;
  onEdit?: () => void;
  onMessage?: () => void;
  onBlockToggle?: (blocked: boolean) => void;
}

export default function ProfileHero({ profile, onEdit: _onEdit, onMessage }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const isOwn = profile.isOwnProfile;
  const qc = useQueryClient();

  // Quick-edit pickers — refetch /me after upload so hero + EditProfile both
  // pick up the new URL without a manual reload.
  const invalidateProfile = () => qc.invalidateQueries({ queryKey: ['profile'] });
  const avatarPicker = usePhotoPicker({ variant: 'avatar', onUploaded: invalidateProfile });
  const bannerPicker = usePhotoPicker({ variant: 'banner', onUploaded: invalidateProfile });

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
  // The OpenAPI spec only returns `groupId` (numeric) — never the rank text —
  // and doesn't expose `pronoun` on any read endpoint. So:
  //   - rank: resolved client-side from groupId via a lookup table
  //   - pronoun: read from a dedicated SecureStore-backed query, independent
  //     of /me, so the hero always reflects the cached value regardless of
  //     when the profile query last ran. Falls back to raw.pronoun in case a
  //     future API version starts returning it.
  const rawProfile = profile.raw as unknown as Partial<{
    bio: string | null;
    pronoun: string | null;
  }>;
  const rank = getGroupName(profile.groupId);
  const bio = (rawProfile.bio || '').trim();
  const cachedPronoun = usePronoun(profile.isOwnProfile ? profile.userId : null);
  const pronoun = (cachedPronoun || rawProfile.pronoun || '').trim();

  // Country flag — convert ISO 3166-1 alpha-2 country codes to a regional
  // indicator emoji (e.g. "IN" → 🇮🇳). Backend already gates on showCountry,
  // so just render whenever countryCode is present.
  const flag = useMemo(() => flagEmoji(profile.countryCode), [profile.countryCode]);

  // Social links live on raw — UpdateProfileCommand can write them but the
  // typed schema doesn't list them on read. The API returns them in practice.
  const socials = useMemo(() => {
    const r = profile.raw as Partial<Record<'facebook' | 'twitter' | 'instagram' | 'youtube', string | null>>;
    return [
      { key: 'facebook' as const, value: (r.facebook || '').trim() },
      { key: 'twitter' as const, value: (r.twitter || '').trim() },
      { key: 'instagram' as const, value: (r.instagram || '').trim() },
      { key: 'youtube' as const, value: (r.youtube || '').trim() },
    ].filter((s) => s.value.length > 0);
  }, [profile.raw]);

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
      {/* Cover banner — image or gradient fallback. */}
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
        {isOwn ? (
          <Pressable
            onPress={bannerPicker.uploading ? undefined : bannerPicker.pick}
            hitSlop={6}
            accessibilityLabel="Change cover photo"
            style={({ pressed }) => [styles.coverEditBtn, pressed && styles.coverEditPressed]}
          >
            {bannerPicker.uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="camera" size={14} color="#FFF" />
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        {/* Avatar overlapping the cover. Visitor profiles get the action
            pills (Share + overflow) on the right; own profile shows nothing
            here — the user reaches Edit via the Settings cog in the top
            bar, freeing this space for a cleaner horizontal identity row. */}
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
            {isOnline && !isOwn ? <View style={styles.onlineDot} /> : null}
            {isOwn ? (
              <Pressable
                onPress={avatarPicker.uploading ? undefined : avatarPicker.pick}
                hitSlop={6}
                accessibilityLabel="Change profile photo"
                style={({ pressed }) => [styles.avatarEditBtn, pressed && styles.avatarEditPressed]}
              >
                {avatarPicker.uploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="camera" size={12} color="#FFF" />
                )}
              </Pressable>
            ) : null}
          </View>

          {!isOwn ? (
            <View style={styles.actionPills}>
              <Pressable
                onPress={onShare}
                hitSlop={6}
                style={({ pressed }) => [styles.iconPill, pressed && styles.pillPressed]}
                accessibilityLabel="Share profile"
              >
                <Ionicons name="share-outline" size={16} color={colors.text} />
              </Pressable>
              <OverflowMenu profile={profile} colors={colors} styles={styles} />
            </View>
          ) : null}
        </View>

        {/* Identity block — Instagram/Threads-inspired hierarchy:
            • Row 1 (heading): display name + flag + pronoun pill inline.
              Pronoun is identity-level info, so it pairs with the name —
              not buried at the end of the meta footer.
            • Row 2 (meta): @handle · rank, both quiet gray text.
            Two rows keeps each scannable; horizontal flow within each row
            keeps the block compact. Pronoun pill on row 1 wraps gracefully
            if the name is long. */}
        <View style={styles.identityBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {flag ? <Text style={styles.flag}>{flag}</Text> : null}
            {pronoun ? (
              <View style={styles.pronounPill}>
                <Text style={styles.pronounText}>{pronoun}</Text>
              </View>
            ) : null}
          </View>
          {showHandle || rank ? (
            <View style={styles.metaRow}>
              {showHandle ? (
                <Text style={styles.handle} numberOfLines={1}>
                  @{profile.userName}
                </Text>
              ) : null}
              {showHandle && rank ? <Text style={styles.dot}>·</Text> : null}
              {rank ? (
                <Text style={styles.rank} numberOfLines={1}>
                  {rank}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

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

        {socials.length > 0 ? (
          <View style={styles.socialRow}>
            {socials.map((s) => (
              <SocialIconLink key={s.key} platform={s.key} value={s.value} colors={colors} styles={styles} />
            ))}
          </View>
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

// ── Helpers ────────────────────────────────────────────────────────────────

// ISO 3166-1 alpha-2 → regional-indicator emoji (e.g. "IN" → "🇮🇳").
function flagEmoji(iso2: string | null): string | null {
  if (!iso2 || iso2.length !== 2) return null;
  const code = iso2.toUpperCase();
  const a = code.charCodeAt(0);
  const b = code.charCodeAt(1);
  if (a < 65 || a > 90 || b < 65 || b > 90) return null;
  return String.fromCodePoint(0x1f1e6 + a - 65) + String.fromCodePoint(0x1f1e6 + b - 65);
}

const SOCIAL_ICONS: Record<
  'facebook' | 'twitter' | 'instagram' | 'youtube',
  { icon: keyof typeof Ionicons.glyphMap; color: string; baseUrl: string }
> = {
  facebook: { icon: 'logo-facebook', color: '#1877F2', baseUrl: 'https://facebook.com/' },
  twitter: { icon: 'logo-twitter', color: '#1DA1F2', baseUrl: 'https://x.com/' },
  instagram: { icon: 'logo-instagram', color: '#E4405F', baseUrl: 'https://instagram.com/' },
  youtube: { icon: 'logo-youtube', color: '#FF0000', baseUrl: 'https://youtube.com/' },
};

// Resolves the user-entered value (handle or full URL) to an openable URL.
// Bare "@handle" gets the @ stripped and pinned to the platform's base URL.
function resolveSocialUrl(platform: keyof typeof SOCIAL_ICONS, value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return SOCIAL_ICONS[platform].baseUrl + v.replace(/^@+/, '');
}

function SocialIconLink({
  platform,
  value,
  styles,
}: {
  platform: keyof typeof SOCIAL_ICONS;
  value: string;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  const meta = SOCIAL_ICONS[platform];
  const url = resolveSocialUrl(platform, value);
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => {})}
      hitSlop={6}
      accessibilityLabel={`Open ${platform}`}
      style={({ pressed }) => [
        styles.socialIcon,
        { backgroundColor: meta.color + '22' },
        pressed && { opacity: 0.78, transform: [{ scale: 0.95 }] },
      ]}
    >
      <Ionicons name={meta.icon} size={16} color={meta.color} />
    </Pressable>
  );
}

// Overflow menu (·· · ) — surfaced on other-user profiles only. Exposes
// Block/Unblock and Report. Other moderation actions (Mute, Copy link)
// would slot in here.
function OverflowMenu({
  profile,
  colors,
  styles,
}: {
  profile: NormalizedProfile;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  const bd = profile.buddyDetails;
  const blocked =
    (typeof bd?.block === 'string' ? parseInt(bd.block, 10) : bd?.block ?? 0) === 1;
  const friend = (typeof bd?.friend === 'string' ? parseInt(bd.friend, 10) : bd?.friend ?? 0) === 1;
  const actions = useBuddyActions({
    userId: profile.userId,
    requestId: bd?.userMapId ?? null,
    isFriend: friend,
  });
  const handle = profile.userName || profile.displayName || 'user';
  const [reportOpen, setReportOpen] = useState(false);

  const open = () => {
    const blockLabel = blocked ? `Unblock @${handle}` : `Block @${handle}`;
    const blockMessage = blocked
      ? `Allow @${handle} to message and tag you again?`
      : `@${handle} won't be able to message or tag you. You can unblock anytime.`;
    Alert.alert(`@${handle}`, undefined, [
      {
        text: blockLabel,
        style: blocked ? 'default' : 'destructive',
        onPress: () =>
          Alert.alert(blocked ? 'Unblock user?' : 'Block user?', blockMessage, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: blocked ? 'Unblock' : 'Block',
              style: blocked ? 'default' : 'destructive',
              onPress: () => actions.block.mutate(!blocked),
            },
          ]),
      },
      {
        text: `Report @${handle}`,
        style: 'destructive',
        onPress: () => setReportOpen(true),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <>
      <Pressable
        onPress={open}
        disabled={actions.block.isPending}
        hitSlop={6}
        accessibilityLabel="More options"
        style={({ pressed }) => [styles.iconPill, pressed && styles.pillPressed]}
      >
        {actions.block.isPending ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.text} />
        )}
      </Pressable>
      <ReportUserSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        userId={profile.userId}
        userHandle={handle}
      />
    </>
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
      height: 110,
      width: '100%',
      backgroundColor: c.primarySoft,
    },
    coverScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    coverEditBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverEditPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.96 }],
    },
    avatarEditBtn: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.card,
    },
    avatarEditPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.94 }],
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
    // Two-row identity. Tight 4px vertical gap glues the rows into a
    // single visual unit (heavy gap would split it into two blocks).
    identityBlock: {
      gap: 4,
    },
    // Row 1: name + flag + pronoun pill, all baseline-aligned. The name
    // can shrink/truncate so the pronoun pill never gets pushed off-screen
    // by a long display name.
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      columnGap: 8,
      rowGap: 4,
    },
    name: {
      flexShrink: 1,
      fontSize: 22,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.4,
      lineHeight: 26,
    },
    flag: {
      fontSize: 18,
      lineHeight: 22,
      // Pull the flag a hair closer to the name; the gap inside nameRow
      // is calibrated for word boundaries, the flag should hug the name.
      marginLeft: -2,
    },
    pronounPill: {
      paddingHorizontal: 9,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      // Tiny vertical nudge so the pill optical-centers with the cap-line
      // of the much taller name text next to it.
      marginTop: 2,
    },
    pronounText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
      letterSpacing: 0.3,
      lineHeight: 14,
    },
    // Row 2: @handle · rank — single muted meta line, Twitter-style.
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      columnGap: 6,
      rowGap: 2,
    },
    handle: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textTertiary,
      lineHeight: 20,
    },
    dot: {
      fontSize: 14,
      color: c.textTertiary,
      lineHeight: 20,
      opacity: 0.6,
    },
    rank: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      lineHeight: 20,
      letterSpacing: 0.1,
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
    socialRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    socialIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
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
