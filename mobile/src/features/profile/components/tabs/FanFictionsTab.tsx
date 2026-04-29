import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import type { UserFanFictionDto } from '../../types';
import { fmtNum, timeAgo, stripHtml } from '../../utils/format';
import SubFilterPills, { type SubFilter } from '../SubFilterPills';
import FFollowingTab from './FFollowingTab';

interface Props {
  userId: number | string;
  isOwn: boolean;
}

type Section = 'stories' | 'following' | 'followers';

// Web's FANFICTIONS dropdown contains: My Stories / Following / Followers.
// On mobile we expose the same as a sub-filter pill row inside the tab.
// Following + Followers only make sense on own profile — the API doesn't
// expose other-user FF following lists yet.
export default function FanFictionsTab({ userId, isOwn }: Props) {
  const filters = useMemo<SubFilter<Section>[]>(() => {
    if (!isOwn) return [{ key: 'stories', label: 'Stories' }];
    return [
      { key: 'stories', label: 'My Stories' },
      { key: 'following', label: 'Following' },
      { key: 'followers', label: 'Followers' },
    ];
  }, [isOwn]);
  const [section, setSection] = useState<Section>('stories');

  // The FF following/followers panels are entire tabs of their own — we
  // delegate. The pill row is hidden on other-user profiles where there's
  // only one section to show.
  return (
    <>
      {filters.length > 1 ? (
        <SubFilterPills filters={filters} active={section} onChange={setSection} />
      ) : null}
      {section === 'stories' ? <StoriesList userId={userId} isOwn={isOwn} /> : null}
      {section === 'following' ? <FFollowingTab userId={userId} variant="following" /> : null}
      {section === 'followers' ? <FFollowingTab userId={userId} variant="followers" /> : null}
    </>
  );
}

function StoriesList({ userId, isOwn }: { userId: number | string; isOwn: boolean }) {
  const [page, setPage] = useState(1);
  const q = useProfileTab({ tab: 'fan-fictions', userId, isOwn, page });
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const data = q.data && q.data.kind === 'fan-fictions' ? q.data : null;
  const items = data?.items ?? [];

  const open = (ff: UserFanFictionDto) => {
    if (ff.ffPageUrl) Linking.openURL(`https://www.indiaforums.com${ff.ffPageUrl}`).catch(() => {});
  };

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={!q.isLoading && items.length === 0}
      emptyIcon="book-outline"
      emptyTitle={isOwn ? "You haven't published any fan fiction yet" : 'No fan fiction to show'}
      emptySubtitle={
        isOwn ? 'Stories you author will appear here once they go live.' : undefined
      }
      page={data?.page}
      totalPages={data?.totalPages}
      onPageChange={setPage}
    >
      <View style={styles.list}>
        {items.map((ff) => (
          <FanFictionRow
            key={String(ff.fanFictionId)}
            ff={ff}
            styles={styles}
            colors={colors}
            onPress={() => open(ff)}
          />
        ))}
      </View>
    </TabShell>
  );
}

function FanFictionRow({
  ff,
  styles,
  colors,
  onPress,
}: {
  ff: UserFanFictionDto;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const summary = stripHtml(ff.summary);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {ff.ffThumbnail ? (
        <Image source={ff.ffThumbnail} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="book" size={20} color={colors.primary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {ff.title || 'Untitled'}
        </Text>
        {summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="document-text-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.meta}>{fmtNum(ff.chapterCount)} ch</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="eye-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.meta}>{fmtNum(ff.totalViewCount)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="heart-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.meta}>{fmtNum(ff.totalLikeCount)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.meta}>{fmtNum(ff.totalFollowers)}</Text>
          </View>
          <Text style={styles.metaTime}>{timeAgo(ff.lastUpdatedWhen)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: {
      gap: 10,
      paddingVertical: 8,
    },
    row: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    rowPressed: {
      opacity: 0.88,
    },
    thumb: {
      width: 64,
      height: 88,
      borderRadius: 8,
      backgroundColor: c.surface,
    },
    thumbFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    body: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      lineHeight: 19,
    },
    summary: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    meta: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
    },
    metaTime: {
      fontSize: 11,
      color: c.textTertiary,
      marginLeft: 'auto',
    },
  });
}
