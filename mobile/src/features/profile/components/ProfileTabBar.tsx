import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { ProfileTabKey } from '../hooks/useProfileTab';
import { fmtNum } from '../utils/format';

export interface Tab {
  key: ProfileTabKey;
  label: string;
  count?: number | string | null;
}

// Tab order mirrors the web /my page (Activity → Badges → Posts → Comments →
// Buddies → Fan Fiction → Favorites → Forums). Scrapbook/Slambook/Testimonial
// and FF Following/Followers live as sub-filters inside Activity and Fan
// Fiction respectively, matching web's dropdown chevrons.
const BASE_TABS: Tab[] = [
  { key: 'activity', label: 'Activity' },
  { key: 'badges', label: 'Badges' },
  { key: 'posts', label: 'Posts' },
  { key: 'comments', label: 'Comments' },
  { key: 'buddies', label: 'Buddies' },
  { key: 'fan-fictions', label: 'Fan Fiction' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'forums', label: 'Forums' },
];

const SELF_TABS: Tab[] = [
  { key: 'drafts', label: 'Drafts' },
  { key: 'watching', label: 'Watching' },
  { key: 'warnings', label: 'Warnings' },
];

export interface TabCounts {
  posts?: number | string | null;
  comments?: number | string | null;
  badges?: number | string | null;
  buddies?: number | string | null;
}

export function tabsFor(isOwn: boolean, counts?: TabCounts): Tab[] {
  const base = isOwn ? [...BASE_TABS, ...SELF_TABS] : [...BASE_TABS];
  if (!counts) return base;
  return base.map((t) => {
    if (t.key === 'posts') return { ...t, count: counts.posts };
    if (t.key === 'comments') return { ...t, count: counts.comments };
    if (t.key === 'badges') return { ...t, count: counts.badges };
    if (t.key === 'buddies') return { ...t, count: counts.buddies };
    return t;
  });
}

interface Props {
  tabs: Tab[];
  active: ProfileTabKey;
  onChange: (key: ProfileTabKey) => void;
}

export default function ProfileTabBar({ tabs, active, onChange }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView | null>(null);
  const chipRefs = useRef<Record<string, { x: number; w: number } | undefined>>({});

  // Auto-scroll to keep the active chip visible when tab changes.
  useEffect(() => {
    const target = chipRefs.current[active];
    if (target && scrollRef.current) {
      scrollRef.current.scrollTo({ x: Math.max(0, target.x - 40), animated: true });
    }
  }, [active]);

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map((t) => {
          const isActive = t.key === active;
          const showCount =
            t.count != null && String(t.count).length > 0 && Number(t.count) > 0;
          return (
            <Pressable
              key={t.key}
              onPress={() => onChange(t.key)}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                chipRefs.current[t.key] = { x, w: width };
              }}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {t.label}
                {showCount ? (
                  <Text style={[styles.chipCount, isActive && styles.chipCountActive]}>
                    {'  '}
                    {fmtNum(t.count!)}
                  </Text>
                ) : null}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: c.card,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    row: {
      paddingHorizontal: 14,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: {
      backgroundColor: c.primarySoft,
      borderColor: c.primarySoft,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    chipTextActive: {
      color: c.primary,
      fontWeight: '700',
    },
    chipCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
    },
    chipCountActive: {
      color: c.primary,
    },
  });
}
