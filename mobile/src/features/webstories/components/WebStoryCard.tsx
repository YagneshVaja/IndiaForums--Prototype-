import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { WebStorySummary } from '../../../services/api';

interface Props {
  story: WebStorySummary;
  onPress: (story: WebStorySummary) => void;
}

function angleToStartEnd(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  return {
    start: { x: 0.5 - x / 2, y: 0.5 - y / 2 },
    end: { x: 0.5 + x / 2, y: 0.5 + y / 2 },
  };
}

function WebStoryCard({ story, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = story.coverImage && !imgFailed;
  const fallbackBg = story.coverBg ?? { colors: ['#3558F0', '#7c3aed'] as [string, string], angle: 160 };
  const { start, end } = angleToStartEnd(fallbackBg.angle);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(story)}
      accessibilityLabel={story.title}
    >
      <View style={styles.cover}>
        {showImage ? (
          <Image
            source={{ uri: story.coverImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={120}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <LinearGradient
            colors={fallbackBg.colors}
            start={start}
            end={end}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Top scrim — keeps progress dots legible on bright covers */}
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topScrim}
          pointerEvents="none"
        />

        {/* 5 progress dots — signature webstory marker */}
        <View style={styles.dots} pointerEvents="none">
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>

        {/* Story badge bottom-right */}
        <View style={styles.badge} pointerEvents="none">
          <Ionicons name="albums-outline" size={11} color="#fff" />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={3}>
          {story.title}
        </Text>
        <View style={styles.footer}>
          <Ionicons
            name="time-outline"
            size={11}
            color={colors.textTertiary}
          />
          <Text style={styles.timeText}>{story.timeAgo}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(WebStoryCard);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    cardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.985 }],
    },
    cover: {
      width: '100%',
      aspectRatio: 9 / 16,
      backgroundColor: '#0b0b0b',
    },
    topScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 60,
    },
    dots: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 22,
      flexDirection: 'row',
      gap: 3,
    },
    dot: {
      flex: 1,
      maxWidth: 22,
      height: 2.5,
      borderRadius: 1.5,
      backgroundColor: 'rgba(255,255,255,0.6)',
    },
    badge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 10,
    },
    title: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      lineHeight: 18,
    },
    footer: {
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timeText: {
      fontSize: 11,
      fontWeight: '500',
      color: c.textTertiary,
    },
  });
}
