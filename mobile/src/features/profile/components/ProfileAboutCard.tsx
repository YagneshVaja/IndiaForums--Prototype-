import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { countryFlag } from '../../forums/utils/format';
import { stripHtml, timeAgo, fmtDate } from '../utils/format';
import type { NormalizedProfile } from '../hooks/useProfile';
import type { MyProfileResponseDto } from '../types';

interface Props {
  profile: NormalizedProfile;
}

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
  iconColor: string;
  last?: boolean;
};

function Row({ icon, label, value, styles, iconColor, last }: RowProps) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileAboutCard({ profile }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const isOwn = profile.isOwnProfile;
  const meRaw = isOwn ? (profile.raw as MyProfileResponseDto) : null;

  // Pull bio off the raw payload — not part of the typed DTO but present in
  // practice on /me responses.
  const bio = ((profile.raw as { bio?: string | null }).bio || '').trim();
  const signature = stripHtml(profile.forumSignature).trim();

  const flag = countryFlag(profile.countryCode);
  const countryLine = flag
    ? `${flag} ${profile.countryCode}`
    : profile.countryCode || '';

  const visitStreakRaw = meRaw?.visitStreakCount;
  const visitStreak = (() => {
    if (visitStreakRaw == null) return 0;
    const n = typeof visitStreakRaw === 'string' ? parseInt(visitStreakRaw, 10) : visitStreakRaw;
    return Number.isFinite(n) ? Number(n) : 0;
  })();

  const lastVisited = profile.lastVisitedDate;
  const isOnline = (() => {
    if (!lastVisited) return false;
    const d = new Date(lastVisited);
    return !isNaN(d.getTime()) && Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
  })();
  const lastActiveLabel = (() => {
    if (!lastVisited) return '';
    if (isOnline) return 'Online today';
    return `Active ${timeAgo(lastVisited)}`;
  })();

  const joinDateLong = fmtDate(profile.joinDate);
  const emailVerified = meRaw?.isEmailConfirmed;

  // Build the rows we actually have data for.
  const rows: { icon: RowProps['icon']; label: string; value: string }[] = [];
  if (countryLine) rows.push({ icon: 'location-outline', label: 'Country', value: countryLine });
  if (joinDateLong) rows.push({ icon: 'calendar-outline', label: 'Joined', value: joinDateLong });
  if (lastActiveLabel) rows.push({ icon: 'time-outline', label: 'Last active', value: lastActiveLabel });
  if (visitStreak > 0) {
    rows.push({
      icon: 'flame-outline',
      label: 'Visit streak',
      value: `${visitStreak} day${visitStreak === 1 ? '' : 's'}`,
    });
  }
  if (isOwn && typeof emailVerified === 'boolean') {
    rows.push({
      icon: emailVerified ? 'shield-checkmark-outline' : 'alert-circle-outline',
      label: 'Email',
      value: emailVerified ? 'Verified' : 'Not verified',
    });
  }

  const hasContent = !!(bio || signature || rows.length > 0);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>About</Text>

      {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      {!hasContent ? (
        <Text style={styles.empty}>
          {isOwn
            ? 'Add a bio, country, and more from Edit Profile to fill out your About section.'
            : 'This user hasn’t added any About details yet.'}
        </Text>
      ) : null}

      {rows.length > 0 ? (
        <View style={styles.rows}>
          {rows.map((r, i) => (
            <Row
              key={r.label}
              icon={r.icon}
              label={r.label}
              value={r.value}
              styles={styles}
              iconColor={colors.primary}
              last={i === rows.length - 1}
            />
          ))}
        </View>
      ) : null}

      {signature ? (
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Forum signature</Text>
          <Text style={styles.signatureText}>{signature}</Text>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    heading: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    bio: {
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
      marginBottom: 12,
    },
    empty: {
      fontSize: 13,
      color: c.textTertiary,
      lineHeight: 19,
      fontStyle: 'italic',
    },
    rows: {
      borderRadius: 10,
      backgroundColor: c.surface,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
      gap: 10,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowIcon: {
      width: 24,
      alignItems: 'center',
    },
    rowLabel: {
      fontSize: 13,
      color: c.textSecondary,
      width: 100,
    },
    rowValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
      textAlign: 'right',
    },
    signatureBlock: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    signatureLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    signatureText: {
      fontSize: 13,
      fontStyle: 'italic',
      color: c.textSecondary,
      lineHeight: 19,
    },
  });
}
