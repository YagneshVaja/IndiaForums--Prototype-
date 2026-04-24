import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

const STORIES = [
  { id: 1, label: 'Celebrities', emoji: '⭐', bg: '#FFF7ED' },
  { id: 2, label: 'Videos',      emoji: '🎬', bg: '#EFF6FF' },
  { id: 3, label: 'Galleries',   emoji: '🖼️', bg: '#F0FDF4' },
  { id: 4, label: 'Fan Fictions',emoji: '📖', bg: '#FDF4FF' },
  { id: 5, label: 'Quizzes',     emoji: '❓', bg: '#FFF1F2' },
  { id: 6, label: 'Shorts',      emoji: '⚡', bg: '#FFFBEB' },
  { id: 7, label: 'Web Stories', emoji: '🌐', bg: '#F0F9FF' },
] as const;

type Story = typeof STORIES[number];

interface Props {
  onItemPress?: (story: Story) => void;
}

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export default function StoriesStrip({ onItemPress }: Props) {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePress = (s: Story) => {
    if (s.label === 'Celebrities') {
      navigation.navigate('Celebrities');
      return;
    }
    if (s.label === 'Videos') {
      navigation.navigate('Videos');
      return;
    }
    if (s.label === 'Galleries') {
      navigation.navigate('Galleries');
      return;
    }
    if (s.label === 'Fan Fictions') {
      navigation.navigate('FanFiction');
      return;
    }
    if (s.label === 'Shorts') {
      navigation.navigate('Shorts');
      return;
    }
    if (s.label === 'Quizzes') {
      navigation.navigate('Quizzes');
      return;
    }
    if (s.label === 'Web Stories') {
      navigation.navigate('WebStories');
      return;
    }
    onItemPress?.(s);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.strip}
    >
      {STORIES.map(s => (
        <Pressable
          key={s.id}
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          onPress={() => handlePress(s)}
        >
          <View style={styles.ring}>
            <View style={[styles.innerCircle, { backgroundColor: s.bg }]}>
              <Text style={styles.emoji}>{s.emoji}</Text>
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>{s.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    strip: {
      backgroundColor: c.card,
    },
    row: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    item: {
      width: 68,
      alignItems: 'center',
      gap: 5,
    },
    itemPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
    ring: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    innerCircle: {
      width: 51,
      height: 51,
      borderRadius: 25.5,
      borderWidth: 2.5,
      borderColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: {
      fontSize: 22,
    },
    label: {
      fontSize: 10,
      fontWeight: '600',
      color: c.textSecondary,
      textAlign: 'center',
      maxWidth: 68,
    },
  });
}
