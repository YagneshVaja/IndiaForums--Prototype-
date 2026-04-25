import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { ProfileTabKey } from '../hooks/useProfileTab';

export interface Tab {
  key: ProfileTabKey;
  label: string;
}

const BASE_TABS: Tab[] = [
  { key: 'activity', label: 'Activity' },
  { key: 'posts', label: 'Posts' },
  { key: 'comments', label: 'Comments' },
  { key: 'buddies', label: 'Buddies' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'forums', label: 'Forums' },
  { key: 'badges', label: 'Badges' },
];

const SELF_TABS: Tab[] = [
  { key: 'drafts', label: 'Drafts' },
  { key: 'watching', label: 'Watching' },
  { key: 'ff-following', label: 'Following' },
  { key: 'ff-followers', label: 'FF Fans' },
  { key: 'warnings', label: 'Warnings' },
];

export function tabsFor(isOwn: boolean): Tab[] {
  return isOwn ? [...BASE_TABS, ...SELF_TABS] : BASE_TABS;
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
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{t.label}</Text>
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
  });
}
