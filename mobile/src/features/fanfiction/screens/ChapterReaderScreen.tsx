import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import {
  fetchFanFictionChapter,
  fetchFanFictionDetail,
  type FanFictionChapter,
  type FanFictionDetail,
} from '../../../services/api';

import ReactionsStrip from '../components/ReactionsStrip';

function useFanFictionChapter(chapterId: string | undefined) {
  return useQuery<FanFictionChapter | null>({
    queryKey: ['fan-fiction', 'chapter', chapterId],
    queryFn: () => fetchFanFictionChapter(chapterId as string),
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });
}

function useFanFictionDetail(id: string | undefined) {
  return useQuery<FanFictionDetail | null>({
    queryKey: ['fan-fiction', 'detail', id],
    queryFn: () => fetchFanFictionDetail(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ChapterReader'>;
type R   = RouteProp<HomeStackParamList, 'ChapterReader'>;
type Styles = ReturnType<typeof makeStyles>;

type FontSize = 'sm' | 'md' | 'lg';
const FONT_SIZES: Record<FontSize, { body: number; line: number }> = {
  sm: { body: 14, line: 22 },
  md: { body: 16, line: 26 },
  lg: { body: 19, line: 30 },
};
const FONT_ORDER: FontSize[] = ['sm', 'md', 'lg'];
const FONT_LABELS: Record<FontSize, string> = { sm: 'A−', md: 'A', lg: 'A+' };

export default function ChapterReaderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { fanFictionId, chapterId } = route.params;

  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [progress, setProgress] = useState(0);

  const { data: detail } = useFanFictionDetail(fanFictionId);
  const { data: chapter, isLoading, isError, refetch } = useFanFictionChapter(chapterId);

  const chapters = detail?.chapters ?? [];
  const currentIdx = chapters.findIndex((c) => c.chapterId === chapterId);
  const prev = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const total = Math.max(1, contentSize.height - layoutMeasurement.height);
    const pct = Math.min(1, Math.max(0, contentOffset.y / total));
    setProgress(pct);
  };

  const cycleFont = () => {
    setFontSize((prev) => FONT_ORDER[(FONT_ORDER.indexOf(prev) + 1) % FONT_ORDER.length]);
  };

  const goTo = (id: string) => {
    navigation.setParams({ chapterId: id });
  };

  const htmlSource = useMemo(
    () => ({ html: chapter?.body ?? '' }),
    [chapter?.body],
  );

  const fs = FONT_SIZES[fontSize];
  const baseStyle = useMemo(
    () => ({ fontSize: fs.body, lineHeight: fs.line, color: colors.text }),
    [fs.body, fs.line, colors.text],
  );
  const tagsStyles = useMemo(
    () => ({
      p: { marginTop: 0, marginBottom: 14, color: colors.text },
      i: { fontStyle: 'italic' as const, color: colors.textSecondary },
      em: { fontStyle: 'italic' as const, color: colors.textSecondary },
      b: { fontWeight: '800' as const, color: colors.text },
      strong: { fontWeight: '800' as const, color: colors.text },
      a: { color: colors.primary, textDecorationLine: 'underline' as const },
      h1: { fontSize: fs.body + 6, fontWeight: '800' as const, marginTop: 12, marginBottom: 8, color: colors.text },
      h2: { fontSize: fs.body + 4, fontWeight: '800' as const, marginTop: 10, marginBottom: 6, color: colors.text },
      h3: { fontSize: fs.body + 2, fontWeight: '700' as const, marginTop: 8, marginBottom: 6, color: colors.text },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        paddingLeft: 12,
        marginVertical: 10,
        fontStyle: 'italic' as const,
        color: colors.textSecondary,
      },
    }),
    [fs.body, colors.text, colors.textSecondary, colors.primary],
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.toolbar, { paddingTop: insets.top }]}>
        <View style={styles.toolbarRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <View style={styles.breadcrumb}>
            <Text style={styles.crumbStory} numberOfLines={1}>
              {detail?.title ?? 'Fan Fiction'}
            </Text>
            <Text style={styles.crumbChapter} numberOfLines={1}>
              {chapter?.title ?? (isLoading ? 'Loading…' : 'Chapter')}
            </Text>
          </View>
          <Pressable onPress={cycleFont} hitSlop={8} style={styles.fontBtn}>
            <Text style={styles.fontBtnText}>{FONT_LABELS[fontSize]}</Text>
          </Pressable>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError || !chapter ? (
        <ErrorState message="Couldn't load this chapter" onRetry={() => refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={32}
        >
          <View style={styles.chapterHero}>
            <Text style={styles.chapterEyebrow}>
              {chapter.orderNumber ? `CHAPTER ${chapter.orderNumber}` : 'CHAPTER'}
            </Text>
            <Text style={styles.chapterTitle}>{chapter.title}</Text>
            <View style={styles.metaRow}>
              {chapter.published ? (
                <>
                  <Ionicons name="calendar-outline" size={11} color={colors.textTertiary} />
                  <Text style={styles.metaText}>{formatDate(chapter.published)}</Text>
                  <Text style={styles.metaDot}>·</Text>
                </>
              ) : null}
              <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
              <Text style={styles.metaText}>{chapter.readingTime}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Ionicons name="eye-outline" size={11} color={colors.textTertiary} />
              <Text style={styles.metaText}>{formatCount(chapter.viewCount)}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Ionicons name="heart-outline" size={11} color={colors.textTertiary} />
              <Text style={styles.metaText}>{formatCount(chapter.likeCount)}</Text>
            </View>
            {(chapter.membersOnly || chapter.mature) ? (
              <View style={styles.flagsRow}>
                {chapter.membersOnly ? <Text style={styles.flagMembers}>🔒 Members only</Text> : null}
                {chapter.mature      ? <Text style={styles.flagMature}>18+ Mature</Text> : null}
              </View>
            ) : null}
          </View>

          <View style={styles.bodyWrap}>
            {chapter.isHtml ? (
              <RenderHtml
                contentWidth={width - 28}
                source={htmlSource}
                baseStyle={baseStyle}
                tagsStyles={tagsStyles}
              />
            ) : (
              <Text style={[styles.plainBody, { fontSize: fs.body, lineHeight: fs.line }]}>
                {chapter.body}
              </Text>
            )}
          </View>

          {chapter.reactions ? <ReactionsStrip reactions={chapter.reactions} /> : null}

          <View style={styles.footerNav}>
            <NavBtn
              styles={styles}
              colors={colors}
              disabled={!prev}
              icon="chevron-back"
              label="Previous"
              sub={prev?.chapterTitle ?? 'Start of story'}
              onPress={() => prev && goTo(prev.chapterId)}
              align="left"
            />
            <NavBtn
              styles={styles}
              colors={colors}
              disabled={!next}
              icon="chevron-forward"
              label="Next"
              sub={next?.chapterTitle ?? 'End of story'}
              onPress={() => next && goTo(next.chapterId)}
              align="right"
            />
          </View>

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backToStory, pressed && styles.backToStoryPressed]}
          >
            <Ionicons name="list" size={14} color={colors.textSecondary} />
            <Text style={styles.backToStoryText}>Back to chapter list</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function NavBtn({
  styles, colors, disabled, icon, label, sub, onPress, align,
}: {
  styles: Styles;
  colors: ThemeColors;
  disabled: boolean;
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  sub: string;
  onPress: () => void;
  align: 'left' | 'right';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.navBtn,
        disabled && styles.navBtnDisabled,
        pressed && !disabled && styles.navBtnPressed,
      ]}
    >
      {align === 'left' ? (
        <Ionicons name={icon} size={16} color={disabled ? colors.textTertiary : colors.primary} />
      ) : null}
      <View style={[styles.navBtnText, { alignItems: align === 'left' ? 'flex-start' : 'flex-end' }]}>
        <Text style={[styles.navLabel, disabled && styles.navLabelDisabled]}>{label}</Text>
        <Text style={[styles.navSub, disabled && styles.navSubDisabled]} numberOfLines={1}>{sub}</Text>
      </View>
      {align === 'right' ? (
        <Ionicons name={icon} size={16} color={disabled ? colors.textTertiary : colors.primary} />
      ) : null}
    </Pressable>
  );
}

function formatDate(d: string | null): string {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function formatCount(n: number): string {
  if (!n) return '0';
  if (n >= 100_000) return (n / 100_000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (n >= 1_000)   return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.card },
    toolbar: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    toolbarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      height: 52,
    },
    iconBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    breadcrumb: { flex: 1, gap: 1 },
    crumbStory: { fontSize: 10, fontWeight: '700', color: c.textTertiary, letterSpacing: 0.3 },
    crumbChapter: { fontSize: 13, fontWeight: '800', color: c.text },
    fontBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: c.surface,
      minWidth: 38,
      alignItems: 'center',
    },
    fontBtnText: { fontSize: 13, fontWeight: '800', color: c.primary },
    progressTrack: {
      height: 3,
      backgroundColor: c.surface,
    },
    progressFill: {
      height: 3,
      backgroundColor: c.primary,
    },
    scrollContent: { paddingBottom: 40 },
    chapterHero: {
      paddingHorizontal: 14,
      paddingTop: 22,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 6,
    },
    chapterEyebrow: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 1.2,
    },
    chapterTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: c.text,
      lineHeight: 28,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
      marginTop: 4,
    },
    metaText: { fontSize: 11, color: c.textTertiary, fontWeight: '600' },
    metaDot: { color: c.textTertiary, marginHorizontal: 2 },
    flagsRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
    flagMembers: {
      fontSize: 9,
      fontWeight: '700',
      color: '#B45309',
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    flagMature: {
      fontSize: 9,
      fontWeight: '700',
      color: '#991B1B',
      backgroundColor: '#FEE2E2',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    bodyWrap: { paddingHorizontal: 14, paddingTop: 18 },
    plainBody: { color: c.text },
    footerNav: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 12,
      marginTop: 18,
    },
    navBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    navBtnDisabled: { opacity: 0.55 },
    navBtnPressed: { backgroundColor: c.border },
    navBtnText: { flex: 1, gap: 2 },
    navLabel: { fontSize: 10, fontWeight: '800', color: c.primary, letterSpacing: 0.4 },
    navLabelDisabled: { color: c.textTertiary },
    navSub: { fontSize: 12, fontWeight: '700', color: c.text },
    navSubDisabled: { color: c.textTertiary },
    backToStory: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginHorizontal: 12,
      marginTop: 14,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    backToStoryPressed: { backgroundColor: c.border },
    backToStoryText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  });
}
